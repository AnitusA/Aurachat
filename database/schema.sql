-- AuraChat Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS aurachat;
USE aurachat;

-- Users table
CREATE TABLE IF NOT EXISTS user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    bio TEXT,
    profile_picture VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Posts table
CREATE TABLE IF NOT EXISTS post (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
);

-- Likes table
CREATE TABLE IF NOT EXISTS `like` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_post_like (user_id, post_id)
);

-- Followers table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS followers (
    follower_id INT NOT NULL,
    followed_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_follower (follower_id),
    INDEX idx_followed (followed_id)
);

-- Insert sample data
INSERT INTO user (username, email, password_hash, full_name, bio) VALUES
('john_doe', 'john@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYWoB/4EafqRvqS', 'John Doe', 'Welcome to my profile! Love to share thoughts and connect with people.'),
('jane_smith', 'jane@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYWoB/4EafqRvqS', 'Jane Smith', 'Tech enthusiast and coffee lover ☕');

-- Sample posts
INSERT INTO post (content, user_id) VALUES
('Welcome to AuraChat! Excited to be part of this amazing community. 🎉', 1),
('Just finished reading an amazing book about technology and its impact on society. Highly recommend it!', 2),
('Beautiful sunset today! Sometimes we need to pause and appreciate the little things in life. 🌅', 1),
('Working on a new project. The journey of learning never stops! #coding #development', 2);

-- Sample follows
INSERT INTO followers (follower_id, followed_id) VALUES
(1, 2),
(2, 1);

-- Sample likes
INSERT INTO `like` (user_id, post_id) VALUES
(1, 2),
(1, 4),
(2, 1),
(2, 3);

-- Sample comments
INSERT INTO comment (content, user_id, post_id) VALUES
('Welcome to the community! Great to have you here.', 2, 1),
('Thanks for the book recommendation! I will definitely check it out.', 1, 2),
('Amazing photo! Where was this taken?', 2, 3);