# services/users/project/api/calendar.py

from flask import Blueprint, jsonify, request
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, date, timedelta
from decimal import Decimal

from project import db
from project.api.models import (
    CalendarEvent, SavingsGroup, GroupMember, SavingTransaction, 
    MemberSaving, SavingType, User
)
from project.api.utils import authenticate, admin_required

calendar_blueprint = Blueprint('calendar', __name__)


class FilterProcessor:
    """Process and apply multiple filter criteria to calendar events"""
    
    def __init__(self, args):
        self.args = args
        self.applied_filters = []
    
    def apply_all(self, query):
        """Apply all filter criteria to the query"""
        query = self.apply_date_filters(query)
        query = self.apply_geographic_filters(query)
        query = self.apply_demographic_filters(query)
        query = self.apply_financial_filters(query)
        query = self.apply_activity_filters(query)
        query = self.apply_group_filters(query)
        return query
    
    def apply_date_filters(self, query):
        """Apply date-based filtering (day, week, month, custom range)"""
        # Custom date range
        if self.args.get('start_date'):
            try:
                start_date = datetime.strptime(self.args.get('start_date'), '%Y-%m-%d').date()
                query = query.filter(CalendarEvent.event_date >= start_date)
                self.applied_filters.append(f"Start Date: {start_date}")
            except ValueError:
                pass
        
        if self.args.get('end_date'):
            try:
                end_date = datetime.strptime(self.args.get('end_date'), '%Y-%m-%d').date()
                query = query.filter(CalendarEvent.event_date <= end_date)
                self.applied_filters.append(f"End Date: {end_date}")
            except ValueError:
                pass
        
        # Predefined time periods
        time_period = self.args.get('time_period')
        if time_period:
            today = date.today()
            
            if time_period == 'today':
                query = query.filter(CalendarEvent.event_date == today)
                self.applied_filters.append("Time Period: Today")
            
            elif time_period == 'this_week':
                start_of_week = today - timedelta(days=today.weekday())
                end_of_week = start_of_week + timedelta(days=6)
                query = query.filter(
                    CalendarEvent.event_date >= start_of_week,
                    CalendarEvent.event_date <= end_of_week
                )
                self.applied_filters.append("Time Period: This Week")
            
            elif time_period == 'this_month':
                start_of_month = today.replace(day=1)
                if today.month == 12:
                    end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
                
                query = query.filter(
                    CalendarEvent.event_date >= start_of_month,
                    CalendarEvent.event_date <= end_of_month
                )
                self.applied_filters.append("Time Period: This Month")
            
            elif time_period == 'last_month':
                if today.month == 1:
                    start_of_last_month = today.replace(year=today.year - 1, month=12, day=1)
                    end_of_last_month = today.replace(day=1) - timedelta(days=1)
                else:
                    start_of_last_month = today.replace(month=today.month - 1, day=1)
                    end_of_last_month = today.replace(day=1) - timedelta(days=1)
                
                query = query.filter(
                    CalendarEvent.event_date >= start_of_last_month,
                    CalendarEvent.event_date <= end_of_last_month
                )
                self.applied_filters.append("Time Period: Last Month")
        
        return query
    
    def apply_geographic_filters(self, query):
        """Apply geographic filtering (region, district, parish, village)"""
        if self.args.get('region') and self.args.get('region') != 'ALL':
            query = query.join(SavingsGroup).filter(SavingsGroup.region == self.args.get('region'))
            self.applied_filters.append(f"Region: {self.args.get('region')}")
        
        if self.args.get('district') and self.args.get('district') != 'ALL':
            query = query.join(SavingsGroup).filter(SavingsGroup.district == self.args.get('district'))
            self.applied_filters.append(f"District: {self.args.get('district')}")
        
        if self.args.get('parish') and self.args.get('parish') != 'ALL':
            query = query.join(SavingsGroup).filter(SavingsGroup.parish == self.args.get('parish'))
            self.applied_filters.append(f"Parish: {self.args.get('parish')}")
        
        if self.args.get('village') and self.args.get('village') != 'ALL':
            query = query.join(SavingsGroup).filter(SavingsGroup.village == self.args.get('village'))
            self.applied_filters.append(f"Village: {self.args.get('village')}")
        
        return query
    
    def apply_demographic_filters(self, query):
        """Apply demographic filtering (gender, roles, membership duration)"""
        if self.args.get('gender') and self.args.get('gender') != 'ALL':
            query = query.filter(CalendarEvent.member_gender == self.args.get('gender'))
            gender_label = {'F': 'Female', 'M': 'Male', 'OTHER': 'Other'}.get(self.args.get('gender'), self.args.get('gender'))
            self.applied_filters.append(f"Gender: {gender_label}")
        
        if self.args.get('roles'):
            roles = self.args.get('roles').split(',')
            query = query.filter(CalendarEvent.member_role.in_(roles))
            self.applied_filters.append(f"Roles: {', '.join(roles)}")
        
        # Membership duration filtering would require joining with GroupMember
        if self.args.get('membership_min') or self.args.get('membership_max'):
            # This would need more complex logic to calculate membership duration
            pass
        
        return query
    
    def apply_financial_filters(self, query):
        """Apply financial filtering (fund types, loan amounts, transaction amounts)"""
        if self.args.get('fund_types'):
            fund_types = self.args.get('fund_types').split(',')
            query = query.filter(CalendarEvent.fund_type.in_(fund_types))
            self.applied_filters.append(f"Fund Types: {', '.join(fund_types)}")
        
        if self.args.get('amount_min'):
            try:
                min_amount = Decimal(self.args.get('amount_min'))
                query = query.filter(CalendarEvent.amount >= min_amount)
                self.applied_filters.append(f"Min Amount: {min_amount:,.0f} UGX")
            except (ValueError, TypeError):
                pass
        
        if self.args.get('amount_max'):
            try:
                max_amount = Decimal(self.args.get('amount_max'))
                query = query.filter(CalendarEvent.amount <= max_amount)
                self.applied_filters.append(f"Max Amount: {max_amount:,.0f} UGX")
            except (ValueError, TypeError):
                pass
        
        return query
    
    def apply_activity_filters(self, query):
        """Apply activity filtering (event types, verification status)"""
        if self.args.get('event_types'):
            event_types = self.args.get('event_types').split(',')
            query = query.filter(CalendarEvent.event_type.in_(event_types))
            self.applied_filters.append(f"Event Types: {', '.join(event_types)}")
        
        if self.args.get('verification_status') and self.args.get('verification_status') != 'ALL':
            query = query.filter(CalendarEvent.verification_status == self.args.get('verification_status'))
            self.applied_filters.append(f"Status: {self.args.get('verification_status')}")
        
        return query
    
    def apply_group_filters(self, query):
        """Apply group-specific filtering"""
        if self.args.get('group_ids'):
            try:
                group_ids = [int(gid) for gid in self.args.get('group_ids').split(',')]
                query = query.filter(CalendarEvent.group_id.in_(group_ids))
                
                # Get group names for display
                groups = SavingsGroup.query.filter(SavingsGroup.id.in_(group_ids)).all()
                group_names = [g.name for g in groups]
                if len(group_names) == 1:
                    self.applied_filters.append(f"Group: {group_names[0]}")
                else:
                    self.applied_filters.append(f"Groups: {len(group_names)} selected")
            except (ValueError, TypeError):
                pass
        
        return query
    
    def get_applied_filters(self):
        """Return list of applied filters for display"""
        return self.applied_filters


