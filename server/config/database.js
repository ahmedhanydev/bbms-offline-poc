// server/config/database.js
// MongoDB connection configuration

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bbms', {
      // Mongoose 6+ doesn't need these options anymore, but good for older versions
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
