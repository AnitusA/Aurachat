from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Post, User, Like, Comment

posts_bp = Blueprint('posts', __name__)

@posts_bp.route('/', methods=['GET'])
def get_posts():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        posts = Post.query.order_by(Post.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        current_user = None
        if request.headers.get('Authorization'):
            try:
                from flask_jwt_extended import decode_token
                # This is simplified - you'd want proper token validation
                pass
            except:
                pass
        
        return jsonify({
            'posts': [post.to_dict(current_user) for post in posts.items],
            'total': posts.total,
            'pages': posts.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/', methods=['POST'])
@jwt_required()
def create_post():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        post = Post(
            content=data['content'],
            image_url=data.get('image'),
            user_id=user_id
        )
        
        db.session.add(post)
        db.session.commit()
        
        user = User.query.get(user_id)
        return jsonify({
            'message': 'Post created successfully',
            'post': post.to_dict(user)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/<int:post_id>', methods=['GET'])
def get_post(post_id):
    try:
        post = Post.query.get_or_404(post_id)
        
        current_user = None
        # Add proper auth check here if needed
        
        return jsonify({'post': post.to_dict(current_user)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    try:
        user_id = get_jwt_identity()
        post = Post.query.get_or_404(post_id)
        
        # Check if already liked
        existing_like = Like.query.filter_by(user_id=user_id, post_id=post_id).first()
        
        if existing_like:
            # Unlike the post
            db.session.delete(existing_like)
            action = 'unliked'
        else:
            # Like the post
            like = Like(user_id=user_id, post_id=post_id)
            db.session.add(like)
            action = 'liked'
        
        db.session.commit()
        
        return jsonify({
            'message': f'Post {action} successfully',
            'likes': post.get_like_count(),
            'is_liked': action == 'liked'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    try:
        post = Post.query.get_or_404(post_id)
        comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.desc()).all()
        
        return jsonify({
            'comments': [comment.to_dict() for comment in comments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/<int:post_id>/comments', methods=['POST'])
@jwt_required()
def create_comment(post_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        post = Post.query.get_or_404(post_id)
        
        comment = Comment(
            content=data['content'],
            user_id=user_id,
            post_id=post_id
        )
        
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({
            'message': 'Comment created successfully',
            'comment': comment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500