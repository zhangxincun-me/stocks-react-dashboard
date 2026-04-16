"""
LLM-based Stock Prediction System with Backtesting and Confusion Matrix Analysis
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PredictionResult:
    """Data class for prediction results"""
    date: str
    actual_direction: str  # 'up', 'down', 'neutral'
    predicted_direction: str
    confidence: float
    price_change: float
    news_sentiment: float
    technical_indicators: Dict[str, float]

@dataclass
class BacktestResults:
    """Data class for backtesting results"""
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: np.ndarray
    predictions: List[PredictionResult]
    total_predictions: int
    correct_predictions: int

class LLMStockPredictor:
    """Lightweight LLM-based stock predictor with backtesting capabilities"""
    
    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
        """Initialize the LLM predictor with a small, efficient model"""
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.sentiment_pipeline = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
    def load_model(self):
        """Load the pre-trained model and tokenizer"""
        try:
            logger.info(f"Loading model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def calculate_technical_indicators(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate enhanced technical indicators for better precision"""
        if len(df) < 20:
            return {}
            
        close_prices = df['close'].values
        high_prices = df['high'].values
        low_prices = df['low'].values
        volume = df['volume'].values if 'volume' in df.columns else np.ones(len(close_prices))
        
        # Enhanced Moving Averages
        sma_5 = np.mean(close_prices[-5:]) if len(close_prices) >= 5 else close_prices[-1]
        sma_10 = np.mean(close_prices[-10:]) if len(close_prices) >= 10 else close_prices[-1]
        sma_20 = np.mean(close_prices[-20:]) if len(close_prices) >= 20 else close_prices[-1]
        sma_50 = np.mean(close_prices[-50:]) if len(close_prices) >= 50 else close_prices[-1]
        
        # Exponential Moving Averages (more responsive)
        ema_12 = self._calculate_ema(close_prices, 12)
        ema_26 = self._calculate_ema(close_prices, 26)
        
        # Price momentum (multiple timeframes)
        momentum_1 = (close_prices[-1] - close_prices[-2]) / close_prices[-2] if len(close_prices) >= 2 else 0
        momentum_5 = (close_prices[-1] - close_prices[-5]) / close_prices[-5] if len(close_prices) >= 5 else 0
        momentum_10 = (close_prices[-1] - close_prices[-10]) / close_prices[-10] if len(close_prices) >= 10 else 0
        
        # Volatility indicators
        returns = np.diff(close_prices) / close_prices[:-1]
        volatility = np.std(returns) if len(returns) > 0 else 0
        
        # ATR (Average True Range) for volatility
        atr = self._calculate_atr(high_prices, low_prices, close_prices, 14)
        
        # Volume indicators
        volume_sma_5 = np.mean(volume[-5:]) if len(volume) >= 5 else volume[-1]
        volume_sma_20 = np.mean(volume[-20:]) if len(volume) >= 20 else volume[-1]
        volume_trend = volume_sma_5 / volume_sma_20 if volume_sma_20 > 0 else 1
        
        # Volume-Price Trend (VPT)
        vpt = self._calculate_vpt(close_prices, volume)
        
        # RSI with multiple periods
        rsi_14 = self._calculate_rsi(close_prices, 14)
        rsi_7 = self._calculate_rsi(close_prices, 7)
        
        # MACD
        macd_line = ema_12 - ema_26
        macd_signal = self._calculate_ema(np.array([macd_line]), 9) if len(close_prices) >= 26 else 0
        macd_histogram = macd_line - macd_signal
        
        # Bollinger Bands
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(close_prices, 20, 2)
        bb_position = (close_prices[-1] - bb_lower) / (bb_upper - bb_lower) if bb_upper != bb_lower else 0.5
        
        # Price position relative to moving averages
        price_above_sma_5 = 1 if close_prices[-1] > sma_5 else 0
        price_above_sma_20 = 1 if close_prices[-1] > sma_20 else 0
        price_above_sma_50 = 1 if close_prices[-1] > sma_50 else 0
        
        # Trend strength
        trend_strength = (price_above_sma_5 + price_above_sma_20 + price_above_sma_50) / 3
        
        return {
            'sma_5': sma_5,
            'sma_10': sma_10,
            'sma_20': sma_20,
            'sma_50': sma_50,
            'ema_12': ema_12,
            'ema_26': ema_26,
            'momentum_1': momentum_1,
            'momentum_5': momentum_5,
            'momentum_10': momentum_10,
            'volatility': volatility,
            'atr': atr,
            'volume_trend': volume_trend,
            'vpt': vpt,
            'rsi_14': rsi_14,
            'rsi_7': rsi_7,
            'macd_line': macd_line,
            'macd_signal': macd_signal,
            'macd_histogram': macd_histogram,
            'bb_position': bb_position,
            'trend_strength': trend_strength,
            'sma_ratio': sma_5 / sma_20 if sma_20 > 0 else 1,
            'price_momentum': momentum_5  # Keep for backward compatibility
        }
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> float:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return float(prices[-1]) if len(prices) > 0 else 0.0
        
        multiplier = 2 / (period + 1)
        ema = float(prices[0])
        for price in prices[1:]:
            ema = (float(price) * multiplier) + (ema * (1 - multiplier))
        return ema
    
    def _calculate_atr(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> float:
        """Calculate Average True Range"""
        if len(high) < period + 1:
            return 0
        
        tr_list = []
        for i in range(1, len(high)):
            tr = max(
                high[i] - low[i],
                abs(high[i] - close[i-1]),
                abs(low[i] - close[i-1])
            )
            tr_list.append(tr)
        
        return np.mean(tr_list[-period:]) if len(tr_list) >= period else 0
    
    def _calculate_vpt(self, close: np.ndarray, volume: np.ndarray) -> float:
        """Calculate Volume-Price Trend"""
        if len(close) < 2:
            return 0
        
        vpt = 0
        for i in range(1, len(close)):
            price_change = (close[i] - close[i-1]) / close[i-1]
            vpt += volume[i] * price_change
        
        return vpt
    
    def _calculate_rsi(self, prices: np.ndarray, period: int) -> float:
        """Calculate RSI"""
        if len(prices) < period + 1:
            return 50
        
        gains = np.maximum(0, np.diff(prices))
        losses = np.maximum(0, -np.diff(prices))
        
        avg_gain = np.mean(gains[-period:]) if len(gains) >= period else 0
        avg_loss = np.mean(losses[-period:]) if len(losses) >= period else 0.001
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _calculate_bollinger_bands(self, prices: np.ndarray, period: int, std_dev: float):
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            return prices[-1], prices[-1], prices[-1]
        
        sma = np.mean(prices[-period:])
        std = np.std(prices[-period:])
        
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        
        return upper, sma, lower
    
    def analyze_news_sentiment(self, news_articles: List[Dict]) -> float:
        """Analyze sentiment of news articles using the LLM"""
        if not news_articles or not self.sentiment_pipeline:
            return 0.0
        
        # Combine all news text
        combined_text = " ".join([
            f"{article.get('title', '')} {article.get('description', '')}"
            for article in news_articles
        ])
        
        if not combined_text.strip():
            return 0.0
        
        try:
            # Truncate text to avoid token limits
            max_length = 512
            if len(combined_text) > max_length:
                combined_text = combined_text[:max_length]
            
            result = self.sentiment_pipeline(combined_text)
            
            # Convert sentiment to numerical value
            if result[0]['label'] == 'POSITIVE':
                return result[0]['score']
            else:
                return -result[0]['score']
                
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return 0.0
    
    def predict_direction(self, 
                         current_price: float,
                         technical_indicators: Dict[str, float],
                         news_sentiment: float,
                         historical_data: pd.DataFrame) -> Tuple[str, float]:
        """
        TREND-FOLLOWING prediction system optimized for financial stocks
        
        Returns:
            Tuple of (direction, confidence)
            direction: 'up', 'down', or 'neutral'
            confidence: float between 0 and 1
        """
        
        # SIMPLE MOMENTUM + RANDOM WALK - Often more effective than complex models
        if len(historical_data) < 10:
            return 'neutral', 0.3
        
        # Get basic indicators
        sma_5 = technical_indicators.get('sma_5', current_price)
        sma_20 = technical_indicators.get('sma_20', current_price)
        rsi_14 = technical_indicators.get('rsi_14', 50)
        momentum_5 = technical_indicators.get('momentum_5', 0)
        
        # Calculate simple momentum
        momentum_score = 0
        
        # 1. Price vs moving averages
        if current_price > sma_5:
            momentum_score += 0.3
        else:
            momentum_score -= 0.3
            
        if current_price > sma_20:
            momentum_score += 0.2
        else:
            momentum_score -= 0.2
        
        # 2. RSI momentum
        if rsi_14 > 50:
            momentum_score += 0.2
        else:
            momentum_score -= 0.2
        
        # 3. Price momentum
        if momentum_5 > 0:
            momentum_score += 0.3
        else:
            momentum_score -= 0.3
        
        # 4. Add some randomness (simulate market unpredictability)
        import random
        random_factor = random.uniform(-0.2, 0.2)
        momentum_score += random_factor
        
        # Simple thresholds
        if momentum_score > 0.3:
            direction = 'up'
            confidence = 0.6
        elif momentum_score < -0.3:
            direction = 'down'
            confidence = 0.6
        else:
            direction = 'neutral'
            confidence = 0.4
        
        # ENSEMBLE PREDICTION - Use multiple timeframes for better accuracy
        ensemble_direction, ensemble_confidence = self._ensemble_prediction(
            current_price, technical_indicators, historical_data
        )
        
        # CONSERVATIVE COMBINATION - Only make predictions when both agree
        if ensemble_direction == direction:  # Agreement
            # Both models agree - increase confidence
            final_confidence = min(0.95, (confidence + ensemble_confidence) / 2 * 1.3)
        else:  # Disagreement - default to neutral for safety
            direction = 'neutral'
            final_confidence = 0.4  # Low confidence for disagreement
        
        return direction, final_confidence
    
    def _ensemble_prediction(self, current_price: float, technical_indicators: Dict[str, float], historical_data: pd.DataFrame) -> Tuple[str, float]:
        """Ensemble prediction using multiple timeframes for better accuracy"""
        if len(historical_data) < 10:
            return 'neutral', 0.3
        
        # Short-term prediction (1-3 days)
        short_term_score = 0
        if len(historical_data) >= 3:
            recent_returns = historical_data['close'].pct_change().tail(3)
            if recent_returns.mean() > 0.005:
                short_term_score = 0.6
            elif recent_returns.mean() < -0.005:
                short_term_score = -0.6
        
        # Medium-term prediction (5-10 days)
        medium_term_score = 0
        if len(historical_data) >= 10:
            sma_5 = technical_indicators.get('sma_5', current_price)
            sma_10 = technical_indicators.get('sma_10', current_price)
            if current_price > sma_5 > sma_10:
                medium_term_score = 0.5
            elif current_price < sma_5 < sma_10:
                medium_term_score = -0.5
        
        # Long-term trend (20+ days)
        long_term_score = 0
        if len(historical_data) >= 20:
            sma_20 = technical_indicators.get('sma_20', current_price)
            sma_50 = technical_indicators.get('sma_50', current_price)
            if current_price > sma_20 > sma_50:
                long_term_score = 0.4
            elif current_price < sma_20 < sma_50:
                long_term_score = -0.4
        
        # Weighted ensemble score
        ensemble_score = (short_term_score * 0.4 + medium_term_score * 0.4 + long_term_score * 0.2)
        
        # Determine ensemble direction with adjusted thresholds
        if ensemble_score > 0.2:
            direction = 'up'
            confidence = min(0.8, 0.4 + abs(ensemble_score) * 0.4)
        elif ensemble_score < -0.2:
            direction = 'down'
            confidence = min(0.8, 0.4 + abs(ensemble_score) * 0.4)
        else:
            direction = 'neutral'
            confidence = 0.3
        
        return direction, confidence
    
    def _detect_financial_sector(self, indicators: Dict[str, float], historical_data: pd.DataFrame) -> bool:
        """Detect if the stock is likely in the financial sector based on characteristics"""
        volatility = indicators.get('volatility', 0)
        atr = indicators.get('atr', 0)
        
        # Financial stocks typically have higher volatility and ATR
        if volatility > 0.025 and atr > 2.0:
            return True
        
        # Additional check: if price movements are more erratic (higher standard deviation of returns)
        if len(historical_data) > 10:
            returns = historical_data['close'].pct_change().dropna()
            if returns.std() > 0.02:
                return True
        
        return False
    
    def _analyze_trend_signals_enhanced(self, indicators: Dict[str, float], historical_data: pd.DataFrame) -> float:
        """Enhanced trend analysis optimized for accuracy"""
        score = 0
        
        # Multi-timeframe trend analysis
        sma_5 = indicators.get('sma_5', 0)
        sma_10 = indicators.get('sma_10', 0)
        sma_20 = indicators.get('sma_20', 0)
        sma_50 = indicators.get('sma_50', 0)
        current_price = historical_data['close'].iloc[-1] if len(historical_data) > 0 else 0
        
        # Trend alignment scoring (more weight to longer-term trends for accuracy)
        trend_alignment = 0
        if current_price > sma_5 > sma_10 > sma_20 > sma_50:  # Perfect uptrend
            trend_alignment = 1.0
        elif current_price > sma_5 > sma_10 and sma_20 > sma_50:  # Strong uptrend
            trend_alignment = 0.8
        elif current_price > sma_5 and sma_10 > sma_20:  # Moderate uptrend
            trend_alignment = 0.6
        elif current_price < sma_5 < sma_10 < sma_20 < sma_50:  # Perfect downtrend
            trend_alignment = -1.0
        elif current_price < sma_5 < sma_10 and sma_20 < sma_50:  # Strong downtrend
            trend_alignment = -0.8
        elif current_price < sma_5 and sma_10 < sma_20:  # Moderate downtrend
            trend_alignment = -0.6
        
        score += trend_alignment * 0.4
        
        # EMA trend with momentum confirmation
        ema_12 = indicators.get('ema_12', 0)
        ema_26 = indicators.get('ema_26', 0)
        momentum_5 = indicators.get('momentum_5', 0)
        
        if ema_12 > ema_26 and momentum_5 > 0:
            score += 0.3
        elif ema_12 < ema_26 and momentum_5 < 0:
            score -= 0.3
        
        # MACD with volume confirmation
        macd_line = indicators.get('macd_line', 0)
        macd_signal = indicators.get('macd_signal', 0)
        macd_histogram = indicators.get('macd_histogram', 0)
        volume_trend = indicators.get('volume_trend', 1)
        
        if macd_line > macd_signal and macd_histogram > 0 and volume_trend > 1.1:
            score += 0.3
        elif macd_line < macd_signal and macd_histogram < 0 and volume_trend < 0.9:
            score -= 0.3
        
        return score
    
    def _analyze_momentum_signals_enhanced(self, indicators: Dict[str, float], historical_data: pd.DataFrame) -> float:
        """Enhanced momentum analysis optimized for accuracy"""
        score = 0
        
        # Multi-period RSI analysis
        rsi_14 = indicators.get('rsi_14', 50)
        rsi_7 = indicators.get('rsi_7', 50)
        
        # RSI divergence analysis for accuracy
        if rsi_7 > rsi_14 and 30 < rsi_14 < 70:  # Healthy momentum
            score += 0.4
        elif rsi_14 < 30 and rsi_7 > rsi_14:  # Oversold bounce
            score += 0.3
        elif rsi_14 > 70 and rsi_7 < rsi_14:  # Overbought correction
            score -= 0.3
        elif rsi_7 < rsi_14 and 30 < rsi_14 < 70:  # Weak momentum
            score -= 0.2
        
        # Price momentum with acceleration
        momentum_1 = indicators.get('momentum_1', 0)
        momentum_5 = indicators.get('momentum_5', 0)
        momentum_10 = indicators.get('momentum_10', 0)
        
        # Weighted momentum with acceleration factor
        weighted_momentum = (momentum_1 * 0.5 + momentum_5 * 0.3 + momentum_10 * 0.2)
        acceleration = momentum_1 - momentum_5  # Recent acceleration
        
        if weighted_momentum > 0.01 and acceleration > 0:  # Strong positive momentum with acceleration
            score += 0.4
        elif weighted_momentum > 0.005:  # Moderate positive momentum
            score += 0.2
        elif weighted_momentum < -0.01 and acceleration < 0:  # Strong negative momentum with acceleration
            score -= 0.4
        elif weighted_momentum < -0.005:  # Moderate negative momentum
            score -= 0.2
        
        # Bollinger Bands with momentum
        bb_position = indicators.get('bb_position', 0.5)
        if bb_position < 0.2 and weighted_momentum > 0:  # Near lower band with positive momentum
            score += 0.3
        elif bb_position > 0.8 and weighted_momentum < 0:  # Near upper band with negative momentum
            score -= 0.3
        
        return score
    
    def _analyze_volatility_signals_enhanced(self, indicators: Dict[str, float], historical_data: pd.DataFrame) -> float:
        """Enhanced volatility analysis optimized for accuracy"""
        score = 0
        
        # Volume analysis with price confirmation
        volume_trend = indicators.get('volume_trend', 1)
        vpt = indicators.get('vpt', 0)
        current_price = historical_data['close'].iloc[-1] if len(historical_data) > 0 else 0
        price_change = (current_price - historical_data['close'].iloc[-2]) / historical_data['close'].iloc[-2] if len(historical_data) > 1 else 0
        
        # Volume-price confirmation
        if volume_trend > 1.2 and vpt > 0 and price_change > 0:  # High volume with positive price movement
            score += 0.4
        elif volume_trend < 0.8 and vpt < 0 and price_change < 0:  # Low volume with negative price movement
            score -= 0.4
        elif volume_trend > 1.1 and vpt > 0:  # Good volume support
            score += 0.2
        elif volume_trend < 0.9 and vpt < 0:  # Weak volume support
            score -= 0.2
        
        # Volatility analysis with trend consideration
        volatility = indicators.get('volatility', 0)
        atr = indicators.get('atr', 0)
        
        # Optimal volatility range for different market conditions
        if 0.01 < volatility < 0.03 and atr > 0:  # Good volatility range
            score += 0.3
        elif volatility > 0.05:  # Too volatile
            score -= 0.2
        elif volatility < 0.005:  # Too low volatility
            score -= 0.1
        
        return score
    
    def _analyze_news_signals_enhanced(self, news_sentiment: float, technical_indicators: Dict[str, float]) -> float:
        """Enhanced news sentiment analysis optimized for accuracy"""
        # More sophisticated news sentiment analysis
        volatility = technical_indicators.get('volatility', 0)
        
        # Adjust news sensitivity based on volatility
        if volatility > 0.02:  # High volatility stocks are more sensitive to news
            if news_sentiment > 0.3:
                return 0.3
            elif news_sentiment > 0.1:
                return 0.15
            elif news_sentiment < -0.3:
                return -0.3
            elif news_sentiment < -0.1:
                return -0.15
        else:  # Low volatility stocks need stronger news signals
            if news_sentiment > 0.5:
                return 0.3
            elif news_sentiment > 0.2:
                return 0.15
            elif news_sentiment < -0.5:
                return -0.3
            elif news_sentiment < -0.2:
                return -0.15
        
        return 0.0
    
    def _analyze_market_context(self, historical_data: pd.DataFrame, technical_indicators: Dict[str, float]) -> float:
        """Analyze broader market context for accuracy optimization"""
        score = 0
        
        if len(historical_data) < 10:
            return 0.0
        
        # Market trend analysis
        recent_prices = historical_data['close'].tail(10)
        market_trend = (recent_prices.iloc[-1] - recent_prices.iloc[0]) / recent_prices.iloc[0]
        
        # Market volatility context
        market_volatility = recent_prices.pct_change().std()
        
        # Adjust signals based on market context
        if market_trend > 0.02 and market_volatility < 0.02:  # Strong uptrend with low volatility
            score += 0.2
        elif market_trend < -0.02 and market_volatility < 0.02:  # Strong downtrend with low volatility
            score -= 0.2
        elif market_volatility > 0.04:  # High market volatility reduces confidence
            score -= 0.1
        
        return score
    
    def _calculate_dynamic_thresholds(self, historical_data: pd.DataFrame, technical_indicators: Dict[str, float]) -> float:
        """Calculate dynamic thresholds based on historical performance"""
        if len(historical_data) < 20:
            return 0.0
        
        # Analyze recent prediction accuracy patterns
        recent_volatility = historical_data['close'].pct_change().tail(10).std()
        recent_trend = (historical_data['close'].iloc[-1] - historical_data['close'].iloc[-10]) / historical_data['close'].iloc[-10]
        
        # Adjust thresholds based on market conditions
        if recent_volatility > 0.03:  # High volatility period
            return -0.05  # Lower thresholds for more sensitivity
        elif recent_volatility < 0.01:  # Low volatility period
            return 0.05  # Higher thresholds for more selectivity
        elif abs(recent_trend) > 0.05:  # Strong trending period
            return 0.02  # Slightly higher thresholds
        
        return 0.0
    
    def _calculate_signal_consistency(self, signal_scores: List[float]) -> float:
        """Calculate consistency of signals for accuracy optimization"""
        if len(signal_scores) < 2:
            return 0.5
        
        # Calculate how many signals agree on direction
        positive_signals = sum(1 for score in signal_scores if score > 0.1)
        negative_signals = sum(1 for score in signal_scores if score < -0.1)
        total_signals = len(signal_scores)
        
        # Consistency is higher when more signals agree
        max_agreement = max(positive_signals, negative_signals)
        consistency = max_agreement / total_signals
        
        return consistency
    
    def _apply_confidence_smoothing(self, confidence: float, historical_data: pd.DataFrame) -> float:
        """Apply confidence smoothing to reduce false signals"""
        if len(historical_data) < 5:
            return confidence
        
        # Simple moving average of recent confidence levels
        # This would require storing previous confidence levels in practice
        # For now, apply basic smoothing based on volatility
        volatility = historical_data['close'].pct_change().tail(5).std()
        
        # Reduce confidence during high volatility periods
        if volatility > 0.03:
            confidence *= 0.8
        elif volatility < 0.01:
            confidence *= 1.1
        
        return min(0.95, max(0.1, confidence))
    
    def _analyze_trend_signals(self, indicators: Dict[str, float]) -> float:
        """Analyze trend strength and direction with sector-aware adjustments"""
        score = 0
        
        # Moving average alignment with adaptive thresholds
        sma_ratio = indicators.get('sma_ratio', 1)
        trend_strength = indicators.get('trend_strength', 0.5)
        volatility = indicators.get('volatility', 0)
        
        # Adjust thresholds based on volatility (financial stocks are more volatile)
        trend_threshold = 1.01 if volatility > 0.02 else 1.02
        strength_threshold = 0.5 if volatility > 0.02 else 0.6
        
        if sma_ratio > trend_threshold and trend_strength > strength_threshold:
            score += 0.4
        elif sma_ratio < (2 - trend_threshold) and trend_strength < (1 - strength_threshold):
            score -= 0.4
        
        # EMA trend with momentum consideration
        ema_12 = indicators.get('ema_12', 0)
        ema_26 = indicators.get('ema_26', 0)
        momentum_5 = indicators.get('momentum_5', 0)
        
        if ema_12 > ema_26:
            # Stronger signal if momentum supports the trend
            score += 0.3 + (0.1 if momentum_5 > 0 else 0)
        else:
            # Stronger signal if momentum supports the trend
            score -= 0.3 + (0.1 if momentum_5 < 0 else 0)
        
        # MACD signals with volume confirmation
        macd_line = indicators.get('macd_line', 0)
        macd_signal = indicators.get('macd_signal', 0)
        macd_histogram = indicators.get('macd_histogram', 0)
        volume_trend = indicators.get('volume_trend', 1)
        
        # Volume confirmation for MACD signals
        volume_multiplier = 1.2 if volume_trend > 1.1 else 0.8
        
        if macd_line > macd_signal and macd_histogram > 0:
            score += 0.3 * volume_multiplier
        elif macd_line < macd_signal and macd_histogram < 0:
            score -= 0.3 * volume_multiplier
        
        return score
    
    def _analyze_momentum_signals(self, indicators: Dict[str, float]) -> float:
        """Analyze momentum indicators with volatility-aware adjustments"""
        score = 0
        
        # RSI analysis with volatility adjustment
        rsi_14 = indicators.get('rsi_14', 50)
        rsi_7 = indicators.get('rsi_7', 50)
        volatility = indicators.get('volatility', 0)
        
        # Adjust RSI thresholds for volatile stocks (like financials)
        oversold_threshold = 25 if volatility > 0.02 else 30
        overbought_threshold = 75 if volatility > 0.02 else 70
        
        if oversold_threshold < rsi_14 < overbought_threshold and rsi_7 > rsi_14:  # Healthy momentum
            score += 0.3
        elif rsi_14 < oversold_threshold:  # Oversold bounce potential
            score += 0.25  # Slightly higher for volatile stocks
        elif rsi_14 > overbought_threshold:  # Overbought correction risk
            score -= 0.25
        
        # Price momentum with volatility scaling
        momentum_1 = indicators.get('momentum_1', 0)
        momentum_5 = indicators.get('momentum_5', 0)
        momentum_10 = indicators.get('momentum_10', 0)
        
        # Weighted momentum (recent momentum has more weight)
        weighted_momentum = (momentum_1 * 0.5 + momentum_5 * 0.3 + momentum_10 * 0.2)
        
        # Adjust momentum thresholds based on volatility
        momentum_threshold = 0.005 if volatility > 0.02 else 0.01
        
        if weighted_momentum > momentum_threshold:
            score += 0.4
        elif weighted_momentum < -momentum_threshold:
            score -= 0.4
        
        # Bollinger Bands position with volatility consideration
        bb_position = indicators.get('bb_position', 0.5)
        atr = indicators.get('atr', 0)
        
        # More sensitive to extreme positions in volatile stocks
        bb_lower_threshold = 0.15 if volatility > 0.02 else 0.2
        bb_upper_threshold = 0.85 if volatility > 0.02 else 0.8
        
        if bb_position < bb_lower_threshold:  # Near lower band (oversold)
            score += 0.3
        elif bb_position > bb_upper_threshold:  # Near upper band (overbought)
            score -= 0.3
        
        # Additional momentum confirmation for volatile stocks
        if volatility > 0.02:
            # Look for momentum divergence in volatile stocks
            if rsi_7 > rsi_14 and weighted_momentum > 0:
                score += 0.1  # Additional confirmation
            elif rsi_7 < rsi_14 and weighted_momentum < 0:
                score -= 0.1  # Additional confirmation
        
        return score
    
    def _analyze_volatility_signals(self, indicators: Dict[str, float]) -> float:
        """Analyze volatility and volume signals with sector awareness"""
        score = 0
        
        # Volume trend with adaptive thresholds
        volume_trend = indicators.get('volume_trend', 1)
        vpt = indicators.get('vpt', 0)
        volatility = indicators.get('volatility', 0)
        
        # Adjust volume thresholds based on stock volatility
        volume_threshold_high = 1.1 if volatility > 0.02 else 1.2
        volume_threshold_low = 0.9 if volatility > 0.02 else 0.8
        
        if volume_trend > volume_threshold_high and vpt > 0:  # High volume with positive VPT
            score += 0.4
        elif volume_trend < volume_threshold_low and vpt < 0:  # Low volume with negative VPT
            score -= 0.4
        
        # Volatility analysis with sector-specific ranges
        atr = indicators.get('atr', 0)
        
        # Different volatility preferences for different sectors
        if volatility > 0.02:  # High volatility stocks (financials, tech)
            if 0.02 < volatility < 0.04 and atr > 0:  # Good volatility range
                score += 0.3
            elif volatility > 0.06:  # Too volatile even for high-vol stocks
                score -= 0.2
        else:  # Low volatility stocks (utilities, consumer staples)
            if 0.005 < volatility < 0.02 and atr > 0:  # Good volatility range
                score += 0.3
            elif volatility > 0.03:  # Too volatile for low-vol stocks
                score -= 0.2
        
        # Volume confirmation for volatile stocks
        if volatility > 0.02:
            # For volatile stocks, volume confirmation is more important
            if volume_trend > 1.0 and vpt > 0:
                score += 0.1  # Additional confirmation
            elif volume_trend < 1.0 and vpt < 0:
                score -= 0.1  # Additional confirmation
        
        return score
    
    def _analyze_news_signals(self, news_sentiment: float) -> float:
        """Analyze news sentiment signals"""
        # More conservative news sentiment analysis
        if news_sentiment > 0.5:  # Very positive
            return 0.4
        elif news_sentiment > 0.2:  # Positive
            return 0.2
        elif news_sentiment < -0.5:  # Very negative
            return -0.4
        elif news_sentiment < -0.2:  # Negative
            return -0.2
        else:  # Neutral
            return 0.0
    
    def backtest_predictions(self, 
                           stock_data: pd.DataFrame,
                           news_data: List[Dict],
                           start_date: str = None,
                           end_date: str = None) -> BacktestResults:
        """
        ACCURACY-OPTIMIZED backtesting with enhanced prediction system
        """
        logger.info("Starting accuracy-optimized backtesting...")
        
        if self.sentiment_pipeline is None:
            self.load_model()
        
        # Filter data by date range
        if start_date:
            stock_data = stock_data[stock_data.index >= start_date]
        if end_date:
            stock_data = stock_data[stock_data.index <= end_date]
        
        if len(stock_data) < 30:
            raise ValueError("Insufficient data for backtesting (need at least 30 days)")
        
        predictions = []
        correct_predictions = 0
        high_confidence_correct = 0
        high_confidence_total = 0
        
        # ACCURACY OPTIMIZATION: Use adaptive window size based on volatility
        base_window_size = 20
        recent_volatility = stock_data['close'].pct_change().tail(10).std()
        window_size = base_window_size + int(recent_volatility * 1000)  # Adjust based on volatility
        
        # ACCURACY OPTIMIZATION: Track prediction performance for adaptive learning
        recent_accuracy = []
        
        for i in range(window_size, len(stock_data)):
            # Get historical data up to current point
            historical_data = stock_data.iloc[:i]
            current_data = stock_data.iloc[i]
            
            # Calculate enhanced technical indicators
            technical_indicators = self.calculate_technical_indicators(historical_data)
            
            # Analyze news sentiment (use recent news with better filtering)
            recent_news = [news for news in news_data if 
                          pd.to_datetime(news.get('publishedAt', '1900-01-01')).date() >= 
                          historical_data.index[-7].date()]  # Last 7 days
            
            news_sentiment = self.analyze_news_sentiment(recent_news)
            
            # ACCURACY OPTIMIZATION: Apply adaptive learning based on recent performance
            if len(recent_accuracy) > 5:
                avg_recent_accuracy = np.mean(recent_accuracy[-5:])
                if avg_recent_accuracy < 0.4:  # Poor recent performance
                    # Be more conservative
                    technical_indicators['volatility'] *= 1.2  # Increase volatility threshold
                elif avg_recent_accuracy > 0.7:  # Good recent performance
                    # Be more aggressive
                    technical_indicators['volatility'] *= 0.8  # Decrease volatility threshold
            
            # Make prediction using enhanced system
            predicted_direction, confidence = self.predict_direction(
                current_data['close'],
                technical_indicators,
                news_sentiment,
                historical_data
            )
            
            # Determine actual direction (next day's movement) with optimized thresholds
            if i < len(stock_data) - 1:
                next_day_data = stock_data.iloc[i + 1]
                price_change = (next_day_data['close'] - current_data['close']) / current_data['close']
                
                # SIMPLIFIED THRESHOLDS - More conservative for better accuracy
                threshold = 0.01  # 1% threshold for directional movement
                
                if price_change > threshold:  # Increase
                    actual_direction = 'up'
                elif price_change < -threshold:  # Decrease
                    actual_direction = 'down'
                else:
                    actual_direction = 'neutral'
                
                # Check if prediction was correct
                is_correct = predicted_direction == actual_direction
                if is_correct:
                    correct_predictions += 1
                
                # Track high confidence predictions
                if confidence > 0.7:
                    high_confidence_total += 1
                    if is_correct:
                        high_confidence_correct += 1
                
                # Update recent accuracy for adaptive learning
                recent_accuracy.append(1 if is_correct else 0)
                if len(recent_accuracy) > 10:
                    recent_accuracy.pop(0)  # Keep only last 10 predictions
                
                # Store prediction result with enhanced data
                prediction = PredictionResult(
                    date=str(current_data.name.date()),
                    actual_direction=actual_direction,
                    predicted_direction=predicted_direction,
                    confidence=confidence,
                    price_change=price_change,
                    news_sentiment=news_sentiment,
                    technical_indicators=technical_indicators
                )
                predictions.append(prediction)
        
        # Calculate enhanced metrics
        total_predictions = len(predictions)
        accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
        
        # High confidence accuracy
        high_confidence_accuracy = high_confidence_correct / high_confidence_total if high_confidence_total > 0 else 0
        
        # Create confusion matrix
        actual_labels = [p.actual_direction for p in predictions]
        predicted_labels = [p.predicted_direction for p in predictions]
        
        labels = ['down', 'neutral', 'up']
        cm = confusion_matrix(actual_labels, predicted_labels, labels=labels)
        
        # Calculate additional metrics
        report = classification_report(actual_labels, predicted_labels, 
                                    labels=labels, output_dict=True, zero_division=0)
        
        precision = report['weighted avg']['precision']
        recall = report['weighted avg']['recall']
        f1_score = report['weighted avg']['f1-score']
        
        # ACCURACY OPTIMIZATION: Calculate additional performance metrics
        avg_confidence = np.mean([p.confidence for p in predictions]) if predictions else 0
        confidence_accuracy_correlation = self._calculate_confidence_accuracy_correlation(predictions)
        
        logger.info(f"Accuracy-optimized backtesting completed. Accuracy: {accuracy:.3f}, High Confidence Accuracy: {high_confidence_accuracy:.3f}")
        
        return BacktestResults(
            accuracy=accuracy,
            precision=precision,
            recall=recall,
            f1_score=f1_score,
            confusion_matrix=cm,
            predictions=predictions,
            total_predictions=total_predictions,
            correct_predictions=correct_predictions
        )
    
    def _calculate_confidence_accuracy_correlation(self, predictions: List[PredictionResult]) -> float:
        """Calculate correlation between confidence and accuracy for optimization"""
        if len(predictions) < 10:
            return 0.0
        
        confidences = [p.confidence for p in predictions]
        accuracies = [1 if p.predicted_direction == p.actual_direction else 0 for p in predictions]
        
        return np.corrcoef(confidences, accuracies)[0, 1] if len(confidences) > 1 else 0.0
    
    def plot_confusion_matrix(self, backtest_results: BacktestResults, save_path: str = None):
        """Plot and save confusion matrix"""
        plt.figure(figsize=(8, 6))
        
        labels = ['Down', 'Neutral', 'Up']
        sns.heatmap(backtest_results.confusion_matrix, 
                   annot=True, 
                   fmt='d', 
                   cmap='Blues',
                   xticklabels=labels,
                   yticklabels=labels)
        
        plt.title(f'LLM Stock Prediction Confusion Matrix\nAccuracy: {backtest_results.accuracy:.3f}')
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        plt.show()
        
        return plt.gcf()
    
    def get_prediction_summary(self, backtest_results: BacktestResults) -> Dict:
        """Get a summary of prediction performance with precision optimization insights"""
        # Calculate precision by class
        cm = backtest_results.confusion_matrix
        precision_by_class = {}
        recall_by_class = {}
        
        for i, label in enumerate(['down', 'neutral', 'up']):
            if cm[i, :].sum() > 0:
                precision_by_class[label] = cm[i, i] / cm[i, :].sum()
            else:
                precision_by_class[label] = 0
                
            if cm[:, i].sum() > 0:
                recall_by_class[label] = cm[i, i] / cm[:, i].sum()
            else:
                recall_by_class[label] = 0
        
        # Calculate precision optimization recommendations
        optimization_tips = self._get_optimization_recommendations(backtest_results, precision_by_class)
        
        return {
            'accuracy': backtest_results.accuracy,
            'precision': backtest_results.precision,
            'recall': backtest_results.recall,
            'f1_score': backtest_results.f1_score,
            'total_predictions': backtest_results.total_predictions,
            'correct_predictions': backtest_results.correct_predictions,
            'confusion_matrix': backtest_results.confusion_matrix.tolist(),
            'class_labels': ['down', 'neutral', 'up'],
            'precision_by_class': precision_by_class,
            'recall_by_class': recall_by_class,
            'optimization_tips': optimization_tips
        }
    
    def _get_optimization_recommendations(self, backtest_results: BacktestResults, precision_by_class: Dict) -> List[str]:
        """Generate ACCURACY-OPTIMIZED recommendations"""
        tips = []
        
        # ACCURACY OPTIMIZATION: Focus on overall accuracy improvements
        if backtest_results.accuracy < 0.5:
            tips.append("🎯 ACCURACY FOCUS: Overall accuracy below 50% - consider using more conservative thresholds and longer-term indicators")
        elif backtest_results.accuracy < 0.6:
            tips.append("📈 ACCURACY IMPROVEMENT: Accuracy between 50-60% - focus on signal consistency and reduce noise")
        elif backtest_results.accuracy > 0.7:
            tips.append("✅ EXCELLENT ACCURACY: Model performing well above 70% - consider increasing prediction frequency")
        
        # Enhanced class-specific analysis for accuracy
        for class_name, precision in precision_by_class.items():
            if precision < 0.3:
                tips.append(f"🔴 LOW ACCURACY for '{class_name}' predictions - this direction needs significant improvement")
            elif precision < 0.5:
                tips.append(f"🟡 MODERATE ACCURACY for '{class_name}' predictions - consider adjusting thresholds")
            elif precision > 0.8:
                tips.append(f"🟢 HIGH ACCURACY for '{class_name}' predictions - model excels at this direction")
        
        # Prediction distribution analysis for accuracy optimization
        total = backtest_results.total_predictions
        up_predictions = sum(1 for p in backtest_results.predictions if p.predicted_direction == 'up')
        down_predictions = sum(1 for p in backtest_results.predictions if p.predicted_direction == 'down')
        neutral_predictions = sum(1 for p in backtest_results.predictions if p.predicted_direction == 'neutral')
        
        # Calculate actual distribution for comparison
        up_actual = sum(1 for p in backtest_results.predictions if p.actual_direction == 'up')
        down_actual = sum(1 for p in backtest_results.predictions if p.actual_direction == 'down')
        neutral_actual = sum(1 for p in backtest_results.predictions if p.actual_direction == 'neutral')
        
        # Accuracy optimization based on prediction vs actual distribution
        if neutral_predictions / total > 0.6:
            tips.append("⚖️ BALANCE: High neutral prediction rate - consider more directional predictions for better accuracy")
        elif abs(up_predictions - up_actual) / total > 0.2:
            tips.append("📊 DISTRIBUTION: Prediction distribution doesn't match actual - adjust model sensitivity")
        
        # Enhanced confidence analysis for accuracy
        avg_confidence = np.mean([p.confidence for p in backtest_results.predictions])
        high_confidence_predictions = [p for p in backtest_results.predictions if p.confidence > 0.7]
        high_confidence_accuracy = sum(1 for p in high_confidence_predictions if p.predicted_direction == p.actual_direction) / len(high_confidence_predictions) if high_confidence_predictions else 0
        
        if avg_confidence < 0.4:
            tips.append("🔍 CONFIDENCE: Low average confidence - model is uncertain, consider improving signal quality")
        elif avg_confidence > 0.8:
            tips.append("💪 CONFIDENCE: High average confidence - model is very decisive")
        
        if high_confidence_accuracy > 0.8:
            tips.append("🎯 HIGH CONFIDENCE ACCURACY: When model is confident (>70%), it's very accurate - trust high confidence predictions")
        elif high_confidence_accuracy < 0.6:
            tips.append("⚠️ CONFIDENCE ISSUE: High confidence predictions aren't more accurate - review confidence calculation")
        
        # Volatility-based accuracy recommendations
        volatilities = [p.technical_indicators.get('volatility', 0) for p in backtest_results.predictions]
        avg_volatility = np.mean(volatilities) if volatilities else 0
        
        if avg_volatility > 0.03:
            tips.append("📈 HIGH VOLATILITY: Stock is very volatile - consider using longer timeframes for better accuracy")
        elif avg_volatility < 0.01:
            tips.append("📉 LOW VOLATILITY: Stock is stable - shorter timeframes may work better for accuracy")
        
        # Trend-based accuracy recommendations
        trend_strengths = [p.technical_indicators.get('trend_strength', 0.5) for p in backtest_results.predictions]
        avg_trend_strength = np.mean(trend_strengths) if trend_strengths else 0.5
        
        if avg_trend_strength > 0.7:
            tips.append("📈 STRONG TRENDS: Stock shows clear trends - trend-following strategies may improve accuracy")
        elif avg_trend_strength < 0.3:
            tips.append("📊 SIDEWAYS MARKET: Stock is range-bound - mean reversion strategies may improve accuracy")
        
        return tips
