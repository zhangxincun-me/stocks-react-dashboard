from fastapi import APIRouter
import numpy as np
from backend.schemas.request import LLMPredictionRequest
from backend.schemas.response import LLMPredictionResponse
from backend.services.data_fetcher import fetch_stock_data, fetch_enhanced_news
from backend.services.llm_analyzer import get_llm_predictor

router = APIRouter()

@router.post("/predict", response_model=LLMPredictionResponse)
async def llm_predict(request: LLMPredictionRequest):
    try:
        predictor = get_llm_predictor()
        if not predictor: raise Exception("LLM predictor not loaded")

        data, info, _, _, _ = fetch_stock_data(request.ticker, "1mo")
        df = data.rename(columns={'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})

        tech_ind = predictor.calculate_technical_indicators(df)
        news_sentiment = predictor.analyze_news_sentiment(fetch_enhanced_news(request.ticker, 10, "1mo"))
        pred_dir, conf = predictor.predict_direction(df['close'].iloc[-1], tech_ind, news_sentiment, df)

        return LLMPredictionResponse(
            success=True, message="Success",
            data={
                'ticker': request.ticker, 'prediction': pred_dir, 'confidence': float(conf),
                'currentPrice': float(df['close'].iloc[-1]), 'currency': info.get('currency', 'USD'),
                'news_sentiment': float(news_sentiment),
                'technical_indicators': {'rsi': float(tech_ind.get('rsi_14', 50))},
                'analysis_summary': {'sma_trend': 'bullish'}
            }
        )
    except Exception as e:
        return LLMPredictionResponse(success=False, message=str(e))


@router.post("/backtest", response_model=LLMPredictionResponse)
async def llm_backtest(request: LLMPredictionRequest):
    try:
        predictor = get_llm_predictor()
        if not predictor: raise Exception("LLM predictor not loaded")

        data, _, _, _, _ = fetch_stock_data(request.ticker, request.period)
        df = data.rename(columns={'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})

        results = predictor.backtest_predictions(df, fetch_enhanced_news(request.ticker, 50, request.period),
                                                 request.start_date, request.end_date)
        summary = predictor.get_prediction_summary(results)

        summary.update({
            'ticker': request.ticker, 'period': request.period,
            'backtest_date_range': {'start': str(df.index[0].date()), 'end': str(df.index[-1].date())},
            'prediction_distribution': {'up': sum(1 for p in results.predictions if p.predicted_direction == 'up'),
                                        'down': sum(1 for p in results.predictions if p.predicted_direction == 'down'),
                                        'neutral': sum(
                                            1 for p in results.predictions if p.predicted_direction == 'neutral')},
            'average_confidence': float(np.mean([p.confidence for p in results.predictions]))
        })
        return LLMPredictionResponse(success=True, message="Success", data=summary)
    except Exception as e:
        return LLMPredictionResponse(success=False, message=str(e))