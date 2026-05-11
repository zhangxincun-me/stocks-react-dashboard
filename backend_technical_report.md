# 智能股票量化分析后端：核心技术实现报告

## 1. 后端分层架构与模块解耦实现

### 1.1 FastAPI 后端入口设计

后端入口文件为 `backend/main.py`，核心职责是完成 Web 应用实例初始化、跨域配置、路由注册、数据库初始化以及大模型预测器预加载。

系统通过以下方式创建 FastAPI 应用：

```python
app = FastAPI(title="Stock Analysis API", version="1.0.0")
```

后端采用前后端分离模式，前端 React 应用通过 HTTP 请求访问后端接口。为了支持浏览器跨域访问，后端在启动时注册 `CORSMiddleware`，允许前端页面直接调用 API：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

所有业务接口统一挂载到 `/api` 前缀下：

```python
app.include_router(api_router, prefix="/api")
```

启动阶段通过 `startup_event()` 执行两个关键初始化动作：

- 调用 `init_database()` 初始化 DuckDB 本地缓存表。
- 调用 `get_llm_predictor()` 尝试预加载 LLM 预测器。

LLM 加载异常不会阻断服务启动，保证普通行情接口、预测接口、新闻接口仍然可用。

### 1.2 路由总线设计

后端路由总线位于 `backend/api/router.py`。该文件不直接实现业务逻辑，只负责聚合业务子路由：

```python
api_router.include_router(stock.router, tags=["Stock"])
api_router.include_router(forecast.router, tags=["Forecast"])
api_router.include_router(llm.router, prefix="/llm", tags=["LLM"])
```

该设计将接口入口与业务实现解耦，避免所有接口堆叠在 `main.py` 中。新增业务模块时，只需要创建新的 endpoint 文件并在 `router.py` 中注册即可。

### 1.3 四层目录结构

后端采用典型分层结构：

| 目录 | 职责 |
| --- | --- |
| `api/` | API 网关层，负责接收 HTTP 请求、调用业务服务、返回响应 |
| `schemas/` | 数据契约层，负责定义请求体和响应体结构 |
| `services/` | 业务计算层，负责行情获取、技术指标、预测算法、LLM 分析 |
| `db/` | 数据持久层，负责 DuckDB 缓存表初始化、读写和 TTL 判断 |
| `core/` | 配置层，维护数据库路径、缓存时间、市场交易时间 |

整体调用链为：

```text
React 前端
  -> FastAPI 路由
  -> Pydantic 请求解析
  -> API endpoint
  -> services 业务模块
  -> db 缓存模块 / 外部数据源 / 算法模型
  -> JSON 响应
```

### 1.4 业务模块隔离方式

后端没有将股票数据、预测算法和智能分析混在同一个文件中，而是按功能拆分：

- `stock.py` 处理股票搜索、K 线数据和新闻资讯。
- `forecast.py` 处理价格预测。
- `llm.py` 处理 LLM 预测与回测。
- `data_fetcher.py` 处理 BaoStock 数据源、市场状态判断和新闻抓取。
- `technical_calc.py` 处理技术指标和量化特征构建。
- `forecasting.py` 处理多模型预测算法。
- `duckdb_repo.py` 处理缓存持久化。

这种结构使接口层只关心请求和响应，复杂业务全部下沉到 `services/` 与 `db/`。

## 2. API 网关与 Pydantic 数据契约实现

### 2.1 REST API 接口设计

后端核心接口如下：

| 接口 | 方法 | 功能 |
| --- | --- | --- |
| `/api/search` | POST | 股票代码搜索与格式化 |
| `/api/stock-data` | POST | 获取股票历史行情 |
| `/api/news` | POST | 获取财经新闻 |
| `/api/forecast` | POST | 执行价格预测 |
| `/api/llm/predict` | POST | 执行 LLM 智能方向预测 |
| `/api/llm/backtest` | POST | 执行 LLM 历史回测 |

所有接口均使用 POST 传递 JSON 请求体，避免复杂查询参数拼接，并方便前端传递结构化参数。

### 2.2 请求契约定义

请求模型位于 `backend/schemas/request.py`。

```python
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
```

Pydantic 自动完成 JSON 请求体解析和字段类型转换。接口层可以直接通过 `request.ticker`、`request.period`、`request.method` 读取参数，减少手写解析逻辑。

### 2.3 响应契约定义

LLM 模块响应模型位于 `backend/schemas/response.py`：

```python
class LLMPredictionResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
```

LLM 预测和回测接口统一返回：

