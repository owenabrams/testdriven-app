# Calendar & Gender Analytics Enhancement Specification\n\n## 🎯 **Advanced Features for Savings Groups Microservice**\n\n**Date**: December 8, 2024  \n**Status**: 📋 **SPECIFICATION READY**  \n**Features**: Calendar Timeline System + Gender-Based Analytics\n\n---\n\n## 🗓️ **1. Calendar Timeline System**\n\n### **Overview**\nA comprehensive calendar system similar to Google Calendar that shows:\n- **Past Events**: What happened on specific dates (transactions, meetings, etc.)\n- **Future Events**: Scheduled activities (meetings, campaign deadlines, etc.)\n- **Interactive Details**: Click to expand full information about any activity\n\n### **Core Features**\n\n#### **Event Types**\n```javascript\nconst EVENT_TYPES = {\n  TRANSACTION: {\n    icon: '💰',\n    color: '#4CAF50',\n    types: ['savings_deposit', 'savings_withdrawal', 'loan_payment', 'fine_payment']\n  },\n  MEETING: {\n    icon: '👥', \n    color: '#2196F3',\n    types: ['regular_meeting', 'special_meeting', 'agm']\n  },\n  LOAN: {\n    icon: '🏦',\n    color: '#FF9800', \n    types: ['loan_application', 'loan_approval', 'loan_disbursement', 'repayment_due']\n  },\n  CAMPAIGN: {\n    icon: '🎯',\n    color: '#9C27B0',\n    types: ['campaign_start', 'voting_deadline', 'target_deadline']\n  },\n  FINE: {\n    icon: '⚠️',\n    color: '#F44336',\n    types: ['fine_imposed', 'fine_due', 'fine_paid']\n  },\n  MILESTONE: {\n    icon: '🏆',\n    color: '#607D8B',\n    types: ['group_anniversary', 'target_achieved', 'member_milestone']\n  }\n};\n```\n\n---\n\n## 📊 **2. Gender-Based Analytics System**\n\n### **Overview**\nComprehensive gender filtering and analytics across all activities:\n- **Savings by Gender**: How much women vs men saved\n- **Participation Rates**: Meeting attendance by gender\n- **Loan Access**: Gender distribution of loans\n- **Leadership Roles**: Gender representation in officer positions\n\n### **Analytics Categories**\n\n#### **Financial Analytics by Gender**\n```javascript\nconst GENDER_ANALYTICS = {\n  SAVINGS: {\n    total_by_gender: { women: 0, men: 0 },\n    average_by_gender: { women: 0, men: 0 },\n    fund_types: {\n      personal: { women: 0, men: 0 },\n      ecd: { women: 0, men: 0 },\n      social: { women: 0, men: 0 }\n    }\n  },\n  LOANS: {\n    applications: { women: 0, men: 0 },\n    approvals: { women: 0, men: 0 },\n    amounts: { women: 0, men: 0 },\n    repayment_rates: { women: 0, men: 0 }\n  },\n  PARTICIPATION: {\n    meeting_attendance: { women: 0, men: 0 },\n    campaign_participation: { women: 0, men: 0 },\n    officer_roles: { women: 0, men: 0 }\n  }\n};\n```\n\n---\n\n## 🔧 **API Endpoints Specification**\n\n### **Calendar Timeline Endpoints**\n\n#### **Get Calendar Events**\n```python\n# GET /api/savings-groups/calendar/events/\n# Get events for calendar view with date filtering\n@savings_groups_blueprint.route('/calendar/events/', methods=['GET'])\n@authenticate\ndef get_calendar_events():\n    \"\"\"\n    Query Parameters:\n    - start_date: YYYY-MM-DD (required)\n    - end_date: YYYY-MM-DD (required) \n    - group_id: int (optional, filter by group)\n    - event_types: comma-separated list (optional)\n    - user_id: int (optional, filter by user)\n    \n    Returns:\n    {\n      \"events\": [\n        {\n          \"id\": \"transaction_123\",\n          \"type\": \"TRANSACTION\",\n          \"subtype\": \"savings_deposit\",\n          \"date\": \"2024-12-08\",\n          \"time\": \"14:30:00\",\n          \"title\": \"Sarah Nakato - Personal Savings\",\n          \"amount\": 50000,\n          \"currency\": \"UGX\",\n          \"member\": {\n            \"id\": 1,\n            \"name\": \"Sarah Nakato\",\n            \"gender\": \"F\",\n            \"role\": \"CHAIR\"\n          },\n          \"group\": {\n            \"id\": 1,\n            \"name\": \"Kampala Women's Cooperative\"\n          },\n          \"status\": \"completed\",\n          \"details\": {\n            \"payment_method\": \"MTN Mobile Money\",\n            \"verified_by\": \"Mary Nambi\",\n            \"verification_time\": \"2024-12-08T14:45:00Z\"\n          }\n        }\n      ],\n      \"summary\": {\n        \"total_events\": 45,\n        \"by_type\": {\n          \"TRANSACTION\": 20,\n          \"MEETING\": 8,\n          \"LOAN\": 12,\n          \"CAMPAIGN\": 3,\n          \"FINE\": 2\n        }\n      }\n    }\n    \"\"\"\n    pass\n```"#
### **Get Event Details**
```python
# GET /api/savings-groups/calendar/events/<event_id>/
# Get detailed information about a specific event
@savings_groups_blueprint.route('/calendar/events/<event_id>/', methods=['GET'])
@authenticate
def get_event_details(event_id):
    """
    Returns comprehensive details about a specific event
    including related activities, participants, and outcomes
    """
    pass

# GET /api/savings-groups/calendar/upcoming/
# Get upcoming scheduled events
@savings_groups_blueprint.route('/calendar/upcoming/', methods=['GET'])
@authenticate
def get_upcoming_events():
    """
    Query Parameters:
    - days_ahead: int (default 30)
    - group_id: int (optional)
    - event_types: comma-separated list (optional)
    
    Returns upcoming events with scheduling details
    """
    pass
```

