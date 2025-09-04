#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing TestDriven App...\n');

// Test Flask API
function testAPI() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5000/users', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success' && json.data.users.length > 0) {
            console.log('✅ Flask API: Working');
            console.log(`   - Found ${json.data.users.length} users`);
            console.log(`   - Sample user: ${json.data.users[0].username}`);
            resolve(true);
          } else {
            console.log('❌ Flask API: Invalid response');
            reject(false);
          }
        } catch (e) {
          console.log('❌ Flask API: JSON parse error');
          reject(false);
        }
      });
    });
    req.on('error', () => {
      console.log('❌ Flask API: Connection failed');
      reject(false);
    });
    req.setTimeout(5000, () => {
      console.log('❌ Flask API: Timeout');
      reject(false);
    });
  });
}

// Test React App
function testReact() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('<div id="root">') && data.includes('TestDriven App')) {
          console.log('✅ React App: HTML serving correctly');
          console.log('   - Root div found');
          console.log('   - Title present');
          resolve(true);
        } else {
          console.log('❌ React App: Invalid HTML');
          reject(false);
        }
      });
    });
    req.on('error', () => {
      console.log('❌ React App: Connection failed');
      reject(false);
    });
    req.setTimeout(5000, () => {
      console.log('❌ React App: Timeout');
      reject(false);
    });
  });
}

// Test React Bundle
function testBundle() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/static/js/bundle.js', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ React Bundle: JavaScript bundle accessible');
        console.log(`   - Status: ${res.statusCode}`);
        console.log(`   - Content-Type: ${res.headers['content-type']}`);
        resolve(true);
      } else {
        console.log('❌ React Bundle: Bundle not accessible');
        reject(false);
      }
    });
    req.on('error', () => {
      console.log('❌ React Bundle: Connection failed');
      reject(false);
    });
    req.setTimeout(5000, () => {
      console.log('❌ React Bundle: Timeout');
      reject(false);
    });
  });
}

async function runTests() {
  try {
    await testAPI();
    await testReact();
    await testBundle();
    
    console.log('\n🎉 All tests passed!');
    console.log('=====================================');
    console.log('✅ Flask API running on http://localhost:5000');
    console.log('✅ React App running on http://localhost:3000');
    console.log('\n📱 Open http://localhost:3000 in your browser to see the app!');
    
  } catch (error) {
    console.log('\n❌ Some tests failed. Check the services are running.');
    process.exit(1);
  }
}

runTests();