- `success`：表示调用是否成功。
- `message`：返回成功信息或异常信息。
- `data`：存放预测结果、置信度、情绪因子、技术指标和回测摘要。

这种响应结构能够让前端统一处理成功态与失败态。

### 2.4 Swagger 自动文档

FastAPI 基于路由函数、类型注解和 Pydantic 模型自动生成接口文档。启动服务后可通过 `/docs` 进入 Swagger UI，直接查看接口分组、请求体结构和响应结果。

该机制在联调阶段可以直接替代手写接口文档，前端可以在浏览器中提交测试请求，快速验证参数格式。

## 3. 股票数据获取引擎与行情清洗管道

### 3.1 BaoStock 数据源接入

后端通过 `baostock` 获取 A 股历史 K 线数据，核心逻辑位于 `backend/services/data_fetcher.py`。

查询过程如下：

```python
bs.login()
rs = bs.query_history_k_data_plus(
    bs_ticker,
    "date,open,high,low,close,volume",
    start_date=start_date.strftime('%Y-%m-%d'),
    end_date=end_date.strftime('%Y-%m-%d'),
    frequency="d",
    adjustflag="2"
)
bs.logout()
```

字段覆盖日线行情的核心维度：

- `date`：交易日期
- `open`：开盘价
- `high`：最高价
- `low`：最低价
- `close`：收盘价
- `volume`：成交量

`adjustflag="2"` 表示使用后复权数据，有利于减少分红、拆股等事件对历史价格连续性的影响。

### 3.2 股票代码标准化

BaoStock 要求股票代码带交易所前缀，例如 `sh.600000`、`sz.000001`。用户输入通常可能是纯数字，因此后端实现了代码格式化函数：

```python
def format_baostock_ticker(ticker: str) -> str:
    ticker = ticker.lower().strip()
    if ticker.startswith('sh.') or ticker.startswith('sz.'):
        return ticker
    if ticker.startswith('6'):
        return f"sh.{ticker}"
    elif ticker.startswith('0') or ticker.startswith('3'):
        return f"sz.{ticker}"
    return ticker
```

规则如下：

- `6` 开头：上海证券交易所，自动补全为 `sh.xxxxxx`。
- `0` 或 `3` 开头：深圳证券交易所，自动补全为 `sz.xxxxxx`。
- 已经包含 `sh.` 或 `sz.` 的代码直接返回。

该逻辑降低了前端输入约束，用户输入 `600519` 时后端能够自动转换为 `sh.600519`。

### 3.3 动态时间窗口计算

接口接收 `period` 参数后，后端将周期映射为实际天数：

```python
period_days = {
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '2y': 730,
    '5y': 1825
}.get(period, 3650)
```

之后通过当前日期反推查询起点：

```python
end_date = datetime.now()
start_date = end_date - timedelta(days=period_days)
```

这种实现使前端只需要传入业务周期，不需要手动计算具体日期。

### 3.4 DataFrame 结构化清洗

BaoStock 返回的是行式字符串数据，后端将其转换为 Pandas DataFrame：

```python
df = pd.DataFrame(data_list, columns=rs.fields)
```

随后执行数值字段转换：

```python
for col in ['open', 'high', 'low', 'close', 'volume']:
    df[col] = pd.to_numeric(df[col], errors='coerce')
```

日期字段被转换为时间索引：

```python
df['Date'] = pd.to_datetime(df['date'])
df.set_index('Date', inplace=True)
```

最后统一字段名：

```python
df.rename(
    columns={
        'open': 'Open',
        'high': 'High',
        'low': 'Low',
        'close': 'Close',
        'volume': 'Volume'
    },
    inplace=True
)
```

统一字段名的目的是让后续技术指标模块和预测模块可以使用固定列名，不需要关心原始数据源格式。

### 3.5 行情响应序列化

`/stock-data` 接口将 DataFrame 转换为前端图表可直接使用的数组结构：

```python
data_json = [
    {
        'date': data.index[i].strftime('%Y-%m-%d'),
        'open': float(data['Open'].iloc[i]),
        'high': float(data['High'].iloc[i]),
        'low': float(data['Low'].iloc[i]),
        'close': float(data['Close'].iloc[i]),
        'volume': int(data['Volume'].iloc[i])
    }
    for i in range(len(data))
]
```

接口同时返回当前价格、涨跌额、涨跌幅、52 周最高价、52 周最低价、成交量、交易所、市场状态等摘要字段：

```python
current_price = float(data['Close'].iloc[-1])
change = float(current_price - data['Close'].iloc[-2])
changePercent = (change / data['Close'].iloc[-2]) * 100
```

