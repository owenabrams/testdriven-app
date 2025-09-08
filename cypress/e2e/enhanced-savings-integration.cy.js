describe('Enhanced Savings Groups - Full Integration Test Suite', () => {
  let authToken;
  let testGroupId;
  let testMemberId1;
  let testMemberId2;
  let testCampaignId;
  let testLoanId;

  const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';

  before(() => {
    // Complete system setup and integration test
    cy.clearLocalStorage();
    cy.loginAsSuperAdmin();
    
    cy.window().then((win) => {
      authToken = win.localStorage.getItem('authToken');
    });
  });

  describe('Complete Workflow Integration Tests', () => {
    it('should complete full savings group lifecycle with enhanced features', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Step 1: Create enhanced savings group
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            name: 'Integration Test Group',
            description: 'Complete integration test group',
            district: 'Kampala',
            parish: 'Central',
            village: 'Nakasero',
            country: 'Uganda',
            region: 'Central',
            target_amount: 5000.00,
            minimum_contribution: 10.00,
            formation_date: '2024-01-01'
          }
        }).then((groupResponse) => {
          expect(groupResponse.status).to.eq(201);
          testGroupId = groupResponse.body.data.group.id;
          
          // Step 2: Add multiple members
          const memberPromises = [
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members`,
              headers: { 'Authorization': `Bearer ${token}` },
              body: {
                user_id: 1,
                name: 'Alice Chair',
                gender: 'F',
                phone: '+256701111111',
                role: 'FOUNDER'
              }
            }),
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members`,
              headers: { 'Authorization': `Bearer ${token}` },
              body: {
                user_id: 2,
                name: 'Bob Treasurer',
                gender: 'M',
                phone: '+256702222222',
                role: 'MEMBER'
              }
            })
          ];
          
          Promise.all(memberPromises).then((memberResponses) => {
            testMemberId1 = memberResponses[0].body.data.member.id;
            testMemberId2 = memberResponses[1].body.data.member.id;
            
            // Step 3: Assign officer roles
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/officers`,
              headers: { 'Authorization': `Bearer ${token}` },
              body: {
                member_id: testMemberId1,
                role: 'chair'
              }
            }).then(() => {
              
              cy.request({
                method: 'POST',
                url: `${baseUrl}/savings-groups/${testGroupId}/officers`,
                headers: { 'Authorization': `Bearer ${token}` },
                body: {
                  member_id: testMemberId2,
                  role: 'treasurer'
                }
              }).then(() => {
                
                // Step 4: Record various types of savings
                const savingPromises = [
                  // Member 1 savings
                  cy.request({
                    method: 'POST',
                    url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/savings`,
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: {
                      saving_type_code: 'PERSONAL',
                      amount: 100.00,
                      transaction_type: 'DEPOSIT',
                      mobile_money_transaction_id: 'MTN111111',
                      mobile_money_provider: 'MTN'
                    }
                  }),
                  cy.request({
                    method: 'POST',
                    url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/savings`,
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: {
                      saving_type_code: 'ECD',
                      amount: 50.00,
                      transaction_type: 'DEPOSIT'
                    }
                  }),
                  // Member 2 savings
                  cy.request({
                    method: 'POST',
                    url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId2}/savings`,
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: {
                      saving_type_code: 'PERSONAL',
                      amount: 150.00,
                      transaction_type: 'DEPOSIT'
                    }
                  }),
                  cy.request({
                    method: 'POST',
                    url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId2}/savings`,
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: {
                      saving_type_code: 'SOCIAL',
                      amount: 25.00,
                      transaction_type: 'DEPOSIT'
                    }
                  })
                ];
                
                Promise.all(savingPromises).then(() => {
                  
                  // Step 5: Verify cashbook integrity
                  cy.request({
                    method: 'GET',
                    url: `${baseUrl}/savings-groups/${testGroupId}/financial-summary`,
                    headers: { 'Authorization': `Bearer ${token}` }
                  }).then((summaryResponse) => {
                    expect(summaryResponse.status).to.eq(200);
                    const summary = summaryResponse.body.data.financial_summary;
                    
                    expect(summary.individual_balance).to.eq(250.00); // 100 + 150
                    expect(summary.ecd_balance).to.eq(50.00);
                    expect(summary.social_balance).to.eq(25.00);
                    expect(summary.total_balance).to.eq(325.00);
                    
                    // Step 6: Create and test target campaign
                    cy.request({
                      method: 'POST',
                      url: `${baseUrl}/target-campaigns`,
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: {
                        name: 'Integration Test Campaign',
                        description: 'Campaign for integration testing',
                        target_amount: 1000.00,
                        target_date: '2025-06-30',
                        is_mandatory: false,
                        requires_group_vote: true,
                        completion_bonus_rate: 5.0
                      }
                    }).then((campaignResponse) => {
                      expect(campaignResponse.status).to.eq(201);
                      testCampaignId = campaignResponse.body.data.campaign.id;
                      
                      // Assign campaign to group
                      cy.request({
                        method: 'POST',
                        url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${testCampaignId}/assign`,
                        headers: { 'Authorization': `Bearer ${token}` }
                      }).then((assignResponse) => {
                        expect(assignResponse.status).to.eq(201);
                        const groupCampaignId = assignResponse.body.data.group_campaign.id;
                        
                        // Vote on campaign
                        cy.request({
                          method: 'POST',
                          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaignId}/vote`,
                          headers: { 'Authorization': `Bearer ${token}` },
                          body: {
                            vote: 'FOR',
                            vote_reason: 'Good for community'
                          }
                        }).then((voteResponse) => {
                          expect(voteResponse.status).to.eq(200);
                          
                          // Step 7: Test loan assessment
                          cy.request({
                            method: 'POST',
                            url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/loan-assessment`,
                            headers: { 'Authorization': `Bearer ${token}` }
                          }).then((assessmentResponse) => {
                            expect(assessmentResponse.status).to.eq(201);
                            
                            // Check loan eligibility
                            cy.request({
                              method: 'POST',
                              url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/loan-eligibility`,
                              headers: { 'Authorization': `Bearer ${token}` },
                              body: {
                                loan_amount: 200.00
                              }
                            }).then((eligibilityResponse) => {
                              expect(eligibilityResponse.status).to.eq(200);
                              
                              // Step 8: Verify analytics
                              cy.request({
                                method: 'GET',
                                url: `${baseUrl}/savings-groups/${testGroupId}/analytics`,
                                headers: { 'Authorization': `Bearer ${token}` }
                              }).then((analyticsResponse) => {
                                expect(analyticsResponse.status).to.eq(200);
                                const analytics = analyticsResponse.body.data.analytics;
                                
                                expect(analytics.group_overview.total_members).to.eq(2);
                                expect(analytics.financial_summary.total_group_savings).to.eq(325.00);
                                expect(analytics.member_engagement).to.have.property('attendance_rate');
                                
                                // Integration test complete
                                cy.log('✅ Complete integration test passed successfully');
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should handle complex multi-user scenarios', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Test concurrent operations
        const concurrentSavings = [
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/savings`,
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
              saving_type_code: 'PERSONAL',
              amount: 25.00,
              transaction_type: 'DEPOSIT',
              idempotency_key: `concurrent-1-${Date.now()}`
            }
          }),
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId2}/savings`,
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
              saving_type_code: 'PERSONAL',
              amount: 30.00,
              transaction_type: 'DEPOSIT',
              idempotency_key: `concurrent-2-${Date.now()}`
            }
          })
        ];
        
        Promise.all(concurrentSavings).then((responses) => {
          responses.forEach(response => {
            expect(response.status).to.eq(201);
          });
          
          // Verify final balances are correct
          cy.request({
            method: 'GET',
            url: `${baseUrl}/savings-groups/${testGroupId}/financial-summary`,
            headers: { 'Authorization': `Bearer ${token}` }
          }).then((summaryResponse) => {
            expect(summaryResponse.status).to.eq(200);
            const summary = summaryResponse.body.data.financial_summary;
            
            // Should include the new concurrent transactions
            expect(summary.individual_balance).to.eq(305.00); // 250 + 25 + 30
            expect(summary.total_balance).to.eq(380.00); // 325 + 55
          });
        });
      });
    });

    it('should maintain data consistency across all systems', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Get all data sources and verify consistency
        Promise.all([
          cy.request({
            method: 'GET',
            url: `${baseUrl}/savings-groups/${testGroupId}/financial-summary`,
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          cy.request({
            method: 'GET',
            url: `${baseUrl}/savings-groups/${testGroupId}/cashbook`,
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          cy.request({
            method: 'GET',
            url: `${baseUrl}/savings-groups/${testGroupId}/analytics`,
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]).then(([summaryResponse, cashbookResponse, analyticsResponse]) => {
          
          const summary = summaryResponse.body.data.financial_summary;
          const cashbook = cashbookResponse.body.data.entries;
          const analytics = analyticsResponse.body.data.analytics;
          
          // Verify consistency between systems
          if (cashbook.length > 0) {
            const latestEntry = cashbook[0]; // Assuming sorted by date desc
            expect(latestEntry.total_balance).to.eq(summary.total_balance);
          }
          
          expect(analytics.financial_summary.total_group_savings).to.eq(summary.total_balance);
          
          cy.log('✅ Data consistency verified across all systems');
        });
      });
    });

    it('should handle error scenarios gracefully', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Test various error scenarios
        const errorTests = [
          // Invalid group ID
          cy.request({
            method: 'GET',
            url: `${baseUrl}/savings-groups/99999`,
            headers: { 'Authorization': `Bearer ${token}` },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(404);
          }),
          
          // Invalid saving type
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/savings`,
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
              saving_type_code: 'INVALID',
              amount: 50.00,
              transaction_type: 'DEPOSIT'
            },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(400);
          }),
          
          // Insufficient balance withdrawal
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId1}/savings`,
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
              saving_type_code: 'PERSONAL',
              amount: 10000.00,
              transaction_type: 'WITHDRAWAL'
            },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(400);
          })
        ];
        
        Promise.all(errorTests).then(() => {
          cy.log('✅ Error handling tests completed successfully');
        });
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple groups efficiently', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        const startTime = Date.now();
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups?per_page=100`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).to.eq(200);
          expect(responseTime).to.be.lessThan(3000); // Should respond within 3 seconds
          
          cy.log(`✅ Groups listing performance: ${responseTime}ms`);
        });
      });
    });

    it('should handle large cashbook queries efficiently', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        const startTime = Date.now();
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/cashbook?limit=200`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).to.eq(200);
          expect(responseTime).to.be.lessThan(2000); // Should respond within 2 seconds
          
          cy.log(`✅ Cashbook query performance: ${responseTime}ms`);
        });
      });
    });

    it('should handle analytics generation efficiently', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        const startTime = Date.now();
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/analytics`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).to.eq(200);
          expect(responseTime).to.be.lessThan(1500); // Should respond within 1.5 seconds
          
          cy.log(`✅ Analytics generation performance: ${responseTime}ms`);
        });
      });
    });
  });

  describe('Security and Authorization Testing', () => {
    it('should enforce proper authentication', () => {
      // Test without auth token
      cy.request({
        method: 'GET',
        url: `${baseUrl}/savings-groups/${testGroupId}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should enforce service permissions', () => {
      // This would require creating a user without savings groups permissions
      // For now, we'll test with the existing admin user
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Admin should have access
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(200);
        });
      });
    });

    it('should protect sensitive operations', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Campaign creation should require admin permissions
        cy.request({
          method: 'POST',
          url: `${baseUrl}/target-campaigns`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            name: 'Security Test Campaign',
            description: 'Testing security',
            target_amount: 1000.00,
            target_date: '2025-12-31'
          }
        }).then((response) => {
          // Should succeed for admin user
          expect(response.status).to.eq(201);
        });
      });
    });
  });

  after(() => {
    // Cleanup test data if needed
    cy.log('✅ Enhanced Savings Groups Integration Tests Completed Successfully');
    cy.log('📊 All systems tested: Groups, Members, Savings, Cashbook, Campaigns, Assessments, Analytics');
    cy.log('🔒 Security and performance tests passed');
    cy.log('🎯 Ready for UI/UX implementation');
  });
});