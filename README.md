# AuraChat - Social Media App

A full-stack social media application built with React, Flask, and MySQL.

## 🚀 Features

### Core Features
- User registration and authentication
- Create, view, and interact with posts
- Like and comment on posts
- User profiles with follower/following system
- Real-time feed updates
- Responsive design

### Tech Stack
- **Frontend**: React 18, React Router, Axios
- **Backend**: Python Flask, SQLAlchemy, JWT Authentication
- **Database**: MySQL 8.0+
- **Styling**: CSS3 with custom components

## 📁 Project Structure

```
Aurachat/
├── frontend/                 # React application
│   ├── public/              # Static files
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── ...
│   └── package.json
├── backend/                 # Flask API
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utility functions
│   ├── config.py           # App configuration
│   ├── run.py             # Application entry point
│   └── requirements.txt
├── database/               # Database setup
│   ├── schema.sql         # Database schema
│   └── README.md          # Database documentation
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- MySQL 8.0+
- Git

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Aurachat
```

### 2. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE aurachat;
CREATE USER 'aurachat_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON aurachat.* TO 'aurachat_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u aurachat_user -p aurachat < database/schema.sql
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
copy .env.example .env
# Edit .env with your database credentials

# Run the server
python run.py
```
Server will run on http://localhost:5000

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
copy .env.example .env

# Start development server
npm start
```
App will run on http://localhost:3000

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/logout` - User logout

### Posts
- `GET /api/posts/` - Get all posts (paginated)
- `POST /api/posts/` - Create new post
- `GET /api/posts/<id>` - Get specific post
- `POST /api/posts/<id>/like` - Like/unlike post
- `GET /api/posts/<id>/comments` - Get post comments
- `POST /api/posts/<id>/comments` - Add comment

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/<id>` - Get user profile
- `GET /api/users/<id>/posts` - Get user posts
- `POST /api/users/<id>/follow` - Follow user
- `DELETE /api/users/<id>/follow` - Unfollow user
- `GET /api/users/search` - Search users

## 🔧 Development

### Adding New Features
1. **Frontend**: Add components in `frontend/src/components/` or pages in `frontend/src/pages/`
2. **Backend**: Add routes in `backend/app/routes/` and models in `backend/app/models/`
3. **Database**: Update schema in `database/schema.sql`

### Common Tasks

#### Add a new API endpoint
1. Create route in appropriate file in `backend/app/routes/`
2. Update frontend service in `frontend/src/services/api.js`
3. Use in React components

#### Add a new database table
1. Create model in `backend/app/models/models.py`
2. Update database schema in `database/schema.sql`
3. Create migration script if needed

## 🚀 Deployment

### Backend Deployment
1. Set environment variables for production
2. Use a production WSGI server (e.g., Gunicorn)
3. Set up reverse proxy (e.g., Nginx)

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Update API URL in environment variables

### Database
1. Set up production MySQL instance
2. Import schema and migrate data
3. Update connection strings

## 🤝 Team Development

### Git Workflow
1. Create feature branches from main
2. Make commits with clear messages
3. Create pull requests for review
4. Merge after approval

### Code Standards
- **Frontend**: Use ESLint and Prettier
- **Backend**: Follow PEP 8 standards
- **Database**: Use descriptive table and column names

### Adding Team Members
1. Share repository access
2. Provide environment setup instructions
3. Document any team-specific configurations

## 📋 TODO / Roadmap

### Phase 1 (Current - Basic Features)
- [x] User authentication
- [x] Basic post creation and viewing
- [x] User profiles
- [x] Like and comment system

### Phase 2 (Enhancement)
- [ ] Image upload for posts
- [ ] Real-time notifications
- [ ] Direct messaging
- [ ] Advanced search and filters
- [ ] User verification system

### Phase 3 (Advanced)
- [ ] Mobile app (React Native)
- [ ] Admin dashboard
- [ ] Analytics and insights
- [ ] Content moderation
- [ ] API rate limiting

## 🐛 Known Issues
- JWT tokens don't expire (implement refresh tokens)
- No file upload validation
- Limited error handling in some components

## 📄 License
This project is licensed under the MIT License.

## 🙋‍♂️ Support
For questions or support, please contact the development team or create an issue in the repository.