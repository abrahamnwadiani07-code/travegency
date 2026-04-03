import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PATHS, PATH_LIST } from '../data/paths';
import { useLanguage } from '../context/LanguageContext';
import NewsSection from '../components/NewsSection';
import './Home.css';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80',
  'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1920&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
  'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1920&q=80',
];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: Math.random() * 4 + 2,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 20 + 15,
  delay: Math.random() * -20,
  opacity: Math.random() * 0.3 + 0.1,
}));

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const howRef = useRef(null);
  const [howVisible, setHowVisible] = useState(false);
  const { t } = useLanguage();

  // Hero slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Intersection observer for "How it works" animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHowVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (howRef.current) observer.observe(howRef.current);
    return () => observer.disconnect();
  }, []);

  const howSteps = [
    { num: '01', title: t('how.step1.title'), desc: t('how.step1.desc') },
    { num: '02', title: t('how.step2.title'), desc: t('how.step2.desc') },
    { num: '03', title: t('how.step3.title'), desc: t('how.step3.desc') },
    { num: '04', title: t('how.step4.title'), desc: t('how.step4.desc') },
  ];

  const trustFeatures = [
    { icon: '🔒', title: t('trust.escrow.title'), desc: t('trust.escrow.desc') },
    { icon: '✓', title: t('trust.verified.title'), desc: t('trust.verified.desc') },
    { icon: '💬', title: t('trust.messaging.title'), desc: t('trust.messaging.desc') },
    { icon: '📊', title: t('trust.transparent.title'), desc: t('trust.transparent.desc') },
    { icon: '⭐', title: t('trust.ratings.title'), desc: t('trust.ratings.desc') },
    { icon: '🌍', title: t('trust.paths.title'), desc: t('trust.paths.desc') },
  ];

  // Map path IDs to translation keys
  const pathTranslationKey = {
    education: 'paths.education',
    tourism: 'paths.tourism',
    medical: 'paths.medical',
    business: 'paths.business',
    relocation: 'paths.relocation',
    religious: 'paths.religious',
    family: 'paths.family',
  };

  return (
    <div className="home">
      {/* Floating Particles */}
      <div className="particles-container" aria-hidden="true">
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size + 'px',
              height: p.size + 'px',
              left: p.x + '%',
              top: p.y + '%',
              animationDuration: p.duration + 's',
              animationDelay: p.delay + 's',
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-slideshow">
          {HERO_IMAGES.map((img, i) => (
            <div
              key={i}
              className={`hero-slide ${i === currentSlide ? 'hero-slide--active' : ''}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          <div className="hero-overlay" />
        </div>

        <div className="hero-inner">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            {t('hero.trustBadge')}
          </div>
          <h1 className="serif hero-title">
            {t('hero.title')}<br />
            <span className="hero-highlight">{t('hero.highlight')}</span>
          </h1>
          <p className="hero-sub">
            {t('hero.subtitle')}
          </p>
          <div className="hero-actions">
            <Link to="/start" className="btn-hero-primary">{t('hero.ctaPlan')}</Link>
            <Link to="/agents" className="btn-hero-secondary">{t('hero.ctaAgents')}</Link>
          </div>
          <div className="hero-trust">
            <div className="ht-item"><strong>{t('hero.100percent')}</strong><span>{t('hero.verifiedAgents')}</span></div>
            <div className="ht-divider" />
            <div className="ht-item"><strong>{t('hero.escrow')}</strong><span>{t('hero.paymentProtection')}</span></div>
            <div className="ht-divider" />
            <div className="ht-item"><strong>{t('hero.247')}</strong><span>{t('hero.inAppMessaging')}</span></div>
          </div>

          <div className="hero-slide-indicators">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                className={`hero-indicator ${i === currentSlide ? 'hero-indicator--active' : ''}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" ref={howRef}>
        <div className="how-inner">
          <div className="section-tag">{t('how.tag')}</div>
          <h2 className="serif section-title">{t('how.title')}</h2>
          <div className={`how-grid ${howVisible ? 'how-grid--visible' : ''}`}>
            {howSteps.map((step, idx) => (
              <div key={step.num} className="how-card" style={{ animationDelay: `${idx * 0.15}s` }}>
                <div className="how-num">{step.num}</div>
                <h3 className="serif">{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Travel Paths */}
      <section className="paths-section">
        <div className="paths-inner">
          <div className="section-tag">{t('paths.tag')}</div>
          <h2 className="serif section-title">{t('paths.title')}</h2>
          <p className="section-sub">{t('paths.subtitle')}</p>
          <div className="paths-grid">
            {PATH_LIST.map(p => (
              <Link to={`/portal/${p.id}`} key={p.id} className="path-card" style={{ '--path-color': p.color }}>
                <div className="pc-icon">{p.icon}</div>
                <h3 className="serif pc-name">{t(pathTranslationKey[p.id]) || p.label}</h3>
                <p className="pc-desc">{t(`${pathTranslationKey[p.id]}.desc`) || p.description}</p>
                <span className="pc-arrow">{t('paths.explore')}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Consultant + Jobs CTA */}
      <section className="home-cta-duo">
        <div className="home-cta-duo-inner">
          <Link to="/start" className="hcd-card hcd-ai">
            <div className="hcd-shimmer" />
            <div className="hcd-icon">🤖</div>
            <h3 className="serif">{t('cta.aiTitle')}</h3>
            <p>{t('cta.aiDesc')}</p>
            <span className="hcd-link">{t('cta.aiLink')}</span>
          </Link>
          <Link to="/jobs" className="hcd-card hcd-jobs">
            <div className="hcd-shimmer" />
            <div className="hcd-icon">💼</div>
            <h3 className="serif">{t('cta.jobsTitle')}</h3>
            <p>{t('cta.jobsDesc')}</p>
            <span className="hcd-link">{t('cta.jobsLink')}</span>
          </Link>
        </div>
      </section>

      {/* News */}
      <NewsSection />

      {/* Trust section */}
      <section className="trust-section">
        <div className="trust-inner">
          <div className="section-tag">{t('trust.tag')}</div>
          <h2 className="serif section-title">{t('trust.title')}</h2>
          <div className="trust-grid">
            {trustFeatures.map((f, i) => (
              <div key={i} className="trust-card">
                <div className="tc-icon">{f.icon}</div>
                <h3 className="serif">{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="serif cta-title">{t('finalCta.title')}</h2>
          <p>{t('finalCta.subtitle')}</p>
          <Link to="/start" className="btn-hero-primary">{t('finalCta.button')}</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="serif">TRA<em>GENCY</em></span>
            <p>{t('footer.tagline')}</p>
          </div>
          <div className="footer-links">
            <div><h4>{t('footer.platform')}</h4><Link to="/start">{t('nav.planTrip')}</Link><Link to="/agents">{t('footer.ourAgents')}</Link><Link to="/login">{t('nav.login')}</Link></div>
            <div><h4>{t('footer.travelPaths')}</h4>{PATH_LIST.slice(0, 4).map(p => <Link key={p.id} to={`/portal/${p.id}`}>{p.icon} {t(pathTranslationKey[p.id]) || p.label}</Link>)}</div>
            <div><h4>{t('footer.support')}</h4><a href="mailto:hello@tragency.com">{t('footer.contactUs')}</a><span>help@tragency.com</span></div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} {t('footer.rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
