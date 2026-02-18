import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, History } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CURRENCY_SYMBOLS = {
  CAD: 'CA$',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$'
};

const AccountBalanceUpdate = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState(null);
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [newBalance, setNewBalance] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const [accountsRes, balanceRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/accounts`),
        axios.get(`${API_URL}/accounts/${accountId}/balance`),
        axios.get(`${API_URL}/accounts/${accountId}/balance-history`)
      ]);

      const accountData = accountsRes.data.find(acc => acc.id === accountId);
      if (!accountData) {
        toast.error('Account not found');
        navigate('/accounts');
        return;
      }

      setAccount(accountData);
      setBalanceInfo(balanceRes.data);
      setHistory(historyRes.data);
      setNewBalance(balanceRes.data.current_balance.toFixed(2));
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newBalance || isNaN(parseFloat(newBalance))) {
      toast.error('Please enter a valid balance');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/accounts/${accountId}/update-balance`, {
        new_balance: parseFloat(newBalance),
        notes: notes
      });

      toast.success('Balance updated successfully!');
      setNotes('');
      fetchAccountData();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update balance');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const adjustment = newBalance ? parseFloat(newBalance) - balanceInfo.current_balance : 0;

  return (
    <Layout>
      <div className="space-y-6" data-testid="balance-update-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Update Balance</h1>
            <p className="text-gray-600 mt-1">{account?.name} ({account?.currency})</p>
          </div>
        </div>

        {/* Current Balance Card */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Current Balance</CardTitle>
                <CardDescription>As calculated from transactions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(balanceInfo?.opening_balance || 0, account?.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Income</p>
                <p className="text-lg font-semibold text-green-600">
                  +{formatCurrency(balanceInfo?.total_income || 0, account?.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                <p className="text-lg font-semibold text-red-600">
                  -{formatCurrency(balanceInfo?.total_expense || 0, account?.currency)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-blue-900" data-testid="current-balance">
                {formatCurrency(balanceInfo?.current_balance || 0, account?.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Update Balance Form */}
        <Card data-testid="update-form">
          <CardHeader>
            <CardTitle>Adjust Balance</CardTitle>
            <CardDescription>
              Update the balance to reflect your actual account balance (e.g., from bank statement)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newBalance">New Balance *</Label>
                <Input
                  id="newBalance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  required
                  data-testid="new-balance-input"
                />
              </div>

              {adjustment !== 0 && (
                <div className={`p-4 rounded-lg ${adjustment > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {adjustment > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Adjustment: {adjustment > 0 ? '+' : ''}{formatCurrency(Math.abs(adjustment), account?.currency)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {adjustment > 0 
                          ? 'Opening balance will be increased' 
                          : 'Opening balance will be decreased'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Reason for adjustment (e.g., Bank reconciliation, Missing transaction)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !newBalance}
                className="w-full"
                data-testid="submit-button"
              >
                {submitting ? 'Updating...' : 'Update Balance'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Balance History */}
        <Card data-testid="balance-history">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-600" />
              <div>
                <CardTitle>Balance Update History</CardTitle>
                <CardDescription>{history.length} adjustments recorded</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((update) => (
                  <div key={update.id} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-900">{update.user_name}</p>
                          <span className="text-xs text-gray-500">•</span>
                          <p className="text-xs text-gray-500">{formatDate(update.date)}</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-2">
                          <div>
                            <p className="text-xs text-gray-600">Previous</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {formatCurrency(update.previous_balance, account?.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">New</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(update.new_balance, account?.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Adjustment</p>
                            <p className={`text-sm font-bold ${update.adjustment_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {update.adjustment_amount >= 0 ? '+' : ''}{formatCurrency(update.adjustment_amount, account?.currency)}
                            </p>
                          </div>
                        </div>
                        
                        {update.notes && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <p className="text-xs text-gray-600 mb-1">Notes:</p>
                            <p className="text-sm text-gray-900">{update.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No balance adjustments yet</p>
                <p className="text-sm mt-1">Update the balance above to create the first record</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AccountBalanceUpdate;
