describe('Authentication', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
  });

  it('should display register and login links when not authenticated', () => {
    cy.visit('/')
      .get('a[href="/register"]')
      .should('be.visible')
      .get('a[href="/login"]')
      .should('be.visible')
      .get('a[href="/logout"]')
      .should('not.exist')
      .get('a[href="/status"]')
      .should('not.exist');
  });

  it('should allow a user to register', () => {
    const randomEmail = `test${Date.now()}@test.com`;
    const randomUsername = `testuser${Date.now()}`;
    
    cy.visit('/register')
      .get('input[name="username"]')
      .type(randomUsername)
      .get('input[name="email"]')
      .type(randomEmail)
      .get('input[name="password"]')
      .type('testpassword')
      .get('button[type="submit"]')
      .click();

    // Should redirect and show success message
    cy.url().should('eq', Cypress.config().baseUrl + '/')
      .get('.MuiAlert-message')
      .should('contain', 'Successfully registered');
  });

  it('should allow a user to login', () => {
    // First register a user
    const randomEmail = `test${Date.now()}@test.com`;
    const randomUsername = `testuser${Date.now()}`;
    
    cy.register(randomUsername, randomEmail, 'testpassword');
    
    // Logout first
    cy.logout();
    
    // Then login
    cy.login(randomEmail, 'testpassword');
    
    // Should be authenticated
    cy.url().should('eq', Cypress.config().baseUrl + '/')
      .get('a[href="/logout"]')
      .should('be.visible')
      .get('a[href="/status"]')
      .should('be.visible');
  });

  it('should allow a user to logout', () => {
    // Register and login
    const randomEmail = `test${Date.now()}@test.com`;
    const randomUsername = `testuser${Date.now()}`;
    
    cy.register(randomUsername, randomEmail, 'testpassword');
    
    // Logout
    cy.logout();
    
    // Should show login/register links again
    cy.get('a[href="/register"]')
      .should('be.visible')
      .get('a[href="/login"]')
      .should('be.visible')
      .get('a[href="/logout"]')
      .should('not.exist');
  });

  it('should display user status when authenticated', () => {
    // Register and login
    const randomEmail = `test${Date.now()}@test.com`;
    const randomUsername = `testuser${Date.now()}`;
    
    cy.register(randomUsername, randomEmail, 'testpassword');
    
    // Visit status page
    cy.visit('/status')
      .get('li')
      .should('contain', 'Email:')
      .should('contain', 'Username:')
      .should('contain', 'Active:')
      .should('contain', 'Admin:');
  });

  it('should redirect to login when accessing status page unauthenticated', () => {
    cy.visit('/status')
      .get('a[href="/login"]')
      .should('be.visible')
      .get('p')
      .should('contain', 'You must be logged in to view this');
  });
});