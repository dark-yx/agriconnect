import express from 'express';
import { body, query, validationResult } from 'express-validator';
import AuthService from '../../config/auth.js';
import DatabaseService from '../../config/database.js';

const router = express.Router();

// Validation middleware
const validateProduct = [
  body('name').trim().isLength({ min: 2 }).withMessage('Product name is required'),
  body('description').optional().trim(),
  body('category').notEmpty().withMessage('Category is required'),
  body('subcategory').optional().trim(),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('unit').notEmpty().withMessage('Unit is required'),
  body('price_per_unit').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('harvest_date').optional().isISO8601().withMessage('Invalid harvest date'),
  body('expiry_date').optional().isISO8601().withMessage('Invalid expiry date'),
  body('location').optional().isObject(),
  body('images').optional().isArray(),
  body('quality_grade').optional().trim(),
  body('organic_certified').optional().isBoolean(),
  body('minimum_order').optional().isFloat({ min: 0 }),
];

const validateProductSearch = [
  query('category').optional().trim(),
  query('subcategory').optional().trim(),
  query('location').optional().trim(),
  query('min_price').optional().isFloat({ min: 0 }),
  query('max_price').optional().isFloat({ min: 0 }),
  query('search').optional().trim(),
  query('organic_only').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

// Get all products with filtering and search
router.get('/', validateProductSearch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const filters = {
      category: req.query.category,
      subcategory: req.query.subcategory,
      location: req.query.location ? JSON.parse(req.query.location) : null,
      minPrice: req.query.min_price ? parseFloat(req.query.min_price) : null,
      maxPrice: req.query.max_price ? parseFloat(req.query.max_price) : null,
      search: req.query.search,
      organicOnly: req.query.organic_only === 'true',
    };

    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined) {
        delete filters[key];
      }
    });

    const products = await DatabaseService.getProducts(filters);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total: products.length,
        pages: Math.ceil(products.length / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products' 
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await DatabaseService.getProduct(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product' 
    });
  }
});

// Create new product (producers only)
router.post('/', 
  AuthService.authenticateRequest.bind(AuthService),
  AuthService.authorizeRole(['producer']),
  validateProduct,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const productData = {
        ...req.body,
        producer_id: req.profile.id,
        available_quantity: req.body.quantity,
        status: 'active'
      };

      const product = await DatabaseService.createProduct(productData);

      res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to create product' 
      });
    }
  }
);

// Update product (producer only, own products)
router.put('/:id', 
  AuthService.authenticateRequest.bind(AuthService),
  AuthService.authorizeRole(['producer']),
  validateProduct,
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
      
      // Check if product belongs to the authenticated producer
      const existingProduct = await DatabaseService.getProduct(id);
      if (!existingProduct || existingProduct.producer_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to update this product' });
      }

      const updates = req.body;
      const updatedProduct = await DatabaseService.updateProduct(id, updates);

      res.json({
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to update product' 
      });
    }
  }
);

// Delete product (soft delete by setting status to inactive)
router.delete('/:id', 
  AuthService.authenticateRequest.bind(AuthService),
  AuthService.authorizeRole(['producer']),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if product belongs to the authenticated producer
      const existingProduct = await DatabaseService.getProduct(id);
      if (!existingProduct || existingProduct.producer_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
      }

      await DatabaseService.updateProduct(id, { status: 'inactive' });

      res.json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ 
        error: 'Failed to delete product' 
      });
    }
  }
);

// Get products by producer
router.get('/producer/:producerId', async (req, res) => {
  try {
    const { producerId } = req.params;
    const products = await DatabaseService.getProducts({ producer_id: producerId });

    res.json({ products });
  } catch (error) {
    console.error('Get producer products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch producer products' 
    });
  }
});

// Get my products (authenticated producer)
router.get('/my/products', 
  AuthService.authenticateRequest.bind(AuthService),
  AuthService.authorizeRole(['producer']),
  async (req, res) => {
    try {
      const products = await DatabaseService.getProducts({ producer_id: req.profile.id });

      res.json({ products });
    } catch (error) {
      console.error('Get my products error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch your products' 
      });
    }
  }
);

// Update product availability
router.patch('/:id/availability', 
  AuthService.authenticateRequest.bind(AuthService),
  AuthService.authorizeRole(['producer']),
  [
    body('available_quantity').isFloat({ min: 0 }).withMessage('Available quantity must be a positive number'),
    body('status').optional().isIn(['active', 'inactive', 'sold_out']).withMessage('Invalid status')
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

      const { id } = req.params;
      const { available_quantity, status } = req.body;
      
      // Check if product belongs to the authenticated producer
      const existingProduct = await DatabaseService.getProduct(id);
      if (!existingProduct || existingProduct.producer_id !== req.profile.id) {
        return res.status(403).json({ error: 'Not authorized to update this product' });
      }

      const updates = { available_quantity };
      if (status) updates.status = status;

      const updatedProduct = await DatabaseService.updateProduct(id, updates);

      res.json({
        message: 'Product availability updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({ 
        error: 'Failed to update product availability' 
      });
    }
  }
);

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    // This would typically come from a database or configuration
    const categories = [
      {
        name: 'Fruits',
        subcategories: ['Citrus', 'Berries', 'Tropical', 'Stone Fruits', 'Apples & Pears']
      },
      {
        name: 'Vegetables',
        subcategories: ['Leafy Greens', 'Root Vegetables', 'Nightshades', 'Cruciferous', 'Legumes']
      },
      {
        name: 'Grains',
        subcategories: ['Wheat', 'Rice', 'Corn', 'Barley', 'Oats', 'Quinoa']
      },
      {
        name: 'Dairy',
        subcategories: ['Milk', 'Cheese', 'Yogurt', 'Butter']
      },
      {
        name: 'Meat',
        subcategories: ['Beef', 'Pork', 'Poultry', 'Lamb', 'Seafood']
      },
      {
        name: 'Herbs & Spices',
        subcategories: ['Fresh Herbs', 'Dried Spices', 'Seeds', 'Aromatics']
      }
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch categories' 
    });
  }
});

export default router;