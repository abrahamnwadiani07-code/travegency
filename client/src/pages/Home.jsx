import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PATHS, PATH_LIST } from '../data/paths';
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
            Trusted by 2,000+ travellers across Africa
          </div>
          <h1 className="serif hero-title">
            Travel with confidence.<br />
            <span className="hero-highlight">Agents you can trust.</span>
          </h1>
          <p className="hero-sub">
            Tragency connects you with verified travel agents who handle everything —
            visas, flights, accommodation, and logistics — while your money stays safe in escrow.
          </p>
          <div className="hero-actions">
            <Link to="/start" className="btn-hero-primary">Plan Your Trip</Link>
            <Link to="/agents" className="btn-hero-secondary">Meet Our Agents</Link>
          </div>
          <div className="hero-trust">
            <div className="ht-item"><strong>100%</strong><span>Verified Agents</span></div>
            <div className="ht-divider" />
            <div className="ht-item"><strong>Escrow</strong><span>Payment Protection</span></div>
            <div className="ht-divider" />
            <div className="ht-item"><strong>24/7</strong><span>In-App Messaging</span></div>
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
          <div className="section-tag">Simple process</div>
          <h2 className="serif section-title">How Tragency Works</h2>
          <div className={`how-grid ${howVisible ? 'how-grid--visible' : ''}`}>
            {[
              { num: '01', title: 'Choose your path', desc: 'Select from education, tourism, medical, business, relocation, religious, or family travel.' },
              { num: '02', title: 'Get matched', desc: 'We pair you with a verified specialist agent for your specific travel needs.' },
              { num: '03', title: 'Pay securely', desc: 'Your payment is held in escrow — the agent only gets paid when you confirm delivery.' },
              { num: '04', title: 'Travel with confidence', desc: 'Stay connected with your agent via in-app messaging throughout your journey.' },
            ].map((step, idx) => (
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
          <div className="section-tag">7 travel paths</div>
          <h2 className="serif section-title">Where do you want to go?</h2>
          <p className="section-sub">Every journey starts with a path. Pick yours and we'll handle the rest.</p>
          <div className="paths-grid">
            {PATH_LIST.map(p => (
              <Link to={`/portal/${p.id}`} key={p.id} className="path-card" style={{ '--path-color': p.color }}>
                <div className="pc-icon">{p.icon}</div>
                <h3 className="serif pc-name">{p.label}</h3>
                <p className="pc-desc">{p.description}</p>
                <span className="pc-arrow">Explore</span>
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
            <h3 className="serif">AI Travel Consultant</h3>
            <p>Choose your path and chat with our AI specialist — get visa requirements, document checklists, and matched with the perfect agent.</p>
            <span className="hcd-link">Start Your Journey</span>
          </Link>
          <Link to="/jobs" className="hcd-card hcd-jobs">
            <div className="hcd-shimmer" />
            <div className="hcd-icon">💼</div>
            <h3 className="serif">Jobs with Visa Sponsorship</h3>
            <p>Browse 84+ companies across 6 countries that sponsor work visas. Find your dream job abroad.</p>
            <span className="hcd-link">Browse Jobs</span>
          </Link>
        </div>
      </section>

      {/* News */}
      <NewsSection />

      {/* Trust section */}
      <section className="trust-section">
        <div className="trust-inner">
          <div className="section-tag">Why Tragency</div>
          <h2 className="serif section-title">Built on trust, powered by technology</h2>
          <div className="trust-grid">
            {[
              { icon: '🔒', title: 'Escrow Protection', desc: 'Your money is held securely until you confirm service delivery. No more sending cash to strangers.' },
              { icon: '✓', title: 'Verified Agents', desc: 'Every agent is background-checked, licensed, and reviewed by our team before going live.' },
              { icon: '💬', title: 'In-App Messaging', desc: 'Chat directly with your agent. Track progress, ask questions, and stay informed.' },
              { icon: '📊', title: 'Transparent Process', desc: 'Clear steps from consultation to completion. No hidden fees. Pay only for what you need.' },
              { icon: '⭐', title: 'Ratings & Reviews', desc: 'Read real reviews from other travellers. Choose agents with proven track records.' },
              { icon: '🌍', title: '7 Travel Paths', desc: 'Education, tourism, medical, business, relocation, religious, and family — we cover it all.' },
            ].map((f, i) => (
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
          <h2 className="serif cta-title">Ready to travel with peace of mind?</h2>
          <p>Join thousands of travellers who trust Tragency for secure, reliable travel services.</p>
          <Link to="/start" className="btn-hero-primary">Get Started — It's Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="serif">TRA<em>GENCY</em></span>
            <p>Secure travel marketplace for Africa.</p>
          </div>
          <div className="footer-links">
            <div><h4>Platform</h4><Link to="/start">Plan a Trip</Link><Link to="/agents">Our Agents</Link><Link to="/login">Sign In</Link></div>
            <div><h4>Travel Paths</h4>{PATH_LIST.slice(0, 4).map(p => <Link key={p.id} to={`/portal/${p.id}`}>{p.icon} {p.label}</Link>)}</div>
            <div><h4>Support</h4><a href="mailto:hello@tragency.com">Contact Us</a><span>help@tragency.com</span></div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} Tragency. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
