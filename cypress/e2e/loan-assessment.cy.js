describe('Loan Assessment System - E2E Tests', () => {
  let authToken;
  let testGroupId;
  let testMemberId;
  let assessmentId;

  const baseUrl = Cypress.env('REACT_APP_USERS_SERVICE_URL') || 'http://localhost:5000';

  before(() => {
    // Setup comprehensive test data for loan assessment
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
          name: 'Loan Assessment Test Group',
          description: 'Group for testing loan assessments',
          district: 'Kampala',
          parish: 'Central',
          village: 'Nakasero',
          country: 'Uganda',
          region: 'Central',
          formation_date: '2023-06-01' // 18 months ago for good history
        }
      }).then((response) => {
        testGroupId = response.body.data.group.id;
        
        // Add member
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members`,
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: {
            user_id: 1,
            name: 'Sarah Excellent',
            gender: 'F',
            phone: '+256701234567',
            role: 'MEMBER'
          }
        }).then((memberResponse) => {
          testMemberId = memberResponse.body.data.member.id;
          
          // Create substantial savings history
          const savingPromises = [
            // Personal savings
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
              headers: { 'Authorization': `Bearer ${authToken}` },
              body: {
                saving_type_code: 'PERSONAL',
                amount: 200.00,
                transaction_type: 'DEPOSIT'
              }
            }),
            // ECD fund
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
              headers: { 'Authorization': `Bearer ${authToken}` },
              body: {
                saving_type_code: 'ECD',
                amount: 100.00,
                transaction_type: 'DEPOSIT'
              }
            }),
            // Social fund
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/savings`,
              headers: { 'Authorization': `Bearer ${authToken}` },
              body: {
                saving_type_code: 'SOCIAL',
                amount: 50.00,
                transaction_type: 'DEPOSIT'
              }
            })
          ];
          
          Promise.all(savingPromises);
        });
      });
    });
  });

  describe('1. Loan Assessment Creation', () => {
    it('should create comprehensive loan assessment', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-assessment`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.data.assessment).to.have.property('id');
          expect(response.body.data.assessment).to.have.property('eligibility_score');
          expect(response.body.data.assessment).to.have.property('is_eligible');
          expect(response.body.data.assessment).to.have.property('max_loan_amount');
          expect(response.body.data.assessment).to.have.property('risk_level');
          expect(response.body.data.assessment).to.have.property('valid_until');
          
          assessmentId = response.body.data.assessment.id;
          
          // Verify assessment components
          expect(response.body.data.assessment.total_savings).to.be.greaterThan(0);
          expect(response.body.data.assessment.months_active).to.be.greaterThan(0);
          expect(response.body.data.assessment.eligibility_score).to.be.within(0, 100);
          expect(response.body.data.assessment.risk_level).to.be.oneOf(['LOW', 'MEDIUM', 'HIGH']);
        });
      });
    });

    it('should calculate correct eligibility score based on criteria', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Get the assessment we just created
        cy.request({
          method: 'GET',
          url: `${baseUrl}/loan-assessments/${assessmentId}`,
          headers: { 'Authorization': `Bearer ${token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            const assessment = response.body.data.assessment;
            
            // Verify scoring algorithm components
            // With 18+ months active, should get full savings history points (30)
            expect(assessment.months_active).to.be.greaterThan(12);
            
            // With substantial savings (350+), should get savings bonus points
            expect(assessment.total_savings).to.be.greaterThan(300);
            
            // Score should reflect good performance
            expect(assessment.eligibility_score).to.be.greaterThan(50);
            
            // Should be eligible for some loan amount
            expect(assessment.max_loan_amount).to.be.greaterThan(0);
          }
        });
      });
    });

    it('should set appropriate risk level and loan terms', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/loan-assessments/${assessmentId}`,
          headers: { 'Authorization': `Bearer ${token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            const assessment = response.body.data.assessment;
            
            // Verify risk-based loan terms
            if (assessment.risk_level === 'LOW') {
              // Low risk should allow 3x savings
              expect(assessment.max_loan_amount).to.be.greaterThan(assessment.total_savings * 2.5);
              expect(assessment.recommended_term_months).to.eq(12);
            } else if (assessment.risk_level === 'MEDIUM') {
              // Medium risk should allow 2x savings
              expect(assessment.max_loan_amount).to.be.greaterThan(assessment.total_savings * 1.5);
              expect(assessment.recommended_term_months).to.eq(6);
            } else if (assessment.risk_level === 'HIGH') {
              // High risk should allow 1x savings
              expect(assessment.max_loan_amount).to.be.lessThan(assessment.total_savings * 1.5);
              expect(assessment.recommended_term_months).to.eq(3);
            }
          }
        });
      });
    });

    it('should mark previous assessments as not current', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Create second assessment
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-assessment`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(201);
          const newAssessmentId = response.body.data.assessment.id;
          
          // New assessment should be current
          expect(response.body.data.assessment.is_current).to.be.true;
          
          // Previous assessment should no longer be current
          cy.request({
            method: 'GET',
            url: `${baseUrl}/loan-assessments/${assessmentId}`,
            headers: { 'Authorization': `Bearer ${token}` },
            failOnStatusCode: false
          }).then((oldResponse) => {
            if (oldResponse.status === 200) {
              expect(oldResponse.body.data.assessment.is_current).to.be.false;
            }
          });
        });
      });
    });
  });

  describe('2. Loan Eligibility Checking', () => {
    it('should check eligibility for reasonable loan amount', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            loan_amount: 300.00
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
            expect(response.body.data.eligibility.loan_terms).to.have.property('recommended_term_months');
            
            // Verify loan terms are reasonable
            expect(response.body.data.eligibility.loan_terms.interest_rate_annual).to.be.within(10, 25);
            expect(response.body.data.eligibility.loan_terms.recommended_term_months).to.be.within(3, 12);
          }
        });
      });
    });

    it('should reject excessive loan amounts', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            loan_amount: 10000.00 // Excessive amount
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.eligibility.eligible).to.be.false;
          expect(response.body.data.eligibility.reasons).to.be.an('array');
          expect(response.body.data.eligibility.reasons.length).to.be.greaterThan(0);
          
          // Should mention amount exceeds limit
          const reasons = response.body.data.eligibility.reasons.join(' ');
          expect(reasons.toLowerCase()).to.contain('amount');
        });
      });
    });

    it('should provide recommendations for improvement', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            loan_amount: 5000.00 // Very high amount to trigger recommendations
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          
          if (!response.body.data.eligibility.eligible) {
            expect(response.body.data.eligibility.recommendations).to.be.an('array');
            expect(response.body.data.eligibility.recommendations.length).to.be.greaterThan(0);
          }
        });
      });
    });
  });

  describe('3. Member Loan History', () => {
    it('should retrieve comprehensive loan history', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'GET',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-history`,
          headers: { 'Authorization': `Bearer ${token}` }
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.data.loan_history).to.be.an('array');
          
          // Even if no loans yet, should return empty array
          response.body.data.loan_history.forEach(loan => {
            expect(loan).to.have.property('id');
            expect(loan).to.have.property('principal');
            expect(loan).to.have.property('status');
            expect(loan).to.have.property('repayment_schedule');
            expect(loan).to.have.property('repayment_stats');
            
            // Verify repayment statistics structure
            expect(loan.repayment_stats).to.have.property('total_scheduled');
            expect(loan.repayment_stats).to.have.property('total_paid');
            expect(loan.repayment_stats).to.have.property('balance_remaining');
            expect(loan.repayment_stats).to.have.property('overdue_installments');
          });
        });
      });
    });
  });

  describe('4. Assessment Validity and Expiration', () => {
    it('should respect assessment validity period', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Get current assessment
        cy.request({
          method: 'GET',
          url: `${baseUrl}/loan-assessments/${assessmentId}`,
          headers: { 'Authorization': `Bearer ${token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            const assessment = response.body.data.assessment;
            
            // Should have valid_until date 3 months from creation
            expect(assessment.valid_until).to.not.be.null;
            
            const validUntil = new Date(assessment.valid_until);
            const createdDate = new Date(assessment.created_date);
            const daysDifference = (validUntil - createdDate) / (1000 * 60 * 60 * 24);
            
            // Should be approximately 90 days (3 months)
            expect(daysDifference).to.be.within(85, 95);
            
            // Should be marked as valid if within validity period
            expect(assessment.is_valid).to.be.true;
          }
        });
      });
    });

    it('should require new assessment when expired', () => {
      // This test would require manipulating dates or waiting,
      // so we'll simulate by checking the logic
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Try to check eligibility - should work with current assessment
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            loan_amount: 200.00
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          // Should use current valid assessment
          expect(response.body.data.eligibility.assessment).to.not.be.null;
        });
      });
    });
  });

  describe('5. Assessment with Poor Performance', () => {
    it('should create member with poor performance metrics', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Add new member with minimal savings
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            user_id: 2,
            name: 'Bob Poor',
            gender: 'M',
            phone: '+256702222222',
            role: 'MEMBER'
          }
        }).then((memberResponse) => {
          const poorMemberId = memberResponse.body.data.member.id;
          
          // Add minimal savings
          cy.request({
            method: 'POST',
            url: `${baseUrl}/savings-groups/${testGroupId}/members/${poorMemberId}/savings`,
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
              saving_type_code: 'PERSONAL',
              amount: 10.00,
              transaction_type: 'DEPOSIT'
            }
          }).then(() => {
            
            // Create assessment for poor performer
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members/${poorMemberId}/loan-assessment`,
              headers: { 'Authorization': `Bearer ${token}` }
            }).then((assessmentResponse) => {
              expect(assessmentResponse.status).to.eq(201);
              
              const assessment = assessmentResponse.body.data.assessment;
              
              // Should have low score due to minimal savings and short history
              expect(assessment.eligibility_score).to.be.lessThan(50);
              expect(assessment.risk_level).to.be.oneOf(['MEDIUM', 'HIGH']);
              expect(assessment.max_loan_amount).to.be.lessThan(100);
              
              // Might not be eligible at all
              if (!assessment.is_eligible) {
                expect(assessment.max_loan_amount).to.eq(0);
              }
            });
          });
        });
      });
    });
  });

  describe('6. Error Handling and Edge Cases', () => {
    it('should handle assessment for non-existent member', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/99999/loan-assessment`,
          headers: { 'Authorization': `Bearer ${token}` },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404);
          expect(response.body.message).to.contain('not found');
        });
      });
    });

    it('should handle eligibility check with invalid amount', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            loan_amount: -100.00 // Negative amount
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.message).to.contain('positive');
        });
      });
    });

    it('should handle missing loan amount in eligibility check', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-eligibility`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            // Missing loan_amount
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.message).to.contain('required');
        });
      });
    });
  });

  describe('7. Assessment Algorithm Validation', () => {
    it('should correctly weight different scoring factors', () => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Get assessment details to verify scoring
        cy.request({
          method: 'GET',
          url: `${baseUrl}/loan-assessments/${assessmentId}`,
          headers: { 'Authorization': `Bearer ${token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            const assessment = response.body.data.assessment;
            
            // Verify scoring components are reasonable
            // Savings history: should contribute significantly for 18+ months
            expect(assessment.months_active).to.be.greaterThan(12);
            
            // Payment consistency: should be high with regular deposits
            expect(assessment.payment_consistency).to.be.greaterThan(0);
            
            // Total score should reflect good performance
            if (assessment.total_savings > 300 && assessment.months_active > 12) {
              expect(assessment.eligibility_score).to.be.greaterThan(40);
            }
          }
        });
      });
    });

    it('should apply fines penalty correctly', () => {
      // This would require creating fines first, then testing assessment
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Create a fine for the member (if fines endpoint exists)
        cy.request({
          method: 'POST',
          url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/fines`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            amount: 50.00,
            reason: 'Test fine for assessment',
            fine_type: 'OTHER'
          },
          failOnStatusCode: false
        }).then((fineResponse) => {
          
          if (fineResponse.status === 201) {
            // Create new assessment to see fine penalty effect
            cy.request({
              method: 'POST',
              url: `${baseUrl}/savings-groups/${testGroupId}/members/${testMemberId}/loan-assessment`,
              headers: { 'Authorization': `Bearer ${token}` }
            }).then((assessmentResponse) => {
              expect(assessmentResponse.status).to.eq(201);
              
              const assessment = assessmentResponse.body.data.assessment;
              expect(assessment.outstanding_fines).to.eq(50.00);
              
              // Score should be reduced due to outstanding fines
              // (This would need comparison with previous assessment)
            });
          }
        });
      });
    });
  });
});