const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

console.log('=== DIAGNOSTIC INFORMATION ===');
console.log('Current directory:', __dirname);
console.log('Public folder path:', path.join(__dirname, 'public'));
console.log('Index.html path:', path.join(__dirname, 'public', 'index.html'));

// Check if files exist
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(__dirname, 'public', 'index.html');

console.log('\n=== FILE CHECKS ===');
console.log('Does public folder exist?', fs.existsSync(publicDir));
console.log('Does index.html exist?', fs.existsSync(indexPath));

if (fs.existsSync(publicDir)) {
  console.log('\nFiles in public folder:');
  const files = fs.readdirSync(publicDir);
  files.forEach(file => console.log(' -', file));
}

// Serve static files
app.use(express.static('public'));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Explicit route for root
app.get('/', (req, res) => {
  console.log('Root route hit');
  const filePath = path.join(__dirname, 'public', 'index.html');
  console.log('Attempting to send:', filePath);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('index.html not found at: ' + filePath);
  }
});

// 404 handler
app.use((req, res) => {
  console.log('404 - File not found:', req.url);
  res.status(404).send(`
    <h1>404 - Not Found</h1>
    <p>Looking for: ${req.url}</p>
    <p>Current directory: ${__dirname}</p>
    <p>Public folder: ${path.join(__dirname, 'public')}</p>
  `);
});

console.log('About to call listen');
app.listen(PORT, () => {
  console.log('\n=== SERVER STARTED ===');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Open this URL in your browser');
  console.log('========================\n');
});