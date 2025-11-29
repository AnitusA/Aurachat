import React from 'react';

const PostCard = ({ post }) => {
  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-avatar">
          {post.author[0].toUpperCase()}
        </div>
        <div>
          <strong>{post.author}</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {new Date(post.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="post-content">
        <p>{post.content}</p>
        {post.image && (
          <img 
            src={post.image} 
            alt="Post content" 
            style={{ width: '100%', borderRadius: '4px', marginTop: '0.5rem' }}
          />
        )}
      </div>
      <div className="post-actions">
        <button className="post-action">👍 Like ({post.likes || 0})</button>
        <button className="post-action">💬 Comment ({post.comments || 0})</button>
        <button className="post-action">🔗 Share</button>
      </div>
    </div>
  );
};

export default PostCard;