## 4. 技术指标计算与量化特征工程

### 4.1 RSI 指标实现

RSI 计算位于 `backend/services/technical_calc.py`：

```python
delta = prices.diff()
gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
rs = gain / loss
rsi = 100 - (100 / (1 + rs))
```

RSI 默认周期为 14 日。初始窗口不足产生的缺失值被填充为中性值 50：

```python
return rsi.fillna(50)
```

### 4.2 MACD 指标实现

MACD 通过快慢 EMA 差值计算：

```python
ema_fast = prices.ewm(span=fast).mean()
ema_slow = prices.ewm(span=slow).mean()
macd = ema_fast - ema_slow
signal = macd.ewm(span=signal).mean()
hist = macd - signal
```

最终输出三组数据：

- `macd`：趋势主线
- `macd_signal`：信号线
- `macd_hist`：柱状差值

这些指标被用于增强线性模型和增强 ARIMA 模型。

### 4.3 布林带实现

布林带通过移动均线与标准差构建：

```python
sma = prices.rolling(window=period).mean()
std = prices.rolling(window=period).std()
upper = sma + (std * std_dev)
middle = sma
lower = sma - (std * std_dev)
```

后端进一步构造 `bb_position`：

```python
bb_position = (data['Close'] - bb_lower) / (bb_upper - bb_lower)
```

该值表示当前价格在布林带上下轨之间的位置，可以作为价格偏离程度特征输入模型。

### 4.4 成交量指标实现

成交量指标包括：

- `volume_ma`：成交量 20 日均线
- `vpt`：Volume Price Trend
- `obv`：On-Balance Volume
- `volume_roc`：成交量变化率

核心计算逻辑：

```python
volume_ma = data['Volume'].rolling(window=20).mean()
vpt = (data['Volume'] * data['Close'].pct_change()).cumsum()
obv = (data['Volume'] * np.sign(data['Close'].diff())).cumsum()
volume_roc = data['Volume'].pct_change(periods=10) * 100
```

成交量因子用于描述资金活跃度和价格变化之间的配合关系。

### 4.5 增强特征矩阵构建

`create_enhanced_features()` 将行情、技术指标、动量指标、滞后特征和时间特征整合为一个模型输入矩阵。

基础特征包括：

- `price`
- `volume`
- `high`
- `low`
- `open`
- `rsi`
- `macd`
- `macd_signal`
- `macd_hist`
- `bb_position`
- `atr`
- `sma_5_ratio`
- `sma_10_ratio`
- `sma_20_ratio`
- `sma_50_ratio`
- `momentum_5`
- `momentum_10`
- `momentum_20`
- `volatility`
- `volume_ratio`
- `vpt`
- `obv`
- `volume_roc`

### 4.6 滞后特征构建

后端通过 `shift()` 生成 20 阶历史特征：

```python
for lag in range(1, lookback + 1):
    features[f'price_lag_{lag}'] = data['Close'].shift(lag)
    features[f'volume_lag_{lag}'] = data['Volume'].shift(lag)
    features[f'rsi_lag_{lag}'] = ind['rsi'].shift(lag)
```

滞后特征让普通机器学习模型获得时间序列记忆能力，相当于将过去 N 天的价格、成交量和 RSI 注入当前样本。

### 4.7 缺失值修复

滚动窗口和滞后特征会产生 NaN，后端统一使用：

```python
return features.bfill().ffill()
```

该处理保证增强特征矩阵不包含空值，避免后续 `Ridge`、`SARIMAX`、`SVR` 等模型训练时报错。

## 5. 插拔式预测算法中台设计

### 5.1 算法动态路由分发

预测接口位于 `backend/api/endpoints/forecast.py`。前端通过 `method` 参数选择预测算法，后端使用字典完成动态分发：

```python
method_map = {
    "linear": forecasting.simple_linear_forecast,
    "enhanced_linear": forecasting.enhanced_linear_forecast,
    "polynomial": forecasting.polynomial_forecast,
    "arima": forecasting.arima_forecast,
    "enhanced_arima": forecasting.enhanced_arima_forecast,
    "prophet": forecasting.prophet_forecast,
    "svr": forecasting.svr_forecast,
    "ensemble": forecasting.ensemble_forecast
}
```

若前端传入未知算法，则自动使用移动平均算法：

```python
forecast_func = method_map.get(request.method, forecasting.moving_average_forecast)
```

该方式使预测算法具备插拔能力。新增算法时只需要在 `forecasting.py` 中实现函数，并在 `method_map` 中注册。

