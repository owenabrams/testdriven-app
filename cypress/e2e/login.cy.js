const randomstring = require('randomstring');

const username = randomstring.generate();
const email = `${username}@test.com`;
const password = 'greaterthanten';

describe('Login', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should display the sign in form', () => {
    cy
      .visit('/login')
      .get('h1').contains('Login')
      .get('form');
  });

  it('should allow a user to sign in', () => {
    // register user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // log a user out
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/logout"]').click();

    // log a user in
    cy
      .get('a').contains('Login').click()
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click()
      .wait(100);

    // assert user is redirected to '/'
    // assert '/' is displayed properly
    cy.contains('All Users');
    // Wait for table to load and find the username
    cy.get('table').should('be.visible');
    cy.get('tbody tr').should('have.length.greaterThan', 0);
    cy.get('table').contains(username);
    cy.get('.notification.is-success').contains('Successfully logged in!');
    
    // Check authenticated navigation
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/status"]').should('be.visible');
    cy.get('a[href="/logout"]').should('be.visible');

    // log a user out
    cy.get('a[href="/logout"]').click();

    // assert '/logout' is displayed properly
    cy.get('p').contains('You are now logged out');
    cy.get('a').contains('Login').should('be.visible');
    cy.get('a').contains('Register').should('be.visible');
  });

  it('should throw an error if the credentials are incorrect', () => {
    // attempt to log in with incorrect email
    cy
      .visit('/login')
      .get('input[name="email"]').type('incorrect@email.com')
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // assert user login failed - should stay on login page
    cy.url().should('include', '/login');
    cy.contains('Login');
    cy.get('button').contains('User Menu').should('not.exist');
    cy.get('a').contains('Login').should('be.visible');
    cy.get('a').contains('Register').should('be.visible');
    cy.get('.notification.is-error').contains('Login failed');

    // attempt to log in with wrong password (first register a user)
    cy
      .get('a').contains('Register').click()
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // logout and try wrong password
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/logout"]').click();
    
    cy
      .get('a').contains('Login').click()
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type('incorrectpassword')
      .get('button[type="submit"]').click()
      .wait(100);

    // assert user login failed
    cy.url().should('include', '/login');
    cy.contains('Login');
    cy.get('button').contains('User Menu').should('not.exist');
    cy.get('a').contains('Login').should('be.visible');
    cy.get('a').contains('Register').should('be.visible');
    cy.get('.notification.is-error').contains('Login failed');
  });
});