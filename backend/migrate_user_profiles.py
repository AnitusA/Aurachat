#!/usr/bin/env python3

"""
Database migration script to add user profile fields
This script will create the user_profiles table with all the new fields
"""

import os
import sys
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Load environment variables
load_dotenv()

def create_user_profiles_table():
    """Create the user_profiles table with all required fields"""
    
    try:
        # Database connection
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'socialmedia_db'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', '')
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # Check if table exists
            cursor.execute("SHOW TABLES LIKE 'user_profiles'")
            table_exists = cursor.fetchone()
            
            if table_exists:
                print("✅ user_profiles table already exists")
                
                # Check and add missing columns
                cursor.execute("DESCRIBE user_profiles")
                existing_columns = [column[0] for column in cursor.fetchall()]
                
                required_columns = {
                    'phone': 'VARCHAR(20)',
                    'occupation': 'VARCHAR(100)',
                    'interests': 'TEXT',
                    'social_twitter': 'VARCHAR(200)',
                    'social_instagram': 'VARCHAR(200)', 
                    'social_linkedin': 'VARCHAR(200)',
                    'social_github': 'VARCHAR(200)',
                    'profile_visibility': 'VARCHAR(20) DEFAULT "public"',
                    'email_visibility': 'VARCHAR(20) DEFAULT "private"',
                    'phone_visibility': 'VARCHAR(20) DEFAULT "private"',
                    'show_online_status': 'BOOLEAN DEFAULT TRUE',
                    'allow_messages': 'BOOLEAN DEFAULT TRUE'
                }
                
                for column, definition in required_columns.items():
                    if column not in existing_columns:
                        alter_sql = f"ALTER TABLE user_profiles ADD COLUMN {column} {definition}"
                        cursor.execute(alter_sql)
                        print(f"✅ Added column: {column}")
                
                connection.commit()
                print("✅ user_profiles table updated with new fields")
                
            else:
                # Create the table
                create_table_sql = """
                CREATE TABLE user_profiles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    bio TEXT,
                    location VARCHAR(100),
                    website VARCHAR(200),
                    birth_date DATE,
                    phone VARCHAR(20),
                    occupation VARCHAR(100),
                    interests TEXT,
                    avatar_url VARCHAR(500),
                    theme_preference VARCHAR(20) DEFAULT 'system',
                    social_twitter VARCHAR(200),
                    social_instagram VARCHAR(200),
                    social_linkedin VARCHAR(200),
                    social_github VARCHAR(200),
                    profile_visibility VARCHAR(20) DEFAULT 'public',
                    email_visibility VARCHAR(20) DEFAULT 'private',
                    phone_visibility VARCHAR(20) DEFAULT 'private',
                    show_online_status BOOLEAN DEFAULT TRUE,
                    allow_messages BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id)
                )
                """
                
                cursor.execute(create_table_sql)
                connection.commit()
                print("✅ user_profiles table created successfully")
                
    except Error as e:
        print(f"❌ Error: {e}")
        return False
        
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
    
    return True

if __name__ == "__main__":
    print("🔄 Running user profiles migration...")
    
    if create_user_profiles_table():
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)