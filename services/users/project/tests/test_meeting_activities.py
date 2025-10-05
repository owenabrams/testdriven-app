import unittest
import json
import tempfile
import os
from datetime import datetime, timedelta
from decimal import Decimal

from project import create_app, db
from project.api.models import User, SavingsGroup, GroupMember
from project.api.meeting_models import (
    Meeting, MeetingActivity, MemberActivityParticipation, 
    ActivityDocument, ActivityTransaction
)


class MeetingActivitiesTestCase(unittest.TestCase):
    """Test cases for meeting activities functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        
        db.create_all()
        
        # Create test user
        self.test_user = User(
            email='test@example.com',
            password='testpassword',
            first_name='Test',
            last_name='User',
            is_active=True
        )
        db.session.add(self.test_user)
        
        # Create test group
        self.test_group = SavingsGroup(
            name='Test Savings Group',
            description='Test group for activities',
            created_by=self.test_user.id,
            group_type='SAVINGS_CIRCLE'
        )
        db.session.add(self.test_group)
        
        # Create test members
        self.chairperson = GroupMember(
            user_id=self.test_user.id,
            group_id=self.test_group.id,
            role='chairperson',
            name='Test Chairperson',
            status='ACTIVE'
        )
        db.session.add(self.chairperson)
        
        self.member = GroupMember(
            group_id=self.test_group.id,
            role='member',
            name='Test Member',
            status='ACTIVE'
        )
        db.session.add(self.member)
        
        # Create test meeting
        self.test_meeting = Meeting(
            group_id=self.test_group.id,
            meeting_date=datetime.now(),
            meeting_type='REGULAR',
            status='SCHEDULED',
            created_by=self.test_user.id
        )
        db.session.add(self.test_meeting)
        
        db.session.commit()
        
        # Login user for authenticated requests
        self.auth_headers = self._get_auth_headers()

    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _get_auth_headers(self):
        """Get authentication headers for requests"""
        # Mock authentication - in real app this would use JWT tokens
        return {'Authorization': f'Bearer mock-token-{self.test_user.id}'}

    def test_create_meeting_activity(self):
        """Test creating a new meeting activity"""
        activity_data = {
            'activity_type': 'PERSONAL_SAVINGS',
            'activity_name': 'Personal Savings Collection',
            'description': 'Collect personal savings from members',
            'responsible_member_id': self.chairperson.id
        }
        
        response = self.client.post(
            f'/api/meetings/{self.test_meeting.id}/activities',
            data=json.dumps(activity_data),
            content_type='application/json',
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertIn('activity', data['data'])
        
        # Verify activity was created in database
        activity = MeetingActivity.query.filter_by(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS'
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.activity_name, 'Personal Savings Collection')

    def test_start_activity(self):
        """Test starting an activity"""
        # Create activity first
        activity = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS',
            activity_name='Personal Savings Collection',
            responsible_member_id=self.chairperson.id,
            status='PENDING'
        )
        db.session.add(activity)
        db.session.commit()
        
        response = self.client.post(
            f'/api/activities/{activity.id}/start',
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        
        # Verify activity status changed
        activity = MeetingActivity.query.get(activity.id)
        self.assertEqual(activity.status, 'IN_PROGRESS')
        self.assertIsNotNone(activity.start_time)

    def test_complete_activity(self):
        """Test completing an activity"""
        # Create and start activity
        activity = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS',
            activity_name='Personal Savings Collection',
            responsible_member_id=self.chairperson.id,
            status='IN_PROGRESS',
            start_time=datetime.now()
        )
        db.session.add(activity)
        db.session.commit()
        
        completion_data = {
            'outcomes': {
                'total_amount': 50000,
                'members_participated': 2,
                'challenges': 'None'
            }
        }
        
        response = self.client.post(
            f'/api/activities/{activity.id}/complete',
            data=json.dumps(completion_data),
            content_type='application/json',
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        
        # Verify activity was completed
        activity = MeetingActivity.query.get(activity.id)
        self.assertEqual(activity.status, 'COMPLETED')
        self.assertIsNotNone(activity.end_time)
        self.assertEqual(activity.outcomes['total_amount'], 50000)

    def test_record_member_participation(self):
        """Test recording member participation in activity"""
        # Create activity
        activity = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS',
            activity_name='Personal Savings Collection',
            responsible_member_id=self.chairperson.id,
            status='IN_PROGRESS'
        )
        db.session.add(activity)
        db.session.commit()
        
        participation_data = {
            'participation_type': 'CONTRIBUTED',
            'amount': 10000,
            'status': 'COMPLETED',
            'notes': 'Contributed personal savings'
        }
        
        response = self.client.post(
            f'/api/activities/{activity.id}/participation/{self.member.id}',
            data=json.dumps(participation_data),
            content_type='application/json',
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        
        # Verify participation was recorded
        participation = MemberActivityParticipation.query.filter_by(
            activity_id=activity.id,
            member_id=self.member.id
        ).first()
        self.assertIsNotNone(participation)
        self.assertEqual(participation.amount, Decimal('10000'))
        self.assertEqual(participation.participation_type, 'CONTRIBUTED')

    def test_upload_activity_document(self):
        """Test uploading a document for an activity"""
        # Create activity
        activity = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS',
            activity_name='Personal Savings Collection',
            responsible_member_id=self.chairperson.id,
            status='IN_PROGRESS'
        )
        db.session.add(activity)
        db.session.commit()
        
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(b'Test PDF content')
            tmp_file_path = tmp_file.name
        
        try:
            with open(tmp_file_path, 'rb') as test_file:
                response = self.client.post(
                    f'/api/activities/{activity.id}/documents/upload',
                    data={
                        'file': (test_file, 'test_document.pdf'),
                        'document_type': 'HANDWRITTEN_RECORD',
                        'title': 'Test Savings Record',
                        'description': 'Test handwritten savings record',
                        'access_level': 'GROUP'
                    },
                    headers=self.auth_headers
                )
            
            self.assertEqual(response.status_code, 201)
            data = json.loads(response.data)
            self.assertEqual(data['status'], 'success')
            
            # Verify document was created
            document = ActivityDocument.query.filter_by(
                activity_id=activity.id
            ).first()
            self.assertIsNotNone(document)
            self.assertEqual(document.document_type, 'HANDWRITTEN_RECORD')
            
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)

    def test_get_activity_analytics(self):
        """Test getting activity analytics for a group"""
        # Create some test data
        activity1 = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS',
            activity_name='Personal Savings 1',
            responsible_member_id=self.chairperson.id,
            status='COMPLETED',
            start_time=datetime.now() - timedelta(minutes=30),
            end_time=datetime.now() - timedelta(minutes=15),
            duration_minutes=15,
            participation_rate=85.5
        )
        db.session.add(activity1)
        
        # Add transaction
        transaction = ActivityTransaction(
            activity_id=activity1.id,
            transaction_type='COLLECTION',
            amount=Decimal('25000'),
            description='Personal savings collection'
        )
        db.session.add(transaction)
        db.session.commit()
        
        response = self.client.get(
            f'/api/groups/{self.test_group.id}/activities/analytics',
            query_string={'time_range': '1month'},
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertIn('overview', data['data'])
        self.assertIn('activity_types', data['data'])
        self.assertIn('financial_summary', data['data'])

    def test_get_meeting_activities(self):
        """Test getting all activities for a meeting"""
        # Create test activities
        activity1 = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='PERSONAL_SAVINGS',
            activity_name='Personal Savings',
            responsible_member_id=self.chairperson.id,
            status='COMPLETED'
        )
        activity2 = MeetingActivity(
            meeting_id=self.test_meeting.id,
            activity_type='ATTENDANCE',
            activity_name='Attendance Recording',
            responsible_member_id=self.chairperson.id,
            status='PENDING'
        )
        db.session.add_all([activity1, activity2])
        db.session.commit()
        
        response = self.client.get(
            f'/api/meetings/{self.test_meeting.id}/activities',
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['data']['activities']), 2)

    def test_activity_workflow_integration(self):
        """Test complete activity workflow from creation to completion"""
        # 1. Create activity
        activity_data = {
            'activity_type': 'PERSONAL_SAVINGS',
            'activity_name': 'Personal Savings Collection',
            'description': 'Collect personal savings from members',
            'responsible_member_id': self.chairperson.id
        }
        
        response = self.client.post(
            f'/api/meetings/{self.test_meeting.id}/activities',
            data=json.dumps(activity_data),
            content_type='application/json',
            headers=self.auth_headers
        )
        
        self.assertEqual(response.status_code, 201)
        activity_id = json.loads(response.data)['data']['activity']['id']
        
        # 2. Start activity
        response = self.client.post(
            f'/api/activities/{activity_id}/start',
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200)
        
        # 3. Record member participation
        participation_data = {
            'participation_type': 'CONTRIBUTED',
            'amount': 15000,
            'status': 'COMPLETED'
        }
        
        response = self.client.post(
            f'/api/activities/{activity_id}/participation/{self.member.id}',
            data=json.dumps(participation_data),
            content_type='application/json',
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 201)
        
        # 4. Complete activity
        completion_data = {
            'outcomes': {
                'total_amount': 15000,
                'members_participated': 1,
                'challenges': 'None'
            }
        }
        
        response = self.client.post(
            f'/api/activities/{activity_id}/complete',
            data=json.dumps(completion_data),
            content_type='application/json',
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200)
        
        # 5. Verify final state
        activity = MeetingActivity.query.get(activity_id)
        self.assertEqual(activity.status, 'COMPLETED')
        self.assertIsNotNone(activity.start_time)
        self.assertIsNotNone(activity.end_time)
        
        # Verify participation was recorded
        participation = MemberActivityParticipation.query.filter_by(
            activity_id=activity_id,
            member_id=self.member.id
        ).first()
        self.assertIsNotNone(participation)
        self.assertEqual(participation.status, 'COMPLETED')


if __name__ == '__main__':
    unittest.main()
