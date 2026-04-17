import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.svm import SVR
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from prophet import Prophet
from backend.services.technical_calc import create_enhanced_features


def normalize_forecast(forecast_prices, last_historical_price):
    if len(forecast_prices) == 0: return forecast_prices
    return forecast_prices + (last_historical_price - forecast_prices[0])


def simple_linear_forecast(data: pd.DataFrame, days: int = 30):
    prices = data['Close'].values
    model = LinearRegression().fit(np.arange(len(prices)).reshape(-1, 1), prices)
    return normalize_forecast(model.predict(np.arange(len(prices), len(prices) + days).reshape(-1, 1)), prices[-1])


def polynomial_forecast(data: pd.DataFrame, days: int = 30, degree: int = 2):
    prices = data['Close'].values
    poly = PolynomialFeatures(degree=degree)
    model = LinearRegression().fit(poly.fit_transform(np.arange(len(prices)).reshape(-1, 1)), prices)
    return normalize_forecast(model.predict(poly.transform(np.arange(len(prices), len(prices) + days).reshape(-1, 1))),
                              prices[-1])


def moving_average_forecast(data: pd.DataFrame, days: int = 30, window: int = 20):
    return normalize_forecast(np.full(days, np.mean(data['Close'].tail(window).values)), data['Close'].iloc[-1])


def arima_forecast(data: pd.DataFrame, days: int = 30):
    try:
        prices = data['Close'].values
        best_aic, best_model = float('inf'), None
        for p in range(3):
            for d in range(2):
                for q in range(3):
                    try:
                        fitted = ARIMA(prices, order=(p, d, q)).fit()
                        if fitted.aic < best_aic: best_aic, best_model = fitted.aic, fitted
                    except:
                        continue
        if best_model: return normalize_forecast(best_model.forecast(steps=days), prices[-1])
        return moving_average_forecast(data, days)
    except:
        return moving_average_forecast(data, days)


def prophet_forecast(data: pd.DataFrame, days: int = 30):
    try:
        df = data.reset_index()[['Date', 'Close']].rename(columns={'Date': 'ds', 'Close': 'y'})
        model = Prophet(daily_seasonality=True, weekly_seasonality=True).fit(df)
        return normalize_forecast(model.predict(model.make_future_dataframe(periods=days))['yhat'].tail(days).values,
                                  data['Close'].iloc[-1])
    except:
        return moving_average_forecast(data, days)


def svr_forecast(data: pd.DataFrame, days: int = 30):
    try:
        prices = data['Close'].values
        scaler_X, scaler_y = StandardScaler(), StandardScaler()
        X_scaled = scaler_X.fit_transform(np.arange(len(prices)).reshape(-1, 1))
        y_scaled = scaler_y.fit_transform(prices.reshape(-1, 1)).flatten()
        model = SVR(kernel='rbf', C=100, gamma=0.1, epsilon=0.1).fit(X_scaled, y_scaled)
        future_prices = scaler_y.inverse_transform(
            model.predict(scaler_X.transform(np.arange(len(prices), len(prices) + days).reshape(-1, 1))).reshape(-1,
                                                                                                                 1)).flatten()
        return normalize_forecast(future_prices, prices[-1])
    except:
        return moving_average_forecast(data, days)


def enhanced_linear_forecast(data, days=30):
    try:
        features = create_enhanced_features(data)
        X = features.dropna()
        if len(X) < 20: return simple_linear_forecast(data, days)
        y = data['Close'].iloc[len(data) - len(X):]
        if len(X) != len(y): return simple_linear_forecast(data, days)

        scaler_X, scaler_y = StandardScaler(), StandardScaler()
        model = Ridge(alpha=1.0).fit(scaler_X.fit_transform(X),
                                     scaler_y.fit_transform(y.values.reshape(-1, 1)).flatten())

        forecast_prices, last_features = [], X.iloc[-1:].copy()
        for _ in range(days):
            next_price = scaler_y.inverse_transform(model.predict(scaler_X.transform(last_features)).reshape(-1, 1))[
                0, 0]
            forecast_prices.append(next_price)
            last_features['price'] = next_price
            for col in last_features.columns:
                if col.startswith('price_lag_'):
                    lag_num = int(col.split('_')[-1])
                    last_features[col] = last_features[f'price_lag_{lag_num - 1}'] if lag_num > 1 else next_price
        return normalize_forecast(np.array(forecast_prices), data['Close'].iloc[-1])
    except:
        return simple_linear_forecast(data, days)


def enhanced_arima_forecast(data, days=30):
    try:
        external_vars = create_enhanced_features(data)[
            ['rsi', 'macd', 'bb_position', 'volume_ratio', 'volatility']].dropna()
        if len(external_vars) < 20: return arima_forecast(data, days)
        prices = data['Close'].iloc[len(data) - len(external_vars):]
        best_aic, best_model = float('inf'), None
        for p in range(2, 4):
            for d in range(1, 3):
                for q in range(1, 3):
                    try:
                        fitted = SARIMAX(prices, exog=external_vars, order=(p, d, q)).fit(disp=False)
                        if fitted.aic < best_aic: best_aic, best_model = fitted.aic, fitted
                    except:
                        continue
        if best_model: return normalize_forecast(
            best_model.forecast(steps=days, exog=np.tile(external_vars.iloc[-1:].values, (days, 1))), prices[-1])
        return arima_forecast(data, days)
    except:
        return arima_forecast(data, days)


def ensemble_forecast(data, days=30):
    try:
        forecasts = {
            'linear': simple_linear_forecast(data, days), 'polynomial': polynomial_forecast(data, days, degree=3),
            'enhanced_linear': enhanced_linear_forecast(data, days), 'arima': arima_forecast(data, days),
            'prophet': prophet_forecast(data, days)
        }
        weights = {'linear': 0.15, 'polynomial': 0.15, 'enhanced_linear': 0.35, 'arima': 0.2, 'prophet': 0.15}
        ensemble = np.zeros(days)
        for method, f in forecasts.items():
            if len(f) == days: ensemble += weights[method] * f
        return normalize_forecast(ensemble, data['Close'].iloc[-1])
    except:
        return enhanced_linear_forecast(data, days)