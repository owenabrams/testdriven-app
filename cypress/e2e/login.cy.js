describe('Login Functionality', () => {
  beforeEach(() => {
    // Clear any existing auth tokens
    cy.window().then((win) => {
      win.localStorage.removeItem('auth_token')
      win.localStorage.removeItem('authToken')
    })
  })

  it('should display login page', () => {
    cy.visit('/')
    cy.contains('Login').should('be.visible')
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.visit('/')
    cy.get('input[name="email"]').type('invalid@example.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()

    // Should show error message - check for toast notification or error text
    cy.get('body', { timeout: 10000 }).should('contain.text', 'Invalid email or password.')
  })

  it('should successfully login with valid credentials', () => {
    cy.visit('/')
    cy.get('input[name="email"]').type('superadmin@testdriven.io')
    cy.get('input[name="password"]').type('superpassword123')
    cy.get('button[type="submit"]').click()

    // Should show dashboard content (app doesn't redirect URL, just shows different content)
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')
    cy.url().should('eq', 'http://localhost:3000/')

    // Should have auth token in localStorage
    cy.window().its('localStorage').invoke('getItem', 'auth_token').should('exist')
  })

  it('should redirect to login when accessing protected routes without auth', () => {
    cy.visit('/dashboard')
    // Should show login page (not redirect to /login URL since there's no such route)
    cy.contains('Login').should('be.visible')
    cy.get('input[name="email"]').should('be.visible')
  })
})
