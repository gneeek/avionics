# Cashflow Application

A full-stack personal finance management application for tracking income, expenses, and financial projections across multiple bank accounts and currencies.

## Features

- **Multi-User Authentication**: JWT-based secure login/register
- **Multi-Account Support**: Track multiple bank accounts with different currencies (CAD, USD, GBP, EUR, AUD)
- **Transaction Management**: Full CRUD for income and expenses with categories
- **Recurring Transactions**: Mark transactions as monthly or twice-monthly for projections
- **6-Month Financial Projections**: Dashboard view showing projected balances based on recurring transactions
- **Real-time Currency Conversion**: Total cash across all accounts converted to CAD using live exchange rates
- **Budget Tracking**: Set spending limits per category and track progress
- **Balance History**: Manual balance adjustments with full audit trail

## Tech Stack

### Frontend
- React 19
- React Router DOM
- Tailwind CSS
- shadcn/ui components
- Recharts (charts/graphs)
- Axios (HTTP client)
- date-fns (date formatting)

### Backend
- FastAPI (Python)
- Motor (async MongoDB driver)
- Pydantic (data validation)
- PyJWT (authentication)
- Passlib + bcrypt (password hashing)
- HTTPX (external API calls)

### Database
- MongoDB

### External APIs
- exchangerate-api.com (currency conversion - no API key required)

## Project Structure

```
/app
├── backend/
│   ├── .env                 # Backend environment variables
│   ├── requirements.txt     # Python dependencies
│   └── server.py           # FastAPI application (all routes & models)
├── frontend/
│   ├── .env                 # Frontend environment variables
│   ├── package.json         # Node.js dependencies
│   └── src/
│       ├── App.js          # Main router
│       ├── components/
│       │   ├── Layout.js   # Main layout with navigation
│       │   └── ui/         # shadcn/ui components
│       ├── context/
│       │   └── AuthContext.js
│       └── pages/
│           ├── Accounts.js
│           ├── AccountBalanceUpdate.js
│           ├── Auth/
│           ├── Budgets.js
│           ├── Categories.js
│           ├── Dashboard.js
│           └── Transactions.js
└── memory/
    └── PRD.md              # Product requirements document
```

## Deployment Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd cashflow-app
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=cashflow_db
CORS_ORIGINS=http://localhost:3000
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
EOF

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install
# or: npm install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Start the development server
yarn start
# or: npm start
```

### 4. MongoDB Setup

Make sure MongoDB is running locally:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `cashflow_db` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000` |
| `JWT_SECRET_KEY` | Secret key for JWT tokens | `your-secret-key` |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8001` |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Bank Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/{id}` - Update account
- `DELETE /api/accounts/{id}` - Delete account
- `GET /api/accounts/{id}/balance` - Get account balance
- `POST /api/accounts/{id}/update-balance` - Manual balance adjustment
- `GET /api/accounts/{id}/balance-history` - Balance update history

### Transactions
- `GET /api/transactions` - List transactions (with filters)
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget

### Dashboard
- `GET /api/dashboard/overview` - Monthly summary
- `GET /api/dashboard/trends` - 6-month trends
- `GET /api/dashboard/category-breakdown` - Spending by category
- `GET /api/dashboard/total-cash` - Total across accounts (CAD)
- `GET /api/projections` - 6-month financial projections

## Production Deployment

### Using Docker

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=cashflow_db
      - CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongodb_data:
```

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

## Security Notes

1. **Change JWT_SECRET_KEY** in production - use a strong, random string
2. **Use HTTPS** in production
3. **Restrict CORS_ORIGINS** to your actual domain
4. **Set up MongoDB authentication** in production
5. **Use environment variables** for all sensitive configuration

## License

MIT License
