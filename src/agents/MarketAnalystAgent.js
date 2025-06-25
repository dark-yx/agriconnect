import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import DatabaseService from '../config/database.js';

export class MarketAnalystAgent extends BaseAgent {
  constructor() {
    super('Market Analyst', 'Provide market insights, price forecasting, and trend analysis');
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
    workflow.addNode("price_forecast", this.priceForecastNode.bind(this));
    workflow.addNode("market_trends", this.marketTrendsNode.bind(this));
    workflow.addNode("competitive_analysis", this.competitiveAnalysisNode.bind(this));
    workflow.addNode("demand_analysis", this.demandAnalysisNode.bind(this));

    workflow.addEdge("__start__", "analyze_request");
    
    workflow.addConditionalEdges(
      "analyze_request",
      this.routeAction.bind(this),
      {
        "price_forecast": "price_forecast",
        "market_trends": "market_trends",
        "competitive_analysis": "competitive_analysis",
        "demand_analysis": "demand_analysis"
      }
    );

    workflow.addEdge("price_forecast", END);
    workflow.addEdge("market_trends", END);
    workflow.addEdge("competitive_analysis", END);
    workflow.addEdge("demand_analysis", END);

    return workflow.compile();
  }

  async analyzeRequestNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('classification');
    
    const analysisPrompt = `
Analyze this market analysis request and determine the action needed:

Available actions:
- price_forecast: Predict future price trends
- market_trends: Analyze current market conditions
- competitive_analysis: Compare market competition
- demand_analysis: Analyze supply and demand patterns

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
        action: 'market_trends' // Default action
      };
    }
  }

  routeAction(state) {
    return state.action || 'market_trends';
  }

  async priceForecastNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('analysis');
    
    const extractionPrompt = `
Extract product category for price forecasting:

Message: "${lastMessage.content}"

Extract the product category or type. Respond with just the category name.
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const category = response.content.trim();
      
      // Get historical market data
      const marketData = await DatabaseService.getMarketData(category, 90);
      
      // Get current products in category
      const products = await DatabaseService.getProducts({ category: category });
      
      if (products.length === 0) {
        return {
          ...state,
          result: {
            content: `I don't have enough data for ${category} to provide accurate price forecasts. Please try a different product category.`,
            success: false
          }
        };
      }

      // Calculate current market statistics
      const currentPrices = products.map(p => p.price_per_unit);
      const avgPrice = currentPrices.reduce((sum, price) => sum + price, 0) / currentPrices.length;
      const minPrice = Math.min(...currentPrices);
      const maxPrice = Math.max(...currentPrices);
      
      // Simple trend analysis (in a real system, this would use ML models)
      const priceVariation = (maxPrice - minPrice) / avgPrice * 100;
      const trend = this.calculatePriceTrend(marketData, currentPrices);
      
      // Generate forecast
      const forecast = this.generatePriceForecast(avgPrice, trend, priceVariation);
      
      const forecastText = `📈 **Price Forecast for ${category}**\n\n` +
                          `**Current Market:**\n` +
                          `• Average Price: $${avgPrice.toFixed(2)}\n` +
                          `• Price Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}\n` +
                          `• Market Volatility: ${priceVariation.toFixed(1)}%\n\n` +
                          `**30-Day Forecast:**\n` +
                          `• Expected Price: $${forecast.expectedPrice.toFixed(2)}\n` +
                          `• Trend: ${forecast.trend}\n` +
                          `• Confidence: ${forecast.confidence}%\n` +
                          `• Price Range: $${forecast.minPrice.toFixed(2)} - $${forecast.maxPrice.toFixed(2)}\n\n` +
                          `**Key Factors:**\n${forecast.factors.join('\n')}\n\n` +
                          `**Recommendation:** ${forecast.recommendation}`;

