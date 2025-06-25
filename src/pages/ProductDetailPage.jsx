import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ChatInterface from '../components/chat/ChatInterface';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [orderForm, setOrderForm] = useState({
    quantity: 1,
    notes: '',
    deliveryAddress: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    }
  });

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock product data
      const mockProduct = {
        id: id,
        name: 'Organic Tomatoes',
        description: 'Fresh, vine-ripened organic tomatoes grown without pesticides. These premium tomatoes are perfect for cooking, salads, or eating fresh. Grown using sustainable farming practices with natural fertilizers and pest control methods.',
        category: 'Vegetables',
        subcategory: 'Nightshades',
        price_per_unit: 3.50,
        unit: 'kg',
        quantity: 500,
        available_quantity: 450,
        minimum_order: 5,
        organic_certified: true,
        quality_grade: 'Grade A',
        harvest_date: '2024-01-15',
        expiry_date: '2024-02-15',
        images: [
          'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg',
          'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg',
          'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg'
        ],
        producer: {
          id: 'producer-1',
          full_name: 'John Smith',
          company_name: 'Green Valley Farm',
          reputation_score: 4.8,
          email: 'john@greenvalley.com',
          phone: '+1-555-0123',
          verification_status: 'verified'
        },
        location: {
          street: '123 Farm Road',
          city: 'Sacramento',
          state: 'CA',
          country: 'USA',
          postalCode: '95814'
        },
        quality_certifications: [
          {
            certification_type: 'USDA Organic',
            certification_body: 'USDA',
            certificate_number: 'ORG-2024-001',
            issue_date: '2024-01-01',
            expiry_date: '2025-01-01',
            verification_status: 'verified'
          },
          {
            certification_type: 'Non-GMO Project',
            certification_body: 'Non-GMO Project',
            certificate_number: 'NGP-2024-002',
            issue_date: '2024-01-01',
            expiry_date: '2025-01-01',
            verification_status: 'verified'
          }
        ]
      };

      setProduct(mockProduct);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('deliveryAddress.')) {
      const addressField = name.split('.')[1];
      setOrderForm(prev => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [addressField]: value
        }
      }));
    } else {
      setOrderForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Validate form
    if (orderForm.quantity < product.minimum_order) {
      alert(`Minimum order quantity is ${product.minimum_order} ${product.unit}`);
      return;
    }

    if (orderForm.quantity > product.available_quantity) {
      alert(`Only ${product.available_quantity} ${product.unit} available`);
      return;
    }

    try {
      // In a real app, this would make an API call
      console.log('Placing order:', {
        productId: product.id,
        quantity: orderForm.quantity,
        totalAmount: orderForm.quantity * product.price_per_unit,
        deliveryAddress: orderForm.deliveryAddress,
        notes: orderForm.notes
      });

      alert('Order placed successfully! You will receive a confirmation email shortly.');
      navigate('/transactions');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  const handleNegotiatePrice = () => {
    setShowChat(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Product not found</h2>
          <p className="text-neutral-600 mb-4">The product you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const totalPrice = orderForm.quantity * product.price_per_unit;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button onClick={() => navigate('/products')} className="text-primary-600 hover:text-primary-700">
                Products
              </button>
            </li>
            <li className="text-neutral-400">/</li>
            <li>
              <button onClick={() => navigate(`/products?category=${product.category}`)} className="text-primary-600 hover:text-primary-700">
                {product.category}
              </button>
            </li>
            <li className="text-neutral-400">/</li>
            <li className="text-neutral-600">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-square bg-neutral-200 rounded-xl overflow-hidden mb-4">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {product.images.slice(1).map((image, index) => (
                <div key={index} className="aspect-square bg-neutral-200 rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`${product.name} ${index + 2}`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 mb-2">{product.name}</h1>
                  <div className="flex items-center space-x-3">
                    <span className="badge badge-secondary">{product.category}</span>
                    {product.organic_certified && (
                      <span className="badge badge-success">🌱 Organic</span>
                    )}
                    <span className="badge badge-primary">Grade {product.quality_grade}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">
                    ${product.price_per_unit}
                  </div>
                  <div className="text-neutral-500">per {product.unit}</div>
                </div>
              </div>

              <p className="text-neutral-700 leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm font-medium text-neutral-600">Available Quantity:</span>
                  <p className="text-lg font-semibold text-neutral-900">
                    {product.available_quantity} {product.unit}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-600">Minimum Order:</span>
                  <p className="text-lg font-semibold text-neutral-900">
                    {product.minimum_order} {product.unit}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-600">Harvest Date:</span>
                  <p className="text-lg font-semibold text-neutral-900">
                    {new Date(product.harvest_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-600">Best Before:</span>
                  <p className="text-lg font-semibold text-neutral-900">
                    {new Date(product.expiry_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Producer Info */}
              <div className="border border-neutral-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-neutral-900 mb-2">Producer Information</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {product.producer.company_name || product.producer.full_name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {product.location.city}, {product.location.state}, {product.location.country}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm font-medium">{product.producer.reputation_score}</span>
                      <span className="text-sm text-neutral-500">(4.8/5)</span>
                      {product.producer.verification_status === 'verified' && (
                        <span className="text-success-600 text-sm">✓ Verified</span>
                      )}
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm">
                    View Profile
                  </button>
                </div>
              </div>

              {/* Order Form */}
              {user && profile?.role !== 'producer' ? (
                <div className="border border-neutral-200 rounded-lg p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">Place Order</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="quantity" className="label">
                        Quantity ({product.unit})
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        name="quantity"
                        min={product.minimum_order}
                        max={product.available_quantity}
                        value={orderForm.quantity}
                        onChange={handleOrderFormChange}
                        className="input"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Min: {product.minimum_order} {product.unit}, Max: {product.available_quantity} {product.unit}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="notes" className="label">
                        Special Instructions (Optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={orderForm.notes}
                        onChange={handleOrderFormChange}
                        className="input"
                        rows="3"
                        placeholder="Any special requirements or notes..."
                      />
                    </div>

                    <div className="border-t border-neutral-200 pt-4">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>Total:</span>
                        <span className="text-primary-600">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handlePlaceOrder}
                        className="btn-primary flex-1"
                      >
                        Place Order
                      </button>
                      <button
                        onClick={handleNegotiatePrice}
                        className="btn-secondary"
                      >
                        Negotiate Price
                      </button>
                    </div>
                  </div>
                </div>
              ) : !user ? (
                <div className="border border-neutral-200 rounded-lg p-6 text-center">
                  <p className="text-neutral-600 mb-4">Sign in to place orders</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="btn-primary"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg p-6 text-center">
                  <p className="text-neutral-600">Producers cannot order their own products</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quality Certifications */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-xl font-semibold text-neutral-900">Quality Certifications</h3>
            </div>
            <div className="card-body">
              {product.quality_certifications.length > 0 ? (
                <div className="space-y-4">
                  {product.quality_certifications.map((cert, index) => (
                    <div key={index} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-neutral-900">{cert.certification_type}</h4>
                        <span className="badge badge-success">✓ Verified</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-1">
                        Issued by: {cert.certification_body}
                      </p>
                      <p className="text-sm text-neutral-600 mb-1">
                        Certificate #: {cert.certificate_number}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Valid until: {new Date(cert.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No certifications available</p>
              )}
            </div>
          </div>

          {/* Shipping & Delivery */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-xl font-semibold text-neutral-900">Shipping & Delivery</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-success-600">✓</span>
                  <span className="text-sm">Free shipping on orders over $100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-success-600">✓</span>
                  <span className="text-sm">Temperature-controlled transport available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-success-600">✓</span>
                  <span className="text-sm">Delivery within 2-5 business days</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-success-600">✓</span>
                  <span className="text-sm">Real-time tracking available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl h-[600px]">
            <ChatInterface
              agentType="supervisor"
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;