### **Gender Analytics Endpoints**

#### **Gender-Based Financial Analytics**
```python
# GET /api/savings-groups/analytics/gender/financial/
# Get financial analytics broken down by gender
@savings_groups_blueprint.route('/analytics/gender/financial/', methods=['GET'])
@authenticate
def get_gender_financial_analytics():
    """
    Query Parameters:
    - start_date: YYYY-MM-DD (optional)
    - end_date: YYYY-MM-DD (optional)
    - group_id: int (optional)
    - metric: savings|loans|fines (optional)
    
    Returns:
    {
      "period": {
        "start_date": "2024-01-01",
        "end_date": "2024-12-08"
      },
      "savings": {
        "total": {
          "women": 1650000,
          "men": 375000,
          "percentage": {"women": 81.5, "men": 18.5}
        },
        "average": {
          "women": 412500,
          "men": 187500
        },
        "by_fund_type": {
          "personal": {"women": 1400000, "men": 400000},
          "ecd": {"women": 150000, "men": 0},
          "social": {"women": 75000, "men": 0}
        },
        "trends": {
          "monthly": [
            {"month": "2024-01", "women": 120000, "men": 30000},
            {"month": "2024-02", "women": 135000, "men": 32000}
          ]
        }
      },
      "loans": {
        "applications": {"women": 8, "men": 2},
        "approvals": {"women": 6, "men": 2},
        "total_amount": {"women": 800000, "men": 200000},
        "average_amount": {"women": 133333, "men": 100000},
        "repayment_rate": {"women": 95.2, "men": 88.5}
      }
    }
    """
    pass

# GET /api/savings-groups/analytics/gender/participation/
# Get participation analytics by gender
@savings_groups_blueprint.route('/analytics/gender/participation/', methods=['GET'])
@authenticate
def get_gender_participation_analytics():
    """
    Returns meeting attendance, campaign participation,
    and leadership representation by gender
    """
    pass

# GET /api/savings-groups/analytics/gender/comparison/
# Get comparative gender analytics across groups
@savings_groups_blueprint.route('/analytics/gender/comparison/', methods=['GET'])
@authenticate
@admin_required
def get_gender_comparison_analytics():
    """
    Compare gender metrics across different groups
    for system-wide analysis
    """
    pass
```

---

## 🎨 **Frontend Components Specification**

### **Calendar Component**

