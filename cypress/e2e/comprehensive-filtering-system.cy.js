// Comprehensive Filtering System E2E Tests
// Tests all new filtering features and system integrity

describe('Comprehensive Filtering System', () => {
  beforeEach(() => {
    // Login as super admin to test all features
    cy.login('superadmin@testdriven.io', 'superpassword123');
    cy.visit('/savings-groups');
    
    // Navigate to calendar page
    cy.get('[data-testid="calendar-nav"]').click();
    cy.url().should('include', '/savings-groups');
    cy.contains('Activity Calendar').should('be.visible');
  });

  describe('Geographic Filters', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
      cy.get('[data-testid="advanced-filters-panel"]').should('be.visible');
    });

    it('should filter by region', () => {
      // Test Central region filter
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="calendar-events"]').should('be.visible');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      
      // Verify events are filtered
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).should('contain', 'Central');
      });
    });

    it('should filter by district', () => {
      // Test Kampala district filter
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="district-filter"]').click();
      cy.get('[data-value="Kampala"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'District: Kampala');
    });

    it('should filter by parish', () => {
      // Test parish filtering
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="district-filter"]').click();
      cy.get('[data-value="Kampala"]').click();
      
      cy.get('[data-testid="parish-filter"]').click();
      cy.get('[data-value="Central"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Parish: Central');
    });

    it('should filter by village', () => {
      // Test village filtering
      cy.get('[data-testid="village-filter"]').click();
      cy.get('[data-value="Nakasero"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Village: Nakasero');
    });

    it('should combine geographic filters', () => {
      // Test combined geographic filters
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="district-filter"]').click();
      cy.get('[data-value="Kampala"]').click();
      
      cy.get('[data-testid="parish-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'District: Kampala');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Parish: Central');
    });
  });

  describe('Financial Filters', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
    });

    it('should filter by fund types', () => {
      // Test ECD fund filter
      cy.get('[data-testid="fund-types-filter"]').click();
      cy.get('[data-value="ECD"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: ECD');
      
      // Verify events show ECD fund activities
      cy.get('[data-testid="calendar-event"]').should('contain', 'ECD');
    });

    it('should filter by multiple fund types', () => {
      // Test multiple fund types
      cy.get('[data-testid="fund-types-filter"]').click();
      cy.get('[data-value="PERSONAL"]').click();
      cy.get('[data-value="ECD"]').click();
      cy.get('[data-value="SOCIAL"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: PERSONAL, ECD, SOCIAL');
    });

    it('should filter by loan amount range', () => {
      // Test loan amount filtering
      cy.get('[data-testid="loan-amount-slider"]').should('be.visible');
      
      // Set minimum loan amount
      cy.get('[data-testid="loan-amount-min-input"]').clear().type('100000');
      cy.get('[data-testid="loan-amount-max-input"]').clear().type('500000');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Loan Amount Range');
      
      // Verify loan amounts are within range
      cy.get('[data-testid="loan-event"]').each(($loan) => {
        cy.wrap($loan).find('[data-testid="loan-amount"]').then(($amount) => {
          const amount = parseInt($amount.text().replace(/[^\d]/g, ''));
          expect(amount).to.be.at.least(100000);
          expect(amount).to.be.at.most(500000);
        });
      });
    });

    it('should filter by transaction amount range', () => {
      // Test transaction amount filtering
      cy.get('[data-testid="transaction-amount-min-input"]').clear().type('50000');
      cy.get('[data-testid="transaction-amount-max-input"]').clear().type('200000');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Transaction Amount Range');
    });
  });

  describe('Demographic Filters', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
    });

    it('should filter by gender', () => {
      // Test female gender filter
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
      
      // Verify events are from female members
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).find('[data-testid="member-gender"]').should('contain', 'F');
      });
    });

    it('should filter by roles', () => {
      // Test chair role filter
      cy.get('[data-testid="roles-filter"]').click();
      cy.get('[data-value="CHAIR"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Roles: CHAIR');
      
      // Verify events are from chairs
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).find('[data-testid="member-role"]').should('contain', 'Chair');
      });
    });

    it('should filter by multiple roles', () => {
      // Test multiple roles
      cy.get('[data-testid="roles-filter"]').click();
      cy.get('[data-value="CHAIR"]').click();
      cy.get('[data-value="TREASURER"]').click();
      cy.get('[data-value="SECRETARY"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Roles: CHAIR, TREASURER, SECRETARY');
    });

    it('should filter by membership duration', () => {
      // Test membership duration filter
      cy.get('[data-testid="membership-duration-filter"]').click();
      cy.get('[data-value="established"]').click(); // 6-24 months
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Membership Duration');
    });
  });

  describe('Activity Filters', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
    });

    it('should filter by event types', () => {
      // Test transaction event filter
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Event Types: TRANSACTION');
      
      // Verify only transaction events are shown
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).should('have.attr', 'data-event-type', 'TRANSACTION');
      });
    });

    it('should filter by multiple event types', () => {
      // Test multiple event types
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      cy.get('[data-value="MEETING"]').click();
      cy.get('[data-value="LOAN"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Event Types: TRANSACTION, MEETING, LOAN');
    });

    it('should filter by verification status', () => {
      // Test verified status filter
      cy.get('[data-testid="verification-status-filter"]').click();
      cy.get('[data-value="VERIFIED"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Status: VERIFIED');
      
      // Verify events are verified
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).find('[data-testid="verification-badge"]').should('contain', 'Verified');
      });
    });

    it('should filter by date range', () => {
      // Test date range filter
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      
      cy.get('[data-testid="start-date-picker"]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-testid="end-date-picker"]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Date Range');
    });
  });

  describe('Complex Filter Combinations', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
    });

    it('should combine geographic and financial filters', () => {
      // Test geographic + financial combination
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="fund-types-filter"]').click();
      cy.get('[data-value="ECD"]').click();
      
      cy.get('[data-testid="loan-amount-min-input"]').clear().type('100000');
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: ECD');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Loan Amount Range');
    });

    it('should combine demographic and activity filters', () => {
      // Test demographic + activity combination
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="roles-filter"]').click();
      cy.get('[data-value="CHAIR"]').click();
      
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Roles: CHAIR');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Event Types: TRANSACTION');
    });

    it('should handle all filter categories combined', () => {
      // Test all filter categories together
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="district-filter"]').click();
      cy.get('[data-value="Kampala"]').click();
      
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="roles-filter"]').click();
      cy.get('[data-value="CHAIR"]').click();
      
      cy.get('[data-testid="fund-types-filter"]').click();
      cy.get('[data-value="ECD"]').click();
      
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      
      cy.get('[data-testid="verification-status-filter"]').click();
      cy.get('[data-value="VERIFIED"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Verify all filters are applied
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'District: Kampala');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Roles: CHAIR');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: ECD');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Event Types: TRANSACTION');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Status: VERIFIED');
    });
  });

  describe('Group-Specific Filtering', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
    });

    it('should filter by specific group', () => {
      // Test single group filter
      cy.get('[data-testid="group-selector"]').click();
      cy.get('[data-value="1"]').click(); // Select first group
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Group:');
      
      // Verify events are from selected group
      cy.get('[data-testid="calendar-event"]').each(($event) => {
        cy.wrap($event).should('have.attr', 'data-group-id', '1');
      });
    });

    it('should filter by multiple groups', () => {
      // Test multiple groups filter
      cy.get('[data-testid="group-selector"]').click();
      cy.get('[data-value="1"]').click();
      cy.get('[data-value="2"]').click();
      cy.get('[data-value="3"]').click();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Groups:');
    });

    it('should combine group filter with other filters', () => {
      // Test group + other filters
      cy.get('[data-testid="group-selector"]').click();
      cy.get('[data-value="1"]').click();
      
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="filter-summary"]').should('contain', 'Group:');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Event Types: TRANSACTION');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
    });
  });

  describe('Filter UI Functionality', () => {
    beforeEach(() => {
      cy.visit('/savings-groups/calendar');
    });

    it('should show active filter count', () => {
      // Apply multiple filters and check count
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="active-filter-count"]').should('contain', '3 active');
    });

    it('should clear all filters', () => {
      // Apply filters then clear them
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Clear filters
      cy.get('[data-testid="clear-filters-btn"]').click();
      
      cy.get('[data-testid="active-filter-count"]').should('contain', '0 active');
      cy.get('[data-testid="filter-summary"]').should('not.exist');
    });

    it('should save and load filter presets', () => {
      // Apply filters
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="fund-types-filter"]').click();
      cy.get('[data-value="ECD"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Save preset
      cy.get('[data-testid="save-preset-btn"]').click();
      cy.get('[data-testid="preset-name-input"]').type('Central ECD Filter');
      cy.get('[data-testid="save-preset-confirm"]').click();
      
      // Clear filters
      cy.get('[data-testid="clear-filters-btn"]').click();
      
      // Load preset
      cy.get('[data-testid="load-preset-btn"]').click();
      cy.get('[data-testid="preset-option"]').contains('Central ECD Filter').click();
      
      // Verify filters are restored
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Fund Types: ECD');
    });
  });

  describe('Role-Based Filter Access', () => {
    it('should show appropriate filters for super admin', () => {
      cy.login('superadmin@testdriven.io', 'superpassword123');
      cy.visit('/savings-groups/calendar');
      
      // Super admin should see all filters
      cy.get('[data-testid="region-filter"]').should('be.visible');
      cy.get('[data-testid="district-filter"]').should('be.visible');
      cy.get('[data-testid="fund-types-filter"]').should('be.visible');
      cy.get('[data-testid="group-selector"]').should('be.visible');
      cy.get('[data-testid="admin-filters"]').should('be.visible');
    });

    it('should show limited filters for group officer', () => {
      cy.login('sarah@kampala.ug', 'password123');
      cy.visit('/savings-groups/calendar');
      
      // Group officer should see group-level filters only
      cy.get('[data-testid="group-selector"]').should('be.visible');
      cy.get('[data-testid="event-types-filter"]').should('be.visible');
      cy.get('[data-testid="admin-filters"]').should('not.exist');
    });

    it('should show personal filters for regular member', () => {
      cy.login('alice@kampala.ug', 'password123');
      cy.visit('/savings-groups/calendar');
      
      // Regular member should see personal filters only
      cy.get('[data-testid="personal-filters"]').should('be.visible');
      cy.get('[data-testid="group-selector"]').should('not.exist');
      cy.get('[data-testid="admin-filters"]').should('not.exist');
    });
  });

  describe('Performance and Regression Tests', () => {
    it('should handle large datasets with multiple filters', () => {
      cy.visit('/savings-groups/calendar');
      
      // Apply multiple complex filters
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="district-filter"]').click();
      cy.get('[data-value="Kampala"]').click();
      
      cy.get('[data-testid="parish-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="roles-filter"]').click();
      cy.get('[data-value="CHAIR"]').click();
      cy.get('[data-value="TREASURER"]').click();
      
      cy.get('[data-testid="fund-types-filter"]').click();
      cy.get('[data-value="PERSONAL"]').click();
      cy.get('[data-value="ECD"]').click();
      
      cy.get('[data-testid="event-types-filter"]').click();
      cy.get('[data-value="TRANSACTION"]').click();
      cy.get('[data-value="MEETING"]').click();
      
      cy.get('[data-testid="loan-amount-min-input"]').clear().type('50000');
      cy.get('[data-testid="loan-amount-max-input"]').clear().type('500000');
      
      // Apply filters and measure response time
      const startTime = Date.now();
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      cy.get('[data-testid="calendar-events"]').should('be.visible').then(() => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        expect(responseTime).to.be.lessThan(5000); // Should respond within 5 seconds
      });
    });

    it('should maintain existing functionality after filter implementation', () => {
      // Test that basic savings groups functionality still works
      cy.visit('/savings-groups');
      
      // Test navigation
      cy.get('[data-testid="my-group-nav"]').click();
      cy.url().should('include', '/my-group');
      
      cy.get('[data-testid="my-savings-nav"]').click();
      cy.url().should('include', '/my-savings');
      
      cy.get('[data-testid="my-loans-nav"]').click();
      cy.url().should('include', '/my-loans');
      
      cy.get('[data-testid="transactions-nav"]').click();
      cy.url().should('include', '/transactions');
      
      cy.get('[data-testid="meetings-nav"]').click();
      cy.url().should('include', '/meetings');
      
      // Test that each page loads without errors
      cy.get('[data-testid="page-content"]').should('be.visible');
    });

    it('should handle filter state persistence', () => {
      cy.visit('/savings-groups/calendar');
      
      // Apply filters
      cy.get('[data-testid="region-filter"]').click();
      cy.get('[data-value="Central"]').click();
      
      cy.get('[data-testid="gender-filter"]').click();
      cy.get('[data-value="F"]').click();
      
      cy.get('[data-testid="apply-filters-btn"]').click();
      
      // Navigate away and back
      cy.visit('/savings-groups/dashboard');
      cy.visit('/savings-groups/calendar');
      
      // Verify filters are still applied (if persistence is implemented)
      cy.get('[data-testid="filter-summary"]').should('contain', 'Region: Central');
      cy.get('[data-testid="filter-summary"]').should('contain', 'Gender: Female');
    });
  });
});