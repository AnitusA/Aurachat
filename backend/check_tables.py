from app import create_app, db
from sqlalchemy import inspect

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print('Tables in database:', tables)
    from app.models.models import Message
    print('Message table exists in metadata:', Message.__tablename__ in db.metadata.tables)
    print('Message table in database:', Message.__tablename__ in tables)