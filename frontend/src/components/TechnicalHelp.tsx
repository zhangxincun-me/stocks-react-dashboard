import React, { useState } from 'react';
import { X, BookOpen, Brain, Target, TrendingUp, BarChart3, Zap } from 'lucide-react';

interface TechnicalHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const TechnicalHelp: React.FC<TechnicalHelpProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  if (!isOpen) return null;

  const sections = {
    overview: {
      title: "AI Prediction System Overview",
      icon: <Brain className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Our AI-powered stock prediction system uses advanced machine learning techniques 
            to analyze market data and provide accurate direction predictions.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">🎯 Accuracy-Optimized Design</h4>
            <p className="text-sm text-gray-300">
              The system is specifically optimized for accuracy using weighted ensemble scoring, 
              adaptive thresholds, and machine learning approaches.
            </p>
          </div>
        </div>
      )
    },
    architecture: {
      title: "System Architecture",
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-white mb-3">5-Analysis Module System</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-green-400 mb-2">1. Trend Analysis (35%)</h5>
              <p className="text-sm text-gray-300">Multi-timeframe trend alignment with momentum confirmation</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-blue-400 mb-2">2. Momentum Analysis (25%)</h5>
              <p className="text-sm text-gray-300">RSI divergence, acceleration factors, and Bollinger Bands</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-purple-400 mb-2">3. Volatility & Volume (20%)</h5>
              <p className="text-sm text-gray-300">Volume-price confirmation and optimal volatility ranges</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-400 mb-2">4. News Sentiment (15%)</h5>
              <p className="text-sm text-gray-300">Volatility-adjusted news sensitivity using DistilBERT</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 md:col-span-2">
              <h5 className="font-semibold text-orange-400 mb-2">5. Market Context (5%)</h5>
              <p className="text-sm text-gray-300">Broader market trend and volatility context analysis</p>
            </div>
          </div>
        </div>
      )
    },
    technical: {
      title: "Technical Indicators",
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-white mb-3">Enhanced Technical Analysis</h4>
          <div className="space-y-3">
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">📈 Moving Averages</h5>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• SMA (5, 10, 20, 50) - Multi-timeframe trend analysis</li>
                <li>• EMA (12, 26) - More responsive trend detection</li>
                <li>• Trend alignment scoring for perfect uptrend/downtrend detection</li>
              </ul>
            </div>
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">⚡ Momentum Indicators</h5>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• RSI (7, 14) - Divergence analysis for accuracy</li>
                <li>• Price momentum (1, 5, 10 day) with acceleration factors</li>
                <li>• Bollinger Bands position with momentum confirmation</li>
              </ul>
            </div>
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">📊 Volume Analysis</h5>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• Volume-Price Trend (VPT) - Confirms price movements</li>
                <li>• Volume trend ratios - High volume with price confirmation</li>
                <li>• ATR (Average True Range) - Volatility measurement</li>
              </ul>
            </div>
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">🧠 MACD & Advanced</h5>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• MACD line, signal, and histogram with volume confirmation</li>
                <li>• Trend strength calculation across multiple timeframes</li>
                <li>• Volatility-adjusted thresholds for different stock types</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    accuracy: {
      title: "Accuracy Optimizations",
      icon: <Target className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-white mb-3">🎯 Accuracy Enhancement Features</h4>
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-green-400 mb-2">Adaptive Learning</h5>
              <p className="text-sm text-gray-300">
                Model learns from recent performance and adjusts parameters automatically. 
                Poor performance triggers more conservative thresholds, while good performance 
                allows for more aggressive predictions.
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-blue-400 mb-2">Dynamic Thresholds</h5>
              <p className="text-sm text-gray-300">
                Price change thresholds automatically adjust based on stock volatility. 
                High volatility stocks use lower thresholds for more sensitivity, while 
                stable stocks use higher thresholds for better selectivity.
              </p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-purple-400 mb-2">Signal Consistency</h5>
              <p className="text-sm text-gray-300">
                Requires multiple analysis modules to agree for high-confidence predictions. 
                Higher accuracy when trend, momentum, volume, and news signals align.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-400 mb-2">Confidence Smoothing</h5>
              <p className="text-sm text-gray-300">
                Reduces false signals during high volatility periods by applying confidence 
                smoothing based on recent market conditions and volatility levels.
              </p>
            </div>
          </div>
        </div>
      )
    },
    backtesting: {
      title: "Backtesting System",
      icon: <TrendingUp className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-white mb-3">📊 Advanced Backtesting Features</h4>
          <div className="space-y-3">
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">Adaptive Window Sizing</h5>
              <p className="text-sm text-gray-300">
                Backtesting window automatically adjusts based on stock volatility. 
                More volatile stocks use larger windows for better signal quality.
              </p>
            </div>
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">High Confidence Tracking</h5>
              <p className="text-sm text-gray-300">
                Monitors accuracy of high-confidence predictions (&gt;70%) separately. 
                Helps identify when the model is most reliable.
              </p>
            </div>
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">Performance Learning</h5>
              <p className="text-sm text-gray-300">
                Tracks recent prediction accuracy and adjusts model parameters in real-time 
                during backtesting for continuous improvement.
              </p>
            </div>
            <div className="bg-dark-600 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">Correlation Analysis</h5>
              <p className="text-sm text-gray-300">
                Calculates correlation between confidence levels and actual accuracy to 
                ensure confidence scores are well-calibrated.
              </p>
            </div>
          </div>
        </div>
      )
    },
    metrics: {
      title: "Performance Metrics",
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-white mb-3">📈 Understanding the Metrics</h4>
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-green-400 mb-2">Accuracy</h5>
              <p className="text-sm text-gray-300">
                Overall percentage of correct predictions across all directions (up, down, neutral). 
                Higher is better. 50% means random guessing, 100% means perfect predictions.
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-blue-400 mb-2">Precision</h5>
              <p className="text-sm text-gray-300">
                Percentage of positive predictions that were actually correct. Reduces false alarms 
                and ensures predictions are reliable when the model is confident.
              </p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-purple-400 mb-2">Recall</h5>
              <p className="text-sm text-gray-300">
                Percentage of actual positive cases that were correctly identified. Ensures the 
                model doesn't miss important opportunities and catches most significant movements.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-400 mb-2">F1 Score</h5>
              <p className="text-sm text-gray-300">
                Harmonic mean of precision and recall. Provides a balanced measure that considers 
                both false positives and false negatives for overall model performance.
              </p>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-white">Technical Help & Documentation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-dark-800 border-r border-gray-600 overflow-y-auto">
            <div className="p-4 space-y-2">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === key
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-600'
                  }`}
                >
                  {section.icon}
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              {sections[activeSection as keyof typeof sections]?.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalHelp;
