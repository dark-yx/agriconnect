import express from 'express';
import { body, validationResult } from 'express-validator';
import AuthService from '../../config/auth.js';
import DatabaseService from '../../config/database.js';

const router = express.Router();

// Validation middleware
const validateTransaction = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('delivery_address').isObject().withMessage('Delivery address is required'),
  body('notes').optional().trim(),
];

const validateTransactionUpdate = [
  body('status').optional().isIn(['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed']),
  body('payment_status').optional().isIn(['pending', 'paid', 'failed', 'refunded']),
  body('delivery_date').optional().isISO8601(),
  body('notes').optional().trim(),
];

// Get all transactions for authenticated user
router.get('/', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const transactions = await DatabaseService.getTransactions(req.profile.id);

      res.json({ transactions });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions' 
      });
    }
  }
);

// Get single transaction by ID
router.get('/:id', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: transaction, error } = await DatabaseService.client
        .from('transactions')
        .select(`
          *,
          buyer:profiles!transactions_buyer_id_fkey(id, full_name, company_name, email, phone),
          seller:profiles!transactions_seller_id_fkey(id, full_name, company_name, email, phone),
          product:products(id, name, category, unit, images),
          logistics_shipments(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Check if user is involved in this transaction
      if (transaction.buyer_id !== req.profile.id && transaction.seller_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to view this transaction' });
      }

      res.json({ transaction });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transaction' 
      });
    }
  }
);

// Create new transaction
router.post('/', 
  AuthService.authenticateRequest.bind(AuthService),
  validateTransaction,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { product_id, quantity, unit_price, delivery_address, notes } = req.body;

      // Get product details and verify availability
      const product = await DatabaseService.getProduct(product_id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.available_quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient product quantity available' });
      }

      if (product.producer_id === req.profile.id) {
        return res.status(400).json({ error: 'Cannot purchase your own product' });
      }

      const total_amount = quantity * unit_price;

      const transactionData = {
        buyer_id: req.profile.id,
        seller_id: product.producer_id,
        product_id,
        quantity,
        unit_price,
        total_amount,
        currency: product.currency || 'USD',
        status: 'pending',
        payment_status: 'pending',
        delivery_address,
        notes
      };

      const transaction = await DatabaseService.createTransaction(transactionData);

      // Update product availability
      await DatabaseService.updateProduct(product_id, {
        available_quantity: product.available_quantity - quantity
      });

      // Create notifications
      await DatabaseService.createNotification({
        user_id: product.producer_id,
        title: 'New Order Received',
        message: `You have received a new order for ${product.name}`,
        type: 'info',
        category: 'transaction',
        action_url: `/transactions/${transaction.id}`,
        metadata: { transaction_id: transaction.id }
      });

      res.status(201).json({
        message: 'Transaction created successfully',
        transaction
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to create transaction' 
      });
    }
  }
);

// Update transaction status
router.put('/:id', 
  AuthService.authenticateRequest.bind(AuthService),
  validateTransactionUpdate,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const updates = req.body;

      // Get transaction and verify authorization
      const { data: transaction, error } = await DatabaseService.client
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Check if user is involved in this transaction
      if (transaction.buyer_id !== req.profile.id && transaction.seller_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to update this transaction' });
      }

      // Business logic for status transitions
      const allowedTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['paid', 'cancelled'],
        paid: ['shipped', 'cancelled'],
        shipped: ['delivered', 'cancelled'],
        delivered: ['completed'],
        completed: [],
        cancelled: [],
        disputed: ['resolved', 'cancelled']
      };

      if (updates.status && !allowedTransitions[transaction.status].includes(updates.status)) {
        return res.status(400).json({ 
          error: `Cannot transition from ${transaction.status} to ${updates.status}` 
        });
      }

      const updatedTransaction = await DatabaseService.updateTransaction(id, updates);

      // Create notification for the other party
      const otherPartyId = transaction.buyer_id === req.profile.id ? 
        transaction.seller_id : transaction.buyer_id;

      if (updates.status) {
        await DatabaseService.createNotification({
          user_id: otherPartyId,
          title: 'Transaction Updated',
          message: `Transaction status updated to: ${updates.status}`,
          type: 'info',
          category: 'transaction',
          action_url: `/transactions/${id}`,
          metadata: { transaction_id: id, new_status: updates.status }
        });
      }

      res.json({
        message: 'Transaction updated successfully',
        transaction: updatedTransaction
      });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to update transaction' 
      });
    }
  }
);

// Cancel transaction
router.post('/:id/cancel', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Get transaction and verify authorization
      const { data: transaction, error } = await DatabaseService.client
        .from('transactions')
        .select('*, product:products(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Check if user is involved in this transaction
      if (transaction.buyer_id !== req.profile.id && transaction.seller_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to cancel this transaction' });
      }

      // Check if transaction can be cancelled
      if (!['pending', 'confirmed'].includes(transaction.status)) {
        return res.status(400).json({ error: 'Transaction cannot be cancelled at this stage' });
      }

      // Update transaction status
      const updatedTransaction = await DatabaseService.updateTransaction(id, {
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user'
      });

      // Restore product availability
      await DatabaseService.updateProduct(transaction.product_id, {
        available_quantity: transaction.product.available_quantity + transaction.quantity
      });

      // Create notification for the other party
      const otherPartyId = transaction.buyer_id === req.profile.id ? 
        transaction.seller_id : transaction.buyer_id;

      await DatabaseService.createNotification({
        user_id: otherPartyId,
        title: 'Transaction Cancelled',
        message: `Transaction has been cancelled${reason ? `: ${reason}` : ''}`,
        type: 'warning',
        category: 'transaction',
        action_url: `/transactions/${id}`,
        metadata: { transaction_id: id, reason }
      });

      res.json({
        message: 'Transaction cancelled successfully',
        transaction: updatedTransaction
      });
    } catch (error) {
      console.error('Cancel transaction error:', error);
      res.status(500).json({ 
        error: 'Failed to cancel transaction' 
      });
    }
  }
);

// Get transaction statistics for user
router.get('/stats/summary', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { data: transactions, error } = await DatabaseService.client
        .from('transactions')
        .select('status, total_amount, created_at')
        .or(`buyer_id.eq.${req.profile.id},seller_id.eq.${req.profile.id}`);

      if (error) throw error;

      const stats = {
        total_transactions: transactions.length,
        completed_transactions: transactions.filter(t => t.status === 'completed').length,
        pending_transactions: transactions.filter(t => ['pending', 'confirmed', 'paid', 'shipped'].includes(t.status)).length,
        cancelled_transactions: transactions.filter(t => t.status === 'cancelled').length,
        total_value: transactions.reduce((sum, t) => sum + parseFloat(t.total_amount), 0),
        completed_value: transactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + parseFloat(t.total_amount), 0),
        monthly_transactions: {}
      };

      // Group by month for the last 12 months
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().slice(0, 7); // YYYY-MM format
      }).reverse();

      last12Months.forEach(month => {
        stats.monthly_transactions[month] = transactions.filter(t => 
          t.created_at.startsWith(month)
        ).length;
      });

      res.json({ stats });
    } catch (error) {
      console.error('Get transaction stats error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transaction statistics' 
      });
    }
  }
);

export default router;