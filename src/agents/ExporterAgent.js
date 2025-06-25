import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import DatabaseService from '../config/database.js';

export class ExporterAgent extends BaseAgent {
  constructor() {
    super('Exporter', 'Help exporters find suppliers, manage bulk orders, and coordinate international trade');
  }

  createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        messages: [],
        context: {},
        action: null,
        result: null
      }
    });

    workflow.addNode("analyze_request", this.analyzeRequestNode.bind(this));
    workflow.addNode("find_suppliers", this.findSuppliersNode.bind(this));
    workflow.addNode("bulk_ordering", this.bulkOrderingNode.bind(this));
    workflow.addNode("supplier_evaluation", this.supplierEvaluationNode.bind(this));
    workflow.addNode("manage_contracts", this.manageContractsNode.bind(this));

    workflow.addEdge("__start__", "analyze_request");
    
    workflow.addConditionalEdges(
      "analyze_request",
      this.routeAction.bind(this),
      {
        "find_suppliers": "find_suppliers",
        "bulk_ordering": "bulk_ordering",
        "supplier_evaluation": "supplier_evaluation",
        "manage_contracts": "manage_contracts"
      }
    );

    workflow.addEdge("find_suppliers", END);
    workflow.addEdge("bulk_ordering", END);
    workflow.addEdge("supplier_evaluation", END);
    workflow.addEdge("manage_contracts", END);

    return workflow.compile();
  }

  async analyzeRequestNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('classification');
    
    const analysisPrompt = `
Analyze this exporter's request and determine the action needed:

Available actions:
- find_suppliers: Search for reliable suppliers and producers
- bulk_ordering: Place large quantity orders
- supplier_evaluation: Evaluate supplier reliability and quality
- manage_contracts: Handle export contracts and agreements

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
        action: 'find_suppliers' // Default action
      };
    }
  }

  routeAction(state) {
    return state.action || 'find_suppliers';
  }

  async findSuppliersNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('generation');
    
    const extractionPrompt = `
Extract supplier search criteria from this message:

Message: "${lastMessage.content}"

