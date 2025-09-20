"""
Business Rules and System Configuration Models
Professional business logic for savings groups management
"""

from project import db
from sqlalchemy.sql import func
import json
from datetime import datetime, timedelta


class SystemConfiguration(db.Model):
    """Global system configuration and business rules"""
    
    __tablename__ = "system_configurations"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.Text, nullable=False)  # JSON string
    config_type = db.Column(db.String(50), nullable=False)  # BOOLEAN, INTEGER, STRING, JSON
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)  # ATTENDANCE, LOANS, GENERAL, etc.
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_configs')
    updater = db.relationship('User', foreign_keys=[updated_by], backref='updated_configs')
    
    def get_value(self):
        """Get parsed configuration value based on type"""
        if self.config_type == 'BOOLEAN':
            return self.config_value.lower() in ['true', '1', 'yes', 'on']
        elif self.config_type == 'INTEGER':
            return int(self.config_value)
        elif self.config_type == 'JSON':
            return json.loads(self.config_value)
        else:
            return self.config_value
    
    def set_value(self, value):
        """Set configuration value with proper type conversion"""
        if self.config_type == 'JSON':
            self.config_value = json.dumps(value)
        else:
            self.config_value = str(value)
    
    def to_json(self):
        return {
            "id": self.id,
            "config_key": self.config_key,
            "config_value": self.get_value(),
            "config_type": self.config_type,
            "description": self.description,
            "category": self.category,
            "created_by": self.created_by,
            "updated_by": self.updated_by,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "updated_date": self.updated_date.isoformat() if self.updated_date else None
        }


