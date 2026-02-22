const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const email = require('./email');
const fs = require("fs");
require('dotenv').config();

const app = express();
const PORT = 8080;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Route to serve the HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'candidates.html'));
});

app.use(email);
app.use(express.json());

async function getFundraisingTotals(candidateId, apiKey) {
  const url =
    `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/` +
    `?cycle=2026&api_key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.results?.[0] || null;
}

// Helper function to safely request FEC API with retry logic
async function safeRequest(url, maxRetries = 5) {
  let backoff = 1;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.status === 200) {
        return await response.json();
      }
      
      if (response.status === 429) {
        console.log(`Rate limited. Retrying in ${backoff}s...`);
        await new Promise(resolve => setTimeout(resolve, backoff * 1000));
        backoff *= 2;
        continue;
      }
      
      console.log(`HTTP ERROR: ${response.status}`);
      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Request timeout. Retrying in ${backoff}s...`);
      } else {
        console.log(`Request error: ${error.message}. Retrying in ${backoff}s...`);
      }
      await new Promise(resolve => setTimeout(resolve, backoff * 1000));
      backoff *= 2;
    }
  }
  
  console.log("Max retries exceeded.");
  return null;
}

// Get principal committee for a candidate
async function getPrincipalCommittee(candidateId, apiKey) {
  const url = `https://api.open.fec.gov/v1/candidate/${candidateId}/committees/?api_key=${apiKey}`;
  const data = await safeRequest(url);
  
  if (!data || !data.results) {
    return null;
  }
  
  for (const committee of data.results) {
    if (committee.designation === "P") {
      return committee.committee_id;
    }
  }
  
  return null;
}

// Get itemized contributions for a committee
async function getItemizedContributions(committeeId, apiKey) {
  const contributions = [];
  let page = 1;
  
  while (true) {
    const url = `https://api.open.fec.gov/v1/schedules/schedule_a/?committee_id=${committeeId}&two_year_transaction_period=2026&per_page=100&page=${page}&api_key=${apiKey}`;
    
    console.log(`  Fetching page ${page}...`);
    const data = await safeRequest(url);
    
    if (!data || !data.results || data.results.length === 0) {
      break;
    }
    
    contributions.push(...data.results);
    
    if (page >= data.pagination.pages) {
      break;
    }
    
    page++;
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
  }
  
  return contributions;
}

// Helper function to escape CSV fields
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Set of candidate_ids that already have contribution rows in the CSVs
let candidateIdsWithContributions = new Set();

function buildCandidateIdsWithContributions() {
  const set = new Set();
  const filesDir = path.join(__dirname, 'public', 'files');
  const individualPath = path.join(filesDir, 'individual_contributions.csv');
  const pacPath = path.join(filesDir, 'pac_contributions.csv');

  for (const filePath of [individualPath, pacPath]) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const firstColumn = lines[i].split(',')[0].trim();
        if (firstColumn && firstColumn !== 'candidate_id') {
          set.add(firstColumn);
        }
      }
    } catch (err) {
      console.warn(`Could not read ${filePath} for contribution index:`, err.message);
    }
  }
  return set;
}

// Save contributions to CSV files
function saveContributionsToCSV(candidateId, candidateName, contributions) {
  const individualContributionsPath = path.join(__dirname, 'public', 'files', 'individual_contributions.csv');
  const pacContributionsPath = path.join(__dirname, 'public', 'files', 'pac_contributions.csv');
  
  // Create files with headers if they don't exist
  if (!fs.existsSync(individualContributionsPath)) {
    const header = 'candidate_id,candidate_name,contributor_name,amount,date,city,state,employer,occupation\n';
    fs.writeFileSync(individualContributionsPath, header);
  }
  
  if (!fs.existsSync(pacContributionsPath)) {
    const header = 'candidate_id,candidate_name,contributor_name,amount,date,city,state,committee_id\n';
    fs.writeFileSync(pacContributionsPath, header);
  }
  
  const individuals = [];
  const pacs = [];
  
  // Separate contributions
  for (const c of contributions) {
    const entityType = c.entity_type;
    
    if (entityType === "IND") {
      individuals.push({
        candidate_id: candidateId,
        candidate_name: candidateName,
        contributor_name: c.contributor_name || "",
        amount: c.contribution_receipt_amount || 0,
        date: c.contribution_receipt_date || "",
        city: c.contributor_city || "",
        state: c.contributor_state || "",
        employer: c.contributor_employer || "",
        occupation: c.contributor_occupation || ""
      });
    } else {
      pacs.push({
        candidate_id: candidateId,
        candidate_name: candidateName,
        contributor_name: c.contributor_name || "",
        amount: c.contribution_receipt_amount || 0,
        date: c.contribution_receipt_date || "",
        city: c.contributor_city || "",
        state: c.contributor_state || "",
        committee_id: c.committee_id || ""
      });
    }
  }
  
  // Append to individual contributions CSV
  if (individuals.length > 0) {
    const csvLines = individuals.map(ind => 
      [
        escapeCSVField(ind.candidate_id),
        escapeCSVField(ind.candidate_name),
        escapeCSVField(ind.contributor_name),
        escapeCSVField(ind.amount),
        escapeCSVField(ind.date),
        escapeCSVField(ind.city),
        escapeCSVField(ind.state),
        escapeCSVField(ind.employer),
        escapeCSVField(ind.occupation)
      ].join(',')
    );
    fs.appendFileSync(individualContributionsPath, csvLines.join('\n') + '\n');
  }
  
  // Append to PAC contributions CSV
  if (pacs.length > 0) {
    const csvLines = pacs.map(pac => 
      [
        escapeCSVField(pac.candidate_id),
        escapeCSVField(pac.candidate_name),
        escapeCSVField(pac.contributor_name),
        escapeCSVField(pac.amount),
        escapeCSVField(pac.date),
        escapeCSVField(pac.city),
        escapeCSVField(pac.state),
        escapeCSVField(pac.committee_id)
      ].join(',')
    );
    fs.appendFileSync(pacContributionsPath, csvLines.join('\n') + '\n');
  }

  if (individuals.length > 0 || pacs.length > 0) {
    candidateIdsWithContributions.add(candidateId);
  }
  
  return { individuals: individuals.length, pacs: pacs.length };
}

