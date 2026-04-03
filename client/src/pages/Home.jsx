import React from 'react';
import { Link } from 'react-router-dom';
import { PATHS, PATH_LIST } from '../data/paths';
import NewsSection from '../components/NewsSection';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
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
            <Link to="/start" className="btn-hero-primary">Plan Your Trip →</Link>
            <Link to="/agents" className="btn-hero-secondary">Meet Our Agents</Link>
          </div>
          <div className="hero-trust">
            <div className="ht-item"><strong>100%</strong><span>Verified Agents</span></div>
            <div className="ht-divider" />
            <div className="ht-item"><strong>Escrow</strong><span>Payment Protection</span></div>
            <div className="ht-divider" />
            <div className="ht-item"><strong>24/7</strong><span>In-App Messaging</span></div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="how-inner">
          <div className="section-tag">Simple process</div>
          <h2 className="serif section-title">How Tragency Works</h2>
          <div className="how-grid">
            {[
              { num: '01', title: 'Choose your path', desc: 'Select from education, tourism, medical, business, relocation, religious, or family travel.' },
              { num: '02', title: 'Get matched', desc: 'We pair you with a verified specialist agent for your specific travel needs.' },
              { num: '03', title: 'Pay securely', desc: 'Your payment is held in escrow — the agent only gets paid when you confirm delivery.' },
              { num: '04', title: 'Travel with confidence', desc: 'Stay connected with your agent via in-app messaging throughout your journey.' },
            ].map(step => (
              <div key={step.num} className="how-card">
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
                <div className="pc-rate">From ₦{Number(p.rate).toLocaleString()}</div>
                <span className="pc-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Consultant + Jobs CTA */}
      <section className="home-cta-duo">
        <div className="home-cta-duo-inner">
          <Link to="/start" className="hcd-card hcd-ai">
            <div className="hcd-icon">🤖</div>
            <h3 className="serif">AI Travel Consultant</h3>
            <p>Choose your path and chat with our AI specialist — get visa requirements, document checklists, and matched with the perfect agent.</p>
            <span className="hcd-link">Start Your Journey →</span>
          </Link>
          <Link to="/jobs" className="hcd-card hcd-jobs">
            <div className="hcd-icon">💼</div>
            <h3 className="serif">Jobs with Visa Sponsorship</h3>
            <p>Browse 84+ companies across 6 countries that sponsor work visas. Find your dream job abroad.</p>
            <span className="hcd-link">Browse Jobs →</span>
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
              { icon: '📊', title: 'Transparent Pricing', desc: 'See exactly what you\'re paying for. No hidden fees. Platform fee is just 5%.' },
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
          <Link to="/start" className="btn-hero-primary">Get Started — It's Free →</Link>
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
