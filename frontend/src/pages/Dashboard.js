import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const CURRENCY_SYMBOLS = {
  CAD: 'CA$',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$'
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState({});
  const [totalCash, setTotalCash] = useState(null);
  const [isTotalCashOpen, setIsTotalCashOpen] = useState(false);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [overviewRes, trendsRes, breakdownRes, transactionsRes, categoriesRes, totalCashRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/overview`, { params: { month: selectedMonth, year: selectedYear } }),
        axios.get(`${API_URL}/dashboard/trends`),
        axios.get(`${API_URL}/dashboard/category-breakdown`, { params: { month: selectedMonth, year: selectedYear, type: 'expense' } }),
        axios.get(`${API_URL}/transactions`, { params: { limit: 10 } }),
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/dashboard/total-cash`)
      ]);

      setOverview(overviewRes.data);
      setTrends(trendsRes.data);
      setCategoryBreakdown(breakdownRes.data);
      setRecentTransactions(transactionsRes.data.slice(0, 10));
      setTotalCash(totalCashRes.data);
      
      const catMap = {};
      categoriesRes.data.forEach(cat => {
        catMap[cat.id] = cat;
      });
      setCategories(catMap);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (currency && CURRENCY_SYMBOLS[currency]) {
      const symbol = CURRENCY_SYMBOLS[currency];
      return `${symbol}${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="dashboard-title">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          
          {/* Month/Year Selector */}
          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger className="w-32" data-testid="month-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-24" data-testid="year-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="income-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="total-income">
                {formatCurrency(overview?.total_income || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {overview?.transaction_count || 0} transactions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="expense-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="total-expense">
                {formatCurrency(overview?.total_expense || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card data-testid="balance-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net Balance</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(overview?.net_balance || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`} data-testid="net-balance">
                {formatCurrency(overview?.net_balance || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Income - Expenses
              </p>
            </CardContent>
          </Card>

          <Card data-testid="savings-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Savings Rate</CardTitle>
              <PiggyBank className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600" data-testid="savings-rate">
                {overview?.savings_rate || 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Of total income
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Total Cash Section */}
        {totalCash && (
          <Card className="border-2 border-blue-200 bg-blue-50" data-testid="total-cash-card">
            <Collapsible open={isTotalCashOpen} onOpenChange={setIsTotalCashOpen}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-blue-100 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg">Total Cash (All Accounts)</CardTitle>
                        <CardDescription className="text-blue-700">
                          Converted to CAD • {totalCash.accounts?.length || 0} accounts
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-900" data-testid="total-cash-amount">
                          {formatCurrency(totalCash.total_cad || 0, 'CAD')}
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          Click to {isTotalCashOpen ? 'hide' : 'show'} accounts
                        </p>
                      </div>
                      {isTotalCashOpen ? (
                        <ChevronUp className="h-6 w-6 text-blue-700" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-blue-700" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-4 bg-white rounded-b-lg">
                  <div className="space-y-3">
                    {totalCash.accounts?.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full ${account.is_default ? 'bg-blue-100' : 'bg-gray-200'} flex items-center justify-center`}>
                            <Wallet className={`h-5 w-5 ${account.is_default ? 'text-blue-600' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{account.name}</p>
                              {account.is_default && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{account.currency}</p>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(account.original_balance, account.currency)}
                              </p>
                              <p className="text-xs text-gray-500">Original</p>
                            </div>
                            
                            {account.currency !== 'CAD' && (
                              <>
                                <div className="text-gray-400">→</div>
                                <div>
                                  <p className="text-sm font-bold text-blue-600">
                                    {formatCurrency(account.balance_in_cad, 'CAD')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Rate: {account.exchange_rate.toFixed(4)}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 text-center">
                      Exchange rates from {totalCash.rates_source} • Last updated: {totalCash.last_updated}
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expense Trends */}
          <Card data-testid="trends-chart">
            <CardHeader>
              <CardTitle>Income vs Expense Trends</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" />
                  <Area type="monotone" dataKey="expense" stackId="2" stroke="#EF4444" fill="#EF4444" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card data-testid="category-chart">
            <CardHeader>
              <CardTitle>Expense by Category</CardTitle>
              <CardDescription>Current month breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category}: ${formatCurrency(entry.amount)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No expense data for this month
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card data-testid="recent-transactions">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <span className="text-lg">{categories[txn.category_id]?.icon || '💰'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{categories[txn.category_id]?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{txn.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions yet</p>
                <button 
                  onClick={() => navigate('/transactions')}
                  className="mt-2 text-blue-600 hover:underline"
                  data-testid="add-transaction-link"
                >
                  Add your first transaction
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
