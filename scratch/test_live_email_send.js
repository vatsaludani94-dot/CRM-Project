require('dotenv').config({ path: './backend/.env' });
const { sendRegistrationVerificationEmail } = require('../backend/services/invoice-email.service');

async function testLiveEmail() {
  console.log('=== LIVE SMTP TEST EMAIL DISPATCH ===');
  console.log(`Target Email: ${process.env.SMTP_USER}`);

  try {
    const testCode = '852963';
    const result = await sendRegistrationVerificationEmail(process.env.SMTP_USER, testCode);
    console.log('[LIVE TEST RESULT]: Test verification email sent successfully!');
    console.log(`[MESSAGE ID]: ${result.messageId}`);
  } catch (err) {
    console.error('[LIVE TEST RESULT]: Email sending failed:', err.message);
  }
}

testLiveEmail();
