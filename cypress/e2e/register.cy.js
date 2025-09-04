const randomstring = require('randomstring');

const username = randomstring.generate();
const email = `${username}@test.com`;
const password = 'greaterthanten';

describe('Register', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should display the registration form', () => {
    cy
      .visit('/register')
      .get('h1').contains('Register')
      .get('form')
      .get('input[disabled]')
      .get('.validation-list')
      .get('.validation-list .error').first().should('contain', 
        'Username must be greater than 5 characters.');
  });

  it('should allow a user to register', () => {
    // register user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('input[type="submit"]').click();

    // assert user is redirected to '/'
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // assert '/' is displayed properly
    cy.contains('All Users');
    cy.contains(username);
    
    // Check authenticated user navigation (mobile)
    cy.get('button[aria-label="menu"]').click();
    cy.get('.MuiDrawer-paper').within(() => {
      cy.contains('User Status').should('be.visible');
      cy.contains('Logout').should('be.visible');
    });
    
    // Close drawer
    cy.get('body').click(0, 0);
  });

  it('should throw an error if the username is taken', () => {
    // First register a user
    cy.register(username, email, password);
    
    // Logout
    cy.logout();
    
    // Try to register with same username
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(`different${email}`)
      .get('input[name="password"]').type(password)
      .get('input[type="submit"]').click();

    // Should show error message
    cy.get('.MuiAlert-message').should('contain', 'Registration failed');
  });

  it('should throw an error if the email address is taken', () => {
    const newUsername = randomstring.generate();
    
    // First register a user
    cy.register(username, email, password);
    
    // Logout
    cy.logout();
    
    // Try to register with same email
    cy
      .visit('/register')
      .get('input[name="username"]').type(newUsername)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('input[type="submit"]').click();

    // Should show error message
    cy.get('.MuiAlert-message').should('contain', 'Registration failed');
  });

  it('should validate the password field', () => {
    cy
      .visit('/register')
      .get('h1').contains('Register')
      .get('form')
      .get('input[disabled]')
      .get('.validation-list .error').should('contain',
        'Password must be greater than 10 characters.')
      .get('input[name="password"]').type('greaterthanten')
      .get('.validation-list')
      .get('.validation-list .error').should('not.contain',
        'Password must be greater than 10 characters.')
      .get('.validation-list .success').should('contain',
        'Password must be greater than 10 characters.');
        
    // Test navigation and form reset
    cy.get('button[aria-label="menu"]').click();
    cy.get('.MuiDrawer-paper').contains('Login').click();
    cy.get('button[aria-label="menu"]').click();
    cy.get('.MuiDrawer-paper').contains('Register').click();
    cy.get('.validation-list .error').should('contain',
      'Password must be greater than 10 characters.');
  });
});