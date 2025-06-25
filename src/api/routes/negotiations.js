import express from 'express';
import { body, validationResult } from 'express-validator';
import AuthService from '../../config/auth.js';
import DatabaseService from '../../config/database.js';

const router = express.Router();

// Validation middleware
const validateNegotiation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('offered_price').isFloat({ min: 0 }).withMessage('Offered price must be a positive number'),
  body('message').optional().trim(),
];

const validateNegotiationResponse = [
  body('action').isIn(['accept', 'reject', 'counter']).withMessage('Invalid action'),
  body('counter_offer').optional().isFloat({ min: 0 }).withMessage('Counter offer must be a positive number'),
  body('message').optional().trim(),
];

// Get all negotiations for authenticated user
router.get('/', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const negotiations = await DatabaseService.getNegotiations(req.profile.id);

      res.json({ negotiations });
    } catch (error) {
      console.error('Get negotiations error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch negotiations' 
      });
    }
  }
);

// Get single negotiation by ID
router.get('/:id', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: negotiation, error } = await DatabaseService.client
        .from('negotiations')
        .select(`
          *,
          buyer:profiles!negotiations_buyer_id_fkey(id, full_name, company_name, email),
          seller:profiles!negotiations_seller_id_fkey(id, full_name, company_name, email),
          product:products(id, name, category, unit, price_per_unit, images)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!negotiation) {
        return res.status(404).json({ error: 'Negotiation not found' });
      }

      // Check if user is involved in this negotiation
      if (negotiation.buyer_id !== req.profile.id && negotiation.seller_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to view this negotiation' });
      }

      res.json({ negotiation });
    } catch (error) {
      console.error('Get negotiation error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch negotiation' 
      });
    }
  }
);

// Create new negotiation (start price negotiation)
router.post('/', 
  AuthService.authenticateRequest.bind(AuthService),
  validateNegotiation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { product_id, quantity, offered_price, message } = req.body;

      // Get product details
      const product = await DatabaseService.getProduct(product_id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.producer_id === req.profile.id) {
        return res.status(400).json({ error: 'Cannot negotiate on your own product' });
      }

      if (product.available_quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient product quantity available' });
      }

      // Check if there's already an active negotiation
      const { data: existingNegotiation } = await DatabaseService.client
        .from('negotiations')
        .select('id')
        .eq('product_id', product_id)
        .eq('buyer_id', req.profile.id)
        .eq('status', 'active')
        .single();

      if (existingNegotiation) {
        return res.status(400).json({ error: 'You already have an active negotiation for this product' });
      }

      // Set expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const negotiationData = {
        product_id,
        buyer_id: req.profile.id,
        seller_id: product.producer_id,
        initial_price: product.price_per_unit,
        current_offer: offered_price,
        quantity,
        status: 'active',
        last_offer_by: req.profile.id,
        expires_at: expiresAt.toISOString(),
        messages: JSON.stringify([{
          from: req.profile.id,
          message: message || `Initial offer: $${offered_price} per ${product.unit}`,
          timestamp: new Date().toISOString(),
          offer_amount: offered_price
        }])
      };

      const negotiation = await DatabaseService.createNegotiation(negotiationData);

      // Create notification for seller
      await DatabaseService.createNotification({
        user_id: product.producer_id,
        title: 'New Price Negotiation',
        message: `${req.profile.full_name} wants to negotiate the price for ${product.name}`,
        type: 'info',
        category: 'negotiation',
        action_url: `/negotiations/${negotiation.id}`,
        metadata: { negotiation_id: negotiation.id, offered_price }
      });

      res.status(201).json({
        message: 'Negotiation started successfully',
        negotiation
      });
    } catch (error) {
      console.error('Create negotiation error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to start negotiation' 
      });
    }
  }
);

// Respond to negotiation (accept, reject, or counter-offer)
router.post('/:id/respond', 
  AuthService.authenticateRequest.bind(AuthService),
  validateNegotiationResponse,
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
      const { action, counter_offer, message } = req.body;

      // Get negotiation
      const { data: negotiation, error } = await DatabaseService.client
        .from('negotiations')
        .select(`
          *,
          product:products(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!negotiation) {
        return res.status(404).json({ error: 'Negotiation not found' });
      }

      // Check authorization (only seller can respond to buyer's offer and vice versa)
      if (negotiation.buyer_id !== req.profile.id && negotiation.seller_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to respond to this negotiation' });
      }

      // Check if negotiation is still active
      if (negotiation.status !== 'active') {
        return res.status(400).json({ error: 'Negotiation is no longer active' });
      }

      // Check if it's the other party's turn to respond
      if (negotiation.last_offer_by === req.profile.id) {
        return res.status(400).json({ error: 'Waiting for the other party to respond' });
      }

      // Check if negotiation has expired
      if (new Date(negotiation.expires_at) < new Date()) {
        await DatabaseService.updateNegotiation(id, { status: 'expired' });
        return res.status(400).json({ error: 'Negotiation has expired' });
      }

      let updates = {
        last_offer_by: req.profile.id
      };

      // Parse existing messages
      const messages = JSON.parse(negotiation.messages || '[]');
      const newMessage = {
        from: req.profile.id,
        timestamp: new Date().toISOString()
      };

      switch (action) {
        case 'accept':
          updates.status = 'accepted';
          newMessage.message = message || 'Offer accepted';
          newMessage.action = 'accept';
          
          // Create transaction automatically
          const transactionData = {
            buyer_id: negotiation.buyer_id,
            seller_id: negotiation.seller_id,
            product_id: negotiation.product_id,
            quantity: negotiation.quantity,
            unit_price: negotiation.current_offer,
            total_amount: negotiation.quantity * negotiation.current_offer,
            currency: negotiation.product.currency || 'USD',
            status: 'confirmed',
            payment_status: 'pending'
          };

          const transaction = await DatabaseService.createTransaction(transactionData);
          newMessage.transaction_id = transaction.id;
          break;

        case 'reject':
          updates.status = 'rejected';
          newMessage.message = message || 'Offer rejected';
          newMessage.action = 'reject';
          break;

        case 'counter':
          if (!counter_offer) {
            return res.status(400).json({ error: 'Counter offer amount is required' });
          }
          updates.current_offer = counter_offer;
          newMessage.message = message || `Counter offer: $${counter_offer} per ${negotiation.product.unit}`;
          newMessage.action = 'counter';
          newMessage.offer_amount = counter_offer;
          break;
      }

      messages.push(newMessage);
      updates.messages = JSON.stringify(messages);

      const updatedNegotiation = await DatabaseService.updateNegotiation(id, updates);

      // Create notification for the other party
      const otherPartyId = negotiation.buyer_id === req.profile.id ? 
        negotiation.seller_id : negotiation.buyer_id;

      let notificationTitle, notificationMessage;
      switch (action) {
        case 'accept':
          notificationTitle = 'Offer Accepted!';
          notificationMessage = 'Your price offer has been accepted. A transaction has been created.';
          break;
        case 'reject':
          notificationTitle = 'Offer Rejected';
          notificationMessage = 'Your price offer has been rejected.';
          break;
        case 'counter':
          notificationTitle = 'Counter Offer Received';
          notificationMessage = `New counter offer: $${counter_offer} per ${negotiation.product.unit}`;
          break;
      }

      await DatabaseService.createNotification({
        user_id: otherPartyId,
        title: notificationTitle,
        message: notificationMessage,
        type: action === 'accept' ? 'success' : 'info',
        category: 'negotiation',
        action_url: `/negotiations/${id}`,
        metadata: { 
          negotiation_id: id, 
          action,
          ...(counter_offer && { counter_offer }),
          ...(newMessage.transaction_id && { transaction_id: newMessage.transaction_id })
        }
      });

      res.json({
        message: `Negotiation ${action}ed successfully`,
        negotiation: updatedNegotiation,
        ...(newMessage.transaction_id && { transaction_id: newMessage.transaction_id })
      });
    } catch (error) {
      console.error('Respond to negotiation error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to respond to negotiation' 
      });
    }
  }
);

