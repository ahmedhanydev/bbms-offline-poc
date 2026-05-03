// server/middleware/errorHandler.js
// Global error handling middleware for Express

function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // SQLite specific errors
  if (err.message && err.message.includes('SQLITE_CONSTRAINT')) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Record already exists or constraint violation',
      details: err.message,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors,
    });
  }

  // Database errors
  if (err.code && err.code.startsWith('SQLITE')) {
    return res.status(500).json({
      error: 'Database Error',
      message: 'An error occurred while accessing the database',
    });
  }

  // Generic error response
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
