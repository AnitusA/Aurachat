import requests

# Test the search API
base_url = 'http://127.0.0.1:5000'

# First, let's login to get a session
login_data = {
    'email': 'anitus2006ajr@gmail.com',  # Using an existing user
    'password': 'password123'  # You'll need to use the actual password
}

session = requests.Session()

try:
    # Login
    login_response = session.post(f'{base_url}/auth/login', json=login_data)
    print(f"Login response: {login_response.status_code}")
    print(f"Login data: {login_response.json()}")

    # Test search for 'gopi'
    search_response = session.get(f'{base_url}/users/search?q=gopi')
    print(f"\nSearch response: {search_response.status_code}")
    print(f"Search results: {search_response.json()}")

    # Test search for 'gopal' (another user)
    search_response2 = session.get(f'{base_url}/users/search?q=gopal')
    print(f"\nSearch for 'gopal' response: {search_response2.status_code}")
    print(f"Search results: {search_response2.json()}")

except Exception as e:
    print(f"Error: {e}")