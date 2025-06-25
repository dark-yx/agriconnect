import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import DatabaseService from '../config/database.js';

export class ConsumerAgent extends BaseAgent {
  constructor() {
    super('Consumer', 'Help consumers find products, place orders, and track purchases');
  }

  createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        messages: [],
        context: {},
        action: null,
        searchResults: null,
        result: null
      }
    });

    workflow.addNode("analyze_request", this.analyzeRequestNode.bind(this));
    workflow.addNode("search_products", this.searchProductsNode.bind(this));
    workflow.addNode("place_order", this.placeOrderNode.bind(this));
    workflow.addNode("track_orders", this.trackOrdersNode.bind(this));
    workflow.addNode("product_recommendations", this.productRecommendationsNode.bind(this));

    workflow.addEdge("__start__", "analyze_request");
    
    workflow.addConditionalEdges(
      "analyze_request",
      this.routeAction.bind(this),
      {
        "search_products": "search_products",
        "place_order": "place_order",
        "track_orders": "track_orders",
        "product_recommendations": "product_recommendations"
      }
    );

    workflow.addEdge("search_products", END);
    workflow.addEdge("place_order", END);
    workflow.addEdge("track_orders", END);
    workflow.addEdge("product_recommendations", END);

    return workflow.compile();
  }

  async analyzeRequestNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('classification');
    
    const analysisPrompt = `
Analyze this consumer's request and determine the action needed:

Available actions:
- search_products: Find and filter products
- place_order: Create a purchase order
- track_orders: Check order status and delivery
- product_recommendations: Get personalized product suggestions

User message: "${lastMessage.content}"

Respond with only the action name.
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: analysisPrompt }]);
      const action = response.content.trim().toLowerCase();
      
      return {
        ...state,
        action: action
      };
    } catch (error) {
      console.error('Request analysis error:', error);
      return {
        ...state,
        action: 'search_products' // Default action
      };
    }
  }

  routeAction(state) {
    return state.action || 'search_products';
  }

  async searchProductsNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('generation');
    
    const extractionPrompt = `
Extract search criteria from this message:

Message: "${lastMessage.content}"

