# 📈 Stock Analysis Dashboard - React Edition

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.0-green.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-38B2AC.svg)](https://tailwindcss.com/)

A modern, responsive stock analysis and forecasting dashboard built with React and FastAPI. This is a React-based clone of the original Streamlit application with enhanced UI/UX and better performance.

## 🚀 Features

- **📈 Interactive Stock Charts**: Real-time stock price visualization with candlestick charts and moving averages
- **🔮 Advanced Forecasting**: Multiple forecasting algorithms including:
  - Linear Regression
  - Polynomial Regression
  - Moving Average
  - ARIMA
  - Facebook Prophet
  - Support Vector Regression
- **📰 Real-time News**: Latest news articles related to selected stocks
- **🎨 Modern Dark Theme**: Beautiful, responsive UI with Tailwind CSS
- **📊 Key Metrics**: Current price, 52-week high/low, volume, and forecast predictions
- **🔍 Smart Search**: Search by ticker symbol or company name with autocomplete
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Chart.js
- **Backend**: FastAPI + Python 3.8+
- **Data Source**: Yahoo Finance (yfinance)
- **Caching**: DuckDB for efficient data caching
- **Charts**: Chart.js with react-chartjs-2

## 📦 Installation

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- pip

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 🚀 Quick Start

1. **Start the backend server** (from the `backend` directory):
```bash
python main.py
```

2. **Start the frontend development server** (from the `frontend` directory):
```bash
npm start
```

3. **Open your browser** and navigate to `http://localhost:3000`

4. **Search for a stock** using the search bar or click on popular stocks

5. **Explore the features**:
   - View interactive price charts
   - Switch between different forecasting methods
   - Read the latest news
   - Analyze key metrics

## 📊 API Endpoints

The FastAPI backend provides the following endpoints:

- `POST /api/search` - Search for stock tickers
- `POST /api/stock-data` - Get stock data and metrics
- `POST /api/forecast` - Get price forecasts
- `POST /api/news` - Get news articles
- `GET /api/health` - Health check

## 🎨 UI Components

- **StockSearch**: Smart search with autocomplete and popular stocks
- **StockChart**: Interactive price charts with moving averages
- **ForecastChart**: Forecast visualization with multiple algorithms
- **StockMetrics**: Key performance indicators
- **NewsSection**: News articles with external links

## 🔧 Configuration

### Backend Configuration

- **Cache Duration**: Modify `CACHE_DURATION_HOURS` and `CACHE_DURATION_DAYS` in `main.py`
- **Market Hours**: Update `MARKET_HOURS` for different exchanges
- **API Rate Limits**: Adjust timeout and retry settings

### Frontend Configuration

- **API Base URL**: Update `API_BASE_URL` in `src/services/api.ts`
- **Theme Colors**: Modify `tailwind.config.js` for custom colors
- **Chart Options**: Customize chart appearance in component files

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full-featured experience with sidebar and main content
- **Tablet**: Optimized layout with collapsible sidebar
- **Mobile**: Stacked layout with touch-friendly controls

## 🚀 Deployment

### Backend Deployment

1. **Using Docker**:
```bash
# Create Dockerfile in backend directory
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

2. **Using cloud platforms**:
   - Heroku
   - Railway
   - DigitalOcean App Platform
   - AWS Elastic Beanstalk

### Frontend Deployment

1. **Build for production**:
```bash
npm run build
```

2. **Deploy to**:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages

## 🔍 Development

### Project Structure

```
Stocks-React/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── stock_cache.db      # DuckDB cache (auto-created)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── types.ts         # TypeScript types
│   │   └── App.tsx          # Main app component
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

### Adding New Features

1. **New Forecasting Method**:
   - Add function in `backend/main.py`
   - Update frontend dropdown options
   - Add method to API service

2. **New Chart Type**:
   - Create new component in `src/components/`
   - Import Chart.js plugins as needed
   - Add to main App component

3. **New Data Source**:
   - Add API endpoint in `backend/main.py`
   - Create service function in `src/services/api.ts`
   - Update types in `src/types.ts`

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend is running on port 8000 and frontend on port 3000
2. **Chart Not Rendering**: Check if Chart.js plugins are properly registered
3. **API Timeout**: Increase timeout in `src/services/api.ts`
4. **Build Errors**: Clear node_modules and reinstall dependencies

### Debug Mode

Enable debug logging by setting environment variables:
```bash
# Backend
export DEBUG=1
python main.py

# Frontend
export REACT_APP_DEBUG=1
npm start
```

## 📄 License

This project is for educational and informational purposes only. Stock market investments carry risk, and past performance does not guarantee future results. Always consult with a financial advisor before making investment decisions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed description

---

**Note**: This application is for educational purposes only. Always verify data accuracy and consult financial professionals before making investment decisions.

