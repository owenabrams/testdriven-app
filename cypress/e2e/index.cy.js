describe('Index', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should display the page correctly if a user is not logged in', () => {
    cy
      .visit('/')
      .get('h1').contains('All Users');
    
    // Check that unauthenticated navigation is visible
    cy.get('a').contains('Register').should('be.visible');
    cy.get('a').contains('Login').should('be.visible');
    
    // Check that user menu button is not visible when not authenticated
    cy.get('button').contains('User Menu').should('not.exist');
  });

  it('should display the users table', () => {
    cy
      .visit('/')
      .get('table')
      .should('be.visible')
      .get('th')
      .should('contain', 'ID')
      .should('contain', 'Email')
      .should('contain', 'Username')
      .should('contain', 'Active')
      .should('contain', 'Admin');
  });

  it('should display users in the table', () => {
    cy
      .visit('/')
      .get('tbody tr')
      .should('have.length.greaterThan', 0);
  });
});