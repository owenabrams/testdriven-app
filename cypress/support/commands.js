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
  cy.login('superadmin@testdriven.io', 'superpassword123');
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