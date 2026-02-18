import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CURRENCY_SYMBOLS = {
  CAD: 'CA$',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$'
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category_id: '',
    account_id: '',
    description: '',
    date: new Date(),
    is_recurring: false,
    recurring_frequency: 'monthly'
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnRes, catRes, accRes] = await Promise.all([
        axios.get(`${API_URL}/transactions`),
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/accounts`)
      ]);
      setTransactions(txnRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category_id || !formData.account_id) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: formData.date.toISOString()
      };

      if (editingTransaction) {
        await axios.put(`${API_URL}/transactions/${editingTransaction.id}`, payload);
        toast.success('Transaction updated successfully');
      } else {
        await axios.post(`${API_URL}/transactions`, payload);
        toast.success('Transaction created successfully');
      }

      fetchData();
      closeDialog();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    }
  };

  const openDeleteDialog = (transaction) => {
    setDeletingTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;

    try {
      await axios.delete(`${API_URL}/transactions/${deletingTransaction.id}`);
      toast.success('Transaction deleted successfully');
      fetchData();
      setDeleteDialogOpen(false);
      setDeletingTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const openDialog = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        category_id: transaction.category_id,
        account_id: transaction.account_id,
        description: transaction.description,
        date: new Date(transaction.date),
        is_recurring: transaction.is_recurring
      });
    } else {
      setEditingTransaction(null);
      const defaultAccount = accounts.find(acc => acc.is_default) || accounts[0];
      setFormData({
        type: 'expense',
        amount: '',
        category_id: '',
        account_id: defaultAccount?.id || '',
        description: '',
        date: new Date(),
        is_recurring: false
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryById = (id) => {
    return categories.find(cat => cat.id === id);
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryById(txn.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || txn.type === filterType;
    const matchesCategory = filterCategory === 'all' || txn.category_id === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <Layout>
      <div className="space-y-6" data-testid="transactions-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">Manage your income and expenses</p>
          </div>
          <Button onClick={() => openDialog()} data-testid="add-transaction-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger data-testid="type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger data-testid="category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card data-testid="transactions-list">
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>{filteredTransactions.length} transactions found</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-2">
                {filteredTransactions.map((txn) => {
                  const category = getCategoryById(txn.category_id);
                  return (
                    <div key={txn.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${txn.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                          <span className="text-xl">{category?.icon || '💰'}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{category?.name || 'Unknown'}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${txn.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {txn.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{txn.description || 'No description'}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(txn.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-lg font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(txn)}
                            data-testid={`edit-transaction-${txn.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(txn);
                            }}
                            data-testid={`delete-transaction-${txn.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No transactions found</p>
                <Button variant="link" onClick={() => openDialog()} className="mt-2">
                  Add your first transaction
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="transaction-dialog">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Update transaction details' : 'Enter transaction details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger data-testid="transaction-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount {formData.account_id && accounts.find(a => a.id === formData.account_id) && 
                    `(${accounts.find(a => a.id === formData.account_id).currency})`} *
                </Label>
                <div className="relative">
                  {formData.account_id && accounts.find(a => a.id === formData.account_id) && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      {CURRENCY_SYMBOLS[accounts.find(a => a.id === formData.account_id).currency] || 
                       accounts.find(a => a.id === formData.account_id).currency}
                    </span>
                  )}
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                    className={formData.account_id && accounts.find(a => a.id === formData.account_id) ? 'pl-12' : ''}
                    data-testid="transaction-amount-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category_id} onValueChange={(val) => setFormData({...formData, category_id: val})}>
                  <SelectTrigger data-testid="transaction-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.type === formData.type).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Select value={formData.account_id} onValueChange={(val) => setFormData({...formData, account_id: val})}>
                  <SelectTrigger data-testid="transaction-account-select">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="transaction-date-picker">
                      {formData.date ? format(formData.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({...formData, date: date || new Date()})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a note..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  data-testid="transaction-description-input"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="transaction-submit-button">
                  {editingTransaction ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="delete-confirmation-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
                {deletingTransaction && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-semibold text-gray-900">
                      {deletingTransaction.description || 'No description'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Amount: {formatCurrency(deletingTransaction.amount)}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-cancel-button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                data-testid="delete-confirm-button"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Transactions;
