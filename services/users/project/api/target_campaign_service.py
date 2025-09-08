"""
Target Savings Campaign service for managing admin-created campaigns
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import func, and_, or_
from project import db
from project.api.models import (
    TargetSavingsCampaign, GroupTargetCampaign, MemberCampaignParticipation,
    CampaignVote, SavingsGroup, GroupMember, User
)
from project.api.notifications import create_system_notification


class TargetCampaignService:
    """Service for managing target savings campaigns"""

    @staticmethod
    def create_campaign(name, description, target_amount, target_date, created_by, **kwargs):
        """
        Create a new target savings campaign
        
        Args:
            name: Campaign name
            description: Campaign description
            target_amount: Target savings amount
            target_date: Target completion date
            created_by: User ID who created the campaign
            **kwargs: Additional campaign parameters
        """
        campaign = TargetSavingsCampaign(
            name=name,
            description=description,
            target_amount=Decimal(str(target_amount)),
            target_date=target_date,
            created_by=created_by,
            is_mandatory=kwargs.get('is_mandatory', False),
            requires_group_vote=kwargs.get('requires_group_vote', True)
        )
        
        # Set optional parameters
        optional_fields = [
            'minimum_contribution', 'maximum_contribution', 'minimum_participation_rate',
            'completion_bonus_rate', 'early_completion_bonus', 'penalty_for_non_participation',
            'is_global', 'eligible_group_states'
        ]
        
        for field in optional_fields:
            if field in kwargs:
                setattr(campaign, field, kwargs[field])
        
        db.session.add(campaign)
        db.session.commit()
        
        return campaign

    @staticmethod
    def assign_campaign_to_group(campaign_id, group_id, assigned_by):
        """
        Assign a campaign to a specific group
        """
        campaign = TargetSavingsCampaign.query.get(campaign_id)
        group = SavingsGroup.query.get(group_id)
        
        if not campaign or not group:
            raise ValueError("Campaign or group not found")
        
        if not campaign.is_eligible_for_group(group):
            raise ValueError("Campaign is not eligible for this group")
        
        # Check if already assigned
        existing = GroupTargetCampaign.query.filter_by(
            campaign_id=campaign_id,
            group_id=group_id
        ).first()
        
        if existing:
            raise ValueError("Campaign already assigned to this group")
        
        # Create group campaign
        group_campaign = GroupTargetCampaign(
            campaign_id=campaign_id,
            group_id=group_id,
            assigned_by=assigned_by
        )
        
        # Set initial status
        if campaign.is_mandatory and not campaign.requires_group_vote:
            group_campaign.status = 'ACTIVE'
            group_campaign.decision_date = func.now()
        elif campaign.requires_group_vote:
            group_campaign.status = 'VOTING'
            group_campaign.voting_deadline = datetime.now() + timedelta(days=7)
        
        db.session.add(group_campaign)
        db.session.flush()
        
        # Create member participation records
        active_members = GroupMember.query.filter_by(group_id=group_id, is_active=True).all()
        
        for member in active_members:
            participation = MemberCampaignParticipation(
                group_campaign_id=group_campaign.id,
                member_id=member.id,
                is_participating=campaign.is_mandatory
            )
            db.session.add(participation)
        
        db.session.commit()
        
        return group_campaign

    @staticmethod
    def assign_campaign_globally(campaign_id, assigned_by):
        """
        Assign a campaign to all eligible groups
        """
        campaign = TargetSavingsCampaign.query.get(campaign_id)
        if not campaign:
            raise ValueError("Campaign not found")
        
        # Get eligible groups
        query = SavingsGroup.query.filter_by(active=True)
        
        if campaign.eligible_group_states:
            eligible_states = [state.strip() for state in campaign.eligible_group_states.split(',')]
            query = query.filter(SavingsGroup.state.in_(eligible_states))
        
        eligible_groups = query.all()
        assigned_count = 0
        
        for group in eligible_groups:
            try:
                TargetCampaignService.assign_campaign_to_group(
                    campaign_id, group.id, assigned_by
                )
                assigned_count += 1
            except ValueError:
                # Skip groups that already have this campaign or are not eligible
                continue
        
        # Mark campaign as global and active
        campaign.is_global = True
        campaign.status = 'ACTIVE'
        campaign.start_date = date.today()
        
        db.session.commit()
        
        return assigned_count

    @staticmethod
    def record_vote(group_campaign_id, member_id, vote, vote_reason=None):
        """
        Record a member's vote on a campaign
        """
        group_campaign = GroupTargetCampaign.query.get(group_campaign_id)
        if not group_campaign:
            raise ValueError("Group campaign not found")
        
        if group_campaign.status != 'VOTING':
            raise ValueError("Voting is not open for this campaign")
        
        member = GroupMember.query.get(member_id)
        if not member or member.group_id != group_campaign.group_id:
            raise ValueError("Member not found in this group")
        
        # Check for existing vote
        existing_vote = CampaignVote.query.filter_by(
            group_campaign_id=group_campaign_id,
            member_id=member_id
        ).first()
        
        if existing_vote:
            # Update existing vote
            existing_vote.vote = vote
            existing_vote.vote_reason = vote_reason
            existing_vote.vote_date = func.now()
        else:
            # Create new vote
            campaign_vote = CampaignVote(
                group_campaign_id=group_campaign_id,
                member_id=member_id,
                vote=vote,
                vote_reason=vote_reason
            )
            
            # Set officer vote weight
            if member.is_officer():
                campaign_vote.is_officer_vote = True
                campaign_vote.vote_weight = Decimal('1.5')
            
            db.session.add(campaign_vote)
        
        # Update vote counts and check for completion
        TargetCampaignService._update_voting_status(group_campaign)
        
        db.session.commit()
        
        return group_campaign

    @staticmethod
    def _update_voting_status(group_campaign):
        """
        Update voting status and determine outcome if voting is complete
        """
        votes = CampaignVote.query.filter_by(group_campaign_id=group_campaign.id).all()
        
        # Update vote counts
        group_campaign.votes_for = sum(1 for v in votes if v.vote == 'FOR')
        group_campaign.votes_against = sum(1 for v in votes if v.vote == 'AGAINST')
        group_campaign.votes_abstain = sum(1 for v in votes if v.vote == 'ABSTAIN')
        
        # Calculate participation rate
        total_members = GroupMember.query.filter_by(
            group_id=group_campaign.group_id, 
            is_active=True
        ).count()
        
        group_campaign.voting_participation_rate = (len(votes) / total_members) * 100
        
        # Check if voting should close
        voting_complete = (
            len(votes) >= total_members or 
            (group_campaign.voting_deadline and datetime.now() > group_campaign.voting_deadline)
        )
        
        if voting_complete:
            # Calculate weighted vote outcome
            total_weighted_votes = sum(float(v.vote_weight) for v in votes if v.vote in ['FOR', 'AGAINST'])
            weighted_votes_for = sum(float(v.vote_weight) for v in votes if v.vote == 'FOR')
            
            if total_weighted_votes > 0:
                approval_rate = (weighted_votes_for / total_weighted_votes) * 100
                required_rate = float(group_campaign.campaign.minimum_participation_rate)
                
                if approval_rate >= required_rate:
                    group_campaign.status = 'ACCEPTED'
                    # Activate participations for FOR voters
                    for vote in votes:
                        if vote.vote == 'FOR':
                            participation = MemberCampaignParticipation.query.filter_by(
                                group_campaign_id=group_campaign.id,
                                member_id=vote.member_id
                            ).first()
                            if participation:
                                participation.is_participating = True
                                participation.participation_date = func.now()
                else:
                    group_campaign.status = 'REJECTED'
            else:
                group_campaign.status = 'REJECTED'
            
            group_campaign.decision_date = func.now()

    @staticmethod
    def record_contribution(group_campaign_id, member_id, amount, processed_by):
        """
        Record a member's contribution to a target campaign
        """
        group_campaign = GroupTargetCampaign.query.get(group_campaign_id)
        if not group_campaign:
            raise ValueError("Group campaign not found")
        
        if group_campaign.status not in ['ACTIVE', 'ACCEPTED']:
            raise ValueError("Campaign is not active for contributions")
        
        # Get member participation
        participation = MemberCampaignParticipation.query.filter_by(
            group_campaign_id=group_campaign_id,
            member_id=member_id
        ).first()
        
        if not participation:
            raise ValueError("Member participation record not found")
        
        if not participation.is_participating:
            raise ValueError("Member is not participating in this campaign")
        
        # Record contribution
        participation.record_contribution(amount)
        
        # Update group campaign progress
        group_campaign.update_progress()
        
        # Check for completion bonuses
        if participation.target_achieved and not participation.bonus_earned:
            bonus_rate = float(group_campaign.campaign.completion_bonus_rate)
            if bonus_rate > 0:
                bonus_amount = float(participation.current_contribution) * (bonus_rate / 100)
                participation.bonus_earned = Decimal(str(bonus_amount))
        
        # Check for early completion bonus
        if (group_campaign.is_completed and 
            group_campaign.completion_date < group_campaign.get_effective_target_date()):
            early_bonus_rate = float(group_campaign.campaign.early_completion_bonus)
            if early_bonus_rate > 0:
                early_bonus = float(group_campaign.total_saved) * (early_bonus_rate / 100)
                group_campaign.bonus_awarded += Decimal(str(early_bonus))
        
        db.session.commit()
        
        return participation

    @staticmethod
    def get_campaign_analytics(campaign_id):
        """
        Get comprehensive analytics for a campaign
        """
        campaign = TargetSavingsCampaign.query.get(campaign_id)
        if not campaign:
            raise ValueError("Campaign not found")
        
        # Get all group campaigns
        group_campaigns = GroupTargetCampaign.query.filter_by(campaign_id=campaign_id).all()
        
        # Calculate overall statistics
        total_groups_assigned = len(group_campaigns)
        active_groups = len([gc for gc in group_campaigns if gc.status in ['ACTIVE', 'ACCEPTED']])
        completed_groups = len([gc for gc in group_campaigns if gc.is_completed])
        
        total_target = float(campaign.target_amount) * total_groups_assigned
        total_saved = sum(float(gc.total_saved) for gc in group_campaigns)
        
        # Member participation statistics
        all_participations = []
        for gc in group_campaigns:
            all_participations.extend(gc.member_participations)
        
        total_eligible_members = len(all_participations)
        participating_members = len([p for p in all_participations if p.is_participating])
        members_achieved_target = len([p for p in all_participations if p.target_achieved])
        
        # Voting statistics (for campaigns that required voting)
        voting_campaigns = [gc for gc in group_campaigns if gc.campaign.requires_group_vote]
        total_votes = sum(len(gc.votes) for gc in voting_campaigns)
        
        return {
            'campaign_overview': {
                'id': campaign.id,
                'name': campaign.name,
                'status': campaign.status,
                'target_amount': float(campaign.target_amount),
                'target_date': campaign.target_date.isoformat(),
                'is_mandatory': campaign.is_mandatory,
                'requires_group_vote': campaign.requires_group_vote
            },
            'group_statistics': {
                'total_groups_assigned': total_groups_assigned,
                'active_groups': active_groups,
                'completed_groups': completed_groups,
                'completion_rate': (completed_groups / total_groups_assigned * 100) if total_groups_assigned > 0 else 0
            },
            'financial_statistics': {
                'total_target_amount': total_target,
                'total_amount_saved': total_saved,
                'overall_progress_percentage': (total_saved / total_target * 100) if total_target > 0 else 0,
                'average_group_progress': sum(float(gc.completion_percentage) for gc in group_campaigns) / len(group_campaigns) if group_campaigns else 0
            },
            'member_statistics': {
                'total_eligible_members': total_eligible_members,
                'participating_members': participating_members,
                'participation_rate': (participating_members / total_eligible_members * 100) if total_eligible_members > 0 else 0,
                'members_achieved_target': members_achieved_target,
                'target_achievement_rate': (members_achieved_target / participating_members * 100) if participating_members > 0 else 0
            },
            'voting_statistics': {
                'campaigns_requiring_vote': len(voting_campaigns),
                'total_votes_cast': total_votes,
                'campaigns_approved': len([gc for gc in voting_campaigns if gc.status == 'ACCEPTED']),
                'campaigns_rejected': len([gc for gc in voting_campaigns if gc.status == 'REJECTED'])
            }
        }

    @staticmethod
    def get_group_campaign_summary(group_id):
        """
        Get summary of all campaigns for a specific group
        """
        group_campaigns = GroupTargetCampaign.query.filter_by(group_id=group_id).all()
        
        summary = {
            'total_campaigns': len(group_campaigns),
            'active_campaigns': len([gc for gc in group_campaigns if gc.status in ['ACTIVE', 'ACCEPTED']]),
            'completed_campaigns': len([gc for gc in group_campaigns if gc.is_completed]),
            'pending_votes': len([gc for gc in group_campaigns if gc.status == 'VOTING']),
            'total_target_amount': sum(float(gc.get_effective_target_amount()) for gc in group_campaigns),
            'total_saved': sum(float(gc.total_saved) for gc in group_campaigns),
            'campaigns': [gc.to_json() for gc in group_campaigns]
        }
        
        return summary

    @staticmethod
    def apply_penalties_for_non_participation(campaign_id):
        """
        Apply penalties for members who didn't participate in mandatory campaigns
        """
        from project.api.models import MemberFine
        
        campaign = TargetSavingsCampaign.query.get(campaign_id)
        if not campaign or not campaign.is_mandatory:
            return 0
        
        penalty_amount = campaign.penalty_for_non_participation
        if penalty_amount <= 0:
            return 0
        
        # Find non-participating members in mandatory campaigns
        group_campaigns = GroupTargetCampaign.query.filter_by(campaign_id=campaign_id).all()
        penalties_applied = 0
        
        for group_campaign in group_campaigns:
            non_participants = [
                p for p in group_campaign.member_participations 
                if not p.is_participating
            ]
            
            for participation in non_participants:
                # Create fine for non-participation
                fine = MemberFine(
                    member_id=participation.member_id,
                    amount=penalty_amount,
                    reason=f'Non-participation in mandatory target savings campaign: {campaign.name}',
                    fine_type='OTHER',
                    imposed_by=campaign.created_by,
                    due_date=date.today() + timedelta(days=30)
                )
                
                db.session.add(fine)
                penalties_applied += 1
        
        db.session.commit()
        
        return penalties_applied