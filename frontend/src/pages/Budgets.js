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
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deletingBudget, setDeletingBudget] = useState(null);

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    period: 'monthly'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/budgets`),
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/transactions`)
      ]);
      setBudgets(budgetsRes.data);
      setCategories(categoriesRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_id || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingBudget) {
        await axios.put(`${API_URL}/budgets/${editingBudget.id}`, payload);
        toast.success('Budget updated successfully');
      } else {
        await axios.post(`${API_URL}/budgets`, payload);
        toast.success('Budget created successfully');
      }

      fetchData();
      closeDialog();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    }
  };

  const openDeleteDialog = (budget) => {
    setDeletingBudget(budget);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;

    try {
      await axios.delete(`${API_URL}/budgets/${deletingBudget.id}`);
      toast.success('Budget deleted successfully');
      fetchData();
      setDeleteDialogOpen(false);
      setDeletingBudget(null);
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const openDialog = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        category_id: budget.category_id,
        amount: budget.amount.toString(),
        period: budget.period
      });
    } else {
      setEditingBudget(null);
      setFormData({
        category_id: '',
        amount: '',
        period: 'monthly'
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBudget(null);
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

  const getSpentAmount = (categoryId, period) => {
    const now = new Date();
    const startDate = period === 'monthly'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);

    return transactions
      .filter(txn => 
        txn.category_id === categoryId && 
        txn.type === 'expense' &&
        new Date(txn.date) >= startDate
      )
      .reduce((sum, txn) => sum + txn.amount, 0);
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="budgets-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-600 mt-1">Track and manage your spending limits</p>
          </div>
          <Button onClick={() => openDialog()} data-testid="add-budget-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Budget
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : budgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets.map(budget => {
              const category = getCategoryById(budget.category_id);
              const spent = getSpentAmount(budget.category_id, budget.period);
              const percentage = (spent / budget.amount) * 100;
              const isOverBudget = spent > budget.amount;

              return (
                <Card key={budget.id} data-testid={`budget-card-${budget.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${category?.color}20` }}
                        >
                          <span className="text-xl">{category?.icon || '💰'}</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category?.name || 'Unknown'}</CardTitle>
                          <CardDescription className="capitalize">{budget.period}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(budget)}
                          data-testid={`edit-budget-${budget.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(budget);
                          }}
                          data-testid={`delete-budget-${budget.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Spent</span>
                          <span className="font-medium">
                            {formatCurrency(spent)} of {formatCurrency(budget.amount)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className="h-2"
                          data-testid={`budget-progress-${budget.id}`}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className={`text-sm font-medium ${
                          isOverBudget ? 'text-red-600' : percentage > 80 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {isOverBudget 
                            ? `Over by ${formatCurrency(spent - budget.amount)}`
                            : `${formatCurrency(budget.amount - spent)} remaining`
                          }
                        </span>
                        <span className={`text-lg font-bold ${
                          isOverBudget ? 'text-red-600' : percentage > 80 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {percentage.toFixed(0)}%
                        </span>
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
                <p>No budgets set yet</p>
                <Button variant="link" onClick={() => openDialog()} className="mt-2">
                  Create your first budget
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="budget-dialog">
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
              <DialogDescription>
                {editingBudget ? 'Update budget details' : 'Set spending limit for a category'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category_id} onValueChange={(val) => setFormData({...formData, category_id: val})}>
                  <SelectTrigger data-testid="budget-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.type === 'expense').map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  data-testid="budget-amount-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period *</Label>
                <Select value={formData.period} onValueChange={(val) => setFormData({...formData, period: val})}>
                  <SelectTrigger data-testid="budget-period-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="budget-submit-button">
                  {editingBudget ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Budgets;
