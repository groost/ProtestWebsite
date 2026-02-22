const fieldset = document.querySelector('fieldset');
const radioButtons = fieldset.querySelectorAll('input[type="radio"]');

let allCandidates = [];
let currentParty = 'democrat';
let searchFilter = null;

const abbrevToState = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
  "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
  "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
  "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
  "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
  "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
  "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
  "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
  "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
  "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
  "WI": "Wisconsin", "WY": "Wyoming"
};

radioButtons.forEach(radio => {
  radio.addEventListener('change', () => {
    currentParty = radio.value;
    searchFilter = null;
    document.getElementById('candidateSearch').value = '';
    init(radio.value);
  });
});

// document.addEventListener("DOMContentLoaded", init);
const stateToAbbrev = {
  "Alabama": "AL",
  "Alaska": "AK",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "Florida": "FL",
  "Georgia": "GA",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Pennsylvania": "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY"
};

function getKeyByValue(obj, value) {
    return Object.keys(obj).find(key => obj[key] === value);
}

function convertCentroidsArrayToObject(array) {
    const result = {};

    array.forEach(entry => {
        result[entry.state] = {
        lat: entry.lat,
        lng: entry.lng
        };
    });

    return result;
}

async function parseCSV(url) {
    const response = await fetch(url);
    const csvText = await response.text();
    return Papa.parse(csvText, { header: true }).data;
}

async function getWebsites() {
    const data = await parseCSV("../files/candidates_websites.csv");
    console.log(data);
}

function buildContributionsLookup(enrichedData) {
    const lookup = {};
    for (const row of enrichedData) {
        if (row.candidate_id) {
            lookup[row.candidate_id] = {
                individual: parseFloat(row.total_individual_contributions) || 0,
                pac: parseFloat(row.total_pac_contributions) || 0
            };
        }
    }
    return lookup;
}

function getContributions(candidateId, lookup) {
    if (!candidateId) return { individual: 0, pac: 0 };
    return lookup[candidateId] || { individual: 0, pac: 0 };
}

function createMiniPieChart(individual, pac) {
    const total = individual + pac;
    const div = document.createElement('div');
    div.className = 'mini-pie';
    
    if (total === 0) {
        div.style.background = '#ccc';
    } else {
        const individualPercent = (individual / total) * 100;
        div.style.background = `conic-gradient(
            #3498db 0deg ${individualPercent * 3.6}deg,
            #e74c3c ${individualPercent * 3.6}deg 360deg
        )`;
    }
    return div;
}

function searchCandidates(query) {
    if (!query || query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    for (const candidate of allCandidates) {
        const nameMatch = candidate.candidate_name && candidate.candidate_name.toLowerCase().includes(lowerQuery);
        
        let stateMatch = false;
        let districtMatch = false;
        
        const stateInput = lowerQuery.replace(/[^a-z]/g, '');
        if (candidate.state) {
            if (candidate.state.toLowerCase() === stateInput || 
                (abbrevToState[candidate.state] && abbrevToState[candidate.state].toLowerCase().includes(stateInput))) {
                stateMatch = true;
            }
        }
        
        const districtInput = query.match(/\d+/);
        if (districtInput && candidate.district) {
            const candidateDistrict = parseFloat(candidate.district);
            districtMatch = candidateDistrict === parseInt(districtInput[0]);
        }
        
        if (nameMatch || (stateMatch && districtMatch)) {
            results.push(candidate);
            if (results.length >= 10) break;
        }
    }
    
    return results;
}

function showSearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.classList.remove('show');
        return;
    }
    
    for (const candidate of results) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        const districtText = candidate.district == 0 ? 'Senate' : `District ${candidate.district}`;
        const partyText = candidate.party_full || '';
        
        item.innerHTML = `
            <div class="candidate-name">${candidate.candidate_name}</div>
            <div class="candidate-info">${candidate.state}, ${districtText} ${partyText ? '- ' + partyText : ''}</div>
        `;
        
        item.addEventListener('click', () => {
            searchFilter = { state: candidate.state, district: parseInt(candidate.district) };
            document.getElementById('candidateSearch').value = `${candidate.candidate_name} - ${candidate.state}, ${districtText}`;
            searchResults.classList.remove('show');
            init(currentParty);
        });
        
        searchResults.appendChild(item);
    }
    
    searchResults.classList.add('show');
}

function initSearch() {
    const searchInput = document.getElementById('candidateSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchResults.classList.remove('show');
            return;
        }
        
        const results = searchCandidates(query);
        showSearchResults(results);
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.remove('show');
        }
    });
}

