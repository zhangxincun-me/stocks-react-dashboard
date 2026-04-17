# 🚀 Quick Start Guide

Get the Stock Analysis Dashboard running in under 5 minutes!

## Prerequisites

- **Node.js 16+** - [Download here](https://nodejs.org/)
- **Python 3.8+** - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)

## Option 1: One-Command Setup (Recommended)

```bash
# Clone and start everything
git clone <your-repo-url>
cd Stocks-React
./start.sh
```

That's it! The script will:
- ✅ Set up Python virtual environment
- ✅ Install all dependencies
- ✅ Start both backend and frontend
- ✅ Open your browser to http://localhost:3000

## Option 2: Manual Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python test.py
```

### Frontend Setup (in new terminal)
```bash
cd frontend
npm install
npm start
```

## Option 3: Docker Setup

```bash
docker-compose up --build
```

## 🎯 First Steps

1. **Open your browser** to http://localhost:3000
2. **Search for a stock** (try "AAPL" or "Tesla")
3. **Explore the features**:
   - 📈 View price charts with moving averages
   - 🔮 Try different forecasting methods
   - 📰 Read the latest news
   - 📊 Analyze key metrics

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 8000
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### Python Dependencies Issues
```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

### Node.js Dependencies Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
Make sure backend is running on port 8000 and frontend on port 3000.

## 📱 What You'll See

- **Dark Theme**: Modern, professional interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Interactive Charts**: Hover, zoom, and explore data
- **Real-time Data**: Live stock prices and news
- **Multiple Forecasts**: Try different algorithms

## 🎨 Features Overview

| Feature | Description |
|---------|-------------|
| 📈 **Price Charts** | Interactive candlestick charts with moving averages |
| 🔮 **Forecasting** | 6 different algorithms (Linear, ARIMA, Prophet, etc.) |
| 📰 **News Feed** | Latest news articles for selected stocks |
| 🔍 **Smart Search** | Search by ticker or company name |
| 📊 **Metrics** | Key performance indicators and statistics |
| 📱 **Responsive** | Works on all device sizes |

## 🚀 Next Steps

- **Customize the theme** in `frontend/tailwind.config.js`
- **Add new forecasting methods** in `backend/main.py`
- **Integrate real news APIs** in `backend/main.py`
- **Deploy to production** using the Docker setup

## 💡 Pro Tips

1. **Try different stocks**: AAPL, MSFT, GOOGL, TSLA, BARC.L
2. **Experiment with forecasts**: Each method works better for different stocks
3. **Use the search**: Type company names like "Apple" or "Microsoft"
4. **Check the API docs**: Visit http://localhost:8000/docs

## 🆘 Need Help?

1. Check the main README.md for detailed documentation
2. Look at the troubleshooting section above
3. Check the browser console for errors
4. Verify both services are running

---

**Happy analyzing! 📊✨**

