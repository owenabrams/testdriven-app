#!/usr/bin/env python3
"""
Professional Database Migration Validation Script
Validates that database migrations have been applied correctly to Aurora PostgreSQL
"""

import os
import sys
import logging
import psycopg2
import psycopg2.extras
from urllib.parse import urlparse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MigrationValidator:
    """Professional migration validation for Aurora PostgreSQL"""
    
    def __init__(self, database_url=None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.connection = None
        self.validation_results = []
    
    def connect(self):
        """Establish connection to Aurora PostgreSQL"""
        try:
            logger.info("Connecting to Aurora PostgreSQL...")
            self.connection = psycopg2.connect(
                self.database_url,
                cursor_factory=psycopg2.extras.RealDictCursor,
                connect_timeout=30
            )
            self.connection.autocommit = True
            logger.info("✅ Successfully connected to Aurora PostgreSQL")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to Aurora PostgreSQL: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
    
    def validate_migration_table(self):
        """Validate that the migration tracking table exists and is properly structured"""
        logger.info("Validating migration tracking table...")
        
        try:
            cursor = self.connection.cursor()
            
            # Check if alembic_version table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'alembic_version'
                );
            """)
            
            table_exists = cursor.fetchone()['exists']
            
            if not table_exists:
                self.validation_results.append({
                    'test': 'migration_table_exists',
                    'status': 'FAILED',
                    'message': 'alembic_version table does not exist'
                })
                return False
            
            # Check table structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'alembic_version'
                ORDER BY ordinal_position;
            """)
            
            columns = cursor.fetchall()
            expected_columns = {'version_num': 'character varying'}
            
            for col in columns:
                if col['column_name'] in expected_columns:
                    if col['data_type'] != expected_columns[col['column_name']]:
                        self.validation_results.append({
                            'test': 'migration_table_structure',
                            'status': 'FAILED',
                            'message': f"Column {col['column_name']} has incorrect type: {col['data_type']}"
                        })
                        return False
            
            self.validation_results.append({
                'test': 'migration_table_validation',
                'status': 'PASSED',
                'message': 'Migration tracking table is properly structured'
            })
            
            logger.info("✅ Migration tracking table validation passed")
            return True
            
        except Exception as e:
            self.validation_results.append({
                'test': 'migration_table_validation',
                'status': 'ERROR',
                'message': f"Error validating migration table: {e}"
            })
            logger.error(f"❌ Migration table validation failed: {e}")
            return False
    
    def validate_current_migration(self):
        """Validate that the current migration version is applied"""
        logger.info("Validating current migration version...")
        
        try:
            cursor = self.connection.cursor()
            
            # Get current migration version
            cursor.execute("SELECT version_num FROM alembic_version;")
            result = cursor.fetchone()
            
            if not result:
                self.validation_results.append({
                    'test': 'current_migration',
                    'status': 'FAILED',
                    'message': 'No migration version found in database'
                })
                return False
            
            current_version = result['version_num']
            logger.info(f"Current migration version: {current_version}")
            
            self.validation_results.append({
                'test': 'current_migration',
                'status': 'PASSED',
                'message': f'Current migration version: {current_version}'
            })
            
            return True
            
        except Exception as e:
            self.validation_results.append({
                'test': 'current_migration',
                'status': 'ERROR',
                'message': f"Error validating current migration: {e}"
            })
            logger.error(f"❌ Current migration validation failed: {e}")
            return False
    
    def validate_table_structure(self):
        """Validate that expected tables exist with correct structure"""
        logger.info("Validating table structure...")
        
        expected_tables = ['users']  # Add more tables as needed
        
        try:
            cursor = self.connection.cursor()
            
            for table_name in expected_tables:
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, (table_name,))
                
                table_exists = cursor.fetchone()['exists']
                
                if not table_exists:
                    self.validation_results.append({
                        'test': f'table_{table_name}_exists',
                        'status': 'FAILED',
                        'message': f'Table {table_name} does not exist'
                    })
                    continue
                
                # Get table columns
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position;
                """, (table_name,))
                
                columns = cursor.fetchall()
                logger.info(f"Table {table_name} has {len(columns)} columns")
                
                self.validation_results.append({
                    'test': f'table_{table_name}_structure',
                    'status': 'PASSED',
                    'message': f'Table {table_name} exists with {len(columns)} columns'
                })
            
            logger.info("✅ Table structure validation completed")
            return True
            
        except Exception as e:
            self.validation_results.append({
                'test': 'table_structure_validation',
                'status': 'ERROR',
                'message': f"Error validating table structure: {e}"
            })
            logger.error(f"❌ Table structure validation failed: {e}")
            return False
    
    def validate_indexes(self):
        """Validate that expected indexes exist"""
        logger.info("Validating database indexes...")
        
        try:
            cursor = self.connection.cursor()
            
            # Get all indexes
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname;
            """)
            
            indexes = cursor.fetchall()
            logger.info(f"Found {len(indexes)} indexes in the database")
            
            self.validation_results.append({
                'test': 'index_validation',
                'status': 'PASSED',
                'message': f'Found {len(indexes)} indexes in the database'
            })
            
            return True
            
        except Exception as e:
            self.validation_results.append({
                'test': 'index_validation',
                'status': 'ERROR',
                'message': f"Error validating indexes: {e}"
            })
            logger.error(f"❌ Index validation failed: {e}")
            return False
    
    def validate_constraints(self):
        """Validate that expected constraints exist"""
        logger.info("Validating database constraints...")
        
        try:
            cursor = self.connection.cursor()
            
            # Get all constraints
            cursor.execute("""
                SELECT 
                    tc.table_name,
                    tc.constraint_name,
                    tc.constraint_type
                FROM information_schema.table_constraints tc
                WHERE tc.table_schema = 'public'
                ORDER BY tc.table_name, tc.constraint_name;
            """)
            
            constraints = cursor.fetchall()
            logger.info(f"Found {len(constraints)} constraints in the database")
            
            self.validation_results.append({
                'test': 'constraint_validation',
                'status': 'PASSED',
                'message': f'Found {len(constraints)} constraints in the database'
            })
            
            return True
            
        except Exception as e:
            self.validation_results.append({
                'test': 'constraint_validation',
                'status': 'ERROR',
                'message': f"Error validating constraints: {e}"
            })
            logger.error(f"❌ Constraint validation failed: {e}")
            return False
    
    def run_all_validations(self):
        """Run all migration validations"""
        logger.info("🔍 Starting comprehensive migration validation...")
        
        if not self.connect():
            return False
        
        try:
            validations = [
                self.validate_migration_table,
                self.validate_current_migration,
                self.validate_table_structure,
                self.validate_indexes,
                self.validate_constraints
            ]
            
            all_passed = True
            for validation in validations:
                if not validation():
                    all_passed = False
            
            return all_passed
            
        finally:
            self.disconnect()
    
    def print_results(self):
        """Print validation results"""
        print("\n" + "="*60)
        print("🔍 MIGRATION VALIDATION RESULTS")
        print("="*60)
        
        passed = 0
        failed = 0
        errors = 0
        
        for result in self.validation_results:
            status_icon = {
                'PASSED': '✅',
                'FAILED': '❌',
                'ERROR': '⚠️'
            }.get(result['status'], '❓')
            
            print(f"{status_icon} {result['test']}: {result['message']}")
            
            if result['status'] == 'PASSED':
                passed += 1
            elif result['status'] == 'FAILED':
                failed += 1
            else:
                errors += 1
        
        print("\n" + "-"*60)
        print(f"📊 SUMMARY: {passed} passed, {failed} failed, {errors} errors")
        print("-"*60)
        
        return failed == 0 and errors == 0

def main():
    """Main execution function"""
    try:
        validator = MigrationValidator()
        
        # Run all validations
        success = validator.run_all_validations()
        
        # Print results
        final_success = validator.print_results()
        
        if success and final_success:
            logger.info("🎉 All migration validations passed!")
            sys.exit(0)
        else:
            logger.error("❌ Migration validation failed!")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Migration validation error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