async function init(party) {
    const enrichedData = await parseCSV("../files/candidates_enriched.csv");
    const contributionsLookup = buildContributionsLookup(enrichedData);
    
    allCandidates = enrichedData.filter(row => row.candidate_name && row.state);
    
    const partyFilters = {
        'democrat': ['DEMOCRATIC PARTY'],
        'republican': ['REPUBLICAN PARTY'],
        'other': ['NON-PARTY', 'INDEPENDENT', 'LIBERTARIAN PARTY', 'GREEN PARTY', '']
    };
    
    const validParties = partyFilters[party] || partyFilters['democrat'];
    
    var newCandidateObjs = [];
    for(var i = 0; i < allCandidates.length; i++) {
        const c = allCandidates[i];
        
        if (!c.state || !c.candidate_name) continue;
        if (getKeyByValue(stateToAbbrev, c.state) === undefined) continue;
        
        const partyValue = c.party_full ? c.party_full.toUpperCase() : '';
        if (!validParties.some(p => partyValue === p)) continue;
        
        const newCandidateObj = {
            name: c.candidate_name,
            state: c.state,
            district: parseInt(c.district),
            party: c.party_full,
            candidate_id: c.candidate_id,
            committee_id: c.committee_id
        };
        
        newCandidateObjs.push(newCandidateObj);
    }

    console.log(newCandidateObjs.length);

    let newList;
    if (searchFilter) {
        newList = newCandidateObjs.filter(c => 
            c.state === searchFilter.state && c.district == searchFilter.district
        ).map(c => ({
            ...c,
            type: searchFilter.district == 0 ? 'Senate' : 'House'
        }));
    } else {
        newList = await filterCandidates(newCandidateObjs);
        await addWebsites(newList);
    }
    
    newList.sort((a, b) => {
        const nameA = a.type.toUpperCase();
        const nameB = b.type.toUpperCase();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        return 0;
    });

    console.log(newList.length);

    if(party === "other") {
        await makeTableOther(newList, contributionsLookup);
    }
    else {
        await makeTable(newList, contributionsLookup);
    }
    
    // Fetch contributions for all candidates in the list
    // await fetchContributionsForCandidates(newList);
}

/**
 * Normalize candidate names for matching.
 * Converts enriched file's 'LAST, FIRST' format to 'FIRST LAST'
 * so it can be matched against the websites file's 'First Last' format.
 */
function normalizeName(name) {
    name = String(name).trim().toUpperCase();
    
    if (name.includes(",")) {
        const [last, first] = name.split(",", 2);
        name = `${first.trim()} ${last.trim()}`;
    }

    return name;
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
}

function distanceInMi(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 0.621371;
}


function getLocation(districts, centroids, candidate) {
    if (candidate.district === 0) {
        // console.log(getKeyByValue(stateToAbbrev, candidate.state));
        return {
            candidate: candidate,
            type: "Senate"
        };
    }

    for(const district of districts) {
        // console.log(candidateDistrict + " " + district.district);
        if(stateToAbbrev[district.state] === candidate.state) {
            if(candidate.district === district.district) {
                return {
                    candidate: candidate,
                    type: "House"
                };
            }
        }
    }
}

async function makeTable(finalList, contributionsLookup) {
    const table = document.getElementById("candidateTable");
    table.innerHTML = `
        <tr>
            <th>
                Candidate Name
            </th>
            <th>
                House District or Senate
            </th>
            <th>
                State
            </th>
            <th>
                Website
            </th>
            <th>
                Contributions
            </th>
        </tr>
    `;

    await addWebsites(finalList);

    for(const candidate of finalList) {
        const row = document.createElement("tr");
        
        const nameElement = document.createElement("td");
        nameElement.innerText = candidate.name;
        row.appendChild(nameElement);
        
        const typeElement = document.createElement("td");
        if(candidate.type === 'House') {
            typeElement.innerText = "House District #" + candidate.district;
        }
        else {
            typeElement.innerText = "Senate";
        }
        row.appendChild(typeElement);

        const stateElement = document.createElement("td");
        stateElement.innerText = candidate.state;
        row.appendChild(stateElement);

        const websiteElement = document.createElement("td");

        if(candidate.website.length > 1) {
            const href = document.createElement("a");
            href.innerText = "Website";
            href.href = candidate.website;
            
            websiteElement.appendChild(href);
        }
        else {
            websiteElement.innerText = "Not Yet";
        }
        row.appendChild(websiteElement);

        const contributions = getContributions(candidate.candidate_id, contributionsLookup);
        const pieElement = document.createElement("td");
        pieElement.appendChild(createMiniPieChart(contributions.individual, contributions.pac));
        row.appendChild(pieElement);

        table.appendChild(row);
    }
}

