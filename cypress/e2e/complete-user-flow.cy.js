// Complete User Flow E2E Tests
// Tests the entire application from user registration to full functionality

describe('Complete User Flow - End-to-End', () => {
  const testUser = {
    username: 'e2euser',
    email: 'e2euser@testdriven.io',
    password: 'testpassword123'
  }

  beforeEach(() => {
    // Clear any existing data
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should complete the full user journey', () => {
    // Step 1: Visit the application
    cy.visit('/')
    cy.get('h1').should('be.visible')

    // Step 2: Register a new user
    cy.contains('Register').click()
    cy.get('input[name="username"]').type(testUser.username)
    cy.get('input[name="email"]').type(testUser.email)
    cy.get('input[name="password"]').type(testUser.password)
    cy.get('button[type="submit"]').click()

    // Step 3: Verify registration success
    cy.contains('Registration successful', { timeout: 10000 }).should('be.visible')
    
    // Step 4: Login with the new user
    cy.get('input[name="email"]').clear().type(testUser.email)
    cy.get('input[name="password"]').clear().type(testUser.password)
    cy.get('button[type="submit"]').click()

    // Step 5: Verify successful login and dashboard access
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')
    cy.window().its('localStorage').invoke('getItem', 'auth_token').should('exist')

    // Step 6: Test main application features
    cy.contains('Savings').should('be.visible')
    
    // Step 7: Test user profile/settings
    cy.contains('Profile').click()
    cy.contains(testUser.username).should('be.visible')
    cy.contains(testUser.email).should('be.visible')

    // Step 8: Test logout functionality
    cy.contains('Logout').click()
    cy.contains('Login').should('be.visible')
    cy.window().its('localStorage').invoke('getItem', 'auth_token').should('not.exist')
  })

  it('should handle user authentication flow correctly', () => {
    cy.visit('/')

    // Test invalid login
    cy.get('input[name="email"]').type('invalid@email.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()
    
    cy.contains('Invalid credentials').should('be.visible')

    // Test valid login with existing user
    cy.get('input[name="email"]').clear().type('superadmin@testdriven.io')
    cy.get('input[name="password"]').clear().type('superpassword123')
    cy.get('button[type="submit"]').click()

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')
  })

  it('should persist user session across page reloads', () => {
    // Login first
    cy.visit('/')
    cy.get('input[name="email"]').type('superadmin@testdriven.io')
    cy.get('input[name="password"]').type('superpassword123')
    cy.get('button[type="submit"]').click()
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')

    // Reload page and verify session persistence
    cy.reload()
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')
    cy.window().its('localStorage').invoke('getItem', 'auth_token').should('exist')
  })

  it('should handle API errors gracefully', () => {
    // Intercept API calls and simulate errors
    cy.intercept('POST', '/auth/login', { statusCode: 500 }).as('loginError')
    
    cy.visit('/')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()

    cy.wait('@loginError')
    cy.contains('Server error').should('be.visible')
  })

  it('should validate form inputs properly', () => {
    cy.visit('/')

    // Test empty form submission
    cy.get('button[type="submit"]').click()
    cy.contains('Email is required').should('be.visible')
    cy.contains('Password is required').should('be.visible')

    // Test invalid email format
    cy.get('input[name="email"]').type('invalid-email')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.contains('Invalid email format').should('be.visible')

    // Test password requirements
    cy.get('input[name="email"]').clear().type('test@example.com')
    cy.get('input[name="password"]').clear().type('123')
    cy.get('button[type="submit"]').click()
    cy.contains('Password must be at least').should('be.visible')
  })

  it('should be accessible and follow WCAG guidelines', () => {
    cy.visit('/')

    // Test keyboard navigation
    cy.get('input[name="email"]').focus()
    cy.focused().should('have.attr', 'name', 'email')
    
    cy.tab()
    cy.focused().should('have.attr', 'name', 'password')
    
    cy.tab()
    cy.focused().should('have.attr', 'type', 'submit')

    // Test ARIA labels and roles
    cy.get('input[name="email"]').should('have.attr', 'aria-label')
    cy.get('input[name="password"]').should('have.attr', 'aria-label')
    cy.get('button[type="submit"]').should('have.attr', 'role', 'button')

    // Test color contrast and visibility
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should handle concurrent user sessions', () => {
    // This test simulates multiple browser tabs/sessions
    cy.visit('/')
    
    // Login in first session
    cy.get('input[name="email"]').type('superadmin@testdriven.io')
    cy.get('input[name="password"]').type('superpassword123')
    cy.get('button[type="submit"]').click()
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')

    // Store the auth token
    cy.window().its('localStorage').invoke('getItem', 'auth_token').then((token) => {
      expect(token).to.exist
      
      // Simulate another session by clearing and setting a different token
      cy.window().its('localStorage').invoke('setItem', 'auth_token', 'invalid-token')
      cy.reload()
      
      // Should redirect to login due to invalid token
      cy.contains('Login').should('be.visible')
    })
  })

  it('should perform well under load', () => {
    // Test multiple rapid API calls
    cy.visit('/')
    
    // Simulate rapid form submissions
    for (let i = 0; i < 5; i++) {
      cy.get('input[name="email"]').clear().type(`test${i}@example.com`)
      cy.get('input[name="password"]').clear().type('password123')
      cy.get('button[type="submit"]').click()
      cy.wait(100) // Small delay between requests
    }
    
    // Application should remain responsive
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
  })
})