// Start server
app.get('/api/candidates', async (req, res) => {
    const apiKey = process.env.FEC_API_KEY;
    console.log(apiKey);
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing FEC API key' });
    }

    const url = `https://api.open.fec.gov/v1/candidates/?party=DEM&cycle=2026&per_page=100&api_key=${apiKey}`;
    console.log(url);
    try {
        const response = await fetch(url);
        const data = await response.json();

        const midtermsOnly = data.results.filter(c =>
            c.office === 'H' || c.office === 'S'
        );

        const candidates = [...midtermsOnly];

        const enriched = [];
        for(const c of candidates) {
            const totals = await getFundraisingTotals(c.candidate_id, apiKey);
            console.log(totals);
            enriched.push({
                ...c,
                fundraising: totals
                ? {
                    raised: totals.receipts,
                    spent: totals.disbursements,
                    cash_on_hand: totals.cash_on_hand_end_period,
                    debt: totals.debts_owed_by_committee
                    }
                : null
            });
        }

        res.json(enriched);
    } catch (err) {
        console.error('FEC API error:', err);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

app.get('/api/get-markers', async (req, res) => {
    const markers = JSON.parse(fs.readFileSync('markers.json', 'utf8'));
    
    console.log(markers);
    res.json(markers);
});

app.post('/api/save-markers', express.json(), (req, res) => {
    const newMarkers = req.body; // array of new markers

    // const existingMarkers = JSON.parse(
    //     fs.readFileSync('markers.json', 'utf8')
    // );

    // const mergedMarkers = existingMarkers.concat(newMarkers);

    fs.writeFileSync(
        'markers.json',
        JSON.stringify(newMarkers, null, 2)
    );

    res.json({ success: true });
});

app.post("/api/get-address", async (req, res) => {
    const api_key = process.env.MAP_API_KEY;
    const clickedPos = req.body;

    const url = `https://api.maptiler.com/geocoding/${clickedPos.lng},${clickedPos.lat}.json?key=${api_key}`;

    const result = await fetch(url);
    const data = await result.json();
    
    let address = 'Address not found';

    if (data.features && data.features.length > 0) {
        address = data.features[0].place_name;
    }

    res.json(address);
});

// Endpoint to fetch and save contributions for a candidate
app.post("/api/fetch-contributions", async (req, res) => {
    const apiKey = process.env.FEC_API_KEY;
    const { candidate_id, candidate_name, committee_id } = req.body;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing FEC API key' });
    }
    
    if (!candidate_id) {
        return res.status(400).json({ error: 'Missing candidate_id' });
    }

    if (candidateIdsWithContributions.has(candidate_id)) {
        return res.json({ success: true, alreadyHaveData: true });
    }
    
    try {
        // Get committee ID if not provided
        let finalCommitteeId = committee_id;
        if (!finalCommitteeId) {
            console.log(`Getting principal committee for ${candidate_id}...`);
            finalCommitteeId = await getPrincipalCommittee(candidate_id, apiKey);
        }
        
        if (!finalCommitteeId) {
            return res.json({
                success: false,
                message: 'No principal committee found',
                contributions: { individuals: 0, pacs: 0 }
            });
        }
        
        console.log(`Fetching contributions for committee ${finalCommitteeId}...`);
        const contributions = await getItemizedContributions(finalCommitteeId, apiKey);
        
        if (contributions.length > 0) {
            const counts = saveContributionsToCSV(
                candidate_id,
                candidate_name || candidate_id,
                contributions
            );
            
            console.log(`Saved ${counts.individuals} individual and ${counts.pacs} PAC contributions`);
            
            return res.json({
                success: true,
                contributions: counts,
                total: contributions.length
            });
        } else {
            return res.json({
                success: true,
                message: 'No contributions found',
                contributions: { individuals: 0, pacs: 0 },
                total: 0
            });
        }
    } catch (error) {
        console.error('Error fetching contributions:', error);
        return res.status(500).json({ error: error.message });
    }
});

candidateIdsWithContributions = buildCandidateIdsWithContributions();
console.log(`Loaded ${candidateIdsWithContributions.size} candidate(s) with contributions from CSVs`);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

