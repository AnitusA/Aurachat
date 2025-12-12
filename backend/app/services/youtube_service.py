"""YouTube API Service for fetching shorts"""
import os
import requests
import re
import time
import hashlib
from flask import current_app
from functools import lru_cache

class YouTubeService:
    BASE_URL = "https://www.googleapis.com/youtube/v3"
    
    # Simple in-memory cache
    _cache = {}
    _cache_timeout = 300  # 5 minutes cache
    
    @staticmethod
    def _get_cache_key(query, max_results):
        """Generate cache key for query"""
        key_data = f"{query}:{max_results}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    @staticmethod
    def _get_cached_result(cache_key):
        """Get cached result if still valid"""
        if cache_key in YouTubeService._cache:
            cached_data, timestamp = YouTubeService._cache[cache_key]
            if time.time() - timestamp < YouTubeService._cache_timeout:
                return cached_data
            else:
                # Remove expired cache
                del YouTubeService._cache[cache_key]
        return None
    
    @staticmethod
    def _set_cached_result(cache_key, data):
        """Cache result with timestamp"""
        YouTubeService._cache[cache_key] = (data, time.time())
        
        # Limit cache size to prevent memory issues
        if len(YouTubeService._cache) > 50:
            # Remove oldest entries
            oldest_keys = sorted(YouTubeService._cache.keys(), 
                               key=lambda k: YouTubeService._cache[k][1])[:10]
            for key in oldest_keys:
                del YouTubeService._cache[key]
    
    @staticmethod
    def get_shorts(max_results=10, query="#shorts"):
        """
        Fetch YouTube Shorts with caching
        
        Args:
            max_results: Number of shorts to fetch (default: 10, max: 25)
            query: Search query (default: #shorts)
        
        Returns:
            dict: {'shorts': [...], 'error': None} or {'shorts': [], 'error': 'message'}
        """
        # Limit max_results for performance
        max_results = min(max_results, 25)
        
        # Check cache first
        cache_key = YouTubeService._get_cache_key(query, max_results)
        cached_result = YouTubeService._get_cached_result(cache_key)
        if cached_result:
            return cached_result
        
        api_key = os.getenv('YOUTUBE_API_KEY')
        
        if not api_key:
            return {'shorts': [], 'error': 'YouTube API key not configured'}
        
        # Optimized search parameters for faster response
        params = {
            'part': 'snippet',
            'type': 'video',
            'videoDuration': 'short',  # Videos under 4 minutes
            'maxResults': min(max_results, 10),  # Limit API results for speed
            'key': api_key,
            'q': query,
            'order': 'relevance',  # Changed from 'date' to 'relevance' for faster results
            'relevanceLanguage': 'en',
            'safeSearch': 'moderate'
        }
        
        try:
            # Reduced timeout for faster failure
            response = requests.get(f"{YouTubeService.BASE_URL}/search", params=params, timeout=5)
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
                        'thumbnail': snippet['thumbnails'].get('medium', snippet['thumbnails'].get('default', {})).get('url', ''),
                        'channel': snippet.get('channelTitle', 'Unknown'),
                        'channelId': snippet.get('channelId', ''),
                        'published_at': snippet.get('publishedAt', ''),
                        'video_url': f"https://www.youtube.com/shorts/{video_id}",
                        'embed_url': f"https://www.youtube.com/embed/{video_id}?autoplay=1&mute=1&loop=1&playlist={video_id}"
                    })
            
            result = {'shorts': shorts, 'error': None}
            
            # Cache the result
            YouTubeService._set_cached_result(cache_key, result)
            
            return result
            
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
    
    @staticmethod
    def search_videos(query, max_results=20):
        """
        Search for YouTube videos (not just shorts)
        
        Args:
            query: Search query
            max_results: Number of results
        
        Returns:
            dict: {'videos': [...], 'error': None}
        """
        try:
            api_key = os.getenv('YOUTUBE_API_KEY')
            if not api_key:
                return {'error': 'YouTube API key not configured', 'videos': []}
            
            cache_key = YouTubeService._get_cache_key(f"videos:{query}", max_results)
            cached_result = YouTubeService._get_cached_result(cache_key)
            if cached_result:
                return cached_result
            
            url = f"{YouTubeService.BASE_URL}/search"
            params = {
                'part': 'snippet',
                'q': query,
                'type': 'video',
                'maxResults': max_results,
                'key': api_key,
                'order': 'relevance',
                'safeSearch': 'moderate'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            videos = []
            
            for item in data.get('items', []):
                video_id = item['id']['videoId']
                snippet = item['snippet']
                
                videos.append({
                    'id': video_id,
                    'title': snippet['title'],
                    'description': snippet['description'][:200] + '...' if len(snippet['description']) > 200 else snippet['description'],
                    'thumbnail': snippet['thumbnails'].get('medium', snippet['thumbnails'].get('default', {}))['url'],
                    'channel_title': snippet['channelTitle'],
                    'published_at': snippet['publishedAt'],
                    'url': f'https://www.youtube.com/watch?v={video_id}'
                })
            
            result = {'videos': videos, 'error': None}
            YouTubeService._set_cached_result(cache_key, result)
            return result
            
        except requests.exceptions.RequestException as e:
            return {'error': f'YouTube API request failed: {str(e)}', 'videos': []}
        except Exception as e:
            return {'error': f'Failed to search videos: {str(e)}', 'videos': []}
