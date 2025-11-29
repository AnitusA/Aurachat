import React, { useState } from 'react';

const PostForm = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit({ content, image });
      setContent('');
      setImage('');
    }
  };

  return (
    <div className="post-form">
      <h3>What's on your mind?</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            required
          />
        </div>
        <div className="form-group">
          <input
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="Image URL (optional)"
          />
        </div>
        <button type="submit" className="btn">Post</button>
      </form>
    </div>
  );
};

export default PostForm;