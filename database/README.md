# Database Configuration and Setup

## Prerequisites

1. Install MySQL Server 8.0 or later
2. Create a MySQL user with appropriate permissions

## Setup Instructions

### 1. Create Database and User

Connect to MySQL as root and run:

```sql
-- Create database
CREATE DATABASE aurachat;

-- Create user (replace 'your_password' with a secure password)
CREATE USER 'aurachat_user'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON aurachat.* TO 'aurachat_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Run Database Schema

Execute the schema file:

```bash
mysql -u aurachat_user -p aurachat < schema.sql
```

### 3. Environment Configuration

Update your backend `.env` file with the database connection string:

```
DATABASE_URL=mysql+pymysql://aurachat_user:your_password@localhost/aurachat
```

## Database Structure

### Tables

- **user**: User accounts and profiles
- **post**: User posts/status updates
- **comment**: Comments on posts
- **like**: Post likes/reactions
- **followers**: User follow relationships

### Relationships

- Users can have many posts, comments, and likes
- Users can follow/be followed by other users (many-to-many)
- Posts can have many comments and likes
- Each comment and like belongs to a user and a post

## Sample Data

The schema includes sample data for testing:
- 2 sample users (john_doe, jane_smith)
- 4 sample posts
- Sample follow relationships
- Sample likes and comments

## Indexes

The database includes optimized indexes for:
- User lookups (username, email)
- Post queries (created_at, user_id)
- Comment and like queries (post_id, user_id)
- Follow relationships (follower_id, followed_id)

## Backup and Maintenance

### Create Backup
```bash
mysqldump -u aurachat_user -p aurachat > aurachat_backup.sql
```

### Restore Backup
```bash
mysql -u aurachat_user -p aurachat < aurachat_backup.sql
```