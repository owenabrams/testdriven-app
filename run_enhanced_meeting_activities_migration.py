#!/usr/bin/env python3
"""
🗄️ Enhanced Meeting Activities Migration Runner
Runs the database migration to create Enhanced Meeting Activities tables
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from datetime import datetime

# Database connection details
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'testdriven_dev'
DB_USER = os.getenv('USER')  # Current user

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        return None

def check_tables_exist(conn):
    """Check if Enhanced Meeting Activities tables already exist"""
    cursor = conn.cursor()
    
    tables_to_check = [
        'meeting_activities',
        'member_activity_participation', 
        'activity_documents',
        'activity_transactions'
    ]
    
    existing_tables = []
    for table in tables_to_check:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
        """, (table,))
        
        if cursor.fetchone()[0]:
            existing_tables.append(table)
    
    cursor.close()
    return existing_tables

def create_enhanced_meeting_activities_tables(conn):
    """Create Enhanced Meeting Activities tables"""
    cursor = conn.cursor()
    
    print("📋 Creating Enhanced Meeting Activities tables...")
    
    # 1. Meeting Activities Table
    print("  • Creating meeting_activities table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_activities (
            id SERIAL PRIMARY KEY,
            meeting_id INTEGER NOT NULL,
            activity_type VARCHAR(50) NOT NULL,
            description TEXT,
            amount DECIMAL(10,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'pending',
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_activity_type CHECK (activity_type IN (
                'savings_collection', 'loan_disbursement', 'loan_repayment', 
                'fine_collection', 'emergency_fund_contribution', 'social_fund_collection'
            )),
            CONSTRAINT check_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
        );
    """)
    
    # 2. Member Activity Participation Table
    print("  • Creating member_activity_participation table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS member_activity_participation (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER NOT NULL REFERENCES meeting_activities(id) ON DELETE CASCADE,
            member_id INTEGER NOT NULL,
            participation_type VARCHAR(50) NOT NULL,
            amount_contributed DECIMAL(10,2) DEFAULT 0.00,
            notes TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_participation_type CHECK (participation_type IN (
                'contributor', 'borrower', 'observer', 'facilitator'
            )),
            UNIQUE(activity_id, member_id)
        );
    """)
    
    # 3. Activity Documents Table
    print("  • Creating activity_documents table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_documents (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER NOT NULL REFERENCES meeting_activities(id) ON DELETE CASCADE,
            document_name VARCHAR(255) NOT NULL,
            document_path VARCHAR(500) NOT NULL,
            document_type VARCHAR(50),
            file_size INTEGER,
            uploaded_by INTEGER,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_document_type CHECK (document_type IN (
                'image', 'document', 'spreadsheet', 'pdf', 'other'
            ))
        );
    """)
    
    # Create indexes for performance
    print("  • Creating indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meeting_activities_meeting_id ON meeting_activities(meeting_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_member_participation_activity_id ON member_activity_participation(activity_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_documents_activity_id ON activity_documents(activity_id);")
    
    cursor.close()
    print("✅ Enhanced Meeting Activities tables created successfully!")

def insert_demo_data(conn):
    """Insert demo data into Enhanced Meeting Activities tables"""
    cursor = conn.cursor()
    
    print("📊 Inserting demo data...")
    
    # Insert demo activities
    demo_activities = [
        (1, 'savings_collection', 'Weekly savings collection', 500.00, 'completed'),
        (1, 'loan_disbursement', 'Emergency loan for Mary', 1000.00, 'completed'),
        (1, 'fine_collection', 'Late payment fine', 50.00, 'pending'),
        (2, 'savings_collection', 'Monthly savings collection', 2000.00, 'completed'),
        (2, 'loan_repayment', 'Loan repayment from John', 800.00, 'completed')
    ]
    
    for activity in demo_activities:
        cursor.execute("""
            INSERT INTO meeting_activities (meeting_id, activity_type, description, amount, status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, activity)
    
    # Insert demo participation
    demo_participation = [
        (1, 101, 'contributor', 100.00, 'Regular weekly contribution'),
        (1, 102, 'contributor', 150.00, 'Extra contribution this week'),
        (1, 103, 'contributor', 100.00, 'Regular weekly contribution'),
        (2, 102, 'borrower', 1000.00, 'Emergency loan approved'),
        (4, 101, 'contributor', 500.00, 'Monthly savings'),
        (4, 102, 'contributor', 600.00, 'Monthly savings + bonus'),
        (4, 103, 'contributor', 400.00, 'Monthly savings')
    ]
    
    for participation in demo_participation:
        cursor.execute("""
            INSERT INTO member_activity_participation (activity_id, member_id, participation_type, amount_contributed, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, participation)
    
    # Insert demo documents
    demo_documents = [
        (1, 'attendance_sheet.jpg', '/uploads/meeting1/attendance_sheet.jpg', 'image', 245760, 1),
        (1, 'savings_record.pdf', '/uploads/meeting1/savings_record.pdf', 'document', 102400, 1),
        (2, 'loan_application.pdf', '/uploads/meeting1/loan_application.pdf', 'document', 156800, 2),
        (4, 'monthly_summary.xlsx', '/uploads/meeting2/monthly_summary.xlsx', 'spreadsheet', 89600, 1)
    ]
    
    for document in demo_documents:
        cursor.execute("""
            INSERT INTO activity_documents (activity_id, document_name, document_path, document_type, file_size, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, document)
    
    cursor.close()
    print("✅ Demo data inserted successfully!")

def main():
    print("🗄️ Enhanced Meeting Activities Migration Runner")
    print("=" * 50)
    
    # Connect to database
    print("🔌 Connecting to PostgreSQL database...")
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database. Please ensure PostgreSQL is running.")
        return
    
    print(f"✅ Connected to database: {DB_NAME}")
    
    # Check existing tables
    existing_tables = check_tables_exist(conn)
    if existing_tables:
        print(f"⚠️  Some Enhanced Meeting Activities tables already exist: {existing_tables}")
        response = input("Do you want to continue anyway? (y/N): ")
        if response.lower() != 'y':
            print("❌ Migration cancelled.")
            conn.close()
            return
    
    try:
        # Create tables
        create_enhanced_meeting_activities_tables(conn)
        
        # Insert demo data
        insert_demo_data(conn)
        
        print("\n🎉 Enhanced Meeting Activities migration completed successfully!")
        print("\n📋 Summary:")
        print("  ✅ meeting_activities table created")
        print("  ✅ member_activity_participation table created") 
        print("  ✅ activity_documents table created")
        print("  ✅ Performance indexes created")
        print("  ✅ Demo data inserted")
        
        print(f"\n🔗 You can now:")
        print("  • Run your Flask application with Enhanced Meeting Activities")
        print("  • Use the API endpoints for CRUD operations")
        print("  • Upload documents and track member participation")
        print("  • Generate comprehensive activity reports")
        
    except psycopg2.Error as e:
        print(f"❌ Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
