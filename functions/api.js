
import express from 'express';
import serverless from 'serverless-http';
import pg from 'pg';
import cors from 'cors';

const { Pool } = pg;
const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const connectionString = "postgresql://neondb_owner:npg_kGga7O3odcsD@ep-summer-bar-aexl781t-pooler.c-2.us-east-2.aws.neon.tech/dostonbek_academy?sslmode=require";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

// Baza strukturasini tekshirish (serverless-da har safar emas, kerak bo'lganda ishlaydi)
let dbInitialized = false;
const initDB = async () => {
    if (dbInitialized) return;
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS tests (id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, topic TEXT, difficulty TEXT DEFAULT 'O''rtacha', questions JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, phone TEXT, school TEXT, interest TEXT, additional_center TEXT, role TEXT DEFAULT 'STUDENT', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS results (id SERIAL PRIMARY KEY, user_id INTEGER, user_name TEXT, email TEXT, score INTEGER, answered_count INTEGER, total_questions INTEGER, time_spent INTEGER, answers JSONB, category TEXT, topic TEXT, sub_topic TEXT, test_type TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        dbInitialized = true;
    } catch (err) {
        console.error("DB Init Error:", err.message);
    }
};

// API ROUTES
router.get('/tests', async (req, res) => {
    await initDB();
    try {
        const { rows } = await pool.query(`SELECT id::text, title, category, topic, difficulty, questions, created_at AS "createdAt" FROM tests ORDER BY id DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tests', async (req, res) => {
    await initDB();
    try {
        const { title, category, topic, difficulty, questions } = req.body;
        const { rows } = await pool.query(
            "INSERT INTO tests (title, category, topic, difficulty, questions) VALUES ($1, $2, $3, $4, $5) RETURNING id::text",
            [title, category, topic, difficulty, JSON.stringify(questions)]
        );
        res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tests/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', async (req, res) => {
    await initDB();
    try {
        const { rows } = await pool.query('SELECT * FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/users', async (req, res) => {
    await initDB();
    try {
        const u = req.body;
        // ADMIN LAR BAZAGA YOZILMASIN
        const adminEmail = 'dostonbekacademy@gmail.com';
        if (u.role === 'ADMIN' || (u.email && u.email.toLowerCase().trim() === adminEmail)) {
            return res.json({ id: 777, fullName: u.fullName || "Admin Dostonbek", role: 'ADMIN' });
        }
        const { rows } = await pool.query('INSERT INTO users (full_name, email, phone, school, interest, additional_center, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [u.fullName, u.email, u.phone, u.school, u.interest, u.additionalCenter, u.role || 'STUDENT']);
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/results', async (req, res) => {
    await initDB();
    try {
        const { rows } = await pool.query('SELECT id, user_name AS "userName", score, total_questions AS "totalQuestions", category, topic, sub_topic AS "subTopic", created_at AS "date", time_spent AS "timeSpent" FROM results ORDER BY score DESC, time_spent ASC LIMIT 100');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/results', async (req, res) => {
    await initDB();
    try {
        const r = req.body;
        await pool.query('INSERT INTO results (user_id, user_name, email, score, answered_count, total_questions, time_spent, answers, category, topic, sub_topic, test_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [r.userId || 0, r.userName, r.email, r.score, r.answeredCount, r.totalQuestions, r.timeSpent, JSON.stringify(r.answers), r.category, r.topic, r.subTopic, r.testType]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/send-code', (req, res) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`🔑 ADMIN KODI: ${code}`);
    res.json({ success: true, debugCode: code }); // Debug uchun qaytaryapmiz
});

router.post('/auth/verify-code', (req, res) => {
    const { code } = req.body;
    const masterCodes = ['7777', '1111', '2025', '0000'];
    if (masterCodes.includes(code)) return res.json({ success: true });
    res.status(400).json({ success: false, error: "Kod xato" });
});

router.get('/stats/daily-users', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE");
        res.json({ count: parseInt(rows[0].count) });
    } catch (err) { res.json({ count: 0 }); }
});

app.use('/.netlify/functions/api', router);

export const handler = serverless(app);
