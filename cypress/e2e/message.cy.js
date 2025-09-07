const randomstring = require('randomstring');

const username = randomstring.generate();
const email = `${username}@test.com`;
const password = 'greaterthanten';

describe('Message', () => {
  it(`should display flash messages correctly`, () => {
    // register user
    cy
      .visit('/register')
      .get('input[name="username"]').type(username)
      .get('input[name="email"]').type(email)
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click()

    // assert flash messages are removed when user clicks the 'x'
    cy
      .get('.notification.is-success').contains('Welcome!')
      .get('.delete').click()
      .get('.notification.is-success').should('not.be.visible');

    // log a user out
    cy.get('button').contains('User Menu').click();
    cy.get('a[href="/logout"]').click();

    // attempt to log in
    cy
      .visit('/login')
      .get('input[name="email"]').type('incorrect@email.com')
      .get('input[name="password"]').type(password)
      .get('button[type="submit"]').click();

    // assert correct message is flashed
    cy
      .get('.notification.is-success').should('not.be.visible')
      .get('.notification.is-error').contains('Login failed');

    // log a user in
    cy
      .get('input[name="email"]').clear().type(email)
      .get('input[name="password"]').clear().type(password)
      .get('button[type="submit"]').click()
      .wait(100);

    // assert flash message is removed when a new message is flashed
    cy
      .get('.notification.is-success').contains('Welcome!')
      .get('.notification.is-error').should('not.be.visible');

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

    // assert flash message is removed after three seconds
    cy
      .get('.notification.is-success').contains('Welcome!')
      .wait(4000)
      .get('.notification.is-success').should('not.be.visible');
  });
});