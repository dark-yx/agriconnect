import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TransactionsPage = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock transaction data
      const mockTransactions = [
        {
          id: 'txn-001',
          product: {
            id: '1',
            name: 'Organic Tomatoes',
            category: 'Vegetables',
            unit: 'kg'
          },
          buyer: {
            id: 'buyer-1',
            full_name: 'Alice Johnson',
            company_name: 'Fresh Market Co.'
          },
          seller: {
            id: 'seller-1',
            full_name: 'John Smith',
            company_name: 'Green Valley Farm'
          },
          quantity: 50,
          unit_price: 3.50,
          total_amount: 175.00,
          currency: 'USD',
          status: 'completed',
          payment_status: 'paid',
          delivery_date: '2024-01-20',
          created_at: '2024-01-15T10:00:00Z',
          notes: 'Delivered on time, excellent quality'
        },
        {
          id: 'txn-002',
          product: {
            id: '2',
            name: 'Premium Wheat',
            category: 'Grains',
            unit: 'kg'
          },
          buyer: {
            id: 'buyer-2',
            full_name: 'Bob Wilson',
            company_name: 'Bakery Plus'
          },
          seller: {
            id: 'seller-2',
            full_name: 'Maria Garcia',
            company_name: 'Golden Fields Co.'
          },
          quantity: 200,
          unit_price: 0.85,
          total_amount: 170.00,
          currency: 'USD',
          status: 'shipped',
          payment_status: 'paid',
          delivery_date: '2024-01-25',
          created_at: '2024-01-18T14:30:00Z',
          notes: 'Express shipping requested'
        },
        {
          id: 'txn-003',
          product: {
            id: '3',
            name: 'Fresh Apples',
            category: 'Fruits',
            unit: 'kg'
          },
          buyer: {
            id: 'buyer-3',
            full_name: 'Carol Davis',
            company_name: 'Healthy Foods Inc.'
          },
          seller: {
            id: 'seller-3',
            full_name: 'David Johnson',
            company_name: 'Orchard Hills'
          },
          quantity: 100,
          unit_price: 2.25,
          total_amount: 225.00,
          currency: 'USD',
          status: 'pending',
          payment_status: 'pending',
          delivery_date: null,
          created_at: '2024-01-22T09:15:00Z',
          notes: 'Awaiting payment confirmation'
        }
      ];

      // Filter transactions based on user role and filter
      let filteredTransactions = mockTransactions;
      
      if (filter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.status === filter);
      }

      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'badge-warning', icon: '⏳', label: 'Pending' },
      confirmed: { class: 'badge-primary', icon: '✅', label: 'Confirmed' },
      paid: { class: 'badge-success', icon: '💳', label: 'Paid' },
      shipped: { class: 'badge-accent', icon: '🚚', label: 'Shipped' },
      delivered: { class: 'badge-success', icon: '📦', label: 'Delivered' },
      completed: { class: 'badge-success', icon: '🎉', label: 'Completed' },
      cancelled: { class: 'badge-error', icon: '❌', label: 'Cancelled' },
      disputed: { class: 'badge-error', icon: '⚠️', label: 'Disputed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge ${config.class}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'badge-warning', icon: '⏳', label: 'Payment Pending' },
      paid: { class: 'badge-success', icon: '✅', label: 'Paid' },
      failed: { class: 'badge-error', icon: '❌', label: 'Payment Failed' },
      refunded: { class: 'badge-secondary', icon: '↩️', label: 'Refunded' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge ${config.class}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const handleUpdateStatus = async (transactionId, newStatus) => {
    try {
      // In a real app, this would make an API call
      console.log('Updating transaction status:', transactionId, newStatus);
      
      setTransactions(prev => 
        prev.map(t => 
          t.id === transactionId 
            ? { ...t, status: newStatus }
            : t
        )
      );
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'paid', label: 'Paid' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Transactions
          </h1>
          <p className="text-neutral-600">
            Manage your {profile?.role === 'producer' ? 'sales' : 'purchases'} and track order status.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center space-x-4">
            <label htmlFor="filter" className="text-sm font-medium text-neutral-700">
              Filter by status:
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input w-auto"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-neutral-600">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="card hover:shadow-medium transition-all duration-300">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                    {/* Transaction Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                            {transaction.product.name}
                          </h3>
                          <p className="text-sm text-neutral-600">
                            Transaction ID: {transaction.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary-600">
                            ${transaction.total_amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {transaction.quantity} {transaction.unit} × ${transaction.unit_price}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-neutral-600">
                            {profile?.role === 'producer' ? 'Buyer' : 'Seller'}:
                          </span>
                          <p className="text-sm text-neutral-900">
                            {profile?.role === 'producer' 
                              ? (transaction.buyer.company_name || transaction.buyer.full_name)
                              : (transaction.seller.company_name || transaction.seller.full_name)
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-neutral-600">Order Date:</span>
                          <p className="text-sm text-neutral-900">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-neutral-600">Delivery Date:</span>
                          <p className="text-sm text-neutral-900">
                            {transaction.delivery_date 
                              ? new Date(transaction.delivery_date).toLocaleDateString()
                              : 'TBD'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-neutral-600">Category:</span>
                          <p className="text-sm text-neutral-900">{transaction.product.category}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        {getStatusBadge(transaction.status)}
                        {getPaymentStatusBadge(transaction.payment_status)}
                      </div>

                      {transaction.notes && (
                        <div className="bg-neutral-50 rounded-lg p-3 mb-4">
                          <span className="text-sm font-medium text-neutral-600">Notes:</span>
                          <p className="text-sm text-neutral-700 mt-1">{transaction.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 lg:ml-6">
                      <button className="btn-secondary btn-sm">
                        View Details
                      </button>
                      
                      {profile?.role === 'producer' && transaction.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(transaction.id, 'confirmed')}
                          className="btn-primary btn-sm"
                        >
                          Confirm Order
                        </button>
                      )}
                      
                      {profile?.role === 'producer' && transaction.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(transaction.id, 'shipped')}
                          className="btn-accent btn-sm"
                        >
                          Mark as Shipped
                        </button>
                      )}
                      
                      {transaction.status === 'shipped' && (
                        <button className="btn-secondary btn-sm">
                          Track Shipment
                        </button>
                      )}
                      
                      {transaction.status === 'delivered' && (
                        <button
                          onClick={() => handleUpdateStatus(transaction.id, 'completed')}
                          className="btn-success btn-sm"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              No transactions found
            </h3>
            <p className="text-neutral-600 mb-4">
              {filter === 'all' 
                ? "You haven't made any transactions yet."
                : `No transactions with status "${filter}" found.`
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="btn-secondary"
                >
                  Show All Transactions
                </button>
              )}
              <button
                onClick={() => window.location.href = '/products'}
                className="btn-primary"
              >
                {profile?.role === 'producer' ? 'List Products' : 'Browse Products'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;