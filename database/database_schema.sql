-- =====================================================
-- AuraChat Database Schema
-- Generated: December 11, 2025
-- MySQL/MariaDB Compatible
-- =====================================================

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS socialmedia_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE socialmedia_db;

-- =====================================================
-- Drop existing tables (in correct order due to foreign keys)
-- =====================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS party_message;
DROP TABLE IF EXISTS party_members;
DROP TABLE IF EXISTS party;
DROP TABLE IF EXISTS note;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS follow;
DROP TABLE IF EXISTS `like`;
DROP TABLE IF EXISTS comment;
DROP TABLE IF EXISTS post;
DROP TABLE IF EXISTS followers;
DROP TABLE IF EXISTS user;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- USER TABLE
-- Core user accounts
-- =====================================================
CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic TEXT DEFAULT 'default.jpg',
    bio TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    theme VARCHAR(20) DEFAULT 'light',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FOLLOWERS TABLE (Association Table)
-- Many-to-many relationship for user following
-- =====================================================
CREATE TABLE followers (
    follower_id INT NOT NULL,
    followed_id INT NOT NULL,
    
    PRIMARY KEY (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FOLLOW TABLE
-- Alternative follow tracking with timestamps
-- =====================================================
CREATE TABLE follow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- POST TABLE
-- User posts with text and images
-- =====================================================
CREATE TABLE post (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    image_data LONGBLOB,
    image_mimetype VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- COMMENT TABLE
-- Comments on posts
-- =====================================================
CREATE TABLE comment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- LIKE TABLE
-- Post likes
-- =====================================================
CREATE TABLE `like` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    
    UNIQUE KEY unique_like (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MESSAGE TABLE
-- Direct messages between users
-- =====================================================
CREATE TABLE message (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    
    INDEX idx_created_at (created_at),
    FOREIGN KEY (sender_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NOTE TABLE
-- Instagram-style notes with optional music
-- =====================================================
CREATE TABLE note (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT,
    music_name VARCHAR(255),
    music_artist VARCHAR(255),
    music_preview_url VARCHAR(500),
    music_image VARCHAR(500),
    spotify_track_id VARCHAR(100),
    spotify_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PARTY TABLE
-- Watch parties for synchronized video viewing
-- =====================================================
CREATE TABLE party (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'private or public',
    youtube_url VARCHAR(500) NOT NULL,
    admin_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (admin_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PARTY_MEMBERS TABLE (Association Table)
-- Members of watch parties
-- =====================================================
CREATE TABLE party_members (
    party_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (party_id, user_id),
    FOREIGN KEY (party_id) REFERENCES party(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PARTY_MESSAGE TABLE
-- Chat messages in watch parties
-- =====================================================
CREATE TABLE party_message (
    id INT AUTO_INCREMENT PRIMARY KEY,
    party_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (party_id) REFERENCES party(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- OPTIONAL: Insert default admin user (password: admin123)
-- Uncomment if you want a default user
-- =====================================================
-- INSERT INTO user (username, email, password_hash, bio)
-- VALUES (
--     'admin',
--     'admin@aurachat.com',
--     'pbkdf2:sha256:600000$...',  -- Generate with werkzeug
--     'AuraChat Administrator'
-- );

-- =====================================================
-- Database Info
-- =====================================================
SELECT 'AuraChat Database Schema Created Successfully!' AS Status;
SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'socialmedia_db';
