import express from 'express';
import AuthService from '../../config/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('role').isIn(['producer', 'exporter', 'consumer']).withMessage('Invalid role'),
  body('companyName').optional().trim(),
  body('phone').optional().isMobilePhone(),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userData = req.body;
    const result = await AuthService.register(userData);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        profile: result.profile
      },
      session: result.session
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message || 'Registration failed' 
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    res.json({
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        profile: result.profile
      },
      session: result.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    await AuthService.logout();
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: error.message || 'Logout failed' 
    });
  }
});

// Get current user
router.get('/me', AuthService.authenticateRequest.bind(AuthService), async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        profile: req.profile
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information' 
    });
  }
});

// Update user profile
router.put('/profile', 
  AuthService.authenticateRequest.bind(AuthService),
  [
    body('fullName').optional().trim().isLength({ min: 2 }),
    body('companyName').optional().trim(),
    body('phone').optional().isMobilePhone(),
    body('address').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const updates = req.body;
      const updatedProfile = await AuthService.updateProfile(req.user.id, updates);

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ 
        error: error.message || 'Profile update failed' 
      });
    }
  }
);

// Password reset request
router.post('/reset-password', 
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { email } = req.body;
      await AuthService.resetPassword(email);

      res.json({ 
        message: 'Password reset email sent' 
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ 
        error: error.message || 'Password reset failed' 
      });
    }
  }
);

// Update password
router.put('/password', 
  AuthService.authenticateRequest.bind(AuthService),
  [body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { newPassword } = req.body;
      await AuthService.updatePassword(newPassword);

      res.json({ 
        message: 'Password updated successfully' 
      });
    } catch (error) {
      console.error('Password update error:', error);
      res.status(500).json({ 
        error: error.message || 'Password update failed' 
      });
    }
  }
);

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    // Handle OAuth callback
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?code=${code}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

export default router;