const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const email = require('./email');
const fs = require("fs");
require('dotenv').config();
const { parse } = require('csv-parse');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = 8080;

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_OAUTH_CALLBACK_URL || `http://localhost:${PORT}/auth/google/callback`
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value || null;
        const user = {
          provider: profile.provider,
          id: profile.id,
          displayName: profile.displayName,
          email
        };
        return done(null, user);
      }
    )
  );
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));

app.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return res.status(500).send('Google OAuth is not configured (missing env vars).');
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/'
  }),
  (req, res) => {
    res.redirect('/candidates.html');
  }
);

app.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

app.post('/logout', (req, res, next) => {
  const finish = () => {
    req.session?.destroy(() => {
      res.json({ success: true });
    });
  };

  if (typeof req.logout === 'function') {
    return req.logout(err => {
      if (err) return next(err);
      finish();
    });
  }
  finish();
});

// Route to serve the HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'candidates.html'));
});

app.use(email);
app.use(express.json());

async function fetchContributionsFromDrive(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY}`;
  
  const response = await fetch(url);  // ← add this
  const text = await response.text(); // ← add this

  return new Promise((resolve, reject) => {
    parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,  // ← skip rows with wrong column count
      relax_quotes: true,         // ← handle unescaped quotes
      trim: true                  // ← trim whitespace from fields
    }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

async function getFundraisingTotals(candidateId, apiKey) {
  const url =
    `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/` +
    `?cycle=2026&api_key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.results?.[0] || null;
}

// Start server
app.get('/api/candidates', async (req, res) => {
    const apiKey = process.env.FEC_API_KEY;
    console.log(apiKey);
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing FEC API key' });4
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

app.get('/api/get_contributions', (req, res) => {
    res.json({
        individual: individualContributions,
        pac: pacContributions
    });
});

let individualContributions = [];
let pacContributions = [];

async function loadContributions() {
  console.log('Loading contributions from Drive...');
  
  const house = await fetchContributionsFromDrive('1l7P7uWy4nMy7Qq86mdGFdT5DKfVDZjQ3');
  for(const a of house) {
    individualContributions.push(a);
  }

  const senate = await fetchContributionsFromDrive('1qfWMrXVzRXOykyt8GIQw6k5SavnQYdQd');
  for(a of senate) {
    individualContributions.push(a);
  }

  const house1 = await fetchContributionsFromDrive('1uNloRbc2JIG3CcuX5CFSOOIELNgIlGYz');
  for(const a of house1) {
    pacContributions.push(a);
  }

  const senate1 = await fetchContributionsFromDrive('1wAwoKFZLeWh7EQCSMrr56rLYrP77pXs5');
  for(a of senate1) {
    pacContributions.push(a);
  }
  // individualContributions.push(await fetchContributionsFromDrive('1l7P7uWy4nMy7Qq86mdGFdT5DKfVDZjQ3'));
  // individualContributions.push(await fetchContributionsFromDrive('1qfWMrXVzRXOykyt8GIQw6k5SavnQYdQd'));
  // [individualContributions, pacContributions] = await Promise.all([
  //   fetchContributionsFromDrive('1l7P7uWy4nMy7Qq86mdGFdT5DKfVDZjQ3'),
  //   fetchContributionsFromDrive('1xre8b6HD1Z6C1OsFexKeHzWTe1_M50kI')
  // ]);

  console.log(`Loaded ${individualContributions.length} individual rows`);
  console.log(`Loaded ${pacContributions.length} PAC rows`);
}

loadContributions();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

