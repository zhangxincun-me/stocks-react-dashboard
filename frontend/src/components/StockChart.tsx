import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { NewsArticle } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

interface StockChartProps {
  data: {
    dates: string[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
  currency?: string;
  newsData?: NewsArticle[];
  selectedNewsIndex?: number;
  onNewsSelect?: (index: number) => void;
}

const StockChart: React.FC<StockChartProps> = ({ data, currency = 'USD', newsData = [], selectedNewsIndex, onNewsSelect }) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Format currency helper
  const formatCurrency = (value: number) => {
    if (currency === 'GBP') {
      return '£' + value.toFixed(2);
    } else if (currency === 'EUR') {
      return '€' + value.toFixed(2);
    } else if (currency === 'JPY') {
      return '¥' + value.toFixed(0);
    } else {
      return '$' + value.toFixed(2);
    }
  };

  // Calculate moving averages
  const calculateMA = (data: number[], period: number) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  };

  const ma20 = data?.close ? calculateMA(data.close, 20) : [];
  const ma50 = data?.close ? calculateMA(data.close, 50) : [];


  const getNewsAnnotationColor = (articleType: string) => {
    switch (articleType) {
      case 'Analyst Rating':
        return '#3b82f6'; // Blue
      case 'Earnings Analysis':
        return '#10b981'; // Green
      case 'Price Movement':
        return '#f59e0b'; // Orange
      case 'Market Analysis':
        return '#8b5cf6'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  };

  // Find the chart index for a news article
  const findNewsChartIndex = (article: NewsArticle) => {
    if (!data?.dates || !Array.isArray(data.dates) || data.dates.length === 0) {
      return -1;
    }
    
    const articleDate = new Date(article.publishedAt);
    let closestDateIndex = 0;
    let minDiff = Infinity;
    
    data.dates.forEach((date, i) => {
      const chartDate = new Date(date);
      const diff = Math.abs(articleDate.getTime() - chartDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestDateIndex = i;
      }
    });

    return minDiff < 30 * 24 * 60 * 60 * 1000 ? closestDateIndex : -1;
  };

  // Create highlighting annotation for selected news
  const createHighlightAnnotation = () => {
    if (selectedNewsIndex === undefined || !newsData || selectedNewsIndex >= newsData.length) {
      return {};
    }

    const selectedArticle = newsData[selectedNewsIndex];
    const chartIndex = findNewsChartIndex(selectedArticle);
    
    if (chartIndex === -1) return {};

    const color = getNewsAnnotationColor(selectedArticle.article_type || 'General News');
    
    return {
      highlight: {
        type: 'line' as const,
        mode: 'vertical' as const,
        scaleID: 'x',
        value: chartIndex,
        borderColor: color,
        borderWidth: 4,
        borderDash: [10, 5],
        label: {
          enabled: true,
          content: selectedArticle.title,
          position: 'start' as const,
          backgroundColor: color,
          color: 'white',
          font: {
            size: 12,
            weight: 'bold' as const
          },
          padding: 8,
          borderRadius: 8,
          rotation: 0,
          textAlign: 'center' as const
        }
      }
    };
  };

  // Handle undefined data gracefully
  if (!data || !data.dates || !data.close) {
    return (
      <div className="h-96 flex items-center justify-center bg-dark-700 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.dates,
    datasets: [
      {
        label: 'Price',
        data: data.close,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'MA 20',
        data: [...Array(data.close.length - ma20.length).fill(null), ...ma20],
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'MA 50',
        data: [...Array(data.close.length - ma50.length).fill(null), ...ma50],
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          filter: function(legendItem: any, chartData: any) {
            // Only show price and moving averages in legend, not individual news events
            return ['Price', 'MA 20', 'MA 50'].includes(legendItem.text);
          }
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          afterBody: (context: any) => {
            // Add news information to tooltip
            const dataIndex = context[0]?.dataIndex;
            if (dataIndex !== undefined && data?.dates && data.dates[dataIndex]) {
              const newsAtDate = newsData?.filter(article => {
                const articleDate = new Date(article.publishedAt);
                const chartDate = new Date(data.dates[dataIndex]);
                const diff = Math.abs(articleDate.getTime() - chartDate.getTime());
                return diff < 7 * 24 * 60 * 60 * 1000; // Within 7 days
              });
              
              if (newsAtDate && newsAtDate.length > 0) {
                const newsText = newsAtDate.map(article => 
                  `📰 ${article.title}\n   ${article.description}`
                ).join('\n\n');
                return ['', '📰 News Events:', newsText];
              }
            }
            return [];
          }
        }
      },
      annotation: {
        annotations: createHighlightAnnotation()
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="space-y-4">
      <div className="h-96">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* News Events Panel */}
      {newsData && newsData.length > 0 && (
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-300">News Events on Chart</h4>
              <p className="text-xs text-gray-500 mt-1">Click a news item to highlight its position on the chart</p>
            </div>
            {selectedNewsIndex !== undefined && (
              <button
                onClick={() => onNewsSelect?.(selectedNewsIndex)}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
          
          {/* Selection Status */}
          {selectedNewsIndex === undefined ? (
            <div className="text-xs text-gray-500 mb-4 p-2 bg-dark-800 rounded-md">
              💡 No news selected - click any news item below to see its position on the chart
            </div>
          ) : (
            <div className="text-xs text-primary-400 mb-4 p-2 bg-primary-500/10 rounded-md">
              ✨ News selected - see the highlighted line on the chart above
            </div>
          )}
          
          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-400">Analyst Rating</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-400">Earnings Analysis</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
              <span className="text-gray-400">Price Movement</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-gray-400">Market Analysis</span>
            </div>
          </div>
          
          {/* News Events List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {newsData.slice(0, 5).map((article, index) => {
              const articleDate = new Date(article.publishedAt);
              const color = getNewsAnnotationColor(article.article_type || 'General News');
              const isSelected = selectedNewsIndex === index;
              const chartIndex = findNewsChartIndex(article);
              
              return (
                <div 
                  key={index} 
                  className={`flex items-start space-x-3 p-2 rounded-md transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary-500/20 border-2 border-primary-500' 
                      : 'bg-dark-800 hover:bg-dark-600 border-2 border-transparent'
                  }`}
                  onClick={() => onNewsSelect?.(index)}
                >
                  <div 
                    className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                      isSelected ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className={`text-xs font-medium truncate ${
                        isSelected ? 'text-primary-300' : 'text-white'
                      }`}>
                        {article.title}
                      </h5>
                      <div className="flex items-center space-x-2">
                        {chartIndex !== -1 && (
                          <span className="text-xs text-gray-400">
                            📍 Chart position: {chartIndex + 1}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {articleDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{article.source}</span>
                      <span className="text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
                        {article.article_type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockChart;

