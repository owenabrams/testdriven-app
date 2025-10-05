#!/usr/bin/env python3
"""
Set proper passwords for all users in the microfinance system
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import secrets

# Password hashing functions (same as in main app)
def hash_password(password):
    """Hash a password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + password_hash.hex()

# Database connection
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='testdriven_dev',
            user='abe',
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

# User credentials to set
USER_PASSWORDS = {
    'admin@savingsgroup.com': 'admin123',
    'mary@email.com': 'mary123',
    'john@email.com': 'john123', 
    'sarah@email.com': 'sarah123',
    'peter@email.com': 'peter123',
    'jane@email.com': 'jane123',
    'david@email.com': 'david123',
    'grace@email.com': 'grace123',
    'finaltest@system.com': 'test123',
    'newmember@email.com': 'member123',
    'testuser@complete.com': 'complete123'
}

def main():
    print("🔐 Setting up proper password authentication...")
    
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return
    
    cursor = conn.cursor()
    
    try:
        # Update passwords for all users
        updated_count = 0
        
        for email, password in USER_PASSWORDS.items():
            # Hash the password
            hashed_password = hash_password(password)
            
            # Update user password
            cursor.execute("""
                UPDATE users 
                SET password = %s 
                WHERE email = %s
            """, (hashed_password, email))
            
            if cursor.rowcount > 0:
                print(f"✅ Updated password for {email}")
                updated_count += 1
            else:
                print(f"⚠️  User not found: {email}")
        
        # Commit changes
        conn.commit()
        
        print(f"\n🎉 Successfully updated passwords for {updated_count} users!")
        print("\n📋 LOGIN CREDENTIALS:")
        print("=" * 50)
        
        # Display all users with their roles
        cursor.execute("""
            SELECT email, username, role 
            FROM users 
            WHERE active = true 
            ORDER BY 
                CASE role 
                    WHEN 'super_admin' THEN 1 
                    WHEN 'admin' THEN 2 
                    WHEN 'chairperson' THEN 3 
                    WHEN 'secretary' THEN 4 
                    WHEN 'treasurer' THEN 5 
                    ELSE 6 
                END, username
        """)
        
        users = cursor.fetchall()
        
        for user in users:
            email = user['email']
            if email in USER_PASSWORDS:
                password = USER_PASSWORDS[email]
                role = user['role'].replace('_', ' ').title()
                print(f"👤 {role}")
                print(f"   Email: {email}")
                print(f"   Password: {password}")
                print(f"   Username: {user['username']}")
                print()
        
        print("🚀 You can now login with these credentials!")
        print("🌐 Frontend: http://localhost:3000")
        print("🔗 Backend: http://localhost:5001")
        
    except Exception as e:
        print(f"❌ Error updating passwords: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == '__main__':
    main()
