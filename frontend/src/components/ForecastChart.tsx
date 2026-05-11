import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ForecastChartProps {
  // 完美匹配 api.ts 转换后的格式
  historicalData: {
    dates: string[];
    close: number[];
    [key: string]: any;
  };
  // 完美匹配 main.py /api/forecast 返回的格式
  forecastData: {
    predictions: Array<{ date: string; price: number }>;
    method?: string;
  };
  method: string;
  currency?: string;
}

const ForecastChart: React.FC<ForecastChartProps> = ({
  historicalData,
  forecastData,
  method,
  currency = 'USD'
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // 1. 安全检查：检查对象中的 dates 和 close 数组是否存在
  if (!historicalData || !historicalData.dates || !historicalData.close ||
      !forecastData || !forecastData.predictions) {
    return (
      <div className="h-96 flex items-center justify-center bg-dark-700 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (currency === 'CNY') return '¥' + value.toFixed(2);
    if (currency === 'GBP') return '£' + value.toFixed(2);
    if (currency === 'EUR') return '€' + value.toFixed(2);
    if (currency === 'JPY') return '¥' + value.toFixed(0);
    return '$' + value.toFixed(2);
  };

  // 2. 直接从 api.ts 转换好的对象中提取数组
  const histDates = historicalData.dates;
  const histPrices = historicalData.close;

  // 提取预测数据
  const futureDates = forecastData.predictions.map(p => p.date);
  const futurePrices = forecastData.predictions.map(p => p.price);

  const allDates = [...histDates, ...futureDates];

  // 3. 计算展示用的统计数据
  const currentPrice = histPrices[histPrices.length - 1];
  const forecastPrice = futurePrices[futurePrices.length - 1];
  const priceChange = forecastPrice - currentPrice;
  const percentChange = (priceChange / currentPrice) * 100;

  const chartData = {
    labels: allDates,
    datasets: [
      {
        label: 'Historical Price',
        data: [...histPrices, ...Array(futurePrices.length).fill(null)],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: `${method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Forecast`,
        data: [...Array(histPrices.length - 1).fill(null), currentPrice, ...futurePrices],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#9ca3af', usePointStyle: true } },
      tooltip: { mode: 'index' as const, intersect: false, backgroundColor: 'rgba(31, 41, 55, 0.95)', titleColor: '#f9fafb', bodyColor: '#f9fafb', borderColor: '#374151', borderWidth: 1 },
    },
    scales: {
      x: { display: true, grid: { color: 'rgba(75, 85, 99, 0.3)' }, ticks: { color: '#9ca3af', maxTicksLimit: 15 } },
      y: { display: true, grid: { color: 'rgba(75, 85, 99, 0.3)' }, ticks: { color: '#9ca3af', callback: function(value: any) { return formatCurrency(value); } } },
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  };

  return (
    <div className="space-y-4">
      <div className="h-96">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="text-xl font-semibold">{formatCurrency(currentPrice)}</div>
        </div>
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Forecast Price</div>
          <div className="text-xl font-semibold">{formatCurrency(forecastPrice)}</div>
        </div>
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Expected Change</div>
          <div className={`text-xl font-semibold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastChart;