@calendar_blueprint.route('/api/calendar/events', methods=['GET'])
@authenticate
def get_filtered_calendar_events(user_id):
    """
    Get calendar events with comprehensive filtering support
    
    Query Parameters:
    - start_date, end_date: Date range (YYYY-MM-DD)
    - time_period: today, this_week, this_month, last_month
    - region, district, parish, village: Geographic filters
    - gender: F, M, OTHER, ALL
    - roles: CHAIR,TREASURER,SECRETARY,MEMBER (comma-separated)
    - fund_types: PERSONAL,ECD,SOCIAL,TARGET (comma-separated)
    - event_types: TRANSACTION,MEETING,LOAN,CAMPAIGN (comma-separated)
    - amount_min, amount_max: Amount range
    - verification_status: PENDING,VERIFIED,REJECTED,ALL
    - group_ids: Specific group IDs (comma-separated)
    """
    
    # Base query
    query = CalendarEvent.query
    
    # Apply role-based filtering
    user = User.query.get(user_id)
    if not user.is_super_admin and user.role != 'service_admin':
        # Regular users can only see events from their groups
        user_groups = db.session.query(GroupMember.group_id).filter_by(user_id=user_id).subquery()
        query = query.filter(CalendarEvent.group_id.in_(user_groups))
    
    # Apply filters
    filters = FilterProcessor(request.args)
    query = filters.apply_all(query)
    
    # Order by date (most recent first)
    query = query.order_by(desc(CalendarEvent.event_date), desc(CalendarEvent.created_date))
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 100)  # Limit to 100 items per page
    
    paginated_events = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    events = paginated_events.items
    
    # Generate summary statistics
    summary = generate_filter_summary(events, filters.get_applied_filters())
    
    return jsonify({
        'events': [event.to_json() for event in events],
        'filters_applied': filters.get_applied_filters(),
        'total_count': paginated_events.total,
        'page': page,
        'per_page': per_page,
        'pages': paginated_events.pages,
        'has_next': paginated_events.has_next,
        'has_prev': paginated_events.has_prev,
        'summary': summary
    })


