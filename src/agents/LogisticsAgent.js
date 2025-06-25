import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import DatabaseService from '../config/database.js';

export class LogisticsAgent extends BaseAgent {
  constructor() {
    super('Logistics', 'Coordinate shipping, delivery, and supply chain logistics');
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
    workflow.addNode("track_shipment", this.trackShipmentNode.bind(this));
    workflow.addNode("optimize_route", this.optimizeRouteNode.bind(this));
    workflow.addNode("coordinate_delivery", this.coordinateDeliveryNode.bind(this));
    workflow.addNode("manage_carriers", this.manageCarriersNode.bind(this));

    workflow.addEdge("__start__", "analyze_request");
    
    workflow.addConditionalEdges(
      "analyze_request",
      this.routeAction.bind(this),
      {
        "track_shipment": "track_shipment",
        "optimize_route": "optimize_route",
        "coordinate_delivery": "coordinate_delivery",
        "manage_carriers": "manage_carriers"
      }
    );

    workflow.addEdge("track_shipment", END);
    workflow.addEdge("optimize_route", END);
    workflow.addEdge("coordinate_delivery", END);
    workflow.addEdge("manage_carriers", END);

    return workflow.compile();
  }

  async analyzeRequestNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('classification');
    
    const analysisPrompt = `
Analyze this logistics request and determine the action needed:

Available actions:
- track_shipment: Track delivery status and location
- optimize_route: Plan optimal delivery routes
- coordinate_delivery: Manage delivery scheduling
- manage_carriers: Handle carrier selection and management

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
        action: 'track_shipment' // Default action
      };
    }
  }

  routeAction(state) {
    return state.action || 'track_shipment';
  }

  async trackShipmentNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const llm = this.selectOptimalLLM('generation');
      
      const extractionPrompt = `
Extract tracking information from this message:

Message: "${lastMessage.content}"

Extract tracking number, order ID, or transaction ID. Respond with just the identifier.
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const trackingId = response.content.trim();
      
      // Search for shipment by tracking number or transaction ID
      const { data: shipments, error } = await DatabaseService.client
        .from('logistics_shipments')
        .select(`
          *,
          transaction:transactions(
            id,
            buyer_id,
            seller_id,
            product:products(name, category),
            buyer:profiles!transactions_buyer_id_fkey(full_name),
            seller:profiles!transactions_seller_id_fkey(full_name)
          )
        `)
        .or(`tracking_number.eq.${trackingId},transaction_id.eq.${trackingId},id.eq.${trackingId}`);

      if (error) throw error;

      if (!shipments || shipments.length === 0) {
        // If no specific shipment found, show user's recent shipments
        const userTransactions = await DatabaseService.getTransactions(context.user.id);
        const userShipments = await Promise.all(
          userTransactions.slice(0, 5).map(async (transaction) => {
            const { data: shipment } = await DatabaseService.client
              .from('logistics_shipments')
              .select('*')
              .eq('transaction_id', transaction.id)
              .single();
            return { ...shipment, transaction };
          })
        );

        const validShipments = userShipments.filter(s => s.id);

        if (validShipments.length === 0) {
          return {
            ...state,
            result: {
              content: "No shipments found. Your orders may not have been shipped yet, or tracking information is not available.",
              success: false
            }
          };
        }

        const shipmentsList = validShipments.map(shipment => 
          `📦 **${shipment.transaction.product.name}**\n` +
          `   • Status: ${this.getStatusEmoji(shipment.status)} ${shipment.status}\n` +
          `   • Tracking: ${shipment.tracking_number || 'Not assigned'}\n` +
          `   • Carrier: ${shipment.carrier_name || 'TBD'}\n` +
          `   • Est. Delivery: ${shipment.estimated_delivery_date ? new Date(shipment.estimated_delivery_date).toLocaleDateString() : 'TBD'}`
        ).join('\n\n');

        return {
          ...state,
          result: {
            content: `📋 **Your Recent Shipments:**\n\n${shipmentsList}\n\nTo track a specific shipment, provide the tracking number or order ID.`,
            success: true,
            shipments: validShipments
          }
        };
      }

      const shipment = shipments[0];
      
      // Check if user is authorized to view this shipment
      if (shipment.transaction.buyer_id !== context.user.id && 
          shipment.transaction.seller_id !== context.user.id) {
        return {
          ...state,
          result: {
            content: "You don't have permission to view this shipment.",
            success: false
          }
        };
      }

      // Generate tracking events
      const trackingEvents = this.generateTrackingEvents(shipment);
      
