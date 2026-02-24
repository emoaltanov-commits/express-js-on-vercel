const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered!" });

    const newUser = new User({ username, email, password });
    await newUser.save();
    res.json({ message: "Registration successful!" });
  } catch (err) {
    res.status(500).json({ message: "Registration error" });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) res.json({ success: true, username: user.username });
    else res.status(401).json({ success: false, message: "Invalid email or password" });
  } catch (err) {
    res.status(500).json({ message: "Login error" });
  }
});

module.exports = router;