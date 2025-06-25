import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import DatabaseService from '../config/database.js';

export class ProducerAgent extends BaseAgent {
  constructor() {
    super('Producer', 'Help farmers and producers list products, manage inventory, and handle sales');
  }

  createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        messages: [],
        context: {},
        action: null,
        productData: null,
        result: null
      }
    });

    workflow.addNode("analyze_request", this.analyzeRequestNode.bind(this));
    workflow.addNode("list_product", this.listProductNode.bind(this));
    workflow.addNode("update_inventory", this.updateInventoryNode.bind(this));
    workflow.addNode("manage_pricing", this.managePricingNode.bind(this));
    workflow.addNode("view_analytics", this.viewAnalyticsNode.bind(this));
    workflow.addNode("handle_orders", this.handleOrdersNode.bind(this));

    workflow.addEdge("__start__", "analyze_request");
    
    workflow.addConditionalEdges(
      "analyze_request",
      this.routeAction.bind(this),
      {
        "list_product": "list_product",
        "update_inventory": "update_inventory",
        "manage_pricing": "manage_pricing",
        "view_analytics": "view_analytics",
        "handle_orders": "handle_orders"
      }
    );

    workflow.addEdge("list_product", END);
    workflow.addEdge("update_inventory", END);
    workflow.addEdge("manage_pricing", END);
    workflow.addEdge("view_analytics", END);
    workflow.addEdge("handle_orders", END);

    return workflow.compile();
  }

  async analyzeRequestNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('classification');
    
    const analysisPrompt = `
Analyze this producer's request and determine the action needed:

Available actions:
- list_product: Create new product listing
- update_inventory: Update product quantities or availability
- manage_pricing: Adjust product prices
- view_analytics: View sales data and insights
- handle_orders: Manage incoming orders

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
        action: 'list_product' // Default action
      };
    }
  }

  routeAction(state) {
    return state.action || 'list_product';
  }

  async listProductNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('generation');
    
    const extractionPrompt = `
Extract product information from this message to create a product listing:

Message: "${lastMessage.content}"

Extract and format as JSON:
{
  "name": "product name",
  "description": "detailed description",
  "category": "category",
  "quantity": number,
  "unit": "kg/tons/pieces/etc",
  "price_per_unit": number,
  "harvest_date": "YYYY-MM-DD or null",
  "organic_certified": boolean,
  "location": {"city": "", "state": "", "country": ""}
}

