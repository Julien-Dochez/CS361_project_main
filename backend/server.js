// Import necessary modules
const express = require('express');
const pg = require('pg');
const bcrypt = require('bcrypt'); // To hash and compare passwords
const session = require('express-session'); // For session-based authentication
const path = require('path');

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

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});