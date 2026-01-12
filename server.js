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

// 6 xonali tasodifiy kod yaratish funksiyasi
function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Verification kodlarni saqlash uchun
const adminCodes = new Map();

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
      
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code VARCHAR(6) NOT NULL,
        type VARCHAR(20) DEFAULT 'admin',
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email, type)  -- Bu qatorni qo'shdim
      );
    `);

    client.release();
    console.log("✅ DB Tables checked/created");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
}
initDB();

// Admin kod yuborish endpointi
app.post('/api/admin/send-code', async (req, res) => {
  const { email } = req.body;
  
  // Faqat admin emailiga ruxsat berish
  if (email !== 'dostonbekacademy@gmail.com') {
    return res.status(403).json({ error: 'Ruxsat etilmagan email manzili' });
  }

  try {
    // 6 xonali kod yaratish
    const code = generateSixDigitCode();
    
    // Kodning amal qilish muddati (10 daqiqa)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Avval eski kodni o'chirib, yangisini saqlash
    await pool.query(
      `DELETE FROM verification_codes WHERE email = $1 AND type = 'admin'`,
      [email]
    );
    
    // Yangi kodni bazaga saqlash
    await pool.query(
      `INSERT INTO verification_codes (email, code, type, expires_at) 
       VALUES ($1, $2, 'admin', $3)`,
      [email, code, expiresAt]
    );
    
    // Email tayyorlash
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Dostonbek Academy - Admin Kirish Kodi',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Dostonbek Academy</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Admin Panelga Kirish</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #1e293b; text-align: center;">Tasdiqlash Kodingiz</h2>
            <p style="color: #64748b; text-align: center; font-size: 16px;">Quyidagi 6 xonali kodni admin panelga kirish uchun ishlating:</p>
            
            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e6f7ff 100%); 
                        padding: 25px; 
                        border-radius: 10px; 
                        text-align: center; 
                        margin: 25px 0;
                        border: 2px dashed #667eea;">
              <div style="font-size: 40px; 
                          font-weight: bold; 
                          letter-spacing: 10px; 
                          color: #1e293b;
                          font-family: monospace;">
                ${code}
              </div>
            </div>
            
            <div style="background: #f8fafc; 
                        padding: 15px; 
                        border-radius: 8px; 
                        border-left: 4px solid #059669;">
              <p style="margin: 5px 0; color: #475569;">
                <strong>⚠️ Diqqat:</strong> 
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Bu kod faqat 10 daqiqa amal qiladi</li>
                  <li>Kodni hech kimga bermang</li>
                  <li>Agar siz bu kodni so'ramagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring</li>
                </ul>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Dostonbek Academy. Barcha huquqlar himoyalangan.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Dostonbek Academy Admin Kirish Kodi: ${code}\n\nBu kod 10 daqiqa amal qiladi.\n\nAgar siz bu kodni so'ramagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring.`
    };
    
    // Email yuborish
    await transporter.sendMail(mailOptions);
    console.log(`📧 [6 XONALI KOD YUBORILDI]: ${email} -> ${code}`);
    
    res.json({ 
      success: true, 
      message: '6 xonali tasdiqlash kodi email manzilingizga yuborildi' 
    });
    
  } catch (error) {
    console.error("❌ Email yuborishda xato:", error);
    res.status(500).json({ error: 'Email yuborishda xatolik yuz berdi' });
  }
});

