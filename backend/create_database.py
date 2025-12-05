"""
Simple database creation script for AuraChat Social Media
Run this script to create the socialmedia_db database and tables
"""

import mysql.connector
import sys

def create_database():
    """Create the socialmedia_db database and tables"""
    
    # Database connection (update password as needed)
    connection_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',  # Add your MySQL password here if needed
    }
    
    try:
        # Connect to MySQL
        print("🔌 Connecting to MySQL...")
        connection = mysql.connector.connect(**connection_config)
        cursor = connection.cursor()
        
        # Create database
        print("🗃️ Creating database...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS socialmedia_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print("✅ Database 'socialmedia_db' created successfully!")
        
        # Use the database
        cursor.execute("USE socialmedia_db")
        
        # Create tables using the exact SQL schema
        print("📊 Creating tables...")
        
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
        print("  ✅ User table created")
        
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
        print("  ✅ Post table created")
        
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
        print("  ✅ Like table created")
        
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
        print("  ✅ Comment table created")
        
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
        print("  ✅ Follow table created")
        
        # Add some sample data
        print("📝 Adding sample data...")
        
        # Check if users exist
        cursor.execute("SELECT COUNT(*) FROM user")
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            # Add sample users
            sample_users = [
                ('john_doe', 'john@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8CZk0ZrK.i', 'default.jpg', 'Love coding and social media!'),
                ('jane_smith', 'jane@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8CZk0ZrK.i', 'default.jpg', 'Designer and tech enthusiast'),
                ('mike_wilson', 'mike@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8CZk0ZrK.i', 'default.jpg', 'Full-stack developer')
            ]
            
            cursor.executemany("""
                INSERT INTO user (username, email, password_hash, profile_pic, bio) 
                VALUES (%s, %s, %s, %s, %s)
            """, sample_users)
            
            # Add sample posts
            sample_posts = [
                (1, 'Welcome to AuraChat! Excited to be here and connect with everyone.'),
                (2, 'Just finished working on a new design project. Love the creative process!'),
                (3, 'Building amazing web applications with Flask and React. #coding')
            ]
            
            cursor.executemany("""
                INSERT INTO post (user_id, content) VALUES (%s, %s)
            """, sample_posts)
            
            # Add sample follows
            sample_follows = [
                (1, 2),  # john follows jane
                (1, 3),  # john follows mike
                (2, 3)   # jane follows mike
            ]
            
            cursor.executemany("""
                INSERT INTO follow (follower_id, following_id) VALUES (%s, %s)
            """, sample_follows)
            
            print("  ✅ Sample data added!")
        else:
            print("  ℹ️ Database already contains data, skipping sample data.")
        
        # Commit changes
        connection.commit()
        
        print("\n🎉 Database setup completed successfully!")
        print("📍 Database: socialmedia_db")
        print("🏗️ Tables: user, post, like, comment, follow")
        print("👥 Sample users: john_doe, jane_smith, mike_wilson (password: password)")
        print("✨ Your AuraChat social media platform database is ready!")
        
    except mysql.connector.Error as err:
        print(f"❌ Database error: {err}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 MySQL connection closed.")
    
    return True

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 AuraChat Social Media Database Setup")
    print("=" * 60)
    print("💡 Make sure MySQL is running and update the password in this script if needed.")
    print()
    
    if create_database():
        print("\n" + "=" * 60)
        print("✅ Setup completed! You can now:")
        print("1. Start the Flask backend server")
        print("2. Start the React frontend")
        print("3. Test the social media features")
        print("=" * 60)
    else:
        print("\n❌ Setup failed. Please check MySQL connection and try again.")
        sys.exit(1)