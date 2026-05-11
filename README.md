# 智能股票量化分析仪表盘

这是一个前后端分离的股票分析系统。前端使用 React 构建可视化看板，后端使用 FastAPI 提供股票数据、行情图表、技术指标、价格预测、新闻资讯和 LLM 智能分析接口。

项目主要面向股票数据分析、量化预测演示和课程设计场景。系统支持 A 股代码输入，后端会自动转换为 BaoStock 所需格式，例如 `600519` 会转换为 `sh.600519`，`000001` 会转换为 `sz.000001`。

## 功能特性

- 股票搜索：支持股票代码搜索与 A 股代码自动格式化。
- 行情展示：获取历史 K 线数据，包括开盘价、最高价、最低价、收盘价和成交量。
- 指标统计：展示当前价格、涨跌额、涨跌幅、区间最高价、区间最低价和成交量。
- 价格预测：支持多种预测算法，包括线性回归、多项式回归、ARIMA、增强 ARIMA、Prophet、SVR 和集成模型。
- 技术指标：后端计算 RSI、MACD、布林带、ATR、动量、波动率、成交量指标和滞后特征。
- 新闻资讯：通过 RSS 获取财经新闻，长周期分析时可生成历史新闻数据作为兜底。
- LLM 分析：支持基于技术指标和新闻情绪的智能方向预测与历史回测。
- 本地缓存：使用 DuckDB 缓存股票行情和搜索结果，减少重复请求。
- 市场状态识别：根据不同交易所时区判断开盘、休市状态，并动态控制缓存 TTL。

## 技术栈

### 前端

| 技术 | 说明 |
| --- | --- |
| React | 前端 UI 框架 |
| TypeScript | 类型约束 |
| Tailwind CSS | 样式框架 |
| Chart.js | 股票图表和预测图表 |
| react-chartjs-2 | Chart.js 的 React 封装 |
| Axios | HTTP 请求客户端 |
| lucide-react | 图标库 |

### 后端

| 技术 | 说明 |
| --- | --- |
| FastAPI | Web API 框架 |
| Uvicorn | ASGI 服务运行器 |
| BaoStock | A 股历史行情数据源 |
| Pandas / NumPy | 数据清洗和向量化计算 |
| DuckDB | 本地嵌入式缓存数据库 |
| Scikit-learn | 线性回归、Ridge、SVR、标准化处理 |
| Statsmodels | ARIMA、SARIMAX 时序模型 |
| Prophet | 时间序列预测 |
| Feedparser | RSS 财经新闻解析 |
| Transformers / PyTorch | LLM 推理相关依赖 |

## 项目结构

```text
stocks-react-dashboard/
├── backend/
│   ├── api/
│   │   ├── router.py
│   │   └── endpoints/
│   │       ├── stock.py
│   │       ├── forecast.py
│   │       └── llm.py
│   ├── core/
│   │   └── config.py
│   ├── db/
│   │   └── duckdb_repo.py
│   ├── schemas/
│   │   ├── request.py
│   │   └── response.py
│   ├── services/
│   │   ├── data_fetcher.py
│   │   ├── forecasting.py
│   │   ├── llm_analyzer.py
│   │   └── technical_calc.py
│   ├── main.py
│   ├── test.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StockSearch.tsx
│   │   │   ├── StockChart.tsx
│   │   │   ├── StockMetrics.tsx
│   │   │   ├── ForecastChart.tsx
│   │   │   ├── NewsSection.tsx
│   │   │   └── LLMPrediction.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── types.ts
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml
├── package.json
├── start.sh
└── README.md
```

## 后端架构说明

后端采用分层结构：

