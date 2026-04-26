import React, { useState, useEffect } from 'react';

import { news as newsApi } from '../services/api';
import './News.css';

const CAT_COLORS = {
  visa_update: '#3b82f6',
  scholarship: '#22c55e',
  travel_advisory: '#f59e0b',
  immigration: '#8b5cf6',
  jobs: '#d4a853',
  success_story: '#ec4899',
  general: '#6b7280',
};

const CAT_LABELS = {
  visa_update: 'Visa Update',
  scholarship: 'Scholarship',
  travel_advisory: 'Travel Advisory',
  immigration: 'Immigration',
  jobs: 'Jobs',
  success_story: 'Success Story',
  general: 'General',
};

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'visa_update', label: 'Visa Updates' },
  { key: 'scholarship', label: 'Scholarships' },
  { key: 'travel_advisory', label: 'Travel Advisory' },
  { key: 'immigration', label: 'Immigration' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'success_story', label: 'Success Stories' },
];

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter) params.category = filter;
    newsApi.list(params)
      .then(({ news }) => setArticles(news || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const featured = articles.filter(a => a.is_featured);
  const regular = articles.filter(a => !a.is_featured);

  return (
    <div className="news-page">
      {/* Hero */}
      <div className="news-hero">
        <div className="news-hero-inner">
          <div className="nh-tag">
            <span className="hero-tag-dot" />
            Stay informed
          </div>
          <h1 className="serif">Travel & Visa News</h1>
          <p>The latest updates on visas, scholarships, travel advisories, immigration policies, and success stories from the travel community.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="news-controls">
        <div className="news-controls-inner">
          <div className="news-filters">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                className={`nf-btn${filter === tab.key ? ' nf-active' : ''}`}
                onClick={() => setFilter(tab.key)}
                style={tab.key ? { '--nf-color': CAT_COLORS[tab.key] } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="news-content">
        <div className="news-content-inner">
          {loading ? (
            <div className="news-loading">
              <div className="news-spinner" />
            </div>
          ) : articles.length === 0 ? (
            <div className="news-empty">
              <div className="news-empty-icon">📰</div>
              <h3>No news articles found</h3>
              <p>There are no articles in this category yet. Check back soon!</p>
              {filter && (
                <button className="news-empty-btn" onClick={() => setFilter('')}>
                  View All News
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Featured articles */}
              {featured.length > 0 && (
                <div className="news-featured-grid">
                  {featured.map(article => (
                    <div key={article.id} className="nf-card">
                      <div
                        className="nf-card-img"
                        style={article.image_url
                          ? { backgroundImage: `url(${article.image_url})` }
                          : { background: `linear-gradient(135deg, ${CAT_COLORS[article.category] || CAT_COLORS.general}44, ${CAT_COLORS[article.category] || CAT_COLORS.general}11)` }
                        }
                      >
                        <span
                          className="nf-card-badge"
                          style={{ background: CAT_COLORS[article.category] || CAT_COLORS.general }}
                        >
                          {CAT_LABELS[article.category] || CAT_LABELS.general}
                        </span>
                      </div>
                      <div className="nf-card-body">
                        <h2 className="serif nf-card-title">{article.title}</h2>
                        <p className="nf-card-summary">{article.summary}</p>
                        <div className="nf-card-meta">
                          <span className="nf-card-source">{article.source}</span>
                          <span className="nf-card-dot">&middot;</span>
                          <span>{timeAgo(article.published_at)}</span>
                        </div>
                        <span className="nf-card-read">Read More &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Regular articles grid */}
              {regular.length > 0 && (
                <div className="news-grid">
                  {regular.map(article => (
                    <div key={article.id} className="ng-card">
                      <div
                        className="ng-card-img"
                        style={article.image_url
                          ? { backgroundImage: `url(${article.image_url})` }
                          : { background: `linear-gradient(135deg, ${CAT_COLORS[article.category] || CAT_COLORS.general}33, ${CAT_COLORS[article.category] || CAT_COLORS.general}11)` }
                        }
                      >
                        <span
                          className="ng-card-badge"
                          style={{ background: CAT_COLORS[article.category] || CAT_COLORS.general }}
                        >
                          {CAT_LABELS[article.category] || CAT_LABELS.general}
                        </span>
                      </div>
                      <div className="ng-card-body">
                        <h3 className="serif ng-card-title">{article.title}</h3>
                        <p className="ng-card-summary">{article.summary}</p>
                        <div className="ng-card-meta">
                          <span className="ng-card-source">{article.source}</span>
                          <span className="ng-card-dot">&middot;</span>
                          <span>{timeAgo(article.published_at)}</span>
                        </div>
                        <span className="ng-card-read">Read More &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
