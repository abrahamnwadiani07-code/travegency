import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PATH_LIST } from '../data/paths';
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

const TYPING_DESTINATIONS = ['London', 'Dubai', 'Toronto', 'Paris', 'Istanbul', 'Mecca', 'New York'];

const DESTINATIONS = [
  { name: 'Dubai', country: 'UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80', tag: 'Popular', price: 'From $450' },
  { name: 'London', country: 'United Kingdom', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80', tag: 'Trending', price: 'From $620' },
  { name: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80', tag: 'Top Rated', price: 'From $580' },
  { name: 'Toronto', country: 'Canada', image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80', tag: 'Study', price: 'From $700' },
  { name: 'Istanbul', country: 'Turkey', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80', tag: 'Culture', price: 'From $380' },
  { name: 'Mecca', country: 'Saudi Arabia', image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&q=80', tag: 'Religious', price: 'From $1,200' },
];

const PATH_IMAGES = {
  education: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80',
  tourism: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80',
  medical: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
  business: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
  relocation: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  religious: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80',
  family: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80',
};

const TESTIMONIALS = [
  {
    name: 'Amina Yusuf',
    location: 'Lagos, Nigeria',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&q=80',
    text: 'Tragency connected me with an amazing agent who handled my UK student visa in 3 weeks. The escrow payment gave me total peace of mind.',
    rating: 5,
    path: 'Education',
  },
  {
    name: 'Ahmed Hassan',
    location: 'Cairo, Egypt',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    text: 'Booked my family Umrah package through a verified agent here. Everything was seamless — flights, hotels, and guided tours all sorted.',
    rating: 5,
    path: 'Religious',
  },
  {
    name: 'Chioma Okafor',
    location: 'Abuja, Nigeria',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    text: 'I relocated to Canada with my family. Our Tragency agent handled immigration, housing search, and even school enrollment for my kids.',
    rating: 5,
    path: 'Relocation',
  },
];

const STATS = [
  { end: 10000, suffix: '+', label: 'Travellers Served' },
  { end: 500, suffix: '+', label: 'Verified Agents' },
  { end: 45, suffix: '+', label: 'Countries Covered' },
  { end: 98, suffix: '%', label: 'Satisfaction Rate' },
];

const LIVE_ACTIVITIES = [
  { name: 'Fatima A.', action: 'booked a flight to', dest: 'London', time: '2 min ago', icon: '✈️' },
  { name: 'Chidi O.', action: 'matched with an agent for', dest: 'Canada Study Visa', time: '5 min ago', icon: '🎓' },
  { name: 'Yusuf M.', action: 'completed Umrah booking to', dest: 'Mecca', time: '8 min ago', icon: '🕌' },
  { name: 'Sarah K.', action: 'started planning trip to', dest: 'Dubai', time: '12 min ago', icon: '🏙️' },
  { name: 'Emmanuel N.', action: 'got visa approval for', dest: 'Paris', time: '15 min ago', icon: '🇫🇷' },
];

const TOP_AGENTS = [
  { name: 'Grace Adebayo', specialty: 'UK & Canada Education', rating: 4.9, reviews: 127, avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80', verified: true },
  { name: 'Khalid Ibrahim', specialty: 'Hajj & Umrah Packages', rating: 4.8, reviews: 203, avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80', verified: true },
  { name: 'Ngozi Eze', specialty: 'Family & Tourism', rating: 4.9, reviews: 98, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80', verified: true },
  { name: 'Mohamed Ali', specialty: 'Business & Relocation', rating: 4.7, reviews: 156, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80', verified: true },
];

const PARTNERS = [
  'Emirates', 'Qatar Airways', 'Turkish Airlines', 'British Airways', 'Ethiopian Airlines', 'Kenya Airways'
];

const IMG_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="#111118"><rect width="800" height="600"/><text x="400" y="300" text-anchor="middle" fill="#333" font-size="24" font-family="sans-serif">Image unavailable</text></svg>'
);

/* ── Animated counter hook ── */
function useCounter(end, duration, trigger) {
  const [count, setCount] = useState(0);
  const counted = useRef(false);
  useEffect(() => {
    if (!trigger || counted.current) return;
    counted.current = true;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, end, duration]);
  return count;
}

/* ── Typewriter hook ── */
function useTypewriter(words, typingSpeed = 100, pauseTime = 2000) {
  const [display, setDisplay] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(currentWord.slice(0, charIndex + 1));
        if (charIndex + 1 === currentWord.length) {
          setTimeout(() => setDeleting(true), pauseTime);
        } else {
          setCharIndex(prev => prev + 1);
        }
      } else {
        setDisplay(currentWord.slice(0, charIndex));
        if (charIndex === 0) {
          setDeleting(false);
          setWordIndex(prev => (prev + 1) % words.length);
        } else {
          setCharIndex(prev => prev - 1);
        }
      }
    }, deleting ? typingSpeed / 2 : typingSpeed);
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, wordIndex, words, typingSpeed, pauseTime]);

  return display;
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [liveIndex, setLiveIndex] = useState(0);
  const [liveVisible, setLiveVisible] = useState(true);
  const [liveDismissed, setLiveDismissed] = useState(false);
  const { t } = useLanguage();
  const sectionRefs = useRef({});
  const typedDest = useTypewriter(TYPING_DESTINATIONS, 80, 2500);

  // Hero slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Scroll-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Live activity ticker
  useEffect(() => {
    if (liveDismissed) return;
    const timer = setInterval(() => {
      setLiveVisible(false);
      setTimeout(() => {
        setLiveIndex(prev => (prev + 1) % LIVE_ACTIVITIES.length);
        setLiveVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(timer);
  }, [liveDismissed]);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => ({ ...prev, [entry.target.dataset.section]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  const setSectionRef = (key) => (el) => {
    sectionRefs.current[key] = el;
  };

  // Mouse glow effect for cards
  const handleMouseMove = useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  // Stat counters (individual hooks — can't call in a loop)
  const stat0 = useCounter(STATS[0].end, 1500, visibleSections.stats);
  const stat1 = useCounter(STATS[1].end, 1500, visibleSections.stats);
  const stat2 = useCounter(STATS[2].end, 1500, visibleSections.stats);
  const stat3 = useCounter(STATS[3].end, 1500, visibleSections.stats);
  const statCounters = [stat0, stat1, stat2, stat3];

  const howSteps = [
    { num: '01', icon: '🔍', title: t('how.step1.title'), desc: t('how.step1.desc') },
    { num: '02', icon: '🤝', title: t('how.step2.title'), desc: t('how.step2.desc') },
    { num: '03', icon: '🔒', title: t('how.step3.title'), desc: t('how.step3.desc') },
    { num: '04', icon: '✈️', title: t('how.step4.title'), desc: t('how.step4.desc') },
  ];

  const pathTranslationKey = {
    education: 'paths.education', tourism: 'paths.tourism', medical: 'paths.medical',
    business: 'paths.business', relocation: 'paths.relocation', religious: 'paths.religious', family: 'paths.family',
  };

  const liveActivity = LIVE_ACTIVITIES[liveIndex];

  return (
    <div className="home">
      {/* ══ Ambient gradient mesh ══ */}
      <div className="ambient-mesh" aria-hidden="true">
        <div className="ambient-orb ambient-orb--1" />
        <div className="ambient-orb ambient-orb--2" />
        <div className="ambient-orb ambient-orb--3" />
      </div>

      {/* ══ Live Activity Toast ══ */}
      {!liveDismissed && (
        <div className={`live-toast ${liveVisible ? 'live-toast--visible' : ''}`}>
          <span className="live-toast-icon">{liveActivity.icon}</span>
          <div className="live-toast-text">
            <strong>{liveActivity.name}</strong> {liveActivity.action} <strong>{liveActivity.dest}</strong>
          </div>
          <span className="live-toast-time">{liveActivity.time}</span>
          <button className="live-toast-close" onClick={() => setLiveDismissed(true)} aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* ══ Hero ══ */}
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
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Trusted by 10,000+ Travellers Worldwide
          </div>
          <h1 className="serif hero-title">
            {t('hero.title')}<br />
            <span className="hero-highlight">{typedDest}</span>
            <span className="hero-cursor">|</span>
          </h1>
          <p className="hero-sub">{t('hero.subtitle')}</p>

          {/* Search-style CTA bar */}
          <div className="hero-search-bar">
            <div className="hsb-item">
              <span className="hsb-label">Where to?</span>
              <span className="hsb-value">Any destination</span>
            </div>
            <div className="hsb-divider" />
            <div className="hsb-item">
              <span className="hsb-label">Travel Type</span>
              <span className="hsb-value">All paths</span>
            </div>
            <div className="hsb-divider" />
            <div className="hsb-item">
              <span className="hsb-label">When</span>
              <span className="hsb-value">Any date</span>
            </div>
            <Link to="/start" className="hsb-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search
            </Link>
          </div>

          <div className="hero-trust-row">
            <div className="htr-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Escrow Protection</span>
            </div>
            <div className="htr-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Verified Agents</span>
            </div>
            <div className="htr-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>24/7 Messaging</span>
            </div>
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

      {/* ══ Stats Bar (animated counters) ══ */}
      <section className="stats-bar" data-section="stats" ref={setSectionRef('stats')}>
        <div className={`stats-inner ${visibleSections.stats ? 'animate-in' : ''}`}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-item">
              <span className="stat-value">
                {statCounters[i].toLocaleString()}{s.suffix}
              </span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Featured Destinations ══ */}
      <section className="dest-section" data-section="dest" ref={setSectionRef('dest')}>
        <div className="dest-inner">
          <div className="section-header">
            <div className="section-tag">Popular Destinations</div>
            <h2 className="serif section-title">Explore Top Destinations</h2>
            <p className="section-sub">Discover where thousands of travellers are heading with verified agents</p>
          </div>
          <div className={`dest-grid ${visibleSections.dest ? 'animate-in' : ''}`}>
            {DESTINATIONS.map((d, i) => (
              <Link to="/start" key={i} className={`dest-card ${i === 0 ? 'dest-card--large' : ''}`} onMouseMove={handleMouseMove}>
                <img src={d.image} alt={d.name} className="dest-img" loading="lazy" onError={e => { e.target.src = IMG_FALLBACK; }} />
                <div className="dest-overlay" />
                <div className="dest-glow" />
                <div className="dest-tag">{d.tag}</div>
                <div className="dest-info">
                  <h3 className="serif">{d.name}</h3>
                  <span>{d.country}</span>
                  <span className="dest-price">{d.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ How it works ══ */}
      <section className="how-section" data-section="how" ref={setSectionRef('how')}>
        <div className="how-inner">
          <div className="section-header">
            <div className="section-tag">{t('how.tag')}</div>
            <h2 className="serif section-title">{t('how.title')}</h2>
          </div>
          <div className={`how-grid ${visibleSections.how ? 'animate-in' : ''}`}>
            {howSteps.map((step, idx) => (
              <div key={step.num} className="how-card glow-card" style={{ animationDelay: `${idx * 0.15}s` }} onMouseMove={handleMouseMove}>
                <div className="glow-card-border" />
                <div className="how-icon-wrap">
                  <span className="how-step-icon">{step.icon}</span>
                  <span className="how-num">{step.num}</span>
                </div>
                <h3 className="serif">{step.title}</h3>
                <p>{step.desc}</p>
                {idx < howSteps.length - 1 && <div className="how-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Travel Paths ══ */}
      <section className="paths-section" data-section="paths" ref={setSectionRef('paths')}>
        <div className="paths-inner">
          <div className="section-header">
            <div className="section-tag">{t('paths.tag')}</div>
            <h2 className="serif section-title">{t('paths.title')}</h2>
            <p className="section-sub">{t('paths.subtitle')}</p>
          </div>
          <div className={`paths-grid ${visibleSections.paths ? 'animate-in' : ''}`}>
            {PATH_LIST.map(p => (
              <Link to={`/portal/${p.id}`} key={p.id} className="path-card" style={{ '--path-color': p.color }} onMouseMove={handleMouseMove}>
                <div className="path-card-image">
                  <img src={PATH_IMAGES[p.id]} alt={p.label} loading="lazy" onError={e => { e.target.src = IMG_FALLBACK; }} />
                  <div className="path-card-image-overlay" />
                </div>
                <div className="path-card-content">
                  <div className="pc-icon-badge" style={{ background: p.color }}>{p.icon}</div>
                  <h3 className="serif pc-name">{t(pathTranslationKey[p.id]) || p.label}</h3>
                  <p className="pc-desc">{t(`${pathTranslationKey[p.id]}.desc`) || p.description}</p>
                  <span className="pc-arrow">
                    Explore
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Top Agents Spotlight ══ */}
      <section className="agents-spotlight" data-section="agents" ref={setSectionRef('agents')}>
        <div className="agents-spotlight-inner">
          <div className="section-header">
            <div className="section-tag">Top Agents</div>
            <h2 className="serif section-title">Meet Our Best Agents</h2>
            <p className="section-sub">Hand-picked, verified professionals with the highest ratings</p>
          </div>
          <div className={`agents-grid ${visibleSections.agents ? 'animate-in' : ''}`}>
            {TOP_AGENTS.map((agent, i) => (
              <Link to="/agents" key={i} className="agent-card glow-card" onMouseMove={handleMouseMove}>
                <div className="glow-card-border" />
                <div className="agent-card-top">
                  <img src={agent.avatar} alt={agent.name} className="agent-avatar" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                  {agent.verified && (
                    <div className="agent-verified">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                    </div>
                  )}
                </div>
                <h3 className="serif">{agent.name}</h3>
                <p className="agent-specialty">{agent.specialty}</p>
                <div className="agent-stats">
                  <div className="agent-rating">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <strong>{agent.rating}</strong>
                  </div>
                  <span className="agent-reviews">{agent.reviews} reviews</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="agents-spotlight-cta">
            <Link to="/agents" className="btn-hero-secondary">View All Agents</Link>
          </div>
        </div>
      </section>

      {/* ══ AI Consultant + Jobs CTA ══ */}
      <section className="home-cta-duo">
        <div className="home-cta-duo-inner">
          <Link to="/start" className="hcd-card hcd-ai">
            <div className="hcd-shimmer" />
            <img src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80" alt="" className="hcd-bg-img" onError={e => { e.target.style.display = 'none'; }} />
            <div className="hcd-card-overlay" />
            <div className="hcd-content">
              <div className="hcd-icon-wrap">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M18 14c2.21 0 4 1.79 4 4v2H2v-2c0-2.21 1.79-4 4-4"/><circle cx="12" cy="6" r="1" fill="var(--accent)"/></svg>
              </div>
              <h3 className="serif">{t('cta.aiTitle')}</h3>
              <p>{t('cta.aiDesc')}</p>
              <span className="hcd-link">
                {t('cta.aiLink')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </span>
            </div>
          </Link>
          <Link to="/jobs" className="hcd-card hcd-jobs">
            <div className="hcd-shimmer" />
            <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80" alt="" className="hcd-bg-img" onError={e => { e.target.style.display = 'none'; }} />
            <div className="hcd-card-overlay" />
            <div className="hcd-content">
              <div className="hcd-icon-wrap">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
              </div>
              <h3 className="serif">{t('cta.jobsTitle')}</h3>
              <p>{t('cta.jobsDesc')}</p>
              <span className="hcd-link">
                {t('cta.jobsLink')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ══ Testimonials ══ */}
      <section className="testimonials-section" data-section="test" ref={setSectionRef('test')}>
        <div className="testimonials-inner">
          <div className="section-header">
            <div className="section-tag">What Travellers Say</div>
            <h2 className="serif section-title">Trusted by Thousands</h2>
            <p className="section-sub">Real stories from travellers who found their perfect agent</p>
          </div>
          <div className={`testimonials-grid ${visibleSections.test ? 'animate-in' : ''}`}>
            {TESTIMONIALS.map((review, i) => (
              <div key={i} className="testimonial-card glow-card" onMouseMove={handleMouseMove}>
                <div className="glow-card-border" />
                <div className="tmc-stars">
                  {Array.from({ length: review.rating }, (_, j) => (
                    <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                </div>
                <p className="tmc-text">"{review.text}"</p>
                <div className="tmc-author">
                  <img src={review.avatar} alt={review.name} className="tmc-avatar" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.location}</span>
                  </div>
                  <span className="tmc-path">{review.path}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ News ══ */}
      <NewsSection />

      {/* ══ Trust Section ══ */}
      <section className="trust-section" data-section="trust" ref={setSectionRef('trust')}>
        <div className="trust-inner">
          <div className="section-header">
            <div className="section-tag">{t('trust.tag')}</div>
            <h2 className="serif section-title">{t('trust.title')}</h2>
          </div>
          <div className={`trust-grid ${visibleSections.trust ? 'animate-in' : ''}`}>
            {[
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: t('trust.escrow.title'), desc: t('trust.escrow.desc') },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, title: t('trust.verified.title'), desc: t('trust.verified.desc') },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, title: t('trust.messaging.title'), desc: t('trust.messaging.desc') },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>, title: t('trust.transparent.title'), desc: t('trust.transparent.desc') },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, title: t('trust.ratings.title'), desc: t('trust.ratings.desc') },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, title: t('trust.paths.title'), desc: t('trust.paths.desc') },
            ].map((f, i) => (
              <div key={i} className="trust-card glow-card" onMouseMove={handleMouseMove}>
                <div className="glow-card-border" />
                <div className="tc-icon">{f.icon}</div>
                <h3 className="serif">{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Partners ══ */}
      <section className="partners-section">
        <div className="partners-inner">
          <p className="partners-label">Trusted airline partners</p>
          <div className="partners-marquee">
            <div className="partners-track">
              {[...PARTNERS, ...PARTNERS].map((p, i) => (
                <span key={i} className="partner-name serif">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ Final CTA ══ */}
      <section className="cta-section">
        <div className="cta-inner">
          <img src="https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1920&q=80" alt="" className="cta-bg-img" onError={e => { e.target.style.display = 'none'; }} />
          <div className="cta-bg-overlay" />
          <div className="cta-content">
            <h2 className="serif cta-title">{t('finalCta.title')}</h2>
            <p>{t('finalCta.subtitle')}</p>
            <div className="cta-buttons">
              <Link to="/start" className="btn-hero-primary">{t('finalCta.button')}</Link>
              <Link to="/agents" className="btn-hero-secondary">Browse Agents</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="serif footer-logo">TRA<em>GENCY</em></span>
              <p>{t('footer.tagline')}</p>
              <div className="footer-social">
                <a href="https://tragency.com" aria-label="Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                <a href="https://tragency.com" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>
                <a href="https://tragency.com" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
              </div>
            </div>
            <div className="footer-links">
              <div>
                <h4>{t('footer.platform')}</h4>
                <Link to="/start">{t('nav.planTrip')}</Link>
                <Link to="/agents">{t('footer.ourAgents')}</Link>
                <Link to="/jobs">Travel Jobs</Link>
                <Link to="/login">{t('nav.login')}</Link>
              </div>
              <div>
                <h4>{t('footer.travelPaths')}</h4>
                {PATH_LIST.slice(0, 4).map(p => (
                  <Link key={p.id} to={`/portal/${p.id}`}>{p.icon} {t(pathTranslationKey[p.id]) || p.label}</Link>
                ))}
              </div>
              <div>
                <h4>{t('footer.support')}</h4>
                <a href="mailto:hello@tragency.com">{t('footer.contactUs')}</a>
                <span>help@tragency.com</span>
                <span>FAQ & Help Centre</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} {t('footer.rights')}</span>
            <div className="footer-bottom-links">
              <a href="https://tragency.com">Privacy Policy</a>
              <a href="https://tragency.com">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        className={`scroll-top ${showScrollTop ? 'scroll-top--visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
    </div>
  );
}