### 5.2 线性回归预测

基础线性预测使用 `LinearRegression`：

```python
prices = data['Close'].values
X = np.arange(len(prices)).reshape(-1, 1)
model = LinearRegression().fit(X, prices)
future_X = np.arange(len(prices), len(prices) + days).reshape(-1, 1)
```

模型将时间序号作为自变量，将收盘价作为因变量，预测未来 N 天价格。

### 5.3 多项式回归预测

多项式预测使用 `PolynomialFeatures` 扩展时间序号：

```python
poly = PolynomialFeatures(degree=degree)
X_poly = poly.fit_transform(np.arange(len(prices)).reshape(-1, 1))
model = LinearRegression().fit(X_poly, prices)
```

相比普通线性回归，多项式回归可以拟合一定程度的非线性趋势。

### 5.4 移动平均预测

移动平均作为基础预测和兜底算法：

```python
np.full(days, np.mean(data['Close'].tail(window).values))
```

默认使用最近 20 日收盘均价生成未来价格序列。该算法简单稳定，适合作为复杂模型失败后的降级方案。

### 5.5 ARIMA 时序预测

ARIMA 模型通过遍历参数组合并比较 AIC 选择最优模型：

```python
for p in range(3):
    for d in range(2):
        for q in range(3):
            fitted = ARIMA(prices, order=(p, d, q)).fit()
            if fitted.aic < best_aic:
                best_aic, best_model = fitted.aic, fitted
```

若存在最优模型，则调用：

```python
best_model.forecast(steps=days)
```

当模型拟合失败或没有可用模型时，自动回退到移动平均预测。

### 5.6 SARIMAX 增强预测

增强 ARIMA 使用外生变量：

```python
external_vars = create_enhanced_features(data)[
    ['rsi', 'macd', 'bb_position', 'volume_ratio', 'volatility']
].dropna()
```

随后使用 `SARIMAX` 建模：

```python
SARIMAX(prices, exog=external_vars, order=(p, d, q)).fit(disp=False)
```

预测未来时，后端将最后一行外生变量复制 N 次作为未来 exog：

```python
np.tile(external_vars.iloc[-1:].values, (days, 1))
```

该设计把技术指标注入时间序列模型，使预测不仅依赖历史价格，还能吸收量价和波动特征。

### 5.7 Prophet 预测

Prophet 需要标准字段 `ds` 和 `y`，后端将行情数据转换为：

```python
df = data.reset_index()[['Date', 'Close']].rename(
    columns={'Date': 'ds', 'Close': 'y'}
)
```

随后启用日周期和周周期：

```python
model = Prophet(daily_seasonality=True, weekly_seasonality=True).fit(df)
future = model.make_future_dataframe(periods=days)
```

最终取未来 N 天 `yhat` 作为预测价格。

### 5.8 SVR 非线性预测

SVR 预测使用 RBF 核函数：

```python
model = SVR(kernel='rbf', C=100, gamma=0.1, epsilon=0.1)
```

由于 SVR 对特征尺度敏感，后端分别对输入 X 和输出 y 进行标准化：

```python
scaler_X = StandardScaler()
scaler_y = StandardScaler()
```

预测完成后再进行反标准化，得到真实价格：

```python
scaler_y.inverse_transform(pred.reshape(-1, 1)).flatten()
```

### 5.9 增强线性模型

增强线性模型使用 `create_enhanced_features()` 构建技术特征矩阵，并使用 Ridge 回归训练：

```python
model = Ridge(alpha=1.0).fit(
    scaler_X.fit_transform(X),
    scaler_y.fit_transform(y.values.reshape(-1, 1)).flatten()
)
```

预测未来价格时，模型采用递推方式：

1. 使用最后一行特征预测下一天价格。
2. 将预测价格写回 `last_features['price']`。
3. 平移 `price_lag_n` 特征。
4. 重复执行直到生成完整预测序列。

这种方式让模型具备自回归预测能力，而不是一次性静态外推。

### 5.10 集成预测模型

集成模型同时调用多个基础模型：

```python
forecasts = {
    'linear': simple_linear_forecast(data, days),
    'polynomial': polynomial_forecast(data, days, degree=3),
    'enhanced_linear': enhanced_linear_forecast(data, days),
    'arima': arima_forecast(data, days),
    'prophet': prophet_forecast(data, days)
}
```

权重配置如下：

```python
weights = {
    'linear': 0.15,
    'polynomial': 0.15,
    'enhanced_linear': 0.35,
    'arima': 0.2,
    'prophet': 0.15
}
```

