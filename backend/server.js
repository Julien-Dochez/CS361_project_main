// Import necessary modules
require('dotenv').config();

const express = require('express');
const pg = require('pg');
const bcrypt = require('bcrypt'); // To hash and compare passwords
const session = require('express-session'); // For session-based authentication
const path = require('path');
const nodemailer = require('nodemailer'); // For sending emails
const crypto = require('crypto'); // For generating a secure random reset code
const zmq = require('zeromq'); // For ZeroMQ integration
const axios = require('axios');

// Express setup
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const feedbackSocket = new zmq.Push();
feedbackSocket.connect('tcp://localhost:5555'); // Connect to microservice
const dailyLogSocket = new zmq.Push();
dailyLogSocket.connect('tcp://localhost:5556');

app.post('/submit-feedback', async (req, res) => {
  try {
    await feedbackSocket.send(JSON.stringify(req.body)); // Send message to microservice
    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Database connection
const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: 'localhost',
    database: 'myfitness',
    password: process.env.DB_PASSWORD,
    port: 5432,
});

// Session setup with PostgreSQL-backed storage
app.use(session({
    secret: process.env.SESSION_SECRET || 'secretkey',
    resave: false,
    saveUninitialized: false, // Avoid creating empty sessions
}));

const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/daily-log', createProxyMiddleware({
    target: 'http://localhost:3002', // Updated port
    changeOrigin: true,
    pathRewrite: { '^/daily-log': '' }
  }));

app.post('/api/log-activity', async (req, res) => {
    if (!req.session.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      // Get user ID from session
      const userResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [req.session.username]
      );
      
      const user_id = userResult.rows[0].id;
      const { date, activity } = req.body;
  
      // Send via ZeroMQ to microservice
      await dailyLogSocket.send(JSON.stringify({
        action: 'log',
        user_id,
        date,
        activity
      }));
      
      res.status(201).json({ message: 'Activity logged successfully' });
    } catch (err) {
      console.error('Error logging activity:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get calendar data endpoint
  app.get('/api/calendar-activities', async (req, res) => {
    if (!req.session.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const userResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [req.session.username]
      );
      
      const user_id = userResult.rows[0].id;
      const { date } = req.query;
  
      // Proxy request to daily log service
      const response = await axios.get('http://localhost:3001/api/calendar', {
        params: { user_id, date }
      });
      
      res.json(response.data);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.use('/goals', createProxyMiddleware({
    target: 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/goals': '' }
}));


// Serve static files from the 'public' folder
const publicPath = path.join(__dirname, '..', 'public'); // Adjusted path
app.use(express.static(publicPath));
console.log('Serving static files from:', publicPath);

// Default route - Redirect to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Serve login page explicitly
app.get('/login', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

// Serve signup page explicitly
app.get('/register', (req, res) => {
    res.sendFile(path.join(publicPath, 'register.html'));
});

// Handle signup (user registration) - Hashing the password before saving
app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Check if username already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).send('Username already exists');
        }

        // Check if email already exists
        const existingEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).send('Email already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store the username, email, and hashed password in the database
        await pool.query('INSERT INTO users (username, password, email) VALUES ($1, $2, $3)', [username, hashedPassword, email]);
        res.status(201).send('User registered successfully');
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Internal server error');
    }
});

app.post('/login', async (req, res) => {
    try {
      const response = await axios.post('http://localhost:3001/authenticate', req.body);
      
      if (response.data.success) {
        req.session.username = response.data.user.username;
        return res.redirect('/main');
      } else {
        res.status(401).send('Invalid credentials');
      }
    } catch (error) {
      console.error('Login service error:', error.message);
      res.status(500).send('Login service unavailable');
    }
});

// Main page route (for authenticated users)
app.get('/main', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(publicPath, 'main.html'));
});

// Route to serve the feedback form
app.get('/feedback', (req, res) => {
  res.sendFile(path.join(publicPath, 'feedback.html')); // Adjust the path to your feedback form HTML
});

// New endpoint to fetch user data
// In server.js
app.get('/user-info', (req, res) => {
    if (req.session.username) {
      // Fetch the user ID from the database using the session username
      pool.query(
        'SELECT id FROM users WHERE username = $1',
        [req.session.username],
        (err, result) => {
          if (err) {
            res.status(500).json({ error: 'Database error' });
          } else {
            res.json({ 
              username: req.session.username,
              userId: result.rows[0].id // Add this line
            });
          }
        }
      );
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/login');
    });
});

// Route to send password reset code
app.post('/send-reset-code', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email exists in the database
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Email not found' });
        }

        // Generate a random reset code
        const resetCode = crypto.randomBytes(3).toString('hex'); // 6-character hex code

        // Store the reset code and associate it with the user in the database
        await pool.query('UPDATE users SET reset_code = $1 WHERE email = $2', [resetCode, email]);

        // Send email with the reset code
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Code',
            text: `Your password reset code is: ${resetCode}`,
        };

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASS,
            },
        });

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Error sending email' });
            }
            console.log('Email sent:', info.response);
            res.status(200).json({ success: true, message: 'Reset code sent successfully' });
        });
    } catch (err) {
        console.error('Error sending reset code:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Route to verify reset code and allow password reset
app.post('/reset-password', async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    try {
        // Check if the reset code matches the stored code for the user
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Email not found' });
        }

        if (user.rows[0].reset_code !== resetCode) {
            return res.status(400).json({ success: false, message: 'Invalid reset code' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

        // Clear the reset code
        await pool.query('UPDATE users SET reset_code = NULL WHERE email = $1', [email]);

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Serve password reset page explicitly
app.get('/password-reset', (req, res) => {
    res.sendFile(path.join(publicPath, 'password-reset.html'));
});

// Route to send username
app.post('/send-username', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email exists in the database
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Email not found' });
        }

        const username = user.rows[0].username;

        // Send email with the username
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Username',
            text: `Your username is: ${username}`,
        };

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASS,
            },
        });

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Error sending email' });
            }
            console.log('Email sent:', info.response);
            res.status(200).json({ success: true, message: 'Username sent successfully' });
        });
    } catch (err) {
        console.error('Error sending username:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server shut down.');
        process.exit(0);
    });
});