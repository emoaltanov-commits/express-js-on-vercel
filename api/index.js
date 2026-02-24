const express = require('express');
const serverless = require('serverless-http');
const connectDB = require('./db');

const authRoutes = require('./routes/auth');
const artworksRoutes = require('./routes/artworks');
const voteRoutes = require('./routes/vote');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', authRoutes);
app.use('/api/artworks', artworksRoutes);
app.use('/api/vote', voteRoutes);

// Optional: serve static files (frontend)

module.exports = app;
module.exports.handler = serverless(app);