import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatInterface from '../components/chat/ChatInterface';

const HomePage = () => {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Agents',
      description: 'Specialized AI agents for producers, consumers, exporters, and market analysis using advanced LangGraph technology.'
    },
    {
      icon: '🔗',
      title: 'Blockchain Transparency',
      description: 'Algorand-based smart contracts ensure transparent, traceable, and secure agricultural transactions.'
    },
    {
      icon: '📊',
      title: 'Market Intelligence',
      description: 'Real-time price forecasting, demand analysis, and competitive insights powered by advanced AI.'
    },
    {
      icon: '🚚',
      title: 'Smart Logistics',
      description: 'Automated route optimization, delivery tracking, and supply chain coordination.'
    },
    {
      icon: '🏆',
      title: 'Quality Assurance',
      description: 'Comprehensive quality control, certification management, and compliance monitoring.'
    },
    {
      icon: '💳',
      title: 'Secure Payments',
      description: 'Integrated Stripe payments with escrow services and automated transaction processing.'
    }
  ];

  const stats = [
    { label: 'Active Producers', value: '10,000+', icon: '🌾' },
    { label: 'Products Listed', value: '50,000+', icon: '📦' },
    { label: 'Successful Transactions', value: '$2M+', icon: '💰' },
    { label: 'Countries Served', value: '25+', icon: '🌍' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%2316a34a" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 mb-6">
              The Future of{' '}
              <span className="text-gradient">Agricultural Trade</span>
            </h1>
            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              AgriConnect revolutionizes global agriculture through AI-powered multi-agent technology, 
              blockchain transparency, and intelligent marketplace automation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {user ? (
                <Link to="/dashboard" className="btn-primary btn-lg">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary btn-lg">
                    Get Started Free
                  </Link>
                  <button
                    onClick={() => setShowChat(true)}
                    className="btn-secondary btn-lg"
                  >
                    Try AI Assistant
                  </button>
                </>
              )}
            </div>

            {/* Demo Video Placeholder */}
            <div className="relative max-w-4xl mx-auto">
              <div className="aspect-video bg-neutral-900 rounded-xl shadow-strong overflow-hidden">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium">Watch AgriConnect in Action</p>
                    <p className="text-neutral-300">See how our AI agents transform agricultural trade</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-neutral-900 mb-1">{stat.value}</div>
                <div className="text-neutral-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Powered by Advanced AI Technology
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Our multi-agent system leverages cutting-edge AI to automate and optimize 
              every aspect of agricultural trade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-medium transition-all duration-300">
                <div className="card-body">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              How AgriConnect Works
            </h2>
            <p className="text-xl text-neutral-600">
              Simple, intelligent, and automated agricultural trade
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🌾</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                1. List Your Products
              </h3>
              <p className="text-neutral-600">
                Producers use our AI assistant to easily list products with automatic 
                quality verification and market pricing suggestions.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                2. Smart Matching
              </h3>
              <p className="text-neutral-600">
                Our AI agents automatically match buyers with sellers based on 
                requirements, location, quality standards, and pricing.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                3. Automated Fulfillment
              </h3>
              <p className="text-neutral-600">
                Secure payments, smart contracts, optimized logistics, and 
                real-time tracking ensure smooth transaction completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Agricultural Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of producers, exporters, and consumers already using AgriConnect
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn bg-white text-primary-600 hover:bg-neutral-50 btn-lg">
                Access Your Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn bg-white text-primary-600 hover:bg-neutral-50 btn-lg">
                  Start Free Trial
                </Link>
                <button
                  onClick={() => setShowChat(true)}
                  className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 btn-lg"
                >
                  Talk to AI Assistant
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl h-[600px]">
            <ChatInterface
              agentType="supervisor"
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;