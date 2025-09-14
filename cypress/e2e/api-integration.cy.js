// API Integration E2E Tests
// Tests the backend API endpoints through the frontend interface

describe('API Integration Tests', () => {
  const apiBaseUrl = 'http://localhost:5000'
  
  beforeEach(() => {
    // Clear any existing auth tokens
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('should test all authentication endpoints', () => {
    // Test registration endpoint
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/register`,
      body: {
        username: 'apitest',
        email: 'apitest@example.com',
        password: 'testpassword123'
      }
    }).then((response) => {
      expect(response.status).to.eq(201)
      expect(response.body.status).to.eq('success')
      expect(response.body.message).to.contain('Successfully registered')
    })

    // Test login endpoint
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/login`,
      body: {
        email: 'apitest@example.com',
        password: 'testpassword123'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.status).to.eq('success')
      expect(response.body.auth_token).to.exist
      
      // Store token for subsequent tests
      cy.wrap(response.body.auth_token).as('authToken')
    })
  })

  it('should test user management endpoints', function() {
    // First login to get auth token
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/login`,
      body: {
        email: 'superadmin@testdriven.io',
        password: 'superpassword123'
      }
    }).then((response) => {
      const authToken = response.body.auth_token
      
      // Test get all users
      cy.request({
        method: 'GET',
        url: `${apiBaseUrl}/users`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.status).to.eq('success')
        expect(response.body.data.users).to.be.an('array')
      })

      // Test create new user (admin only)
      cy.request({
        method: 'POST',
        url: `${apiBaseUrl}/users`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'newpassword123'
        }
      }).then((response) => {
        expect(response.status).to.eq(201)
        expect(response.body.status).to.eq('success')
        
        const userId = response.body.data.id
        
        // Test get single user
        cy.request({
          method: 'GET',
          url: `${apiBaseUrl}/users/${userId}`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.status).to.eq('success')
          expect(response.body.data.username).to.eq('newuser')
          expect(response.body.data.email).to.eq('newuser@example.com')
        })
      })
    })
  })

  it('should test API error handling', () => {
    // Test invalid registration data
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/register`,
      body: {
        username: '',
        email: 'invalid-email',
        password: '123'
      },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(400)
      expect(response.body.status).to.eq('fail')
    })

    // Test invalid login credentials
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/login`,
      body: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(404)
      expect(response.body.status).to.eq('fail')
    })

    // Test unauthorized access
    cy.request({
      method: 'GET',
      url: `${apiBaseUrl}/users`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401)
      expect(response.body.status).to.eq('fail')
    })
  })

  it('should test API rate limiting and security', () => {
    // Test multiple rapid requests (rate limiting)
    const requests = []
    for (let i = 0; i < 10; i++) {
      requests.push(
        cy.request({
          method: 'POST',
          url: `${apiBaseUrl}/auth/login`,
          body: {
            email: 'test@example.com',
            password: 'wrongpassword'
          },
          failOnStatusCode: false
        })
      )
    }

    // All requests should be handled gracefully
    Promise.all(requests).then((responses) => {
      responses.forEach((response) => {
        expect(response.status).to.be.oneOf([404, 429]) // 404 for invalid creds, 429 for rate limit
      })
    })
  })

  it('should test API response times and performance', () => {
    const startTime = Date.now()
    
    cy.request({
      method: 'GET',
      url: `${apiBaseUrl}/ping`
    }).then((response) => {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      expect(response.status).to.eq(200)
      expect(response.body.message).to.contain('pong')
      expect(responseTime).to.be.lessThan(1000) // Should respond within 1 second
    })
  })

  it('should test API data validation and sanitization', () => {
    // Test SQL injection attempts
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/register`,
      body: {
        username: "'; DROP TABLE users; --",
        email: 'hacker@example.com',
        password: 'password123'
      },
      failOnStatusCode: false
    }).then((response) => {
      // Should reject malicious input
      expect(response.status).to.eq(400)
    })

    // Test XSS attempts
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/register`,
      body: {
        username: '<script>alert("xss")</script>',
        email: 'xss@example.com',
        password: 'password123'
      },
      failOnStatusCode: false
    }).then((response) => {
      // Should sanitize or reject XSS attempts
      expect(response.status).to.be.oneOf([400, 201])
      if (response.status === 201) {
        expect(response.body.data.username).to.not.contain('<script>')
      }
    })
  })

  it('should test API CORS and headers', () => {
    cy.request({
      method: 'OPTIONS',
      url: `${apiBaseUrl}/ping`
    }).then((response) => {
      expect(response.headers).to.have.property('access-control-allow-origin')
      expect(response.headers).to.have.property('access-control-allow-methods')
      expect(response.headers).to.have.property('access-control-allow-headers')
    })
  })

  it('should test API pagination and filtering', function() {
    // Login first to get auth token
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/login`,
      body: {
        email: 'superadmin@testdriven.io',
        password: 'superpassword123'
      }
    }).then((response) => {
      const authToken = response.body.auth_token
      
      // Test pagination
      cy.request({
        method: 'GET',
        url: `${apiBaseUrl}/users?page=1&per_page=5`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.data.users).to.have.length.at.most(5)
      })
    })
  })

  it('should test API content types and encoding', () => {
    // Test JSON content type
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/register`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        username: 'jsontest',
        email: 'jsontest@example.com',
        password: 'password123'
      }
    }).then((response) => {
      expect(response.headers['content-type']).to.contain('application/json')
    })
  })
})
