import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for frontend/authenticated operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Admin client for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database connection helper
export class DatabaseService {
  constructor(client = supabase) {
    this.client = client;
  }

  // User profile operations
  async createProfile(profileData) {
    const { data, error } = await this.client
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getProfile(userId) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateProfile(userId, updates) {
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Product operations
  async createProduct(productData) {
    const { data, error } = await this.client
      .from('products')
      .insert(productData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getProducts(filters = {}) {
    let query = this.client
      .from('products')
      .select(`
        *,
        producer:profiles!products_producer_id_fkey(
          id, full_name, company_name, reputation_score
        )
      `)
      .eq('status', 'active');

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.location) {
      query = query.contains('location', filters.location);
    }
    if (filters.minPrice) {
      query = query.gte('price_per_unit', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('price_per_unit', filters.maxPrice);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getProduct(productId) {
    const { data, error } = await this.client
      .from('products')
      .select(`
        *,
        producer:profiles!products_producer_id_fkey(
          id, full_name, company_name, reputation_score, phone, email
        ),
        quality_certifications(*)
      `)
      .eq('id', productId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateProduct(productId, updates) {
    const { data, error } = await this.client
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Transaction operations
  async createTransaction(transactionData) {
    const { data, error } = await this.client
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getTransactions(userId) {
    const { data, error } = await this.client
      .from('transactions')
      .select(`
        *,
        buyer:profiles!transactions_buyer_id_fkey(id, full_name, company_name),
        seller:profiles!transactions_seller_id_fkey(id, full_name, company_name),
        product:products(id, name, category, unit)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async updateTransaction(transactionId, updates) {
    const { data, error } = await this.client
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Negotiation operations
  async createNegotiation(negotiationData) {
    const { data, error } = await this.client
      .from('negotiations')
      .insert(negotiationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getNegotiations(userId) {
    const { data, error } = await this.client
      .from('negotiations')
      .select(`
        *,
        buyer:profiles!negotiations_buyer_id_fkey(id, full_name, company_name),
        seller:profiles!negotiations_seller_id_fkey(id, full_name, company_name),
        product:products(id, name, category, price_per_unit)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async updateNegotiation(negotiationId, updates) {
    const { data, error } = await this.client
      .from('negotiations')
      .update(updates)
      .eq('id', negotiationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Notification operations
  async createNotification(notificationData) {
    const { data, error } = await this.client
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getNotifications(userId) {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data;
  }

  async markNotificationRead(notificationId) {
    const { data, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Market data operations
  async getMarketData(category, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.client
      .from('market_data')
      .select('*')
      .eq('product_category', category)
      .gte('recorded_date', startDate.toISOString().split('T')[0])
      .order('recorded_date', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  async insertMarketData(marketData) {
    const { data, error } = await this.client
      .from('market_data')
      .insert(marketData)
      .select();
    
    if (error) throw error;
    return data;
  }

  // Rating and review operations
  async createReview(reviewData) {
    const { data, error } = await this.client
      .from('ratings_reviews')
      .insert(reviewData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getReviews(userId) {
    const { data, error } = await this.client
      .from('ratings_reviews')
      .select(`
        *,
        reviewer:profiles!ratings_reviews_reviewer_id_fkey(id, full_name),
        transaction:transactions(id, product:products(name))
      `)
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  subscribeToNotifications(userId, callback) {
    return this.client
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  subscribeToTransactionUpdates(transactionId, callback) {
    return this.client
      .channel('transaction_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions',
        filter: `id=eq.${transactionId}`
      }, callback)
      .subscribe();
  }
}

export default new DatabaseService();