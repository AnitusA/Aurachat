from app import create_app, db
from sqlalchemy import text

app = create_app()
app.app_context().push()

# Add new columns to message table
try:
    db.session.execute(text("ALTER TABLE message ADD COLUMN message_type VARCHAR(20) DEFAULT 'text'"))
    print("Added message_type column")
except Exception as e:
    print(f"message_type column may already exist: {e}")

try:
    db.session.execute(text("ALTER TABLE message ADD COLUMN media_url VARCHAR(500)"))
    print("Added media_url column")
except Exception as e:
    print(f"media_url column may already exist: {e}")

try:
    db.session.execute(text("ALTER TABLE message ADD COLUMN media_path VARCHAR(500)"))
    print("Added media_path column")
except Exception as e:
    print(f"media_path column may already exist: {e}")

try:
    db.session.execute(text("ALTER TABLE message ADD COLUMN delete_after_24h BOOLEAN DEFAULT FALSE"))
    print("Added delete_after_24h column")
except Exception as e:
    print(f"delete_after_24h column may already exist: {e}")

try:
    db.session.execute(text("ALTER TABLE message ADD COLUMN delete_after_viewing BOOLEAN DEFAULT FALSE"))
    print("Added delete_after_viewing column")
except Exception as e:
    print(f"delete_after_viewing column may already exist: {e}")

try:
    db.session.execute(text("ALTER TABLE message ADD COLUMN expires_at DATETIME"))
    print("Added expires_at column")
except Exception as e:
    print(f"expires_at column may already exist: {e}")

try:
    db.session.execute(text("ALTER TABLE message MODIFY content TEXT NULL"))
    print("Modified content column to allow NULL")
except Exception as e:
    print(f"Error modifying content column: {e}")

db.session.commit()
print("\nDatabase updated successfully!")
