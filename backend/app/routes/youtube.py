"""YouTube Shorts routes for AuraChat"""
from flask import Blueprint, jsonify, request, session
from app.services.youtube_service import YouTubeService

youtube_bp = Blueprint('youtube', __name__)

@youtube_bp.route('/api/youtube/shorts', methods=['GET'])
def get_shorts():
    """
    Fetch YouTube Shorts
    
    Query params:
        - max_results: Number of shorts (default: 20)
        - query: Search query (default: #shorts)
    """
    # Allow public access for YouTube shorts (no auth required)
    # This makes it work even for demo users
    
    max_results = request.args.get('max_results', 20, type=int)
    query = request.args.get('query', '#shorts')
    
    # Limit max_results to prevent abuse
    max_results = min(max_results, 50)
    
    result = YouTubeService.get_shorts(max_results=max_results, query=query)
    
    if result.get('error'):
        return jsonify(result), 500
    
    return jsonify(result), 200

@youtube_bp.route('/api/youtube/shorts/trending', methods=['GET'])
def get_trending_shorts():
    """Get trending YouTube Shorts"""
    # Allow public access
    max_results = request.args.get('max_results', 20, type=int)
    max_results = min(max_results, 50)
    
    result = YouTubeService.get_trending_shorts(max_results=max_results)
    
    if result.get('error'):
        return jsonify(result), 500
    
    return jsonify(result), 200

@youtube_bp.route('/api/youtube/shorts/search', methods=['GET'])
def search_shorts():
    """
    Search YouTube Shorts
    
    Query params:
        - q: Search query (required)
        - max_results: Number of results (default: 20)
    """
    # Allow public access
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Query parameter "q" is required'}), 400
    
    max_results = request.args.get('max_results', 20, type=int)
    max_results = min(max_results, 50)
    
    result = YouTubeService.search_shorts(query=query, max_results=max_results)
    
    if result.get('error'):
        return jsonify(result), 500
    
    return jsonify(result), 200
