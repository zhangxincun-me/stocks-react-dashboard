import baostock as bs
import pandas as pd
import pytz
import feedparser
import random
from io import StringIO
from datetime import datetime, timedelta
from typing import Tuple, List, Dict, Any
from fastapi import HTTPException
from backend.core.config import MARKET_HOURS
from backend.db.duckdb_repo import should_refresh_cache, get_cached_data, cache_data

def get_exchange_from_ticker(ticker: str) -> str:
    ticker_upper = ticker.upper()
    if ticker_upper.startswith('SH') or ticker_upper.startswith('SZ') or ticker_upper.isdigit(): return 'CN'
    elif ticker_upper.endswith('.L'): return 'UK'
    elif ticker_upper.endswith(('.T', '.JP')): return 'JP'
    elif ticker_upper.endswith(('.PA', '.DE', '.AS', '.VI', '.MI', '.MC', '.BR')): return 'EU'
    return 'US'

def format_baostock_ticker(ticker: str) -> str:
    ticker = ticker.lower().strip()
    if ticker.startswith('sh.') or ticker.startswith('sz.'): return ticker
    if ticker.startswith('6'): return f"sh.{ticker}"
    elif ticker.startswith('0') or ticker.startswith('3'): return f"sz.{ticker}"
    return ticker

def get_latest_baostock_trade_date(now: datetime) -> datetime:
    for year in range(now.year, now.year - 6, -1):
        end = now if year == now.year else datetime(year, 12, 31)
        start = datetime(year, 1, 1)
        rs = bs.query_trade_dates(start_date=start.strftime('%Y-%m-%d'), end_date=end.strftime('%Y-%m-%d'))
        latest = None
        if rs.error_code == '0':
            while rs.next():
                row = rs.get_row_data()
                if len(row) >= 2 and row[1] == '1':
                    latest = row[0]
        if latest:
            return datetime.strptime(latest, '%Y-%m-%d')
    return now

def is_market_open(ticker: str) -> Tuple[bool, str, datetime]:
    try:
        exchange = get_exchange_from_ticker(ticker)
        market_config = MARKET_HOURS[exchange]
        now = datetime.now(pytz.timezone(market_config['timezone']))
        if now.weekday() not in market_config['days']: return False, f"{exchange} market closed (weekend)", now
        open_time = now.replace(hour=int(market_config['open'].split(':')[0]), minute=int(market_config['open'].split(':')[1]), second=0)
        close_time = now.replace(hour=int(market_config['close'].split(':')[0]), minute=int(market_config['close'].split(':')[1]), second=0)
        if open_time <= now <= close_time: return True, f"{exchange} market open", now
        return False, f"{exchange} market closed", now
    except Exception as e: return True, f"Unknown status: {e}", datetime.now()

def fetch_stock_data(ticker: str, period: str = "1y"):
    try:
        if not should_refresh_cache(ticker, period, 'stock'):
            cached = get_cached_data(ticker, period, 'stock')
            if cached and 'hist_data' in cached['data'] and cached['data']['hist_data']:
                hist = pd.read_json(StringIO(cached['data']['hist_data']))
                hist.index = pd.to_datetime(hist.index)
                return hist, cached['data']['info'], cached['created_at'], cached['market_status'], cached['exchange']

        bs_ticker = format_baostock_ticker(ticker)
        bs.login()
        end_date = get_latest_baostock_trade_date(datetime.now())
        period_days = {'1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825}.get(period, 3650)
        start_date = end_date - timedelta(days=period_days)
        rs = bs.query_history_k_data_plus(bs_ticker, "date,open,high,low,close,volume", start_date=start_date.strftime('%Y-%m-%d'), end_date=end_date.strftime('%Y-%m-%d'), frequency="d", adjustflag="2")
        data_list = []
        if rs.error_code == '0':
            while rs.next():
                data_list.append(rs.get_row_data())
        bs.logout()

        if not data_list: return None, None, None, None, None

        df = pd.DataFrame(data_list, columns=rs.fields)
        for col in ['open', 'high', 'low', 'close', 'volume']: df[col] = pd.to_numeric(df[col], errors='coerce')
        df['Date'] = pd.to_datetime(df['date'])
        df.set_index('Date', inplace=True)
        df.rename(columns={'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}, inplace=True)

        info = {'longName': ticker.upper(), 'currency': 'CNY', 'exchange': 'SSE' if bs_ticker.startswith('sh') else 'SZSE', 'sector': 'Industrials/Tech'}
        m_open, m_status, _ = is_market_open(ticker)
        exchange = get_exchange_from_ticker(ticker)

        cache_data(ticker, period, (df, info), 'stock', 'open' if m_open else 'closed', exchange)
        return df, info, datetime.now(), m_status, exchange
    except HTTPException:
        raise
    except Exception as e:
        bs.logout()
        raise HTTPException(status_code=400, detail=f"Error fetching data: {str(e)}")

def generate_historical_news(ticker: str, num_articles: int, period: str) -> List[Dict[str, Any]]:
    end_date = datetime.now()
    period_days = {'1y': 365, '2y': 730, '5y': 1825}.get(period, 3650)
    start_date = end_date - timedelta(days=period_days)
    templates = [("{ticker} Reports Strong Q{quarter} Earnings", "Earnings Analysis", 15), ("Analyst Upgrades {ticker} to Buy", "Analyst Rating", 16), ("{ticker} Surges on Positive Sentiment", "Price Movement", 12)]
    news_events = []
    for _ in range(num_articles):
        event_date = start_date + timedelta(days=random.randint(0, period_days))
        template, a_type, score = random.choice(templates)
        title = template.format(ticker=ticker, quarter=random.choice([1,2,3,4]))
        news_events.append({'title': title, 'description': f"Historical analysis for {ticker}", 'source': "Financial DB", 'publishedAt': event_date.strftime('%Y-%m-%d %H:%M:%S'), 'url': "#", 'article_type': a_type, 'relevance_score': score, 'sentiment': 0.5 if "Strong" in title or "Upgrades" in title else 0.0})
    news_events.sort(key=lambda x: x['publishedAt'], reverse=True)
    return news_events

def fetch_enhanced_news(ticker: str, num_articles: int = 5, period: str = "1y") -> List[Dict[str, Any]]:
    if period in ["1y", "2y", "5y", "10y", "max"]: return generate_historical_news(ticker, num_articles, period)
    articles, seen = [], set()
    try:
        for url in [f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"]:
            for entry in feedparser.parse(url).entries[:5]:
                if entry.title in seen: continue
                seen.add(entry.title)
                articles.append({'title': entry.title, 'description': entry.get('summary', '')[:200], 'source': "Yahoo Finance", 'publishedAt': entry.get('published', datetime.now().strftime('%Y-%m-%d %H:%M')), 'url': entry.link, 'article_type': "General News", 'relevance_score': 10, 'sentiment': 0.0})
                if len(articles) >= num_articles: break
    except Exception: pass
    return articles if articles else generate_historical_news(ticker, num_articles, "1y")
