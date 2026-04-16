import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_search_stock():
    """Test stock search functionality"""
    response = client.post("/api/search", json={"query": "AAPL"})
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0
    assert any("AAPL" in result["ticker"] for result in data["results"])

def test_get_stock_data():
    """Test stock data retrieval"""
    response = client.post("/api/stock-data", json={"ticker": "AAPL", "period": "1mo"})
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert "currentPrice" in data
    assert "data" in data
    assert len(data["data"]) > 0

def test_get_forecast():
    """Test forecasting functionality"""
    response = client.post("/api/forecast", json={
        "ticker": "AAPL",
        "period": "1mo",
        "forecast_days": 7,
        "method": "linear"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert "forecast_data" in data
    assert "summary" in data

def test_get_news():
    """Test news retrieval"""
    response = client.post("/api/news", json={
        "ticker": "AAPL",
        "num_articles": 5,
        "period": "1mo"
    })
    assert response.status_code == 200
    data = response.json()
    assert "articles" in data
    assert len(data["articles"]) <= 5

def test_invalid_ticker():
    """Test handling of invalid ticker"""
    response = client.post("/api/stock-data", json={"ticker": "INVALID123", "period": "1mo"})
    assert response.status_code == 404

def test_invalid_forecast_method():
    """Test handling of invalid forecast method"""
    response = client.post("/api/forecast", json={
        "ticker": "AAPL",
        "period": "1mo",
        "forecast_days": 7,
        "method": "invalid_method"
    })
    assert response.status_code == 400
