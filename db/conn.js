// db.js

const mongoose = require('mongoose');

//const dbURI = 'mongodb+srv://ahmedadeel164722:20020Chand@cluster0.nx4zcye.mongodb.net/assoonaspossible?retryWrites=true&w=majority'; 
const dbURI = 'mongodb://ahmedadeel164722:20020@ac-ktsottw-shard-00-00.wo6vqnr.mongodb.net:27017,ac-ktsottw-shard-00-01.wo6vqnr.mongodb.net:27017,ac-ktsottw-shard-00-02.wo6vqnr.mongodb.net:27017/Sagi?ssl=true&replicaSet=atlas-10vg3l-shard-0&authSource=admin&retryWrites=true&w=majority'; 

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

const dbConnection = mongoose.connection;

dbConnection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

dbConnection.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = dbConnection;