#!/usr/bin/env python3
"""
Database migration script for AuraChat.
Run this script to perform database migrations.
"""

import os
import sys

# Add the parent directory to Python path to import our app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User

def update_schema():
    """Update database schema with any new columns"""
    app = create_app()
    
    with app.app_context():
        print("Checking database schema...")
        
        try:
            # Check if we need to add new columns to user table
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('user')]
            
            # Add any missing columns
            if 'bio' not in columns:
                print("Adding bio column...")
                db.engine.execute('ALTER TABLE user ADD COLUMN bio TEXT')
            
            if 'profile_pic' not in columns:
                print("Adding profile_pic column...")
                db.engine.execute("ALTER TABLE user ADD COLUMN profile_pic VARCHAR(200) DEFAULT 'default.jpg'")
            
            if 'is_private' not in columns:
                print("Adding is_private column...")
                db.engine.execute('ALTER TABLE user ADD COLUMN is_private BOOLEAN DEFAULT FALSE')
            
            if 'theme' not in columns:
                print("Adding theme column...")
                db.engine.execute("ALTER TABLE user ADD COLUMN theme VARCHAR(20) DEFAULT 'light'")
                
            print("Database schema updated successfully!")
            
        except Exception as e:
            print(f"Error updating schema: {e}")
            return False
        
        print("Migration completed successfully!")
        return True

def recreate_tables():
    """Recreate all tables with the new schema"""
    app = create_app()
    
    with app.app_context():
        print("Recreating database tables...")
        
        # Drop all tables and recreate them
        db.drop_all()
        db.create_all()
        
        print("Database tables recreated successfully!")
        return True

if __name__ == '__main__':
    print("AuraChat Database Migration")
    print("=" * 40)
    
    choice = input("Choose migration option:\n1. Update schema (add new columns)\n2. Recreate all tables\nEnter choice (1 or 2): ")
    
    if choice == '1':
        if update_schema():
            print("\n✅ Migration completed successfully!")
        else:
            print("\n❌ Migration failed!")
    elif choice == '2':
        confirm = input("⚠️  This will delete all existing data! Are you sure? (yes/no): ")
        if confirm.lower() == 'yes':
            if recreate_tables():
                print("\n✅ Database recreated successfully!")
            else:
                print("\n❌ Database recreation failed!")
        else:
            print("Operation cancelled.")
    else:
        print("Invalid choice!")