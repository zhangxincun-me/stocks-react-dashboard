import axios from 'axios';
import { StockData, ForecastData, NewsArticle, SearchResult } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Create a separate instance for LLM operations with longer timeout
const llmApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for LLM operations
});

export const searchStock = async (query: string): Promise<SearchResult> => {
  try {
    const response = await api.post('/api/search', { query });
    return response.data;
  } catch (error) {
    console.error('Error searching stock:', error);
    throw new Error('Failed to search for stock');
  }
};

export const getStockData = async (ticker: string, period: string = '1y'): Promise<StockData> => {
  try {
    console.log(`Fetching stock data for ${ticker} with period ${period}`);
    const response = await api.post('/api/stock-data', { ticker, period });
    console.log('Stock data response received:', response.status);
    
    // Transform the API response to match the expected frontend format
    const apiData = response.data;
    
    // Extract dates, open, high, low, close, volume arrays from the data
    const dates = apiData.data.map((item: any) => item.date);
    const open = apiData.data.map((item: any) => item.open);
    const high = apiData.data.map((item: any) => item.high);
    const low = apiData.data.map((item: any) => item.low);
    const close = apiData.data.map((item: any) => item.close);
    const volume = apiData.data.map((item: any) => item.volume);
    
    // Map backend exchange codes to frontend display names
    const getExchangeDisplayName = (exchange: string) => {
      const exchangeMap: { [key: string]: string } = {
        'US': 'NASDAQ',
        'UK': 'LSE',
        'JP': 'TSE',
        'EU': 'EPA'
      };
      return exchangeMap[exchange] || exchange;
    };

    const transformedData: StockData = {
      ticker: apiData.ticker,
      data: {
        dates,
        open,
        high,
        low,
        close,
        volume
      },
      info: {
        longName: apiData.name,
        currency: apiData.currency,
        exchange: getExchangeDisplayName(apiData.exchange),
        sector: apiData.sector,
        industry: apiData.industry
      },
      metrics: {
        current_price: apiData.currentPrice,
        price_change: apiData.change,
        percent_change: apiData.changePercent,
        high_52w: apiData.high_52w,
        low_52w: apiData.low_52w,
        volume: apiData.volume
      },
      market_status: apiData.marketState,
      exchange: getExchangeDisplayName(apiData.exchange),
      data_timestamp: apiData.data_timestamp || new Date().toISOString()
    };
    
    console.log('Transformed stock data:', transformedData);
    return transformedData;
  } catch (error: any) {
    console.error('Error fetching stock data:', error);
    if (error.response) {
      // Server responded with error status
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      throw new Error(`Server error: ${error.response.status} - ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
      throw new Error('No response from server - please check if the backend is running on port 8000');
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

export const getForecast = async (
  ticker: string, 
  period: string = '1y', 
  forecastDays: number = 30, 
  method: string = 'linear'
): Promise<ForecastData> => {
  try {
    const response = await api.post('/api/forecast', {
      ticker,
      period,
      forecast_days: forecastDays,
      method
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw new Error('Failed to fetch forecast data');
  }
};

export const getNews = async (ticker: string, numArticles: number = 5, period: string = '1y'): Promise<NewsArticle[]> => {
  try {
    const response = await api.post('/api/news', {
      ticker,
      num_articles: numArticles,
      period
    });
    return response.data.articles;
  } catch (error) {
    console.error('Error fetching news:', error);
    throw new Error('Failed to fetch news');
  }
};

// LLM Prediction API functions
export const llmBacktest = async (ticker: string, period: string = '1y', startDate?: string, endDate?: string) => {
  try {
    console.log(`Starting LLM backtest for ${ticker}...`);
    const response = await llmApi.post('/api/llm/backtest', {
      ticker,
      period,
      start_date: startDate,
      end_date: endDate
    });
    console.log('LLM backtest completed successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error running LLM backtest:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Backtest timed out - this can take up to 60 seconds for complex analysis');
    }
    throw new Error('Failed to run LLM backtest');
  }
};

export const llmPredict = async (ticker: string, period: string = '1mo') => {
  try {
    console.log(`Making LLM prediction for ${ticker}...`);
    const response = await llmApi.post('/api/llm/predict', {
      ticker,
      period
    });
    console.log('LLM prediction completed successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error making LLM prediction:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Prediction timed out - this can take up to 60 seconds');
    }
    throw new Error('Failed to make LLM prediction');
  }
};

