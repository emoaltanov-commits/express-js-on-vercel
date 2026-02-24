const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String // NOTE: hash in production
});

module.exports = mongoose.model('User', userSchema);