import bcrypt from 'bcryptjs';
import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

const db = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

async function createSU() {
  let conn;
  try {
    conn = await db.getConnection();
    console.log('Connected to database');
    
    // Check if SU already exists
    const [existing] = await conn.query('SELECT * FROM SU WHERE SU = ?', ['su']);
    if (existing) {
      console.log('SU user already exists');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert SU user
    await conn.query(
      'INSERT INTO SU (SU, Passwd) VALUES (?, ?)',
      ['su', hashedPassword]
    );
    
    console.log('SU user created successfully');
    console.log('Username: su');
    console.log('Password: password123');
    
  } catch (err) {
    console.error('Error creating SU user:', err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

createSU(); 