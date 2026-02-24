const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  studentName: String,
  imageUrl: String,
  category: String,
  grade: Number,
  voters: [String],
  averageRating: { type: Number, default: 0 }
});

module.exports = mongoose.model('Artwork', artworkSchema);