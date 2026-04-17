import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import duckdb
from backend.core.config import DB_PATH, CACHE_DURATION_HOURS, CACHE_DURATION_DAYS


def init_database():
    try:
        conn = duckdb.connect(DB_PATH)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS stock_data (ticker VARCHAR, period VARCHAR, data_json TEXT, created_at TIMESTAMP, market_status VARCHAR, exchange VARCHAR, PRIMARY KEY (ticker, period))")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS earnings_data (ticker VARCHAR, period VARCHAR, data_json TEXT, created_at TIMESTAMP, market_status VARCHAR, exchange VARCHAR, PRIMARY KEY (ticker, period))")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS search_cache (query VARCHAR, ticker VARCHAR, company VARCHAR, created_at TIMESTAMP, PRIMARY KEY (query))")
        conn.close()
        return True
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        return False


def get_search_from_cache(query: str) -> Optional[Dict[str, str]]:
    try:
        conn = duckdb.connect(DB_PATH)
        result = conn.execute(
            "SELECT ticker, company FROM search_cache WHERE query = ? AND created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')",
            [query.lower()]).fetchone()
        conn.close()
        if result: return [{"ticker": result[0], "name": result[1], "exchange": "Unknown", "type": "EQUITY"}]
        return None
    except Exception:
        return None


def save_search_to_cache(query: str, ticker: str, company: str) -> bool:
    try:
        conn = duckdb.connect(DB_PATH)
        conn.execute(
            "INSERT OR REPLACE INTO search_cache (query, ticker, company, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
            [query.lower(), ticker, company])
        conn.close()
        return True
    except Exception:
        return False


def get_cached_data(ticker: str, period: str, data_type: str = 'stock') -> Optional[Dict[str, Any]]:
    try:
        conn = duckdb.connect(DB_PATH)
        table_name = 'stock_data' if data_type == 'stock' else 'earnings_data'
        result = conn.execute(
            f"SELECT data_json, created_at, market_status, exchange FROM {table_name} WHERE ticker = ? AND period = ? ORDER BY created_at DESC LIMIT 1",
            [ticker, period]).fetchone()
        conn.close()
        if result:
            return {'data': json.loads(result[0]), 'created_at': result[1], 'market_status': result[2],
                    'exchange': result[3]}
        return None
    except Exception:
        return None


def cache_data(ticker: str, period: str, data: Any, data_type: str = 'stock', market_status: str = 'unknown',
               exchange: str = 'US'):
    try:
        conn = duckdb.connect(DB_PATH)
        table_name = 'stock_data' if data_type == 'stock' else 'earnings_data'
        if data_type == 'stock' and data is not None:
            if isinstance(data, tuple) and len(data) == 2:
                data_json = json.dumps(
                    {'hist_data': data[0].to_json() if data[0] is not None else None, 'info': data[1]})
            else:
                data_json = json.dumps(data)
        else:
            data_json = json.dumps(data)

        conn.execute(
            f"INSERT OR REPLACE INTO {table_name} (ticker, period, data_json, created_at, market_status, exchange) VALUES (?, ?, ?, ?, ?, ?)",
            [ticker, period, data_json, datetime.now(), market_status, exchange])
        conn.close()
        return True
    except Exception:
        return False


def should_refresh_cache(ticker: str, period: str, data_type: str = 'stock') -> bool:
    try:
        cached_data = get_cached_data(ticker, period, data_type)
        if not cached_data: return True
        if cached_data['market_status'] == 'open': return datetime.now() - cached_data['created_at'] > timedelta(
            hours=CACHE_DURATION_HOURS)
        return datetime.now() - cached_data['created_at'] > timedelta(days=CACHE_DURATION_DAYS)
    except Exception:
        return True