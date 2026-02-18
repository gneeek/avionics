import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CURRENCY_SYMBOLS = {
  CAD: 'CA$',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$'
};

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    currency: 'CAD',
    opening_balance: '',
    is_default: false
  });

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/accounts`);
      setAccounts(response.data);
      
      // Fetch balance for each account
      const balances = {};
      for (const account of response.data) {
        const balanceRes = await axios.get(`${API_URL}/accounts/${account.id}/balance`);
        balances[account.id] = balanceRes.data;
      }
      setAccountBalances(balances);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.currency) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0
      };

      if (editingAccount) {
        await axios.put(`${API_URL}/accounts/${editingAccount.id}`, payload);
        toast.success('Account updated successfully');
      } else {
        await axios.post(`${API_URL}/accounts`, payload);
        toast.success('Account created successfully');
      }

      fetchAccounts();
      closeDialog();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error(error.response?.data?.detail || 'Failed to save account');
    }
  };

  const openDeleteDialog = (account) => {
    setDeletingAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;

    try {
      await axios.delete(`${API_URL}/accounts/${deletingAccount.id}`);
      toast.success('Account deleted successfully');
      fetchAccounts();
      setDeleteDialogOpen(false);
      setDeletingAccount(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    }
  };

  const openDialog = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        currency: account.currency,
        opening_balance: account.opening_balance.toString(),
        is_default: account.is_default
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        currency: 'CAD',
        opening_balance: '',
        is_default: false
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const formatCurrency = (amount, currency) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="accounts-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
            <p className="text-gray-600 mt-1">Manage your accounts and track balances</p>
          </div>
          <Button onClick={() => openDialog()} data-testid="add-account-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => {
              const balance = accountBalances[account.id];
              const currentBalance = balance?.current_balance || 0;
              const isPositive = currentBalance >= 0;

              return (
                <Card key={account.id} data-testid={`account-card-${account.id}`} className={account.is_default ? 'ring-2 ring-blue-500' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {account.name}
                            {account.is_default && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </CardTitle>
                          <CardDescription>{account.currency}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(account)}
                          data-testid={`edit-account-${account.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(account);
                          }}
                          data-testid={`delete-account-${account.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Current Balance */}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                        <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`} data-testid={`account-balance-${account.id}`}>
                          {formatCurrency(currentBalance, account.currency)}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span>Income</span>
                          </div>
                          <p className="text-sm font-semibold text-green-600">
                            {formatCurrency(balance?.total_income || 0, account.currency)}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <TrendingDown className="h-3 w-3 text-red-600" />
                            <span>Expenses</span>
                          </div>
                          <p className="text-sm font-semibold text-red-600">
                            {formatCurrency(balance?.total_expense || 0, account.currency)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Opening: {formatCurrency(account.opening_balance, account.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No bank accounts yet</p>
                <Button variant="link" onClick={() => openDialog()} className="mt-2">
                  Create your first account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="account-dialog">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Bank Account'}</DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Update account details' : 'Create a new bank account to track'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Checking, Savings"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="account-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select value={formData.currency} onValueChange={(val) => setFormData({...formData, currency: val})}>
                  <SelectTrigger data-testid="account-currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_balance">Opening Balance</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({...formData, opening_balance: e.target.value})}
                  data-testid="account-opening-balance-input"
                />
                <p className="text-xs text-gray-500">Current balance in this account before tracking</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                  data-testid="account-default-switch"
                />
                <Label htmlFor="is_default" className="cursor-pointer">Set as default account</Label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="account-submit-button">
                  {editingAccount ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="delete-account-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this account? This action cannot be undone.
                {deletingAccount && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {deletingAccount.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {deletingAccount.currency} • Balance: {formatCurrency(accountBalances[deletingAccount.id]?.current_balance || 0, deletingAccount.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-account-cancel-button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                data-testid="delete-account-confirm-button"
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

export default Accounts;
