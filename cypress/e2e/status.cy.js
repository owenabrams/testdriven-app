const randomstring = require('randomstring');

const username = randomstring.generate();
const email = `${username}@test.com`;
const password = 'greaterthanten';

describe('Status', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should not display user info if a user is not logged in', () => {
    cy
      .visit('/status')
      .get('p').contains('You must be logged in to view this.')
      .get('a').contains('Register').should('be.visible')
      .get('a').contains('Login').should('be.visible');
  });

  it('should display user info if a user is logged in', () => {
    // register user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    cy.wait(500);

    // assert '/status' is displayed properly
    cy.visit('/status');
    cy.get('li > strong').contains('User ID:');
    cy.get('li > strong').contains('Email:');
    cy.get('li').contains(email);
    cy.get('li > strong').contains('Username:');
    cy.get('li').contains(username);
    
    // Check that authenticated navigation is available
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/status"]').should('be.visible');
    cy.get('a[href="/logout"]').should('be.visible');
  });
});