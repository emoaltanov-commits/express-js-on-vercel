const express = require('express');
const router = express.Router();
const Artwork = require('../models/artwork');

router.post('/', async (req, res) => {
  const { id, rating, email } = req.body;

  try {
    const art = await Artwork.findById(id);
    if (!art) return res.status(404).json({ message: "Artwork not found" });

    if (!art.voters) art.voters = [];
    if (art.voters.includes(email)) return res.status(400).json({ message: "Already voted" });

    art.voters.push(email);
    const voteValue = parseInt(rating);
    const totalVotes = art.voters.length;
    art.averageRating = ((art.averageRating * (totalVotes - 1) + voteValue) / totalVotes).toFixed(1);

    await art.save();
    res.json({ success: true, averageRating: art.averageRating });
  } catch (err) {
    res.status(500).json({ message: "Voting error" });
  }
});

module.exports = router;