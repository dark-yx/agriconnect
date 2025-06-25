import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import ChatInterface from '../components/chat/ChatInterface';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DashboardPage = () => {
  const { profile } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [showChat, setShowChat] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('supervisor');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      try {
        // In a real app, this would fetch from API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          totalProducts: 12,
          activeListings: 8,
          totalSales: 2450.00,
          pendingOrders: 3,
          completedTransactions: 15,
          reputation: 4.8
        });
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${greeting}, ${profile?.full_name || 'there'}!`;
  };

  const getRoleSpecificActions = () => {
    const actions = {
      producer: [
        { icon: '🌾', title: 'List New Product', description: 'Add products to your inventory', agent: 'producer' },
        { icon: '📊', title: 'View Analytics', description: 'Check your sales performance', agent: 'market_analyst' },
        { icon: '📦', title: 'Manage Orders', description: 'Handle incoming orders', agent: 'producer' },
        { icon: '🏆', title: 'Quality Control', description: 'Manage certifications', agent: 'quality_assurance' }
      ],
      consumer: [
        { icon: '🔍', title: 'Find Products', description: 'Search for agricultural products', agent: 'consumer' },
        { icon: '🛒', title: 'Place Order', description: 'Buy products from producers', agent: 'consumer' },
        { icon: '🚚', title: 'Track Delivery', description: 'Monitor your shipments', agent: 'logistics' },
        { icon: '⭐', title: 'Rate Products', description: 'Leave reviews and ratings', agent: 'consumer' }
      ],
      exporter: [
        { icon: '🏭', title: 'Find Suppliers', description: 'Discover reliable producers', agent: 'exporter' },
        { icon: '📋', title: 'Bulk Orders', description: 'Place large quantity orders', agent: 'exporter' },
        { icon: '📈', title: 'Market Analysis', description: 'Get market insights', agent: 'market_analyst' },
        { icon: '🚢', title: 'Logistics', description: 'Coordinate shipping', agent: 'logistics' }
      ]
    };

    return actions[profile?.role] || actions.consumer;
  };

  const getQuickStats = () => {
    if (!stats) return [];

    const statsByRole = {
      producer: [
        { label: 'Active Listings', value: stats.activeListings, icon: '🌾', color: 'text-primary-600' },
        { label: 'Total Sales', value: `$${stats.totalSales}`, icon: '💰', color: 'text-success-600' },
        { label: 'Pending Orders', value: stats.pendingOrders, icon: '📦', color: 'text-warning-600' },
        { label: 'Reputation', value: `${stats.reputation}/5`, icon: '⭐', color: 'text-accent-600' }
      ],
      consumer: [
        { label: 'Orders Placed', value: stats.completedTransactions, icon: '🛒', color: 'text-primary-600' },
        { label: 'Total Spent', value: `$${stats.totalSales}`, icon: '💳', color: 'text-success-600' },
        { label: 'Active Orders', value: stats.pendingOrders, icon: '📦', color: 'text-warning-600' },
        { label: 'Saved Products', value: 8, icon: '❤️', color: 'text-error-600' }
      ],
      exporter: [
        { label: 'Suppliers', value: 15, icon: '🏭', color: 'text-primary-600' },
        { label: 'Export Volume', value: `${stats.totalSales}T`, icon: '📊', color: 'text-success-600' },
        { label: 'Active Contracts', value: stats.pendingOrders, icon: '📋', color: 'text-warning-600' },
        { label: 'Countries', value: 8, icon: '🌍', color: 'text-accent-600' }
      ]
    };

    return statsByRole[profile?.role] || statsByRole.consumer;
  };

  const recentNotifications = notifications.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            {getWelcomeMessage()}
          </h1>
          <p className="text-neutral-600">
            Welcome to your AgriConnect dashboard. Here's what's happening with your {profile?.role} account.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getQuickStats().map((stat, index) => (
            <div key={index} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className="text-3xl">{stat.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-neutral-900">Quick Actions</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getRoleSpecificActions().map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedAgent(action.agent);
                        setShowChat(true);
                      }}
                      className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 text-left"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{action.icon}</div>
                        <div>
                          <h3 className="font-medium text-neutral-900">{action.title}</h3>
                          <p className="text-sm text-neutral-600">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="card mt-6">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-neutral-900">AI Assistant</h2>
              </div>
              <div className="card-body">
                <p className="text-neutral-600 mb-4">
                  Get help with anything related to your agricultural business. Our AI agents are here to assist you.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'General Assistant', agent: 'supervisor', icon: '🤖' },
                    { name: 'Market Insights', agent: 'market_analyst', icon: '📊' },
                    { name: 'Logistics Help', agent: 'logistics', icon: '🚚' },
                    { name: 'Quality Support', agent: 'quality_assurance', icon: '🏆' }
                  ].map((assistant) => (
                    <button
                      key={assistant.agent}
                      onClick={() => {
                        setSelectedAgent(assistant.agent);
                        setShowChat(true);
                      }}
                      className="btn-secondary btn-sm"
                    >
                      {assistant.icon} {assistant.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications & Activity */}
          <div className="space-y-6">
            {/* Recent Notifications */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-neutral-900">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="badge badge-error">{unreadCount}</span>
                  )}
                </div>
              </div>
              <div className="card-body">
                {recentNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {recentNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          notification.is_read 
                            ? 'border-neutral-200 bg-neutral-50' 
                            : 'border-primary-200 bg-primary-50'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className="text-sm">
                            {notification.type === 'success' && '✅'}
                            {notification.type === 'warning' && '⚠️'}
                            {notification.type === 'error' && '❌'}
                            {notification.type === 'info' && 'ℹ️'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-neutral-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-neutral-600">
                              {notification.message}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-center py-4">
                    No notifications yet
                  </p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-neutral-900">Recent Activity</h2>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">Product listed:</span> Organic Tomatoes
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">Order received:</span> 50kg Wheat
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">Payment pending:</span> Order #1234
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl h-[600px]">
            <ChatInterface
              agentType={selectedAgent}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;