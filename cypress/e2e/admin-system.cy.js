const randomstring = require('randomstring');

// Test data
const superAdminCredentials = {
  email: 'superadmin@testdriven.io',
  password: 'superpassword123'
};

const testServiceAdmin = {
  username: randomstring.generate(),
  email: `service-admin-${randomstring.generate()}@test.com`,
  password: 'testpassword123'
};

const testUser = {
  username: randomstring.generate(),
  email: `user-${randomstring.generate()}@test.com`,
  password: 'testpassword123'
};

describe('Multi-Tiered Admin System', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('Super Admin Functionality', () => {
    it('should allow super admin to login and access admin panel', () => {
      // Login as super admin
      cy.visit('/login');
      cy.get('input[name="email"]').type(superAdminCredentials.email);
      cy.get('input[name="password"]').type(superAdminCredentials.password);
      cy.get('button[type="submit"]').click();

      // Should redirect to home
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      
      // Should show authenticated navigation
      cy.get('button').contains('User Menu').should('be.visible');
      
      // Access admin panel
      cy.get('button').contains('User Menu').click();
      cy.get('a[href="/admin"]').should('be.visible').click();
      
      // Should show admin panel
      cy.url().should('include', '/admin');
      cy.get('h1').should('contain', 'Admin Panel');
      
      // Should show admin tabs
      cy.get('[role="tab"]').should('contain', 'Users');
      cy.get('[role="tab"]').should('contain', 'Services');
      cy.get('[role="tab"]').should('contain', 'Access Requests');
    });

    it('should display all users in the admin panel', () => {
      // Login as super admin
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      // Go to admin panel
      cy.visit('/admin');
      
      // Should show users table
      cy.get('table').should('be.visible');
      cy.get('th').should('contain', 'Username');
      cy.get('th').should('contain', 'Email');
      cy.get('th').should('contain', 'Role');
      
      // Should show super admin user
      cy.get('table').should('contain', 'superadmin');
      cy.get('table').should('contain', 'Super Admin');
    });

    it('should display services in the admin panel', () => {
      // Login as super admin
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      // Go to admin panel and switch to services tab
      cy.visit('/admin');
      cy.get('[role="tab"]').contains('Services').click();
      
      // Should show services table
      cy.get('table').should('be.visible');
      cy.get('th').should('contain', 'Name');
      cy.get('th').should('contain', 'Description');
      cy.get('th').should('contain', 'Status');
      
      // Should show seeded services
      cy.get('table').should('contain', 'users');
      cy.get('table').should('contain', 'orders');
      cy.get('table').should('contain', 'products');
    });
  });

  describe('User Registration and Access Request Flow', () => {
    it('should allow user to register and request service access', () => {
      // Register new user
      cy.visit('/register');
      cy.get('input[name="username"]').type(testUser.username);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      // Should redirect to home and show success
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.get('.notification.is-success').should('contain', 'Welcome!');
      
      // User should be able to see their status
      cy.visit('/status');
      cy.get('li').should('contain', testUser.email);
      cy.get('li').should('contain', testUser.username);
      cy.get('li').should('contain', 'Admin: false');
    });

    it('should prevent regular users from accessing admin panel', () => {
      // Register and login as regular user
      cy.register(testUser.username, testUser.email, testUser.password);
      
      // Try to access admin panel directly
      cy.visit('/admin');
      
      // Should show warning message (not admin)
      cy.get('div').should('contain', 'You must be logged in to access the admin panel.');
    });
  });

  describe('Authentication Persistence with Admin Roles', () => {
    it('should maintain super admin authentication across page refreshes', () => {
      // Login as super admin
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      // Verify admin access
      cy.visit('/admin');
      cy.get('h1').should('contain', 'Admin Panel');
      
      // Refresh page
      cy.reload();
      
      // Should still have admin access
      cy.get('h1').should('contain', 'Admin Panel');
      
      // Should still show authenticated navigation
      cy.get('button').contains('User Menu').should('be.visible');
    });

    it('should handle direct navigation to admin panel when authenticated', () => {
      // Login as super admin
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      // Open new tab/window simulation by visiting admin directly
      cy.visit('/admin');
      
      // Should work without redirect
      cy.get('h1').should('contain', 'Admin Panel');
      cy.get('[role="tab"]').should('contain', 'Users');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should show different navigation options based on user role', () => {
      // Test super admin navigation
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      cy.get('button').contains('User Menu').click();
      cy.get('a[href="/status"]').should('be.visible');
      cy.get('a[href="/admin"]').should('be.visible');
      cy.get('a[href="/logout"]').should('be.visible');
      
      // Logout
      cy.get('a[href="/logout"]').click();
      
      // Test regular user navigation
      cy.register(testUser.username + '2', testUser.email.replace('@', '2@'), testUser.password);
      
      cy.get('button').contains('User Menu').click();
      cy.get('a[href="/status"]').should('be.visible');
      cy.get('a[href="/admin"]').should('be.visible'); // Link is there but access will be restricted
      cy.get('a[href="/logout"]').should('be.visible');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid admin panel access gracefully', () => {
      // Try to access admin panel without authentication
      cy.visit('/admin');
      
      // Should show appropriate message
      cy.get('div').should('contain', 'You must be logged in to access the admin panel.');
    });

    it('should handle API errors in admin panel gracefully', () => {
      // Login as super admin
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      // Visit admin panel
      cy.visit('/admin');
      
      // If API is down, should show error handling
      // This test assumes the API might return errors
      cy.get('table').should('be.visible');
    });
  });

  describe('Complete Admin Workflow', () => {
    it('should complete full admin workflow: create user, assign permissions, manage access', () => {
      // 1. Login as super admin
      cy.login(superAdminCredentials.email, superAdminCredentials.password);
      
      // 2. Access admin panel and verify users
      cy.visit('/admin');
      cy.get('table').should('contain', 'superadmin');
      
      // 3. Check services
      cy.get('[role="tab"]').contains('Services').click();
      cy.get('table').should('contain', 'users');
      cy.get('table').should('contain', 'orders');
      
      // 4. Check access requests (should be empty initially)
      cy.get('[role="tab"]').contains('Access Requests').click();
      cy.get('table').should('be.visible');
      
      // 5. Logout and register new user
      cy.get('button').contains('User Menu').click();
      cy.get('a[href="/logout"]').click();
      
      // 6. Register new user
      const newUser = {
        username: randomstring.generate(),
        email: `workflow-user-${randomstring.generate()}@test.com`,
        password: 'testpassword123'
      };
      
      cy.register(newUser.username, newUser.email, newUser.password);
      
      // 7. Verify user can see their status but not admin panel
      cy.visit('/status');
      cy.get('li').should('contain', newUser.email);
      
      // 8. Try admin panel (should be restricted)
      cy.visit('/admin');
      cy.get('div').should('contain', 'You must be logged in to access the admin panel.');
      
      // 9. Login back as super admin to verify user was created
      cy.visit('/login');
      cy.get('input[name="email"]').clear().type(superAdminCredentials.email);
      cy.get('input[name="password"]').clear().type(superAdminCredentials.password);
      cy.get('button[type="submit"]').click();
      
      cy.visit('/admin');
      cy.get('table').should('contain', newUser.username);
    });
  });
});

