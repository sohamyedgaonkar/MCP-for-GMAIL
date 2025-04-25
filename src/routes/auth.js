const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const open = require('open');

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic'
];

// Load OAuth2 credentials from file
let credentials;
try {
  const credentialsPath = path.join(__dirname, '../../credentials.json');
  credentials = JSON.parse(fs.readFileSync(credentialsPath));
} catch (err) {
  logger.error('Error loading client secret file:', err);
}

// Create OAuth2 client
const createOAuth2Client = () => {
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};

// Login route
router.get('/login', (req, res) => {
  const oAuth2Client = createOAuth2Client();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force to always get a new refresh token
  });
  
  // Auto open the auth URL in browser
  if (process.env.NODE_ENV !== 'production') {
    open(authUrl);
  }
  
  res.render('login', { authUrl });
});

// OAuth2 callback route
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code not found');
  }

  try {
    const oAuth2Client = createOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Store the tokens in session
    req.session.tokens = tokens;
    
    // Get user info
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    req.session.email = profile.data.emailAddress;
    
    logger.info(`User ${profile.data.emailAddress} authenticated successfully`);
    
    res.redirect('/dashboard');
  } catch (error) {
    logger.error('Error retrieving access token:', error);
    res.status(500).render('error', { 
      error: 'Failed to retrieve access token', 
      details: error.message 
    });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session:', err);
      return res.status(500).send('Logout failed');
    }
    res.redirect('/');
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.session.email) {
    res.json({ email: req.session.email });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;