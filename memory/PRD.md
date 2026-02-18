# Cashflow Application - Product Requirements Document

## Original Problem Statement
Build a multi-user cashflow application to track income and expenses with multi-account and multi-currency support, featuring 6-month financial projections based on recurring transactions.

## Core Features

### 1. Authentication (COMPLETED)
- JWT-based multi-user authentication
- Login/Register functionality
- Protected routes and API endpoints

### 2. Core Tracking (COMPLETED)
- Track income and expenses
- Customizable categories with icons and colors
- Transaction CRUD with confirmation dialogs

### 3. Multi-Account & Multi-Currency (COMPLETED)
- Create multiple bank accounts
- Support for CAD, USD, GBP, EUR, AUD currencies
- Opening balance per account
- Dynamic currency display in transaction form

### 4. Balance Management (COMPLETED)
- Click on account from dashboard to update balance
- Manual balance adjustments
- History of all balance updates (user, date, amount)

### 5. Dashboard (COMPLETED)
- **Total Cash Section**: Total across all accounts converted to CAD using live exchange rates
- **Expandable accounts view**: Shows individual account balances
- **6-Month Projections Grid**: 
  - Bank accounts as rows, next 6 months as columns
  - Shows projected balance at end of each month
  - Grand total for all accounts in CAD
  - Based on recurring transactions
- **Summary Cards**: Total Projected Income/Expenses/Balance (6 months), This Month actuals
- **Charts**: Income vs Expense trends, Category breakdown

### 6. Recurring Transactions (COMPLETED)
- Mark transactions as recurring
- Frequency options: Monthly, Twice Monthly
- Visual badges on transaction list
- Used for 6-month projections

## Technical Stack
- **Frontend**: React 19, React Router, Tailwind CSS, shadcn/ui, recharts
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, JWT
- **Database**: MongoDB
- **External API**: exchangerate-api.com for live currency rates

## Key API Endpoints
- `/api/auth/{register, login, me}`
- `/api/accounts` (CRUD + balance updates)
- `/api/transactions` (CRUD)
- `/api/categories` (CRUD)
- `/api/dashboard/{overview, trends, category-breakdown, total-cash}`
- `/api/projections` - 6-month financial projections

## Database Schema
- **User**: id, email, password_hash, name
- **BankAccount**: id, user_id, name, currency, opening_balance, is_default
- **Transaction**: id, user_id, account_id, type, amount, category_id, date, is_recurring, recurring_frequency
- **Category**: id, user_id, name, type, color, icon
- **BalanceUpdate**: id, account_id, user_id, date, previous_balance, new_balance, notes

## Completed Work (Feb 2026)
- [x] JWT Authentication & Core APIs
- [x] Multi-Account & Multi-Currency support
- [x] Dashboard Total Cash with live currency conversion
- [x] Balance Update with History
- [x] Transaction Deletion with AlertDialog
- [x] Dynamic Currency Display in forms
- [x] 6-Month Projections Feature (Backend + Frontend)
- [x] Recurring Transaction Management
- [x] Unified AlertDialog delete confirmation across all pages (Categories, Accounts, Budgets)

## Testing Status
- Backend: 100% (16/16 tests passed)
- Frontend: 100% (all UI tests passed)
- Test file: `/app/backend/tests/test_cashflow_projections.py`

## Backlog (P1)
- Budget vs. Actuals feature (set budgets per category, track against spending)

## Future Tasks (P2)
- Recurring Transaction Management UI (dedicated page to manage all recurring)
- Backend refactoring (split server.py into modules)

## Test Credentials
- Email: test_proj@example.com
- Password: test123
