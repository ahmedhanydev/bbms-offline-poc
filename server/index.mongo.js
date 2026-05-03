// server/index.mongo.js
// Express server with MongoDB backend for BBMS

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
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
    service: 'BBMS API Server (MongoDB)',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
const donorsRouter = require('./routes/donors.mongo');
const visitsRouter = require('./routes/visits.mongo');

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
║   🩸 BBMS Backend Server (MongoDB)                      ║
║                                                          ║
║   Running on http://localhost:${PORT}                    ${PORT === 3001 ? ' ' : ''} ║
║   Database: MongoDB                                      ║
║                                                          ║
║   Endpoints:                                            ║
║   • GET  /api/health      - Health check               ║
║   • GET  /api/donors      - List all donors            ║
║   • POST /api/donors      - Create donor               ║
║   • GET  /api/donors/:id  - Get donor by ID            ║
║   • PUT  /api/donors/:id  - Update donor               ║
║   • DEL  /api/donors/:id  - Delete donor               ║
║   • GET  /api/visits      - List all visits            ║
║   • POST /api/visits      - Create visit               ║
║   • GET  /api/visits/:id  - Get visit by ID            ║
║   • PUT  /api/visits/:id  - Update visit               ║
║   • DEL  /api/visits/:id  - Delete visit               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
