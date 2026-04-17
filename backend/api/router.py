from fastapi import APIRouter
from backend.api.endpoints import stock, forecast, llm

api_router = APIRouter()

api_router.include_router(stock.router, tags=["Stock"])
api_router.include_router(forecast.router, tags=["Forecast"])
api_router.include_router(llm.router, prefix="/llm", tags=["LLM"])