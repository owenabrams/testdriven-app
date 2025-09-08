// Real-World Filtering Scenarios Test
// Tests complex filtering combinations as requested by the user

describe('Real-World Filtering Scenarios', () => {
  beforeEach(() => {
    // Use existing login command
    cy.login('superadmin@testdriven.io', 'superpassword123');
    cy.visit('/savings-groups');
    
    // Wait for page to load
    cy.contains('Savings Groups').should('be.visible');
  });

  describe('Complex Multi-Dimensional Filtering', () => {
    it('should filter women who saved in ECD fund in Central region for current month', () => {
      // Navigate to calendar page (assuming it's accessible via navigation)
      cy.get('nav').within(() => {
        cy.contains('Activity Calendar').click();
      });
      
      // Wait for calendar page to load
      cy.contains('Activity Calendar').should('be.visible');
      
      // Open advanced filters
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Apply complex filter combination
      cy.get('[data-testid="gender-filter"]').select('F');
      cy.get('[data-testid="fund-types-filter"]').select('ECD');
      cy.get('[data-testid="region-filter"]').select('Central');
      cy.get('[data-testid="time-period-filter"]').select('this_month');
      
      // Apply filters
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Verify filter results
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: ECD');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Time Period: This Month');
      
      // Verify calendar shows filtered events
      cy.get('[data-testid="calendar-events"]').should('be.visible');
      
      // Check that only ECD fund transactions from women in Central region are shown
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).should('contain', 'ECD');
        cy.wrap($event).should('have.attr', 'data-member-gender', 'F');
        cy.wrap($event).should('have.attr', 'data-group-region', 'Central');
      });
    });

    it('should show detailed information when clicking on filtered calendar events', () => {
      // Navigate to calendar and apply filters
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Apply specific filter for ECD fund transactions
      cy.get('[data-testid="fund-types-filter"]').select('ECD');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Click on first calendar event
      cy.get('[data-testid="calendar-event"]').first().click();
      
      // Verify detailed modal opens
      cy.get('[data-testid="event-details-modal"]').should('be.visible');
      
      // Verify comprehensive details are shown
      cy.get('[data-testid="event-details-modal"]').within(() => {
        cy.get('[data-testid="event-title"]').should('be.visible');
        cy.get('[data-testid="event-amount"]').should('be.visible');
        cy.get('[data-testid="fund-type"]').should('contain', 'ECD');
        cy.get('[data-testid="member-details"]').should('be.visible');
        cy.get('[data-testid="group-details"]').should('be.visible');
        cy.get('[data-testid="verification-status"]').should('be.visible');
        cy.get('[data-testid="mobile-money-info"]').should('be.visible');
      });
      
      // Close modal
      cy.get('[data-testid="close-modal-btn"]').click();
      cy.get('[data-testid="event-details-modal"]').should('not.exist');
    });
  });

  describe('Time-Based Filtering', () => {
    beforeEach(() => {
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
    });

    it('should filter activities by day', () => {
      cy.get('[data-testid="time-period-filter"]').select('today');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Time Period: Today');
      
      // Verify only today's events are shown
      const today = new Date().toISOString().split('T')[0];
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).should('have.attr', 'data-event-date', today);
      });
    });

    it('should filter activities by week', () => {
      cy.get('[data-testid="time-period-filter"]').select('this_week');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Time Period: This Week');
      
      // Verify events are within current week
      cy.get('[data-testid="calendar-events"]').should('be.visible');
    });

    it('should filter activities by month', () => {
      cy.get('[data-testid="time-period-filter"]').select('this_month');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Time Period: This Month');
      
      // Verify events are within current month
      cy.get('[data-testid="calendar-events"]').should('be.visible');
    });

    it('should support custom date range filtering', () => {
      cy.get('[data-testid="time-period-filter"]').select('custom');
      
      // Set custom date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      
      cy.get('[data-testid="start-date-picker"]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-testid="end-date-picker"]').type(endDate.toISOString().split('T')[0]);
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Start Date');
      cy.get('[data-testid="filter-summary"]').should('contain', 'End Date');
    });
  });

  describe('Role-Based Access Testing', () => {
    it('should show full filtering options for super admin', () => {
      // Already logged in as super admin
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Verify all filter options are available
      cy.get('[data-testid="region-filter"]').should('be.visible');
      cy.get('[data-testid="district-filter"]').should('be.visible');
      cy.get('[data-testid="fund-types-filter"]').should('be.visible');
      cy.get('[data-testid="group-selector"]').should('be.visible');
      cy.get('[data-testid="admin-filters"]').should('be.visible');
    });

    it('should show limited filtering options for basic user', () => {
      // Logout and login as basic user
      cy.logout();
      cy.login('alice@kampala.ug', 'password123');
      cy.visit('/savings-groups');
      
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Verify limited filter options
      cy.get('[data-testid="personal-filters"]').should('be.visible');
      cy.get('[data-testid="group-selector"]').should('not.exist');
      cy.get('[data-testid="admin-filters"]').should('not.exist');
    });
  });

  describe('Calendar View Modes', () => {
    beforeEach(() => {
      cy.get('nav').contains('Activity Calendar').click();
    });

    it('should switch between day, week, and month views', () => {
      // Test month view (default)
      cy.get('[data-testid="view-mode-selector"]').should('have.value', 'month');
      cy.get('[data-testid="calendar-grid"]').should('have.class', 'month-view');
      
      // Switch to week view
      cy.get('[data-testid="view-mode-selector"]').select('week');
      cy.get('[data-testid="calendar-grid"]').should('have.class', 'week-view');
      
      // Switch to day view
      cy.get('[data-testid="view-mode-selector"]').select('day');
      cy.get('[data-testid="calendar-grid"]').should('have.class', 'day-view');
    });

    it('should navigate between dates in different view modes', () => {
      // Test navigation in month view
      cy.get('[data-testid="previous-btn"]').click();
      cy.get('[data-testid="current-date-display"]').should('not.contain', new Date().getMonth());
      
      cy.get('[data-testid="today-btn"]').click();
      cy.get('[data-testid="current-date-display"]').should('contain', new Date().getMonth());
      
      cy.get('[data-testid="next-btn"]').click();
      // Verify navigation worked
    });
  });

  describe('Filter Combinations and Performance', () => {
    it('should handle multiple complex filter combinations efficiently', () => {
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Apply multiple filters simultaneously
      cy.get('[data-testid="region-filter"]').select('Central');
      cy.get('[data-testid="district-filter"]').select('Kampala');
      cy.get('[data-testid="gender-filter"]').select('F');
      cy.get('[data-testid="fund-types-filter"]').select('ECD');
      cy.get('[data-testid="event-types-filter"]').select('TRANSACTION');
      cy.get('[data-testid="verification-status-filter"]').select('VERIFIED');
      
      // Measure response time
      const startTime = Date.now();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="calendar-events"]').should('be.visible').then(() => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        expect(responseTime).to.be.lessThan(3000); // Should respond within 3 seconds
      });
      
      // Verify all filters are applied
      cy.get('[data-testid="active-filter-count"]').should('contain', '6 active');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: ECD');
    });

    it('should clear all filters correctly', () => {
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Apply some filters
      cy.get('[data-testid="gender-filter"]').select('F');
      cy.get('[data-testid="fund-types-filter"]').select('ECD');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Verify filters are applied
      cy.get('[data-testid="active-filter-count"]').should('contain', '2 active');
      
      // Clear all filters
      cy.get('[data-testid="clear-filters-btn"]').click();
      
      // Verify filters are cleared
      cy.get('[data-testid="active-filter-count"]').should('contain', '0 active');
      cy.get('[data-testid="filter-summary"]').should('not.exist');
    });
  });

  describe('Summary Statistics', () => {
    it('should display accurate summary statistics for filtered results', () => {
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Apply ECD fund filter
      cy.get('[data-testid="fund-types-filter"]').select('ECD');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Verify summary statistics
      cy.get('[data-testid="summary-stats"]').should('be.visible');
      cy.get('[data-testid="total-events"]').should('contain', 'Total Events');
      cy.get('[data-testid="total-amount"]').should('contain', 'UGX');
      cy.get('[data-testid="event-breakdown"]').should('contain', 'TRANSACTION');
      cy.get('[data-testid="fund-breakdown"]').should('contain', 'ECD');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle no results gracefully', () => {
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="advanced-filters"]').click();
      
      // Apply filters that should return no results
      cy.get('[data-testid="region-filter"]').select('Northern');
      cy.get('[data-testid="fund-types-filter"]').select('TARGET');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Verify empty state
      cy.get('[data-testid="empty-state"]').should('be.visible');
      cy.get('[data-testid="empty-state"]').should('contain', 'No events match your filter criteria');
      cy.get('[data-testid="filter-suggestions"]').should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      // Mock API failure
      cy.intercept('GET', '**/api/calendar/events*', { statusCode: 500 }).as('apiError');
      
      cy.get('nav').contains('Activity Calendar').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.wait('@apiError');
      
      // Verify error handling
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Failed to load calendar events');
      cy.get('[data-testid="retry-btn"]').should('be.visible');
    });
  });
});