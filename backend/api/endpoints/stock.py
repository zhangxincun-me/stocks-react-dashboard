from fastapi import APIRouter, HTTPException
from backend.schemas.request import StockSearchRequest, StockDataRequest, NewsRequest
from backend.db.duckdb_repo import get_search_from_cache, save_search_to_cache
from backend.services.data_fetcher import format_baostock_ticker, fetch_stock_data, fetch_enhanced_news

router = APIRouter()


@router.post("/search")
async def search_stock(request: StockSearchRequest):
    query = request.query.strip()
    if not query: raise HTTPException(status_code=400, detail="Query cannot be empty")
    cached = get_search_from_cache(query)
    if cached: return cached

    if query.replace('.', '').replace('sh', '').replace('sz', '').isdigit():
        fmt_ticker = format_baostock_ticker(query)
        result = [{"ticker": fmt_ticker, "name": f"A-Share ({fmt_ticker})", "exchange": "CN", "type": "EQUITY"}]
        save_search_to_cache(query, fmt_ticker, result[0]['name'])
        return result
    return [{"ticker": query, "name": query.upper(), "exchange": "Unknown", "type": "EQUITY"}]


@router.post("/stock-data")
async def get_stock_data(request: StockDataRequest):
    try:
        data, info, ts, status, exchange = fetch_stock_data(request.ticker, request.period)
        if data is None or data.empty: raise HTTPException(status_code=404, detail="No data found")

        data_json = [{'date': data.index[i].strftime('%Y-%m-%d'), 'open': float(data['Open'].iloc[i]),
                      'high': float(data['High'].iloc[i]), 'low': float(data['Low'].iloc[i]),
                      'close': float(data['Close'].iloc[i]), 'volume': int(data['Volume'].iloc[i])} for i in
                     range(len(data))]
        current_price = float(data['Close'].iloc[-1])
        change = float(current_price - data['Close'].iloc[-2])

        return {
            "ticker": request.ticker, "name": info.get('longName', request.ticker),
            "currentPrice": current_price, "change": change, "changePercent": (change / data['Close'].iloc[-2]) * 100,
            "currency": info.get('currency', 'USD'), "marketState": status, "exchange": exchange,
            "high_52w": float(data['High'].max()), "low_52w": float(data['Low'].min()),
            "volume": int(data['Volume'].iloc[-1]), "data": data_json
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/news")
async def get_news(request: NewsRequest):
    return {"ticker": request.ticker,
            "articles": fetch_enhanced_news(request.ticker, request.num_articles, request.period)}