async function makeTableOther(finalList, contributionsLookup) {
    const table = document.getElementById("candidateTable");
    table.innerHTML = `
        <tr>
            <th>
                Candidate Name
            </th>
            <th>
                House District or Senate
            </th>
            <th>
                State
            </th>
            <th>
                Party
            </th>
            <th>
                Website
            </th>
            <th>
                Contributions
            </th>
        </tr>
    `;

    for(const candidate of finalList) {
        const row = document.createElement("tr");
        
        const nameElement = document.createElement("td");
        nameElement.innerText = candidate.name;
        row.appendChild(nameElement);
        
        const typeElement = document.createElement("td");
        if(candidate.type === 'House') {
            typeElement.innerText = "House District #" + candidate.district;
        }
        else {
            typeElement.innerText = "Senate";
        }
        row.appendChild(typeElement);

        const stateElement = document.createElement("td");
        stateElement.innerText = candidate.state;
        row.appendChild(stateElement);

        const partyElement = document.createElement("td");
        partyElement.innerText = candidate.party;
        row.appendChild(partyElement);

        const websiteElement = document.createElement("td");

        const href = document.createElement("a");
        href.innerText = "Website";
        href.src = candidate.website;
        
        websiteElement.appendChild(href);
        row.appendChild(websiteElement);

        const contributions = getContributions(candidate.candidate_id, contributionsLookup);
        const pieElement = document.createElement("td");
        pieElement.appendChild(createMiniPieChart(contributions.individual, contributions.pac));
        row.appendChild(pieElement);

        table.appendChild(row);
    }
}

async function filterCandidates(candidates) {
    var finalList = [];

    const pos = await getUserLocation();
    const currentLocation = pos.coords;

    const userDistrict = await findUserDistrict(currentLocation);
    const state = userDistrict.id.substring(0,2);
    const district = userDistrict.id.substring(2);
    
    for(var i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];

        if(candidate.state === state && candidate.district == district) {
            candidate.type = "House";
            finalList.push(candidate);
        }
        else if(candidate.state === state && candidate.district === 0) {
            candidate.type = "Senate";
            finalList.push(candidate);
        }
    }

    return finalList;
}

async function addWebsites(candidates) {
    const data = await parseCSV("../files/candidates_enriched_with_websites.csv");
    // console.log(data);

    for(const candidate of candidates) {
        console.log(candidate);
        for(const element of data) {
            if(element['candidate_name'] === candidate.name) {
                console.log(element);
                console.log(`${candidate.name} : ${element['candidate_name']}`);
                // console.log(candidate.name);
                candidate.website = element['campaign_website'];
                break;
            }
        }
    }
}

async function findUserDistrict(coords) {
    const lat = coords.latitude;
    const lng = coords.longitude;

    const userPoint = turf.point([lng, lat]);

    const response = await fetch("../files/congress.json");
    const geoData = await response.json();

    for (const feature of geoData.features) {
        if (turf.booleanPointInPolygon(userPoint, feature)) {
            return feature.properties;
        }
    }

    return null;
}

// Function to fetch contributions for a candidate
async function fetchContributionsForCandidate(candidateId, candidateName, committeeId) {
    try {
        const response = await fetch('/api/fetch-contributions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                candidate_id: candidateId,
                candidate_name: candidateName,
                committee_id: committeeId || null
            })
        });
        
        const result = await response.json();
        if (result.success) {
            if (result.alreadyHaveData) {
                console.log(`Contributions already in CSVs for ${candidateName}`);
            } else if (result.contributions) {
                console.log(`Fetched contributions for ${candidateName}: ${result.contributions.individuals} individual, ${result.contributions.pacs} PAC`);
            } else {
                console.log(`No contributions found for ${candidateName}`);
            }
            return result;
        } else {
            console.log(`No contributions found for ${candidateName}`);
            return result;
        }
    } catch (error) {
        console.error(`Error fetching contributions for ${candidateName}:`, error);
        return { success: false, error: error.message };
    }
}

// Function to fetch contributions for all candidates in the list
async function fetchContributionsForCandidates(candidates) {
    console.log(`Fetching contributions for ${candidates.length} candidates...`);
    
    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate.candidate_id) {
            await fetchContributionsForCandidate(
                candidate.candidate_id,
                candidate.name,
                candidate.committee_id
            );
            
            // Add a small delay to avoid rate limiting
            if (i < candidates.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }
    
    console.log('Finished fetching contributions for all candidates');
}

document.addEventListener('DOMContentLoaded', () => {
    initSearch();
});
