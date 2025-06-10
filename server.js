
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const scrapeCriterion = require('./scraper');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DATABASE_PATH || './data/criterion_releases.db';

// Ensure DB folder exists
if (!fs.existsSync('./data')) fs.mkdirSync('./data');

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spine_number TEXT,
    title TEXT,
    director TEXT,
    release_date TEXT,
    release_status TEXT,
    format TEXT,
    price TEXT,
    description TEXT,
    url TEXT,
    cover_art_url TEXT,
    special_features TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Routes
app.get('/', (req, res) => {
  db.all("SELECT * FROM films ORDER BY release_date DESC LIMIT 10", [], (err, rows) => {
    if (err) return res.status(500).send("DB error");
    res.render('index', { films: rows });
  });
});

app.get('/api/films', (req, res) => {
  db.all("SELECT * FROM films ORDER BY release_date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.post('/api/scrape', async (req, res) => {
  try {
    await scrapeCriterion(db);
    res.json({ message: 'Scraping complete' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/export', (req, res) => {
  db.all("SELECT * FROM films ORDER BY release_date DESC", [], (err, rows) => {
    if (err) return res.status(500).send("Export failed");
    res.json({ exported_at: new Date().toISOString(), total_films: rows.length, films: rows });
  });
});

// Background job - scrape every 24h
cron.schedule('0 9 * * *', () => scrapeCriterion(db));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
