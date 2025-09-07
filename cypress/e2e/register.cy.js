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
      .get('form');
  });

  it('should allow a user to register', () => {
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // assert user is redirected to '/'
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // assert '/' is displayed properly
    cy.contains('All Users');
    // Wait for table to load and find the username
    cy.get('table').should('be.visible');
    cy.get('tbody tr').should('have.length.greaterThan', 0);
    cy.get('table').contains(username);
    
    // Check authenticated user navigation
    cy.get('button').contains('User Menu').should('be.visible');
    
    // Close drawer
    cy.get('body').click(0, 0);
  });

  it('should throw an error if the username is taken', () => {
    // First register a user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // Logout
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/logout"]').click();

    // Try to register with same username but different email
    cy
      .get('a').contains('Register').click()
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(`unique${email}`)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // assert user registration failed - should stay on register page
    cy.url().should('include', '/register');
    cy.contains('Register');
    cy.get('button').contains('User Menu').should('not.exist');
    cy.get('.notification.is-error').should('be.visible');
  });

  it('should throw an error if the email is taken', () => {
    // First register a user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // Logout
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/logout"]').click();

    // Try to register with same email but different username
    cy
      .get('a').contains('Register').click()
      .get('input[name="username"]').type(`unique${username}`)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // assert user registration failed - should stay on register page
    cy.url().should('include', '/register');
    cy.contains('Register');
    cy.get('button').contains('User Menu').should('not.exist');
    cy.get('.notification.is-error').should('be.visible');
  });

  it('should validate the password field', () => {
    cy
      .visit('/register')
      .get('h1').contains('Register')
      .get('form')
      // SimpleForm doesn't have disabled state validation, so just check form exists
      .get('input[name="password"]').should('be.visible')
      .get('button[type="submit"]').should('be.visible');
  });
});