最终结果为多个模型预测值的加权和。增强线性模型权重最高，因为它融合了更多技术指标和滞后特征。

### 5.11 预测曲线断层修复

后端实现了 `normalize_forecast()`：

```python
def normalize_forecast(forecast_prices, last_historical_price):
    if len(forecast_prices) == 0:
        return forecast_prices
    return forecast_prices + (last_historical_price - forecast_prices[0])
```

该函数将预测序列整体平移，使预测首点与历史最后一个收盘价对齐。

如果不做该处理，不同模型预测出来的第一天价格可能与历史收盘价存在明显跳变，前端折线图会出现断层。通过统一平移，预测曲线可以从历史 K 线末端自然延伸。

## 6. LLM 智能分析与情绪因子集成

### 6.1 LLM 单例加载机制

LLM 加载逻辑位于 `backend/services/llm_analyzer.py`：

```python
llm_predictor = None

def get_llm_predictor():
    global llm_predictor
    if llm_predictor is None:
        llm_predictor = LLMStockPredictor()
        try:
            llm_predictor.load_model()
        except Exception as e:
            print(f"Warning: Could not load LLM model: {e}")
            llm_predictor = None
    return llm_predictor
```

该模块使用全局变量保存预测器实例。第一次调用时加载模型，后续请求复用同一个实例，避免每次请求重复加载模型带来的巨大延迟和内存开销。

### 6.2 LLM 预测接口链路

`/api/llm/predict` 的执行流程为：

1. 调用 `get_llm_predictor()` 获取模型实例。
2. 调用 `fetch_stock_data()` 获取最近一个月行情。
3. 将行情列名转换为小写字段。
4. 调用 `calculate_technical_indicators()` 生成技术指标。
5. 调用 `fetch_enhanced_news()` 获取新闻。
6. 调用 `analyze_news_sentiment()` 生成新闻情绪得分。
7. 调用 `predict_direction()` 输出方向和置信度。
8. 使用 `LLMPredictionResponse` 返回结构化结果。

核心调用：

```python
tech_ind = predictor.calculate_technical_indicators(df)
news_sentiment = predictor.analyze_news_sentiment(
    fetch_enhanced_news(request.ticker, 10, "1mo")
)
pred_dir, conf = predictor.predict_direction(
    df['close'].iloc[-1],
    tech_ind,
    news_sentiment,
    df
)
```

### 6.3 LLM 响应结构

接口返回内容包括：

- `ticker`：股票代码
- `prediction`：预测方向
- `confidence`：置信度
- `currentPrice`：当前价格
- `currency`：币种
- `news_sentiment`：新闻情绪因子
- `technical_indicators`：技术指标摘要
- `analysis_summary`：分析摘要

返回示例结构：

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "ticker": "sh.600519",
    "prediction": "up",
    "confidence": 0.73,
    "currentPrice": 1680.5,
    "currency": "CNY",
    "news_sentiment": 0.21,
    "technical_indicators": {
      "rsi": 56.8
    }
  }
}
```

### 6.4 LLM 回测接口

`/api/llm/backtest` 接口通过历史行情与历史新闻执行预测回放：

```python
results = predictor.backtest_predictions(
    df,
    fetch_enhanced_news(request.ticker, 50, request.period),
    request.start_date,
    request.end_date
)
```

回测结束后调用：

```python
summary = predictor.get_prediction_summary(results)
```

并补充预测分布：

```python
prediction_distribution = {
    'up': sum(1 for p in results.predictions if p.predicted_direction == 'up'),
    'down': sum(1 for p in results.predictions if p.predicted_direction == 'down'),
    'neutral': sum(1 for p in results.predictions if p.predicted_direction == 'neutral')
}
```

该接口用于验证 LLM 预测逻辑在历史数据上的表现。

## 7. DuckDB 本地缓存与数据持久化设计

### 7.1 DuckDB 嵌入式缓存选型

后端使用 DuckDB 作为本地缓存数据库，数据库文件为：

```python
DB_PATH = "stock_cache.db"
```

DuckDB 不需要单独启动数据库服务，也不需要网络连接。后端直接通过本地文件完成读写，适合当前项目这种单机部署、读多写少、结构化行情缓存的场景。

### 7.2 缓存表结构

数据库初始化位于 `backend/db/duckdb_repo.py`。

行情缓存表：

```sql
CREATE TABLE IF NOT EXISTS stock_data (
    ticker VARCHAR,
    period VARCHAR,
    data_json TEXT,
    created_at TIMESTAMP,
    market_status VARCHAR,
    exchange VARCHAR,
    PRIMARY KEY (ticker, period)
)
```

搜索缓存表：

```sql
CREATE TABLE IF NOT EXISTS search_cache (
    query VARCHAR,
    ticker VARCHAR,
    company VARCHAR,
    created_at TIMESTAMP,
    PRIMARY KEY (query)
)
```

缓存表使用 `ticker + period` 作为行情主键，同一股票不同周期独立缓存。

### 7.3 搜索结果缓存

`/search` 接口首先查询缓存：

```python
cached = get_search_from_cache(query)
if cached:
    return cached
