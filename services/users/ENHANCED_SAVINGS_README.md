# Enhanced Savings Group Management System

This document describes the enhanced savings group management system with comprehensive financial tracking, loan assessment, and mobile money integration.

## Overview

The enhanced system provides industry-standard implementation for managing savings groups with the following key features:

### Core Enhancements

1. **Enhanced Group Model**
   - Required location fields: District, Parish, Village
   - Constitution document tracking
   - Registration certificate management
   - Group lifecycle states

2. **Multiple Saving Types**
   - Personal Savings (individual accounts)
   - ECD Fund (Early Childhood Development)
   - Social Fund (emergency assistance)
   - Target Savings (goal-oriented with admin-set targets)

3. **Mobile Money Integration**
   - Support for MTN, Airtel, and other providers
   - Transaction ID tracking for remote savings
   - Verification workflow for mobile transactions

4. **Meeting Attendance Tracking**
   - Regular, special, and annual meeting types
   - Attendance verification and excuse tracking
   - Participation metrics for loan assessment

5. **Fines Management**
   - Multiple fine types (late attendance, missed meetings, etc.)
   - Payment tracking and status management
   - Integration with cashbook system

6. **Comprehensive Cashbook**
   - All financial activities in one view
   - Running balances by saving type
   - Audit trail with approval workflow

7. **Automated Loan Assessment**
   - Industry-standard scoring algorithm
   - Risk-based loan limits and terms
   - Eligibility tracking with validity periods

8. **Loan Repayment Management**
   - Automated schedule generation
   - Overdue tracking with late fees
   - Payment allocation and progress monitoring

## Database Schema

### New Tables

#### `group_cashbook`
Comprehensive financial record for all group activities:
- Individual savings, ECD fund, social fund, target savings
- Fines, loans taken, loan repayments, interest earned
- Running balances and total balance tracking
- Entry types: DEPOSIT, WITHDRAWAL, LOAN, FINE, INTEREST, TRANSFER

#### `loan_assessments`
Member loan eligibility assessments:
- Savings history, attendance rate, payment consistency
- Automated scoring (0-100) with risk levels (LOW/MEDIUM/HIGH)
- Maximum loan amounts and recommended terms
- 3-month validity period with renewal tracking

#### `loan_repayment_schedule`
Detailed loan repayment tracking:
- Installment-by-installment breakdown
- Principal and interest allocation
- Payment status and overdue tracking
- Late fee calculation

#### `member_savings`
Individual member savings by type:
- Current balance and target tracking
- Target achievement monitoring
- Support for multiple saving types per member

#### `saving_transactions`
Individual saving transaction records:
- Mobile money integration fields
- Verification workflow (PENDING/VERIFIED/REJECTED)
- Balance tracking before/after transactions

#### `meeting_attendance`
Meeting participation tracking:
- Meeting types and attendance status
- Excuse reasons and participation notes
- Used for loan assessment calculations

#### `member_fines`
Fine management system:
- Fine types and amounts
- Due dates and payment tracking
- Waiver capability with reason tracking

### Enhanced Existing Tables

#### `savings_groups`
- Added required fields: `district`, `parish`, `village`
- Constitution and registration tracking
- Enhanced state management

## API Endpoints

### Cashbook Management

```http
GET /savings-groups/{id}/cashbook
```
Get cashbook entries with optional date filtering and pagination.

**Query Parameters:**
- `start_date` (YYYY-MM-DD): Filter from date
- `end_date` (YYYY-MM-DD): Filter to date
- `limit` (int): Number of entries (default: 100)
- `offset` (int): Pagination offset

```http
GET /savings-groups/{id}/financial-summary
```
Get current financial summary with balances by category.

**Query Parameters:**
- `as_of_date` (YYYY-MM-DD): Summary as of specific date

### Member Savings

```http
POST /savings-groups/{group_id}/members/{member_id}/savings
```
Record a member saving transaction.

**Request Body:**
```json
{
  "saving_type_code": "PERSONAL|ECD|SOCIAL|TARGET",
  "amount": 50.00,
  "transaction_type": "DEPOSIT|WITHDRAWAL",
  "mobile_money_transaction_id": "MTN123456789",
  "mobile_money_provider": "MTN",
  "mobile_money_phone": "+256701234567"
}
```

### Loan Assessment

```http
POST /savings-groups/{group_id}/members/{member_id}/loan-assessment
```
Create a new loan assessment for a member.

```http
POST /savings-groups/{group_id}/members/{member_id}/loan-eligibility
```
Check eligibility for a specific loan amount.

**Request Body:**
```json
{
  "loan_amount": 1000.00
}
```

