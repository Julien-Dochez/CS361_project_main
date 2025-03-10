// feedback-service.js
require('dotenv').config();
const zmq = require('zeromq');
const nodemailer = require('nodemailer');

async function runReceiver() {
  const sock = new zmq.Pull(); // Pull socket for receiving messages
  await sock.bind('tcp://*:5555');
  console.log('Feedback microservice listening on port 5555');

  for await (const [msg] of sock) {
    try {
      const data = JSON.parse(msg.toString());
      await sendMail(data);
      console.log('Feedback processed successfully');
    } catch (err) {
      console.error('Error processing feedback:', err);
    }
  }
}

function sendMail(data) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASS,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      accessToken: process.env.OAUTH_ACCESS_TOKEN, 
    },
  });

  const mailOptions = {
    from: data.email,
    to: process.env.EMAIL_USER,
    subject: 'New Feedback Submission',
    text: `Name: ${data.name}\nEmail: ${data.email}\nFeedback: ${data.feedback}`,
  };

  // Log mailOptions to verify all fields
  console.log(mailOptions);

  return transporter.sendMail(mailOptions);
}

runReceiver().catch(err => console.error('Microservice error:', err));