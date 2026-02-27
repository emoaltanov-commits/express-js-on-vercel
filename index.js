const mongoose = require('mongoose');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
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

const User = mongoose.model('User', userSchema);

// --- ARTWORK MODEL ---
const artworkSchema = new mongoose.Schema({
    studentName: String,
    category: String,
    grade: Number,
    voters: [String],  // List of emails who voted
    averageRating: { type: Number, default: 0 },
    imageId: mongoose.Schema.Types.ObjectId  // MongoDB reference to the image
});

const Artwork = mongoose.model('Artwork', artworkSchema);

// --- MONGO GRIDFS SETUP ---
const conn = mongoose.connection;
let gfs;

conn.once('open', () => {
    gfs = new GridFSBucket(conn.db, {
        bucketName: 'artworks'
    });
});

// --- MULTER SETUP FOR IMAGE UPLOADS ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
        const artworks = await Artwork.find().populate('imageId');
        res.json(artworks);
    } catch (err) {
        res.status(500).json({ message: "Грешка при зареждане на картините!" });
    }
});

// Add a new artwork
app.post('/api/artworks', upload.single('image'), async (req, res) => {
    const { studentName, category, grade } = req.body;

    try {
        // Store image in GridFS
        const uploadStream = gfs.openUploadStream(req.file.originalname, {
            content_type: req.file.mimetype
        });

        uploadStream.end(req.file.buffer);

        // Create new artwork document
        const newArtwork = new Artwork({
            studentName,
            category,
            grade: parseInt(grade),
            voters: [],
            averageRating: 0,
            imageId: uploadStream.id  // Store the image ID for future reference
        });

        await newArtwork.save();
        res.status(201).send("Картината е добавена успешно!");
    } catch (error) {
        res.status(500).json({ message: "Грешка при добавяне на картината!" });
    }
});

// --- МАРШРУТ ЗА ИЗТЕГЛЯНЕ НА ИЗОБРАЖЕНИЕ ---
app.get('/api/artworks/:id/image', (req, res) => {
    const fileId = mongoose.Types.ObjectId(req.params.id);

    gfs.openDownloadStream(fileId)
        .pipe(res)
        .on('error', (err) => {
            res.status(500).json({ message: "Грешка при изтегляне на изображение!" });
        });
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

        artwork.voters.push(email);
        const totalVotes = artwork.voters.length;
        const currentAvg = artwork.averageRating || 0;
        const voteValue = parseInt(rating);

        // Calculate new average rating
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
