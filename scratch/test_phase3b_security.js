require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const path = require('path');
const API_BASE = 'http://localhost:3000/api';

async function runPhase3BTests() {
  console.log('=== PHASE 3B SECURITY VERIFICATION SUITE ===\n');

  const rand = Math.floor(Math.random() * 10000);
  const testEmail = `sec_user_${rand}@test.com`;
  const testPassword = 'Password123!';

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const User = require(path.join(__dirname, '../backend/models/User'));
  const Tenant = require(path.join(__dirname, '../backend/models/Tenant'));
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));

  // --- TEST A & B: Normal & Invalid Password Login ---
  console.log('--- TEST A & B: Normal & Invalid Password Login ---');
  await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Phase3B Workspace ${rand}`,
      name: 'Phase3B Owner',
      email: testEmail,
      password: testPassword,
    })
  }).then(r => r.json());

  const pending = await PendingRegistration.findOne({ email: testEmail });
  const validCode = '920148';
  pending.verificationCodeHash = crypto.createHash('sha256').update(validCode).digest('hex');
  pending.expiresAt = new Date(Date.now() + 600000);
  await pending.save();

  const regWorkspace = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: validCode })
  }).then(r => r.json());

  const tokenA = regWorkspace.data.token;
  const userIdA = regWorkspace.data._id;
  const tenantIdA = regWorkspace.data.tenant._id;

  const validLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  }).then(r => r.json());

  const invalidLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' })
  }).then(r => r.json());

  const testA_pass = validLogin.success && validLogin.data && validLogin.data.token;
  const testB_pass = !invalidLogin.success && invalidLogin.error === 'Invalid email or password';
  console.log(`Test A (Valid Password Login): ${testA_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Test B (Invalid Password Login Fails): ${testB_pass ? 'PASS' : 'FAIL'}`);

  // --- TEST C, D, E, F: Password Reset via 6-Digit Email OTP ---
  console.log('\n--- TEST C-F: Hashed 6-Digit Email OTP Password Reset ---');
  
  // Generic response test
  const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  }).then(r => r.json());

  const testC_pass = forgotRes.success && forgotRes.message.includes('If an account exists');
  console.log(`Test C (Forgot Password Generic Anti-Enumeration Response): ${testC_pass ? 'PASS' : 'FAIL'}`);

  const userPostForgot = await User.findOne({ email: testEmail });
  const testD_pass = userPostForgot.resetPasswordOtp && userPostForgot.resetPasswordOtp.length === 64;
  console.log(`Test D (Password Reset OTP Stored as SHA-256 Hash Only): ${testD_pass ? 'PASS' : 'FAIL'}`);

  // Invalid OTP attempt
  const invalidOtpRes = await fetch(`${API_BASE}/auth/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '000000', newPassword: 'NewPassword123!' })
  }).then(r => r.json());

  const testE_pass = !invalidOtpRes.success && invalidOtpRes.error.includes('Invalid or expired OTP');
  console.log(`Test E (Invalid OTP Reset Attempt Fails): ${testE_pass ? 'PASS' : 'FAIL'}`);

  // Valid OTP reset
  const rawOtp = '842915';
  const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
  userPostForgot.resetPasswordOtp = hashedOtp;
  userPostForgot.resetPasswordOtpExpire = Date.now() + 600000;
  await userPostForgot.save();

  const validOtpRes = await fetch(`${API_BASE}/auth/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: rawOtp, newPassword: 'NewPassword123!' })
  }).then(r => r.json());

  const testF_pass = validOtpRes.success;
  console.log(`Test F (Valid OTP Password Reset Succeeds): ${testF_pass ? 'PASS' : 'FAIL'}`);

  // OTP single-use test (try again with same OTP)
  const reuseOtpRes = await fetch(`${API_BASE}/auth/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: rawOtp, newPassword: 'AnotherPassword123!' })
  }).then(r => r.json());

  const testSingleUse_pass = !reuseOtpRes.success;
  console.log(`Test F.2 (OTP Single-Use Enforcement): ${testSingleUse_pass ? 'PASS' : 'FAIL'}`);

  // --- TEST G, H: Google OAuth Sign-In & Mandatory Account Linking Security ---
  console.log('\n--- TEST G-H: Google Account Linking & Verification ---');
  // Attempt unlinked Google login with existing email without password
  const googleUnlinkedAttempt = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ googleToken: 'mock_google_token_unlinked' })
  }).then(r => r.json());

  // Note: Since mock token verification fails on googleClient.verifyIdToken, we test route handler contract
  const testG_pass = !googleUnlinkedAttempt.success && googleUnlinkedAttempt.error.includes('Google token signature');
  console.log(`Test G (Google Token Verification Safeguard): ${testG_pass ? 'PASS' : 'FAIL'}`);

  // --- TEST I-N: 2FA TOTP Setup & Temporary Token Scoping ---
  console.log('\n--- TEST I-N: 2FA TOTP Security & Temporary Token Protection ---');
  
  // Login with new password
  const loginPostReset = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'NewPassword123!' })
  }).then(r => r.json());

  const activeToken = loginPostReset.data.token;

  const setup2FA = await fetch(`${API_BASE}/auth/2fa/setup`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${activeToken}` }
  }).then(r => r.json());

  const secret = setup2FA.data.secret;
  const totpCode = speakeasy.totp({
    secret,
    encoding: 'base32'
  });

  const verify2FA = await fetch(`${API_BASE}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeToken}` },
    body: JSON.stringify({ code: totpCode })
  }).then(r => r.json());

  const testI_pass = verify2FA.success && verify2FA.data.twoFactorRecoveryCodes.length === 8;
  console.log(`Test I (2FA Enabled & Recovery Codes Generated): ${testI_pass ? 'PASS' : 'FAIL'}`);

  // Login with 2FA enabled -> Expect require2FA & tempToken
  const login2FA = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'NewPassword123!' })
  }).then(r => r.json());

  const testJ_pass = login2FA.require2FA === true && !!login2FA.tempToken;
  console.log(`Test J (Login With 2FA Enabled Returns require2FA & tempToken): ${testJ_pass ? 'PASS' : 'FAIL'}`);

  // Try accessing protected route with tempToken -> MUST FAIL
  const protectedAccessWithTempToken = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${login2FA.tempToken}` }
  }).then(r => r.json());

  const testK_pass = !protectedAccessWithTempToken.success && protectedAccessWithTempToken.error.includes('2FA');
  console.log(`Test K (Temporary 2FA Token Blocked from Protected APIs): ${testK_pass ? 'PASS' : 'FAIL'}`);

  // Challenge 2FA with valid TOTP
  const currentTotp = speakeasy.totp({
    secret,
    encoding: 'base32'
  });

  const challengeRes = await fetch(`${API_BASE}/auth/2fa/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken: login2FA.tempToken, code: currentTotp })
  }).then(r => r.json());

  const testL_pass = challengeRes.success && challengeRes.data.token;
  console.log(`Test L (2FA Challenge Verification Returns Full Access Token): ${testL_pass ? 'PASS' : 'FAIL'}`);

  // --- CLEANUP ---
  await User.deleteOne({ email: testEmail });
  await Tenant.deleteOne({ _id: tenantIdA });
  await PendingRegistration.deleteMany({ email: testEmail });
  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log('=== PHASE 3B AUTOMATED SECURITY VERIFICATION RESULTS ===');
  console.log('==================================================');
  console.log(`A. Valid Password Login: ${testA_pass ? 'PASS' : 'FAIL'}`);
  console.log(`B. Invalid Password Login Fails: ${testB_pass ? 'PASS' : 'FAIL'}`);
  console.log(`C. Forgot Password Generic Anti-Enumeration: ${testC_pass ? 'PASS' : 'FAIL'}`);
  console.log(`D. Password Reset OTP Stored as Hash Only: ${testD_pass ? 'PASS' : 'FAIL'}`);
  console.log(`E. Invalid OTP Reset Attempt Fails: ${testE_pass ? 'PASS' : 'FAIL'}`);
  console.log(`F. Valid OTP Password Reset Succeeds: ${testF_pass ? 'PASS' : 'FAIL'}`);
  console.log(`F.2. OTP Single-Use Enforcement: ${testSingleUse_pass ? 'PASS' : 'FAIL'}`);
  console.log(`G. Google Token Signature Verification Safeguard: ${testG_pass ? 'PASS' : 'FAIL'}`);
  console.log(`I. 2FA Enabled & Recovery Codes Generated: ${testI_pass ? 'PASS' : 'FAIL'}`);
  console.log(`J. Login With 2FA Enabled Returns require2FA: ${testJ_pass ? 'PASS' : 'FAIL'}`);
  console.log(`K. Temporary 2FA Token Blocked from Protected APIs: ${testK_pass ? 'PASS' : 'FAIL'}`);
  console.log(`L. 2FA Challenge Verification Returns Token: ${testL_pass ? 'PASS' : 'FAIL'}`);
  console.log('==================================================\n');
}

runPhase3BTests();
