require('dotenv').config({ path: './backend/.env' });

console.log('=== RUNTIME ENVIRONMENT CONFIGURATION DIAGNOSTICS ===');
console.log(`JWT_SECRET configured: ${Boolean(process.env.JWT_SECRET)}`);
console.log(`SMTP_HOST configured: ${Boolean(process.env.SMTP_HOST)}`);
console.log(`SMTP_PORT configured: ${Boolean(process.env.SMTP_PORT)}`);
console.log(`SMTP_USER configured: ${Boolean(process.env.SMTP_USER)}`);
console.log(`SMTP_PASS configured: ${Boolean(process.env.SMTP_PASS)}`);
console.log(`SMTP_FROM configured: ${Boolean(process.env.SMTP_FROM)}`);
console.log(`GOOGLE_CLIENT_ID configured: ${Boolean(process.env.GOOGLE_CLIENT_ID)}`);
console.log(`GOOGLE_CLIENT_SECRET configured: ${Boolean(process.env.GOOGLE_CLIENT_SECRET)}`);
console.log(`TWO_FACTOR_ENCRYPTION_KEY configured: ${Boolean(process.env.TWO_FACTOR_ENCRYPTION_KEY)}`);
console.log(`WEBAUTHN_RP_ID configured: ${Boolean(process.env.WEBAUTHN_RP_ID)}`);
console.log(`WEBAUTHN_ORIGIN configured: ${Boolean(process.env.WEBAUTHN_ORIGIN)}`);
console.log('=====================================================');
