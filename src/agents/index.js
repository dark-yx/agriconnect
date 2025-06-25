import SupervisorAgent from './SupervisorAgent.js';
import ProducerAgent from './ProducerAgent.js';
import ConsumerAgent from './ConsumerAgent.js';
import ExporterAgent from './ExporterAgent.js';
import MarketAnalystAgent from './MarketAnalystAgent.js';
import LogisticsAgent from './LogisticsAgent.js';
import QualityAssuranceAgent from './QualityAssuranceAgent.js';

// Agent factory for creating agent instances
export class AgentFactory {
  static createAgent(agentType, config = {}) {
    switch (agentType.toLowerCase()) {
      case 'supervisor':
        return new SupervisorAgent(config);
      case 'producer':
        return new ProducerAgent(config);
      case 'consumer':
        return new ConsumerAgent(config);
      case 'exporter':
        return new ExporterAgent(config);
      case 'market_analyst':
      case 'marketanalyst':
        return new MarketAnalystAgent(config);
      case 'logistics':
        return new LogisticsAgent(config);
      case 'quality_assurance':
      case 'qualityassurance':
        return new QualityAssuranceAgent(config);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  static getAvailableAgents() {
    return [
      'supervisor',
      'producer',
      'consumer',
      'exporter',
      'market_analyst',
      'logistics',
      'quality_assurance'
    ];
  }
}

// Agent service for managing agent interactions
export class AgentService {
  constructor() {
    this.supervisorAgent = new SupervisorAgent();
    this.agents = {
      supervisor: this.supervisorAgent,
      producer: new ProducerAgent(),
      consumer: new ConsumerAgent(),
      exporter: new ExporterAgent(),
      market_analyst: new MarketAnalystAgent(),
      logistics: new LogisticsAgent(),
      quality_assurance: new QualityAssuranceAgent()
    };
  }

  async processMessage(message, context = {}) {
    try {
      // Always route through supervisor agent for proper orchestration
      const response = await this.supervisorAgent.execute(message, context);
      
      return {
        success: true,
        response: response,
        timestamp: new Date().toISOString(),
        context: context
      };
    } catch (error) {
      console.error('Agent service error:', error);
      
      return {
        success: false,
        error: error.message,
        response: {
          content: "I apologize, but I encountered an error processing your request. Please try again or contact support.",
          agent: 'system',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async processDirectAgentMessage(agentType, message, context = {}) {
    try {
      const agent = this.agents[agentType.toLowerCase()];
      if (!agent) {
        throw new Error(`Agent type '${agentType}' not found`);
      }

      const response = await agent.execute(message, context);
      
      return {
        success: true,
        response: response,
        agent: agentType,
        timestamp: new Date().toISOString(),
        context: context
      };
    } catch (error) {
      console.error(`Direct agent (${agentType}) error:`, error);
      
      return {
        success: false,
        error: error.message,
        response: {
          content: `I apologize, but the ${agentType} agent encountered an error. Please try again or contact support.`,
          agent: agentType,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  getAgentCapabilities(agentType) {
    const capabilities = {
      supervisor: [
        'Route requests to appropriate agents',
        'Coordinate multi-step workflows',
        'Handle complex queries requiring multiple agents',
        'Manage escalations and exceptions'
      ],
      producer: [
        'Create and manage product listings',
        'Update inventory and pricing',
        'Handle incoming orders',
        'View sales analytics'
      ],
      consumer: [
        'Search and filter products',
        'Place orders and track deliveries',
        'Get product recommendations',
        'Manage purchase history'
      ],
      exporter: [
        'Find reliable suppliers',
        'Manage bulk orders',
        'Evaluate supplier performance',
        'Handle export contracts'
      ],
      market_analyst: [
        'Provide price forecasts',
        'Analyze market trends',
        'Competitive analysis',
        'Supply and demand insights'
      ],
      logistics: [
        'Track shipments and deliveries',
        'Optimize delivery routes',
        'Coordinate delivery scheduling',
        'Manage carrier relationships'
      ],
      quality_assurance: [
        'Verify quality certifications',
        'Conduct quality inspections',
        'Manage quality standards',
        'Handle quality issues'
      ]
    };

    return capabilities[agentType.toLowerCase()] || [];
  }

  async healthCheck() {
    const results = {};
    
    for (const [agentType, agent] of Object.entries(this.agents)) {
      try {
        // Simple health check - try to process a basic message
        const response = await agent.execute('health check', { healthCheck: true });
        results[agentType] = {
          status: 'healthy',
          response: response ? 'responsive' : 'no response'
        };
      } catch (error) {
        results[agentType] = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    return results;
  }
}

// Export all agents and services
export {
  SupervisorAgent,
  ProducerAgent,
  ConsumerAgent,
  ExporterAgent,
  MarketAnalystAgent,
  LogisticsAgent,
  QualityAssuranceAgent
};

export default AgentService;