      const trackingText = `📦 **Shipment Tracking**\n\n` +
                          `**Order Details:**\n` +
                          `• Product: ${shipment.transaction.product.name}\n` +
                          `• From: ${shipment.transaction.seller.full_name}\n` +
                          `• To: ${shipment.transaction.buyer.full_name}\n` +
                          `• Tracking #: ${shipment.tracking_number || 'Not assigned'}\n` +
                          `• Carrier: ${shipment.carrier_name || 'TBD'}\n\n` +
                          `**Current Status:** ${this.getStatusEmoji(shipment.status)} ${shipment.status.toUpperCase()}\n\n` +
                          `**Delivery Timeline:**\n` +
                          `• Pickup Date: ${shipment.estimated_pickup_date ? new Date(shipment.estimated_pickup_date).toLocaleDateString() : 'TBD'}\n` +
                          `• Estimated Delivery: ${shipment.estimated_delivery_date ? new Date(shipment.estimated_delivery_date).toLocaleDateString() : 'TBD'}\n\n` +
                          `**Tracking Events:**\n${trackingEvents.join('\n')}\n\n` +
                          `${this.getDeliveryInstructions(shipment.status)}`;

      return {
        ...state,
        result: {
          content: trackingText,
          success: true,
          shipment: shipment
        }
      };
    } catch (error) {
      console.error('Shipment tracking error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't track your shipment. Please check the tracking number and try again.",
          success: false
        }
      };
    }
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'pending': '⏳',
      'picked_up': '📤',
      'in_transit': '🚚',
      'delivered': '✅',
      'failed': '❌',
      'returned': '↩️'
    };
    return statusEmojis[status] || '📋';
  }

  generateTrackingEvents(shipment) {
    const events = [];
    const now = new Date();
    
    if (shipment.status === 'pending') {
      events.push('• Order confirmed, preparing for pickup');
    } else {
      events.push('✅ Order confirmed and prepared');
      
      if (shipment.actual_pickup_date || shipment.status !== 'pending') {
        events.push('✅ Package picked up by carrier');
      }
      
      if (shipment.status === 'in_transit') {
        events.push('🚚 Package in transit to destination');
      }
      
      if (shipment.status === 'delivered') {
        events.push('✅ Package delivered successfully');
      }
      
      if (shipment.status === 'failed') {
        events.push('❌ Delivery attempt failed');
      }
    }
    
    return events;
  }

  getDeliveryInstructions(status) {
    switch (status) {
      case 'pending':
        return '📋 Your order is being prepared for shipment.';
      case 'picked_up':
        return '📤 Your package has been picked up and will be in transit soon.';
      case 'in_transit':
        return '🚚 Your package is on its way! Please ensure someone is available to receive it.';
      case 'delivered':
        return '🎉 Your package has been delivered! Please confirm receipt.';
      case 'failed':
        return '⚠️ Delivery attempt failed. Please contact the carrier to reschedule.';
      default:
        return '📦 Tracking information will be updated as your package moves through the delivery network.';
    }
  }

  async optimizeRouteNode(state) {
    const { messages, context } = state;
    
    try {
      // Get pending shipments for route optimization
      const { data: pendingShipments, error } = await DatabaseService.client
        .from('logistics_shipments')
        .select(`
          *,
          transaction:transactions(
            product:products(name),
            buyer:profiles!transactions_buyer_id_fkey(full_name),
            seller:profiles!transactions_seller_id_fkey(full_name)
          )
        `)
        .eq('status', 'pending')
        .limit(10);

      if (error) throw error;

      if (!pendingShipments || pendingShipments.length === 0) {
        return {
          ...state,
          result: {
            content: "No pending shipments found for route optimization.",
            success: false
          }
        };
      }

      // Simple route optimization (in a real system, this would use advanced algorithms)
      const optimizedRoutes = this.calculateOptimalRoutes(pendingShipments);
      
      const routeText = `🗺️ **Route Optimization Results**\n\n` +
                       `**Pending Shipments:** ${pendingShipments.length}\n` +
                       `**Optimized Routes:** ${optimizedRoutes.length}\n\n` +
                       optimizedRoutes.map((route, index) => 
                         `**Route ${index + 1}:**\n` +
                         `• Stops: ${route.stops}\n` +
                         `• Distance: ${route.distance} km\n` +
                         `• Est. Time: ${route.estimatedTime} hours\n` +
                         `• Shipments: ${route.shipments.length}\n`
                       ).join('\n') +
                       `\n**Efficiency Gains:**\n` +
                       `• Distance saved: ${optimizedRoutes.reduce((sum, r) => sum + r.distanceSaved, 0)} km\n` +
                       `• Time saved: ${optimizedRoutes.reduce((sum, r) => sum + r.timeSaved, 0)} hours\n` +
                       `• Cost reduction: ${optimizedRoutes.reduce((sum, r) => sum + r.costSaved, 0)}%`;

      return {
        ...state,
        result: {
          content: routeText,
          success: true,
          routes: optimizedRoutes
        }
      };
    } catch (error) {
      console.error('Route optimization error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't optimize routes at this time. Please try again.",
          success: false
        }
      };
    }
  }

  calculateOptimalRoutes(shipments) {
    // Simplified route optimization
    // In a real system, this would use sophisticated algorithms like TSP solvers
    
    const routes = [];
    const shipmentsPerRoute = 5; // Max shipments per route
    
    for (let i = 0; i < shipments.length; i += shipmentsPerRoute) {
      const routeShipments = shipments.slice(i, i + shipmentsPerRoute);
      
      const route = {
        stops: routeShipments.length,
        distance: routeShipments.length * 25 + Math.random() * 50, // Simulated
        estimatedTime: routeShipments.length * 1.5 + Math.random() * 2,
        shipments: routeShipments,
        distanceSaved: Math.random() * 20,
        timeSaved: Math.random() * 2,
        costSaved: Math.random() * 15
      };
      
      routes.push(route);
    }
    
    return routes;
  }

  async coordinateDeliveryNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const llm = this.selectOptimalLLM('generation');
      
      const extractionPrompt = `
Extract delivery coordination request:

Message: "${lastMessage.content}"

Extract delivery preferences, scheduling requirements, or special instructions.
Format as JSON:
{
  "delivery_date": "preferred date or null",
  "time_window": "time preference or null",
  "special_instructions": "any special requirements",
  "address_update": "new address if provided or null"
}
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const deliveryData = JSON.parse(response.content);
      
      // Get user's active shipments
      const transactions = await DatabaseService.getTransactions(context.user.id);
      const activeTransactions = transactions.filter(t => 
        ['confirmed', 'paid', 'shipped'].includes(t.status)
      );

      if (activeTransactions.length === 0) {
        return {
          ...state,
          result: {
            content: "You don't have any active shipments to coordinate delivery for.",
            success: false
          }
        };
      }

      // Update delivery preferences for active shipments
      const coordinationResults = [];
      
      for (const transaction of activeTransactions.slice(0, 3)) { // Limit to 3 most recent
        const { data: shipment } = await DatabaseService.client
          .from('logistics_shipments')
          .select('*')
          .eq('transaction_id', transaction.id)
          .single();

        if (shipment) {
          const updates = {};
          
          if (deliveryData.delivery_date) {
            updates.estimated_delivery_date = deliveryData.delivery_date;
          }
          
          if (deliveryData.address_update) {
            updates.delivery_address = JSON.parse(deliveryData.address_update);
          }

          if (Object.keys(updates).length > 0) {
            await DatabaseService.client
              .from('logistics_shipments')
              .update(updates)
              .eq('id', shipment.id);
          }

          coordinationResults.push({
            product: transaction.product.name,
            status: 'updated',
            changes: Object.keys(updates)
          });
        }
      }

      const coordinationText = `📅 **Delivery Coordination**\n\n` +
                              `**Updated Shipments:**\n` +
                              coordinationResults.map(result => 
                                `• ${result.product}: ${result.changes.join(', ')} updated`
                              ).join('\n') +
                              `\n\n**Delivery Preferences Applied:**\n` +
                              `${deliveryData.delivery_date ? `• Preferred Date: ${deliveryData.delivery_date}\n` : ''}` +
                              `${deliveryData.time_window ? `• Time Window: ${deliveryData.time_window}\n` : ''}` +
                              `${deliveryData.special_instructions ? `• Special Instructions: ${deliveryData.special_instructions}\n` : ''}` +
                              `\n📞 Carriers will be notified of your preferences and will contact you to confirm delivery details.`;

      return {
        ...state,
        result: {
          content: coordinationText,
          success: true,
          coordination: coordinationResults
        }
      };
    } catch (error) {
      console.error('Delivery coordination error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't coordinate your delivery preferences. Please try again with specific requirements.",
          success: false
        }
      };
    }
  }

  async manageCarriersNode(state) {
    try {
      // Get carrier performance data
      const { data: shipments, error } = await DatabaseService.client
        .from('logistics_shipments')
        .select('carrier_name, status, estimated_delivery_date, actual_delivery_date, shipping_cost')
        .not('carrier_name', 'is', null);

      if (error) throw error;

      // Analyze carrier performance
      const carrierStats = {};
      shipments.forEach(shipment => {
        const carrier = shipment.carrier_name;
        if (!carrierStats[carrier]) {
          carrierStats[carrier] = {
            totalShipments: 0,
            delivered: 0,
            failed: 0,
            onTime: 0,
            totalCost: 0,
            avgCost: 0
          };
        }
        
        const stats = carrierStats[carrier];
        stats.totalShipments++;
        
        if (shipment.status === 'delivered') {
          stats.delivered++;
          
          // Check if delivered on time
          if (shipment.estimated_delivery_date && shipment.actual_delivery_date) {
            const estimated = new Date(shipment.estimated_delivery_date);
            const actual = new Date(shipment.actual_delivery_date);
            if (actual <= estimated) {
              stats.onTime++;
            }
          }
        } else if (shipment.status === 'failed') {
          stats.failed++;
        }
        
        if (shipment.shipping_cost) {
          stats.totalCost += parseFloat(shipment.shipping_cost);
        }
      });

      // Calculate performance metrics
      Object.values(carrierStats).forEach(stats => {
        stats.deliveryRate = stats.totalShipments > 0 ? 
          (stats.delivered / stats.totalShipments * 100).toFixed(1) : 0;
        stats.onTimeRate = stats.delivered > 0 ? 
          (stats.onTime / stats.delivered * 100).toFixed(1) : 0;
        stats.avgCost = stats.totalShipments > 0 ? 
          (stats.totalCost / stats.totalShipments).toFixed(2) : 0;
      });

      // Sort carriers by performance
      const rankedCarriers = Object.entries(carrierStats)
        .sort(([,a], [,b]) => parseFloat(b.deliveryRate) - parseFloat(a.deliveryRate))
        .slice(0, 5);

      const carrierText = `🚛 **Carrier Management Dashboard**\n\n` +
                         `**Carrier Performance Rankings:**\n` +
                         rankedCarriers.map(([carrier, stats], index) => 
                           `${index + 1}. **${carrier}**\n` +
                           `   • Delivery Rate: ${stats.deliveryRate}%\n` +
                           `   • On-Time Rate: ${stats.onTimeRate}%\n` +
                           `   • Avg Cost: $${stats.avgCost}\n` +
                           `   • Total Shipments: ${stats.totalShipments}\n`
                         ).join('\n') +
                         `\n**Recommendations:**\n` +
                         `• Best Overall: ${rankedCarriers[0]?.[0] || 'N/A'}\n` +
                         `• Most Reliable: ${this.getMostReliableCarrier(rankedCarriers)}\n` +
                         `• Most Cost-Effective: ${this.getMostCostEffective(rankedCarriers)}`;

      return {
        ...state,
        result: {
          content: carrierText,
          success: true,
          carriers: carrierStats
        }
      };
    } catch (error) {
      console.error('Carrier management error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't retrieve carrier performance data. Please try again.",
          success: false
        }
      };
    }
  }

  getMostReliableCarrier(rankedCarriers) {
    if (rankedCarriers.length === 0) return 'N/A';
    
    const mostReliable = rankedCarriers.reduce((best, [carrier, stats]) => {
      const reliability = parseFloat(stats.onTimeRate);
      return reliability > parseFloat(best[1].onTimeRate) ? [carrier, stats] : best;
    });
    
    return mostReliable[0];
  }

  getMostCostEffective(rankedCarriers) {
    if (rankedCarriers.length === 0) return 'N/A';
    
    const mostCostEffective = rankedCarriers.reduce((best, [carrier, stats]) => {
      const cost = parseFloat(stats.avgCost);
      const deliveryRate = parseFloat(stats.deliveryRate);
      
      // Consider both cost and delivery rate
      const value = deliveryRate / Math.max(cost, 1);
      const bestValue = parseFloat(best[1].deliveryRate) / Math.max(parseFloat(best[1].avgCost), 1);
      
      return value > bestValue ? [carrier, stats] : best;
    });
    
    return mostCostEffective[0];
  }

  getSystemPrompt() {
    return `You are the Logistics Agent in AgriConnect, specialized in coordinating shipping and delivery operations.

Your capabilities:
1. Track shipments and provide delivery updates
2. Optimize delivery routes for efficiency
3. Coordinate delivery scheduling and preferences
4. Manage carrier relationships and performance
5. Handle logistics exceptions and issues
6. Provide shipping cost estimates and options

Always prioritize timely delivery and customer satisfaction while optimizing for cost and efficiency.
Keep users informed about their shipment status and any potential delays.`;
  }
}

export default LogisticsAgent;