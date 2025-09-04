describe('Navigation', () => {
  it('should display all navigation links', () => {
    cy.visit('/')
      .get('a[href="/"]')
      .should('contain', 'TestDriven.io')
      .get('a[href="/about"]')
      .should('be.visible')
      .get('a[href="/demo"]')
      .should('be.visible')
      .get('a[href="/testing"]')
      .should('be.visible');
  });

  it('should navigate to about page', () => {
    cy.visit('/')
      .get('a[href="/about"]')
      .click()
      .url()
      .should('include', '/about')
      .get('h2')
      .should('contain', 'About');
  });

  it('should navigate to demo page', () => {
    cy.visit('/')
      .get('a[href="/demo"]')
      .click()
      .url()
      .should('include', '/demo')
      .get('h3')
      .should('contain', 'Modern React Patterns');
  });

  it('should navigate to testing page', () => {
    cy.visit('/')
      .get('a[href="/testing"]')
      .click()
      .url()
      .should('include', '/testing')
      .get('h3')
      .should('contain', 'Modern Testing Patterns Implementation');
  });

  it('should navigate back to home', () => {
    cy.visit('/about')
      .get('a[href="/"]')
      .click()
      .url()
      .should('eq', Cypress.config().baseUrl + '/')
      .get('h2')
      .should('contain', 'All Users');
  });
});