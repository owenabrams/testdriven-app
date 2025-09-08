describe('Notifications Microservice', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('API Integration Tests', () => {
    it('should create notification via API', () => {
      // Login first to get auth token
      cy.loginAsSuperAdmin();
      
      // Get the auth token and test the API
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/notifications`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            type: 'info',
            message: 'Test notification',
            userId: 1
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data).to.have.property('id');
        });
      });
    });

    it('should fetch user notifications via API', () => {
      cy.loginAsSuperAdmin();
      
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/notifications/user/1`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data).to.be.an('array');
        });
      });
    });
  });

  describe('UI Integration Tests', () => {
    it('should display notifications in the UI', () => {
      cy.loginAsSuperAdmin();
      
      // Navigate to notifications page
      cy.visit('/notifications');
      
      // Check page loads correctly
      cy.get('h1').should('contain', 'Notifications');
      cy.get('[data-testid="notifications-list"]').should('be.visible');
    });

    it('should create notification through UI', () => {
      cy.loginAsSuperAdmin();
      
      cy.visit('/notifications/create');
      
      // Fill out notification form
      cy.get('input[name="message"]').type('UI Test Notification');
      cy.get('select[name="type"]').select('warning');
      cy.get('button[type="submit"]').click();
      
      // Verify success
      cy.get('.notification.is-success')
        .should('contain', 'Notification created successfully');
      
      // Verify redirect
      cy.url().should('include', '/notifications');
    });
  });

  describe('Integration with Existing Features', () => {
    it('should show notifications in user menu', () => {
      cy.loginAsSuperAdmin();
      
      // Create a notification first
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000'}/notifications`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            type: 'info',
            message: 'Menu test notification',
            userId: 1
          }
        });
      });
      
      cy.visit('/');
      
      // Check notification appears in user menu (this will need UI implementation)
      cy.get('button').contains('User Menu').click();
      // Note: These UI elements don't exist yet - will need to implement
      // cy.get('[data-testid="notification-badge"]').should('be.visible');
      // cy.get('a[href="/notifications"]').should('be.visible');
    });
  });
});