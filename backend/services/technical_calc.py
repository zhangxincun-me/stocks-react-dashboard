import numpy as np
import pandas as pd

def calculate_rsi(prices, period=14):
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)

def calculate_macd(prices, fast=12, slow=26, signal=9):
    ema_fast = prices.ewm(span=fast).mean()
    ema_slow = prices.ewm(span=slow).mean()
    macd = ema_fast - ema_slow
    return macd, macd.ewm(span=signal).mean(), macd - macd.ewm(span=signal).mean()

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    return sma + (std * std_dev), sma, sma - (std * std_dev)

def calculate_atr(high, low, close, period=14):
    tr = pd.concat([high - low, abs(high - close.shift()), abs(low - close.shift())], axis=1).max(axis=1)
    return tr.rolling(window=period).mean()

def calculate_volume_indicators(data):
    return data['Volume'].rolling(window=20).mean(), (data['Volume'] * (data['Close'].pct_change())).cumsum(), (data['Volume'] * np.sign(data['Close'].diff())).cumsum(), data['Volume'].pct_change(periods=10) * 100

def calculate_price_indicators(data):
    close, high, low = data['Close'], data['High'], data['Low']
    macd, macd_signal, macd_hist = calculate_macd(close)
    bb_upper, bb_middle, bb_lower = calculate_bollinger_bands(close)
    volume_ma, vpt, obv, volume_roc = calculate_volume_indicators(data)
    return {
        'rsi': calculate_rsi(close), 'macd': macd, 'macd_signal': macd_signal, 'macd_hist': macd_hist,
        'bb_upper': bb_upper, 'bb_middle': bb_middle, 'bb_lower': bb_lower, 'atr': calculate_atr(high, low, close),
        'sma_5': close.rolling(window=5).mean(), 'sma_10': close.rolling(window=10).mean(),
        'sma_20': close.rolling(window=20).mean(), 'sma_50': close.rolling(window=50).mean(),
        'momentum_5': close.pct_change(5), 'momentum_10': close.pct_change(10), 'momentum_20': close.pct_change(20),
        'volatility': close.rolling(window=20).std(), 'volume_ma': volume_ma, 'vpt': vpt, 'obv': obv, 'volume_roc': volume_roc
    }

def create_enhanced_features(data, lookback=20):
    ind = calculate_price_indicators(data)
    features = pd.DataFrame({
        'price': data['Close'], 'volume': data['Volume'], 'high': data['High'], 'low': data['Low'], 'open': data['Open'],
        'rsi': ind['rsi'], 'macd': ind['macd'], 'macd_signal': ind['macd_signal'], 'macd_hist': ind['macd_hist'],
        'bb_position': (data['Close'] - ind['bb_lower']) / (ind['bb_upper'] - ind['bb_lower']),
        'atr': ind['atr'], 'sma_5_ratio': data['Close'] / ind['sma_5'], 'sma_10_ratio': data['Close'] / ind['sma_10'],
        'sma_20_ratio': data['Close'] / ind['sma_20'], 'sma_50_ratio': data['Close'] / ind['sma_50'],
        'momentum_5': ind['momentum_5'], 'momentum_10': ind['momentum_10'], 'momentum_20': ind['momentum_20'],
        'volatility': ind['volatility'], 'volume_ratio': data['Volume'] / ind['volume_ma'],
        'vpt': ind['vpt'], 'obv': ind['obv'], 'volume_roc': ind['volume_roc']
    })
    for lag in range(1, lookback + 1):
        features[f'price_lag_{lag}'] = data['Close'].shift(lag)
        features[f'volume_lag_{lag}'] = data['Volume'].shift(lag)
        features[f'rsi_lag_{lag}'] = ind['rsi'].shift(lag)
    features['day_of_week'] = data.index.dayofweek
    features['month'] = data.index.month
    features['quarter'] = data.index.quarter
    return features.bfill().ffill()