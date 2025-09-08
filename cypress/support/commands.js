// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for login
Cypress.Commands.add('login', (email = 'test@test.com', password = 'greaterthanten') => {
  cy.visit('/login')
    .get('input[name="email"]')
    .type(email)
    .get('input[name="password"]')
    .type(password)
    .get('button[type="submit"]')
    .click();
});

// Custom command for logout
Cypress.Commands.add('logout', () => {
  cy.get('button').contains('User Menu', { timeout: 10000 }).click();
  cy.get('a[href="/logout"]').click();
});

// Custom command to register a user
Cypress.Commands.add('register', (username = 'testuser', email = 'test@test.com', password = 'greaterthanten') => {
  cy.visit('/register')
    .get('input[name="username"]')
    .type(username)
    .get('input[name="email"]')
    .type(email)
    .get('input[name="password"]')
    .type(password)
    .get('button[type="submit"]')
    .click();
});

// Custom command to check if user is authenticated
Cypress.Commands.add('shouldBeAuthenticated', () => {
  cy.get('button').contains('User Menu').should('be.visible');
});

// Custom command to check if user is not authenticated
Cypress.Commands.add('shouldNotBeAuthenticated', () => {
  cy.get('a').contains('Login').should('be.visible');
  cy.get('a').contains('Register').should('be.visible');
});

// Custom command to login as super admin
Cypress.Commands.add('loginAsSuperAdmin', () => {
  // First visit the login page
  cy.visit('/login');
  
  // Login with super admin credentials
  cy.get('input[name="email"]')
    .type('superadmin@testdriven.io');
  cy.get('input[name="password"]')
    .type('superpassword123');
  cy.get('button[type="submit"]')
    .click();
    
  // Wait for successful login
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

// Custom command to check admin access
Cypress.Commands.add('shouldHaveAdminAccess', () => {
  cy.get('button').contains('User Menu').click();
  cy.get('a[href="/admin"]').should('be.visible');
});

// Custom command to access admin panel
Cypress.Commands.add('accessAdminPanel', () => {
  cy.get('button').contains('User Menu').click();
  cy.get('a[href="/admin"]').click();
  cy.get('h4').should('contain', 'Admin Panel');
});

// Custom command to create service access request via API
Cypress.Commands.add('requestServiceAccess', (serviceId, permissions = 'read', reason = 'Test access request') => {
  const token = localStorage.getItem('authToken');
  cy.request({
    method: 'POST',
    url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: {
      service_id: serviceId,
      permissions: permissions,
      reason: reason
    }
  });
});

// Custom command to approve access request via API
Cypress.Commands.add('approveAccessRequest', (requestId) => {
  const token = localStorage.getItem('authToken');
  cy.request({
    method: 'POST',
    url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests/${requestId}/approve`,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
});

// Example: New commands for future microservices
Cypress.Commands.add('createNotification', (notificationData) => {
  const token = localStorage.getItem('authToken');
  cy.request({
    method: 'POST',
    url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/notifications`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: notificationData
  });
});

Cypress.Commands.add('deployMicroservice', (serviceConfig) => {
  const token = localStorage.getItem('authToken');
  cy.request({
    method: 'POST',
    url: `${Cypress.env('REACT_APP_DEPLOYMENT_SERVICE_URL') || 'http://localhost:6000'}/deploy`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: serviceConfig
  });
});

// Seeded User Login Commands
Cypress.Commands.add('loginAsSarah', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('sarah@kampala.ug');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('loginAsMary', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('mary@kampala.ug');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('loginAsGrace', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('grace@kampala.ug');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('loginAsAlice', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('alice@kampala.ug');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('loginAsJane', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('jane@kampala.ug');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('loginAsServiceAdmin', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('admin@savingsgroups.ug');
  cy.get('input[name="password"]').type('admin123');
  cy.get('button[type="submit"]').click();
  cy.get('button').contains('User Menu', { timeout: 10000 }).should('be.visible');
});

// Savings Platform Navigation Commands
Cypress.Commands.add('navigateToSavingsPlatform', () => {
  cy.contains('Savings Platform').click();
  cy.url().should('include', '/savings-groups');
  cy.contains('Savings Groups').should('be.visible');
});

Cypress.Commands.add('shouldHaveGroupOfficerAccess', () => {
  cy.contains('Group Officer').should('be.visible');
  cy.contains('My Savings').should('be.visible');
  cy.contains('Group Transactions').should('be.visible');
  cy.contains('ECD Fund').should('be.visible');
  cy.contains('Social Fund').should('be.visible');
});

Cypress.Commands.add('shouldHaveGroupMemberAccess', () => {
  cy.contains('Group Member').should('be.visible');
  cy.contains('My Savings').should('be.visible');
  cy.contains('My Transactions').should('be.visible');
  cy.contains('My Loans').should('be.visible');
  // Should NOT have admin features
  cy.contains('Manage Members').should('not.exist');
  cy.contains('Verify Transactions').should('not.exist');
});

Cypress.Commands.add('shouldHaveAdminAccess', () => {
  cy.contains('Admin').should('be.visible');
  cy.contains('System Overview').should('be.visible');
  cy.contains('All Groups').should('be.visible');
});

// Import enhanced savings group commands
import './enhanced-savings-commands';