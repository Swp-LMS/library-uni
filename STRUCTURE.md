# LibraryUni - University Library Management System

## Project Overview

LibraryUni is a comprehensive web application for managing university library resources and borrowing operations. The system supports multiple user roles (Student, Lecturer, Librarian, Admin) with role-based access control.

## Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)

### Frontend

- **Library**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS3

## Project Structure

```
library-uni/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files (database, etc.)
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Custom middleware (auth, error handling)
│   │   ├── models/          # Sequelize database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities and constants
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── server.js            # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── assets/          # Images, fonts, etc.
│   │   ├── components/      # Reusable React components
│   │   ├── contexts/        # React Context API
│   │   ├── pages/           # Page components
│   │   ├── routes/          # Route protection
│   │   ├── services/        # API calls
│   │   ├── styles/          # CSS files
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/              # Static files
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── tsconfig.json
│
└── docs/                    # Documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the backend directory with the following variables:

```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=library_uni
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
```

4. Create the PostgreSQL database:

```sql
CREATE DATABASE library_uni;
```

5. Start the backend server:

```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token

### Users

- `GET /api/users` - Get all users (Admin/Librarian only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Books

- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create book (Admin/Librarian only)
- `PUT /api/books/:id` - Update book (Admin/Librarian only)
- `DELETE /api/books/:id` - Delete book (Admin only)

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (Admin/Librarian only)
- `PUT /api/categories/:id` - Update category (Admin/Librarian only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

### Borrowing

- `POST /api/borrowing/borrow` - Borrow a book
- `POST /api/borrowing/return` - Return a borrowed book
- `GET /api/borrowing/history` - Get user's borrowing history
- `GET /api/borrowing` - Get all borrowing records (Admin/Librarian only)

## User Roles

1. **Student**
   - View available books
   - Borrow books
   - Return books
   - View personal borrowing history

2. **Lecturer**
   - View available books
   - Borrow books
   - Return books
   - View personal borrowing history

3. **Librarian**
   - Manage books (add, edit, delete)
   - Manage categories
   - View all borrowing records
   - Monitor book availability

4. **Admin**
   - All librarian permissions
   - Manage users
   - Generate reports
   - System administration

## Database Models

### User

- id (UUID)
- email (unique)
- password
- firstName
- lastName
- role (student, lecturer, librarian, admin)
- phone
- status (active, inactive, suspended)
- createdAt, updatedAt

### Book

- id (UUID)
- title
- author
- isbn (unique)
- description
- categoryId
- totalCopies
- availableCopies
- publisher
- publishedYear
- status (available, borrowed, maintenance, archived)
- createdAt, updatedAt

### Category

- id (UUID)
- name (unique)
- description
- createdAt, updatedAt

### BorrowingRecord

- id (UUID)
- userId
- bookId
- borrowDate
- dueDate
- returnDate
- status (borrowed, returned, overdue, lost)
- createdAt, updatedAt

## Development

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production

**Backend:**

```bash
cd backend
# Update NODE_ENV to production in .env
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
```

## Environment Variables

### Backend (.env)

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRE` - JWT expiration time

### Frontend

- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000/api)

## Best Practices

1. **Authentication**: Always include JWT token in Authorization header
2. **Error Handling**: Check error responses for appropriate error messages
3. **Data Validation**: Validate input data before sending to API
4. **Security**: Never expose sensitive information in logs or frontend code
5. **Performance**: Use pagination for large datasets
6. **Testing**: Write tests for critical functions

## Troubleshooting

### Backend won't start

- Check if PostgreSQL is running
- Verify .env variables are correct
- Check if port 5000 is available

### Frontend won't connect to backend

- Verify backend is running on port 5000
- Check API URL in frontend configuration
- Check CORS settings in backend

### Database connection errors

- Verify PostgreSQL credentials
- Check if database exists
- Verify network connection

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please contact the development team.
