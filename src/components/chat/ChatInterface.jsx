import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AgentService from '../../agents/index.js';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatInterface = ({ agentType = 'supervisor', onClose }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentService] = useState(() => new AgentService());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage = {
      id: Date.now(),
      type: 'agent',
      content: getWelcomeMessage(agentType, profile?.role),
      timestamp: new Date().toISOString(),
      agent: agentType
    };
    setMessages([welcomeMessage]);
  }, [agentType, profile?.role]);

  const getWelcomeMessage = (agent, userRole) => {
    const welcomeMessages = {
      supervisor: `Hello! I'm your AI assistant for AgriConnect. I can help you with anything related to our agricultural marketplace. What would you like to do today?`,
      producer: `Welcome, ${userRole === 'producer' ? 'fellow producer' : 'valued user'}! I'm here to help you list products, manage inventory, track sales, and optimize your agricultural business. How can I assist you?`,
      consumer: `Hi there! I'm your shopping assistant for AgriConnect. I can help you find the perfect agricultural products, place orders, track deliveries, and discover new suppliers. What are you looking for today?`,
      exporter: `Greetings! I specialize in helping exporters find reliable suppliers, manage bulk orders, and coordinate international agricultural trade. How can I support your export business today?`,
      market_analyst: `Hello! I'm your market intelligence specialist. I can provide price forecasts, market trends, competitive analysis, and supply-demand insights to help you make informed decisions. What market information do you need?`,
      logistics: `Hi! I'm your logistics coordinator. I can help you track shipments, optimize delivery routes, coordinate deliveries, and manage carrier relationships. What logistics support do you need?`,
      quality_assurance: `Welcome! I'm your quality assurance specialist. I can help verify certifications, conduct quality inspections, manage standards, and resolve quality issues. How can I ensure quality for you today?`
    };

    return welcomeMessages[agent] || welcomeMessages.supervisor;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const context = {
        user: user,
        profile: profile,
        sessionId: `session_${Date.now()}`,
        agentType: agentType
      };

      let result;
      if (agentType === 'supervisor') {
        result = await agentService.processMessage(inputMessage.trim(), context);
      } else {
        result = await agentService.processDirectAgentMessage(agentType, inputMessage.trim(), context);
      }

      const agentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: result.response.content,
        timestamp: new Date().toISOString(),
        agent: result.response.agent || agentType,
        success: result.success,
        metadata: result.response
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: 'I apologize, but I encountered an error. Please try again or contact support.',
        timestamp: new Date().toISOString(),
        agent: 'system',
        success: false,
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/•/g, '&bull;');
  };

  const getAgentDisplayName = (agent) => {
    const names = {
      supervisor: 'AI Assistant',
      producer: 'Producer Agent',
      consumer: 'Consumer Agent',
      exporter: 'Exporter Agent',
      market_analyst: 'Market Analyst',
      logistics: 'Logistics Agent',
      quality_assurance: 'Quality Assurance'
    };
    return names[agent] || 'AI Agent';
  };

  const getAgentAvatar = (agent) => {
    const avatars = {
      supervisor: '🤖',
      producer: '🌾',
      consumer: '🛒',
      exporter: '🚢',
      market_analyst: '📊',
      logistics: '🚚',
      quality_assurance: '🏆'
    };
    return avatars[agent] || '🤖';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-soft border border-neutral-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
            {getAgentAvatar(agentType)}
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">
              {getAgentDisplayName(agentType)}
            </h3>
            <p className="text-sm text-neutral-600">
              {isLoading ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : message.error
                  ? 'bg-error-50 text-error-800 border border-error-200'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              {message.type === 'agent' && (
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs">
                    {getAgentAvatar(message.agent)}
                  </span>
                  <span className="text-xs font-medium opacity-75">
                    {getAgentDisplayName(message.agent)}
                  </span>
                </div>
              )}
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
              <div className="text-xs opacity-75 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 rounded-lg px-4 py-2">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows="1"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        <div className="mt-2 text-xs text-neutral-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;