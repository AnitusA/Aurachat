#!/usr/bin/env python3
"""
Database initialization script for AuraChat
Creates the database and tables if they don't exist
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models import User

def init_database():
    """Initialize the database with tables"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Connecting to database...")
            print(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
            # Test database connection
            with db.engine.connect() as connection:
                connection.execute(db.text("SELECT 1"))
            print("✓ Database connection successful")
            
            # Create all database tables
            print("Creating database tables...")
            db.create_all()
            print("✓ Database tables created successfully")
            
            print("\n🎉 Database initialization completed!")
            print("Your AuraChat database is ready to use.")
            print("\nYou can now register new users through the application.")
            
        except Exception as e:
            print(f"❌ Error connecting to database: {str(e)}")
            print("\nTroubleshooting steps:")
            print("1. Make sure MySQL server is running")
            print("2. Verify database credentials in .env file")
            print("3. Ensure the 'aurachat' database exists")
            print("\nIf using MySQL, create the database first:")
            print("CREATE DATABASE aurachat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print("\nFalling back to SQLite database for development...")
            return False
            
    return True

if __name__ == '__main__':
    init_database()