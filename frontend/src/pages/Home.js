import React, { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import PostForm from '../components/PostForm';
import { getPosts, createPost } from '../services/api';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Fallback with sample data for development
      setPosts([
        {
          id: 1,
          author: 'John Doe',
          content: 'Welcome to AuraChat! This is a sample post.',
          created_at: new Date().toISOString(),
          likes: 5,
          comments: 2
        },
        {
          id: 2,
          author: 'Jane Smith',
          content: 'Great to be part of this community! 🎉',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          likes: 3,
          comments: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      const newPost = await createPost(postData);
      setPosts([newPost, ...posts]);
    } catch (error) {
      console.error('Error creating post:', error);
      // Fallback for development
      const newPost = {
        id: Date.now(),
        author: 'Current User',
        content: postData.content,
        image: postData.image,
        created_at: new Date().toISOString(),
        likes: 0,
        comments: 0
      };
      setPosts([newPost, ...posts]);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div className="main-content">
      <div className="posts-container">
        <PostForm onSubmit={handleCreatePost} />
        <div>
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;