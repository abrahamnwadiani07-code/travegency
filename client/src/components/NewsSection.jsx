import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { news as newsApi } from '../services/api';
import './NewsSection.css';

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

export default function NewsSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    newsApi.list({ limit: 6 })
      .then(({ news }) => setArticles(news || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="news-section">
        <div className="ns-inner">
          <div className="ns-header">
            <div>
              <h2 className="serif ns-title">Latest Travel & Visa News</h2>
            </div>
          </div>
          <div className="ns-loading">
            <div className="ns-spinner" />
          </div>
        </div>
      </section>
    );
  }

  if (!articles.length) return null;

  return (
    <section className="news-section">
      <div className="ns-inner">
        <div className="ns-header">
          <div>
            <h2 className="serif ns-title">Latest Travel & Visa News</h2>
          </div>
          <Link to="/news" className="ns-view-all">View All &rarr;</Link>
        </div>

        <div className="ns-pills">
          {Object.entries(CAT_LABELS).filter(([k]) => k !== 'general').map(([key, label]) => (
            <span
              key={key}
              className="ns-pill"
              style={{ '--pill-color': CAT_COLORS[key] }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="ns-scroll">
          {articles.map(article => (
            <Link
              to={`/news`}
              key={article.id}
              className={`ns-card${article.is_featured ? ' ns-featured' : ''}`}
            >
              <div
                className="ns-card-img"
                style={article.image_url
                  ? { backgroundImage: `url(${article.image_url})` }
                  : { background: `linear-gradient(135deg, ${CAT_COLORS[article.category] || CAT_COLORS.general}33, ${CAT_COLORS[article.category] || CAT_COLORS.general}11)` }
                }
              >
                <span
                  className="ns-card-badge"
                  style={{ background: CAT_COLORS[article.category] || CAT_COLORS.general }}
                >
                  {CAT_LABELS[article.category] || CAT_LABELS.general}
                </span>
              </div>
              <div className="ns-card-body">
                <h3 className="serif ns-card-title">{article.title}</h3>
                <p className="ns-card-summary">{article.summary}</p>
                <div className="ns-card-meta">
                  <span className="ns-card-source">{article.source}</span>
                  <span className="ns-card-dot">&middot;</span>
                  <span className="ns-card-date">{timeAgo(article.published_at)}</span>
                </div>
              </div>
            </Link>
          ))}

          <Link to="/news" className="ns-card ns-card-cta">
            <div className="ns-cta-inner">
              <span className="ns-cta-icon">&rarr;</span>
              <span className="ns-cta-text">View All News</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