```

缓存命中条件为 24 小时内有效：

```sql
created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')
```

如果用户搜索的是股票代码，后端会格式化代码并写入缓存：

```python
save_search_to_cache(query, fmt_ticker, result[0]['name'])
```

### 7.4 行情缓存读取

行情数据读取流程：

```python
if not should_refresh_cache(ticker, period, 'stock'):
    cached = get_cached_data(ticker, period, 'stock')
    if cached and 'hist_data' in cached['data']:
        hist = pd.read_json(cached['data']['hist_data'])
        hist.index = pd.to_datetime(hist.index)
        return hist, cached['data']['info'], ...
```

缓存中保存的是 JSON 字符串，读取后重新转换为 DataFrame，并恢复时间索引。

### 7.5 行情缓存写入

写入缓存时，将 DataFrame 和股票信息一起序列化：

```python
data_json = json.dumps({
    'hist_data': data[0].to_json() if data[0] is not None else None,
    'info': data[1]
})
```

写入使用 `INSERT OR REPLACE`：

```sql
INSERT OR REPLACE INTO stock_data
(ticker, period, data_json, created_at, market_status, exchange)
VALUES (?, ?, ?, ?, ?, ?)
```

该方式保证同一股票同一周期只保留最新缓存。

### 7.6 市场状态感知 TTL

缓存刷新逻辑：

```python
if cached_data['market_status'] == 'open':
    return datetime.now() - cached_data['created_at'] > timedelta(
        hours=CACHE_DURATION_HOURS
    )
return datetime.now() - cached_data['created_at'] > timedelta(
    days=CACHE_DURATION_DAYS
)
```

配置项：

```python
CACHE_DURATION_HOURS = 1
CACHE_DURATION_DAYS = 1
```

开盘状态下使用 1 小时缓存，兼顾实时性；休市状态下使用 1 天缓存，减少无意义外部请求。

## 8. 财经资讯获取与降级生成机制

### 8.1 RSS 新闻接入

短周期新闻通过 Yahoo Finance RSS 获取：

```python
url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
```

后端使用 `feedparser` 解析 RSS：

```python
for entry in feedparser.parse(url).entries[:5]:
    articles.append({
        'title': entry.title,
        'description': entry.get('summary', '')[:200],
        'source': "Yahoo Finance",
        'publishedAt': entry.get('published', ...),
        'url': entry.link,
        'article_type': "General News",
        'relevance_score': 10,
        'sentiment': 0.0
    })
```

### 8.2 新闻去重

后端通过 `seen` 集合记录已处理标题：

```python
if entry.title in seen:
    continue
seen.add(entry.title)
```

这样可以避免同一条 RSS 新闻重复返回。

### 8.3 历史新闻生成

长周期查询时，实时 RSS 新闻无法覆盖过去一年、两年或五年的回测区间，因此后端使用模板生成历史新闻：

```python
templates = [
    ("{ticker} Reports Strong Q{quarter} Earnings", "Earnings Analysis", 15),
    ("Analyst Upgrades {ticker} to Buy", "Analyst Rating", 16),
    ("{ticker} Surges on Positive Sentiment", "Price Movement", 12)
]
```

随机生成新闻日期、标题、类型、相关性得分和情绪值，并按发布时间倒序返回。

### 8.4 新闻兜底机制

当 RSS 请求失败或没有抓取到新闻时，接口自动回退到历史新闻生成：

```python
return articles if articles else generate_historical_news(ticker, num_articles, "1y")
```

该机制保证前端新闻模块不会因为外部新闻源异常而空白。

## 9. 全球市场时区识别与交易状态判断

### 9.1 交易所识别

后端通过股票代码判断交易市场：

```python
if ticker_upper.startswith('SH') or ticker_upper.startswith('SZ') or ticker_upper.isdigit():
    return 'CN'
elif ticker_upper.endswith('.L'):
    return 'UK'
elif ticker_upper.endswith(('.T', '.JP')):
    return 'JP'