#### **Calendar View Component**
```javascript
// client/src/components/Calendar/SavingsCalendar.js
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

const SavingsCalendar = ({ groupId, userRole }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState('month');
  const [filters, setFilters] = useState({
    eventTypes: ['TRANSACTION', 'MEETING', 'LOAN'],
    dateRange: { start: null, end: null }
  });

  // Event styling based on type
  const eventStyleGetter = (event) => {
    const eventType = EVENT_TYPES[event.type];
    return {
      style: {
        backgroundColor: eventType.color,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div className="savings-calendar">
      <CalendarFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        userRole={userRole}
      />
      
      <Calendar
        localizer={momentLocalizer(moment)}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        onSelectEvent={handleEventSelect}
        eventPropGetter={eventStyleGetter}
        view={view}
        onView={setView}
        views={['month', 'week', 'day', 'agenda']}
      />
      
      <EventDetailsModal 
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};
```

#### **Event Details Modal**
```javascript
// client/src/components/Calendar/EventDetailsModal.js
const EventDetailsModal = ({ event, open, onClose }) => {
  if (!event) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <span>{EVENT_TYPES[event.type].icon}</span>
          <Typography variant="h6">{event.title}</Typography>
          <Chip 
            label={event.status} 
            color={event.status === 'completed' ? 'success' : 'warning'}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Date & Time</Typography>
            <Typography>{moment(event.date).format('MMMM Do, YYYY')}</Typography>
            <Typography>{event.time}</Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Participant</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {event.member.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography>{event.member.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {event.member.role} • {event.member.gender === 'F' ? 'Female' : 'Male'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {event.amount && (
            <Grid item xs={12}>
              <Typography variant="subtitle2">Amount</Typography>
              <Typography variant="h6" color="primary">
                {event.currency} {event.amount.toLocaleString()}
              </Typography>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Typography variant="subtitle2">Details</Typography>
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
              {JSON.stringify(event.details, null, 2)}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {event.status === 'pending' && (
          <Button variant="contained" color="primary">
            Take Action
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
```

### **Gender Analytics Dashboard**

#### **Gender Analytics Component**
```javascript
// client/src/components/Analytics/GenderAnalytics.js
const GenderAnalytics = ({ groupId, dateRange }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('savings');
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Gender-Based Analytics
      </Typography>
      
      <Tabs value={selectedMetric} onChange={(e, v) => setSelectedMetric(v)}>
        <Tab label="Savings" value="savings" />
        <Tab label="Loans" value="loans" />
        <Tab label="Participation" value="participation" />
        <Tab label="Leadership" value="leadership" />
      </Tabs>
      
      <Box sx={{ mt: 3 }}>
        {selectedMetric === 'savings' && (
          <SavingsGenderChart data={analyticsData?.savings} />
        )}
        {selectedMetric === 'loans' && (
          <LoansGenderChart data={analyticsData?.loans} />
        )}
        {selectedMetric === 'participation' && (
          <ParticipationGenderChart data={analyticsData?.participation} />
        )}
        {selectedMetric === 'leadership' && (
          <LeadershipGenderChart data={analyticsData?.leadership} />
        )}
      </Box>
    </Box>
  );
};
```

---

## 💾 **Database Schema Enhancements**

### **Calendar Events Table**
```python
# New model for calendar event aggregation
class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.String(50), primary_key=True)  # e.g., "transaction_123"
    event_type = db.Column(db.Enum('TRANSACTION', 'MEETING', 'LOAN', 'CAMPAIGN', 'FINE', 'MILESTONE'))
    event_subtype = db.Column(db.String(50))  # e.g., "savings_deposit"
    
    date = db.Column(db.Date, nullable=False, index=True)
    time = db.Column(db.Time)
    
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # References
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Event-specific data (JSON)
    event_data = db.Column(db.JSON)
    
    # Status
    status = db.Column(db.Enum('scheduled', 'completed', 'cancelled', 'pending'))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### **Gender Analytics Cache Table**
```python
# Cache table for gender analytics to improve performance
class GenderAnalyticsCache(db.Model):
    __tablename__ = 'gender_analytics_cache'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Scope
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), index=True)
    metric_type = db.Column(db.String(50), index=True)  # 'savings', 'loans', 'participation'
    date_period = db.Column(db.String(20), index=True)  # 'daily', 'weekly', 'monthly', 'yearly'
    period_start = db.Column(db.Date, index=True)
    period_end = db.Column(db.Date, index=True)
    
    # Analytics data (JSON)
    analytics_data = db.Column(db.JSON)
    
    # Cache metadata
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, index=True)
```

---

## 🔄 **Data Processing & Aggregation**

### **Calendar Event Aggregation**
```python
# Background task to aggregate events for calendar
@celery.task
def aggregate_calendar_events(group_id=None, date_range=None):
    """
    Aggregate all activities into calendar events
    """
    events = []
    
    # Aggregate transactions
    transactions = SavingTransaction.query
    if group_id:
        transactions = transactions.join(MemberSaving).join(GroupMember).filter(
            GroupMember.group_id == group_id
        )
    
    for transaction in transactions:
        event = CalendarEvent(
            id=f"transaction_{transaction.id}",
            event_type='TRANSACTION',
            event_subtype=f"{transaction.saving_type.code.lower()}_deposit",
            date=transaction.transaction_date.date(),
            time=transaction.transaction_date.time(),
            title=f"{transaction.member.user.username} - {transaction.saving_type.name}",
            group_id=transaction.member.group_id,
            user_id=transaction.member.user_id,
            event_data={
                'amount': float(transaction.amount),
                'currency': 'UGX',
                'payment_method': transaction.mobile_money_provider or 'Cash',
                'verified_by': transaction.verified_by_user.username if transaction.verified_by_user else None
            },
            status='completed'
        )
        events.append(event)
    
    # Aggregate meetings
    meetings = MeetingAttendance.query
    # ... similar aggregation for meetings, loans, etc.
    
    # Bulk insert events
    db.session.bulk_save_objects(events)
    db.session.commit()

