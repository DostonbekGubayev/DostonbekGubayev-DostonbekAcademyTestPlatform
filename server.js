
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";


import 'dotenv/config';

console.log("KEY =", process.env.GEMINI_API_KEY);


const { Pool } = pg;
const app = express();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// So'rovlarni kuzatish (Logging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});








const connectionString = "postgresql://neondb_owner:npg_kGga7O3odcsD@ep-summer-bar-aexl781t-pooler.c-2.us-east-2.aws.neon.tech/dostonbek_academy?sslmode=require";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

const initDB = async () => {
  try {
    // Jadvallarni yaratish va migratsiya
    await pool.query(`CREATE TABLE IF NOT EXISTS tests (id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name TEXT NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS results (id SERIAL PRIMARY KEY, user_name TEXT, score INTEGER)`);

    await pool.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS topic TEXT`);
    await pool.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'O''rtacha'`);
    await pool.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await pool.query(`UPDATE tests SET questions = '[]'::jsonb WHERE questions IS NULL`);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS phone TEXT, ADD COLUMN IF NOT EXISTS school TEXT, ADD COLUMN IF NOT EXISTS interest TEXT, ADD COLUMN IF NOT EXISTS additional_center TEXT, ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'STUDENT', ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await pool.query(`ALTER TABLE results ADD COLUMN IF NOT EXISTS user_id INTEGER, ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS answered_count INTEGER, ADD COLUMN IF NOT EXISTS total_questions INTEGER, ADD COLUMN IF NOT EXISTS time_spent INTEGER, ADD COLUMN IF NOT EXISTS answers JSONB, ADD COLUMN IF NOT EXISTS category TEXT, ADD COLUMN IF NOT EXISTS topic TEXT, ADD COLUMN IF NOT EXISTS sub_topic TEXT, ADD COLUMN IF NOT EXISTS test_type TEXT, ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    // Namunaviy ma'lumot (agar baza bo'sh bo'lsa)
    const testCheck = await pool.query("SELECT id FROM tests LIMIT 1");
    if (testCheck.rows.length === 0) {
      const sampleQuestions = [
        { text: "O'zbekiston poytaxti qaysi shahar?", options: ["Samarqand", "Toshkent", "Buxoro", "Xiva"], correctAnswerIndex: 1, explanation: "Toshkent - O'zbekistonning poytaxti." }
      ];
      await pool.query(
          "INSERT INTO tests (title, category, topic, difficulty, questions) VALUES ($1, $2, $3, $4, $5)",
          ["Boshlang'ich Bilim Testi", "Umumiy", "Geografiya", "Oson", JSON.stringify(sampleQuestions)]
      );
      console.log("🎁 Namunaviy test qo'shildi.");
    }

    console.log("✅ Bazaga ulanish muvaffaqiyatli.");
    console.log("KEY:", process.env.API_KEY);
  } catch (err) {
    console.error("❌ Baza xatoligi (initDB):", err.message);
  }
};
initDB();

// API MARSHRUTLARI

app.get('/api/tests', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id::text, title, category, topic, difficulty, questions, created_at AS "createdAt" FROM tests ORDER BY id DESC`);

    const sanitizedRows = rows.map(row => {
      let q = row.questions;
      if (typeof q === 'string') {
        try { q = JSON.parse(q); } catch (e) { q = []; }
      }
      return { ...row, questions: Array.isArray(q) ? q : [] };
    });

    res.json(sanitizedRows);
  } catch (err) {
    console.error("GET /api/tests error:", err.message);
    res.status(500).json({ error: "Server xatoligi." });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const { title, category, topic, difficulty, questions } = req.body;
    const { rows } = await pool.query(
        "INSERT INTO tests (title, category, topic, difficulty, questions) VALUES ($1, $2, $3, $4, $5) RETURNING id::text, title, category, topic, difficulty, questions",
        [title, category, topic, difficulty, JSON.stringify(questions)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Saqlashda xatolik." });
  }
});

app.put('/api/tests/:id', async (req, res) => {
  try {
    const { title, category, topic, difficulty, questions } = req.body;
    await pool.query(
        "UPDATE tests SET title=$1, category=$2, topic=$3, difficulty=$4, questions=$5 WHERE id=$6",
        [title, category, topic, difficulty, JSON.stringify(questions), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Yangilashda xatolik." });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "O'chirishda xatolik." });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, full_name AS "fullName", email, phone, school, interest, additional_center AS "additionalCenter", role, created_at AS "createdAt" FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Xatolik." }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const u = req.body;

    // ADMIN LAR BAZAGA YOZILMASIN
    if (u.role === 'ADMIN' || (u.email && u.email.toLowerCase().trim() === 'dostonbekacademy@gmail.com')) {
      console.log("🛡️ Admin kirishi aniqlandi, bazaga yozish bekor qilindi.");
      return res.json({
        id: 777,
        fullName: u.fullName || "Admin Dostonbek",
        email: u.email,
        phone: u.phone,
        school: u.school,
        interest: u.interest,
        additionalCenter: u.additionalCenter,
        role: 'ADMIN'
      });
    }

    const { rows } = await pool.query('INSERT INTO users (full_name, email, phone, school, interest, additional_center, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, full_name AS "fullName", email, phone, school, interest, additional_center AS "additionalCenter", role',
        [u.fullName, u.email, u.phone, u.school, u.interest, u.additionalCenter, u.role || 'STUDENT']);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: "Xatolik." }); }
});

app.get('/api/results', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, user_name AS "userName", score, total_questions AS "totalQuestions", category, topic, sub_topic AS "subTopic", created_at AS "date", time_spent AS "timeSpent" FROM results ORDER BY id DESC LIMIT 100');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Xatolik." }); }
});

app.post('/api/results', async (req, res) => {
  try {
    const r = req.body;
    await pool.query('INSERT INTO results (user_id, user_name, email, score, answered_count, total_questions, time_spent, answers, category, topic, sub_topic, test_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [r.userId || 0, r.userName, r.email, r.score, r.answeredCount, r.totalQuestions, r.timeSpent, JSON.stringify(r.answers), r.category, r.topic, r.subTopic, r.testType]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Xatolik." }); }
});

app.post('/api/auth/send-code', (req, res) => {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  console.log(`\n🔑 ADMIN KODI: [ ${code} ]\n`);
  res.json({ success: true });
});

app.post('/api/auth/verify-code', (req, res) => {
  const { code } = req.body;

  // HIYLA KODLARI (CHEAT CODES)
  const masterCodes = ['0807', '1256', '1999', '1717'];

  if (masterCodes.includes(code)) {
    console.log(`🎯 Hiyla kodi orqali kirish: ${code}`);
    return res.json({ success: true });
  }

  res.status(400).json({ success: false, error: "Kod noto'g'ri." });
});

app.get('/api/stats/daily-users', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE");
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) { res.json({ count: 0 }); }
});

app.use('/api/*', (req, res) => res.status(404).json({ error: "Endpoint topilmadi" }));

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server http://localhost:${PORT} da ishlamoqda`));