class GroupBusinessRules(db.Model):
    """Business rules and eligibility criteria for individual groups"""
    
    __tablename__ = "group_business_rules"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    
    # Group Maturity Criteria
    current_cycle = db.Column(db.Integer, default=1, nullable=False)
    years_together = db.Column(db.Numeric(3, 1), default=0.0, nullable=False)
    formation_date = db.Column(db.Date, nullable=True)
    
    # Record Keeping Assessment
    has_passbooks = db.Column(db.Boolean, default=False, nullable=False)
    has_group_ledger = db.Column(db.Boolean, default=False, nullable=False)
    record_keeping_score = db.Column(db.Numeric(3, 1), default=0.0, nullable=False)  # 0.0 to 10.0
    last_record_audit_date = db.Column(db.Date, nullable=True)
    
    # Member Agreement and Participation
    loan_agreement_percentage = db.Column(db.Numeric(5, 2), default=0.0, nullable=False)  # 0.00 to 100.00
    investment_plan_percentage = db.Column(db.Numeric(5, 2), default=0.0, nullable=False)
    
    # Training and Capacity
    financial_literacy_completed = db.Column(db.Boolean, default=False, nullable=False)
    financial_literacy_date = db.Column(db.Date, nullable=True)
    additional_training_completed = db.Column(db.Text, nullable=True)  # JSON array of training types
    
    # Operational Status
    maintains_normal_procedures = db.Column(db.Boolean, default=True, nullable=False)
    eligible_for_enhanced_features = db.Column(db.Boolean, default=False, nullable=False)
    
    # Technology Readiness
    internet_connectivity_available = db.Column(db.Boolean, default=False, nullable=False)
    members_have_smartphones = db.Column(db.Numeric(5, 2), default=0.0, nullable=False)  # Percentage
    technology_comfort_level = db.Column(db.String(20), default='LOW', nullable=False)  # LOW, MEDIUM, HIGH
    
    # Attendance Configuration
    attendance_mode = db.Column(db.String(20), default='MANUAL', nullable=False)  # MANUAL, HYBRID, DIGITAL
    requires_physical_presence = db.Column(db.Boolean, default=True, nullable=False)
    allows_remote_attendance = db.Column(db.Boolean, default=False, nullable=False)
    
    # Audit fields
    last_assessment_date = db.Column(db.Date, nullable=True)
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    next_review_date = db.Column(db.Date, nullable=True)
    
    # Relationships
    group = db.relationship('SavingsGroup', backref='business_rules')
    assessor = db.relationship('User', backref='assessed_groups')
    
    def calculate_eligibility_score(self):
        """Calculate overall eligibility score for enhanced features"""
        score = 0.0

        # Maturity criteria (40 points)
        if self.current_cycle >= 3:
            score += 20
        elif self.current_cycle >= 2:
            score += 10

        if float(self.years_together) >= 3.0:
            score += 20
        elif float(self.years_together) >= 2.0:
            score += 10

        # Record keeping (20 points)
        if self.has_passbooks and self.has_group_ledger:
            score += 10
        score += min(float(self.record_keeping_score), 10.0)

        # Member agreement (20 points)
        if float(self.loan_agreement_percentage) >= 100.0:
            score += 10
        if float(self.investment_plan_percentage) >= 75.0:
            score += 10

        # Training (10 points)
        if self.financial_literacy_completed:
            score += 10

        # Operational (10 points)
        if self.maintains_normal_procedures:
            score += 10

        return min(score, 100.0)
    
    def update_eligibility_status(self):
        """Update eligibility based on current criteria"""
        score = self.calculate_eligibility_score()
        
        # Require minimum 80% score for enhanced features
        self.eligible_for_enhanced_features = (
            score >= 80.0 and
            self.current_cycle >= 2 and
            self.years_together >= 3.0 and
            self.has_passbooks and
            self.has_group_ledger and
            self.loan_agreement_percentage >= 100.0 and
            self.investment_plan_percentage >= 75.0 and
            self.financial_literacy_completed
        )
        
        return self.eligible_for_enhanced_features
    
    def get_attendance_configuration(self):
        """Get appropriate attendance configuration based on group capabilities"""
        config = {
            "mode": self.attendance_mode,
            "requires_physical_presence": self.requires_physical_presence,
            "allows_remote_attendance": self.allows_remote_attendance,
            "features": {
                "qr_code_checkin": False,
                "gps_verification": False,
                "photo_verification": False,
                "manual_checkin": True,
                "biometric_checkin": False
            }
        }
        
        # Enable digital features based on technology readiness
        if self.internet_connectivity_available and self.members_have_smartphones >= 50.0:
            if self.technology_comfort_level in ['MEDIUM', 'HIGH']:
                config["features"]["qr_code_checkin"] = True
                config["features"]["gps_verification"] = True
                
            if self.technology_comfort_level == 'HIGH':
                config["features"]["photo_verification"] = True
                config["features"]["biometric_checkin"] = True
        
        # Hybrid mode configuration
        if self.attendance_mode == 'HYBRID':
            config["features"]["manual_checkin"] = True  # Always available as backup
            config["allows_remote_attendance"] = self.internet_connectivity_available
        
        return config
    
    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "maturity": {
                "current_cycle": self.current_cycle,
                "years_together": float(self.years_together),
                "formation_date": self.formation_date.isoformat() if self.formation_date else None
            },
            "record_keeping": {
                "has_passbooks": self.has_passbooks,
                "has_group_ledger": self.has_group_ledger,
                "score": float(self.record_keeping_score),
                "last_audit_date": self.last_record_audit_date.isoformat() if self.last_record_audit_date else None
            },
            "member_agreement": {
                "loan_agreement_percentage": float(self.loan_agreement_percentage),
                "investment_plan_percentage": float(self.investment_plan_percentage)
            },
            "training": {
                "financial_literacy_completed": self.financial_literacy_completed,
                "financial_literacy_date": self.financial_literacy_date.isoformat() if self.financial_literacy_date else None,
                "additional_training": json.loads(self.additional_training_completed) if self.additional_training_completed else []
            },
            "technology": {
                "internet_connectivity_available": self.internet_connectivity_available,
                "members_have_smartphones": float(self.members_have_smartphones),
                "technology_comfort_level": self.technology_comfort_level
            },
            "attendance": self.get_attendance_configuration(),
            "eligibility": {
                "score": self.calculate_eligibility_score(),
                "eligible_for_enhanced_features": self.eligible_for_enhanced_features
            },
            "assessment": {
                "last_assessment_date": self.last_assessment_date.isoformat() if self.last_assessment_date else None,
                "assessed_by": self.assessed_by,
                "next_review_date": self.next_review_date.isoformat() if self.next_review_date else None
            }
        }
