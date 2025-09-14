describe('Index Page - Complete Application Flow', () => {
  beforeEach(() => {
    // Clear any existing auth tokens
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should load the home page without errors', () => {
    cy.visit('/')
    cy.get('h1').should('be.visible')

    // Check that the page loads without JavaScript errors
    cy.window().then((win) => {
      expect(win.console.error).to.not.have.been.called
    })
  })

  it('should display the application title and branding', () => {
    cy.visit('/')

    // Check for main application elements
    cy.contains('Savings').should('be.visible')
    cy.get('h1').should('contain.text', 'Savings')
  })

  it('should show login form when not authenticated', () => {
    cy.visit('/')

    // Should show login form elements
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')

    // Should not show authenticated content
    cy.contains('Dashboard').should('not.exist')
    cy.contains('Logout').should('not.exist')
  })

  it('should have responsive design elements', () => {
    cy.visit('/')

    // Test mobile viewport
    cy.viewport(375, 667)
    cy.get('input[name="email"]').should('be.visible')

    // Test desktop viewport
    cy.viewport(1280, 720)
    cy.get('input[name="email"]').should('be.visible')
  })

  it('should handle network connectivity gracefully', () => {
    cy.visit('/')

    // Simulate slow network
    cy.intercept('GET', '/api/**', { delay: 2000 }).as('slowApi')

    // Page should still be functional
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
  })
})
