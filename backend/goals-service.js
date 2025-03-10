const express = require('express');
const path = require('path');
const app = express();
const PORT = 3003;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public', 'goals')));

// Serve goals.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'goals.html'));
});

app.listen(PORT, () => {
  console.log(`Goals service running on port ${PORT}`);
});