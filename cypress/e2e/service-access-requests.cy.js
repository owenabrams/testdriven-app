const randomstring = require('randomstring');

const superAdminCredentials = {
  email: 'superadmin@testdriven.io',
  password: 'superpassword123'
};

describe('Service Access Request System', () => {
  let testUser;
  let authToken;

  beforeEach(() => {
    cy.clearLocalStorage();
    
    // Create unique test user for each test
    testUser = {
      username: randomstring.generate(),
      email: `test-user-${randomstring.generate()}@test.com`,
      password: 'testpassword123'
    };
  });

  describe('User Service Access Requests', () => {
    it('should allow users to request service access via API', () => {
      // First register and login user
      cy.register(testUser.username, testUser.email, testUser.password);
      
      // Get auth token
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        authToken = response.body.auth_token;
        
        // Request access to users service (service_id: 1)
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            service_id: 1,
            permissions: 'read',
            reason: 'Need access for testing purposes'
          }
        }).then((accessResponse) => {
          expect(accessResponse.status).to.eq(201);
          expect(accessResponse.body.status).to.eq('success');
          expect(accessResponse.body.message).to.contain('Access request submitted');
        });
      });
    });

    it('should allow users to view their own access requests', () => {
      // Register and login user
      cy.register(testUser.username, testUser.email, testUser.password);
      
      // Get auth token and make request
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((response) => {
        authToken = response.body.auth_token;
        
        // First create an access request
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            service_id: 1,
            permissions: 'read,write',
            reason: 'Need write access for data management'
          }
        });
        
        // Then fetch user's requests
        cy.request({
          method: 'GET',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/my-requests`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then((requestsResponse) => {
          expect(requestsResponse.status).to.eq(200);
          expect(requestsResponse.body.data.requests).to.be.an('array');
          expect(requestsResponse.body.data.requests.length).to.be.greaterThan(0);
          
          const request = requestsResponse.body.data.requests[0];
          expect(request.requested_permissions).to.eq('read,write');
          expect(request.reason).to.eq('Need write access for data management');
          expect(request.status).to.eq('pending');
        });
      });
    });

    it('should prevent duplicate access requests', () => {
      // Register and login user
      cy.register(testUser.username, testUser.email, testUser.password);
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((response) => {
        authToken = response.body.auth_token;
        
        // First request
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            service_id: 1,
            permissions: 'read',
            reason: 'First request'
          }
        }).then((firstResponse) => {
          expect(firstResponse.status).to.eq(201);
          
          // Second request (should fail)
          cy.request({
            method: 'POST',
            url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
            headers: {
              'Authorization': `Bearer ${authToken}`
            },
            body: {
              service_id: 1,
              permissions: 'read,write',
              reason: 'Duplicate request'
            },
            failOnStatusCode: false
          }).then((secondResponse) => {
            expect(secondResponse.status).to.eq(400);
            expect(secondResponse.body.message).to.contain('pending request');
          });
        });
      });
    });
  });

  describe('Admin Access Request Management', () => {
    let superAdminToken;
    let userToken;
    let requestId;

    beforeEach(() => {
      // Get super admin token
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: superAdminCredentials.email,
          password: superAdminCredentials.password
        }
      }).then((response) => {
        superAdminToken = response.body.auth_token;
      });
    });

    it('should allow super admin to approve access requests', () => {
      // Register user and create request
      cy.register(testUser.username, testUser.email, testUser.password);
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((response) => {
        userToken = response.body.auth_token;
        
        // Create access request
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          body: {
            service_id: 2, // orders service
            permissions: 'read',
            reason: 'Need to view order data'
          }
        }).then(() => {
          
          // Super admin fetches pending requests
          cy.request({
            method: 'GET',
            url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests`,
            headers: {
              'Authorization': `Bearer ${superAdminToken}`
            }
          }).then((requestsResponse) => {
            expect(requestsResponse.status).to.eq(200);
            const requests = requestsResponse.body.data.requests;
            const userRequest = requests.find(r => r.user.email === testUser.email);
            expect(userRequest).to.exist;
            requestId = userRequest.id;
            
            // Approve the request
            cy.request({
              method: 'POST',
              url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests/${requestId}/approve`,
              headers: {
                'Authorization': `Bearer ${superAdminToken}`
              }
            }).then((approveResponse) => {
              expect(approveResponse.status).to.eq(200);
              expect(approveResponse.body.message).to.contain('approved');
            });
          });
        });
      });
    });

    it('should allow super admin to reject access requests', () => {
      // Register user and create request
      cy.register(testUser.username, testUser.email, testUser.password);
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((response) => {
        userToken = response.body.auth_token;
        
        // Create access request
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          body: {
            service_id: 3, // products service
            permissions: 'read,write,delete',
            reason: 'Need full access to products'
          }
        }).then(() => {
          
          // Super admin fetches and rejects request
          cy.request({
            method: 'GET',
            url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests`,
            headers: {
              'Authorization': `Bearer ${superAdminToken}`
            }
          }).then((requestsResponse) => {
            const requests = requestsResponse.body.data.requests;
            const userRequest = requests.find(r => r.user.email === testUser.email);
            requestId = userRequest.id;
            
            // Reject the request
            cy.request({
              method: 'POST',
              url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests/${requestId}/reject`,
              headers: {
                'Authorization': `Bearer ${superAdminToken}`
              },
              body: {
                review_notes: 'Too many permissions requested for new user'
              }
            }).then((rejectResponse) => {
              expect(rejectResponse.status).to.eq(200);
              expect(rejectResponse.body.message).to.contain('rejected');
            });
          });
        });
      });
    });
  });

  describe('Permission Validation', () => {
    it('should prevent non-admin users from accessing admin endpoints', () => {
      // Register regular user
      cy.register(testUser.username, testUser.email, testUser.password);
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((response) => {
        const userToken = response.body.auth_token;
        
        // Try to access admin endpoints
        cy.request({
          method: 'GET',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/users`,
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          failOnStatusCode: false
        }).then((adminResponse) => {
          expect(adminResponse.status).to.eq(403);
          expect(adminResponse.body.message).to.contain('Super admin access required');
        });
        
        // Try to approve requests
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/admin/access-requests/1/approve`,
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          failOnStatusCode: false
        }).then((approveResponse) => {
          expect(approveResponse.status).to.eq(403);
        });
      });
    });

    it('should require authentication for all protected endpoints', () => {
      // Test without auth token
      cy.request({
        method: 'GET',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/my-requests`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/services/request-access`,
        body: { service_id: 1 },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });
  });
});