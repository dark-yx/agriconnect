import express from 'express';
import AuthService from '../../config/auth.js';
import DatabaseService from '../../config/database.js';

const router = express.Router();

// Get all notifications for authenticated user
router.get('/', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const notifications = await DatabaseService.getNotifications(req.profile.id);

      res.json({ notifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch notifications' 
      });
    }
  }
);

// Mark notification as read
router.patch('/:id/read', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify notification belongs to user
      const { data: notification, error: fetchError } = await DatabaseService.client
        .from('notifications')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (notification.user_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to update this notification' });
      }

      const updatedNotification = await DatabaseService.markNotificationRead(id);

      res.json({
        message: 'Notification marked as read',
        notification: updatedNotification
      });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ 
        error: 'Failed to mark notification as read' 
      });
    }
  }
);

// Mark all notifications as read
router.patch('/read-all', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { data, error } = await DatabaseService.client
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', req.profile.id)
        .eq('is_read', false)
        .select();

      if (error) throw error;

      res.json({
        message: 'All notifications marked as read',
        updated_count: data.length
      });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ 
        error: 'Failed to mark all notifications as read' 
      });
    }
  }
);

// Delete notification
router.delete('/:id', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify notification belongs to user
      const { data: notification, error: fetchError } = await DatabaseService.client
        .from('notifications')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (notification.user_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to delete this notification' });
      }

      const { error: deleteError } = await DatabaseService.client
        .from('notifications')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ 
        error: 'Failed to delete notification' 
      });
    }
  }
);

// Get unread notification count
router.get('/unread/count', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { data, error } = await DatabaseService.client
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', req.profile.id)
        .eq('is_read', false);

      if (error) throw error;

      res.json({ 
        unread_count: data.length 
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ 
        error: 'Failed to get unread notification count' 
      });
    }
  }
);

// Get notifications by category
router.get('/category/:category', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { category } = req.params;
      const validCategories = ['transaction', 'negotiation', 'quality', 'logistics', 'system'];

      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const { data: notifications, error } = await DatabaseService.client
        .from('notifications')
        .select('*')
        .eq('user_id', req.profile.id)
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      res.json({ notifications });
    } catch (error) {
      console.error('Get notifications by category error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch notifications by category' 
      });
    }
  }
);

// Create notification (internal use, for testing)
router.post('/', 
  AuthService.authenticateRequest.bind(AuthService),
  async (req, res) => {
    try {
      const { title, message, type, category, action_url, metadata } = req.body;

      if (!title || !message || !type || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const notificationData = {
        user_id: req.profile.id,
        title,
        message,
        type,
        category,
        action_url,
        metadata
      };

      const notification = await DatabaseService.createNotification(notificationData);

      res.status(201).json({
        message: 'Notification created successfully',
        notification
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ 
        error: 'Failed to create notification' 
      });
    }
  }
);

export default router;