// Test MongoDB connection
require('dotenv').config();

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log('Testing connection to MongoDB...');
console.log('URI:', uri ? uri.replace(/:.*@/, ':****@') : 'NOT SET');

if (!uri || uri.includes('localhost')) {
  console.error('\n❌ ERROR: MONGODB_URI not set or pointing to localhost');
  console.log('\nPlease check your .env file has:');
  console.log('MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bbms');
  process.exit(1);
}

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB Atlas!');
  return mongoose.connection.close();
})
.catch(err => {
  console.error('❌ Connection failed:', err.message);
  if (err.message.includes('IP that isn\'t whitelisted')) {
    console.log('\n🔧 Fix: In MongoDB Atlas:');
    console.log('   1. Go to Network Access');
    console.log('   2. Delete existing IP entries');
    console.log('   3. Click "Add IP Address"');
    console.log('   4. Select "Allow Access from Anywhere" (0.0.0.0/0)');
    console.log('   5. Wait 2-3 minutes for changes to apply');
  }
  if (err.message.includes('authentication failed')) {
    console.log('\n🔧 Fix: Check your username/password in the connection string');
  }
  process.exit(1);
});
