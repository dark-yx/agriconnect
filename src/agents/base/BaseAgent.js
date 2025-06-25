import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class BaseAgent {
  constructor(name, role, config = {}) {
    this.name = name;
    this.role = role;
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      ...config
    };
    this.llmProviders = this.initializeLLMProviders();
    this.currentProvider = 'openai'; // Default provider
  }

  initializeLLMProviders() {
    const providers = {};
    
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      providers.openai = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4",
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      providers.anthropic = new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: "claude-3-sonnet-20240229",
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }

    // Google
    if (process.env.GOOGLE_API_KEY) {
      providers.google = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "gemini-pro",
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }

    return providers;
  }

  selectOptimalLLM(taskType, complexity = 'medium') {
    // Dynamic LLM selection based on task requirements
    const taskProviderMap = {
      'analysis': { provider: 'anthropic', fallback: 'openai' },
      'generation': { provider: 'openai', fallback: 'google' },
      'reasoning': { provider: 'openai', fallback: 'anthropic' },
      'classification': { provider: 'google', fallback: 'openai' },
      'conversation': { provider: 'openai', fallback: 'anthropic' }
    };

    const preferred = taskProviderMap[taskType] || { provider: 'openai', fallback: 'anthropic' };
    
    // Check if preferred provider is available
    if (this.llmProviders[preferred.provider]) {
      this.currentProvider = preferred.provider;
      return this.llmProviders[preferred.provider];
    }
    
    // Fallback to secondary provider
    if (this.llmProviders[preferred.fallback]) {
      this.currentProvider = preferred.fallback;
      return this.llmProviders[preferred.fallback];
    }
    
    // Final fallback to any available provider
    const availableProviders = Object.keys(this.llmProviders);
    if (availableProviders.length > 0) {
      this.currentProvider = availableProviders[0];
      return this.llmProviders[availableProviders[0]];
    }
    
    throw new Error('No LLM providers available');
  }

  async processMessage(message, context = {}, taskType = 'conversation') {
    try {
      const llm = this.selectOptimalLLM(taskType);
      
      const systemPrompt = this.getSystemPrompt();
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(this.formatMessage(message, context))
      ];

      const response = await llm.invoke(messages);
      
      return {
        content: response.content,
        provider: this.currentProvider,
        agent: this.name,
        timestamp: new Date().toISOString(),
        context: context
      };
    } catch (error) {
      console.error(`Error in ${this.name} agent:`, error);
      throw error;
    }
  }

  getSystemPrompt() {
    return `You are ${this.name}, a specialized AI agent in the AgriConnect platform.
Your role: ${this.role}
You help users with agricultural marketplace operations.
Always be helpful, accurate, and professional.
Respond in a clear, actionable manner.`;
  }

  formatMessage(message, context) {
    let formattedMessage = message;
    
    if (context.user) {
      formattedMessage += `\n\nUser Context: ${context.user.role} - ${context.user.full_name}`;
    }
    
    if (context.product) {
      formattedMessage += `\n\nProduct Context: ${context.product.name} (${context.product.category})`;
    }
    
    if (context.transaction) {
      formattedMessage += `\n\nTransaction Context: ${context.transaction.status} - $${context.transaction.total_amount}`;
    }
    
    return formattedMessage;
  }

  createWorkflow() {
    // Base workflow - to be overridden by specific agents
    const workflow = new StateGraph({
      channels: {
        messages: [],
        context: {},
        result: null
      }
    });

    workflow.addNode("process", this.processNode.bind(this));
    workflow.addEdge("__start__", "process");
    workflow.addEdge("process", END);

    return workflow.compile();
  }

  async processNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    const response = await this.processMessage(lastMessage.content, context);
    
    return {
      ...state,
      result: response,
      messages: [...messages, { role: 'assistant', content: response.content }]
    };
  }

  async execute(input, context = {}) {
    const workflow = this.createWorkflow();
    
    const initialState = {
      messages: [{ role: 'user', content: input }],
      context: context,
      result: null
    };

    const result = await workflow.invoke(initialState);
    return result.result;
  }
}

export default BaseAgent;