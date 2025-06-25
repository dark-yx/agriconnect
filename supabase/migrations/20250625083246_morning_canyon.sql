/*
  # Initial AgriConnect Database Schema

  1. New Tables
    - `profiles` - User profile information with roles
    - `products` - Product listings from producers
    - `transactions` - Purchase transactions between users
    - `negotiations` - Price negotiation records
    - `quality_certifications` - Quality certificates for products
    - `logistics_shipments` - Shipping and delivery tracking
    - `market_data` - Historical market pricing data
    - `ratings_reviews` - User ratings and reviews
    - `notifications` - System notifications for users

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure user data and transaction information

  3. Indexes
    - Add performance indexes for common queries
    - Optimize search and filtering operations
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles with role-based access
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('producer', 'exporter', 'consumer', 'admin')),
  company_name text,
  phone text,
  address jsonb,
  profile_image_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  reputation_score decimal(3,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product listings
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  quantity decimal(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL,
  price_per_unit decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  harvest_date date,
  expiry_date date,
  location jsonb,
  images text[],
  quality_grade text,
  organic_certified boolean DEFAULT false,
  available_quantity decimal(10,2) NOT NULL DEFAULT 0,
  minimum_order decimal(10,2) DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transactions between users
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity decimal(10,2) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed')),
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  blockchain_tx_hash text,
  delivery_address jsonb,
  delivery_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Price negotiations
CREATE TABLE IF NOT EXISTS negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  initial_price decimal(10,2) NOT NULL,
  current_offer decimal(10,2) NOT NULL,
  quantity decimal(10,2) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected', 'expired')),
  last_offer_by uuid REFERENCES profiles(id),
  expires_at timestamptz,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quality certifications
CREATE TABLE IF NOT EXISTS quality_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  certification_type text NOT NULL,
  certification_body text NOT NULL,
  certificate_number text,
  issue_date date NOT NULL,
  expiry_date date,
  document_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expired', 'revoked')),
  blockchain_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Logistics and shipments
CREATE TABLE IF NOT EXISTS logistics_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  carrier_name text,
  tracking_number text,
  pickup_address jsonb,
  delivery_address jsonb,
  estimated_pickup_date date,
  estimated_delivery_date date,
  actual_pickup_date date,
  actual_delivery_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned')),
  shipping_cost decimal(10,2),
  route_optimization jsonb,
  tracking_events jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Market data for analytics
CREATE TABLE IF NOT EXISTS market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_category text NOT NULL,
  product_subcategory text,
  region text,
  price decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  unit text NOT NULL,
  volume decimal(12,2),
  data_source text,
  recorded_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Ratings and reviews
CREATE TABLE IF NOT EXISTS ratings_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  review_type text NOT NULL CHECK (review_type IN ('product_quality', 'delivery', 'communication', 'overall')),
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- System notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  category text NOT NULL CHECK (category IN ('transaction', 'negotiation', 'quality', 'logistics', 'system')),
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Products policies
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Producers can manage own products"
  ON products
  FOR ALL
  TO authenticated
  USING (producer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create transactions as buyer"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (
    buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Negotiations policies
CREATE POLICY "Users can view own negotiations"
  ON negotiations
  FOR SELECT
  TO authenticated
  USING (
    buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create negotiations"
  ON negotiations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own negotiations"
  ON negotiations
  FOR UPDATE
  TO authenticated
  USING (
    buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Quality certifications policies
CREATE POLICY "Anyone can view certifications"
  ON quality_certifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Product owners can manage certifications"
  ON quality_certifications
  FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE producer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Logistics policies
CREATE POLICY "Transaction parties can view shipments"
  ON logistics_shipments
  FOR SELECT
  TO authenticated
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE
      buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
      seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Market data policies (public read access)
CREATE POLICY "Anyone can view market data"
  ON market_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Ratings and reviews policies
CREATE POLICY "Anyone can view reviews"
  ON ratings_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for own transactions"
  ON ratings_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    transaction_id IN (
      SELECT id FROM transactions WHERE
      buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
      seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_producer_id ON products(producer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_negotiations_product_id ON negotiations(product_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);
CREATE INDEX IF NOT EXISTS idx_quality_certifications_product_id ON quality_certifications(product_id);
CREATE INDEX IF NOT EXISTS idx_logistics_transaction_id ON logistics_shipments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_market_data_category_date ON market_data(product_category, recorded_date);
CREATE INDEX IF NOT EXISTS idx_ratings_transaction_id ON ratings_reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_certifications_updated_at BEFORE UPDATE ON quality_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_logistics_shipments_updated_at BEFORE UPDATE ON logistics_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();