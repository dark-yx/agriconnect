import { supabase } from './database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  constructor() {
    this.supabase = supabase;
  }

  // User registration
  async register(userData) {
    const { email, password, fullName, role, companyName, phone, address } = userData;

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (authError) throw authError;

      // Create profile in database
      const profileData = {
        user_id: authData.user.id,
        email,
        full_name: fullName,
        role,
        company_name: companyName || null,
        phone: phone || null,
        address: address || null,
        verification_status: 'pending'
      };

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        user: authData.user,
        profile,
        session: authData.session
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // User login
  async login(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError) throw profileError;

      return {
        user: data.user,
        profile,
        session: data.session
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Google OAuth login
  async loginWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Google login failed: ${error.message}`);
    }
  }

  // Logout
  async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;

      if (!user) return null;

      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      return { user, profile };
    } catch (error) {
      return null;
    }
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  // Password reset
  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      throw new Error(`Password update failed: ${error.message}`);
    }
  }

  // Middleware for protecting routes
  async authenticateRequest(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        return res.status(401).json({ error: 'Profile not found' });
      }

      req.user = user;
      req.profile = profile;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }

  // Role-based authorization middleware
  authorizeRole(allowedRoles) {
    return (req, res, next) => {
      if (!req.profile || !allowedRoles.includes(req.profile.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  }

  // Generate JWT token (for additional security if needed)
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password (for additional security)
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Session management
  onAuthStateChange(callback) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  // Get session
  async getSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  // Refresh session
  async refreshSession() {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  }
}

export default new AuthService();