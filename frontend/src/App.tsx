import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, BarChart3, Newspaper, Settings, Activity, Brain } from 'lucide-react';
import StockSearch from './components/StockSearch';
import StockChart from './components/StockChart';
import StockMetrics from './components/StockMetrics';
import ForecastChart from './components/ForecastChart';
import NewsSection from './components/NewsSection';
import LLMPrediction from './components/LLMPrediction';
import { StockData, ForecastData, NewsArticle } from './types';
import { getStockData, getForecast, getNews } from './services/api';

function App() {
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [newsData, setNewsData] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'forecast' | 'news' | 'llm'>('chart');
  const [forecastMethod, setForecastMethod] = useState<string>('enhanced_linear');
  const [forecastDays, setForecastDays] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [period, setPeriod] = useState<string>('1y');
  const [selectedNewsIndex, setSelectedNewsIndex] = useState<number | undefined>(undefined);

  // Handle news selection
  const handleNewsSelect = (index: number) => {
    setSelectedNewsIndex(selectedNewsIndex === index ? undefined : index);
  };

  // Forecast method descriptions
  const getForecastMethodInfo = (method: string) => {
    const methods = {
      linear: {
        name: "Linear Regression (Basic)",
        description: "Simple linear trend projection using time as the only feature.",
        pros: ["Fast and simple", "Easy to understand", "Good for short-term trends"],
        cons: ["Oversimplified", "Ignores market conditions", "Poor for volatile stocks"],
        icon: "📈",
        complexity: "Low"
      },
      enhanced_linear: {
        name: "Enhanced Linear (with indicators)",
        description: "Advanced linear regression incorporating 20+ technical indicators including RSI, MACD, volume, and price momentum.",
        pros: ["Considers market indicators", "More accurate than basic linear", "Handles complex patterns"],
        cons: ["More complex", "Requires more data", "Can overfit on short datasets"],
        icon: "🧠",
        complexity: "Medium"
      },
      polynomial: {
        name: "Polynomial Regression",
        description: "Curved trend analysis that can capture non-linear price movements and market cycles.",
        pros: ["Captures curves and cycles", "Better for volatile markets", "More realistic than linear"],
        cons: ["Can overfit", "May predict unrealistic extremes", "Sensitive to outliers"],
        icon: "📊",
        complexity: "Medium"
      },
      moving_average: {
        name: "Moving Average",
        description: "Simple average of recent prices, providing a stable baseline forecast.",
        pros: ["Very stable", "Smooth predictions", "Good for trending markets"],
        cons: ["Lags behind trends", "Ignores volatility", "Poor for mean-reverting stocks"],
        icon: "📉",
        complexity: "Low"
      },
      arima: {
        name: "ARIMA (Basic)",
        description: "Time series analysis that models autoregressive and moving average components.",
        pros: ["Handles time dependencies", "Good for stationary data", "Statistical foundation"],
        cons: ["Assumes stationarity", "Limited to linear relationships", "Requires parameter tuning"],
        icon: "📈",
        complexity: "Medium"
      },
      enhanced_arima: {
        name: "Enhanced ARIMA (with indicators)",
        description: "ARIMA with external regressors including technical indicators for improved accuracy.",
        pros: ["Includes market indicators", "Better than basic ARIMA", "Handles external factors"],
        cons: ["Complex parameter selection", "Can be unstable", "Requires large datasets"],
        icon: "🔬",
        complexity: "High"
      },
      prophet: {
        name: "Prophet",
        description: "Facebook's forecasting tool designed for business time series with seasonality and holidays.",
        pros: ["Handles seasonality", "Robust to missing data", "Good for long-term trends"],
        cons: ["Designed for business data", "May not fit financial markets", "Computationally expensive"],
        icon: "🔮",
        complexity: "Medium"
      },
      svr: {
        name: "Support Vector Regression",
        description: "Machine learning approach that finds optimal hyperplane for price prediction using kernel functions.",
        pros: ["Handles non-linear patterns", "Robust to outliers", "Good generalization"],
        cons: ["Requires parameter tuning", "Can be slow", "Black box approach"],
        icon: "⚡",
        complexity: "High"
      },
      ensemble: {
        name: "Ensemble (Combined Methods)",
        description: "Weighted combination of multiple forecasting methods for improved accuracy and stability.",
        pros: ["Most accurate overall", "Reduces individual method bias", "More stable predictions"],
        cons: ["Computationally expensive", "Complex to interpret", "May average out good signals"],
        icon: "🎯",
        complexity: "High"
      }
    };
    return methods[method as keyof typeof methods] || methods.enhanced_linear;
  };

  // 1. 极简的搜索处理：只负责更新股票代码，剩下的交给 useEffect
  const handleStockSelect = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  // 2. 核心修复：基础数据（股票图表 + 新闻）的独立拉取链路
  useEffect(() => {
    if (!selectedTicker) return;

    let isMounted = true; // 防止组件卸载或连续点击导致的内存泄漏和状态覆盖

    const fetchBaseData = async () => {
      setLoading(true);
      setError(null);
      try {
        const stock = await getStockData(selectedTicker, period);
        if (isMounted) setStockData(stock);

        const news = await getNews(selectedTicker, 5, period);
        if (isMounted) setNewsData(news);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to fetch base data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBaseData();
    return () => { isMounted = false; }; // 清理函数，掐断旧请求的更新权限
  }, [selectedTicker, period]);

  // 3. 核心修复：AI 预测数据的独立拉取链路（再也不会互相打架了）
  useEffect(() => {
    if (!selectedTicker) return;

    let isMounted = true;

    const fetchForecastData = async () => {
      // 每次切换预测方法或天数时，局部显示转圈动画，不影响全局
      setForecastData(null);
      try {
        const forecast = await getForecast(selectedTicker, period, forecastDays, forecastMethod);

        // 确保只有最新的请求能够更新状态
        if (isMounted && forecast) {
          setForecastData(forecast);
        }
      } catch (err) {
        console.error("Forecast fetch error:", err);
        // 如果预测接口真的挂了，在这里兜底，防止死循环转圈
        if (isMounted) {
          setError("Failed to generate forecast. The model might need more data.");
        }
      }
    };

    fetchForecastData();
    return () => { isMounted = false; };
  }, [selectedTicker, period, forecastDays, forecastMethod]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary-500 mr-3" />
              <h1 className="text-xl font-bold">Stock Analysis Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Settings className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Stock Search
              </h2>
              <StockSearch onStockSelect={handleStockSelect} />

              {selectedTicker && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Forecast Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Method</label>
                      <select
                        value={forecastMethod}
                        onChange={(e) => setForecastMethod(e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="linear">Linear Regression (Basic)</option>
                        <option value="enhanced_linear">Enhanced Linear (with indicators)</option>
                        <option value="polynomial">Polynomial Regression</option>
                        <option value="moving_average">Moving Average</option>
                        <option value="arima">ARIMA (Basic)</option>
                        <option value="enhanced_arima">Enhanced ARIMA (with indicators)</option>
                        <option value="prophet">Prophet</option>
                        <option value="svr">Support Vector Regression</option>
                        <option value="ensemble">Ensemble (Combined Methods)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Historical Period</label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        disabled={loading}
                        className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="1d">1 Day</option>
                        <option value="5d">5 Days</option>
                        <option value="1mo">1 Month</option>
                        <option value="3mo">3 Months</option>
                        <option value="6mo">6 Months</option>
                        <option value="1y">1 Year</option>
                        <option value="2y">2 Years</option>
                        <option value="5y">5 Years</option>
                        <option value="10y">10 Years</option>
                        <option value="ytd">Year to Date</option>
                        <option value="max">Maximum Available</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        More historical data generally improves forecast accuracy
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Forecast Days</label>
                      <input
                        type="number"
                        value={forecastDays}
                        onChange={(e) => setForecastDays(Number(e.target.value))}
                        min="7"
                        max="365"
                        className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Forecast Method Info */}
                  <div className="mt-4 p-4 bg-dark-700 rounded-lg border border-dark-600 transition-all duration-300 hover:border-primary-500/50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-300">Method Details</h4>
                      <span className="text-xs text-gray-500">ℹ️</span>
                    </div>
                    <div className="space-y-3" key={forecastMethod}>
                      <div>
                        {/* 🌟 修复一：标题和 Complexity 标签重叠问题 */}
                        <div className="flex flex-col space-y-2 mb-2 items-start">
                          <h5 className="text-sm font-semibold text-primary-400 flex items-center leading-tight">
                            <span className="mr-2 text-lg">{getForecastMethodInfo(forecastMethod).icon}</span>
                            {getForecastMethodInfo(forecastMethod).name}
                          </h5>
                          <span className={`text-xs px-2 py-1 rounded-full w-max ${
                            getForecastMethodInfo(forecastMethod).complexity === 'Low'
                              ? 'bg-green-900/30 text-green-400'
                              : getForecastMethodInfo(forecastMethod).complexity === 'Medium'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {getForecastMethodInfo(forecastMethod).complexity} Complexity
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {getForecastMethodInfo(forecastMethod).description}
                        </p>
                      </div>

                      {/* 🌟 修复二：优点和缺点强行两列导致的换行灾难，改为上下排列 */}
                      <div className="flex flex-col space-y-4 mt-3">
                        <div>
                          <h6 className="text-xs font-medium text-green-400 mb-1">✓ Advantages</h6>
                          <ul className="text-xs text-gray-400 space-y-1">
                            {getForecastMethodInfo(forecastMethod).pros.map((pro, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-400 mr-1">•</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h6 className="text-xs font-medium text-red-400 mb-1">⚠️ Limitations</h6>
                          <ul className="text-xs text-gray-400 space-y-1">
                            {getForecastMethodInfo(forecastMethod).cons.map((con, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-red-400 mr-1">•</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span className="ml-2">Loading...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {stockData && (
              <>
                {/* Stock Info */}
                <div className="bg-dark-800 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{stockData.ticker}</h2>
                      {stockData.info?.longName && (
                        <p className="text-gray-400">{stockData.info.longName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">
                        {stockData.metrics?.current_price ? (
                          stockData.info?.currency === 'GBp'
                            ? `£${(stockData.metrics.current_price / 100).toFixed(2)}`
                            : stockData.info?.currency === 'GBP'
                            ? `£${stockData.metrics.current_price.toFixed(2)}`
                            : stockData.info?.currency === 'EUR'
                            ? `€${stockData.metrics.current_price.toFixed(2)}`
                            : stockData.info?.currency === 'JPY'
                            ? `¥${stockData.metrics.current_price.toFixed(0)}`
                            : `$${stockData.metrics.current_price.toFixed(2)}`
                        ) : (
                          'Loading...'
                        )}
                      </div>
                      <div className={`text-sm ${stockData.metrics?.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stockData.metrics?.percent_change !== undefined ? (
                          `${stockData.metrics.percent_change >= 0 ? '+' : ''}${stockData.metrics.percent_change.toFixed(2)}%`
                        ) : (
                          'Loading...'
                        )}
                      </div>
                    </div>
                  </div>

                  <StockMetrics metrics={stockData.metrics} currency={stockData.info?.currency} />

                  {/* Market Information Panel */}
                  <div className="mt-4 p-4 bg-dark-700 rounded-lg border border-dark-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300 flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Market Information
                      </h4>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          stockData.market_status?.toLowerCase() === 'open'
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-red-400'
                        }`}></div>
                        <span className="text-xs text-gray-400">
                          {stockData.market_status?.toLowerCase() === 'open' ? 'Market Open' : 'Market Closed'}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {currentTime.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Exchange & Currency */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Exchange</span>
                          <span className="text-xs font-medium text-white">{stockData.exchange}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Currency</span>
                          <span className="text-xs font-medium text-white">
                            {stockData.info?.currency === 'GBp' ? 'GBP' : stockData.info?.currency || 'USD'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Market Hours</span>
                          <span className="text-xs font-medium text-white">
                            {stockData.exchange === 'NASDAQ' || stockData.exchange === 'NYSE'
                              ? '9:30 AM - 4:00 PM ET'
                              : stockData.exchange === 'LSE'
                              ? '8:00 AM - 4:30 PM GMT'
                              : stockData.exchange === 'EPA' || stockData.exchange === 'XETRA' || stockData.exchange === 'FWB'
                              ? '9:00 AM - 5:30 PM CET'
                              : stockData.exchange === 'TSE'
                              ? '9:00 AM - 3:00 PM JST'
                              : stockData.exchange === 'HKEX'
                              ? '9:30 AM - 4:00 PM HKT'
                              : stockData.exchange === 'TSX'
                              ? '9:30 AM - 4:00 PM EST'
                              : '24/7'}
                          </span>
                        </div>
                      </div>

                      {/* Data Status */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Data Source</span>
                          <span className="text-xs font-medium text-green-400">Yahoo Finance</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Last Updated</span>
                          <span className="text-xs font-medium text-white">
                            {new Date(stockData.data_timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {/* Cache Status */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Cache Status</span>
                          <span className="text-xs font-medium text-blue-400">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Data Age</span>
                          <span className={`text-xs font-medium ${
                            Math.round((Date.now() - new Date(stockData.data_timestamp).getTime()) / 1000 / 60) < 5
                              ? 'text-green-400'
                              : Math.round((Date.now() - new Date(stockData.data_timestamp).getTime()) / 1000 / 60) < 15
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}>
                            {Math.round((Date.now() - new Date(stockData.data_timestamp).getTime()) / 1000 / 60)}m ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Chart Tabs */}
                <div className="bg-dark-800 rounded-lg mb-6">
                  <div className="border-b border-dark-700">
                    <nav className="flex space-x-8 px-6">
                      <button
                        onClick={() => setActiveTab('chart')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'chart'
                            ? 'border-primary-500 text-primary-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <BarChart3 className="h-5 w-5 inline mr-2" />
                        Price Chart
                      </button>
                      <button
                        onClick={() => setActiveTab('forecast')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'forecast'
                            ? 'border-primary-500 text-primary-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <TrendingUp className="h-5 w-5 inline mr-2" />
                        Forecast
                      </button>
                      <button
                        onClick={() => setActiveTab('news')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'news'
                            ? 'border-primary-500 text-primary-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <Newspaper className="h-5 w-5 inline mr-2" />
                        News
                      </button>
                      <button
                        onClick={() => setActiveTab('llm')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'llm'
                            ? 'border-primary-500 text-primary-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <Brain className="h-5 w-5 inline mr-2" />
                        AI Prediction
                      </button>
                    </nav>
                  </div>

                  <div className="p-6">
                    {activeTab === 'chart' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Price Chart</h3>
                            {/* 🌟 修复三：解决 <p> 不能嵌套 <div> 的 HTML 规则冲突，防止黑屏报错 */}
                            <div className="text-sm text-gray-400">
                              {loading ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-500 mr-2"></div>
                                  Loading data...
                                </span>
                              ) : (
                                <>
                                  Showing {Array.isArray(stockData?.data) ? stockData.data.length : 0} data points
                                  {period === '1d' && ' (1 day)'}
                                  {period === '5d' && ' (5 days)'}
                                  {period === '1mo' && ' (1 month)'}
                                  {period === '3mo' && ' (3 months)'}
                                  {period === '6mo' && ' (6 months)'}
                                  {period === '1y' && ' (1 year)'}
                                  {period === '2y' && ' (2 years)'}
                                  {period === '5y' && ' (5 years)'}
                                  {period === '10y' && ' (10 years)'}
                                  {period === 'ytd' && ' (year to date)'}
                                  {period === 'max' && ' (maximum available)'}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-400">Period:</label>
                            <select
                              value={period}
                              onChange={(e) => setPeriod(e.target.value)}
                              disabled={loading}
                              className="bg-dark-700 border border-dark-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="1d">1 Day</option>
                              <option value="5d">5 Days</option>
                              <option value="1mo">1 Month</option>
                              <option value="3mo">3 Months</option>
                              <option value="6mo">6 Months</option>
                              <option value="1y">1 Year</option>
                              <option value="2y">2 Years</option>
                              <option value="5y">5 Years</option>
                              <option value="10y">10 Years</option>
                              <option value="ytd">Year to Date</option>
                              <option value="max">Maximum Available</option>
                            </select>
                          </div>
                        </div>
                        {stockData?.data ? (
                          <StockChart
                            data={stockData.data}
                            currency={stockData.info?.currency === 'GBp' ? 'GBP' : stockData.info?.currency || 'USD'}
                            newsData={newsData}
                            selectedNewsIndex={selectedNewsIndex}
                            onNewsSelect={handleNewsSelect}
                          />
                        ) : (
                          <div className="h-96 flex items-center justify-center bg-dark-700 rounded-lg">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                              <p className="text-gray-400">Loading chart data...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'forecast' && (
                      <>
                        {forecastData && stockData?.data ? (
                          <ForecastChart
                              historicalData={stockData.data as any}
                              forecastData={forecastData as any}
                              method={forecastMethod}
                              currency={stockData.info?.currency === 'GBp' ? 'GBP' : stockData.info?.currency || 'USD'}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <p className="text-gray-400">Loading forecast data...</p>
                          </div>
                        )}
                      </>
                    )}
                    {activeTab === 'news' && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <Newspaper className="h-5 w-5 mr-2" />
                          Latest News
                        </h3>
                        <NewsSection articles={newsData} />
                      </div>
                    )}
                    {activeTab === 'llm' && (
                      <div>
                        <LLMPrediction ticker={selectedTicker} period={period} />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!selectedTicker && !loading && (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Welcome to Stock Analysis</h3>
                <p className="text-gray-500">Search for a stock ticker to get started with analysis and forecasting.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
