describe('Index Page', () => {
  it('should be able to view the home page', () => {
    cy.visit('/')
    cy.get('h1').should('be.visible')
    // The page should load without errors
    cy.contains('Savings').should('be.visible')
  })

  it('should have login form when not authenticated', () => {
    cy.visit('/')
    // Should show login form when not authenticated
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })
})