elif ticker_upper.endswith(('.PA', '.DE', '.AS', '.VI', '.MI', '.MC', '.BR')):
    return 'EU'
return 'US'
```

支持市场包括：

- 中国市场 CN
- 美国市场 US
- 英国市场 UK
- 日本市场 JP
- 欧洲市场 EU

### 9.2 市场时间配置

市场交易时间配置位于 `backend/core/config.py`：

```python
MARKET_HOURS = {
    'US': {'timezone': 'US/Eastern', 'open': '09:30', 'close': '16:00', 'days': [0, 1, 2, 3, 4]},
    'CN': {'timezone': 'Asia/Shanghai', 'open': '09:30', 'close': '15:00', 'days': [0, 1, 2, 3, 4]},
    'UK': {'timezone': 'Europe/London', 'open': '08:00', 'close': '16:30', 'days': [0, 1, 2, 3, 4]},
    'EU': {'timezone': 'Europe/Paris', 'open': '09:00', 'close': '17:30', 'days': [0, 1, 2, 3, 4]},
    'JP': {'timezone': 'Asia/Tokyo', 'open': '09:00', 'close': '15:00', 'days': [0, 1, 2, 3, 4]}
}
```

### 9.3 开闭市状态判断

`is_market_open()` 使用 `pytz` 获取交易所本地时间：

```python
now = datetime.now(pytz.timezone(market_config['timezone']))
```

判断逻辑：

1. 如果当前日期不是交易日，返回休市。
2. 如果当前时间在开盘和收盘之间，返回开盘。
3. 其他情况返回休市。

市场状态会写入缓存，用于后续 TTL 判断。

## 10. 异常处理与容错降级机制

### 10.1 API 层异常封装

`/stock-data` 和 `/forecast` 接口使用 `try-except` 捕获异常，并转换为 HTTP 错误：

```python
except Exception as e:
    raise HTTPException(status_code=400, detail=str(e))
```

当查询不到数据时，接口返回 404：

```python
if data is None or data.empty:
    raise HTTPException(status_code=404, detail="No data found")
```

### 10.2 数据源异常处理

行情数据获取失败时，`fetch_stock_data()` 抛出明确错误：

```python
raise HTTPException(status_code=400, detail=f"Error fetching data: {str(e)}")
```

同时在异常分支调用 `bs.logout()`，避免 BaoStock 会话异常残留。

### 10.3 缓存异常容错

缓存读取、写入和 TTL 判断均被 `try-except` 包裹：

```python
except Exception:
    return None
```

或：

```python
except Exception:
    return True
```

当缓存模块异常时，系统默认认为缓存需要刷新，转而请求外部数据源，避免缓存错误直接导致接口不可用。

### 10.4 算法异常降级

预测模块中的复杂算法均带有降级策略：

- ARIMA 失败后回退到移动平均。
- Prophet 失败后回退到移动平均。
- SVR 失败后回退到移动平均。
- Enhanced Linear 样本不足时回退到普通线性回归。
- Enhanced ARIMA 样本不足时回退到普通 ARIMA。
- Ensemble 失败时回退到增强线性模型。

例如：

```python
except:
    return moving_average_forecast(data, days)
```

这种设计保证预测接口不会因为某个模型拟合失败而整体崩溃。

### 10.5 LLM 加载失败容错

LLM 模型加载失败时，`get_llm_predictor()` 返回 `None`，接口层检测后返回结构化失败响应：

```python
if not predictor:
    raise Exception("LLM predictor not loaded")
```

最终响应：

```python
return LLMPredictionResponse(success=False, message=str(e))
```

这样不会影响其他非 LLM 接口。

## 11. 后端运行与部署实现

### 11.1 Python 依赖管理

后端依赖定义于 `backend/requirements.txt`，核心依赖包括：

- `fastapi`：Web API 框架
- `uvicorn`：ASGI 服务运行器
- `baostock`：A 股行情数据源
- `pandas`、`numpy`：数据清洗与向量化计算
- `duckdb`：嵌入式缓存数据库
- `scikit-learn`：线性回归、Ridge、SVR、标准化处理
- `statsmodels`：ARIMA、SARIMAX
- `prophet`：时间序列预测
- `feedparser`：RSS 新闻解析
- `transformers`、`torch`：LLM 模型推理基础依赖

### 11.2 本地启动方式

根目录 `package.json` 提供后端启动脚本：

```json
"start:backend": "cd backend && python main.py"
```

`main.py` 中使用 Uvicorn 启动服务：

```python
uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

