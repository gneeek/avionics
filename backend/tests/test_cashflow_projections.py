"""
Backend tests for Cashflow Application with 6-Month Projections feature
Tests: Auth, Transactions (recurring), Projections API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_proj@example.com"
TEST_PASSWORD = "test123"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_auth_me_with_token(self, auth_token):
        """Test /api/auth/me returns current user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == TEST_EMAIL


class TestTransactions:
    """Transaction CRUD tests with recurring transaction support"""
    
    def test_get_transactions(self, auth_token):
        """Test fetching all transactions"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_transactions_have_recurring_fields(self, auth_token):
        """Test that transactions have is_recurring and recurring_frequency fields"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "No transactions found"
        
        # Check recurring transaction exists
        recurring_txns = [t for t in data if t.get('is_recurring') == True]
        assert len(recurring_txns) > 0, "No recurring transactions found"
        
        # Check recurring transaction has frequency field
        for txn in recurring_txns:
            assert "recurring_frequency" in txn, "Missing recurring_frequency field"
            assert txn["recurring_frequency"] in ["monthly", "twice_monthly"], f"Invalid frequency: {txn['recurring_frequency']}"
    
    def test_create_recurring_transaction(self, auth_token, test_category, test_account):
        """Test creating a recurring transaction"""
        payload = {
            "type": "expense",
            "amount": 50.00,
            "category_id": test_category["id"],
            "account_id": test_account["id"],
            "description": "TEST_Recurring Test",
            "date": "2026-02-18T00:00:00.000Z",
            "is_recurring": True,
            "recurring_frequency": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Create transaction failed: {response.text}"
        
        data = response.json()
        assert data["is_recurring"] == True
        assert data["recurring_frequency"] == "monthly"
        assert data["description"] == "TEST_Recurring Test"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/transactions/{data['id']}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
    
    def test_create_twice_monthly_transaction(self, auth_token, test_category, test_account):
        """Test creating a twice monthly recurring transaction"""
        payload = {
            "type": "expense",
            "amount": 100.00,
            "category_id": test_category["id"],
            "account_id": test_account["id"],
            "description": "TEST_Twice Monthly Test",
            "date": "2026-02-18T00:00:00.000Z",
            "is_recurring": True,
            "recurring_frequency": "twice_monthly"
        }
        
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Create transaction failed: {response.text}"
        
        data = response.json()
        assert data["is_recurring"] == True
        assert data["recurring_frequency"] == "twice_monthly"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/transactions/{data['id']}", headers={
            "Authorization": f"Bearer {auth_token}"
        })


class TestProjectionsAPI:
    """Tests for /api/projections endpoint"""
    
    def test_projections_endpoint_returns_200(self, auth_token):
        """Test projections endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Projections API failed: {response.text}"
    
    def test_projections_data_structure(self, auth_token):
        """Test projections returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level fields
        assert "months" in data, "Missing 'months' field"
        assert "account_projections" in data, "Missing 'account_projections' field"
        assert "grand_totals" in data, "Missing 'grand_totals' field"
        assert "summary" in data, "Missing 'summary' field"
    
    def test_projections_has_6_months(self, auth_token):
        """Test projections shows 6 months"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["months"]) == 6, f"Expected 6 months, got {len(data['months'])}"
        assert len(data["grand_totals"]) == 6, f"Expected 6 grand totals, got {len(data['grand_totals'])}"
    
    def test_projections_account_structure(self, auth_token):
        """Test account projections have correct structure"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["account_projections"]) > 0, "No account projections"
        
        account = data["account_projections"][0]
        assert "account_id" in account
        assert "account_name" in account
        assert "currency" in account
        assert "current_balance" in account
        assert "monthly_projections" in account
        
        # Check monthly projections structure
        assert len(account["monthly_projections"]) == 6
        
        for proj in account["monthly_projections"]:
            assert "month" in proj
            assert "income" in proj
            assert "expense" in proj
            assert "projected_balance" in proj
    
    def test_projections_grand_totals_structure(self, auth_token):
        """Test grand totals have correct structure"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        
        for total in data["grand_totals"]:
            assert "month" in total
            assert "total_income_cad" in total
            assert "total_expense_cad" in total
            assert "total_balance_cad" in total
    
    def test_projections_summary_structure(self, auth_token):
        """Test summary has correct structure"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        assert "total_projected_income_cad" in summary
        assert "total_projected_expense_cad" in summary
        assert "projected_net_cad" in summary
    
    def test_projections_calculations_correct(self, auth_token):
        """Test projection calculations are correct based on recurring transactions"""
        response = requests.get(f"{BASE_URL}/api/projections", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # Test user has: $5000 monthly income, $1500 monthly rent, $200 twice monthly groceries
        # Monthly expense = $1500 + ($200 * 2) = $1900
        # Monthly net = $5000 - $1900 = $3100
        # 6 month totals: income = $30,000, expense = $11,400
        
        assert summary["total_projected_income_cad"] == 30000.0, f"Income should be 30000, got {summary['total_projected_income_cad']}"
        assert summary["total_projected_expense_cad"] == 11400.0, f"Expense should be 11400, got {summary['total_projected_expense_cad']}"
        assert summary["projected_net_cad"] == 18600.0, f"Net should be 18600, got {summary['projected_net_cad']}"


class TestDashboardEndpoints:
    """Tests for dashboard endpoints"""
    
    def test_dashboard_overview(self, auth_token):
        """Test dashboard overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "total_income" in data
        assert "total_expense" in data
        assert "net_balance" in data
    
    def test_dashboard_total_cash(self, auth_token):
        """Test total cash endpoint with currency conversion"""
        response = requests.get(f"{BASE_URL}/api/dashboard/total-cash", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "total_cad" in data
        assert "accounts" in data
        assert "base_currency" in data
        assert data["base_currency"] == "CAD"


# Fixtures
@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def test_category(auth_token):
    """Get first expense category"""
    response = requests.get(f"{BASE_URL}/api/categories", headers={
        "Authorization": f"Bearer {auth_token}"
    })
    if response.status_code == 200:
        categories = response.json()
        expense_cats = [c for c in categories if c.get('type') == 'expense']
        if expense_cats:
            return expense_cats[0]
    pytest.skip("No expense categories found")


@pytest.fixture
def test_account(auth_token):
    """Get first account"""
    response = requests.get(f"{BASE_URL}/api/accounts", headers={
        "Authorization": f"Bearer {auth_token}"
    })
    if response.status_code == 200:
        accounts = response.json()
        if accounts:
            return accounts[0]
    pytest.skip("No accounts found")
