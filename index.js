const mongoose = require('mongoose');
const express = require('express');
const app = express();
const serverless = require('serverless-http');

// --- ВРЪЗКА КЪМ MONGODB ---
mongoose.connect("mongodb+srv://user2:mGWCK5HOskhp9MLb@lt12gti.mongodb.net/?retryWrites=true&w=majority")
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB error:", err));

// --- USER MODEL ---
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});

// Ensure that the model is not redefined
let User;
try {
    User = mongoose.model('User'); // This will return the existing model if already defined
} catch (error) {
    User = mongoose.model('User', userSchema); // Otherwise, create the model
}

// --- ARTWORK MODEL (WITH VOTING) ---
const artworkSchema = new mongoose.Schema({
    studentName: String,
    category: String,
    grade: Number,
    voters: [String],  // List of emails who voted
    averageRating: { type: Number, default: 0 }
});

// Ensure that the model is not redefined
let Artwork;
try {
    Artwork = mongoose.model('Artwork'); // This will return the existing model if already defined
} catch (error) {
    Artwork = mongoose.model('Artwork', artworkSchema); // Otherwise, create the model
}

// Настройки на сървъра
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- МАРШРУТИ ЗА ПОТРЕБИТЕЛИ ---
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Този имейл вече е регистриран!" });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        res.json({ message: "Регистрацията е успешна!" });

    } catch (error) {
        res.status(500).json({ message: "Грешка при регистрация" });
    }
});

// --- МАРШРУТИ ЗА ГАЛЕРИЯТА ---

// Get all artworks
app.get('/api/artworks', async (req, res) => {
    try {
        const artworks = await Artwork.find();
        res.json(artworks);
    } catch (err) {
        res.status(500).json({ message: "Грешка при зареждане на картините!" });
    }
});

// Add a new artwork
app.post('/api/artworks', async (req, res) => {
    const { studentName, category, grade } = req.body;

    try {
        const newArtwork = new Artwork({
            studentName,
            category,
            grade: parseInt(grade),
            voters: [],
            averageRating: 0
        });

        await newArtwork.save();
        res.status(201).send("Картината е добавена успешно!");
    } catch (error) {
        res.status(500).json({ message: "Грешка при добавяне на картината!" });
    }
});

// --- МАРШРУТ ЗА ВХОД ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });

        if (user) {
            res.json({ success: true, username: user.username });
        } else {
            res.status(401).json({ success: false, message: "Грешен имейл или парола!" });
        }

    } catch (error) {
        res.status(500).json({ message: "Грешка при вход" });
    }
});

// --- ГЛАВНИЯТ МАРШРУТ ЗА ГЛАСУВАНЕ ---
app.post('/api/vote', async (req, res) => {
    const { id, rating, email } = req.body;

    try {
        const artwork = await Artwork.findById(id);

        if (!artwork) {
            return res.status(404).json({ message: "Творбата не е намерена" });
        }

        if (artwork.voters.includes(email)) {
            return res.status(400).json({ message: "Вече сте гласували за тази картина!" });
        }

        artwork.voters.push(email); // Add the voter
        const totalVotes = artwork.voters.length;
        const currentAvg = artwork.averageRating || 0;
        const voteValue = parseInt(rating);

        // Calculate the new average rating
        artwork.averageRating = ((currentAvg * (totalVotes - 1) + voteValue) / totalVotes).toFixed(1);

        await artwork.save();
        res.json({ success: true, averageRating: artwork.averageRating });

    } catch (error) {
        res.status(500).json({ message: "Грешка при гласуването!" });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
module.exports.handler = serverless(app);