服务默认监听端口 `8000`。

### 11.3 Docker 构建方式

后端提供 `backend/Dockerfile`：

```dockerfile
FROM python:3.9-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]
```

镜像构建流程：

1. 使用 `python:3.9-slim` 作为基础镜像。
2. 安装 `gcc`、`g++` 以支持部分 Python 科学计算依赖编译。
3. 安装 `requirements.txt` 中的依赖。
4. 拷贝后端代码。
5. 暴露 `8000` 端口。
6. 运行 `python main.py` 启动服务。

### 11.4 Docker Compose 联合运行

项目根目录提供 `docker-compose.yml`，包含 `backend` 和 `frontend` 两个服务。

后端服务构建路径：

```yaml
backend:
  build: ./backend
  ports:
    - "8000:8000"
  environment:
    - PYTHONUNBUFFERED=1
  volumes:
    - ./backend:/app
```

前端通过环境变量指定后端地址：

```yaml
REACT_APP_API_URL=http://localhost:8000
```

该配置支持前后端容器化联调。

## 12. 工程痛点与实现方案

### 12.1 外部行情接口请求压力

问题：股票行情接口如果每次请求都直接访问 BaoStock，会产生大量重复请求，接口响应速度慢，也容易受到外部服务限制。

实现方案：

- 使用 DuckDB 缓存行情数据。
- 以 `ticker + period` 作为缓存主键。
- 开盘期间设置小时级 TTL。
- 休市期间设置天级 TTL。
- 缓存命中时直接反序列化为 DataFrame 返回。

### 12.2 不同模型预测曲线起点不连续

问题：线性回归、SVR、Prophet、ARIMA 等模型预测的第一个未来值不一定等于历史最后收盘价，前端绘图时会出现明显跳变。

实现方案：

- 所有预测模型统一调用 `normalize_forecast()`。
- 计算 `last_historical_price - forecast_prices[0]`。
- 将预测序列整体平移。
- 保证预测曲线从历史曲线末端自然延伸。

### 12.3 高级预测模型稳定性不足

问题：ARIMA、SARIMAX、Prophet、SVR 对数据质量和样本数量敏感，数据过短或异常时容易训练失败。

实现方案：

- 每个模型内部单独捕获异常。
- 样本不足时提前回退。
- 复杂模型失败时回退到基础模型。
- 最底层使用移动平均保证稳定输出。

### 12.4 技术指标空值影响模型训练

问题：RSI、MACD、布林带、移动均线、滞后特征都会在序列前段产生 NaN。

实现方案：

- 特征构建完成后统一执行 `bfill().ffill()`。
- 保证训练矩阵不含空值。
- 避免 Scikit-learn 和 Statsmodels 因 NaN 抛出异常。

### 12.5 LLM 模型加载成本高

问题：大模型加载耗时长、占用内存高，如果每次请求都加载模型，会严重拖慢接口响应。

实现方案：

- 使用全局单例保存 `LLMStockPredictor`。
- 启动阶段尝试预加载。
- 请求阶段复用已加载实例。
- 加载失败只影响 LLM 接口，不影响行情和预测主流程。

### 12.6 新闻源不稳定

问题：RSS 新闻源可能请求失败，或者某些股票没有实时新闻。

实现方案：

- RSS 请求异常时直接降级。
- 无新闻结果时调用 `generate_historical_news()`。
- 长周期分析直接使用历史新闻生成逻辑。
- 保证 `/news` 和 `/llm/backtest` 有稳定输入。

## 13. 后端核心技术闭环

该后端形成了完整的量化分析闭环：

```text
股票代码输入
  -> 代码标准化
  -> DuckDB 缓存判断
  -> BaoStock 行情拉取
  -> Pandas 清洗
  -> 技术指标计算
  -> 多模型预测
  -> 新闻情绪分析
  -> LLM 方向判断
  -> JSON 响应前端
```

核心工程实现集中在四个方向：

- 数据层：BaoStock 拉取行情，DuckDB 本地缓存，市场状态感知 TTL。
- 特征层：Pandas 滚动窗口、技术指标、滞后特征、缺失值修复。
- 算法层：Linear、Polynomial、ARIMA、SARIMAX、Prophet、SVR、Ensemble 多模型动态调度。
- 服务层：FastAPI 路由网关、Pydantic 契约校验、HTTPException 异常封装、LLM 单例推理。

整套后端的重点不是单一算法，而是将行情获取、缓存、特征工程、预测模型、新闻情绪和智能分析组合成可被前端稳定调用的 API 服务。
