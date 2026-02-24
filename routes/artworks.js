const express = require('express');
const router = express.Router();
const Artwork = require('../models/artwork');

// Get all artworks
router.get('/', async (req, res) => {
  const artworks = await Artwork.find({});
  res.json(artworks);
});

// Add new artwork
router.post('/', async (req, res) => {
  const { studentName, imageUrl, category, grade } = req.body;
  const newArtwork = new Artwork({ studentName, imageUrl, category, grade: parseInt(grade) });
  await newArtwork.save();
  res.status(201).json({ message: "Artwork added successfully!" });
});

module.exports = router;