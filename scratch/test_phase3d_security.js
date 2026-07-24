require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const API_BASE = 'http://localhost:3000/api';

async function runPhase3DTests() {
  console.log('=== PHASE 3D SECURITY & ONBOARDING VERIFICATION SUITE ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const User = require(path.join(__dirname, '../backend/models/User'));
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));
  const Tenant = require(path.join(__dirname, '../backend/models/Tenant'));

  const rand = Math.floor(Math.random() * 10000);
  const testEmail = `p3d_user_${rand}@test.com`;

  // Register Workspace Initial Owner
  await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Phase 3D Workspace ${rand}`,
      name: 'Owner 3D',
      email: testEmail,
      password: 'Password123!'
    })
  }).then(r => r.json());

  const pending = await PendingRegistration.findOne({ email: testEmail });
  const validCode = '123456';
  pending.verificationCodeHash = crypto.createHash('sha256').update(validCode).digest('hex');
  pending.expiresAt = new Date(Date.now() + 600000);
  await pending.save();

  const verifyRes = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: validCode })
  }).then(r => r.json());

  const token1 = verifyRes.data.token;

  // --- TESTS A-F: Server-Side Session Invalidation & Revocation ---
  console.log('--- TESTS A-F: Server-Side Session Invalidation & Revocation ---');

  // Test F: Logout
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}` }
  });

  const accessPostLogout = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  }).then(r => r.json());

  const testF_pass = !accessPostLogout.success && accessPostLogout.sessionRevoked === true;
  console.log(`Test F (Logout Behavior Invalidates Server Session): ${testF_pass ? 'PASS' : 'FAIL'}`);

  // Re-login to get fresh token
  const login2 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'Password123!' })
  }).then(r => r.json());
  const tokenNew = login2.data.token;

  // Test A: Security Event Invalidation
  const userObj = await User.findOne({ email: testEmail });
  userObj.tokenVersion = (userObj.tokenVersion || 0) + 1;
  await userObj.save();

  const accessPostSecurityEvent = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${tokenNew}` }
  }).then(r => r.json());
  const testA_pass = !accessPostSecurityEvent.success && accessPostSecurityEvent.sessionRevoked === true;
  console.log(`Test A (Session Invalidation after Security Event): ${testA_pass ? 'PASS' : 'FAIL'}`);

  // Test C: New token post revocation
  const login3 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'Password123!' })
  }).then(r => r.json());
  const token3 = login3.data.token;

  const accessPostLogin3 = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token3}` }
  }).then(r => r.json());
  const testC_pass = accessPostLogin3.success && accessPostLogin3.data.email === testEmail;
  console.log(`Test C (New Token Issued & Works After Session Revocation): ${testC_pass ? 'PASS' : 'FAIL'}`);

  // Test B: Password Reset Invalidates Sessions
  const rawOtp = '987654';
  const userRecord = await User.findOne({ email: testEmail });
  userRecord.resetPasswordOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
  userRecord.resetPasswordOtpExpire = Date.now() + 600000;
  await userRecord.save();

  await fetch(`${API_BASE}/auth/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: rawOtp, newPassword: 'NewPassword123!' })
  }).then(r => r.json());

  const accessPostReset = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token3}` }
  }).then(r => r.json());
  const testB_pass = !accessPostReset.success && accessPostReset.sessionRevoked === true;
  console.log(`Test B (Password Reset Invalidates Previous Session Tokens): ${testB_pass ? 'PASS' : 'FAIL'}`);

  // Login with new password
  const loginPostReset = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'NewPassword123!' })
  }).then(r => r.json());
  const activeToken = loginPostReset.data.token;

  // Test E: Explicit Revoke All Sessions
  const revokeRes = await fetch(`${API_BASE}/auth/revoke-sessions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${activeToken}` }
  }).then(r => r.json());
  const testE_pass = revokeRes.success;
  console.log(`Test E (Explicit Global Session Revocation): ${testE_pass ? 'PASS' : 'FAIL'}`);

  const accessPostRevoke = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${activeToken}` }
  }).then(r => r.json());
  const testD_pass = !accessPostRevoke.success && accessPostRevoke.sessionRevoked === true;
  console.log(`Test D (Server-Side tokenVersion Invalidation Works): ${testD_pass ? 'PASS' : 'FAIL'}`);

  // Clean up
  await User.deleteMany({ email: testEmail });
  await Tenant.deleteMany({ name: `Phase 3D Workspace ${rand}` });
  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log('=== PHASE 3D AUTOMATED SECURITY VERIFICATION RESULTS ===');
  console.log('==================================================');
  console.log(`A. Session Invalidation after Security Event: ${testA_pass ? 'PASS' : 'FAIL'}`);
  console.log(`B. Password Reset Invalidates Previous Sessions: ${testB_pass ? 'PASS' : 'FAIL'}`);
  console.log(`C. New Token Issued & Works After Session Revocation: ${testC_pass ? 'PASS' : 'FAIL'}`);
  console.log(`D. Server-Side tokenVersion Invalidation Works: ${testD_pass ? 'PASS' : 'FAIL'}`);
  console.log(`E. Explicit Global Session Revocation: ${testE_pass ? 'PASS' : 'FAIL'}`);
  console.log(`F. Logout Behavior Invalidates Server Session: ${testF_pass ? 'PASS' : 'FAIL'}`);
  console.log('==================================================\n');
}

runPhase3DTests();
