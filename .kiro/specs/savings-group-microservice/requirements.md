`# Requirements Document

## Introduction

The Savings-Group Microservice enables microfinance lenders to issue loans to savings groups (not just individuals) to boost group liquidity and allow members to take more business loans. This follows the VisionFund-style "savings group loans" model where loans go to groups to increase liquidity in the group savings box. The system tracks group lifecycle state, enforces governance rules, and provides transparency and analytics for implementers.

## Enhanced Features (Version 2.0)

The system has been enhanced with comprehensive financial management capabilities including:

- **Enhanced Group Management**: Required location fields (District, Parish, Village), constitution tracking, and registration certificate management
- **Multiple Saving Types**: Personal savings, ECD Fund, Social Fund, and Target savings with configurable parameters
- **Mobile Money Integration**: Support for MTN, Airtel, and other providers with transaction ID tracking and verification workflow
- **Meeting Attendance Tracking**: Regular, special, and annual meeting types with participation metrics for loan assessment
- **Fines Management**: Multiple fine types with payment tracking and integration with cashbook system
- **Comprehensive Cashbook**: All financial activities tracked with running balances by category and audit trail
- **Automated Loan Assessment**: Industry-standard scoring algorithm with risk-based loan limits and terms
- **Loan Repayment Management**: Automated schedule generation with overdue tracking and late fee calculation

## Requirements

### Requirement 1

**User Story:** As a microfinance officer, I want to create and manage savings groups, so that I can facilitate group-based lending to increase community liquidity.

#### Acceptance Criteria

1. WHEN creating a group THEN the system SHALL require group name, district, parish, village, country/region, formation date, and initial officers (chair, treasurer, secretary)
2. WHEN a group is created THEN the system SHALL initialize it in FORMING state with zero savings balance
3. WHEN adding members THEN the system SHALL enforce maximum of 30 members per group
4. WHEN officers are assigned THEN the system SHALL validate that they are existing group members
5. WHEN constitution is uploaded THEN the system SHALL store document URL and track constitution status
6. WHEN registration certificate is uploaded THEN the system SHALL mark group as registered and store certificate URL
7. IF a group reaches maturity criteria THEN the system SHALL automatically transition state to ELIGIBLE_FOR_LOAN

### Requirement 2

**User Story:** As a group member, I want to make savings contributions to my group, so that we can build our collective savings box and become eligible for group loans.

#### Acceptance Criteria

1. WHEN recording a contribution THEN the system SHALL update both member share_balance and group savings_balance
2. WHEN a transaction is recorded THEN the system SHALL create an audit trail with ledger_balance_after
3. WHEN using idempotency keys THEN the system SHALL prevent duplicate transactions from being processed
4. WHEN contributions are made THEN the system SHALL emit transaction.recorded events for downstream systems
5. IF transaction validation fails THEN the system SHALL return appropriate error messages without updating balances

### Requirement 3

**User Story:** As a group officer, I want to request loans for my mature savings group, so that we can increase liquidity for member business activities.

#### Acceptance Criteria

1. WHEN requesting a loan THEN the system SHALL validate group state is MATURE or ELIGIBLE_FOR_LOAN
2. WHEN calculating loan limits THEN the system SHALL enforce maximum of 3× monthly average contributions or configurable percentage of savings box
3. WHEN a loan is requested THEN the system SHALL require principal amount, term in months, interest rate, and purpose
4. WHEN loan requests are submitted THEN the system SHALL emit loan.requested events
5. IF group is not mature THEN the system SHALL reject loan request with maturity requirements

### Requirement 4

**User Story:** As a microfinance officer, I want to approve and disburse group loans, so that I can provide capital to eligible savings groups.

#### Acceptance Criteria

1. WHEN approving loans THEN the system SHALL require officer consent with approver ID, role, and timestamp
2. WHEN loans are approved THEN the system SHALL update status to APPROVED and emit loan.approved events
3. WHEN disbursing loans THEN the system SHALL update group state to LOAN_ACTIVE and create LOAN_DISBURSEMENT transaction
4. WHEN disbursement occurs THEN the system SHALL emit loan.disbursed events with loan ID and amount
5. IF loan approval lacks proper officer consent THEN the system SHALL reject the approval request

### Requirement 5

**User Story:** As a group member, I want to make loan repayments, so that my group can maintain good standing and access future loans.

#### Acceptance Criteria

1. WHEN recording repayments THEN the system SHALL reduce outstanding_balance and create LOAN_REPAYMENT transaction
2. WHEN full repayment is made THEN the system SHALL update loan status to CLOSED and group state back to ELIGIBLE_FOR_LOAN
3. WHEN repayments are late THEN the system SHALL flag loans as overdue after configurable grace period
4. WHEN repayments are recorded THEN the system SHALL emit loan.repayment events
5. IF repayment amount exceeds outstanding balance THEN the system SHALL only accept the exact remaining amount

### Requirement 6

**User Story:** As a microfinance manager, I want portfolio reporting and analytics, so that I can monitor loan performance and member demographics.

#### Acceptance Criteria

1. WHEN accessing portfolio reports THEN the system SHALL display total groups, active loans, outstanding principal, and overdue loans
2. WHEN generating analytics THEN the system SHALL calculate percentage of women members across all groups
3. WHEN viewing group details THEN the system SHALL show complete transaction history and member activity
4. WHEN reports are requested THEN the system SHALL provide real-time data aggregation
5. IF default rates exceed thresholds THEN the system SHALL trigger alerts for manual review

### Requirement 7

**User Story:** As a system administrator, I want comprehensive audit trails and event tracking, so that I can ensure compliance and investigate issues.

#### Acceptance Criteria

1. WHEN any data changes occur THEN the system SHALL create audit log entries with user ID, timestamp, and change details
2. WHEN critical events happen THEN the system SHALL publish events to message bus (Kafka/SQS) for downstream consumption
3. WHEN investigating issues THEN the system SHALL provide complete transaction and state change history
4. WHEN events are published THEN the system SHALL include minimal payload with IDs for listeners to fetch details
5. IF audit trail integrity is compromised THEN the system SHALL alert administrators immediately

### Requirement 8

**User Story:** As a developer, I want well-defined REST APIs and event schemas, so that I can integrate with external systems and build client applications.

#### Acceptance Criteria

1. WHEN calling REST endpoints THEN the system SHALL follow OpenAPI 3.0 specification with proper request/response schemas
2. WHEN authentication is required THEN the system SHALL implement RBAC with TLS encryption for all traffic
3. WHEN rate limits are exceeded THEN the system SHALL return HTTP 429 with retry-after headers
4. WHEN events are published THEN the system SHALL use consistent schema registry for event payload validation
5. IF API requests are malformed THEN the system SHALL return detailed validation error messages

### Requirement 9

**User Story:** As an operations engineer, I want comprehensive observability and monitoring, so that I can ensure system reliability and performance.

#### Acceptance Criteria

1. WHEN system is running THEN the system SHALL maintain 99.9% API availability with graceful degradation for read operations
2. WHEN processing requests THEN the system SHALL achieve p95 latency under 300ms and error rate below 0.5%
3. WHEN monitoring performance THEN the system SHALL expose Prometheus metrics for requests, errors, and loan overdue rates
4. WHEN issues occur THEN the system SHALL generate structured logs with distributed tracing capabilities
5. IF SLO thresholds are breached THEN the system SHALL trigger alerts with appropriate escalation procedures

### Requirement 10 (Enhanced)

**User Story:** As a group member, I want to save money remotely using mobile money services, so that I can contribute to my group even when I cannot attend meetings.

#### Acceptance Criteria

1. WHEN making mobile money savings THEN the system SHALL accept transaction ID, provider, and phone number
2. WHEN mobile transactions are submitted THEN the system SHALL create PENDING transactions awaiting verification
3. WHEN officers verify transactions THEN the system SHALL update status to VERIFIED and update balances
4. WHEN saving to different types THEN the system SHALL support Personal, ECD Fund, Social Fund, and Target savings
5. WHEN target savings are made THEN the system SHALL track progress towards member-specific or admin-set targets
6. IF mobile money verification fails THEN the system SHALL mark transaction as REJECTED with reason

### Requirement 11 (Enhanced)

**User Story:** As a group treasurer, I want to track all financial activities in a comprehensive cashbook, so that I can maintain accurate records and provide transparency to members.

#### Acceptance Criteria

1. WHEN any financial transaction occurs THEN the system SHALL create cashbook entry with running balances
2. WHEN viewing cashbook THEN the system SHALL display individual savings, ECD fund, social fund, target savings, fines, loans, and repayments
3. WHEN calculating balances THEN the system SHALL maintain separate running totals for each saving type
4. WHEN transactions are recorded THEN the system SHALL require approval workflow for significant amounts
5. WHEN generating reports THEN the system SHALL provide date-filtered cashbook views with pagination
6. IF balance calculations are inconsistent THEN the system SHALL flag discrepancies for manual review

### Requirement 12 (Enhanced)

**User Story:** As a group secretary, I want to track member attendance at meetings, so that I can monitor engagement and use attendance data for loan assessments.

#### Acceptance Criteria

1. WHEN recording attendance THEN the system SHALL support regular, special, and annual meeting types
2. WHEN members are absent THEN the system SHALL allow recording excuse reasons and follow-up actions
3. WHEN calculating attendance rates THEN the system SHALL compute percentages over configurable time periods
4. WHEN assessing loan eligibility THEN the system SHALL use attendance rate as a scoring factor
5. WHEN meetings are held THEN the system SHALL allow bulk attendance recording for efficiency
6. IF attendance patterns indicate disengagement THEN the system SHALL flag members for intervention

### Requirement 13 (Enhanced)

**User Story:** As a group officer, I want to impose and track fines for rule violations, so that I can maintain group discipline and collect additional funds.

#### Acceptance Criteria

1. WHEN imposing fines THEN the system SHALL support multiple fine types (late attendance, missed meetings, late payments, other)
2. WHEN fines are created THEN the system SHALL set due dates and track payment status
3. WHEN fines are paid THEN the system SHALL update cashbook and member fine status
4. WHEN fines are overdue THEN the system SHALL flag them for follow-up action
5. WHEN officers waive fines THEN the system SHALL require reason and maintain audit trail
6. IF fine amounts exceed thresholds THEN the system SHALL require additional approval

### Requirement 14 (Enhanced)

**User Story:** As a loan officer, I want automated loan assessment based on member behavior, so that I can make data-driven lending decisions with consistent criteria.

#### Acceptance Criteria

1. WHEN assessing loan eligibility THEN the system SHALL calculate scores based on savings history, attendance, and payment consistency
2. WHEN scoring members THEN the system SHALL use industry-standard algorithm with configurable weights
3. WHEN determining loan limits THEN the system SHALL apply risk-based multipliers (1x to 3x savings for HIGH to LOW risk)
4. WHEN setting loan terms THEN the system SHALL recommend interest rates and repayment periods based on risk level
5. WHEN assessments expire THEN the system SHALL require new assessment after 3 months
6. IF member scores change significantly THEN the system SHALL trigger reassessment notifications

### Requirement 15 (Enhanced)

**User Story:** As a borrower, I want detailed loan repayment schedules with overdue tracking, so that I can plan my payments and avoid penalties.

#### Acceptance Criteria

1. WHEN loans are disbursed THEN the system SHALL generate detailed repayment schedules with principal and interest breakdown
2. WHEN payments are due THEN the system SHALL track due dates and calculate overdue amounts
3. WHEN payments are late THEN the system SHALL apply configurable late fees and update overdue status
4. WHEN partial payments are made THEN the system SHALL allocate amounts to specific installments
5. WHEN schedules are viewed THEN the system SHALL show payment history and remaining balance
6. IF payments are significantly overdue THEN the system SHALL escalate to collection workflow

### Requirement 16 (Enhanced)

**User Story:** As a program manager, I want comprehensive analytics and reporting, so that I can monitor program performance and make strategic decisions.

#### Acceptance Criteria

1. WHEN viewing analytics THEN the system SHALL provide group-level and portfolio-level dashboards
2. WHEN analyzing performance THEN the system SHALL calculate loan repayment rates, member engagement metrics, and financial growth
3. WHEN generating reports THEN the system SHALL support date filtering, export capabilities, and scheduled delivery
4. WHEN monitoring trends THEN the system SHALL identify groups at risk and high-performing groups
5. WHEN comparing groups THEN the system SHALL provide benchmarking metrics and best practice identification
6. IF performance indicators decline THEN the system SHALL generate alerts with recommended interventions

### Requirement 17 (New - Target Savings Campaigns)

**User Story:** As a program administrator, I want to create target savings campaigns and apply them to groups, so that I can drive specific savings behaviors and achieve program objectives.

#### Acceptance Criteria

1. WHEN creating target campaigns THEN the system SHALL require campaign name, description, target amount, target date, and participation rules
2. WHEN configuring campaigns THEN the system SHALL support both mandatory and voluntary participation modes
3. WHEN campaigns require group decision THEN the system SHALL provide voting mechanism with configurable approval thresholds
4. WHEN assigning campaigns to groups THEN the system SHALL validate group eligibility based on state and other criteria
5. WHEN campaigns are mandatory THEN the system SHALL automatically enroll all eligible group members
6. WHEN campaigns are voluntary THEN the system SHALL allow individual member opt-in/opt-out with reason tracking
7. IF group votes against voluntary campaign THEN the system SHALL mark campaign as rejected for that group

### Requirement 18 (New - Campaign Governance)

**User Story:** As a group member, I want to participate in democratic decision-making about target savings campaigns, so that our group can collectively decide on financial commitments.

#### Acceptance Criteria

1. WHEN campaigns are proposed THEN the system SHALL notify all active group members
2. WHEN voting is open THEN the system SHALL allow members to vote FOR, AGAINST, or ABSTAIN with optional reasons
3. WHEN officers vote THEN the system SHALL apply configurable vote weighting (e.g., 1.5x for officers)
4. WHEN voting deadline is reached THEN the system SHALL automatically close voting and determine outcome
5. WHEN campaign is approved THEN the system SHALL activate participation for members who voted FOR
6. WHEN campaign is rejected THEN the system SHALL notify members and mark campaign as inactive
7. IF minimum participation threshold is not met THEN the system SHALL reject the campaign automatically

### Requirement 19 (New - Campaign Progress Tracking)

**User Story:** As a group member, I want to track my progress and my group's progress toward target savings goals, so that I can stay motivated and adjust my contributions.

#### Acceptance Criteria

1. WHEN making contributions THEN the system SHALL update individual and group progress percentages
2. WHEN viewing campaign status THEN the system SHALL display current savings, target amount, time remaining, and participation rate
3. WHEN members achieve personal targets THEN the system SHALL mark achievement and calculate any bonuses earned
4. WHEN group achieves campaign target THEN the system SHALL mark campaign as completed and trigger completion bonuses
5. WHEN campaigns have early completion bonuses THEN the system SHALL calculate and award additional incentives
6. WHEN members don't participate in mandatory campaigns THEN the system SHALL apply configured penalties
7. IF campaign deadline passes without completion THEN the system SHALL mark campaign as expired and generate reports

### Requirement 20 (New - Campaign Administration)

**User Story:** As a system administrator, I want to manage target savings campaigns across multiple groups, so that I can implement organization-wide savings initiatives effectively.

#### Acceptance Criteria

1. WHEN creating global campaigns THEN the system SHALL make campaigns available to all eligible groups automatically
2. WHEN setting eligibility criteria THEN the system SHALL filter groups by state, location, size, or other attributes
3. WHEN campaigns are active THEN the system SHALL provide real-time progress monitoring across all participating groups
4. WHEN campaigns complete THEN the system SHALL generate comprehensive reports with participation rates and outcomes
5. WHEN managing incentives THEN the system SHALL support completion bonuses, early achievement rewards, and non-participation penalties
6. WHEN campaigns need modification THEN the system SHALL allow updates to active campaigns with member notification
7. IF campaigns need cancellation THEN the system SHALL provide graceful termination with appropriate member communications

### Requirement 21 (New - Admin Member Management CRUD)

**User Story:** As a system administrator or group officer, I want comprehensive CRUD capabilities for member management, so that I can provide support when members cannot access their accounts or need assistance with transactions.

#### Acceptance Criteria

1. WHEN viewing member details THEN the system SHALL display complete member profile, savings history, loan assessments, and attendance records
2. WHEN members cannot access their accounts THEN the system SHALL allow admins to update member information including contact details and personal data
3. WHEN members need remote savings support THEN the system SHALL allow admins to record savings transactions on behalf of members with proper audit trails
4. WHEN mobile money transactions need verification THEN the system SHALL allow admins to verify, reject, or modify transaction status with reason codes
5. WHEN balance corrections are needed THEN the system SHALL allow admins to adjust member balances with mandatory justification and approval workflow
6. WHEN members need to be removed THEN the system SHALL allow admins to deactivate members while preserving historical data and financial records
7. IF admin actions affect financial balances THEN the system SHALL require additional authorization and create detailed audit logs

### Requirement 22 (New - Admin Financial Support)

**User Story:** As a system administrator, I want to assist members with financial operations and corrections, so that I can resolve issues and maintain accurate financial records.

#### Acceptance Criteria

1. WHEN members report transaction issues THEN the system SHALL allow admins to view complete transaction history with mobile money details
2. WHEN mobile money payments fail verification THEN the system SHALL allow admins to manually verify transactions with supporting documentation
3. WHEN balance discrepancies occur THEN the system SHALL allow admins to perform reconciliation with detailed change tracking
4. WHEN members need emergency savings THEN the system SHALL allow admins to process urgent transactions outside normal workflows
5. WHEN generating member reports THEN the system SHALL provide comprehensive financial summaries for member review and support
6. WHEN correcting errors THEN the system SHALL maintain complete audit trails showing original values, changes made, and authorization details
7. IF financial corrections exceed thresholds THEN the system SHALL require multi-level approval and additional documentation

### Requirement 23 (New - Admin Group Oversight)

**User Story:** As a system administrator, I want comprehensive oversight of all groups and their operations, so that I can ensure compliance, provide support, and maintain system integrity.

#### Acceptance Criteria

1. WHEN monitoring groups THEN the system SHALL provide dashboard view of all groups with key metrics and status indicators
2. WHEN groups need intervention THEN the system SHALL allow admins to modify group settings, officer assignments, and operational parameters
3. WHEN compliance issues arise THEN the system SHALL allow admins to access and update constitution documents and registration certificates
4. WHEN groups request support THEN the system SHALL provide admins with complete group financial history and member activity logs
5. WHEN investigating issues THEN the system SHALL allow admins to generate detailed audit reports for specific groups or time periods
6. WHEN groups violate policies THEN the system SHALL allow admins to impose restrictions or suspend group operations with proper documentation
7. IF system-wide issues are detected THEN the system SHALL provide admins with tools to perform bulk corrections and notifications

### Requirement 24 (New - Comprehensive Multi-Dimensional Filtering)

**User Story:** As a user (basic user or service administrator), I want to filter and view savings group activities using multiple criteria including geographic, demographic, financial, and temporal dimensions, so that I can analyze specific patterns and make informed decisions.

#### Acceptance Criteria

1. WHEN filtering by geography THEN the system SHALL support filtering by region, district, parish, and village with cascading selection
2. WHEN filtering by demographics THEN the system SHALL support filtering by gender, member roles, and membership duration
3. WHEN filtering by financial criteria THEN the system SHALL support filtering by fund types (Personal, ECD, Social, Target), loan amount ranges, and transaction amount ranges
4. WHEN filtering by time periods THEN the system SHALL support filtering by specific day, week, month, or custom date ranges
5. WHEN combining multiple filters THEN the system SHALL apply all selected criteria simultaneously (e.g., "all women who saved in ECD fund in Central region during December 2024")
6. WHEN viewing filtered results THEN the system SHALL display results in calendar view with clickable events showing detailed information
7. WHEN clicking on calendar events THEN the system SHALL open detailed modal or page showing complete transaction/activity information
8. IF no results match the filter criteria THEN the system SHALL display appropriate empty state message with suggestions to modify filters

### Requirement 25 (New - Advanced Calendar Integration with Filtering)

**User Story:** As a user, I want to see filtered activities displayed on an interactive calendar with detailed drill-down capabilities, so that I can visualize patterns over time and access specific transaction details.

#### Acceptance Criteria

1. WHEN viewing calendar with filters applied THEN the system SHALL display events as colored indicators based on activity type (transactions, meetings, loans, fines)
2. WHEN hovering over calendar events THEN the system SHALL show preview tooltip with basic information (amount, member name, activity type)
3. WHEN clicking on calendar events THEN the system SHALL open detailed view showing complete information including member details, amounts, verification status, and related documents
4. WHEN switching between day/week/month views THEN the system SHALL maintain applied filters and adjust event density appropriately
5. WHEN events overlap on same day THEN the system SHALL stack or group events with count indicator and expandable list
6. WHEN navigating calendar dates THEN the system SHALL preserve filter settings and update results dynamically
7. WHEN exporting calendar data THEN the system SHALL include filtered results with all applied criteria in export metadata
8. IF calendar performance degrades with large datasets THEN the system SHALL implement pagination or lazy loading for optimal user experience

### Requirement 26 (New - Filter Persistence and Presets)

**User Story:** As a frequent user of the filtering system, I want to save commonly used filter combinations and have my filter preferences remembered, so that I can quickly access frequently needed views.

#### Acceptance Criteria

1. WHEN applying multiple filters THEN the system SHALL allow users to save filter combinations as named presets
2. WHEN saving filter presets THEN the system SHALL store all filter criteria including geographic, demographic, financial, and temporal settings
3. WHEN loading saved presets THEN the system SHALL restore all filter settings and immediately apply them to current view
4. WHEN sharing filter presets THEN the system SHALL allow users to share preset configurations with other authorized users
5. WHEN navigating away from filtered views THEN the system SHALL remember last applied filters for session continuity
6. WHEN users have role-based access THEN the system SHALL only show filter options and presets appropriate to their permission level
7. WHEN managing presets THEN the system SHALL allow users to edit, delete, and organize their saved filter combinations
8. IF preset configurations become invalid THEN the system SHALL notify users and suggest corrections or updates