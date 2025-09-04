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
    .get('input[type="submit"]')
    .click();
});

// Custom command for logout
Cypress.Commands.add('logout', () => {
  cy.get('button[aria-label="menu"]').click();
  cy.get('.MuiDrawer-paper').contains('Logout').click();
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
    .get('input[type="submit"]')
    .click();
});