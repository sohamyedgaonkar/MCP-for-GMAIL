const { google } = require('googleapis');
const { logger } = require('../utils/logger');

// Load OAuth2 credentials
const loadCredentials = () => {
  try {
    return require('../../credentials.json');
  } catch (err) {
    logger.error('Error loading credentials:', err);
    return null;
  }
};

// Create OAuth2 client
const createOAuth2Client = () => {
  const credentials = loadCredentials();
  if (!credentials) return null;
  
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};

// Check if the user is authenticated
const checkAuth = (req, res, next) => {
  if (!req.session.tokens) {
    logger.info('User not authenticated, redirecting to login');
    return res.redirect('/auth/login');
  }
  
  // Create auth client and set tokens
  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) {
    logger.error('Failed to create OAuth2 client');
    return res.status(500).render('error', { 
      error: 'Authentication configuration error', 
      details: 'OAuth2 client could not be created' 
    });
  }
  
  oAuth2Client.setCredentials(req.session.tokens);
  
  // Check if token needs refresh
  if (req.session.tokens.expiry_date && req.session.tokens.expiry_date <= Date.now()) {
    logger.info('Token expired, refreshing...');
    oAuth2Client.refreshAccessToken((err, tokens) => {
      if (err) {
        logger.error('Error refreshing access token:', err);
        req.session.destroy();
        return res.redirect('/auth/login');
      }
      
      // Update session with new tokens
      req.session.tokens = tokens;
      logger.info('Token refreshed successfully');
      
      // Set the auth object and continue
      req.auth = oAuth2Client;
      next();
    });
  } else {
    // Set the auth object and continue
    req.auth = oAuth2Client;
    next();
  }
};

// Get Gmail service
const getGmailService = (auth) => {
  return google.gmail({ version: 'v1', auth });
};

module.exports = {
  checkAuth,
  getGmailService
};