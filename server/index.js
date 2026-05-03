// server/index.js
// Express server entry point for BBMS backend

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'BBMS API Server'
  });
});

// Routes
const donorsRouter = require('./routes/donors');
const visitsRouter = require('./routes/visits');

app.use('/api/donors', donorsRouter);
app.use('/api/visits', visitsRouter);

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🩸 BBMS Backend Server                                ║
║                                                          ║
║   Running on http://localhost:${PORT}                    ${PORT === 3001 ? ' ' : ''} ║
║                                                          ║
║   Endpoints:                                            ║
║   • GET  /api/health      - Health check               ║
║   • GET  /api/donors      - List all donors            ║
║   • POST /api/donors      - Create donor               ║
║   • GET  /api/donors/:id  - Get donor by ID            ║
║   • PUT  /api/donors/:id  - Update donor               ║
║   • GET  /api/visits      - List all visits            ║
║   • POST /api/visits      - Create visit               ║
║   • GET  /api/visits/:id  - Get visit by ID            ║
║   • PUT  /api/visits/:id  - Update visit               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