// Cancel negotiation
router.post('/:id/cancel', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Get negotiation
      const { data: negotiation, error } = await DatabaseService.client
        .from('negotiations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!negotiation) {
        return res.status(404).json({ error: 'Negotiation not found' });
      }

      // Check authorization
      if (negotiation.buyer_id !== req.profile.id && negotiation.seller_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to cancel this negotiation' });
      }

      // Check if negotiation can be cancelled
      if (negotiation.status !== 'active') {
        return res.status(400).json({ error: 'Negotiation is not active' });
      }

      // Update negotiation
      const messages = JSON.parse(negotiation.messages || '[]');
      messages.push({
        from: req.profile.id,
        message: reason || 'Negotiation cancelled',
        timestamp: new Date().toISOString(),
        action: 'cancel'
      });

      const updatedNegotiation = await DatabaseService.updateNegotiation(id, {
        status: 'cancelled',
        messages: JSON.stringify(messages)
      });

      // Create notification for the other party
      const otherPartyId = negotiation.buyer_id === req.profile.id ? 
        negotiation.seller_id : negotiation.buyer_id;

      await DatabaseService.createNotification({
        user_id: otherPartyId,
        title: 'Negotiation Cancelled',
        message: `Negotiation has been cancelled${reason ? `: ${reason}` : ''}`,
        type: 'warning',
        category: 'negotiation',
        action_url: `/negotiations/${id}`,
        metadata: { negotiation_id: id, reason }
      });

      res.json({
        message: 'Negotiation cancelled successfully',
        negotiation: updatedNegotiation
      });
    } catch (error) {
      console.error('Cancel negotiation error:', error);
      res.status(500).json({ 
        error: 'Failed to cancel negotiation' 
      });
    }
  }
);

// Get negotiation statistics
router.get('/stats/summary', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { data: negotiations, error } = await DatabaseService.client
        .from('negotiations')
        .select('status, current_offer, initial_price, created_at')
        .or(`buyer_id.eq.${req.profile.id},seller_id.eq.${req.profile.id}`);

      if (error) throw error;

      const stats = {
        total_negotiations: negotiations.length,
        active_negotiations: negotiations.filter(n => n.status === 'active').length,
        accepted_negotiations: negotiations.filter(n => n.status === 'accepted').length,
        rejected_negotiations: negotiations.filter(n => n.status === 'rejected').length,
        cancelled_negotiations: negotiations.filter(n => n.status === 'cancelled').length,
        success_rate: negotiations.length > 0 ? 
          (negotiations.filter(n => n.status === 'accepted').length / negotiations.length * 100).toFixed(1) : 0,
        average_discount: 0
      };

      // Calculate average discount achieved
      const acceptedNegotiations = negotiations.filter(n => n.status === 'accepted');
      if (acceptedNegotiations.length > 0) {
        const totalDiscount = acceptedNegotiations.reduce((sum, n) => {
          const discount = ((n.initial_price - n.current_offer) / n.initial_price) * 100;
          return sum + discount;
        }, 0);
        stats.average_discount = (totalDiscount / acceptedNegotiations.length).toFixed(1);
      }

      res.json({ stats });
    } catch (error) {
      console.error('Get negotiation stats error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch negotiation statistics' 
      });
    }
  }
);

export default router;