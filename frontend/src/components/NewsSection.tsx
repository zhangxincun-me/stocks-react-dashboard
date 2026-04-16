import React, { useState } from 'react';
import { ExternalLink, Calendar, Newspaper, ChevronDown, ChevronUp, Quote, TrendingUp, Target, BarChart3, AlertCircle } from 'lucide-react';
import { NewsArticle } from '../types';

interface NewsSectionProps {
  articles: NewsArticle[];
}

const NewsSection: React.FC<NewsSectionProps> = ({ articles }) => {
  const [expandedArticles, setExpandedArticles] = useState<Set<number>>(new Set());

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedArticles);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedArticles(newExpanded);
  };

  const getArticleTypeIcon = (articleType: string) => {
    switch (articleType) {
      case 'Analyst Rating':
        return <Target className="h-4 w-4" />;
      case 'Earnings Analysis':
        return <BarChart3 className="h-4 w-4" />;
      case 'Price Movement':
        return <TrendingUp className="h-4 w-4" />;
      case 'Market Analysis':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  const getArticleTypeColor = (articleType: string) => {
    switch (articleType) {
      case 'Analyst Rating':
        return 'text-blue-400 bg-blue-400/10';
      case 'Earnings Analysis':
        return 'text-green-400 bg-green-400/10';
      case 'Price Movement':
        return 'text-orange-400 bg-orange-400/10';
      case 'Market Analysis':
        return 'text-purple-400 bg-purple-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (articles.length === 0) {
    return (
      <div className="text-center py-8">
        <Newspaper className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No news articles available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article, index) => {
        const isExpanded = expandedArticles.has(index);
        const hasOriginalText = article.original_text && article.original_text.length > 0;
        
        return (
          <div
            key={index}
            className="bg-dark-700 rounded-lg p-4 hover:bg-dark-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-white line-clamp-2 flex-1">
                    {article.title}
                  </h4>
                  {article.article_type && (
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getArticleTypeColor(article.article_type)}`}>
                      {getArticleTypeIcon(article.article_type)}
                      <span className="ml-1">{article.article_type}</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                  {article.description}
                </p>
                
                {/* Citation */}
                {article.citation && (
                  <div className="flex items-center mb-3 text-xs text-gray-500">
                    <Quote className="h-3 w-3 mr-1" />
                    <span>{article.citation}</span>
                  </div>
                )}
                
                {/* Original text (expandable) */}
                {hasOriginalText && (
                  <div className="mb-3">
                    <button
                      onClick={() => toggleExpanded(index)}
                      className="flex items-center text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show original text
                        </>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 p-3 bg-dark-800 rounded-md">
                        <p className="text-gray-300 text-xs leading-relaxed">
                          {article.original_text}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Newspaper className="h-3 w-3 mr-1" />
                      {article.source}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(article.publishedAt)}
                    </div>
                  </div>
                  {article.relevance_score && article.relevance_score > 0 && (
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 mr-1">Relevance:</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              i < Math.min(5, Math.ceil(article.relevance_score! / 4))
                                ? 'bg-primary-400'
                                : 'bg-gray-600'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-primary-400 font-medium">
                          {article.relevance_score}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {article.url && article.url !== '#' && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 p-2 text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NewsSection;

