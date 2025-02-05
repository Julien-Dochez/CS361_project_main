const bcrypt = require('bcrypt');
const pg = require('pg');

// Database connection
const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'myfitness',
  password: 'crusader', // Replace with your actual password
  port: 5432,
});

// Function to update all user passwords
const updatePasswords = async () => {
  const client = await pool.connect();

  try {
    // Get all users with plain text passwords
    const result = await client.query('SELECT * FROM users');
    const users = result.rows;

    // Loop through each user and hash their password
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Update the password to be hashed
      await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
      console.log(`Updated password for user: ${user.username}`);
    }
  } catch (err) {
    console.error('Error updating passwords:', err);
  } finally {
    client.release();
  }
};

// Run the function
updatePasswords();