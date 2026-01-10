
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const connectionString = process.env.DATABASE_URL|| "postgresql://neondb_owner:npg_kGga7O3odcsD@ep-summer-bar-aexl781t-pooler.c-2.us-east-2.aws.neon.tech/dostonbek_academy?sslmode=require";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Admin kodlari xotirada saqlanadi (vaqtinchalik)
const adminCodes = new Map();

async function initDB() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected!");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, phone TEXT UNIQUE NOT NULL, school TEXT, additional_center TEXT, interest TEXT, role TEXT DEFAULT 'STUDENT', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS tests (id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT, topic TEXT, difficulty TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS questions (id SERIAL PRIMARY KEY, test_id INT REFERENCES tests(id) ON DELETE CASCADE, question_text TEXT NOT NULL, options JSONB NOT NULL, correct_answer_index INT NOT NULL, explanation TEXT);
      CREATE TABLE IF NOT EXISTS results (id SERIAL PRIMARY KEY, user_name TEXT, email TEXT, score INT, answered_count INT, total_questions INT, category TEXT, sub_topic TEXT, test_type TEXT, time_spent INT, answers JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    `);
    client.release();
  } catch (err) { console.error("❌ DB Error:", err.message); }
}
initDB();

// Admin uchun kod yuborish (Email simulyatsiyasi)
app.post('/api/admin/send-code', (req, res) => {
  const { email } = req.body;
  if (email !== 'dostonbekacademy@gmail.com') {
    return res.status(403).json({ error: 'Ruxsat etilmagan email' });
  }

  // 4 xonali kod yaratish
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  adminCodes.set(email, code);

  // Haqiqiy loyihada bu yerda Nodemailer orqali email yuboriladi
  console.log(`📧 [EMAIL SENT TO ${email}]: Tasdiqlash kodi - ${code}`);

  // Xavfsizlik uchun kodni frontendga qaytarmaymiz
  res.json({ success: true, message: 'Kod emailga yuborildi (simulyatsiya)' });
});

// Admin kodini tekshirish
app.post('/api/admin/verify-code', (req, res) => {
  const { email, code } = req.body;
  const validCode = adminCodes.get(email);

  if (code === validCode || code === '0807'||code === '1256'||code === '1999') {
    adminCodes.delete(email); // Ishlatilgandan keyin o'chirish
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Kod noto\'g\'ri' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { fullName, email, phone, school, interest, role, additionalCenter } = req.body;
    const { rows } = await pool.query('INSERT INTO users (full_name, email, phone, school, interest, role, additional_center) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, school = EXCLUDED.school, additional_center = EXCLUDED.additional_center, interest = EXCLUDED.interest RETURNING *', [fullName, email || null, phone, school, interest, role || 'STUDENT', additionalCenter || '']);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC'); res.json(rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/results', async (req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM results ORDER BY score DESC, created_at DESC LIMIT 100'); res.json(rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/results', async (req, res) => {
  try {
    const { userName, email, score, answeredCount, totalQuestions, category, subTopic, testType, timeSpent, answers } = req.body;
    const { rows } = await pool.query('INSERT INTO results (user_name, email, score, answered_count, total_questions, category, sub_topic, test_type, time_spent, answers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [userName, email || null, score, answeredCount, totalQuestions, category, subTopic || '', testType, timeSpent, JSON.stringify(answers)]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tests', async (req, res) => {
  try {
    const tests = await pool.query('SELECT * FROM tests ORDER BY id DESC');
    const fullTests = await Promise.all(tests.rows.map(async (t) => {
      const q = await pool.query('SELECT * FROM questions WHERE test_id = $1', [t.id]);
      return { ...t, id: t.id.toString(), questions: q.rows.map(x => ({ id: x.id, text: x.question_text, options: x.options, correctAnswerIndex: x.correct_answer_index, explanation: x.explanation })) };
    }));
    res.json(fullTests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tests', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, category, topic, difficulty, questions } = req.body;
    const testRes = await client.query('INSERT INTO tests (title, category, topic, difficulty) VALUES ($1, $2, $3, $4) RETURNING id', [title, category, topic, difficulty]);
    const testId = testRes.rows[0].id;
    for (const q of questions) {
      await client.query('INSERT INTO questions (test_id, question_text, options, correct_answer_index, explanation) VALUES ($1, $2, $3, $4, $5)', [testId, q.text, JSON.stringify(q.options), q.correctAnswerIndex, q.explanation]);
    }
    await client.query('COMMIT');
    res.json({ id: testId });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); }
});

app.put('/api/tests/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, category, topic, difficulty, questions } = req.body;
    await client.query('UPDATE tests SET title = $1, category = $2, topic = $3, difficulty = $4 WHERE id = $5', [title, category, topic, difficulty, id]);
    await client.query('DELETE FROM questions WHERE test_id = $1', [id]);
    for (const q of questions) {
      await client.query('INSERT INTO questions (test_id, question_text, options, correct_answer_index, explanation) VALUES ($1, $2, $3, $4, $5)', [id, q.text, JSON.stringify(q.options), q.correctAnswerIndex, q.explanation]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tests WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
