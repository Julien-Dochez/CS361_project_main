// Import necessary modules
const express = require('express');
const pg = require('pg');
const bcrypt = require('bcrypt'); // To hash and compare passwords
const session = require('express-session'); // For session-based authentication
const path = require('path');
const nodemailer = require('nodemailer'); // Import Nodemailer
const crypto = require('crypto'); // For generating a secure random reset code

const app = express();
const port = 3000;

// Database connection
const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'myfitness',
  password: 'crusader', // Update with your actual password
  port: 5432,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup with PostgreSQL-backed storage
app.use(session({
  secret: 'secretkey', 
  resave: false, 
  saveUninitialized: false, // Avoid creating empty sessions
}));

// Create a reusable transporter using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use another email provider
  auth: {
    user: 'myFitnessAppCreator@gmail.com', // your email address
    pass: 'dknw kikj xtlz apdx' // your email password or app password if using Gmail
  }
});


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
  const { username, password, email } = req.body; // Capture email as well

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


// Handle login POST request - Compare hashed password
app.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  try {
    // Check if the provided usernameOrEmail exists in either the username or email column
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Compare the entered password with the stored hashed password
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        req.session.username = user.username; // Store only username in session
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

// Main page route (for authenticated users)
app.get('/main', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Main Page</title>
        <link rel="stylesheet" href="main.css">
    </head>
    <body>
        <h1>Welcome to Your Dashboard</h1>
        <p>Hello, ${req.session.username}!</p> <!-- Display the username -->
        <div class="button-container">
            <button onclick="window.location.href='/daily-log'">Daily Log</button>
            <button onclick="window.location.href='/goals'">Goals</button>
            <button onclick="window.location.href='/comparison'">Comparison</button>
            <button onclick="window.location.href='/help'">Help</button>
        </div>
        <div class="logout-container">
            <button onclick="logout()">Logout</button>
        </div>
        <script>
            function logout() {
                fetch('/logout', { method: 'POST' })
                .then(() => {
                    window.location.href = '/login';
                });
            }
        </script>
    </body>
    </html>
  `);
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

    // Generate a random reset code (you can adjust length as needed)
    const resetCode = crypto.randomBytes(3).toString('hex'); // 6-character hex code

    // Store the reset code and associate it with the user in the database (you can expire it after a period)
    await pool.query('UPDATE users SET reset_code = $1 WHERE email = $2', [resetCode, email]);

    // Send email with the reset code
    const mailOptions = {
      from: 'myFitnessAppCreator@gmail.com',
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error); // Log the error
        return res.status(500).json({ success: false, message: 'Error sending email' });
      }
      console.log('Email sent:', info.response); // Log the success response
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
      console.error('Email not found');
      return res.status(400).json({ success: false, message: 'Email not found' });
    }

    if (user.rows[0].reset_code !== resetCode) {
      console.error('Invalid reset code');
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    // Clear the reset code (optional)
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
      from: 'myFitnessAppCreator@gmail.com',
      to: email,
      subject: 'Your Username',
      text: `Your username is: ${username}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error); // Log the error
        return res.status(500).json({ success: false, message: 'Error sending email' });
      }
      console.log('Email sent:', info.response); // Log the success response
      res.status(200).json({ success: true, message: 'Username sent successfully' });
    });
  } catch (err) {
    console.error('Error sending username:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});