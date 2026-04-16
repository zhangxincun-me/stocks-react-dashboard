import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Volume } from 'lucide-react';

interface StockMetricsProps {
  metrics: {
    current_price: number;
    price_change: number;
    percent_change: number;
    high_52w: number;
    low_52w: number;
    volume: number;
  };
  currency?: string;
}

const StockMetrics: React.FC<StockMetricsProps> = ({ metrics, currency }) => {
  const formatNumber = (num: number) => {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  };

  const formatCurrency = (num: number) => {
    if (currency === 'GBp') {
      return `£${(num / 100).toFixed(2)}`;
    } else if (currency === 'GBP') {
      return `£${num.toFixed(2)}`;
    } else if (currency === 'EUR') {
      return `€${num.toFixed(2)}`;
    } else if (currency === 'JPY') {
      return `¥${num.toFixed(0)}`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  // Handle undefined metrics
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-dark-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Loading...</p>
                <p className="text-lg font-semibold">-</p>
              </div>
              <div className="h-5 w-5 bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-dark-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">52W High</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.high_52w)}</p>
          </div>
          <TrendingUp className="h-5 w-5 text-green-400" />
        </div>
      </div>

      <div className="bg-dark-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">52W Low</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.low_52w)}</p>
          </div>
          <TrendingDown className="h-5 w-5 text-red-400" />
        </div>
      </div>

      <div className="bg-dark-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Volume</p>
            <p className="text-lg font-semibold">{formatNumber(metrics.volume)}</p>
          </div>
          <Volume className="h-5 w-5 text-blue-400" />
        </div>
      </div>

      <div className="bg-dark-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Change</p>
            <p className={`text-lg font-semibold ${metrics.price_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.price_change >= 0 ? '+' : ''}{formatCurrency(Math.abs(metrics.price_change))}
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default StockMetrics;