| 层级 | 目录 | 作用 |
| --- | --- | --- |
| API 网关层 | `backend/api/` | 接收 HTTP 请求，调用业务服务，返回 JSON |
| 数据契约层 | `backend/schemas/` | 定义请求体和响应体结构 |
| 业务服务层 | `backend/services/` | 处理行情获取、新闻抓取、指标计算、预测算法和 LLM 分析 |
| 数据缓存层 | `backend/db/` | 管理 DuckDB 缓存表、缓存读取、缓存写入和 TTL 判断 |
| 配置层 | `backend/core/` | 管理数据库路径、缓存时间、交易市场时间配置 |

请求处理流程：

```text
前端 React 页面
  -> Axios 请求
  -> FastAPI 路由
  -> Pydantic 参数解析
  -> Service 业务逻辑
  -> DuckDB 缓存 / BaoStock 数据源 / 预测模型 / LLM 模型
  -> JSON 响应
```

## 环境要求

- Node.js 16 或更高版本
- Python 3.8 或更高版本
- pip
- npm

建议使用 Python 虚拟环境安装后端依赖，避免污染全局环境。

## 本地运行

### 1. 安装后端依赖

Windows PowerShell：

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS / Linux：

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动后端服务

在项目根目录执行：

```bash
python -m backend.main
```

后端默认运行在：

```text
http://localhost:8000
```

接口文档地址：

```text
http://localhost:8000/docs
```

### 3. 安装前端依赖

打开新的终端窗口，在项目根目录执行：

```bash
cd frontend
npm install
```

### 4. 启动前端页面

```bash
npm start
```

前端默认运行在：

```text
http://localhost:3000
```

## 根目录脚本

项目根目录的 `package.json` 提供了常用脚本：

```bash
npm run install:backend
npm run install:frontend
npm run install:all
npm run start:backend
npm run start:frontend
npm run dev
```

其中：

- `npm run start:backend`：执行 `python -m backend.main`。
- `npm run start:frontend`：进入 `frontend` 并执行 `npm start`。
- `npm run dev`：同时启动前端和后端。

如果使用 Windows PowerShell，`start.sh` 不是最推荐的启动方式，建议按上面的手动步骤分别启动后端和前端。

## Docker 运行

项目提供了 `docker-compose.yml`，可以使用：

```bash
docker-compose up --build
```

Docker 会运行分层后的后端入口 `python -m backend.main`。

## API 接口

### 股票搜索

```http
POST /api/search
```

请求示例：

```json
{
  "query": "600519"
}
```

功能说明：

- 去除输入首尾空格。
- 自动识别 A 股代码。
- 使用 DuckDB 缓存搜索结果。

### 股票行情

```http
POST /api/stock-data
```

请求示例：

```json
{
  "ticker": "sh.600519",
  "period": "1y"
}
```

支持周期：

```text
1mo, 3mo, 6mo, 1y, 2y, 5y
```

返回内容包括：

- 股票代码
- 股票名称
- 当前价格
- 涨跌额
- 涨跌幅
- 最高价
- 最低价
- 成交量
- 市场状态
- K 线数组

### 价格预测

```http
POST /api/forecast
```

请求示例：

```json
{
  "ticker": "sh.600519",
  "period": "1y",
  "forecast_days": 30,
  "method": "enhanced_linear"
}
```

支持算法：

| method | 说明 |
| --- | --- |
| `linear` | 线性回归 |
| `enhanced_linear` | 基于技术指标和滞后特征的增强线性模型 |
| `polynomial` | 多项式回归 |
| `arima` | ARIMA 时间序列模型 |
| `enhanced_arima` | 使用外生技术指标的 SARIMAX 模型 |
| `prophet` | Prophet 时间序列模型 |
| `svr` | 支持向量回归 |
| `ensemble` | 多模型加权集成 |

### 新闻资讯

```http
POST /api/news
```

请求示例：

```json
{
  "ticker": "sh.600519",
  "num_articles": 5,
  "period": "1y"
}
```

功能说明：

- 短周期优先读取 RSS 财经新闻。
- 长周期使用历史新闻生成逻辑。
- RSS 请求失败时自动使用兜底新闻数据。

### LLM 智能预测

```http
POST /api/llm/predict
```

