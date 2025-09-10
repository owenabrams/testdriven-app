// Simple login test script
// Run this in the browser console to test login

const testLogin = async () => {
  console.log('🧪 Testing login...');
  
  try {
    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'superadmin@testdriven.io',
        password: 'superpassword123'
      })
    });
    
    const data = await response.json();
    console.log('📡 Login response:', data);
    
    if (data.status === 'success') {
      console.log('✅ Login successful!');
      console.log('🔑 Token:', data.auth_token);
      console.log('👤 User:', data.user);
      
      // Store token
      localStorage.setItem('auth_token', data.auth_token);
      console.log('💾 Token stored in localStorage');
      
      // Test auth status
      const statusResponse = await fetch('http://localhost:5000/auth/status', {
        headers: {
          'Authorization': `Bearer ${data.auth_token}`
        }
      });
      
      const statusData = await statusResponse.json();
      console.log('📊 Auth status:', statusData);
      
    } else {
      console.log('❌ Login failed:', data.message);
    }
  } catch (error) {
    console.error('💥 Login error:', error);
  }
};

// Run the test
testLogin();