Extract and format as JSON:
{
  "product_category": "category name or null",
  "minimum_quantity": number or null,
  "location_preference": "location or null",
  "quality_requirements": "quality standards or null",
  "organic_required": boolean,
  "certification_required": boolean
}
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const searchCriteria = JSON.parse(response.content);
      
      // Search for products that meet bulk requirements
      const products = await DatabaseService.getProducts({
        category: searchCriteria.product_category,
        organic_only: searchCriteria.organic_required
      });

      // Filter for bulk quantities and group by producer
      const bulkProducts = products.filter(product => 
        product.available_quantity >= (searchCriteria.minimum_quantity || 100)
      );

      // Group by producer to show supplier capabilities
      const supplierMap = new Map();
      bulkProducts.forEach(product => {
        const producerId = product.producer.id;
        if (!supplierMap.has(producerId)) {
          supplierMap.set(producerId, {
            producer: product.producer,
            products: [],
            totalCapacity: 0
          });
        }
        const supplier = supplierMap.get(producerId);
        supplier.products.push(product);
        supplier.totalCapacity += product.available_quantity;
      });

      const suppliers = Array.from(supplierMap.values())
        .sort((a, b) => b.totalCapacity - a.totalCapacity)
        .slice(0, 10);

      if (suppliers.length === 0) {
        return {
          ...state,
          result: {
            content: "I couldn't find suppliers meeting your bulk requirements. Consider adjusting your criteria or contacting producers directly for custom arrangements.",
            success: false
          }
        };
      }

      const suppliersList = suppliers.map(supplier => {
        const productList = supplier.products.map(p => 
          `${p.name}: ${p.available_quantity} ${p.unit} @ $${p.price_per_unit}/${p.unit}`
        ).join('\n     ');
        
        return `🏭 **${supplier.producer.company_name || supplier.producer.full_name}**\n` +
               `   📊 Reputation: ${supplier.producer.reputation_score || 'New'}/5.0\n` +
               `   📦 Total Capacity: ${supplier.totalCapacity} units\n` +
               `   📋 Products:\n     ${productList}\n` +
               `   📞 Contact: ${supplier.producer.email}`;
      }).join('\n\n');

      return {
        ...state,
        result: {
          content: `🔍 Found ${suppliers.length} suppliers for bulk orders:\n\n${suppliersList}\n\nTo place a bulk order, specify the supplier and quantities you need.`,
          success: true,
          suppliers: suppliers
        }
      };
    } catch (error) {
      console.error('Supplier search error:', error);
      return {
        ...state,
        result: {
          content: "I had trouble processing your supplier search. Could you please provide more specific requirements?",
          success: false
        }
      };
    }
  }

  async bulkOrderingNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('generation');
    
    const extractionPrompt = `
Extract bulk order information from this message:

Message: "${lastMessage.content}"

Extract and format as JSON:
{
  "orders": [
    {
      "product_id": "product ID",
      "quantity": number,
      "max_price": number or null
    }
  ],
  "delivery_terms": "delivery requirements",
  "payment_terms": "payment preferences",
  "delivery_date": "required delivery date or null"
}
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const orderData = JSON.parse(response.content);
      
      if (!orderData.orders || orderData.orders.length === 0) {
        return {
          ...state,
          result: {
            content: "Please specify which products and quantities you'd like to order.",
            success: false
          }
        };
      }

      const orderResults = [];
      let totalAmount = 0;

      for (const orderItem of orderData.orders) {
        const product = await DatabaseService.getProduct(orderItem.product_id);
        
        if (!product) {
          orderResults.push(`❌ Product ${orderItem.product_id} not found`);
          continue;
        }

        if (product.available_quantity < orderItem.quantity) {
          orderResults.push(`⚠️ ${product.name}: Only ${product.available_quantity} ${product.unit} available (requested ${orderItem.quantity})`);
          continue;
        }

        if (orderItem.max_price && product.price_per_unit > orderItem.max_price) {
          orderResults.push(`💰 ${product.name}: Price $${product.price_per_unit}/${product.unit} exceeds your max of $${orderItem.max_price}`);
          continue;
        }

        // Create transaction for bulk order
        const transactionData = {
          buyer_id: context.user.id,
          seller_id: product.producer_id,
          product_id: product.id,
          quantity: orderItem.quantity,
          unit_price: product.price_per_unit,
          total_amount: orderItem.quantity * product.price_per_unit,
          currency: product.currency || 'USD',
          status: 'pending',
          payment_status: 'pending',
          notes: `Bulk order - ${orderData.delivery_terms || ''} - ${orderData.payment_terms || ''}`
        };

        const transaction = await DatabaseService.createTransaction(transactionData);
        
        // Update product availability
        await DatabaseService.updateProduct(product.id, {
          available_quantity: product.available_quantity - orderItem.quantity
        });

        orderResults.push(`✅ ${product.name}: ${orderItem.quantity} ${product.unit} @ $${product.price_per_unit} = $${transactionData.total_amount}`);
        totalAmount += transactionData.total_amount;
      }

      return {
        ...state,
        result: {
          content: `📦 Bulk Order Summary:\n\n${orderResults.join('\n')}\n\n💰 **Total Amount: $${totalAmount.toFixed(2)}**\n\nYour orders are pending confirmation from suppliers. You'll receive updates on each order status.`,
          success: true,
          totalAmount: totalAmount
        }
      };
    } catch (error) {
      console.error('Bulk ordering error:', error);
      return {
        ...state,
        result: {
          content: "I encountered an error processing your bulk order. Please try again or contact support.",
          success: false
        }
      };
    }
  }

  async supplierEvaluationNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      // Extract supplier ID or name from message
      const llm = this.selectOptimalLLM('generation');
      
      const extractionPrompt = `
Extract supplier information to evaluate:

Message: "${lastMessage.content}"

Extract supplier name, company name, or ID to evaluate.
Respond with just the identifier.
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const supplierIdentifier = response.content.trim();
      
      // Search for supplier
      const { data: suppliers, error } = await DatabaseService.client
        .from('profiles')
        .select('*')
        .eq('role', 'producer')
        .or(`full_name.ilike.%${supplierIdentifier}%,company_name.ilike.%${supplierIdentifier}%,id.eq.${supplierIdentifier}`);

      if (error || !suppliers || suppliers.length === 0) {
        return {
          ...state,
          result: {
            content: "I couldn't find the supplier you're looking for. Please provide the supplier name or ID.",
            success: false
          }
        };
      }

      const supplier = suppliers[0];
      
      // Get supplier's products and transaction history
      const products = await DatabaseService.getProducts({ producer_id: supplier.id });
      const transactions = await DatabaseService.getTransactions(supplier.id);
      const supplierTransactions = transactions.filter(t => t.seller_id === supplier.id);
      
      // Calculate metrics
      const totalSales = supplierTransactions.filter(t => t.status === 'completed').length;
      const completionRate = supplierTransactions.length > 0 ? 
        (totalSales / supplierTransactions.length * 100).toFixed(1) : 0;
      
      const avgDeliveryTime = supplierTransactions
        .filter(t => t.status === 'completed' && t.delivery_date)
        .reduce((sum, t) => {
          const orderDate = new Date(t.created_at);
          const deliveryDate = new Date(t.delivery_date);
          return sum + (deliveryDate - orderDate) / (1000 * 60 * 60 * 24);
        }, 0) / Math.max(1, totalSales);

      const evaluation = `📊 **Supplier Evaluation: ${supplier.company_name || supplier.full_name}**\n\n` +
                        `🏆 **Reputation Score:** ${supplier.reputation_score || 'New'}/5.0\n` +
                        `📦 **Total Products:** ${products.length}\n` +
                        `✅ **Completed Orders:** ${totalSales}\n` +
                        `📈 **Completion Rate:** ${completionRate}%\n` +
                        `🚚 **Avg Delivery Time:** ${avgDeliveryTime.toFixed(1)} days\n` +
                        `📅 **Member Since:** ${new Date(supplier.created_at).toLocaleDateString()}\n` +
                        `✔️ **Verification Status:** ${supplier.verification_status}\n\n` +
                        `**Product Categories:**\n${[...new Set(products.map(p => p.category))].join(', ')}\n\n` +
                        `**Recommendation:** ${this.getSupplierRecommendation(supplier, completionRate, totalSales)}`;

      return {
        ...state,
        result: {
          content: evaluation,
          success: true,
          supplier: supplier,
          metrics: {
            totalSales,
            completionRate,
            avgDeliveryTime,
            productCount: products.length
          }
        }
      };
    } catch (error) {
      console.error('Supplier evaluation error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't evaluate the supplier. Please try again with a valid supplier name or ID.",
          success: false
        }
      };
    }
  }

  getSupplierRecommendation(supplier, completionRate, totalSales) {
    if (totalSales === 0) {
      return "New supplier - Consider starting with a small test order.";
    }
    
    if (completionRate >= 90 && totalSales >= 10) {
      return "Highly recommended - Excellent track record and reliability.";
    } else if (completionRate >= 75 && totalSales >= 5) {
      return "Recommended - Good performance with room for improvement.";
    } else if (completionRate >= 50) {
      return "Proceed with caution - Mixed performance history.";
    } else {
      return "Not recommended - Poor completion rate and reliability issues.";
    }
  }

  async manageContractsNode(state) {
    const { context } = state;
    
    try {
      const transactions = await DatabaseService.getTransactions(context.user.id);
      const exporterTransactions = transactions.filter(t => t.buyer_id === context.user.id);
      
      // Group by status for contract management
      const contractsByStatus = {
        pending: exporterTransactions.filter(t => t.status === 'pending'),
        confirmed: exporterTransactions.filter(t => t.status === 'confirmed'),
        active: exporterTransactions.filter(t => ['paid', 'shipped'].includes(t.status)),
        completed: exporterTransactions.filter(t => t.status === 'completed')
      };

      const contractSummary = Object.entries(contractsByStatus).map(([status, contracts]) => {
        if (contracts.length === 0) return null;
        
        const totalValue = contracts.reduce((sum, c) => sum + parseFloat(c.total_amount), 0);
        return `📋 **${status.charAt(0).toUpperCase() + status.slice(1)} Contracts:** ${contracts.length} (Total: $${totalValue.toFixed(2)})`;
      }).filter(Boolean).join('\n');

      const recentContracts = exporterTransactions
        .slice(0, 5)
        .map(contract => 
          `• Contract #${contract.id.slice(0, 8)}: ${contract.product.name} - $${contract.total_amount} (${contract.status})`
        ).join('\n');

      return {
        ...state,
        result: {
          content: `📄 **Contract Management Dashboard**\n\n${contractSummary}\n\n**Recent Contracts:**\n${recentContracts}\n\nTo update a contract status or get details, provide the contract ID.`,
          success: true,
          contracts: contractsByStatus
        }
      };
    } catch (error) {
      console.error('Contract management error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't retrieve your contract information. Please try again.",
          success: false
        }
      };
    }
  }

  getSystemPrompt() {
    return `You are the Exporter Agent in AgriConnect, specialized in helping exporters manage international agricultural trade.

Your capabilities:
1. Find reliable suppliers for bulk orders
2. Evaluate supplier performance and reliability
3. Manage large-scale bulk ordering processes
4. Handle export contracts and agreements
5. Coordinate international shipping and logistics
6. Provide market intelligence for export opportunities

Always focus on helping exporters build reliable supply chains and manage risk in international trade.
Consider factors like quality standards, delivery reliability, and compliance requirements.`;
  }
}

export default ExporterAgent;