请求示例：

```json
{
  "ticker": "sh.600519",
  "period": "1mo"
}
```

功能说明：

- 获取最近行情数据。
- 计算技术指标。
- 分析新闻情绪。
- 输出上涨、下跌或中性方向预测。
- 返回预测置信度。

### LLM 历史回测

```http
POST /api/llm/backtest
```

请求示例：

```json
{
  "ticker": "sh.600519",
  "period": "1y",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

功能说明：

- 基于历史行情执行方向预测回放。
- 输出预测分布、平均置信度和回测摘要。

## 缓存机制

后端使用 DuckDB 作为本地缓存数据库，默认数据库文件为：

```text
stock_cache.db
```

缓存表包括：

| 表名 | 说明 |
| --- | --- |
| `stock_data` | 缓存股票行情数据 |
| `earnings_data` | 预留财报数据缓存 |
| `search_cache` | 缓存股票搜索结果 |

缓存刷新策略：

- 开盘期间：缓存 1 小时。
- 休市期间：缓存 1 天。
- 搜索结果：缓存 24 小时。

市场状态通过 `backend/core/config.py` 中的交易时间配置判断。

## 预测算法说明

后端预测算法集中在 `backend/services/forecasting.py`。

所有预测结果都会经过 `normalize_forecast()` 修正，使预测曲线的起点对齐历史最后一个收盘价，避免前端图表出现明显断层。

复杂模型均带有异常降级逻辑：

- ARIMA 失败时回退到移动平均。
- Prophet 失败时回退到移动平均。
- SVR 失败时回退到移动平均。
- 增强线性模型样本不足时回退到普通线性回归。
- 增强 ARIMA 样本不足时回退到普通 ARIMA。

## 常见问题

### 1. 后端启动时报错 `ModuleNotFoundError`

先确认已经安装后端依赖：

```bash
cd backend
pip install -r requirements.txt
```

### 2. 前端提示无法连接后端

检查后端是否运行在：

```text
http://localhost:8000
```

前端请求地址配置在：

```text
frontend/src/services/api.ts
```

默认值为：

```ts
const API_BASE_URL = 'http://localhost:8000';
```

### 3. 端口被占用

后端默认端口是 `8000`，前端默认端口是 `3000`。如果端口被占用，可以先关闭占用进程，或者修改对应启动配置。

### 4. LLM 功能不可用

LLM 模型加载失败不会影响普通股票行情和预测接口。若只需要行情、新闻和传统预测算法，可以忽略 LLM 加载失败信息。

### 5. 股票没有数据

可能原因：

- 股票代码格式不正确。
- BaoStock 数据源暂时不可用。
- 查询周期内没有交易数据。
- 输入的是非 A 股代码，但当前后端主要按 BaoStock 数据源处理。

## 开发说明

### 新增预测算法

1. 在 `backend/services/forecasting.py` 中新增预测函数。
2. 在 `backend/api/endpoints/forecast.py` 的 `method_map` 中注册方法名。
3. 在前端预测方法下拉选择中增加对应选项。

### 新增接口

1. 在 `backend/api/endpoints/` 下创建新的接口文件。
2. 在 `backend/api/router.py` 中注册路由。
3. 如需请求或响应结构，优先在 `backend/schemas/` 中定义 Pydantic 模型。

### 新增前端组件

1. 在 `frontend/src/components/` 下创建组件。
2. 在 `frontend/src/App.tsx` 中引入并挂载。
3. 如需请求后端接口，在 `frontend/src/services/api.ts` 中封装 Axios 方法。

## 相关文档

项目中已生成后端技术报告：

```text
backend_technical_report.md
```

该文档详细说明了后端架构、数据获取、技术指标、预测算法、LLM 分析、DuckDB 缓存和异常降级设计。

## 免责声明

本项目仅用于学习、课程设计和技术演示，不构成任何投资建议。股票市场存在风险，预测结果仅供参考，不能作为真实交易依据。