# Gender analytics calculation
@celery.task
def calculate_gender_analytics(group_id=None, period='monthly'):
    """
    Calculate and cache gender-based analytics
    """
    # Calculate savings by gender
    savings_query = db.session.query(
        User.gender,
        SavingType.code,
        func.sum(MemberSaving.current_balance).label('total'),
        func.avg(MemberSaving.current_balance).label('average'),
        func.count(MemberSaving.id).label('count')
    ).join(GroupMember, User.id == GroupMember.user_id)\
     .join(MemberSaving, GroupMember.id == MemberSaving.member_id)\
     .join(SavingType, MemberSaving.saving_type_id == SavingType.id)
    
    if group_id:
        savings_query = savings_query.filter(GroupMember.group_id == group_id)
    
    savings_data = savings_query.group_by(User.gender, SavingType.code).all()
    
    # Process and cache results
    analytics = {
        'savings': process_savings_gender_data(savings_data),
        'loans': calculate_loans_gender_data(group_id),
        'participation': calculate_participation_gender_data(group_id)
    }
    
    # Cache the results
    cache_entry = GenderAnalyticsCache(
        group_id=group_id,
        metric_type='comprehensive',
        date_period=period,
        period_start=datetime.now().replace(day=1).date(),
        period_end=datetime.now().date(),
        analytics_data=analytics,
        expires_at=datetime.now() + timedelta(hours=6)  # Cache for 6 hours
    )
    
    db.session.add(cache_entry)
    db.session.commit()
```

---

## 🎯 **Implementation Priority**

### **Phase 1: Calendar System (Weeks 1-2)**
1. **Calendar Events API** - Basic event aggregation and retrieval
2. **Frontend Calendar Component** - React Big Calendar integration
3. **Event Details Modal** - Expandable event information
4. **Basic Filtering** - Date range and event type filters

### **Phase 2: Gender Analytics (Weeks 3-4)**
1. **Gender Analytics API** - Financial and participation metrics
2. **Analytics Dashboard** - Charts and visualizations
3. **Filtering System** - Gender-based filtering across all views
4. **Comparative Analytics** - Cross-group gender comparisons

### **Phase 3: Advanced Features (Weeks 5-6)**
1. **Real-time Updates** - Live calendar updates
2. **Advanced Filtering** - Complex multi-criteria filtering
3. **Export Functionality** - Calendar and analytics export
4. **Mobile Optimization** - Responsive calendar and analytics

---

## ✅ **Expected Outcomes**

### **Calendar System Benefits**
- **Complete Activity Tracking**: See everything that happened on any date
- **Future Planning**: Visualize upcoming meetings, deadlines, campaigns
- **Historical Analysis**: Understand patterns and trends over time
- **User Engagement**: Interactive, intuitive way to explore group activities

### **Gender Analytics Benefits**
- **Gender Equity Insights**: Understand participation gaps and opportunities
- **Targeted Interventions**: Data-driven approaches to improve inclusion
- **Impact Measurement**: Track progress on gender equality goals
- **Compliance Reporting**: Generate gender-disaggregated reports for stakeholders

**This enhancement will transform the savings platform into a comprehensive activity tracking and gender-inclusive analytics system!**