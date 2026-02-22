const express = require('express');

const router = express.Router();

// Route to handle form submission
router.post('/check-email', async (req, res) => {
  const { email, code } = req.body;

  // Validate input
  if (!email || !code) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  const fs = require("fs");

  const users = JSON.parse(fs.readFileSync('checkFile.json', 'utf8'));
  if (users.users[email] && users.users[email].code === code) {
    return res.json({
        success: true
    });
  }
  else {
    return res.status(400).json({
        success: false,
        message: "Nope"
    });
  }
});

module.exports = router;