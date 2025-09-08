// Enhanced Savings Groups Custom Cypress Commands

// Command to setup test savings group with members
Cypress.Commands.add('createTestSavingsGroup', (groupData = {}) => {
  const defaultGroupData = {
    name: 'Test Savings Group',
    description: 'A test savings group',
    district: 'Kampala',
    parish: 'Central',
    village: 'Nakasero',
    country: 'Uganda',
    region: 'Central',
    target_amount: 5000.00,
    minimum_contribution: 10.00,
    formation_date: '2024-01-01',
    ...groupData
  };

  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups`,
      headers: { 'Authorization': `Bearer ${token}` },
      body: defaultGroupData
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data.group;
    });
  });
});

// Command to add member to savings group
Cypress.Commands.add('addGroupMember', (groupId, memberData = {}) => {
  const defaultMemberData = {
    user_id: 1,
    name: 'Test Member',
    gender: 'F',
    phone: '+256701234567',
    role: 'MEMBER',
    ...memberData
  };

  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups/${groupId}/members`,
      headers: { 'Authorization': `Bearer ${token}` },
      body: defaultMemberData
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data.member;
    });
  });
});

// Command to record member savings
Cypress.Commands.add('recordMemberSaving', (groupId, memberId, savingData = {}) => {
  const defaultSavingData = {
    saving_type_code: 'PERSONAL',
    amount: 50.00,
    transaction_type: 'DEPOSIT',
    ...savingData
  };

  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups/${groupId}/members/${memberId}/savings`,
      headers: { 'Authorization': `Bearer ${token}` },
      body: defaultSavingData
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data;
    });
  });
});

// Command to create target campaign
Cypress.Commands.add('createTargetCampaign', (campaignData = {}) => {
  const defaultCampaignData = {
    name: 'Test Campaign',
    description: 'A test target savings campaign',
    target_amount: 1000.00,
    target_date: '2025-06-30',
    is_mandatory: false,
    requires_group_vote: true,
    completion_bonus_rate: 5.0,
    ...campaignData
  };

  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/target-campaigns`,
      headers: { 'Authorization': `Bearer ${token}` },
      body: defaultCampaignData
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data.campaign;
    });
  });
});

// Command to assign campaign to group
Cypress.Commands.add('assignCampaignToGroup', (groupId, campaignId) => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups/${groupId}/target-campaigns/${campaignId}/assign`,
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data.group_campaign;
    });
  });
});

// Command to vote on campaign
Cypress.Commands.add('voteOnCampaign', (groupId, groupCampaignId, vote = 'FOR', reason = 'Test vote') => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups/${groupId}/target-campaigns/${groupCampaignId}/vote`,
      headers: { 'Authorization': `Bearer ${token}` },
      body: {
        vote: vote,
        vote_reason: reason
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      return response.body.data;
    });
  });
});

// Command to create loan assessment
Cypress.Commands.add('createLoanAssessment', (groupId, memberId) => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups/${groupId}/members/${memberId}/loan-assessment`,
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data.assessment;
    });
  });
});

// Command to check loan eligibility
Cypress.Commands.add('checkLoanEligibility', (groupId, memberId, loanAmount) => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'POST',
      url: `${baseUrl}/savings-groups/${groupId}/members/${memberId}/loan-eligibility`,
      headers: { 'Authorization': `Bearer ${token}` },
      body: {
        loan_amount: loanAmount
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      return response.body.data.eligibility;
    });
  });
});

// Command to get financial summary
Cypress.Commands.add('getFinancialSummary', (groupId) => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'GET',
      url: `${baseUrl}/savings-groups/${groupId}/financial-summary`,
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((response) => {
      expect(response.status).to.eq(200);
      return response.body.data.financial_summary;
    });
  });
});

// Command to get group analytics
Cypress.Commands.add('getGroupAnalytics', (groupId) => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
    
    return cy.request({
      method: 'GET',
      url: `${baseUrl}/savings-groups/${groupId}/analytics`,
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((response) => {
      expect(response.status).to.eq(200);
      return response.body.data.analytics;
    });
  });
});

// Command to verify balance consistency
Cypress.Commands.add('verifyBalanceConsistency', (groupId) => {
  return cy.getFinancialSummary(groupId).then((summary) => {
    return cy.window().then((win) => {
      const token = win.localStorage.getItem('authToken');
      const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';
      
      return cy.request({
        method: 'GET',
        url: `${baseUrl}/savings-groups/${groupId}/cashbook?limit=1`,
        headers: { 'Authorization': `Bearer ${token}` }
      }).then((cashbookResponse) => {
        expect(cashbookResponse.status).to.eq(200);
        
        if (cashbookResponse.body.data.entries.length > 0) {
          const latestEntry = cashbookResponse.body.data.entries[0];
          expect(latestEntry.total_balance).to.eq(summary.total_balance);
        }
        
        return { summary, consistent: true };
      });
    });
  });
});

// Command to setup complete test scenario
Cypress.Commands.add('setupCompleteTestScenario', () => {
  return cy.loginAsSuperAdmin().then(() => {
    return cy.createTestSavingsGroup({
      name: 'Complete Test Group',
      description: 'Full featured test group'
    }).then((group) => {
      
      return cy.addGroupMember(group.id, {
        name: 'Alice Chair',
        gender: 'F',
        role: 'FOUNDER'
      }).then((member1) => {
        
        return cy.addGroupMember(group.id, {
          user_id: 2,
          name: 'Bob Treasurer',
          gender: 'M',
          role: 'MEMBER'
        }).then((member2) => {
          
          // Record various savings
          const savingPromises = [
            cy.recordMemberSaving(group.id, member1.id, {
              saving_type_code: 'PERSONAL',
              amount: 100.00
            }),
            cy.recordMemberSaving(group.id, member1.id, {
              saving_type_code: 'ECD',
              amount: 50.00
            }),
            cy.recordMemberSaving(group.id, member2.id, {
              saving_type_code: 'PERSONAL',
              amount: 150.00
            }),
            cy.recordMemberSaving(group.id, member2.id, {
              saving_type_code: 'SOCIAL',
              amount: 25.00
            })
          ];
          
          return Promise.all(savingPromises).then(() => {
            return {
              group,
              members: [member1, member2],
              totalSavings: 325.00
            };
          });
        });
      });
    });
  });
});

// Command to run performance test
Cypress.Commands.add('performanceTest', (testName, testFunction, maxTime = 2000) => {
  const startTime = Date.now();
  
  return testFunction().then((result) => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).to.be.lessThan(maxTime);
    cy.log(`✅ ${testName} completed in ${duration}ms (limit: ${maxTime}ms)`);
    
    return { result, duration };
  });
});

// Add these commands to the main commands file
// This ensures they're available in all test files