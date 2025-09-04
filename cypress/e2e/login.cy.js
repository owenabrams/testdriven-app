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
      .get('h1').contains('Log In')
      .get('form')
      .get('input[disabled]')
      .get('.validation-list')
      .get('.validation-list .error').first().should('contain',
        'Email is required.');
  });

  it('should allow a user to sign in', () => {
    // register user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('input[type="submit"]').click();

    // log a user out
    cy.get('button[aria-label="menu"]').click();
    cy.get('.MuiDrawer-paper').contains('Logout').click();

    // log a user in
    cy
      .get('a').contains('Login').click()
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('input[type="submit"]').click()
      .wait(100);

    // assert user is redirected to '/'
    // assert '/' is displayed properly
    cy.contains('All Users');
    cy
      .get('table')
      .find('tbody > tr').last()
      .find('td').contains(username);
    
    // Check authenticated navigation
    cy.get('button[aria-label="menu"]').click();
    cy.get('.MuiDrawer-paper').within(() => {
      cy.contains('User Status').should('be.visible');
      cy.contains('Logout').should('be.visible');
    });

    // log a user out
    cy.get('.MuiDrawer-paper').contains('Logout').click();

    // assert '/logout' is displayed properly
    cy.get('p').contains('You are now logged out');
    cy.get('a').contains('Login').should('be.visible');
    cy.get('a').contains('Register').should('be.visible');
  });

  it('should throw an error if the credentials are incorrect', () => {
    cy
      .visit('/login')
      .get('input[name="email"]').type('incorrect@test.com')
      .get('input[name="password"]').type('incorrect')
      .get('input[type="submit"]').click();

    // Should show error message
    cy.get('.MuiAlert-message').should('contain', 'Invalid email or password');
  });
});