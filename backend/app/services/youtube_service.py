"""YouTube API Service for fetching shorts"""
import os
import requests
import re
from flask import current_app

class YouTubeService:
    BASE_URL = "https://www.googleapis.com/youtube/v3"
    
    @staticmethod
    def get_shorts(max_results=20, query="#shorts"):
        """
        Fetch YouTube Shorts
        
        Args:
            max_results: Number of shorts to fetch (default: 20)
            query: Search query (default: #shorts)
        
        Returns:
            dict: {'shorts': [...], 'error': None} or {'shorts': [], 'error': 'message'}
        """
        api_key = os.getenv('YOUTUBE_API_KEY')
        
        if not api_key:
            return {'shorts': [], 'error': 'YouTube API key not configured'}
        
        # Search for shorts (videos under 60 seconds with #shorts)
        params = {
            'part': 'snippet',
            'type': 'video',
            'videoDuration': 'short',  # Videos under 4 minutes
            'maxResults': max_results,
            'key': api_key,
            'q': query,
            'order': 'date',
            'relevanceLanguage': 'en'
        }
        
        try:
            response = requests.get(f"{YouTubeService.BASE_URL}/search", params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            shorts = []
            for item in data.get('items', []):
                video_id = item['id'].get('videoId')
                if video_id:
                    snippet = item['snippet']
                    shorts.append({
                        'id': video_id,
                        'title': snippet.get('title', 'Untitled'),
                        'description': snippet.get('description', ''),
                        'thumbnail': snippet['thumbnails'].get('high', {}).get('url', ''),
                        'channel': snippet.get('channelTitle', 'Unknown'),
                        'channelId': snippet.get('channelId', ''),
                        'published_at': snippet.get('publishedAt', ''),
                        'video_url': f"https://www.youtube.com/shorts/{video_id}",
                        'embed_url': f"https://www.youtube.com/embed/{video_id}?autoplay=1&mute=1&loop=1&playlist={video_id}"
                    })
            
            return {'shorts': shorts, 'error': None}
            
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"YouTube API error: {str(e)}")
            return {'shorts': [], 'error': f'Failed to fetch shorts: {str(e)}'}
        except Exception as e:
            current_app.logger.error(f"Unexpected error: {str(e)}")
            return {'shorts': [], 'error': f'Unexpected error: {str(e)}'}
    
    @staticmethod
    def extract_video_id(url):
        """
        Extract video ID from YouTube URL
        
        Args:
            url: YouTube URL (shorts, watch, embed, etc.)
        
        Returns:
            str: Video ID or None
        """
        patterns = [
            r'(?:youtube\.com\/shorts\/)([^&\n?#]+)',
            r'(?:youtube\.com\/watch\?v=)([^&\n?#]+)',
            r'(?:youtu\.be\/)([^&\n?#]+)',
            r'(?:youtube\.com\/embed\/)([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    @staticmethod
    def get_trending_shorts(max_results=20):
        """
        Get trending YouTube Shorts
        
        Args:
            max_results: Number of shorts to fetch
        
        Returns:
            dict: {'shorts': [...], 'error': None}
        """
        return YouTubeService.get_shorts(max_results=max_results, query="shorts trending")
    
    @staticmethod
    def search_shorts(query, max_results=20):
        """
        Search for specific YouTube Shorts
        
        Args:
            query: Search query
            max_results: Number of results
        
        Returns:
            dict: {'shorts': [...], 'error': None}
        """
        return YouTubeService.get_shorts(max_results=max_results, query=f"{query} #shorts")