Extract and format as JSON:
{
  "category": "category name or null",
  "search": "search keywords or null",
  "location": "location preference or null",
  "organic_only": boolean,
  "max_price": number or null,
  "min_quantity": number or null
}
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const searchCriteria = JSON.parse(response.content);
      
      // Search products in database
      const products = await DatabaseService.getProducts(searchCriteria);
      
      if (products.length === 0) {
        return {
          ...state,
          result: {
            content: "I couldn't find any products matching your criteria. Try broadening your search or check back later for new listings.",
            success: false
          }
        };
      }

      // Format results
      const productList = products.slice(0, 10).map(product => 
        `🌾 **${product.name}** (${product.category})\n` +
        `   📍 ${product.producer.company_name || product.producer.full_name}\n` +
        `   💰 $${product.price_per_unit}/${product.unit}\n` +
        `   📦 ${product.available_quantity} ${product.unit} available\n` +
        `   ${product.organic_certified ? '🌱 Organic Certified' : ''}\n` +
        `   ID: ${product.id}`
      ).join('\n\n');

      return {
        ...state,
        searchResults: products,
        result: {
          content: `Found ${products.length} products matching your search:\n\n${productList}\n\nTo place an order, just let me know which product you'd like and the quantity!`,
          success: true,
          products: products.slice(0, 10)
        }
      };
    } catch (error) {
      console.error('Product search error:', error);
      return {
        ...state,
        result: {
          content: "I had trouble processing your search. Could you please rephrase your request?",
          success: false
        }
      };
    }
  }

  async placeOrderNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('generation');
    
    const extractionPrompt = `
Extract order information from this message:

Message: "${lastMessage.content}"

Extract and format as JSON:
{
  "product_id": "product ID if mentioned",
  "product_name": "product name if mentioned",
  "quantity": number,
  "delivery_address": {
    "street": "street address",
    "city": "city",
    "state": "state",
    "country": "country",
    "postal_code": "postal code"
  },
  "notes": "any special instructions"
}

If information is missing, use null.
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const orderData = JSON.parse(response.content);
      
      // Find product
      let product = null;
      if (orderData.product_id) {
        product = await DatabaseService.getProduct(orderData.product_id);
      } else if (orderData.product_name) {
        const products = await DatabaseService.getProducts({ 
          search: orderData.product_name 
        });
        product = products[0];
      }

      if (!product) {
        return {
          ...state,
          result: {
            content: "I couldn't find the product you want to order. Please provide the product ID or search for products first.",
            success: false
          }
        };
      }

      if (!orderData.quantity || orderData.quantity <= 0) {
        return {
          ...state,
          result: {
            content: "Please specify how much you'd like to order.",
            success: false
          }
        };
      }

      if (product.available_quantity < orderData.quantity) {
        return {
          ...state,
          result: {
            content: `Sorry, only ${product.available_quantity} ${product.unit} of ${product.name} is available. Please adjust your quantity.`,
            success: false
          }
        };
      }

      if (!orderData.delivery_address || !orderData.delivery_address.city) {
        return {
          ...state,
          result: {
            content: "I need your delivery address to place the order. Please provide your complete address.",
            success: false
          }
        };
      }

      // Create transaction
      const transactionData = {
        buyer_id: context.user.id,
        seller_id: product.producer_id,
        product_id: product.id,
        quantity: orderData.quantity,
        unit_price: product.price_per_unit,
        total_amount: orderData.quantity * product.price_per_unit,
        currency: product.currency || 'USD',
        delivery_address: orderData.delivery_address,
        notes: orderData.notes,
        status: 'pending',
        payment_status: 'pending'
      };

      const transaction = await DatabaseService.createTransaction(transactionData);

      // Update product availability
      await DatabaseService.updateProduct(product.id, {
        available_quantity: product.available_quantity - orderData.quantity
      });

      return {
        ...state,
        result: {
          content: `🎉 Order placed successfully!\n\n` +
                  `**Order Details:**\n` +
                  `• Product: ${product.name}\n` +
                  `• Quantity: ${orderData.quantity} ${product.unit}\n` +
                  `• Total: $${transactionData.total_amount}\n` +
                  `• Order ID: ${transaction.id}\n\n` +
                  `Your order is pending confirmation from the seller. You'll receive updates on the status.`,
          success: true,
          transaction: transaction
        }
      };
    } catch (error) {
      console.error('Order placement error:', error);
      return {
        ...state,
        result: {
          content: "I encountered an error placing your order. Please try again or contact support.",
          success: false
        }
      };
    }
  }

  async trackOrdersNode(state) {
    const { context } = state;
    
    try {
      const transactions = await DatabaseService.getTransactions(context.user.id);
      const userOrders = transactions.filter(t => t.buyer_id === context.user.id);
      
      if (userOrders.length === 0) {
        return {
          ...state,
          result: {
            content: "You haven't placed any orders yet. Browse our products to find something you'd like!",
            success: true
          }
        };
      }

      const ordersList = userOrders.map(order => {
        const statusEmoji = {
          'pending': '⏳',
          'confirmed': '✅',
          'paid': '💳',
          'shipped': '🚚',
          'delivered': '📦',
          'completed': '🎉',
          'cancelled': '❌'
        };

        return `${statusEmoji[order.status] || '📋'} **Order #${order.id.slice(0, 8)}**\n` +
               `   Product: ${order.product.name}\n` +
               `   Quantity: ${order.quantity} ${order.product.unit}\n` +
               `   Total: $${order.total_amount}\n` +
               `   Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}\n` +
               `   Date: ${new Date(order.created_at).toLocaleDateString()}`;
      }).join('\n\n');

      return {
        ...state,
        result: {
          content: `📋 Your Orders:\n\n${ordersList}`,
          success: true,
          orders: userOrders
        }
      };
    } catch (error) {
      console.error('Order tracking error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't retrieve your orders. Please try again.",
          success: false
        }
      };
    }
  }

  async productRecommendationsNode(state) {
    const { context } = state;
    
    try {
      // Get user's order history for recommendations
      const transactions = await DatabaseService.getTransactions(context.user.id);
      const userOrders = transactions.filter(t => t.buyer_id === context.user.id);
      
      // Get categories from previous orders
      const purchasedCategories = [...new Set(
        userOrders.map(order => order.product.category)
      )];

      let products;
      if (purchasedCategories.length > 0) {
        // Recommend products from similar categories
        products = await DatabaseService.getProducts({
          category: purchasedCategories[0] // Use most recent category
        });
      } else {
        // For new users, show popular products
        products = await DatabaseService.getProducts({});
      }

      // Filter out products user has already ordered
      const orderedProductIds = userOrders.map(order => order.product_id);
      const recommendations = products
        .filter(product => !orderedProductIds.includes(product.id))
        .slice(0, 5);

      if (recommendations.length === 0) {
        return {
          ...state,
          result: {
            content: "I don't have any new recommendations for you right now. Check back later for fresh products!",
            success: true
          }
        };
      }

      const recommendationsList = recommendations.map(product => 
        `🌟 **${product.name}** (${product.category})\n` +
        `   📍 ${product.producer.company_name || product.producer.full_name}\n` +
        `   💰 $${product.price_per_unit}/${product.unit}\n` +
        `   📦 ${product.available_quantity} ${product.unit} available\n` +
        `   ${product.organic_certified ? '🌱 Organic Certified' : ''}`
      ).join('\n\n');

      return {
        ...state,
        result: {
          content: `🎯 Recommended for you:\n\n${recommendationsList}\n\nInterested in any of these? Just let me know!`,
          success: true,
          recommendations: recommendations
        }
      };
    } catch (error) {
      console.error('Recommendations error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't generate recommendations right now. Please try browsing our product categories.",
          success: false
        }
      };
    }
  }

  getSystemPrompt() {
    return `You are the Consumer Agent in AgriConnect, specialized in helping consumers find and purchase agricultural products.

Your capabilities:
1. Search and filter products based on various criteria
2. Place orders with delivery information
3. Track order status and delivery updates
4. Provide personalized product recommendations
5. Help with product comparisons and selection
6. Assist with payment and delivery coordination

Always prioritize user satisfaction and help them find the best products for their needs.
Be helpful in explaining product details, pricing, and delivery options.`;
  }
}

export default ConsumerAgent;