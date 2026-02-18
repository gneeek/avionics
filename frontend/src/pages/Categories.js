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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#6366F1', '#14B8A6', '#6B7280', '#F43F5E'
];

const PRESET_ICONS = ['💰', '💵', '💳', '🏦', '📈', '🍔', '🚗', '🏠', '🎮', '🛒', '✈️', '💊', '📱', '⚡', '📦'];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: '💰'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Please enter category name');
      return;
    }

    try {
      if (editingCategory) {
        await axios.put(`${API_URL}/categories/${editingCategory.id}`, formData);
        toast.success('Category updated successfully');
      } else {
        await axios.post(`${API_URL}/categories`, formData);
        toast.success('Category created successfully');
      }

      fetchCategories();
      closeDialog();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const openDeleteDialog = (category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await axios.delete(`${API_URL}/categories/${deletingCategory.id}`);
      toast.success('Category deleted successfully');
      fetchCategories();
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'expense',
        color: '#3B82F6',
        icon: '💰'
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  return (
    <Layout>
      <div className="space-y-6" data-testid="categories-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">Organize your transactions</p>
          </div>
          <Button onClick={() => openDialog()} data-testid="add-category-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="income-categories">
            <CardHeader>
              <CardTitle>Income Categories</CardTitle>
              <CardDescription>{incomeCategories.length} categories</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeCategories.length > 0 ? (
                <div className="space-y-2">
                  {incomeCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <span className="text-xl">{cat.icon}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cat.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-xs text-gray-500">{cat.color}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(cat)}
                          data-testid={`edit-category-${cat.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(cat);
                          }}
                          data-testid={`delete-category-${cat.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No income categories</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="expense-categories">
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>{expenseCategories.length} categories</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseCategories.length > 0 ? (
                <div className="space-y-2">
                  {expenseCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <span className="text-xl">{cat.icon}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cat.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-xs text-gray-500">{cat.color}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(cat)}
                          data-testid={`edit-category-${cat.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(cat);
                          }}
                          data-testid={`delete-category-${cat.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No expense categories</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="category-dialog">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update category details' : 'Create a new category'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Category name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="category-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger data-testid="category-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({...formData, icon})}
                      className={`p-2 rounded border text-xl hover:bg-gray-100 ${formData.icon === icon ? 'ring-2 ring-blue-500' : ''}`}
                      data-testid={`icon-${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({...formData, color})}
                      className={`w-full h-10 rounded border ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="category-submit-button">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="delete-category-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this category? This action cannot be undone.
                {deletingCategory && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{deletingCategory.icon}</span>
                      <p className="text-sm font-semibold text-gray-900">
                        {deletingCategory.name}
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${deletingCategory.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {deletingCategory.type}
                      </span>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-category-cancel-button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                data-testid="delete-category-confirm-button"
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

export default Categories;
