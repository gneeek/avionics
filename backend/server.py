from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from collections import defaultdict
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserInDB(User):
    password_hash: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class BankAccountCreate(BaseModel):
    name: str
    currency: Literal["CAD", "USD", "GBP", "EUR", "AUD"]
    opening_balance: float = 0.0
    is_default: bool = False

class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    currency: Literal["CAD", "USD", "GBP", "EUR", "AUD"]
    opening_balance: float
    is_default: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    type: Literal["income", "expense"]
    color: str = "#3B82F6"
    icon: str = "💰"

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    type: Literal["income", "expense"]
    color: str
    icon: str

class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: float
    category_id: str
    account_id: str
    description: str = ""
    date: datetime
    is_recurring: bool = False

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: Literal["income", "expense"]
    amount: float
    category_id: str
    account_id: str
    description: str
    date: datetime
    is_recurring: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetCreate(BaseModel):
    category_id: str
    amount: float
    period: Literal["monthly", "yearly"]

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category_id: str
    amount: float
    period: Literal["monthly", "yearly"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_data is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert ISO string to datetime if needed
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    return User(**user_data)

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    password = user_dict.pop('password')
    user_obj = UserInDB(**user_dict, password_hash=hash_password(password))
    
    # Save to DB
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create default categories for new user
    default_categories = [
        {"name": "Salary", "type": "income", "color": "#10B981", "icon": "💵"},
        {"name": "Freelance", "type": "income", "color": "#3B82F6", "icon": "💼"},
        {"name": "Investment", "type": "income", "color": "#8B5CF6", "icon": "📈"},
        {"name": "Food & Dining", "type": "expense", "color": "#EF4444", "icon": "🍔"},
        {"name": "Transportation", "type": "expense", "color": "#F59E0B", "icon": "🚗"},
        {"name": "Shopping", "type": "expense", "color": "#EC4899", "icon": "🛍️"},
        {"name": "Entertainment", "type": "expense", "color": "#6366F1", "icon": "🎮"},
        {"name": "Bills & Utilities", "type": "expense", "color": "#EF4444", "icon": "💡"},
        {"name": "Healthcare", "type": "expense", "color": "#14B8A6", "icon": "🏥"},
        {"name": "Other", "type": "expense", "color": "#6B7280", "icon": "📦"},
    ]
    
    for cat in default_categories:
        cat_obj = Category(user_id=user_obj.id, **cat)
        await db.categories.insert_one(cat_obj.model_dump())
    
    # Create default bank account
    default_account = BankAccount(
        user_id=user_obj.id,
        name="Main Account",
        currency="CAD",
        opening_balance=0.0,
        is_default=True
    )
    account_doc = default_account.model_dump()
    account_doc['created_at'] = account_doc['created_at'].isoformat()
    await db.bank_accounts.insert_one(account_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user_obj.id})
    user_response = User(**user_obj.model_dump())
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Convert ISO string to datetime if needed
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    user_in_db = UserInDB(**user_data)
    
    # Verify password
    if not verify_password(credentials.password, user_in_db.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    access_token = create_access_token(data={"sub": user_in_db.id})
    user_response = User(**user_in_db.model_dump())
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= BANK ACCOUNT ROUTES =============

@api_router.get("/accounts", response_model=List[BankAccount])
async def get_accounts(current_user: User = Depends(get_current_user)):
    accounts = await db.bank_accounts.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for account in accounts:
        if isinstance(account.get('created_at'), str):
            account['created_at'] = datetime.fromisoformat(account['created_at'])
    
    return accounts

@api_router.post("/accounts", response_model=BankAccount)
async def create_account(account_data: BankAccountCreate, current_user: User = Depends(get_current_user)):
    # If this is set as default, unset other defaults
    if account_data.is_default:
        await db.bank_accounts.update_many(
            {"user_id": current_user.id},
            {"$set": {"is_default": False}}
        )
    
    account = BankAccount(user_id=current_user.id, **account_data.model_dump())
    
    doc = account.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.bank_accounts.insert_one(doc)
    return account

@api_router.put("/accounts/{account_id}", response_model=BankAccount)
async def update_account(account_id: str, account_data: BankAccountCreate, current_user: User = Depends(get_current_user)):
    # If this is set as default, unset other defaults
    if account_data.is_default:
        await db.bank_accounts.update_many(
            {"user_id": current_user.id, "id": {"$ne": account_id}},
            {"$set": {"is_default": False}}
        )
    
    result = await db.bank_accounts.find_one_and_update(
        {"id": account_id, "user_id": current_user.id},
        {"$set": account_data.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")
    
    result.pop('_id', None)
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    
    return BankAccount(**result)

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, current_user: User = Depends(get_current_user)):
    # Check if there are transactions linked to this account
    txn_count = await db.transactions.count_documents({"account_id": account_id, "user_id": current_user.id})
    if txn_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete account with {txn_count} transactions. Please delete or reassign transactions first.")
    
    result = await db.bank_accounts.delete_one({"id": account_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted successfully"}

@api_router.get("/accounts/{account_id}/balance")
async def get_account_balance(account_id: str, current_user: User = Depends(get_current_user)):
    # Get account
    account = await db.bank_accounts.find_one({"id": account_id, "user_id": current_user.id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get all transactions for this account
    transactions = await db.transactions.find({
        "user_id": current_user.id,
        "account_id": account_id
    }, {"_id": 0}).to_list(10000)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    current_balance = account['opening_balance'] + total_income - total_expense
    
    return {
        "account_id": account_id,
        "account_name": account['name'],
        "currency": account['currency'],
        "opening_balance": account['opening_balance'],
        "total_income": total_income,
        "total_expense": total_expense,
        "current_balance": current_balance
    }

# ============= CATEGORY ROUTES =============

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    categories = await db.categories.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    category = Category(user_id=current_user.id, **category_data.model_dump())
    await db.categories.insert_one(category.model_dump())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    result = await db.categories.find_one_and_update(
        {"id": category_id, "user_id": current_user.id},
        {"$set": category_data.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    result.pop('_id', None)
    return Category(**result)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ============= TRANSACTION ROUTES =============

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    current_user: User = Depends(get_current_user),
    type: Optional[str] = None,
    category_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {"user_id": current_user.id}
    
    if type:
        query["type"] = type
    if category_id:
        query["category_id"] = category_id
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["date"] = date_query
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Convert ISO strings to datetime
    for txn in transactions:
        if isinstance(txn.get('date'), str):
            txn['date'] = datetime.fromisoformat(txn['date'])
        if isinstance(txn.get('created_at'), str):
            txn['created_at'] = datetime.fromisoformat(txn['created_at'])
    
    return transactions

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    transaction = Transaction(user_id=current_user.id, **transaction_data.model_dump())
    
    doc = transaction.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    return transaction

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    update_data = transaction_data.model_dump()
    update_data['date'] = update_data['date'].isoformat()
    
    result = await db.transactions.find_one_and_update(
        {"id": transaction_id, "user_id": current_user.id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    result.pop('_id', None)
    if isinstance(result.get('date'), str):
        result['date'] = datetime.fromisoformat(result['date'])
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    
    return Transaction(**result)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    result = await db.transactions.delete_one({"id": transaction_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# ============= BUDGET ROUTES =============

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(current_user: User = Depends(get_current_user)):
    budgets = await db.budgets.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for budget in budgets:
        if isinstance(budget.get('created_at'), str):
            budget['created_at'] = datetime.fromisoformat(budget['created_at'])
    
    return budgets

@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget_data: BudgetCreate, current_user: User = Depends(get_current_user)):
    budget = Budget(user_id=current_user.id, **budget_data.model_dump())
    
    doc = budget.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.budgets.insert_one(doc)
    return budget

@api_router.put("/budgets/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, budget_data: BudgetCreate, current_user: User = Depends(get_current_user)):
    result = await db.budgets.find_one_and_update(
        {"id": budget_id, "user_id": current_user.id},
        {"$set": budget_data.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    result.pop('_id', None)
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    
    return Budget(**result)

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, current_user: User = Depends(get_current_user)):
    result = await db.budgets.delete_one({"id": budget_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted successfully"}

# ============= DASHBOARD ROUTES =============

@api_router.get("/dashboard/overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None,
    account_id: Optional[str] = None
):
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    # Get start and end of month
    start_date = datetime(target_year, target_month, 1, tzinfo=timezone.utc).isoformat()
    if target_month == 12:
        end_date = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        end_date = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc).isoformat()
    
    # Build query
    query = {
        "user_id": current_user.id,
        "date": {"$gte": start_date, "$lt": end_date}
    }
    if account_id:
        query["account_id"] = account_id
    
    # Get all transactions for the month
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    net_balance = total_income - total_expense
    savings_rate = (net_balance / total_income * 100) if total_income > 0 else 0
    
    # Get all accounts with current balances
    accounts = await db.bank_accounts.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    account_balances = []
    
    for account in accounts:
        # Get all transactions for this account (all time)
        account_txns = await db.transactions.find({
            "user_id": current_user.id,
            "account_id": account['id']
        }, {"_id": 0}).to_list(10000)
        
        acc_income = sum(t['amount'] for t in account_txns if t['type'] == 'income')
        acc_expense = sum(t['amount'] for t in account_txns if t['type'] == 'expense')
        current_balance = account['opening_balance'] + acc_income - acc_expense
        
        account_balances.append({
            "id": account['id'],
            "name": account['name'],
            "currency": account['currency'],
            "current_balance": current_balance,
            "is_default": account.get('is_default', False)
        })
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": net_balance,
        "savings_rate": round(savings_rate, 2),
        "transaction_count": len(transactions),
        "month": target_month,
        "year": target_year,
        "account_balances": account_balances
    }

@api_router.get("/dashboard/trends")
async def get_dashboard_trends(
    current_user: User = Depends(get_current_user),
    months: int = 6,
    account_id: Optional[str] = None
):
    now = datetime.now(timezone.utc)
    trends = []
    
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=30 * i)
        month = target_date.month
        year = target_date.year
        
        start_date = datetime(year, month, 1, tzinfo=timezone.utc).isoformat()
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc).isoformat()
        
        query = {
            "user_id": current_user.id,
            "date": {"$gte": start_date, "$lt": end_date}
        }
        if account_id:
            query["account_id"] = account_id
            
        transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
        
        income = sum(t['amount'] for t in transactions if t['type'] == 'income')
        expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
        
        trends.append({
            "month": target_date.strftime("%b %Y"),
            "income": income,
            "expense": expense,
            "net": income - expense
        })
    
    return trends

@api_router.get("/dashboard/category-breakdown")
async def get_category_breakdown(
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None,
    type: str = "expense",
    account_id: Optional[str] = None
):
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    start_date = datetime(target_year, target_month, 1, tzinfo=timezone.utc).isoformat()
    if target_month == 12:
        end_date = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        end_date = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc).isoformat()
    
    query = {
        "user_id": current_user.id,
        "type": type,
        "date": {"$gte": start_date, "$lt": end_date}
    }
    if account_id:
        query["account_id"] = account_id
        
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    categories = await db.categories.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    category_map = {cat['id']: cat for cat in categories}
    
    breakdown = defaultdict(float)
    for txn in transactions:
        breakdown[txn['category_id']] += txn['amount']
    
    result = []
    for cat_id, amount in breakdown.items():
        if cat_id in category_map:
            cat = category_map[cat_id]
            result.append({
                "category": cat['name'],
                "amount": amount,
                "color": cat['color'],
                "icon": cat['icon']
            })
    
    return sorted(result, key=lambda x: x['amount'], reverse=True)

@api_router.get("/dashboard/total-cash")
async def get_total_cash(current_user: User = Depends(get_current_user)):
    """
    Get total cash across all accounts converted to CAD with real-time exchange rates
    """
    try:
        # Fetch current exchange rates (CAD as base)
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.exchangerate-api.com/v4/latest/CAD", timeout=10.0)
            response.raise_for_status()
            exchange_data = response.json()
            rates = exchange_data.get("rates", {})
        
        # Get all accounts for user
        accounts = await db.bank_accounts.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
        
        total_cad = 0.0
        account_details = []
        
        for account in accounts:
            # Calculate current balance for this account
            account_txns = await db.transactions.find({
                "user_id": current_user.id,
                "account_id": account['id']
            }, {"_id": 0}).to_list(10000)
            
            acc_income = sum(t['amount'] for t in account_txns if t['type'] == 'income')
            acc_expense = sum(t['amount'] for t in account_txns if t['type'] == 'expense')
            current_balance = account['opening_balance'] + acc_income - acc_expense
            
            # Convert to CAD
            currency = account['currency']
            if currency == 'CAD':
                balance_in_cad = current_balance
                exchange_rate = 1.0
            else:
                # Rate from API is: 1 CAD = X currency
                # To convert from currency to CAD: amount / rate
                rate = rates.get(currency, 1.0)
                balance_in_cad = current_balance / rate if rate > 0 else 0
                exchange_rate = rate
            
            total_cad += balance_in_cad
            
            account_details.append({
                "id": account['id'],
                "name": account['name'],
                "currency": currency,
                "original_balance": current_balance,
                "balance_in_cad": balance_in_cad,
                "exchange_rate": exchange_rate,
                "is_default": account.get('is_default', False)
            })
        
        return {
            "total_cad": total_cad,
            "accounts": account_details,
            "base_currency": "CAD",
            "rates_source": "exchangerate-api.com",
            "last_updated": exchange_data.get("date", "")
        }
    
    except httpx.RequestError as e:
        logger.error(f"Error fetching exchange rates: {e}")
        raise HTTPException(status_code=503, detail="Unable to fetch exchange rates. Please try again later.")
    except Exception as e:
        logger.error(f"Error calculating total cash: {e}")
        raise HTTPException(status_code=500, detail="Error calculating total cash")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
