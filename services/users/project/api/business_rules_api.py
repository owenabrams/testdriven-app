"""
Business Rules API Endpoints
Professional business logic management for savings groups
"""

from flask import Blueprint, request, jsonify
from project import db
from project.api.auth import authenticate
from project.api.models import SavingsGroup, User
from project.api.business_rules_models import SystemConfiguration, GroupBusinessRules
from datetime import datetime, date
import json

business_rules_blueprint = Blueprint('business_rules', __name__)


@business_rules_blueprint.route('/api/system/configurations', methods=['GET'])
@authenticate
def get_system_configurations(user_id):
    """Get all system configurations"""
    try:
        # Check if user is admin
        user = User.query.get(user_id)
        if not user or not user.admin:
            return jsonify({
                'status': 'fail',
                'message': 'Admin access required'
            }), 403
        
        category = request.args.get('category')
        
        query = SystemConfiguration.query
        if category:
            query = query.filter_by(category=category.upper())
        
        configurations = query.all()
        
        return jsonify({
            'status': 'success',
            'data': {
                'configurations': [config.to_json() for config in configurations],
                'total': len(configurations)
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'fail',
            'message': f'Error retrieving configurations: {str(e)}'
        }), 500


@business_rules_blueprint.route('/api/system/configurations', methods=['POST'])
@authenticate
def create_system_configuration(user_id):
    """Create or update system configuration"""
    try:
        # Check if user is admin
        user = User.query.get(user_id)
        if not user or not user.admin:
            return jsonify({
                'status': 'fail',
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        
        # Check if configuration exists
        config = SystemConfiguration.query.filter_by(
            config_key=data['config_key']
        ).first()
        
        if config:
            # Update existing
            config.config_value = data['config_value']
            config.config_type = data.get('config_type', config.config_type)
            config.description = data.get('description', config.description)
            config.category = data.get('category', config.category)
            config.updated_by = user_id
        else:
            # Create new
            config = SystemConfiguration(
                config_key=data['config_key'],
                config_value=data['config_value'],
                config_type=data['config_type'],
                description=data.get('description'),
                category=data['category'],
                created_by=user_id
            )
            db.session.add(config)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': {'configuration': config.to_json()},
            'message': 'Configuration saved successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'fail',
            'message': f'Error saving configuration: {str(e)}'
        }), 500


@business_rules_blueprint.route('/api/groups/<int:group_id>/business-rules', methods=['GET'])
@authenticate
def get_group_business_rules(user_id, group_id):
    """Get business rules for a specific group"""
    try:
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({
                'status': 'fail',
                'message': 'Group not found'
            }), 404
        
        # Check user access to group
        user = User.query.get(user_id)
        if not user.admin:
            # Check if user is member of the group
            member = next((m for m in group.members if m.user_id == user_id), None)
            if not member:
                return jsonify({
                    'status': 'fail',
                    'message': 'Access denied'
                }), 403
        
        business_rules = GroupBusinessRules.query.filter_by(group_id=group_id).first()
        
        if not business_rules:
            # Create default business rules
            business_rules = GroupBusinessRules(
                group_id=group_id,
                formation_date=group.created_date.date() if group.created_date else date.today(),
                assessed_by=user_id
            )
            db.session.add(business_rules)
            db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': {'business_rules': business_rules.to_json()}
        })
        
    except Exception as e:
        return jsonify({
            'status': 'fail',
            'message': f'Error retrieving business rules: {str(e)}'
        }), 500


@business_rules_blueprint.route('/api/groups/<int:group_id>/business-rules', methods=['PUT'])
@authenticate
def update_group_business_rules(user_id, group_id):
    """Update business rules for a specific group"""
    try:
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({
                'status': 'fail',
                'message': 'Group not found'
            }), 404
        
        # Check user access (admin or group officer)
        user = User.query.get(user_id)
        if not user.admin:
            member = next((m for m in group.members if m.user_id == user_id), None)
            if not member or member.role not in ['group_officer', 'chairperson', 'secretary', 'treasurer']:
                return jsonify({
                    'status': 'fail',
                    'message': 'Insufficient permissions'
                }), 403
        
        data = request.get_json()
        
        business_rules = GroupBusinessRules.query.filter_by(group_id=group_id).first()
        if not business_rules:
            business_rules = GroupBusinessRules(group_id=group_id)
            db.session.add(business_rules)
        
        # Update fields
        if 'current_cycle' in data:
            business_rules.current_cycle = data['current_cycle']
        if 'years_together' in data:
            business_rules.years_together = data['years_together']
        if 'has_passbooks' in data:
            business_rules.has_passbooks = data['has_passbooks']
        if 'has_group_ledger' in data:
            business_rules.has_group_ledger = data['has_group_ledger']
        if 'record_keeping_score' in data:
            business_rules.record_keeping_score = data['record_keeping_score']
        if 'loan_agreement_percentage' in data:
            business_rules.loan_agreement_percentage = data['loan_agreement_percentage']
        if 'investment_plan_percentage' in data:
            business_rules.investment_plan_percentage = data['investment_plan_percentage']
        if 'financial_literacy_completed' in data:
            business_rules.financial_literacy_completed = data['financial_literacy_completed']
        if 'internet_connectivity_available' in data:
            business_rules.internet_connectivity_available = data['internet_connectivity_available']
        if 'members_have_smartphones' in data:
            business_rules.members_have_smartphones = data['members_have_smartphones']
        if 'technology_comfort_level' in data:
            business_rules.technology_comfort_level = data['technology_comfort_level']
        if 'attendance_mode' in data:
            business_rules.attendance_mode = data['attendance_mode']
        if 'requires_physical_presence' in data:
            business_rules.requires_physical_presence = data['requires_physical_presence']
        if 'allows_remote_attendance' in data:
            business_rules.allows_remote_attendance = data['allows_remote_attendance']
        
        # Update assessment info
        business_rules.last_assessment_date = date.today()
        business_rules.assessed_by = user_id
        
        # Calculate and update eligibility
        business_rules.update_eligibility_status()
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': {'business_rules': business_rules.to_json()},
            'message': 'Business rules updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'fail',
            'message': f'Error updating business rules: {str(e)}'
        }), 500


