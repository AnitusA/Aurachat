"""Add lyric annotation columns to note table"""
import sys
from app import create_app, db

def add_lyric_columns():
    """Add lyric_snippet and timestamp columns to note table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if columns already exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('note')]
            
            print("Current columns in 'note' table:", columns)
            
            # Add columns if they don't exist
            if 'lyric_snippet' not in columns:
                print("Adding 'lyric_snippet' column...")
                with db.engine.connect() as conn:
                    conn.execute(db.text('ALTER TABLE note ADD COLUMN lyric_snippet VARCHAR(500)'))
                    conn.commit()
                print("✓ Added 'lyric_snippet' column")
            else:
                print("✓ Column 'lyric_snippet' already exists")
            
            if 'timestamp' not in columns:
                print("Adding 'timestamp' column...")
                with db.engine.connect() as conn:
                    conn.execute(db.text('ALTER TABLE note ADD COLUMN timestamp VARCHAR(20)'))
                    conn.commit()
                print("✓ Added 'timestamp' column")
            else:
                print("✓ Column 'timestamp' already exists")
            
            # Verify the changes
            inspector = inspect(db.engine)
            new_columns = [col['name'] for col in inspector.get_columns('note')]
            print("\nUpdated columns in 'note' table:", new_columns)
            
            print("\n✓ Database migration completed successfully!")
            
        except Exception as e:
            print(f"\n✗ Error during migration: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    add_lyric_columns()