@calendar_blueprint.route('/api/calendar/events/<int:event_id>', methods=['GET'])
@authenticate
def get_calendar_event_details(user_id, event_id):
    """Get detailed information for a specific calendar event"""
    
    event = CalendarEvent.query.get_or_404(event_id)
    
    # Check access permissions
    user = User.query.get(user_id)
    if not user.is_super_admin and user.role != 'service_admin':
        # Check if user is member of the event's group
        member = GroupMember.query.filter_by(user_id=user_id, group_id=event.group_id).first()
        if not member:
            return jsonify({'message': 'Access denied'}), 403
    
    # Get additional details based on event type
    additional_details = {}
    
    if event.event_type == 'TRANSACTION' and event.reference_id:
        # Get transaction details
        transaction = SavingTransaction.query.filter_by(id=event.reference_id).first()
        if transaction:
            member_saving = MemberSaving.query.get(transaction.member_saving_id)
            saving_type = SavingType.query.get(member_saving.saving_type_id)
            member = GroupMember.query.get(member_saving.member_id)
            
            additional_details = {
                'transaction_id': transaction.id,
                'mobile_money_transaction_id': transaction.mobile_money_transaction_id,
                'mobile_money_phone': transaction.mobile_money_phone,
                'balance_before': float(transaction.balance_before) if transaction.balance_before else None,
                'balance_after': float(transaction.balance_after) if transaction.balance_after else None,
                'saving_type': saving_type.to_json() if saving_type else None,
                'member_details': {
                    'name': member.name,
                    'phone': member.phone,
                    'role': member.role,
                    'gender': member.gender
                } if member else None
            }
    
    event_data = event.to_json()
    event_data['additional_details'] = additional_details
    
    return jsonify(event_data)