      return {
        ...state,
        result: {
          content: forecastText,
          success: true,
          forecast: forecast
        }
      };
    } catch (error) {
      console.error('Price forecast error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't generate a price forecast. Please try again with a specific product category.",
          success: false
        }
      };
    }
  }

  calculatePriceTrend(marketData, currentPrices) {
    if (marketData.length < 2) return 'stable';
    
    const recentData = marketData.slice(-30); // Last 30 days
    if (recentData.length < 2) return 'stable';
    
    const oldAvg = recentData.slice(0, Math.floor(recentData.length / 2))
      .reduce((sum, d) => sum + d.price, 0) / Math.floor(recentData.length / 2);
    const newAvg = recentData.slice(Math.floor(recentData.length / 2))
      .reduce((sum, d) => sum + d.price, 0) / Math.ceil(recentData.length / 2);
    
    const change = (newAvg - oldAvg) / oldAvg * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  generatePriceForecast(avgPrice, trend, volatility) {
    let expectedPrice = avgPrice;
    let confidence = 75;
    
    // Adjust based on trend
    if (trend === 'increasing') {
      expectedPrice *= 1.05; // 5% increase
      confidence = 70;
    } else if (trend === 'decreasing') {
      expectedPrice *= 0.95; // 5% decrease
      confidence = 70;
    }
    
    // Adjust confidence based on volatility
    if (volatility > 20) confidence -= 15;
    if (volatility < 10) confidence += 10;
    
    const priceRange = expectedPrice * (volatility / 100);
    
    return {
      expectedPrice,
      trend: trend === 'increasing' ? 'Upward' : trend === 'decreasing' ? 'Downward' : 'Stable',
      confidence: Math.max(50, Math.min(95, confidence)),
      minPrice: expectedPrice - priceRange,
      maxPrice: expectedPrice + priceRange,
      factors: [
        '• Seasonal demand patterns',
        '• Current supply levels',
        '• Market competition',
        '• Economic conditions'
      ],
      recommendation: trend === 'increasing' ? 
        'Consider buying soon before prices rise further.' :
        trend === 'decreasing' ?
        'Wait for prices to stabilize before making large purchases.' :
        'Prices are stable - good time for regular purchasing.'
    };
  }

  async marketTrendsNode(state) {
    try {
      // Get all products for market overview
      const products = await DatabaseService.getProducts({});
      
      // Analyze by category
      const categoryStats = {};
      products.forEach(product => {
        if (!categoryStats[product.category]) {
          categoryStats[product.category] = {
            count: 0,
            totalQuantity: 0,
            avgPrice: 0,
            prices: []
          };
        }
        categoryStats[product.category].count++;
        categoryStats[product.category].totalQuantity += product.available_quantity;
        categoryStats[product.category].prices.push(product.price_per_unit);
      });

      // Calculate averages
      Object.keys(categoryStats).forEach(category => {
        const stats = categoryStats[category];
        stats.avgPrice = stats.prices.reduce((sum, p) => sum + p, 0) / stats.prices.length;
        stats.priceRange = {
          min: Math.min(...stats.prices),
          max: Math.max(...stats.prices)
        };
      });

      // Sort categories by activity
      const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5);

      const trendsText = `📊 **Current Market Trends**\n\n` +
                        `**Market Overview:**\n` +
                        `• Total Products Listed: ${products.length}\n` +
                        `• Active Categories: ${Object.keys(categoryStats).length}\n` +
                        `• Total Available Quantity: ${products.reduce((sum, p) => sum + p.available_quantity, 0).toLocaleString()} units\n\n` +
                        `**Top Categories:**\n` +
                        sortedCategories.map(([category, stats]) => 
                          `• **${category}**: ${stats.count} products, Avg: $${stats.avgPrice.toFixed(2)}, Range: $${stats.priceRange.min.toFixed(2)}-$${stats.priceRange.max.toFixed(2)}`
                        ).join('\n') +
                        `\n\n**Market Insights:**\n` +
                        `• Most active category: ${sortedCategories[0]?.[0] || 'N/A'}\n` +
                        `• Price volatility is ${this.assessVolatility(categoryStats)}\n` +
                        `• Supply levels appear ${this.assessSupply(products)}\n` +
                        `• Market activity is ${this.assessActivity(products)}`;

      return {
        ...state,
        result: {
          content: trendsText,
          success: true,
          trends: categoryStats
        }
      };
    } catch (error) {
      console.error('Market trends error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't analyze current market trends. Please try again.",
          success: false
        }
      };
    }
  }

  assessVolatility(categoryStats) {
    const volatilities = Object.values(categoryStats).map(stats => {
      if (stats.prices.length < 2) return 0;
      const range = stats.priceRange.max - stats.priceRange.min;
      return (range / stats.avgPrice) * 100;
    });
    
    const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    
    if (avgVolatility > 30) return 'high';
    if (avgVolatility > 15) return 'moderate';
    return 'low';
  }

  assessSupply(products) {
    const totalSupply = products.reduce((sum, p) => sum + p.available_quantity, 0);
    const avgSupply = totalSupply / products.length;
    
    if (avgSupply > 1000) return 'abundant';
    if (avgSupply > 100) return 'adequate';
    return 'limited';
  }

  assessActivity(products) {
    const recentProducts = products.filter(p => {
      const createdDate = new Date(p.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    });
    
    const activityRate = (recentProducts.length / products.length) * 100;
    
    if (activityRate > 20) return 'high';
    if (activityRate > 10) return 'moderate';
    return 'low';
  }

  async competitiveAnalysisNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const llm = this.selectOptimalLLM('analysis');
      
      const extractionPrompt = `
Extract product category for competitive analysis:

Message: "${lastMessage.content}"

Extract the product category. Respond with just the category name.
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const category = response.content.trim();
      
      const products = await DatabaseService.getProducts({ category: category });
      
      if (products.length === 0) {
        return {
          ...state,
          result: {
            content: `No products found in the ${category} category for competitive analysis.`,
            success: false
          }
        };
      }

      // Group by producer for competitive analysis
      const producerStats = {};
      products.forEach(product => {
        const producerId = product.producer.id;
        if (!producerStats[producerId]) {
          producerStats[producerId] = {
            producer: product.producer,
            products: [],
            totalQuantity: 0,
            avgPrice: 0,
            marketShare: 0
          };
        }
        producerStats[producerId].products.push(product);
        producerStats[producerId].totalQuantity += product.available_quantity;
      });

      // Calculate market share and averages
      const totalMarketQuantity = Object.values(producerStats)
        .reduce((sum, stats) => sum + stats.totalQuantity, 0);

      Object.values(producerStats).forEach(stats => {
        stats.avgPrice = stats.products.reduce((sum, p) => sum + p.price_per_unit, 0) / stats.products.length;
        stats.marketShare = (stats.totalQuantity / totalMarketQuantity) * 100;
      });

      // Sort by market share
      const topCompetitors = Object.values(producerStats)
        .sort((a, b) => b.marketShare - a.marketShare)
        .slice(0, 5);

      const competitiveText = `🏆 **Competitive Analysis: ${category}**\n\n` +
                             `**Market Leaders:**\n` +
                             topCompetitors.map((competitor, index) => 
                               `${index + 1}. **${competitor.producer.company_name || competitor.producer.full_name}**\n` +
                               `   • Market Share: ${competitor.marketShare.toFixed(1)}%\n` +
                               `   • Products: ${competitor.products.length}\n` +
                               `   • Avg Price: $${competitor.avgPrice.toFixed(2)}\n` +
                               `   • Total Supply: ${competitor.totalQuantity} units\n`
                             ).join('\n') +
                             `\n**Market Insights:**\n` +
                             `• Market concentration: ${this.assessMarketConcentration(topCompetitors)}\n` +
                             `• Price competition: ${this.assessPriceCompetition(topCompetitors)}\n` +
                             `• Entry barriers: ${this.assessEntryBarriers(products.length, totalMarketQuantity)}`;

      return {
        ...state,
        result: {
          content: competitiveText,
          success: true,
          competitors: topCompetitors
        }
      };
    } catch (error) {
      console.error('Competitive analysis error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't perform competitive analysis. Please specify a product category.",
          success: false
        }
      };
    }
  }

  assessMarketConcentration(competitors) {
    if (competitors.length === 0) return 'unknown';
    
    const topThreeShare = competitors.slice(0, 3)
      .reduce((sum, c) => sum + c.marketShare, 0);
    
    if (topThreeShare > 75) return 'highly concentrated';
    if (topThreeShare > 50) return 'moderately concentrated';
    return 'fragmented';
  }

  assessPriceCompetition(competitors) {
    if (competitors.length < 2) return 'limited';
    
    const prices = competitors.map(c => c.avgPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceSpread = (maxPrice - minPrice) / minPrice * 100;
    
    if (priceSpread > 30) return 'intense';
    if (priceSpread > 15) return 'moderate';
    return 'limited';
  }

  assessEntryBarriers(productCount, totalQuantity) {
    const avgQuantityPerProduct = totalQuantity / productCount;
    
    if (avgQuantityPerProduct > 1000) return 'high (large scale required)';
    if (avgQuantityPerProduct > 100) return 'moderate';
    return 'low (easy entry)';
  }

  async demandAnalysisNode(state) {
    try {
      // Get transaction data for demand analysis
      const { data: transactions, error } = await DatabaseService.client
        .from('transactions')
        .select(`
          *,
          product:products(category, name)
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Analyze demand by category
      const demandByCategory = {};
      transactions.forEach(transaction => {
        const category = transaction.product.category;
        if (!demandByCategory[category]) {
          demandByCategory[category] = {
            orders: 0,
            totalQuantity: 0,
            totalValue: 0
          };
        }
        demandByCategory[category].orders++;
        demandByCategory[category].totalQuantity += transaction.quantity;
        demandByCategory[category].totalValue += parseFloat(transaction.total_amount);
      });

      // Sort by demand
      const demandRanking = Object.entries(demandByCategory)
        .sort(([,a], [,b]) => b.totalValue - a.totalValue)
        .slice(0, 5);

      const demandText = `📈 **Demand Analysis (Last 30 Days)**\n\n` +
                        `**Total Market Activity:**\n` +
                        `• Total Orders: ${transactions.length}\n` +
                        `• Total Value: $${transactions.reduce((sum, t) => sum + parseFloat(t.total_amount), 0).toFixed(2)}\n` +
                        `• Active Categories: ${Object.keys(demandByCategory).length}\n\n` +
                        `**Top Demand Categories:**\n` +
                        demandRanking.map(([category, stats], index) => 
                          `${index + 1}. **${category}**\n` +
                          `   • Orders: ${stats.orders}\n` +
                          `   • Volume: ${stats.totalQuantity} units\n` +
                          `   • Value: $${stats.totalValue.toFixed(2)}\n`
                        ).join('\n') +
                        `\n**Demand Insights:**\n` +
                        `• Market momentum: ${this.assessMarketMomentum(transactions)}\n` +
                        `• Seasonal patterns: ${this.assessSeasonality()}\n` +
                        `• Growth opportunities: ${demandRanking[0]?.[0] || 'Various categories'}`;

      return {
        ...state,
        result: {
          content: demandText,
          success: true,
          demand: demandByCategory
        }
      };
    } catch (error) {
      console.error('Demand analysis error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't analyze demand patterns. Please try again.",
          success: false
        }
      };
    }
  }

  assessMarketMomentum(transactions) {
    if (transactions.length === 0) return 'stagnant';
    
    const recentWeek = transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return transactionDate > weekAgo;
    });
    
    const weeklyRate = recentWeek.length / 7;
    const monthlyRate = transactions.length / 30;
    
    if (weeklyRate > monthlyRate * 1.2) return 'accelerating';
    if (weeklyRate < monthlyRate * 0.8) return 'slowing';
    return 'steady';
  }

  assessSeasonality() {
    const currentMonth = new Date().getMonth();
    const seasonalPatterns = {
      'spring': [2, 3, 4], // March, April, May
      'summer': [5, 6, 7], // June, July, August
      'fall': [8, 9, 10],  // September, October, November
      'winter': [11, 0, 1] // December, January, February
    };
    
    for (const [season, months] of Object.entries(seasonalPatterns)) {
      if (months.includes(currentMonth)) {
        return `${season} patterns expected`;
      }
    }
    
    return 'analyzing patterns';
  }

  getSystemPrompt() {
    return `You are the Market Analyst Agent in AgriConnect, specialized in providing market intelligence and analysis.

Your capabilities:
1. Generate price forecasts using historical data and trends
2. Analyze current market conditions and trends
3. Perform competitive analysis and market positioning
4. Analyze supply and demand patterns
5. Provide actionable market insights and recommendations
6. Track market volatility and risk factors

Always provide data-driven insights with clear explanations and actionable recommendations.
Help users make informed decisions based on market intelligence.`;
  }
}

export default MarketAnalystAgent;