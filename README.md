# E-Commerce Monorepo

A full-stack e-commerce application with separate frontend portals for customers and administrators.

## 🏗️ Project Structure

```
ecom/
├── backend/                 # Express.js + MariaDB backend API
├── frontend/               # Customer-facing Next.js frontend (port 3000)
├── ecomgm-frontend/        # Admin/Management Next.js frontend (port 3001)
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MariaDB/MySQL
- Git

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Create and configure .env file
npm start             # Runs on port 4000
```

### Customer Frontend Setup
```bash
cd frontend
npm install
npm run dev          # Runs on port 3000
```

### Admin Frontend Setup
```bash
cd ecomgm-frontend
npm install
npm run dev          # Runs on port 3001
```

## 🔐 Authentication & Roles

### Customer Portal (`frontend/`)
- **Sign Up**: Self-registration for customers
- **Sign In**: Customer login with email/username
- **Features**: Product browsing, cart, orders, profile management

### Admin Portal (`ecomgm-frontend/`)
- **SU Login**: Supreme Admin access (creates users, manages customers)
- **User Login**: Admin/Vendor/Courier access with role-based dashboards
- **Features**: User management, customer oversight, role-specific operations

### Backend API (`backend/`)
- **Port**: 4000
- **Auth**: JWT-based with role-specific tokens
- **Database**: MariaDB with strict role-based access control

## 🗄️ Database Schema

Key tables:
- `customer`: Customer accounts and profiles
- `user`: Admin/Vendor/Courier accounts
- `SU`: Supreme Admin accounts
- `product`: Product catalog
- `shoppingcart`: Customer shopping carts
- `purchase`: Order management

## 🔒 Security Features

- **Token Isolation**: Separate JWT tokens for each user type
- **Role Middleware**: Strict backend route protection
- **CORS**: Configured for both frontend origins
- **Password Hashing**: bcrypt for all passwords

## 📝 Environment Variables

### Backend (`.env`)
```bash
JWT_SECRET=your_jwt_secret_here
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
```

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🚀 Development Commands

### Backend
```bash
cd backend
npm run dev      # Development with nodemon
npm start        # Production start
```

### Frontends
```bash
# Customer Portal
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server

# Admin Portal
cd ecomgm-frontend
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server
```

## 🧪 Testing

1. Start backend: `cd backend && npm start`
2. Start customer frontend: `cd frontend && npm run dev`
3. Start admin frontend: `cd ecomgm-frontend && npm run dev`
4. Test customer signup/login at `http://localhost:3000`
5. Test admin login at `http://localhost:3001`

## 📁 File Organization

- **Components**: Reusable UI components in each frontend
- **Routes**: API endpoints organized by resource type
- **Middleware**: Authentication and authorization checks
- **Database**: Connection pooling and query management

## 🔄 API Endpoints

- **Auth**: `/api/auth/*` (login, signup)
- **Customer**: `/api/customer/*` (profile, orders)
- **User**: `/api/user/*` (admin/vendor/courier profiles)
- **SU**: `/su/*` (user/customer management)
- **Cart**: `/cart/*` (shopping cart operations)
- **Orders**: `/order/*` (order management)

## 🚨 Important Notes

- Each app has its own `node_modules` and dependencies
- Environment files are gitignored for security
- Database must be running before starting backend
- CORS is configured for local development origins
- JWT tokens are role-specific and mutually exclusive

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test all three applications
5. Submit a pull request

## 📄 License

This project is for educational purposes. 