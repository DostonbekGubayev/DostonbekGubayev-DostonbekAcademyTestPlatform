
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function initDB() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected!");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
                                         id SERIAL PRIMARY KEY,
                                         full_name TEXT NOT NULL,
                                         email TEXT,
                                         phone TEXT UNIQUE NOT NULL,
                                         school TEXT,
                                         additional_center TEXT,
                                         interest TEXT,
                                         role TEXT DEFAULT 'STUDENT',
                                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tests (
                                         id SERIAL PRIMARY KEY,
                                         title TEXT NOT NULL,
                                         category TEXT,
                                         topic TEXT,
                                         difficulty TEXT,
                                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
                                             id SERIAL PRIMARY KEY,
                                             test_id INT REFERENCES tests(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer_index INT NOT NULL,
        explanation TEXT
        );

      CREATE TABLE IF NOT EXISTS results (
                                           id SERIAL PRIMARY KEY,
                                           user_name TEXT,
                                           email TEXT,
                                           score INT,
                                           answered_count INT,
                                           total_questions INT,
                                           category TEXT,
                                           sub_topic TEXT,
                                           test_type TEXT,
                                           time_spent INT,
                                           answers JSONB,
                                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    console.log("✅ DB Tables checked/created");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
}
initDB();


function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const adminCodes = new Map();

app.post('/api/admin/send-code', async (req, res) => {
  const { email } = req.body;

  if (email !== 'dostonbekacademy@gmail.com')
    return res.status(403).json({ error: 'Ruxsat etilmagan' });

  const code = generate6DigitCode();
  const expiresAt = Date.now() + 3 * 60 * 1000; // 3 daqiqa

  adminCodes.set(email, {
    code,
    expiresAt,
    attempts: 0
  });

  const mailOptions = {
    from: `"Dostonbek Academy" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Dostonbek Academy - Admin Kirish Kodi',
    html: `
      <div style="font-family:sans-serif;padding:20px;border-radius:10px;border:1px solid #e2e8f0">
        <h2 style="color:#059669">Admin Panelga Kirish</h2>
        <p>Tasdiqlash kodingiz:</p>
        <h1 style="letter-spacing:6px;background:#f1f5f9;padding:10px;border-radius:6px">
          ${code}
        </h1>
        <p style="font-size:12px;color:#64748b">
          Kod 3 daqiqa amal qiladi. Hech kimga bermang.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 EMAIL SENT → ${email}: ${code}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Email error:', err);
    res.status(500).json({ error: 'Email yuborilmadi' });
  }
});

app.post('/api/admin/verify-code', (req, res) => {
  const { email, code } = req.body;
  const data = adminCodes.get(email);

  if (!data)
    return res.status(400).json({ error: 'Kod topilmadi yoki muddati tugagan' });

  if (Date.now() > data.expiresAt) {
    adminCodes.delete(email);
    return res.status(410).json({ error: 'Kod muddati tugagan' });
  }

  if (data.attempts >= 3) {
    adminCodes.delete(email);
    return res.status(429).json({ error: 'Juda ko‘p urinish' });
  }

  if (code !== data.code) {
    data.attempts++;
    return res.status(401).json({ error: 'Xato kod' });
  }

  adminCodes.delete(email);
  res.json({ success: true });
});

app.get('/api/tests', async (req, res) => {
  try {
    const query = `
      SELECT t.*,
             COALESCE(json_agg(q.*) FILTER (WHERE q.id IS NOT NULL), '[]') as questions
      FROM tests t
             LEFT JOIN questions q ON t.id = q.test_id
      GROUP BY t.id
      ORDER BY t.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    const formattedTests = rows.map(t => ({
      ...t,
      id: t.id.toString(),
      questions: t.questions.map(q => ({
        id: q.id,
        text: q.question_text,
        options: q.options,
        correctAnswerIndex: q.correct_answer_index,
        explanation: q.explanation
      }))
    }));
    res.json(formattedTests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tests', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, category, topic, difficulty, questions } = req.body;
    const testRes = await client.query('INSERT INTO tests (title, category, topic, difficulty) VALUES ($1, $2, $3, $4) RETURNING id', [title, category, topic, difficulty]);
    const testId = testRes.rows[0].id;
    if (questions && questions.length > 0) {
      for (const q of questions) {
        await client.query('INSERT INTO questions (test_id, question_text, options, correct_answer_index, explanation) VALUES ($1, $2, $3, $4, $5)', [testId, q.text, JSON.stringify(q.options), q.correctAnswerIndex, q.explanation]);
      }
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
    await pool.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { fullName, email, phone, school, interest, role, additionalCenter } = req.body;
    console.log("📥 Incoming User Data:", { fullName, phone, role });

    // ON CONFLICT qismida role va email yangilanishi qo'shildi
    const query = `
      INSERT INTO users (full_name, email, phone, school, interest, role, additional_center)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (phone) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
                   email = EXCLUDED.email,
                   school = EXCLUDED.school,
                   additional_center = EXCLUDED.additional_center,
                   interest = EXCLUDED.interest,
                   role = EXCLUDED.role
                   RETURNING *
    `;

    const { rows } = await pool.query(query, [
      fullName,
      email || null,
      phone,
      school,
      interest,
      role || 'STUDENT',
      additionalCenter || ''
    ]);

    console.log("✅ User Saved/Updated:", rows[0].full_name, "(Role:", rows[0].role + ")");
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error in /api/users:", err.message);
    res.status(500).json({ error: err.message });
  }
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
