# 数据库与缓存配置
DB_PATH = "stock_cache.db"
CACHE_DURATION_HOURS = 1
CACHE_DURATION_DAYS = 1

# 全球交易市场时间配置
MARKET_HOURS = {
    'US': {'timezone': 'US/Eastern', 'open': '09:30', 'close': '16:00', 'days': [0, 1, 2, 3, 4]},
    'CN': {'timezone': 'Asia/Shanghai', 'open': '09:30', 'close': '15:00', 'days': [0, 1, 2, 3, 4]},
    'UK': {'timezone': 'Europe/London', 'open': '08:00', 'close': '16:30', 'days': [0, 1, 2, 3, 4]},
    'EU': {'timezone': 'Europe/Paris', 'open': '09:00', 'close': '17:30', 'days': [0, 1, 2, 3, 4]},
    'JP': {'timezone': 'Asia/Tokyo', 'open': '09:00', 'close': '15:00', 'days': [0, 1, 2, 3, 4]}
}