// Debug Login Issue - Add this to browser console

console.log('🔍 Debugging Login Issue');

// Check if we're on the right page
console.log('Current URL:', window.location.href);

// Check localStorage
console.log('Auth tokens in localStorage:');
console.log('auth_token:', localStorage.getItem('auth_token'));
console.log('authToken:', localStorage.getItem('authToken'));

// Check if React is loaded
if (window.React) {
    console.log('✅ React is loaded');
} else {
    console.log('❌ React not found');
}

// Test API directly
console.log('🔧 Testing API directly...');

fetch('http://localhost:5000/users/ping')
    .then(response => response.json())
    .then(data => {
        console.log('✅ Backend ping successful:', data);
        
        // Test login
        return fetch('http://localhost:5000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'superadmin@testdriven.io',
                password: 'superpassword123'
            })
        });
    })
    .then(response => response.json())
    .then(data => {
        console.log('🔐 Login test result:', data);
        
        if (data.status === 'success') {
            console.log('✅ Login successful, token:', data.auth_token);
            
            // Store token and reload
            localStorage.setItem('auth_token', data.auth_token);
            console.log('💾 Token stored, reloading page...');
            window.location.reload();
        } else {
            console.log('❌ Login failed:', data.message);
        }
    })
    .catch(error => {
        console.error('❌ API Error:', error);
        console.log('🔧 Check if backend is running on http://localhost:5000');
    });

// Instructions
console.log(`
📋 DEBUGGING INSTRUCTIONS:
1. If you see "Login successful" above, the backend is working
2. If the page reloads and you still see login, there's a React state issue
3. Check the Network tab for failed requests
4. Check the Console for React errors
5. Try manually refreshing the page after login
`);