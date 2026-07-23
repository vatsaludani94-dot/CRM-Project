require('dotenv').config({ path: './backend/.env' });
const nodemailer = require('nodemailer');

async function testSmtp() {
  console.log('=== SMTP DIAGNOSTIC STATUS ===');
  console.log(`SMTP_HOST configured: ${Boolean(process.env.SMTP_HOST)}`);
  console.log(`SMTP_PORT configured: ${Boolean(process.env.SMTP_PORT)} (default 587)`);
  console.log(`SMTP_USER configured: ${Boolean(process.env.SMTP_USER)}`);
  console.log(`SMTP_PASS configured: ${Boolean(process.env.SMTP_PASS)}`);
  console.log(`SMTP_FROM configured: ${Boolean(process.env.SMTP_FROM)}`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n[DIAGNOSTIC RESULT]: SMTP_PASS (or host/user) is missing in backend/.env.');
    console.log('Nodemailer is currently falling back to DEV EMAIL SERVICE SIMULATOR (console logging).');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('\n[DIAGNOSTIC RESULT]: SMTP connection verified successfully!');
  } catch (err) {
    console.error('\n[DIAGNOSTIC RESULT]: SMTP verification failed:', err.message);
  }
}

testSmtp();
