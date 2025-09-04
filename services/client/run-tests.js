#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🧪 Running Modern React Tests...\n');

// Run tests without watch mode to prevent flashing
const testProcess = spawn('npm', ['test', '--', '--watchAll=false', '--verbose', '--passWithNoTests'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n❌ Some tests failed.');
  }
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('Error running tests:', error);
  process.exit(1);
});