```http
GET /savings-groups/{group_id}/members/{member_id}/loan-history
```
Get comprehensive loan history with repayment details.

### Loan Management

```http
POST /savings-groups/{group_id}/loans/{loan_id}/disburse
```
Disburse an approved loan and create repayment schedule.

```http
POST /savings-groups/{group_id}/loans/{loan_id}/repayment
```
Record a loan repayment.

**Request Body:**
```json
{
  "amount": 100.00,
  "installment_number": 1
}
```

### Analytics

```http
GET /savings-groups/{group_id}/analytics
```
Get comprehensive group analytics including:
- Member engagement metrics
- Financial summaries
- Loan performance statistics
- Attendance rates

## Loan Assessment Algorithm

The system uses an industry-standard scoring algorithm (0-100 points):

### Scoring Components

1. **Savings History (30 points max)**
   - 12+ months active: 30 points
   - 6-11 months: 20 points
   - 3-5 months: 10 points
   - <3 months: 0 points

2. **Attendance Rate (25 points max)**
   - Percentage of meetings attended × 0.25

3. **Payment Consistency (25 points max)**
   - (Actual payments / Expected payments) × 25

4. **Savings Amount Bonus (20 points max)**
   - ≥1000: 20 points
   - ≥500: 15 points
   - ≥200: 10 points
   - ≥100: 5 points

5. **Outstanding Fines Penalty (up to -10 points)**
   - 1 point deducted per 100 currency units in fines

### Risk Levels and Loan Terms

- **LOW Risk (70+ points)**
  - Max loan: 3× total savings
  - Term: up to 12 months
  - Interest: 15% annual

- **MEDIUM Risk (50-69 points)**
  - Max loan: 2× total savings
  - Term: up to 8 months
  - Interest: 18% annual

- **HIGH Risk (30-49 points)**
  - Max loan: 1× total savings
  - Term: up to 6 months
  - Interest: 22% annual

- **NOT ELIGIBLE (<30 points)**
  - No loan eligibility

## Mobile Money Integration

The system supports remote savings through mobile money services:

### Supported Providers
- MTN Mobile Money
- Airtel Money
- Other providers (configurable)

### Transaction Flow
1. Member sends money via mobile money
2. Member submits transaction ID through app/USSD
3. System records transaction as PENDING
4. Admin/Treasurer verifies transaction
5. Transaction status updated to VERIFIED
6. Balances updated and cashbook entry created

### Verification Process
- Manual verification by authorized users
- Transaction ID validation
- Amount confirmation
- Status tracking (PENDING → VERIFIED/REJECTED)

## Setup Instructions

### 1. Run Database Migration

```bash
cd services/users
python setup_enhanced_savings.py
```

This will:
- Create all new database tables
- Set up default saving types
- Optionally create sample data

### 2. Verify Installation

Check that the following endpoints return successful responses:

```bash
# Health check
curl -X GET http://localhost:5001/savings-groups/health

# Get saving types (should return 4 default types)
curl -X GET http://localhost:5001/saving-types
```

### 3. Create Your First Enhanced Group

```bash
curl -X POST http://localhost:5001/savings-groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Enhanced Group",
    "description": "A group with all enhanced features",
    "district": "Kampala",
    "parish": "Central",
    "village": "Nakasero",
    "country": "Uganda",
    "region": "Central",
    "target_amount": 10000.00,
    "minimum_contribution": 5.00
  }'
```

## Best Practices

### 1. Group Setup
- Always require district, parish, and village information
- Upload constitution document before group becomes active
- Set realistic target amounts and minimum contributions

### 2. Member Management
- Verify member information before adding to group
- Assign officer roles (chair, treasurer, secretary) early
- Track attendance from the first meeting

### 3. Financial Management
- Record all transactions through the cashbook system
- Verify mobile money transactions promptly
- Review financial summaries regularly

### 4. Loan Management
- Run loan assessments before considering loan applications
- Follow the automated scoring recommendations
- Create repayment schedules immediately after disbursement
- Monitor overdue payments and apply late fees consistently

### 5. Reporting and Analytics
- Use the analytics endpoint for regular group health checks
- Monitor attendance rates and member engagement
- Track loan performance and repayment rates

## Troubleshooting

### Common Issues

1. **Migration Errors**
   - Ensure database is accessible
   - Check for existing table conflicts
   - Verify user permissions

2. **Saving Type Errors**
   - Ensure default saving types are created
   - Check saving type codes match exactly
   - Verify minimum/maximum amount constraints

3. **Loan Assessment Issues**
   - Ensure member has sufficient transaction history
   - Check attendance records exist
   - Verify saving balances are up to date

