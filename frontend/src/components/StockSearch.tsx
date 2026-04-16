import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, X } from 'lucide-react';
import { searchStock } from '../services/api';

// 1. 修复接口：兼容后端的 name 字段
interface SearchResult {
  ticker: string;
  company?: string;
  name?: string;
}

interface StockSearchProps {
  onStockSelect: (ticker: string) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ onStockSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentStocks, setRecentStocks] = useState<SearchResult[]>([]);

  // 组件加载时读取本地缓存的搜索记录
  useEffect(() => {
    const saved = localStorage.getItem('recentStocks');
    if (saved) {
      try {
        setRecentStocks(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent stocks:', error);
      }
    }
  }, []);

  // 监听输入框变化，请求后端搜索接口
  useEffect(() => {
    if (query.length >= 2) {
      setLoading(true);
      searchStock(query)
        .then((result) => {
          // 2. 核心修复：防止数组被二次嵌套，过滤掉没有 ticker 的脏数据
          const resultsArray = Array.isArray(result) ? result : [result];
          const validResults = resultsArray.filter(r => r && r.ticker);

          setSuggestions(validResults);
          setShowSuggestions(validResults.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  // 保存到最近搜索
  const saveRecentStock = (result: SearchResult) => {
    if (!result || !result.ticker) return; // 防御性代码：绝对不保存空数据

    const updatedRecent = [
      result,
      ...recentStocks.filter(stock => stock.ticker !== result.ticker)
    ].slice(0, 8); // 最多保留 8 条

    setRecentStocks(updatedRecent);
    localStorage.setItem('recentStocks', JSON.stringify(updatedRecent));
  };

  // 3. 增强功能：处理回车键提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // 如果下拉列表有结果，优先使用第一个结果（这样能拿到完整的股票后缀和名字）
      let targetTicker = query.trim().toUpperCase();
      let targetName = targetTicker;

      if (suggestions.length > 0 && suggestions[0].ticker) {
        targetTicker = suggestions[0].ticker;
        targetName = suggestions[0].name || suggestions[0].company || targetTicker;
      }

      saveRecentStock({ ticker: targetTicker, name: targetName });
      onStockSelect(targetTicker);

      setQuery('');
      setShowSuggestions(false);
    }
  };

  // 点击下拉提示项
  const handleSuggestionClick = (result: SearchResult) => {
    saveRecentStock(result);
    onStockSelect(result.ticker);
    setQuery('');
    setShowSuggestions(false);
  };

  // 点击最近搜索项
  const handleRecentClick = (result: SearchResult) => {
    if (result && result.ticker) {
      saveRecentStock(result);
      onStockSelect(result.ticker);
    }
  };

  // 删除最近搜索项
  const removeRecentStock = (tickerToRemove: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Remove ${tickerToRemove} from recent stocks?`)) {
      const updatedRecent = recentStocks.filter(stock => stock.ticker !== tickerToRemove);
      setRecentStocks(updatedRecent);
      localStorage.setItem('recentStocks', JSON.stringify(updatedRecent));
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ticker or company name..."
            className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
            </div>
          )}
        </div>

        {/* 下拉提示列表 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-600 rounded-md shadow-lg">
            {suggestions.map((result, index) => (
              <button
                // 4. 修复 React Key 警告：使用 ticker 作为唯一 key
                key={result.ticker || index}
                onClick={() => handleSuggestionClick(result)}
                type="button" // 防止触发 form 的 submit
                className="w-full px-4 py-3 text-left hover:bg-dark-600 first:rounded-t-md last:rounded-b-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{result.ticker}</div>
                    {/* 兼容 company 和 name 字段 */}
                    <div className="text-xs text-gray-400">{result.name || result.company || 'Unknown'}</div>
                  </div>

                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* 最近搜索记录 */}
      {recentStocks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-400">Recently Used</h4>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all recent stocks?')) {
                  setRecentStocks([]);
                  localStorage.removeItem('recentStocks');
                }
              }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {recentStocks.map((stock, index) => (
              <div
                key={stock.ticker || `recent-${index}`}
                className="flex items-center justify-between px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-md text-sm transition-colors group"
              >
                <button
                  onClick={() => handleRecentClick(stock)}
                  className="flex items-center flex-1 text-left"
                >
                  <TrendingUp className="h-3 w-3 mr-2" />
                  <div className="flex-1">
                    <div className="font-medium">{stock.ticker || 'Invalid Record'}</div>
                    <div className="text-xs text-gray-400">{stock.name || stock.company || 'Unknown'}</div>
                  </div>

                </button>
                <button
                  onClick={(e) => removeRecentStock(stock.ticker, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 rounded transition-all duration-200"
                  title="Remove from recent"
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSearch;