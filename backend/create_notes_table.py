"""Create notes table in database"""
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = ''
DB_NAME = 'socialmedia_db'

try:
    # Connect to database
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    print(f"✅ Connected to database: {DB_NAME}")
    
    with connection.cursor() as cursor:
        # Create notes table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS note (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content TEXT,
            music_name VARCHAR(255),
            music_artist VARCHAR(255),
            music_preview_url VARCHAR(500),
            music_image VARCHAR(500),
            spotify_track_id VARCHAR(100),
            spotify_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_expires_at (expires_at),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB;
        """
        
        cursor.execute(create_table_sql)
        connection.commit()
        print("✅ Notes table created successfully!")
        
        # Verify table exists
        cursor.execute("SHOW TABLES LIKE 'note'")
        result = cursor.fetchone()
        if result:
            print("✅ Verified: 'note' table exists")
            
            # Show table structure
            cursor.execute("DESCRIBE note")
            columns = cursor.fetchall()
            print("\n📊 Table structure:")
            for col in columns:
                print(f"  - {col['Field']}: {col['Type']}")
        
    connection.close()
    print("\n🎉 Database migration completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
