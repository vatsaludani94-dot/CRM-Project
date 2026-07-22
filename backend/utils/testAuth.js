const http = require('http');

const postRequest = (path, data) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
};

const runDiagnostics = async () => {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@gmail.com`;
  const testPassword = 'Password@123';

  console.log('--- 1. Testing Registration Endpoint ---');
  try {
    const regRes = await postRequest('/api/auth/register', {
      name: 'Test Diagnostics User',
      email: testEmail,
      password: testPassword,
      role: 'customer'
    });
    console.log('Status Code:', regRes.statusCode);
    console.log('Response Payload:', JSON.stringify(regRes.data, null, 2));

    if (regRes.statusCode !== 201) {
      console.error('Registration failed.');
      process.exit(1);
    }

    console.log('\n--- 2. Testing Login Endpoint ---');
    const loginRes = await postRequest('/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    console.log('Status Code:', loginRes.statusCode);
    console.log('Response Payload:', JSON.stringify(loginRes.data, null, 2));

    if (loginRes.statusCode !== 200) {
      console.error('Login failed.');
      process.exit(1);
    }

    console.log('\nAll API auth integrations are working successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Connection or processing error:', err.message);
    process.exit(1);
  }
};

runDiagnostics();
