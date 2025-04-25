const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const { logger } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const filterRoutes = require('./routes/filters');
const templateRoutes = require('./routes/templates');
const scheduleRoutes = require('./routes/schedules');
const analyticsRoutes = require('./routes/analytics');
const { checkAuth } = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mcp-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', authRoutes);
app.use('/api/emails', checkAuth, emailRoutes);
app.use('/api/filters', checkAuth, filterRoutes);
app.use('/api/templates', checkAuth, templateRoutes);
app.use('/api/schedules', checkAuth, scheduleRoutes);
app.use('/api/analytics', checkAuth, analyticsRoutes);

// Home route
app.get('/', (req, res) => {
  if (req.session.tokens) {
    res.redirect('/dashboard');
  } else {
    res.render('index');
  }
});

// Dashboard route
app.get('/dashboard', checkAuth, (req, res) => {
  res.render('dashboard');
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`MCP for Gmail server running on port ${PORT}`);
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;