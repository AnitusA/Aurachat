"""Spotify API Service for music search"""
import os
import requests
import base64
from datetime import datetime, timedelta
from flask import current_app

class SpotifyService:
    BASE_URL = "https://api.spotify.com/v1"
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    
    _access_token = None
    _token_expires = None
    
    @classmethod
    def get_access_token(cls):
        """Get Spotify access token using Client Credentials Flow"""
        if cls._access_token and cls._token_expires and cls._token_expires > datetime.now():
            return cls._access_token
        
        client_id = os.getenv('SPOTIFY_CLIENT_ID')
        client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            raise ValueError('Spotify credentials not configured')
        
        # Encode credentials
        auth_str = f"{client_id}:{client_secret}"
        auth_bytes = auth_str.encode('utf-8')
        auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {'grant_type': 'client_credentials'}
        
        try:
            response = requests.post(cls.TOKEN_URL, headers=headers, data=data, timeout=10)
            response.raise_for_status()
            
            token_data = response.json()
            cls._access_token = token_data['access_token']
            cls._token_expires = datetime.now() + timedelta(seconds=token_data['expires_in'] - 60)
            
            return cls._access_token
            
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Spotify auth error: {str(e)}")
            raise
    
    @classmethod
    def search_tracks(cls, query, limit=10):
        """
        Search for tracks on Spotify
        
        Args:
            query: Search query string
            limit: Maximum number of results (default: 10)
        
        Returns:
            list: List of track dictionaries
        """
        try:
            token = cls.get_access_token()
            
            headers = {'Authorization': f'Bearer {token}'}
            params = {
                'q': query,
                'type': 'track',
                'limit': limit,
                'market': 'US'
            }
            
            response = requests.get(f"{cls.BASE_URL}/search", headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            tracks = []
            tracks_with_preview = []
            tracks_without_preview = []
            
            for item in data.get('tracks', {}).get('items', []):
                track_data = {
                    'id': item['id'],
                    'name': item['name'],
                    'artist': ', '.join([artist['name'] for artist in item['artists']]),
                    'album': item['album']['name'],
                    'preview_url': item.get('preview_url'),
                    'image': item['album']['images'][0]['url'] if item['album']['images'] else None,
                    'spotify_url': item['external_urls']['spotify'],
                    'duration_ms': item['duration_ms']
                }
                
                # Prioritize tracks with preview URLs
                if track_data['preview_url']:
                    tracks_with_preview.append(track_data)
                else:
                    tracks_without_preview.append(track_data)
            
            # Return tracks with previews first, then others
            tracks = tracks_with_preview + tracks_without_preview
            
            return tracks
            
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Spotify search error: {str(e)}")
            return []
        except Exception as e:
            current_app.logger.error(f"Unexpected Spotify error: {str(e)}")
            return []
    
    @classmethod
    def get_track(cls, track_id):
        """
        Get track details by ID
        
        Args:
            track_id: Spotify track ID
        
        Returns:
            dict: Track details or None
        """
        try:
            token = cls.get_access_token()
            
            headers = {'Authorization': f'Bearer {token}'}
            
            response = requests.get(f"{cls.BASE_URL}/tracks/{track_id}", headers=headers, timeout=10)
            response.raise_for_status()
            
            item = response.json()
            
            return {
                'id': item['id'],
                'name': item['name'],
                'artist': ', '.join([artist['name'] for artist in item['artists']]),
                'album': item['album']['name'],
                'preview_url': item.get('preview_url'),
                'image': item['album']['images'][0]['url'] if item['album']['images'] else None,
                'spotify_url': item['external_urls']['spotify'],
                'duration_ms': item['duration_ms']
            }
            
        except Exception as e:
            current_app.logger.error(f"Error fetching track: {str(e)}")
            return None
