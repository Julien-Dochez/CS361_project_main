require('dotenv').config(); 
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  'http://localhost:3000/callback' 
);

const scopes = ['https://www.googleapis.com/auth/gmail.send'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this URL:');
console.log(url);

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question('Enter the code from the URL: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Access Token:', tokens.access_token);
    readline.close();
  } catch (err) {
    console.error('Error:', err);
  }
});