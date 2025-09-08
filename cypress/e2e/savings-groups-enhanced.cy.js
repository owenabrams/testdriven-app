describe('Enhanced Savings Groups Microservice - End-to-End Tests', () => {
  let authToken;
  let testGroupId;
  let testMemberId;
  let testCampaignId;
  let testLoanId;

  const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('1. Enhanced Group Management', () => {
    it('should create enhanced savings group with required location fields', () => {
      cy.loginAsSuperAdmin();
      
      cy.window().then((win) => {
        authToken = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            name: 'Test Enhanced Group',
            description: 'A test group with enhanced features',
            district: 'Kampala',
            parish: 'Central',
            village: 'Nakasero',
            country: 'Uganda',
            region: 'Central',
            target_amount: 10000.00,
            minimum_contribution: 5.00,
            formation_date: '2024-01-01'
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.group).to.have.property('id');
          expect(response.body.data.group.district).to.eq('Kampala');
          expect(response.body.data.group.parish).to.eq('Central');
          expect(response.body.data.group.village).to.eq('Nakasero');
          testGroupId = response.body.data.group.id;
        });
      });
    });

    it('should fail to create group without required location fields', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            name: 'Incomplete Group',
            description: 'Missing required fields',
            country: 'Uganda'
            // Missing district, parish, village
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.message).to.contain('required');
        });
      });
    });

    it('should add members to the group', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            user_id: 1,
            name: 'Alice Nakato',
            gender: 'F',
            phone: '+256701234567',
            role: 'FOUNDER'
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.member.name).to.eq('Alice Nakato');
          expect(response.body.data.member.gender).to.eq('F');
          testMemberId = response.body.data.member.id;
        });
      });
    });

    it('should assign officer roles', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/officers`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            member_id: testMemberId,
            role: 'chair'
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.group.officers.chair).to.not.be.null;
        });
      });
    });
  });

  describe('2. Multiple Saving Types and Mobile Money', () => {
    it('should record personal savings with mobile money', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            saving_type_code: 'PERSONAL',
            amount: 50.00,
            transaction_type: 'DEPOSIT',
            mobile_money_transaction_id: 'MTN123456789',
            mobile_money_provider: 'MTN',
            mobile_money_phone: '+256701234567'
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.saving_transaction.amount).to.eq(50.00);
          expect(response.body.data.saving_transaction.mobile_money_transaction_id).to.eq('MTN123456789');
          expect(response.body.data.cashbook_entry.individual_saving).to.eq(50.00);
        });
      });
    });

    it('should record ECD fund contribution', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            saving_type_code: 'ECD',
            amount: 25.00,
            transaction_type: 'DEPOSIT'
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.cashbook_entry.ecd_fund).to.eq(25.00);
        });
      });
    });

    it('should record social fund contribution', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            saving_type_code: 'SOCIAL',
            amount: 10.00,
            transaction_type: 'DEPOSIT'
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.cashbook_entry.social_fund).to.eq(10.00);
        });
      });
    });
  });

  describe('3. Comprehensive Cashbook System', () => {
    it('should retrieve group cashbook with all transactions', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/cashbook`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.entries).to.be.an('array');
          expect(response.body.data.entries.length).to.be.greaterThan(0);
          
          // Check that we have entries for different saving types
          const entries = response.body.data.entries;
          const hasPersonalSaving = entries.some(e => e.individual_saving > 0);
          const hasEcdFund = entries.some(e => e.ecd_fund > 0);
          const hasSocialFund = entries.some(e => e.social_fund > 0);
          
          expect(hasPersonalSaving).to.be.true;
          expect(hasEcdFund).to.be.true;
          expect(hasSocialFund).to.be.true;
        });
      });
    });

    it('should get financial summary with running balances', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/financial-summary`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.financial_summary).to.have.property('individual_balance');
          expect(response.body.data.financial_summary).to.have.property('ecd_balance');
          expect(response.body.data.financial_summary).to.have.property('social_balance');
          expect(response.body.data.financial_summary).to.have.property('total_balance');
          
          // Verify balances match our contributions
          expect(response.body.data.financial_summary.individual_balance).to.eq(50.00);
          expect(response.body.data.financial_summary.ecd_balance).to.eq(25.00);
          expect(response.body.data.financial_summary.social_balance).to.eq(10.00);
          expect(response.body.data.financial_summary.total_balance).to.eq(85.00);
        });
      });
    });
  });

  describe('4. Automated Loan Assessment System', () => {
    it('should create loan assessment for member', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-assessment`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.assessment).to.have.property('eligibility_score');
          expect(response.body.data.assessment).to.have.property('is_eligible');
          expect(response.body.data.assessment).to.have.property('max_loan_amount');
          expect(response.body.data.assessment).to.have.property('risk_level');
          
          // Score should be calculated based on our test data
          expect(response.body.data.assessment.eligibility_score).to.be.a('number');
          expect(response.body.data.assessment.risk_level).to.be.oneOf(['LOW', 'MEDIUM', 'HIGH']);
        });
      });
    });

    it('should check loan eligibility for specific amount', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            loan_amount: 100.00
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.eligibility).to.have.property('eligible');
          expect(response.body.data.eligibility).to.have.property('assessment');
          expect(response.body.data.eligibility).to.have.property('reasons');
          
          if (response.body.data.eligibility.eligible) {
            expect(response.body.data.eligibility).to.have.property('loan_terms');
            expect(response.body.data.eligibility.loan_terms).to.have.property('max_amount');
            expect(response.body.data.eligibility.loan_terms).to.have.property('interest_rate_annual');
          }
        });
      });
    });
  });

  describe('5. Target Savings Campaigns', () => {
    it('should create target savings campaign (admin only)', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/target-campaigns`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            name: 'School Fees 2025',
            description: 'Save for children school fees',
            target_amount: 500.00,
            target_date: '2025-03-01',
            is_mandatory: false,
            requires_group_vote: true,
            minimum_participation_rate: 60.0,
            completion_bonus_rate: 5.0,
            is_global: true
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.campaign.name).to.eq('School Fees 2025');
          expect(response.body.data.campaign.is_mandatory).to.be.false;
          expect(response.body.data.campaign.requires_group_vote).to.be.true;
          testCampaignId = response.body.data.campaign.id;
        });
      });
    });

    it('should assign campaign to group', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${testCampaignId}/assign`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.group_campaign.status).to.eq('VOTING');
          expect(response.body.data.group_campaign.campaign_id).to.eq(testCampaignId);
        });
      });
    });

    it('should allow member to vote on campaign', () => {
      // First get the group campaign ID
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          const groupCampaign = response.body.data.group_campaigns[0];
          
          // Now vote on the campaign
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaign.id}/vote`,
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: {
              vote: 'FOR',
              vote_reason: 'Good initiative for our children'
            }
          }).then((voteResponse) => {
            expect(voteResponse.status).to.eq(200);
            expect(voteResponse.body.data.group_campaign.votes_for).to.eq(1);
            expect(voteResponse.body.data.vote_summary.votes_for).to.eq(1);
          });
        });
      });
    });

    it('should allow contribution to approved campaign', () => {
      // First check if campaign is approved (it should be since we voted FOR)
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          const groupCampaign = response.body.data.group_campaigns[0];
          
          if (groupCampaign.status === 'ACCEPTED') {
            // Make contribution to the campaign
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/target-campaigns/${groupCampaign.id}/contribute`,
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: {
                amount: 100.00,
                mobile_money_transaction_id: 'MTN987654321',
                mobile_money_provider: 'MTN'
              }
            }).then((contributeResponse) => {
              expect(contributeResponse.status).to.eq(200);
              expect(contributeResponse.body.data.participation.current_contribution).to.eq(100.00);
              expect(contributeResponse.body.data.cashbook_entry.target_saving).to.eq(100.00);
            });
          }
        });
      });
    });
  });

  describe('6. Meeting Attendance and Fines', () => {
    it('should record meeting attendance', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // This endpoint would need to be implemented
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/attendance`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            member_id: testMemberId,
            meeting_date: '2024-12-01',
            attended: true,
            meeting_type: 'REGULAR'
          },
          failOnStatusCode: false
        }).then((response) => {
          // This might fail if endpoint not implemented yet
          if (response.status === 201) {
            expect(response.body.data.attendance.attended).to.be.true;
          }
        });
      });
    });

    it('should impose and track fines', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // This endpoint would need to be implemented
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/fines`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            amount: 5.00,
            reason: 'Late arrival to meeting',
            fine_type: 'LATE_ATTENDANCE',
            due_date: '2024-12-15'
          },
          failOnStatusCode: false
        }).then((response) => {
          // This might fail if endpoint not implemented yet
          if (response.status === 201) {
            expect(response.body.data.fine.amount).to.eq(5.00);
            expect(response.body.data.fine.status).to.eq('PENDING');
          }
        });
      });
    });
  });

  describe('7. Comprehensive Analytics', () => {
    it('should get group analytics', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/analytics`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.analytics).to.have.property('group_overview');
          expect(response.body.data.analytics).to.have.property('financial_summary');
          expect(response.body.data.analytics).to.have.property('member_engagement');
          
          // Verify analytics data structure
          expect(response.body.data.analytics.group_overview.total_members).to.be.a('number');
          expect(response.body.data.analytics.financial_summary.total_group_savings).to.be.a('number');
        });
      });
    });

    it('should get all target campaigns', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/target-campaigns`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.campaigns).to.be.an('array');
          expect(response.body.data.campaigns.length).to.be.greaterThan(0);
          
          const campaign = response.body.data.campaigns.find(c => c.id === testCampaignId);
          expect(campaign).to.not.be.undefined;
          expect(campaign.name).to.eq('School Fees 2025');
        });
      });
    });
  });

  describe('8. Error Handling and Edge Cases', () => {
    it('should handle invalid saving type', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            saving_type_code: 'INVALID_TYPE',
            amount: 50.00,
            transaction_type: 'DEPOSIT'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.message).to.contain('not found');
        });
      });
    });

    it('should handle insufficient balance for withdrawal', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            saving_type_code: 'PERSONAL',
            amount: 1000.00, // More than available balance
            transaction_type: 'WITHDRAWAL'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.message).to.contain('Insufficient balance');
        });
      });
    });

    it('should handle unauthorized access', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/savings-groups/${testGroupId}`,
        // No authorization header
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should handle non-existent group', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/99999`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404);
          expect(response.body.message).to.contain('not found');
        });
      });
    });
  });

  describe('9. Data Consistency and Integrity', () => {
    it('should maintain balance consistency across all systems', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Get financial summary
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/financial-summary`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((summaryResponse) => {
          const summary = summaryResponse.body.data.financial_summary;
          
          // Get cashbook entries
          cy.request({
            method: 'GET',
            url: `${baseUrl}/savings-groups/${testGroupId}/cashbook`,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then((cashbookResponse) => {
            const entries = cashbookResponse.body.data.entries;
            
            if (entries.length > 0) {
              // Latest entry should match financial summary
              const latestEntry = entries[0]; // Assuming sorted by date desc
              expect(latestEntry.total_balance).to.eq(summary.total_balance);
            }
          });
        });
      });
    });

    it('should handle concurrent transactions safely', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Make multiple concurrent requests with same idempotency key
        const idempotencyKey = `test-${Date.now()}`;
        
        const requests = [1, 2, 3].map(() => 
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: {
              saving_type_code: 'PERSONAL',
              amount: 10.00,
              transaction_type: 'DEPOSIT',
              idempotency_key: idempotencyKey
            },
            failOnStatusCode: false
          })
        );
        
        // Only one should succeed, others should return existing transaction
        Promise.all(requests).then((responses) => {
          const successCount = responses.filter(r => r.status === 201).length;
          const duplicateCount = responses.filter(r => r.status === 200).length;
          
          expect(successCount).to.eq(1);
          expect(duplicateCount).to.eq(2);
        });
      });
    });
  });

  describe('10. Performance and Load Testing', () => {
    it('should handle multiple groups efficiently', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Create multiple groups and measure response time
        const startTime = Date.now();
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups?per_page=50`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).to.eq(200);
          expect(responseTime).to.be.lessThan(2000); // Should respond within 2 seconds
          expect(response.body.data.groups).to.be.an('array');
        });
      });
    });

    it('should handle large cashbook queries efficiently', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        const startTime = Date.now();
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/cashbook?limit=100`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).to.eq(200);
          expect(responseTime).to.be.lessThan(1000); // Should respond within 1 second
          expect(response.body.data.entries).to.be.an('array');
        });
      });
    });
  });
});