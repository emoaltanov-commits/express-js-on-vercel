const mongoose = require('mongoose');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
// --- ВРЪЗКА КЪМ MONGODB ---

mongoose.connect("mongodb://user2:mGWCK5HOskhp9MLb@ac-sjwfetq-shard-00-00.lt12gti.mongodb.net:27017,ac-sjwfetq-shard-00-01.lt12gti.mongodb.net:27017,ac-sjwfetq-shard-00-02.lt12gti.mongodb.net:27017/?replicaSet=atlas-vdhsck-shard-0&ssl=true&authSource=admin")
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB error:", err));
// --- USER MODEL ---

const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);
    // Настройки на сървъра
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'artworks.json');

// --- ПОМОЩНИ ФУНКЦИИ ---

const getData = () => {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(DATA_FILE));
};

const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(USERS_FILE));
};

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

app.get('/api/artworks', (req, res) => {
    res.json(getData());
});

app.post('/api/artworks', (req, res) => {
    const artworks = getData();
    const newArtwork = {
        id: Date.now(), // Уникално ID
        studentName: req.body.studentName,
        imageUrl: req.body.imageUrl,
        category: req.body.category,
        grade: parseInt(req.body.grade),
        voters: [], // Списък с имейли на гласувалите
        averageRating: 0
    };
    artworks.push(newArtwork);
    saveData(artworks);
    res.status(201).send("Картината е добавена успешно!");
});
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
// ГЛАВНИЯТ МАРШРУТ ЗА ГЛАСУВАНЕ (ПОПРАВЕН)
app.post('/api/vote', (req, res) => {
    const { id, rating, email } = req.body;
    const artworks = getData();
    
    // Търсим по ID (внимаваме за типа данни)
    const artIndex = artworks.findIndex(a => a.id == id);

    if (artIndex !== -1) {
        const art = artworks[artIndex];

        if (!art.voters) art.voters = [];

        // Проверка дали този имейл вече е гласувал
        if (art.voters.includes(email)) {
            return res.status(400).json({ message: "Вече сте гласували за тази картина!" });
        }

        // Добавяме гласа
        art.voters.push(email);
        
        // Изчисляване на новия среден рейтинг
        const voteValue = parseInt(rating);
        const totalVotes = art.voters.length;
        
        // Математика: (старо средно * стари гласове + нов глас) / нови гласове
        const currentAvg = art.averageRating || 0;
        art.averageRating = parseFloat(((currentAvg * (totalVotes - 1) + voteValue) / totalVotes).toFixed(1));

        saveData(artworks);
        res.json({ success: true, averageRating: art.averageRating });
    } else {
        res.status(404).json({ message: "Творбата не е намерена" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(` Сървърът е готов на http://localhost:${port}`);
});

module.exports = app;