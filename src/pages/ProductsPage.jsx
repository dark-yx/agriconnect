import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProductsPage = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: '',
    organicOnly: false,
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock product data
      const mockProducts = [
        {
          id: '1',
          name: 'Organic Tomatoes',
          description: 'Fresh, vine-ripened organic tomatoes grown without pesticides',
          category: 'Vegetables',
          price_per_unit: 3.50,
          unit: 'kg',
          available_quantity: 500,
          organic_certified: true,
          images: ['https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg'],
          producer: {
            full_name: 'John Smith',
            company_name: 'Green Valley Farm',
            reputation_score: 4.8
          },
          location: { city: 'Sacramento', state: 'CA', country: 'USA' }
        },
        {
          id: '2',
          name: 'Premium Wheat',
          description: 'High-quality wheat suitable for bread making',
          category: 'Grains',
          price_per_unit: 0.85,
          unit: 'kg',
          available_quantity: 2000,
          organic_certified: false,
          images: ['https://images.pexels.com/photos/326082/pexels-photo-326082.jpeg'],
          producer: {
            full_name: 'Maria Garcia',
            company_name: 'Golden Fields Co.',
            reputation_score: 4.6
          },
          location: { city: 'Kansas City', state: 'KS', country: 'USA' }
        },
        {
          id: '3',
          name: 'Fresh Apples',
          description: 'Crisp and sweet apples, perfect for eating or cooking',
          category: 'Fruits',
          price_per_unit: 2.25,
          unit: 'kg',
          available_quantity: 800,
          organic_certified: true,
          images: ['https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg'],
          producer: {
            full_name: 'David Johnson',
            company_name: 'Orchard Hills',
            reputation_score: 4.9
          },
          location: { city: 'Portland', state: 'OR', country: 'USA' }
        },
        {
          id: '4',
          name: 'Organic Carrots',
          description: 'Sweet and crunchy organic carrots, freshly harvested',
          category: 'Vegetables',
          price_per_unit: 1.80,
          unit: 'kg',
          available_quantity: 300,
          organic_certified: true,
          images: ['https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg'],
          producer: {
            full_name: 'Sarah Wilson',
            company_name: 'Sunshine Organics',
            reputation_score: 4.7
          },
          location: { city: 'Denver', state: 'CO', country: 'USA' }
        }
      ];

      // Apply filters
      let filteredProducts = mockProducts;

      if (filters.search) {
        filteredProducts = filteredProducts.filter(product =>
          product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          product.description.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.category) {
        filteredProducts = filteredProducts.filter(product =>
          product.category === filters.category
        );
      }

      if (filters.organicOnly) {
        filteredProducts = filteredProducts.filter(product =>
          product.organic_certified
        );
      }

      if (filters.minPrice) {
        filteredProducts = filteredProducts.filter(product =>
          product.price_per_unit >= parseFloat(filters.minPrice)
        );
      }

      if (filters.maxPrice) {
        filteredProducts = filteredProducts.filter(product =>
          product.price_per_unit <= parseFloat(filters.maxPrice)
        );
      }

      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const categories = ['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Meat', 'Herbs & Spices'];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Agricultural Products
          </h1>
          <p className="text-neutral-600">
            Discover fresh, quality agricultural products from verified producers worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
              </div>
              <div className="card-body space-y-6">
                {/* Search */}
                <div>
                  <label htmlFor="search" className="label">
                    Search Products
                  </label>
                  <input
                    type="text"
                    id="search"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="input"
                    placeholder="Search by name or description..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="label">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="input"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="label">Price Range (per unit)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="minPrice"
                      value={filters.minPrice}
                      onChange={handleFilterChange}
                      className="input"
                      placeholder="Min $"
                      min="0"
                      step="0.01"
                    />
                    <input
                      type="number"
                      name="maxPrice"
                      value={filters.maxPrice}
                      onChange={handleFilterChange}
                      className="input"
                      placeholder="Max $"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Organic Only */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="organicOnly"
                      checked={filters.organicOnly}
                      onChange={handleFilterChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Organic Only
                    </span>
                  </label>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => setFilters({
                    search: '',
                    category: '',
                    location: '',
                    organicOnly: false,
                    minPrice: '',
                    maxPrice: ''
                  })}
                  className="btn-secondary w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-neutral-600">
                    {products.length} product{products.length !== 1 ? 's' : ''} found
                  </p>
                  <select className="input w-auto">
                    <option>Sort by: Relevance</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Newest First</option>
                    <option>Rating: High to Low</option>
                  </select>
                </div>

                {/* Products Grid */}
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="card hover:shadow-medium transition-all duration-300">
                        <div className="relative">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-48 object-cover rounded-t-xl"
                          />
                          {product.organic_certified && (
                            <div className="absolute top-3 left-3">
                              <span className="badge badge-success">🌱 Organic</span>
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <span className="badge badge-primary">
                              {product.available_quantity} {product.unit}
                            </span>
                          </div>
                        </div>
                        
                        <div className="card-body">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-neutral-900">
                              {product.name}
                            </h3>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary-600">
                                ${product.price_per_unit}
                              </div>
                              <div className="text-sm text-neutral-500">
                                per {product.unit}
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
                            {product.description}
                          </p>
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="badge badge-secondary">{product.category}</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-yellow-500">⭐</span>
                              <span className="text-sm text-neutral-600">
                                {product.producer.reputation_score}
                              </span>
                            </div>
                          </div>
                          
                          <div className="border-t border-neutral-200 pt-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-neutral-900">
                                  {product.producer.company_name || product.producer.full_name}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  {product.location.city}, {product.location.state}
                                </p>
                              </div>
                              <Link
                                to={`/products/${product.id}`}
                                className="btn-primary btn-sm"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                      No products found
                    </h3>
                    <p className="text-neutral-600 mb-4">
                      Try adjusting your filters or search terms
                    </p>
                    <button
                      onClick={() => setFilters({
                        search: '',
                        category: '',
                        location: '',
                        organicOnly: false,
                        minPrice: '',
                        maxPrice: ''
                      })}
                      className="btn-primary"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;