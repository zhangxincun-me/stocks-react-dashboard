import React, { useState } from 'react';
import { llmBacktest, llmPredict } from '../services/api';
import { LLMPredictionData, LLMBacktestData, LLMResponse } from '../types';
import { Brain, TrendingUp, TrendingDown, Minus, BarChart3, Target, CheckCircle, XCircle, HelpCircle, BookOpen } from 'lucide-react';
import TechnicalHelp from './TechnicalHelp';

interface LLMPredictionProps {
  ticker: string;
  period: string;
}

const LLMPrediction: React.FC<LLMPredictionProps> = ({ ticker, period }) => {
  const [prediction, setPrediction] = useState<LLMPredictionData | null>(null);
  const [backtest, setBacktest] = useState<LLMBacktestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'predict' | 'backtest'>('predict');
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [showTechnicalHelp, setShowTechnicalHelp] = useState(false);

  const handlePrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: LLMResponse = await llmPredict(ticker, '1mo');
      if (response.success && response.data) {

        // 🌟 数据适配器：把后端返回的不规则 JSON 映射成前端认识的格式
        const rawData = response.data as any;
        const mappedPrediction = {
          ...rawData,
          // 修复：方向和价格字段名不一致
          predicted_direction: rawData.prediction || rawData.predicted_direction,
          current_price: rawData.currentPrice || rawData.current_price,
          news_sentiment: rawData.news_sentiment || 0, // 截图里后端没返回这个数值，用0兜底

          // 修复：解析文字摘要
          analysis_summary: {
            sma_trend: rawData.analysis_summary?.trend_analysis || rawData.analysis_summary?.sma_trend || 'N/A',
            momentum: rawData.analysis_summary?.momentum_analysis || rawData.analysis_summary?.momentum || 'N/A',
            rsi_signal: rawData.analysis_summary?.market_context || rawData.analysis_summary?.rsi_signal || 'N/A',
            news_sentiment_level: rawData.analysis_summary?.news_analysis || rawData.analysis_summary?.news_sentiment_level || 'N/A',
          },

          // 修复：技术指标字段不一致
          technical_indicators: {
            rsi: rawData.technical_indicators?.rsi || 50,
            sma_ratio: rawData.technical_indicators?.sma_ratio || 1, // 后端截图里没传这个，给个默认值
            price_momentum: rawData.technical_indicators?.momentum || rawData.technical_indicators?.price_momentum || 0,
            volatility: rawData.technical_indicators?.volatility || 0
          }
        };

        setPrediction(mappedPrediction as LLMPredictionData);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to make prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleBacktest = async () => {
    setLoading(true);
    setError(null);
    setBacktest(null);
    try {
      const response: LLMResponse = await llmBacktest(ticker, period);

      if (response.success && response.data) {
        setBacktest(response.data as LLMBacktestData);
      } else {
        setError(response.message || 'Backtest failed - no data returned');
      }
    } catch (err: any) {
      if (err.message?.includes('timed out')) {
        setError('Backtest timed out - this can take up to 60 seconds for complex analysis. Please try again.');
      } else if (err.message?.includes('Network Error')) {
        setError('Network error - please check if the backend is running on port 8001');
      } else {
        setError(err.message || 'Failed to run backtest');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDirectionIcon = (direction?: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getDirectionColor = (direction?: string) => {
    switch (direction) {
      case 'up': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'down': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getConfidenceColor = (confidence: number = 0) => {
    if (confidence >= 0.7) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const tooltipDefinitions = {
    accuracy: {
      title: "Accuracy",
      definition: "The percentage of all predictions that were correct. Measures overall correctness of the model across all prediction types.",
      formula: "Correct Predictions ÷ Total Predictions × 100",
      interpretation: "Higher is better. 50% means random guessing, 100% means perfect predictions."
    },
    precision: {
      title: "Precision",
      definition: "The percentage of positive predictions that were actually correct.",
      formula: "True Positives ÷ (True Positives + False Positives) × 100",
      interpretation: "Higher is better. Reduces false alarms and ensures predictions are reliable."
    },
    recall: {
      title: "Recall",
      definition: "The percentage of actual positive cases that were correctly identified.",
      formula: "True Positives ÷ (True Positives + False Negatives) × 100",
      interpretation: "Higher is better. Ensures the model doesn't miss important opportunities."
    },
    f1_score: {
      title: "F1 Score",
      definition: "The harmonic mean of precision and recall.",
      formula: "2 × (Precision × Recall) ÷ (Precision + Recall) × 100",
      interpretation: "Higher is better. Good balance between precision and recall indicates a well-calibrated model."
    }
  };

  const TooltipComponent = ({ metric, children }: { metric: string, children: React.ReactNode }) => {
    const tooltip = tooltipDefinitions[metric as keyof typeof tooltipDefinitions];

    return (
      <div className="relative inline-block">
        <div
          className="flex items-center cursor-help"
          onMouseEnter={() => setHoveredTooltip(metric)}
          onMouseLeave={() => setHoveredTooltip(null)}
        >
          {children}
          <HelpCircle className="w-4 h-4 ml-1 text-gray-400 hover:text-gray-300" />
        </div>

        {hoveredTooltip === metric && tooltip && (
          <div className="absolute z-50 w-80 p-4 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
            <div className="text-sm">
              <h4 className="font-semibold text-white mb-2">{tooltip.title}</h4>
              <p className="text-gray-300 mb-3">{tooltip.definition}</p>
              <div className="mb-2">
                <span className="text-gray-400 font-medium">Formula:</span>
                <div className="text-gray-300 font-mono text-xs mt-1">{tooltip.formula}</div>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Interpretation:</span>
                <div className="text-gray-300 text-xs mt-1">{tooltip.interpretation}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConfusionMatrix = (data: LLMBacktestData) => {
    if (!data.confusion_matrix || !data.class_labels) return null;

    return (
      <div className="bg-dark-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Confusion Matrix
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 p-2">Actual \ Predicted</th>
                {data.class_labels.map((label, index) => (
                  <th key={index} className="text-center text-gray-400 p-2 capitalize">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.confusion_matrix.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="text-gray-400 p-2 capitalize font-medium">
                    {data.class_labels[rowIndex]}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className={`text-center p-2 font-mono ${
                        rowIndex === colIndex
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-gray-600/20 text-gray-300'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-primary-400" />
            <h3 className="text-xl font-semibold text-white">LLM Stock Prediction</h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTechnicalHelp(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg transition-colors text-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>Technical Help</span>
            </button>
            <div className="text-sm text-gray-400">
              Powered by DistilBERT
            </div>
          </div>
        </div>
        <p className="text-gray-400 mt-2">
          AI-powered stock direction prediction using news sentiment analysis and technical indicators
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-dark-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('predict')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'predict' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Live Prediction
        </button>
        <button
          onClick={() => setActiveTab('backtest')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'backtest' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Backtest Analysis
        </button>
      </div>

      {/* Prediction Tab */}
      {activeTab === 'predict' && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={handlePrediction}
              disabled={loading}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              <span>{loading ? 'Analyzing...' : 'Make Prediction'}</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-3" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {prediction && (
            <div className="space-y-4">
              {/* Main Prediction Card */}
              <div className="bg-dark-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Prediction Result</h4>
                  <div className="text-sm text-gray-400">
                    {prediction.prediction_date ? new Date(prediction.prediction_date).toLocaleString() : 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Prediction */}
                  <div className="text-center">
                    <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border ${getDirectionColor(prediction.predicted_direction)}`}>
                      {getDirectionIcon(prediction.predicted_direction)}
                      <span className="font-semibold capitalize">{prediction.predicted_direction || 'Neutral'}</span>
                    </div>
                    {/* 🛡️ 防弹处理：给所有可能为空的数字加上 || 0 后盾 */}
                    <div className={`mt-2 text-2xl font-bold ${getConfidenceColor(prediction.confidence || 0)}`}>
                      {((prediction.confidence || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400">Confidence</div>
                  </div>

                  {/* Current Price */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {prediction.currency === 'USD' ? '$' :
                       prediction.currency === 'GBp' ? '£' :
                       (prediction.currency || '') + ' '}{(prediction.current_price || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">Current Price ({prediction.currency || 'USD'})</div>
                  </div>

                  {/* News Sentiment */}
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      (prediction.news_sentiment || 0) > 0.1 ? 'text-green-500' :
                      (prediction.news_sentiment || 0) < -0.1 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {(prediction.news_sentiment || 0) > 0 ? '+' : ''}{(prediction.news_sentiment || 0).toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-400">News Sentiment</div>
                  </div>
                </div>
              </div>

              {/* Technical Analysis */}
              <div className="bg-dark-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Technical Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">SMA Trend</div>
                    <div className={`font-semibold ${
                      prediction.analysis_summary?.sma_trend === 'bullish' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {prediction.analysis_summary?.sma_trend || 'N/A'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Momentum</div>
                    <div className={`font-semibold ${
                      prediction.analysis_summary?.momentum === 'positive' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {prediction.analysis_summary?.momentum || 'N/A'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">RSI Signal</div>
                    <div className={`font-semibold ${
                      prediction.analysis_summary?.rsi_signal === 'oversold' ? 'text-green-500' :
                      prediction.analysis_summary?.rsi_signal === 'overbought' ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {prediction.analysis_summary?.rsi_signal || 'N/A'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">News Sentiment</div>
                    <div className={`font-semibold ${
                      prediction.analysis_summary?.news_sentiment_level === 'positive' ? 'text-green-500' :
                      prediction.analysis_summary?.news_sentiment_level === 'negative' ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {prediction.analysis_summary?.news_sentiment_level || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="bg-dark-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Technical Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">SMA 5/20 Ratio</div>
                    <div className="font-mono text-white">{(prediction.technical_indicators?.sma_ratio || 1).toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Price Momentum</div>
                    <div className="font-mono text-white">{((prediction.technical_indicators?.price_momentum || 0) * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">RSI</div>
                    <div className="font-mono text-white">{(prediction.technical_indicators?.rsi || 50).toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Volatility</div>
                    <div className="font-mono text-white">{((prediction.technical_indicators?.volatility || 0) * 100).toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backtest Tab */}
      {activeTab === 'backtest' && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={handleBacktest}
              disabled={loading}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              <span>{loading ? 'Running Backtest... (up to 60s)' : 'Run Backtest'}</span>
            </button>
          </div>

          {loading && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center">
              <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-blue-400">
                Running backtest analysis... This may take up to 60 seconds for complex analysis.
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-3" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {backtest && (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="bg-dark-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  Performance Metrics (Precision Optimized)
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500">
                      {((backtest.accuracy || 0) * 100).toFixed(1)}%
                    </div>
                    <TooltipComponent metric="accuracy">
                      <div className="text-sm text-gray-400">Accuracy</div>
                    </TooltipComponent>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500">
                      {((backtest.precision || 0) * 100).toFixed(1)}%
                    </div>
                    <TooltipComponent metric="precision">
                      <div className="text-sm text-gray-400">Precision</div>
                    </TooltipComponent>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-500">
                      {((backtest.recall || 0) * 100).toFixed(1)}%
                    </div>
                    <TooltipComponent metric="recall">
                      <div className="text-sm text-gray-400">Recall</div>
                    </TooltipComponent>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-500">
                      {((backtest.f1_score || 0) * 100).toFixed(1)}%
                    </div>
                    <TooltipComponent metric="f1_score">
                      <div className="text-sm text-gray-400">F1 Score</div>
                    </TooltipComponent>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{backtest.total_predictions || 0}</div>
                    <div className="text-gray-400">Total Predictions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{backtest.correct_predictions || 0}</div>
                    <div className="text-gray-400">Correct Predictions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {((backtest.average_confidence || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-400">Avg Confidence</div>
                  </div>
                </div>
              </div>

              {/* Precision by Class */}
              {backtest.precision_by_class && (
                <div className="bg-dark-700 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Precision by Direction</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {((backtest.precision_by_class.down || 0) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Down Precision</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-500">
                        {((backtest.precision_by_class.neutral || 0) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Neutral Precision</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {((backtest.precision_by_class.up || 0) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Up Precision</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Optimization Tips */}
              {backtest.optimization_tips && backtest.optimization_tips.length > 0 && (
                <div className="bg-dark-700 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-yellow-500" />
                    Precision Optimization Tips
                  </h4>
                  <div className="space-y-2">
                    {backtest.optimization_tips.map((tip, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-300">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confusion Matrix */}
              {renderConfusionMatrix(backtest)}

              {/* Prediction Distribution */}
              <div className="bg-dark-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Prediction Distribution</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{backtest.prediction_distribution?.up || 0}</div>
                    <div className="text-sm text-gray-400">Up Predictions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-500">{backtest.prediction_distribution?.neutral || 0}</div>
                    <div className="text-sm text-gray-400">Neutral Predictions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{backtest.prediction_distribution?.down || 0}</div>
                    <div className="text-sm text-gray-400">Down Predictions</div>
                  </div>
                </div>
              </div>

              {/* Backtest Info */}
              <div className="bg-dark-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-2">Backtest Information</h4>
                <div className="text-sm text-gray-400">
                  <p><strong>Period:</strong> {backtest.period || 'N/A'}</p>
                  <p><strong>Date Range:</strong> {backtest.backtest_date_range?.start || 'N/A'} to {backtest.backtest_date_range?.end || 'N/A'}</p>
                  <p><strong>Ticker:</strong> {backtest.ticker || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Technical Help Modal */}
      <TechnicalHelp
        isOpen={showTechnicalHelp}
        onClose={() => setShowTechnicalHelp(false)}
      />
    </div>
  );
};

export default LLMPrediction;