// Admin kodni tekshirish endpointi
app.post('/api/admin/verify-code', async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email va kod talab qilinadi' });
  }
  
  // Hardcoded backup kodni tekshirish
  if (code === '070707' && email === 'dostonbekacademy@gmail.com') {
    return res.json({ 
      success: true, 
      message: 'Kod muvaffaqiyatli tasdiqlandi (backup kod)' 
    });
  }
  
  try {
    // Bazadan kodni olish
    const result = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND type = 'admin' 
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Kod topilmadi yoki muddati o\'tgan' });
    }
    
    const verification = result.rows[0];
    
    // Muddati o'tganligini tekshirish
    if (new Date() > new Date(verification.expires_at)) {
      await pool.query('DELETE FROM verification_codes WHERE id = $1', [verification.id]);
      return res.status(400).json({ error: 'Kod muddati o\'tgan. Yangi kod so\'rang' });
    }
    
    // Urinishlar sonini tekshirish (maksimum 3 marta)
    if (verification.attempts >= 3) {
      await pool.query('DELETE FROM verification_codes WHERE id = $1', [verification.id]);
      return res.status(400).json({ error: 'Juda ko\'p urinishlar. Yangi kod so\'rang' });
    }
    
    // Kodni tekshirish
    if (code === verification.code) {
      // Kod to'g'ri bo'lsa, o'chirish
      await pool.query('DELETE FROM verification_codes WHERE id = $1', [verification.id]);
      
      return res.json({ 
        success: true, 
        message: 'Kod muvaffaqiyatli tasdiqlandi' 
      });
    } else {
      // Noto'g'ri urinish, attempts sonini oshirish
      await pool.query(
        'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1',
        [verification.id]
      );
      
      const remainingAttempts = 3 - verification.attempts - 1;
      return res.status(401).json({ 
        error: `Noto'g'ri kod. ${remainingAttempts > 0 ? remainingAttempts + ' urinish qoldi' : 'Urinishlar tugadi'}` 
      });
    }
    
  } catch (error) {
    console.error("❌ Kodni tekshirishda xato:", error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Kodni qayta yuborish
app.post('/api/admin/resend-code', async (req, res) => {
  const { email } = req.body;
  
  if (email !== 'dostonbekacademy@gmail.com') {
    return res.status(403).json({ error: 'Ruxsat etilmagan' });
  }
  
  try {
    // Eski kodni o'chirish
    await pool.query(
      "DELETE FROM verification_codes WHERE email = $1 AND type = 'admin'",
      [email]
    );
    
    // Yangi 6 xonali kod yaratish
    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Yangi kodni bazaga saqlash
    await pool.query(
      `INSERT INTO verification_codes (email, code, type, expires_at) 
       VALUES ($1, $2, 'admin', $3)`,
      [email, code, expiresAt]
    );
    
    // Email yuborish
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Dostonbek Academy - Yangi Admin Kirish Kodi',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Dostonbek Academy</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Yangi Admin Kirish Kodi</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #1e293b; text-align: center;">Yangi Tasdiqlash Kodingiz</h2>
            <p style="color: #64748b; text-align: center; font-size: 16px;">Quyidagi yangi 6 xonali kodni admin panelga kirish uchun ishlating:</p>
            
            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
                        padding: 25px; 
                        border-radius: 10px; 
                        text-align: center; 
                        margin: 25px 0;
                        border: 2px dashed #059669;">
              <div style="font-size: 40px; 
                          font-weight: bold; 
                          letter-spacing: 10px; 
                          color: #065f46;
                          font-family: monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #475569; text-align: center; font-size: 14px;">
              ⚠️ Bu kod faqat 10 daqiqa amal qiladi
            </p>
          </div>
        </div>
      `,
      text: `Dostonbek Academy Yangi Admin Kirish Kodi: ${code}\n\nBu kod 10 daqiqa amal qiladi.`
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📧 [YANGI 6 XONALI KOD QAYTA YUBORILDI]: ${email} -> ${code}`);
    
    res.json({ 
      success: true, 
      message: 'Yangi 6 xonali tasdiqlash kodi yuborildi' 
    });
    
  } catch (error) {
    console.error("❌ Kodni qayta yuborishda xato:", error);
    res.status(500).json({ error: 'Kodni qayta yuborishda xatolik' });
  }
});

// Eski endpointlarni saqlab qolish
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

    if (role === 'ADMIN' || (email && email.toLowerCase().trim() === 'dostonbekacademy@gmail.com')) {
      console.log(`🛡️ Admin login: ${fullName}. Database record skipped.`);
      return res.json({ fullName, email, phone, school, interest, role, additionalCenter, id: 0 });
    }

    console.log("📥 Incoming Student Data:", { fullName, phone, role });

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

    console.log("✅ Student Saved/Updated:", rows[0].full_name);
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