If information is missing, use reasonable defaults or null.
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const productData = JSON.parse(response.content);
      
      // Validate required fields
      if (!productData.name || !productData.category || !productData.quantity || !productData.unit || !productData.price_per_unit) {
        return {
          ...state,
          result: {
            content: "I need more information to list your product. Please provide: product name, category, quantity, unit, and price per unit.",
            success: false
          }
        };
      }

      // Create product in database
      try {
        const product = await DatabaseService.createProduct({
          ...productData,
          producer_id: context.user.id,
          available_quantity: productData.quantity,
          status: 'active'
        });

        return {
          ...state,
          productData: productData,
          result: {
            content: `Great! I've successfully listed your product "${productData.name}". Your listing is now active and visible to buyers. Product ID: ${product.id}`,
            success: true,
            product: product
          }
        };
      } catch (dbError) {
        console.error('Database error:', dbError);
        return {
          ...state,
          result: {
            content: "I encountered an error while saving your product listing. Please try again or contact support.",
            success: false,
            error: dbError.message
          }
        };
      }
    } catch (error) {
      console.error('Product extraction error:', error);
      return {
        ...state,
        result: {
          content: "I had trouble understanding your product details. Could you please provide the information in a clearer format?",
          success: false
        }
      };
    }
  }

  async updateInventoryNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      // Get user's products
      const products = await DatabaseService.getProducts({ producer_id: context.user.id });
      
      if (products.length === 0) {
        return {
          ...state,
          result: {
            content: "You don't have any products listed yet. Would you like to create a new product listing?",
            success: false
          }
        };
      }

      const llm = this.selectOptimalLLM('generation');
      
      const updatePrompt = `
The user wants to update inventory. Here are their current products:
${products.map(p => `- ${p.name}: ${p.available_quantity} ${p.unit} available`).join('\n')}

User message: "${lastMessage.content}"

Determine which product to update and the new quantity. Respond with JSON:
{
  "product_name": "exact product name",
  "new_quantity": number,
  "action": "set/add/subtract"
}
`;

      const response = await llm.invoke([{ role: 'user', content: updatePrompt }]);
      const updateData = JSON.parse(response.content);
      
      // Find matching product
      const product = products.find(p => 
        p.name.toLowerCase().includes(updateData.product_name.toLowerCase())
      );
      
      if (!product) {
        return {
          ...state,
          result: {
            content: `I couldn't find a product matching "${updateData.product_name}". Your current products are: ${products.map(p => p.name).join(', ')}`,
            success: false
          }
        };
      }

      // Calculate new quantity
      let newQuantity = updateData.new_quantity;
      if (updateData.action === 'add') {
        newQuantity = product.available_quantity + updateData.new_quantity;
      } else if (updateData.action === 'subtract') {
        newQuantity = Math.max(0, product.available_quantity - updateData.new_quantity);
      }

      // Update in database
      await DatabaseService.updateProduct(product.id, {
        available_quantity: newQuantity,
        status: newQuantity > 0 ? 'active' : 'sold_out'
      });

      return {
        ...state,
        result: {
          content: `Updated "${product.name}" inventory to ${newQuantity} ${product.unit}. ${newQuantity === 0 ? 'Product is now marked as sold out.' : 'Product is available for purchase.'}`,
          success: true
        }
      };
    } catch (error) {
      console.error('Inventory update error:', error);
      return {
        ...state,
        result: {
          content: "I encountered an error updating your inventory. Please try again.",
          success: false
        }
      };
    }
  }

  async managePricingNode(state) {
    const { messages, context } = state;
    
    try {
      const products = await DatabaseService.getProducts({ producer_id: context.user.id });
      
      return {
        ...state,
        result: {
          content: `Here are your current product prices:\n${products.map(p => `• ${p.name}: $${p.price_per_unit}/${p.unit}`).join('\n')}\n\nTo update prices, please specify the product name and new price.`,
          success: true,
          products: products
        }
      };
    } catch (error) {
      return {
        ...state,
        result: {
          content: "I couldn't retrieve your pricing information. Please try again.",
          success: false
        }
      };
    }
  }

  async viewAnalyticsNode(state) {
    const { context } = state;
    
    try {
      const transactions = await DatabaseService.getTransactions(context.user.id);
      const products = await DatabaseService.getProducts({ producer_id: context.user.id });
      
      const totalSales = transactions
        .filter(t => t.seller_id === context.user.id && t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.total_amount), 0);
      
      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.status === 'active').length;
      
      return {
        ...state,
        result: {
          content: `📊 Your Sales Analytics:\n• Total Products: ${totalProducts}\n• Active Listings: ${activeProducts}\n• Completed Sales: ${transactions.filter(t => t.status === 'completed').length}\n• Total Revenue: $${totalSales.toFixed(2)}\n• Pending Orders: ${transactions.filter(t => ['pending', 'confirmed'].includes(t.status)).length}`,
          success: true,
          analytics: {
            totalSales,
            totalProducts,
            activeProducts,
            transactions: transactions.length
          }
        }
      };
    } catch (error) {
      return {
        ...state,
        result: {
          content: "I couldn't retrieve your analytics. Please try again.",
          success: false
        }
      };
    }
  }

  async handleOrdersNode(state) {
    const { context } = state;
    
    try {
      const transactions = await DatabaseService.getTransactions(context.user.id);
      const pendingOrders = transactions.filter(t => 
        t.seller_id === context.user.id && 
        ['pending', 'confirmed'].includes(t.status)
      );
      
      if (pendingOrders.length === 0) {
        return {
          ...state,
          result: {
            content: "You have no pending orders at the moment. All your orders are up to date!",
            success: true
          }
        };
      }

      const ordersList = pendingOrders.map(order => 
        `• Order #${order.id.slice(0, 8)}: ${order.quantity} ${order.product.unit} of ${order.product.name} - $${order.total_amount} (${order.status})`
      ).join('\n');

      return {
        ...state,
        result: {
          content: `📦 Your Pending Orders:\n${ordersList}\n\nTo update an order status, please specify the order ID and new status.`,
          success: true,
          orders: pendingOrders
        }
      };
    } catch (error) {
      return {
        ...state,
        result: {
          content: "I couldn't retrieve your orders. Please try again.",
          success: false
        }
      };
    }
  }

  getSystemPrompt() {
    return `You are the Producer Agent in AgriConnect, specialized in helping farmers and agricultural producers.

Your capabilities:
1. Create product listings with detailed specifications
2. Manage inventory levels and availability
3. Update product pricing
4. View sales analytics and performance metrics
5. Handle incoming orders and order management
6. Provide market insights for better decision-making

Always help producers maximize their sales potential while maintaining accurate product information and inventory levels.
Be encouraging and supportive, as many producers may be new to digital marketplaces.`;
  }
}

export default ProducerAgent;