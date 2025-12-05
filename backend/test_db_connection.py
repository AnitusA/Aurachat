#!/usr/bin/env python3
"""
Database Connection Test Script
Tests MySQL connection and creates the socialmedia_db database if needed
"""

import os
import sys
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_connection():
    """Test MySQL connection using .env credentials"""
    
    # Get credentials from environment
    host = os.getenv('DB_HOST', 'localhost')
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'socialmedia_db')
    
    print(f"🔌 Testing MySQL connection...")
    print(f"   Host: {host}")
    print(f"   User: {user}")
    print(f"   Database: {database}")
    print(f"   Password: {'*' * len(password) if password else 'No password set'}")
    print()
    
    try:
        # First, connect without specifying database to create it if needed
        print("1️⃣ Testing basic MySQL connection...")
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password
        )
        cursor = connection.cursor()
        print("✅ MySQL connection successful!")
        
        # Check if database exists
        print(f"2️⃣ Checking if '{database}' database exists...")
        cursor.execute("SHOW DATABASES")
        databases = [db[0] for db in cursor.fetchall()]
        
        if database in databases:
            print(f"✅ Database '{database}' exists!")
        else:
            print(f"⚠️  Database '{database}' does not exist. Creating it...")
            cursor.execute(f"CREATE DATABASE {database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✅ Database '{database}' created successfully!")
        
        cursor.close()
        connection.close()
        
        # Now test connection to the specific database
        print(f"3️⃣ Testing connection to '{database}' database...")
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database
        )
        cursor = connection.cursor()
        
        # Check existing tables
        cursor.execute("SHOW TABLES")
        tables = [table[0] for table in cursor.fetchall()]
        
        print(f"✅ Connected to '{database}' database!")
        if tables:
            print(f"📊 Existing tables: {', '.join(tables)}")
        else:
            print("📊 No tables found in database (empty database)")
        
        # Test Flask SQLAlchemy connection format
        print("4️⃣ Testing Flask SQLAlchemy URI format...")
        from config import Config
        print(f"   URI: {Config.SQLALCHEMY_DATABASE_URI}")
        
        cursor.close()
        connection.close()
        
        print("\n🎉 All database connection tests passed!")
        return True
        
    except mysql.connector.Error as err:
        print(f"❌ MySQL Error: {err}")
        
        if err.errno == 1045:
            print("🔑 Authentication failed. Please check:")
            print("   - MySQL username is correct")
            print("   - MySQL password is correct") 
            print("   - User has necessary privileges")
        elif err.errno == 2003:
            print("🔌 Connection failed. Please check:")
            print("   - MySQL server is running")
            print("   - Host and port are correct")
            print("   - Firewall settings allow connection")
        
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def create_tables():
    """Create the social media tables if they don't exist"""
    
    host = os.getenv('DB_HOST', 'localhost')
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'socialmedia_db')
    
    try:
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database
        )
        cursor = connection.cursor()
        
        print("🏗️ Creating social media tables...")
        
        # User table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            profile_pic VARCHAR(255) DEFAULT 'default.jpg',
            bio TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        print("  ✅ User table ready")
        
        # Post table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS post (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
        )
        """)
        print("  ✅ Post table ready")
        
        # Like table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS `like` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_like (user_id, post_id),
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
        )
        """)
        print("  ✅ Like table ready")
        
        # Comment table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS comment (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
        )
        """)
        print("  ✅ Comment table ready")
        
        # Follow table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS follow (
            id INT AUTO_INCREMENT PRIMARY KEY,
            follower_id INT NOT NULL,
            following_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_follow (follower_id, following_id),
            CHECK (follower_id != following_id),
            FOREIGN KEY (follower_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES user(id) ON DELETE CASCADE
        )
        """)
        print("  ✅ Follow table ready")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("🎉 All tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🔍 AuraChat Database Connection Test")
    print("=" * 60)
    
    if test_connection():
        print("\n" + "=" * 60)
        print("Would you like to create/update the database tables? (y/n): ", end='')
        response = input().strip().lower()
        
        if response in ['y', 'yes']:
            if create_tables():
                print("\n🎉 Database setup complete! Your AuraChat is ready to use.")
            else:
                print("\n❌ Failed to create tables.")
        else:
            print("\n✅ Database connection verified. Tables can be created later.")
    else:
        print("\n❌ Database connection failed. Please check your MySQL setup.")
        sys.exit(1)