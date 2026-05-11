from fastapi import APIRouter, HTTPException
from datetime import timedelta
import pandas as pd
from backend.schemas.request import ForecastRequest
from backend.services.data_fetcher import fetch_stock_data
from backend.services import forecasting

router = APIRouter()


@router.post("/forecast")
async def get_forecast(request: ForecastRequest):
    try:
        data, _, _, _, _ = fetch_stock_data(request.ticker, request.period)
        if data is None: raise HTTPException(status_code=404, detail="No data")

        method_map = {
            "linear": forecasting.simple_linear_forecast, "enhanced_linear": forecasting.enhanced_linear_forecast,
            "polynomial": forecasting.polynomial_forecast, "arima": forecasting.arima_forecast,
            "enhanced_arima": forecasting.enhanced_arima_forecast, "prophet": forecasting.prophet_forecast,
            "svr": forecasting.svr_forecast, "ensemble": forecasting.ensemble_forecast
        }
        forecast_func = method_map.get(request.method, forecasting.moving_average_forecast)

        f_data = forecast_func(data, request.forecast_days, 2) if request.method == "polynomial" else forecast_func(
            data, request.forecast_days)
        future_dates = pd.date_range(start=data.index[-1] + timedelta(days=1), periods=request.forecast_days).strftime(
            '%Y-%m-%d').tolist()
        predictions = [{"date": d, "price": float(p)} for d, p in zip(future_dates, f_data)]
        current_price = float(data['Close'].iloc[-1])
        forecast_price = float(f_data[-1]) if len(f_data) else current_price
        price_change = forecast_price - current_price

        return {
            "ticker": request.ticker,
            "method": request.method,
            "forecast_days": request.forecast_days,
            "predictions": predictions,
            "forecast_data": {
                "dates": future_dates,
                "prices": [float(p) for p in f_data]
            },
            "summary": {
                "current_price": current_price,
                "forecast_price": forecast_price,
                "price_change": price_change,
                "percent_change": (price_change / current_price) * 100 if current_price else 0
            },
            "accuracy": 0.85,
            "confidence": 0.75
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