@calendar_blueprint.route('/api/calendar/filter-options', methods=['GET'])
@authenticate
def get_filter_options(user_id):
    """Get available filter options based on user's access level"""
    
    user = User.query.get(user_id)
    
    # Base filter options
    options = {
        'time_periods': [
            {'value': 'today', 'label': 'Today'},
            {'value': 'this_week', 'label': 'This Week'},
            {'value': 'this_month', 'label': 'This Month'},
            {'value': 'last_month', 'label': 'Last Month'},
            {'value': 'custom', 'label': 'Custom Range'}
        ],
        'event_types': [
            {'value': 'TRANSACTION', 'label': '💰 Transactions'},
            {'value': 'MEETING', 'label': '👥 Meetings'},
            {'value': 'LOAN', 'label': '🏦 Loans'},
            {'value': 'CAMPAIGN', 'label': '🎯 Campaigns'},
            {'value': 'FINE', 'label': '⚠️ Fines'}
        ],
        'fund_types': [
            {'value': 'PERSONAL', 'label': '💰 Personal Savings'},
            {'value': 'ECD', 'label': '👶 ECD Fund'},
            {'value': 'SOCIAL', 'label': '🤝 Social Fund'},
            {'value': 'TARGET', 'label': '🎯 Target Savings'}
        ],
        'verification_statuses': [
            {'value': 'ALL', 'label': 'All Statuses'},
            {'value': 'PENDING', 'label': '⏳ Pending'},
            {'value': 'VERIFIED', 'label': '✅ Verified'},
            {'value': 'REJECTED', 'label': '❌ Rejected'}
        ],
        'genders': [
            {'value': 'ALL', 'label': 'All Genders'},
            {'value': 'F', 'label': '👩 Women'},
            {'value': 'M', 'label': '👨 Men'},
            {'value': 'OTHER', 'label': '⚧ Other'}
        ],
        'roles': [
            {'value': 'CHAIR', 'label': '🪑 Chair'},
            {'value': 'TREASURER', 'label': '💼 Treasurer'},
            {'value': 'SECRETARY', 'label': '📝 Secretary'},
            {'value': 'MEMBER', 'label': '👤 Member'}
        ]
    }
    
    # Add geographic options based on access level
    if user.is_super_admin or user.role == 'service_admin':
        # Get all available geographic options
        regions = db.session.query(SavingsGroup.region).distinct().all()
        districts = db.session.query(SavingsGroup.district).distinct().all()
        parishes = db.session.query(SavingsGroup.parish).distinct().all()
        villages = db.session.query(SavingsGroup.village).distinct().all()
        
        options['regions'] = [{'value': r[0], 'label': r[0]} for r in regions if r[0]]
        options['districts'] = [{'value': d[0], 'label': d[0]} for d in districts if d[0]]
        options['parishes'] = [{'value': p[0], 'label': p[0]} for p in parishes if p[0]]
        options['villages'] = [{'value': v[0], 'label': v[0]} for v in villages if v[0]]
        
        # Get all groups
        groups = SavingsGroup.query.all()
        options['groups'] = [{'value': g.id, 'label': g.name} for g in groups]
    
    else:
        # Regular users only see their groups
        user_groups = db.session.query(SavingsGroup).join(GroupMember).filter(
            GroupMember.user_id == user_id
        ).all()
        
        options['groups'] = [{'value': g.id, 'label': g.name} for g in user_groups]
        
        # Geographic options based on user's groups
        if user_groups:
            regions = list(set(g.region for g in user_groups if g.region))
            districts = list(set(g.district for g in user_groups if g.district))
            parishes = list(set(g.parish for g in user_groups if g.parish))
            villages = list(set(g.village for g in user_groups if g.village))
            
            options['regions'] = [{'value': r, 'label': r} for r in regions]
            options['districts'] = [{'value': d, 'label': d} for d in districts]
            options['parishes'] = [{'value': p, 'label': p} for p in parishes]
            options['villages'] = [{'value': v, 'label': v} for v in villages]
    
    return jsonify(options)


def generate_filter_summary(events, applied_filters):
    """Generate summary statistics for filtered events"""
    if not events:
        return {
            'total_events': 0,
            'total_amount': 0,
            'event_type_breakdown': {},
            'fund_type_breakdown': {},
            'applied_filters': applied_filters
        }
    
    total_amount = sum(float(event.amount) for event in events if event.amount)
    
    # Event type breakdown
    event_type_breakdown = {}
    for event in events:
        event_type_breakdown[event.event_type] = event_type_breakdown.get(event.event_type, 0) + 1
    
    # Fund type breakdown
    fund_type_breakdown = {}
    for event in events:
        if event.fund_type:
            fund_type_breakdown[event.fund_type] = fund_type_breakdown.get(event.fund_type, 0) + 1
    
    return {
        'total_events': len(events),
        'total_amount': total_amount,
        'event_type_breakdown': event_type_breakdown,
        'fund_type_breakdown': fund_type_breakdown,
        'applied_filters': applied_filters
    }