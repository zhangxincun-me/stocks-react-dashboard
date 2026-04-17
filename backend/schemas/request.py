from pydantic import BaseModel
from typing import Optional

class StockSearchRequest(BaseModel):
    query: str

class StockDataRequest(BaseModel):
    ticker: str
    period: str = "1y"

class ForecastRequest(BaseModel):
    ticker: str
    period: str = "1y"
    forecast_days: int = 30
    method: str = "linear"

class NewsRequest(BaseModel):
    ticker: str
    num_articles: int = 5
    period: str = "1y"

class LLMPredictionRequest(BaseModel):
    ticker: str
    period: str = "1y"
    start_date: Optional[str] = None
    end_date: Optional[str] = None