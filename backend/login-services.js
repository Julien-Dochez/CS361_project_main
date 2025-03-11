// login-service.js
require('dotenv').config();
const express = require('express');
const pg = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const port = 3001;

// Database connection
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Authentication endpoint
app.post('/authenticate', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  
  try {
    // Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Return user data for session creation in main server
    res.json({ 
      success: true, 
      user: { username: user.username } 
    });

  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Login microservice running on port ${port}`);
});