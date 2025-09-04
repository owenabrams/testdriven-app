#!/usr/bin/env node

// Simple test to check if services are running
const http = require('http');

const checkService = (url, name) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name} is running (status: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name} is not running: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      console.log(`❌ ${name} timeout`);
      req.destroy();
      resolve(false);
    });
  });
};

async function main() {
  console.log('🔍 Checking services...\n');
  
  const reactRunning = await checkService('http://localhost:3000', 'React App');
  const flaskRunning = await checkService('http://localhost:5001/users/ping', 'Flask API');
  
  console.log('\n📋 Summary:');
  if (reactRunning && flaskRunning) {
    console.log('✅ All services are running! Ready for E2E tests.');
    process.exit(0);
  } else {
    console.log('❌ Some services are not running. Please start them first.');
    console.log('\nTo start services:');
    console.log('1. React: cd services/client && npm start');
    console.log('2. Flask: cd services/users && python run_flask.py');
    process.exit(1);
  }
}

main();