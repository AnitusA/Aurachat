from app import create_app, db
import io
import base64

app = create_app()
with app.app_context():
    client = app.test_client()

    # Register a test user
    resp = client.post('/api/auth/register', json={
        'username': 'test_uploader',
        'email': 'test_uploader@example.com',
        'password': 'password123'
    })
    print('Register:', resp.status_code, resp.get_json())

    # Now post an image
    # Create a small PNG binary (1x1 pixel) base64
    png_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBg9K5G4kAAAAASUVORK5CYII='
    png_bytes = base64.b64decode(png_b64)
    data = {
        'image': (io.BytesIO(png_bytes), 'test.png')
    }
    resp2 = client.post('/api/posts/upload_image', content_type='multipart/form-data', data=data)
    print('Upload:', resp2.status_code, resp2.get_json())

    # Create a post referencing returned URL
    image_url = resp2.get_json().get('image_url')
    resp3 = client.post('/api/posts', json={'content': 'post with image', 'image_url': image_url})
    print('Create post:', resp3.status_code, resp3.get_json())

    # Fetch posts
    resp4 = client.get('/api/posts')
    print('Posts:', resp4.status_code, resp4.get_json())
