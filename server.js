/**
 * Main Server Entry Point
 * Sets up Express server with middleware and routes
 * Handles database connection and server configuration
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware Configuration
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Database Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fake_news_detector';

/**
 * MongoDB Connection
 * Establishes connection to MongoDB database
 * Includes error handling and success logging
 */
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Successfully connected to MongoDB.'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Import Routes
const apiRoutes = require('./routes/api');

// Route Middleware
app.use('/api', apiRoutes); // API routes

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
