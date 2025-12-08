from app import create_app, db
from app.models.models import User

app = create_app()

with app.app_context():
    users = User.query.all()
    print(f"Total users in database: {len(users)}")
    print("\nAll users:")
    for user in users:
        print(f"ID: {user.id}, Username: {user.username}, Email: {user.email}")

    # Check specifically for 'gopi'
    gopi_user = User.query.filter_by(username='gopi').first()
    if gopi_user:
        print(f"\nFound user 'gopi': ID={gopi_user.id}, Email={gopi_user.email}")
    else:
        print("\nUser 'gopi' not found in database")

    # Check for partial matches
    gopi_like = User.query.filter(User.username.contains('gopi')).all()
    if gopi_like:
        print(f"\nUsers containing 'gopi': {[u.username for u in gopi_like]}")
    else:
        print("\nNo users found containing 'gopi'")