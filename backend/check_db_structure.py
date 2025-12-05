#!/usr/bin/env python3
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check post table structure
        result = db.session.execute(text('DESCRIBE post'))
        print("POST table structure:")
        for row in result.fetchall():
            print(row)
        
        print("\n" + "="*50 + "\n")
        
        # Check user table structure
        result = db.session.execute(text('DESCRIBE user'))
        print("USER table structure:")
        for row in result.fetchall():
            print(row)
            
    except Exception as e:
        print(f"Error: {e}")