4. **Mobile Money Integration**
   - Validate transaction ID format
   - Ensure provider names match exactly
   - Check verification workflow permissions

### Support

For technical support or feature requests, please refer to the main project documentation or contact the development team.

## Target Savings Campaigns

### Admin-Managed Campaigns

The system now supports admin-created target savings campaigns that can be applied to groups:

#### Campaign Types

1. **Mandatory Campaigns**
   - Admin enforces participation for all group members
   - No voting required - automatically activated
   - Non-participation penalties can be applied
   - Suitable for regulatory requirements or organizational mandates

2. **Voluntary Campaigns**
   - Requires group voting to accept or reject
   - Individual members can opt-in or opt-out
   - Democratic decision-making process
   - Configurable approval thresholds

#### Campaign Features

- **Flexible Targeting**: Set target amounts, dates, and contribution limits
- **Group Eligibility**: Filter by group state, location, or other criteria
- **Voting System**: Weighted voting with officer privileges
- **Progress Tracking**: Real-time progress monitoring for individuals and groups
- **Incentive System**: Completion bonuses and early achievement rewards
- **Penalty System**: Fines for non-participation in mandatory campaigns

#### API Endpoints

```http
POST /target-campaigns
```
Create a new target savings campaign (Admin only).

```http
GET /target-campaigns
```
Get all target savings campaigns with filtering.

```http
POST /savings-groups/{group_id}/target-campaigns/{campaign_id}/assign
```
Assign a campaign to a specific group.

```http
POST /savings-groups/{group_id}/target-campaigns/{group_campaign_id}/vote
```
Vote on a campaign (FOR/AGAINST/ABSTAIN).

```http
POST /savings-groups/{group_id}/target-campaigns/{group_campaign_id}/contribute
```
Contribute to an active target campaign.

```http
GET /savings-groups/{group_id}/target-campaigns
```
Get all campaigns for a specific group.

#### Campaign Workflow

1. **Campaign Creation**
   - Admin creates campaign with target amount, date, and rules
   - Sets mandatory/voluntary mode and eligibility criteria
   - Configures incentives and penalties

2. **Group Assignment**
   - Admin assigns campaign to specific groups or globally
   - System validates group eligibility
   - Creates member participation records

3. **Group Decision (if voluntary)**
   - Members receive notifications about new campaign
   - Voting period opens (configurable duration)
   - Members vote with optional reasons
   - System calculates weighted outcome

4. **Active Participation**
   - Approved campaigns become active for contributions
   - Members make contributions via mobile money or cash
   - System tracks individual and group progress
   - Real-time progress updates and notifications

5. **Completion and Rewards**
   - System detects target achievement
   - Calculates and awards completion bonuses
   - Applies early completion bonuses if applicable
   - Generates completion reports

#### Example Campaign Creation

```json
{
  "name": "School Fees Preparation 2025",
  "description": "Save for children's school fees for the upcoming academic year",
  "target_amount": 500.00,
  "target_date": "2025-01-15",
  "minimum_contribution": 10.00,
  "maximum_contribution": 100.00,
  "is_mandatory": false,
  "requires_group_vote": true,
  "minimum_participation_rate": 60.0,
  "completion_bonus_rate": 5.0,
  "early_completion_bonus": 2.0,
  "is_global": true,
  "eligible_group_states": "ACTIVE,MATURE,ELIGIBLE_FOR_LOAN"
}
```

#### Governance and Democracy

The system supports democratic decision-making for voluntary campaigns:

- **Weighted Voting**: Officers can have higher vote weights (e.g., 1.5x)
- **Approval Thresholds**: Configurable percentage required for approval
- **Participation Tracking**: Monitor voting participation rates
- **Reason Tracking**: Members can provide reasons for their votes
- **Automatic Closure**: Voting closes when all members vote or deadline passes

#### Analytics and Reporting

Comprehensive analytics for campaign management:

- **Campaign Performance**: Progress across all assigned groups
- **Member Engagement**: Participation rates and achievement statistics
- **Financial Impact**: Total savings generated and bonus distributions
- **Voting Analysis**: Democratic participation and outcome patterns
- **Risk Assessment**: Groups at risk of non-completion

## Future Enhancements

Planned features for future releases:
- Automated mobile money verification via API integration
- SMS notifications for transactions and reminders
- Advanced analytics and reporting dashboards
- Multi-currency support
- Integration with external banking systems
- Mobile app for member self-service
- AI-powered campaign recommendation engine
- Gamification features for increased engagement
- Integration with external payment systems
- Automated campaign scheduling and lifecycle management