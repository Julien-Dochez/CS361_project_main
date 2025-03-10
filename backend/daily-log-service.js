const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve daily-log.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'daily-log.html'));
});

app.listen(PORT, () => {
  console.log(`Daily log service running on port ${PORT}`);
});