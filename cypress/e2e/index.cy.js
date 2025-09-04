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
    
    // Check mobile menu
    cy.get('button[aria-label="menu"]').click();
    cy.get('.MuiDrawer-paper').within(() => {
      cy.contains('Register').should('be.visible');
      cy.contains('Login').should('be.visible');
    });
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