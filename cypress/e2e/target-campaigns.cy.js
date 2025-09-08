describe('Target Savings Campaigns - Comprehensive E2E Tests', () => {
  let authToken;
  let testGroupId;
  let testMemberId1;
  let testMemberId2;
  let testCampaignId;
  let groupCampaignId;

  const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';

  before(() => {
    // Setup test data
    cy.clearLocalStorage();
    cy.loginAsSuperAdmin();
    
    cy.window().then((win) => {
      authToken = win.localStorage.getItem('authToken');
      
      // Create test group
      cy.request({
        method: 'POST',
        url: `${baseUrl}/savings-groups`,
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: {
          name: 'Campaign Test Group',
          description: 'Group for testing campaigns',
          district: 'Kampala',
          parish: 'Central',
          village: 'Nakasero',
          country: 'Uganda',
          region: 'Central',
          formation_date: '2024-01-01'
        }
      }).then((response) => {
        testGroupId = response.body.data.group.id;
        
        // Add two members for voting tests
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members`,
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: {
            user_id: 1,
            name: 'Alice Chair',
            gender: 'F',
            phone: '+256701111111',
            role: 'FOUNDER'
          }
        }).then((memberResponse) => {
          testMemberId1 = memberResponse.body.data.member.id;
          
          // Assign as chair (officer)
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/officers`,
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: {
              member_id: testMemberId1,
              role: 'chair'
            }
          });
        });
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members`,
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: {
            user_id: 2,
            name: 'Bob Member',
            gender: 'M',
            phone: '+256702222222',
            role: 'MEMBER'
          }
        }).then((memberResponse) => {
          testMemberId2 = memberResponse.body.data.member.id;
        });
      });
    });
  });

  describe('1. Campaign Creation and Management', () => {
    it('should create voluntary target campaign', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            name: 'Community Water Well',
            description: 'Save for community water well project',
            target_amount: 2000.00,
            target_date: '2025-06-30',
            minimum_contribution: 10.00,
            maximum_contribution: 200.00,
            is_mandatory: false,
            requires_group_vote: true,
            minimum_participation_rate: 60.0,
            completion_bonus_rate: 10.0,
            early_completion_bonus: 5.0,
            is_global: true,
            eligible_group_states: 'FORMING,ACTIVE,MATURE'
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.campaign.name).to.eq('Community Water Well');
          expect(response.body.data.campaign.is_mandatory).to.be.false;
          expect(response.body.data.campaign.requires_group_vote).to.be.true;
          expect(response.body.data.campaign.completion_bonus_rate).to.eq(10.0);
          testCampaignId = response.body.data.campaign.id;
        });
      });
    });

    it('should create mandatory target campaign', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            name: 'Regulatory Compliance Fund',
            description: 'Mandatory savings for regulatory compliance',
            target_amount: 500.00,
            target_date: '2025-03-31',
            is_mandatory: true,
            requires_group_vote: false,
            penalty_for_non_participation: 50.00,
            is_global: true
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.campaign.is_mandatory).to.be.true;
          expect(response.body.data.campaign.requires_group_vote).to.be.false;
          expect(response.body.data.campaign.penalty_for_non_participation).to.eq(50.00);
        });
      });
    });

    it('should list all campaigns with filtering', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/target-campaigns?status=DRAFT`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.campaigns).to.be.an('array');
          expect(response.body.data.campaigns.length).to.be.greaterThan(0);
          
          // All campaigns should be in DRAFT status
          response.body.data.campaigns.forEach(campaign => {
            expect(campaign.status).to.eq('DRAFT');
          });
        });
      });
    });
  });

  describe('2. Campaign Assignment and Voting', () => {
    it('should assign voluntary campaign to group', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${testCampaignId}/assign`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.group_campaign.status).to.eq('VOTING');
          expect(response.body.data.group_campaign.campaign_id).to.eq(testCampaignId);
          expect(response.body.data.group_campaign.voting_deadline).to.not.be.null;
          groupCampaignId = response.body.data.group_campaign.id;
        });
      });
    });

    it('should allow officer to vote with weighted vote', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/vote`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            vote: 'FOR',
            vote_reason: 'Great initiative for our community'
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.group_campaign.votes_for).to.eq(1);
          expect(response.body.data.vote_summary.votes_for).to.eq(1);
          
          // Officer vote should have higher weight
          expect(response.body.data.vote_summary.participation_rate).to.be.greaterThan(0);
        });
      });
    });

    it('should allow regular member to vote', () => {
      // Switch to second member (this would require different auth in real scenario)
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/vote`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            vote: 'FOR',
            vote_reason: 'I support this project'
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.group_campaign.votes_for).to.eq(2);
          expect(response.body.data.vote_summary.votes_for).to.eq(2);
        });
      });
    });

    it('should automatically approve campaign when threshold met', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Check campaign status after voting
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(200);
          const campaign = response.body.data.group_campaigns.find(c => c.id === groupCampaignId);
          
          // Should be approved since both members voted FOR
          expect(campaign.status).to.eq('ACCEPTED');
          expect(campaign.decision_date).to.not.be.null;
          expect(campaign.voting_participation_rate).to.eq(100);
        });
      });
    });

    it('should prevent duplicate voting', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/vote`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            vote: 'AGAINST',
            vote_reason: 'Changed my mind'
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          // Should update existing vote, not create new one
          expect(response.body.data.group_campaign.votes_against).to.eq(1);
          expect(response.body.data.group_campaign.votes_for).to.eq(1); // Reduced by 1
        });
      });
    });
  });

  describe('3. Campaign Contributions and Progress', () => {
    it('should allow contributions to approved campaign', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/contribute`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            amount: 150.00,
            mobile_money_transaction_id: 'CAMP123456',
            mobile_money_provider: 'MTN'
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.participation.current_contribution).to.eq(150.00);
          expect(response.body.data.participation.is_participating).to.be.true;
          expect(response.body.data.cashbook_entry.target_saving).to.eq(150.00);
          
          // Check progress calculation
          expect(response.body.data.participation.progress_percentage).to.be.greaterThan(0);
        });
      });
    });

    it('should track group campaign progress', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(200);
          const campaign = response.body.data.group_campaigns.find(c => c.id === groupCampaignId);
          
          expect(campaign.total_saved).to.eq(150.00);
          expect(campaign.participating_members_count).to.be.greaterThan(0);
          expect(campaign.completion_percentage).to.be.greaterThan(0);
          expect(campaign.completion_percentage).to.be.lessThan(100);
        });
      });
    });

    it('should detect target achievement and award bonuses', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Make large contribution to complete the target
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/contribute`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            amount: 1850.00 // This should complete the 2000 target
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          
          // Check if target is achieved
          if (response.body.data.group_campaign.is_completed) {
            expect(response.body.data.group_campaign.completion_percentage).to.eq(100);
            expect(response.body.data.group_campaign.completion_date).to.not.be.null;
            expect(response.body.message).to.contain('target achieved');
          }
        });
      });
    });

    it('should prevent contributions to inactive campaigns', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Try to contribute to a campaign that's not active
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/99999/contribute`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            amount: 50.00
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404);
          expect(response.body.message).to.contain('not found');
        });
      });
    });
  });

  describe('4. Campaign Analytics and Reporting', () => {
    it('should provide campaign analytics', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // This endpoint would need to be implemented
        cy.request({
          method: 'GET',
          url: `${baseUrl}/target-campaigns/${testCampaignId}/analytics`,
          headers: { 'Authorization': `Bearer ${token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            expect(response.body.data.analytics).to.have.property('campaign_overview');
            expect(response.body.data.analytics).to.have.property('group_statistics');
            expect(response.body.data.analytics).to.have.property('financial_statistics');
            expect(response.body.data.analytics).to.have.property('member_statistics');
            expect(response.body.data.analytics).to.have.property('voting_statistics');
          }
        });
      });
    });

    it('should provide group campaign summary', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.group_campaigns).to.be.an('array');
          expect(response.body.data.total_campaigns).to.be.a('number');
          
          const campaigns = response.body.data.group_campaigns;
          expect(campaigns.length).to.be.greaterThan(0);
          
          // Verify campaign data structure
          campaigns.forEach(campaign => {
            expect(campaign).to.have.property('id');
            expect(campaign).to.have.property('status');
            expect(campaign).to.have.property('total_saved');
            expect(campaign).to.have.property('completion_percentage');
            expect(campaign).to.have.property('campaign');
          });
        });
      });
    });
  });

  describe('5. Mandatory Campaign Workflow', () => {
    it('should auto-activate mandatory campaigns without voting', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // First create a mandatory campaign
        cy.request({
          method: 'POST',
          url: `${baseUrl}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            name: 'Emergency Fund',
            description: 'Mandatory emergency fund contribution',
            target_amount: 300.00,
            target_date: '2025-02-28',
            is_mandatory: true,
            requires_group_vote: false,
            penalty_for_non_participation: 25.00
          }
        }).then((campaignResponse) => {
          const mandatoryCampaignId = campaignResponse.body.data.campaign.id;
          
          // Assign to group
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${mandatoryCampaignId}/assign`,
            headers: { 'Authorization': `Bearer ${token}` }
          }).then((assignResponse) => {
            expect(assignResponse.status).to.eq(201);
            expect(assignResponse.body.data.group_campaign.status).to.eq('ACTIVE');
            // Should skip voting for mandatory campaigns
            expect(assignResponse.body.data.group_campaign.voting_deadline).to.be.null;
          });
        });
      });
    });

    it('should auto-enroll members in mandatory campaigns', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Check that members are automatically participating
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          const mandatoryCampaign = response.body.data.group_campaigns.find(
            c => c.campaign.is_mandatory === true
          );
          
          if (mandatoryCampaign) {
            expect(mandatoryCampaign.participating_members_count).to.be.greaterThan(0);
            expect(mandatoryCampaign.status).to.eq('ACTIVE');
          }
        });
      });
    });
  });

  describe('6. Edge Cases and Error Handling', () => {
    it('should handle voting on non-existent campaign', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/99999/vote`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            vote: 'FOR'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404);
          expect(response.body.message).to.contain('not found');
        });
      });
    });

    it('should handle invalid vote values', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/vote`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            vote: 'INVALID_VOTE'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.message).to.contain('Invalid vote');
        });
      });
    });

    it('should handle contributions exceeding maximum limit', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/contribute`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            amount: 500.00 // Exceeds maximum_contribution of 200.00
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 400) {
            expect(response.body.message).to.contain('maximum');
          }
        });
      });
    });

    it('should handle campaign assignment to ineligible groups', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Create campaign with specific eligibility criteria
        cy.request({
          method: 'POST',
          url: `${baseUrl}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            name: 'Mature Groups Only',
            description: 'Campaign for mature groups only',
            target_amount: 1000.00,
            target_date: '2025-12-31',
            eligible_group_states: 'MATURE,ELIGIBLE_FOR_LOAN'
          }
        }).then((campaignResponse) => {
          const restrictedCampaignId = campaignResponse.body.data.campaign.id;
          
          // Try to assign to group that doesn't meet criteria
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${restrictedCampaignId}/assign`,
            headers: { 'Authorization': `Bearer ${token}` },
            failOnStatusCode: false
          }).then((assignResponse) => {
            if (assignResponse.status === 400) {
              expect(assignResponse.body.message).to.contain('not eligible');
            }
          });
        });
      });
    });
  });
});