@business_rules_blueprint.route('/api/groups/<int:group_id>/attendance-configuration', methods=['GET'])
@authenticate
def get_attendance_configuration(user_id, group_id):
    """Get attendance configuration for a specific group"""
    try:
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({
                'status': 'fail',
                'message': 'Group not found'
            }), 404
        
        business_rules = GroupBusinessRules.query.filter_by(group_id=group_id).first()
        
        if not business_rules:
            # Return default configuration
            config = {
                "mode": "MANUAL",
                "requires_physical_presence": True,
                "allows_remote_attendance": False,
                "features": {
                    "qr_code_checkin": False,
                    "gps_verification": False,
                    "photo_verification": False,
                    "manual_checkin": True,
                    "biometric_checkin": False
                }
            }
        else:
            config = business_rules.get_attendance_configuration()
        
        return jsonify({
            'status': 'success',
            'data': {
                'attendance_configuration': config,
                'group_eligible_for_enhanced_features': business_rules.eligible_for_enhanced_features if business_rules else False
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'fail',
            'message': f'Error retrieving attendance configuration: {str(e)}'
        }), 500


@business_rules_blueprint.route('/api/groups/<int:group_id>/eligibility-assessment', methods=['POST'])
@authenticate
def assess_group_eligibility(user_id, group_id):
    """Perform comprehensive eligibility assessment for a group"""
    try:
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({
                'status': 'fail',
                'message': 'Group not found'
            }), 404
        
        # Check user access (admin or group officer)
        user = User.query.get(user_id)
        if not user.admin:
            member = next((m for m in group.members if m.user_id == user_id), None)
            if not member or member.role not in ['group_officer', 'chairperson']:
                return jsonify({
                    'status': 'fail',
                    'message': 'Insufficient permissions'
                }), 403
        
        business_rules = GroupBusinessRules.query.filter_by(group_id=group_id).first()
        if not business_rules:
            return jsonify({
                'status': 'fail',
                'message': 'Business rules not found. Please update group information first.'
            }), 404
        
        # Perform assessment
        eligibility_score = business_rules.calculate_eligibility_score()
        is_eligible = business_rules.update_eligibility_status()
        
        # Update assessment date
        business_rules.last_assessment_date = date.today()
        business_rules.assessed_by = user_id
        
        db.session.commit()
        
        # Generate assessment report
        assessment_report = {
            "group_id": group_id,
            "group_name": group.name,
            "assessment_date": date.today().isoformat(),
            "assessed_by": user_id,
            "eligibility_score": eligibility_score,
            "is_eligible_for_enhanced_features": is_eligible,
            "criteria_met": {
                "beyond_second_cycle": business_rules.current_cycle >= 3,
                "third_year_together": business_rules.years_together >= 3.0,
                "good_record_keeping": business_rules.has_passbooks and business_rules.has_group_ledger,
                "hundred_percent_loan_agreement": business_rules.loan_agreement_percentage >= 100.0,
                "seventy_five_percent_investment_plan": business_rules.investment_plan_percentage >= 75.0,
                "financial_literacy_completed": business_rules.financial_literacy_completed,
                "maintains_normal_procedures": business_rules.maintains_normal_procedures
            },
            "recommendations": []
        }
        
        # Generate recommendations
        if business_rules.current_cycle < 3:
            assessment_report["recommendations"].append("Complete current savings cycle and advance to third cycle")
        if business_rules.years_together < 3.0:
            assessment_report["recommendations"].append("Continue group operations to reach 3+ years together")
        if not business_rules.has_passbooks:
            assessment_report["recommendations"].append("Implement individual member passbooks")
        if not business_rules.has_group_ledger:
            assessment_report["recommendations"].append("Maintain proper group ledger records")
        if business_rules.loan_agreement_percentage < 100.0:
            assessment_report["recommendations"].append("Achieve 100% member agreement for loan participation")
        if business_rules.investment_plan_percentage < 75.0:
            assessment_report["recommendations"].append("Ensure 75% of members have investment plans")
        if not business_rules.financial_literacy_completed:
            assessment_report["recommendations"].append("Complete financial literacy training for all members")
        
        return jsonify({
            'status': 'success',
            'data': {'assessment_report': assessment_report},
            'message': 'Eligibility assessment completed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'fail',
            'message': f'Error performing assessment: {str(e)}'
        }), 500
