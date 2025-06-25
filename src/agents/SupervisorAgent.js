import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import ProducerAgent from './ProducerAgent.js';
import ConsumerAgent from './ConsumerAgent.js';
import ExporterAgent from './ExporterAgent.js';
import MarketAnalystAgent from './MarketAnalystAgent.js';
import LogisticsAgent from './LogisticsAgent.js';
import QualityAssuranceAgent from './QualityAssuranceAgent.js';

export class SupervisorAgent extends BaseAgent {
  constructor() {
    super('Supervisor', 'Orchestrate and coordinate all agent activities');
    this.agents = this.initializeAgents();
    this.intentClassifier = this.createIntentClassifier();
  }

  initializeAgents() {
    return {
      producer: new ProducerAgent(),
      consumer: new ConsumerAgent(),
      exporter: new ExporterAgent(),
      market_analyst: new MarketAnalystAgent(),
      logistics: new LogisticsAgent(),
      quality_assurance: new QualityAssuranceAgent()
    };
  }

  createIntentClassifier() {
    return {
      'list_product': ['producer'],
      'search_products': ['consumer', 'exporter'],
      'negotiate_price': ['producer', 'consumer', 'exporter'],
      'create_transaction': ['consumer', 'exporter'],
      'track_shipment': ['logistics'],
      'quality_check': ['quality_assurance'],
      'market_analysis': ['market_analyst'],
      'price_forecast': ['market_analyst'],
      'manage_inventory': ['producer'],
      'coordinate_delivery': ['logistics'],
      'verify_certification': ['quality_assurance']
    };
  }

