export interface StockData {
  ticker: string;
  data: {
    dates: string[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
  info?: {
    longName?: string;
    shortName?: string;
    sector?: string;
    industry?: string;
    currency?: string;
    exchange?: string;
  };
  metrics: {
    current_price: number;
    price_change: number;
    percent_change: number;
    high_52w: number;
    low_52w: number;
    volume: number;
  };
  market_status: string;
  exchange: string;
  data_timestamp: string;
}

export interface ForecastData {
  ticker: string;
  method: string;
  forecast_days: number;
  forecast_data: {
    dates: string[];
    prices: number[];
  };
  summary: {
    current_price: number;
    forecast_price: number;
    price_change: number;
    percent_change: number;
  };
}

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  citation?: string;
  original_text?: string;
  article_type?: string;
  relevance_score?: number;
}

export interface SearchResult {
  ticker: string;
  company: string;
}

// LLM Prediction Types
export interface LLMPredictionData {
  ticker: string;
  current_price: number;
  currency: string;
  predicted_direction: 'up' | 'down' | 'neutral';
  confidence: number;
  news_sentiment: number;
  technical_indicators: {
    sma_5: number;
    sma_20: number;
    price_momentum: number;
    volatility: number;
    volume_trend: number;
    rsi: number;
    sma_ratio: number;
  };
  prediction_date: string;
  analysis_summary: {
    sma_trend: 'bullish' | 'bearish';
    momentum: 'positive' | 'negative';
    rsi_signal: 'oversold' | 'overbought' | 'neutral';
    news_sentiment_level: 'positive' | 'negative' | 'neutral';
  };
}

export interface LLMBacktestData {
  ticker: string;
  period: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  total_predictions: number;
  correct_predictions: number;
  confusion_matrix: number[][];
  class_labels: string[];
  prediction_distribution: {
    up: number;
    down: number;
    neutral: number;
  };
  average_confidence: number;
  backtest_date_range: {
    start: string;
    end: string;
  };
  precision_by_class: {
    up: number;
    down: number;
    neutral: number;
  };
  recall_by_class: {
    up: number;
    down: number;
    neutral: number;
  };
  optimization_tips: string[];
}

export interface LLMResponse {
  success: boolean;
  message: string;
  data?: LLMPredictionData | LLMBacktestData;
}

