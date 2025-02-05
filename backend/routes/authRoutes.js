const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const router = express.Router();

// Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        req.session.user = user;
        return res.redirect('/main');
      } else {
        return res.status(400).send('Invalid credentials');
      }
    } else {
      return res.status(400).send('User not found');
    }
  } catch (err) {
    console.error('Error logging in:', err);
    return res.status(500).send('Internal server error');
  }
});

// Registration Route
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    res.send('User registered successfully');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;