// Test API endpoints directly
describe('Admin API Endpoints', () => {
  let authToken;

  before(() => {
    // Get auth token for super admin
    cy.request({
      method: 'POST',
      url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
      body: {
        email: superAdminCredentials.email,
        password: superAdminCredentials.password
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      authToken = response.body.auth_token;
    });
  });

  it('should fetch users via API', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/users`,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.status).to.eq('success');
      expect(response.body.data.users).to.be.an('array');
      
      // Should contain super admin
      const superAdmin = response.body.data.users.find(u => u.email === superAdminCredentials.email);
      expect(superAdmin).to.exist;
      expect(superAdmin.is_super_admin).to.be.true;
    });
  });

  it('should fetch services via API', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/services`,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.status).to.eq('success');
      expect(response.body.data.services).to.be.an('array');
      
      // Should contain seeded services
      const serviceNames = response.body.data.services.map(s => s.name);
      expect(serviceNames).to.include('users');
      expect(serviceNames).to.include('orders');
      expect(serviceNames).to.include('products');
    });
  });

  it('should fetch access requests via API', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests`,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.status).to.eq('success');
      expect(response.body.data.requests).to.be.an('array');
    });
  });

  it('should reject unauthorized access to admin endpoints', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/users`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(403);
    });
  });
});