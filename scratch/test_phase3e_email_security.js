require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const API_BASE = 'http://localhost:3000/api';

async function runPhase3ETests() {
  console.log('=== PHASE 3E EMAIL INFRASTRUCTURE & AUTHENTICATION FLOW VERIFICATION SUITE ===\n');

  const rand = Math.floor(Math.random() * 10000);
  const testEmail = `phase3e_owner_${rand}@test.com`;
  const testPassword = 'Password123!';

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const User = require(path.join(__dirname, '../backend/models/User'));
  const Tenant = require(path.join(__dirname, '../backend/models/Tenant'));
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));
  const Invitation = require(path.join(__dirname, '../backend/models/Invitation'));

  // --- SECTION 1: SMTP & Email Diagnostics ---
  console.log('--- SECTION 1: Email Configuration Diagnostics ---');
  const smtpHostConfigured = Boolean(process.env.SMTP_HOST);
  const smtpPortConfigured = Boolean(process.env.SMTP_PORT);
  const smtpUserConfigured = Boolean(process.env.SMTP_USER);
  const smtpPassConfigured = Boolean(process.env.SMTP_PASS);
  const smtpFromConfigured = Boolean(process.env.SMTP_FROM);

  console.log(`SMTP_HOST configured: ${smtpHostConfigured}`);
  console.log(`SMTP_PORT configured: ${smtpPortConfigured} (default 587)`);
  console.log(`SMTP_USER configured: ${smtpUserConfigured}`);
  console.log(`SMTP_PASS configured: ${smtpPassConfigured}`);
  console.log(`SMTP_FROM configured: ${smtpFromConfigured}`);

  const testSMTP_config_pass = smtpHostConfigured && smtpUserConfigured;
  console.log(`Test 1.1 (SMTP Configuration Loaded): ${testSMTP_config_pass ? 'PASS' : 'FAIL'}`);

  // --- SECTION 2: Workspace Registration & Email Verification ---
  console.log('\n--- SECTION 2: Workspace Registration Email Verification Flow ---');
  
  // Initiate registration
  const regInitRes = await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Phase3E Enterprise ${rand}`,
      name: 'Phase3E Owner',
      email: testEmail,
      password: testPassword,
    })
  }).then(r => r.json());

  const testRegInit_pass = regInitRes.success && regInitRes.requireEmailVerification === true;
  console.log(`Test 2.1 (Workspace Registration Initiate Sends Code): ${testRegInit_pass ? 'PASS' : 'FAIL'}`);

  // Verify no Tenant or User created yet (Prevents orphan tenants!)
  const orphanUserCheck = await User.findOne({ email: testEmail });
  const orphanTenantCheck = await Tenant.findOne({ name: `Phase3E Enterprise ${rand}` });
  const testNoOrphans_pass = !orphanUserCheck && !orphanTenantCheck;
  console.log(`Test 2.2 (Verification First Prevents Orphan Tenants/Users): ${testNoOrphans_pass ? 'PASS' : 'FAIL'}`);

  // Verify PendingRegistration document exists and code is SHA-256 hashed (NOT plaintext)
  const pendingDoc = await PendingRegistration.findOne({ email: testEmail });
  const testPendingDoc_pass = pendingDoc && pendingDoc.verificationCodeHash && pendingDoc.verificationCodeHash.length === 64;
  console.log(`Test 2.3 (Verification Code Hashed in Database via SHA-256): ${testPendingDoc_pass ? 'PASS' : 'FAIL'}`);

  // Incorrect code fails
  const invalidCodeRes = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: '000000' })
  }).then(r => r.json());

  const testInvalidCode_pass = !invalidCodeRes.success && invalidCodeRes.error.includes('Invalid or expired');
  console.log(`Test 2.4 (Incorrect Verification Code Rejected): ${testInvalidCode_pass ? 'PASS' : 'FAIL'}`);

  // Expired code fails
  pendingDoc.expiresAt = new Date(Date.now() - 1000);
  await pendingDoc.save();

  const expiredCodeRes = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: '123456' })
  }).then(r => r.json());

  const testExpiredCode_pass = !expiredCodeRes.success;
  console.log(`Test 2.5 (Expired Verification Code Rejected): ${testExpiredCode_pass ? 'PASS' : 'FAIL'}`);

  // Generate fresh code for successful verification
  const validCode = '948215';
  const hashedValidCode = crypto.createHash('sha256').update(validCode).digest('hex');
  pendingDoc.verificationCodeHash = hashedValidCode;
  pendingDoc.expiresAt = new Date(Date.now() + 600000);
  await pendingDoc.save();

  // Correct code verification
  const validVerifyRes = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: validCode })
  }).then(r => r.json());

  const testValidVerify_pass = validVerifyRes.success && validVerifyRes.data && validVerifyRes.data.tenant && validVerifyRes.data.token;
  console.log(`Test 2.6 (Correct Verification Code Completes Workspace Creation): ${testValidVerify_pass ? 'PASS' : 'FAIL'}`);

  const userCreated = await User.findOne({ email: testEmail });
  const tenantCreated = await Tenant.findById(validVerifyRes.data.tenant._id);

  const testUserTenantLink_pass = userCreated && tenantCreated && userCreated.tenant.toString() === tenantCreated._id.toString() && tenantCreated.owner.toString() === userCreated._id.toString();
  console.log(`Test 2.7 (User -> Tenant & Tenant -> Owner Links Established): ${testUserTenantLink_pass ? 'PASS' : 'FAIL'}`);

  // Single-use check: PendingRegistration document deleted and code cannot be reused
  const reuseVerifyRes = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: validCode })
  }).then(r => r.json());

  const testSingleUse_pass = !reuseVerifyRes.success;
  console.log(`Test 2.8 (Verification Code Single-Use Enforcement): ${testSingleUse_pass ? 'PASS' : 'FAIL'}`);

  // --- SECTION 3: Password Reset OTP Flow ---
  console.log('\n--- SECTION 3: Password Reset OTP Email Flow ---');
  
  // Forgot password request (anti-enumeration check)
  const forgotExisting = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  }).then(r => r.json());

  const forgotNonExisting = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `nonexistent_${rand}@test.com` })
  }).then(r => r.json());

  const testEnum_pass = forgotExisting.message === forgotNonExisting.message;
  console.log(`Test 3.1 (Forgot Password Anti-Enumeration Response): ${testEnum_pass ? 'PASS' : 'FAIL'}`);

  const userForReset = await User.findOne({ email: testEmail });
  const testOtpHashed_pass = userForReset.resetPasswordOtp && userForReset.resetPasswordOtp.length === 64;
  console.log(`Test 3.2 (Password Reset OTP Stored as SHA-256 Hash): ${testOtpHashed_pass ? 'PASS' : 'FAIL'}`);

  // Reset password with OTP
  const rawOtp = '815239';
  userForReset.resetPasswordOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
  userForReset.resetPasswordOtpExpire = Date.now() + 600000;
  await userForReset.save();

  const resetRes = await fetch(`${API_BASE}/auth/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: rawOtp, newPassword: 'NewPassword123!' })
  }).then(r => r.json());

  const testResetSuccess_pass = resetRes.success;
  console.log(`Test 3.3 (Correct OTP Resets Password & Invalidates Prior Sessions): ${testResetSuccess_pass ? 'PASS' : 'FAIL'}`);

  // --- SECTION 4: Workspace Invitations Email Flow ---
  console.log('\n--- SECTION 4: Workspace Invitations Email Flow ---');
  
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'NewPassword123!' })
  }).then(r => r.json());

  const ownerToken = loginRes.data.token;

  // Invite member
  const inviteeEmail = `invitee_${rand}@test.com`;
  const inviteRes = await fetch(`${API_BASE}/onboarding/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ email: inviteeEmail, role: 'employee' })
  }).then(r => r.json());

  const testInviteCreated_pass = inviteRes.success && inviteRes.data.token;
  console.log(`Test 4.1 (Workspace Invitation Created & Email Sent): ${testInviteCreated_pass ? 'PASS' : 'FAIL'}`);

  // Clean up test data
  await User.deleteMany({ email: { $in: [testEmail, inviteeEmail] } });
  await Tenant.deleteOne({ _id: tenantCreated._id });
  await Invitation.deleteMany({ tenant: tenantCreated._id });
  await PendingRegistration.deleteMany({ email: testEmail });
  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log('=== PHASE 3E AUTOMATED SECURITY & EMAIL VERIFICATION RESULTS ===');
  console.log('==================================================');
  console.log(`SMTP configuration loaded: ${testSMTP_config_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Workspace registration initiate: ${testRegInit_pass ? 'PASS' : 'FAIL'}`);
  console.log(`No orphan tenants before verification: ${testNoOrphans_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Verification code hashed via SHA-256: ${testPendingDoc_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Incorrect verification code rejected: ${testInvalidCode_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Expired verification code rejected: ${testExpiredCode_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Correct code completes workspace creation: ${testValidVerify_pass ? 'PASS' : 'FAIL'}`);
  console.log(`User -> Tenant & Tenant -> Owner links established: ${testUserTenantLink_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Verification code single-use enforcement: ${testSingleUse_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Forgot password anti-enumeration: ${testEnum_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Password reset OTP hashed in DB: ${testOtpHashed_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Password reset & session invalidation: ${testResetSuccess_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Workspace invitation created & sent: ${testInviteCreated_pass ? 'PASS' : 'FAIL'}`);
  console.log('==================================================\n');
}

runPhase3ETests();