  async classifyIntent(message, context) {
    const llm = this.selectOptimalLLM('classification');
    
    const classificationPrompt = `
Classify the user's intent from the following message. 
Available intents: ${Object.keys(this.intentClassifier).join(', ')}

User message: "${message}"
User role: ${context.user?.role || 'unknown'}

Respond with only the intent name, nothing else.
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: classificationPrompt }]);
      const intent = response.content.trim().toLowerCase();
      
      // Validate intent
      if (this.intentClassifier[intent]) {
        return intent;
      }
      
      // Fallback classification based on keywords
      return this.fallbackIntentClassification(message, context);
    } catch (error) {
      console.error('Intent classification error:', error);
      return this.fallbackIntentClassification(message, context);
    }
  }

  fallbackIntentClassification(message, context) {
    const messageLower = message.toLowerCase();
    
    // Keyword-based classification
    if (messageLower.includes('list') || messageLower.includes('sell') || messageLower.includes('product')) {
      return 'list_product';
    }
    if (messageLower.includes('search') || messageLower.includes('find') || messageLower.includes('buy')) {
      return 'search_products';
    }
    if (messageLower.includes('price') || messageLower.includes('negotiate') || messageLower.includes('offer')) {
      return 'negotiate_price';
    }
    if (messageLower.includes('ship') || messageLower.includes('deliver') || messageLower.includes('track')) {
      return 'track_shipment';
    }
    if (messageLower.includes('quality') || messageLower.includes('certificate') || messageLower.includes('organic')) {
      return 'quality_check';
    }
    if (messageLower.includes('market') || messageLower.includes('trend') || messageLower.includes('analysis')) {
      return 'market_analysis';
    }
    
    // Default based on user role
    if (context.user?.role === 'producer') {
      return 'list_product';
    } else if (context.user?.role === 'consumer' || context.user?.role === 'exporter') {
      return 'search_products';
    }
    
    return 'search_products'; // Default fallback
  }

  selectAgent(intent, context) {
    const eligibleAgents = this.intentClassifier[intent] || ['consumer'];
    
    // Select based on user role if multiple agents are eligible
    if (eligibleAgents.length > 1 && context.user?.role) {
      const userRole = context.user.role;
      if (eligibleAgents.includes(userRole)) {
        return this.agents[userRole];
      }
    }
    
    // Return first eligible agent
    return this.agents[eligibleAgents[0]];
  }

  createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        messages: [],
        context: {},
        intent: null,
        selectedAgent: null,
        result: null,
        needsHumanReview: false
      }
    });

    // Add nodes
    workflow.addNode("classify_intent", this.classifyIntentNode.bind(this));
    workflow.addNode("select_agent", this.selectAgentNode.bind(this));
    workflow.addNode("delegate_task", this.delegateTaskNode.bind(this));
    workflow.addNode("human_review", this.humanReviewNode.bind(this));
    workflow.addNode("finalize_response", this.finalizeResponseNode.bind(this));

    // Add edges
    workflow.addEdge("__start__", "classify_intent");
    workflow.addEdge("classify_intent", "select_agent");
    workflow.addEdge("select_agent", "delegate_task");
    
    // Conditional edge for human review
    workflow.addConditionalEdges(
      "delegate_task",
      this.shouldRequireHumanReview.bind(this),
      {
        "human_review": "human_review",
        "finalize": "finalize_response"
      }
    );
    
    workflow.addEdge("human_review", "finalize_response");
    workflow.addEdge("finalize_response", END);

    return workflow.compile();
  }

  async classifyIntentNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    const intent = await this.classifyIntent(lastMessage.content, context);
    
    return {
      ...state,
      intent: intent
    };
  }

  async selectAgentNode(state) {
    const { intent, context } = state;
    const selectedAgent = this.selectAgent(intent, context);
    
    return {
      ...state,
      selectedAgent: selectedAgent
    };
  }

  async delegateTaskNode(state) {
    const { messages, context, selectedAgent } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const result = await selectedAgent.execute(lastMessage.content, context);
      
      return {
        ...state,
        result: result,
        needsHumanReview: this.checkIfNeedsHumanReview(result, context)
      };
    } catch (error) {
      console.error('Agent delegation error:', error);
      return {
        ...state,
        result: {
          content: "I apologize, but I encountered an error processing your request. Please try again or contact support.",
          error: true
        },
        needsHumanReview: true
      };
    }
  }

  async humanReviewNode(state) {
    // Implement human-in-the-loop logic
    // For now, we'll just log and continue
    console.log('Human review required for:', state.result);
    
    // In a real implementation, this would:
    // 1. Send notification to human operators
    // 2. Wait for human input
    // 3. Incorporate human feedback
    
    return {
      ...state,
      result: {
        ...state.result,
        humanReviewed: true,
        reviewNote: "Automatically approved - human review system not fully implemented"
      }
    };
  }

  async finalizeResponseNode(state) {
    const { result, context } = state;
    
    // Add metadata and formatting
    const finalResult = {
      ...result,
      supervisor: this.name,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId || 'unknown'
    };
    
    return {
      ...state,
      result: finalResult
    };
  }

  shouldRequireHumanReview(state) {
    return state.needsHumanReview ? "human_review" : "finalize";
  }

  checkIfNeedsHumanReview(result, context) {
    // Define conditions that require human review
    if (result.error) return true;
    
    // High-value transactions
    if (context.transaction && parseFloat(context.transaction.total_amount) > 10000) {
      return true;
    }
    
    // Quality issues
    if (result.content && result.content.toLowerCase().includes('quality issue')) {
      return true;
    }
    
    // Disputes
    if (result.content && result.content.toLowerCase().includes('dispute')) {
      return true;
    }
    
    return false;
  }

  getSystemPrompt() {
    return `You are the Supervisor Agent in the AgriConnect agricultural marketplace platform.

Your responsibilities:
1. Analyze user requests and classify their intent
2. Route requests to appropriate specialized agents
3. Coordinate multi-step workflows
4. Ensure quality and consistency of responses
5. Handle escalations and exceptions
6. Maintain context across interactions

Available specialized agents:
- Producer Agent: Product listing, inventory management
- Consumer Agent: Product search, purchasing
- Exporter Agent: Bulk ordering, supplier evaluation
- Market Analyst Agent: Price forecasting, market trends
- Logistics Agent: Shipping coordination, delivery tracking
- Quality Assurance Agent: Certification verification, quality control

Always ensure users get accurate, helpful responses while maintaining the security and integrity of the platform.`;
  }

  async execute(input, context = {}) {
    const workflow = this.createWorkflow();
    
    const initialState = {
      messages: [{ role: 'user', content: input }],
      context: context,
      intent: null,
      selectedAgent: null,
      result: null,
      needsHumanReview: false
    };

    const result = await workflow.invoke(initialState);
    return result.result;
  }
}

export default SupervisorAgent;