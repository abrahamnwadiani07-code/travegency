import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookings as bookingsApi, payments as paymentsApi, auth as authApi, reviews as reviewsApi, notifications as notificationsApi, subscriptions as subscriptionsApi, sessions as sessionsApi } from '../../services/api';
import PaystackCheckout from '../../components/PaystackCheckout';
import { PATHS } from '../../data/paths';
import './Dashboard.css';

const STATUS_COLORS = {
  pending: 'pill-pending', agent_assigned: 'pill-info',
  confirmed: 'pill-confirmed', in_progress: 'pill-info',
  completed: 'pill-completed', cancelled: 'pill-cancelled',
};

const STATUS_OPTIONS = ['all', 'pending', 'agent_assigned', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export default function TravellerDashboard() {
  const { user, logout, setUser } = useAuth();

  // -- Navigation --
  const [tab, setTab] = useState('bookings');

  // -- Bookings --
  const [bookings, setBookings]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]         = useState(true);

  // -- Messages --
  const [messages, setMessages]   = useState([]);
  const [msgInput, setMsgInput]   = useState('');
  const msgEnd  = useRef(null);
  const pollRef = useRef(null);

  // -- Payments --
  const [payBooking, setPayBooking] = useState(null);
  const [payments, setPayments]     = useState([]);

  // -- Reviews --
  const [reviewRating, setReviewRating]   = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBookingId, setReviewBookingId] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [reviewMsg, setReviewMsg] = useState('');

  // -- Profile --
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', phone: '', country: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]       = useState('');

  // -- Security --
  const [secForm, setSecForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [secSaving, setSecSaving] = useState(false);
  const [secMsg, setSecMsg]       = useState('');

  // -- Notifications --
  const [notifications, setNotifications] = useState([]);

  // -- Subscription / Tier --
  const [userPlan, setUserPlan] = useState('free');
  const [chatExpiry, setChatExpiry] = useState(null);
  const [chatTimeLeft, setChatTimeLeft] = useState(null);

  // ───────── Load on mount ─────────
  useEffect(() => {
    loadAll();
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  // ───────── Chat timer countdown ─────────
  useEffect(() => {
    if (!chatExpiry || userPlan === 'gold') return;
    const timer = setInterval(() => {
      const left = Math.max(0, new Date(chatExpiry) - Date.now());
      setChatTimeLeft(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [chatExpiry, userPlan]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.first_name || user.firstName || '',
        lastName:  user.last_name  || user.lastName  || '',
        phone:     user.phone || '',
        country:   user.country || '',
      });
    }
  }, [user]);

  // ───────── Message polling ─────────
  useEffect(() => {
    if (selected && tab === 'messages') {
      loadMessages(selected.id);
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadMessages(selected.id), 8000);
    }
    return () => clearInterval(pollRef.current);
  }, [selected, tab]);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ───────── Data loaders ─────────
  async function loadAll() {
    setLoading(true);
    try {
      const [bk, py] = await Promise.all([
        bookingsApi.list({ limit: 100 }),
        paymentsApi.list({ limit: 100 }),
      ]);
      setBookings(bk.bookings || []);
      setPayments(py.payments || []);
      // Load subscription
      try {
        const subData = await subscriptionsApi.me();
        setUserPlan(subData.plan || 'free');
        if (subData.activeChatExpiry) setChatExpiry(new Date(subData.activeChatExpiry));
      } catch (e) { /* ignore */ }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadMessages(id) {
    try {
      const { messages: data } = await bookingsApi.getMessages(id);
      setMessages(data || []);
    } catch (e) { console.error(e); }
  }

  async function loadNotifications() {
    try {
      const { notifications: data } = await notificationsApi.list();
      setNotifications(data || []);
    } catch (e) { console.error(e); }
  }

  // ───────── Actions ─────────
  async function sendMsg(e) {
    e.preventDefault();
    if (!msgInput.trim() || !selected) return;
    try {
      await bookingsApi.sendMessage(selected.id, msgInput.trim());
      setMsgInput('');
      loadMessages(selected.id);
    } catch (e) { console.error(e); }
  }

  async function cancelBooking(id) {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsApi.updateStatus(id, { status: 'cancelled', cancelReason: 'Cancelled by traveller' });
      loadAll();
    } catch (e) { alert(e.message); }
  }

  async function submitReview() {
    if (!reviewBookingId || reviewRating < 1) return;
    const booking = bookings.find(b => b.id === reviewBookingId);
    if (!booking) return;
    setReviewSubmitting(true);
    setReviewMsg('');
    try {
      await reviewsApi.create({
        bookingId: reviewBookingId,
        agentId: booking.agent_id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewedIds(prev => new Set([...prev, reviewBookingId]));
      setReviewRating(0);
      setReviewComment('');
      setReviewBookingId(null);
      setReviewMsg('Review submitted successfully!');
    } catch (e) {
      setReviewMsg(e.message || 'Failed to submit review');
    } finally { setReviewSubmitting(false); }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const { user: updated } = await authApi.updateProfile(profileForm);
      if (setUser && updated) setUser(updated);
      setProfileMsg('Profile updated successfully!');
    } catch (e) {
      setProfileMsg(e.message || 'Failed to update profile');
    } finally { setProfileSaving(false); }
  }

  async function changePassword() {
    if (secForm.newPassword !== secForm.confirmPassword) {
      setSecMsg('Passwords do not match');
      return;
    }
    if (secForm.newPassword.length < 6) {
      setSecMsg('New password must be at least 6 characters');
      return;
    }
    setSecSaving(true);
    setSecMsg('');
    try {
      const { message } = await authApi.changePassword({
        currentPassword: secForm.currentPassword,
        newPassword: secForm.newPassword,
      });
      setSecMsg(message || 'Password changed successfully!');
      setSecForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setSecMsg(e.message || 'Failed to change password');
    } finally { setSecSaving(false); }
  }

  // ───────── Derived data ─────────
  const active    = bookings.filter(b => !['cancelled', 'completed'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');
  const pathInfo  = user?.travel_path ? PATHS[user.travel_path] : null;

  const filteredBookings = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (b.reference || '').toLowerCase().includes(q) ||
        (b.destination || '').toLowerCase().includes(q) ||
        (b.agent_name || '').toLowerCase().includes(q) ||
        (b.service || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const reviewableBookings = completed.filter(b => !reviewedIds.has(b.id));
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const NAV = [
    { id: 'bookings',      label: 'Bookings',      icon: '📋' },
    { id: 'messages',      label: 'Messages',      icon: '💬' },
    { id: 'payments',      label: 'Payments',      icon: '💳' },
    { id: 'reviews',       label: 'Reviews',       icon: '⭐' },
    { id: 'profile',       label: 'Profile',       icon: '👤' },
    { id: 'security',      label: 'Security',      icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dash">

      {/* ──── Sidebar ──── */}
      <aside className="dash-sidebar">
        <div className="dash-user">
          <div className="dash-avatar">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <div className="dash-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="dash-user-email">{user?.email}</div>
            <div style={{
              marginTop: 4, display: 'inline-block',
              padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
              background: userPlan === 'gold' ? 'rgba(212,168,83,0.2)' : userPlan === 'premium' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: userPlan === 'gold' ? 'var(--gold)' : userPlan === 'premium' ? '#a78bfa' : 'var(--muted)',
              border: `1px solid ${userPlan === 'gold' ? 'rgba(212,168,83,0.3)' : userPlan === 'premium' ? 'rgba(99,102,241,0.3)' : 'var(--offwhite2)'}`,
            }}>
              {userPlan === 'gold' ? '👑 GOLD' : userPlan === 'premium' ? '⭐ PREMIUM' : 'FREE'}
            </div>
          </div>
        </div>

        {pathInfo && (
          <div className="dash-path-badge" style={{ borderColor: pathInfo.color }}>
            <span style={{ fontSize: 18 }}>{pathInfo.icon}</span>
            <div>
              <div className="dpb-label">Travel path</div>
              <div className="dpb-name" style={{ color: pathInfo.color }}>{pathInfo.label}</div>
            </div>
          </div>
        )}

        <nav className="dash-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`dash-nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => {
                setTab(n.id);
                if (n.id === 'notifications') loadNotifications();
              }}
            >
              <span className="dni-icon">{n.icon}</span>
              {n.label}
              {n.id === 'bookings' && active.length > 0 && (
                <span className="dni-badge">{active.length}</span>
              )}
              {n.id === 'notifications' && unreadNotifs > 0 && (
                <span className="dni-badge">{unreadNotifs}</span>
              )}
            </button>
          ))}
        </nav>

        <Link to="/start" className="dash-new-booking">+ New Booking</Link>
        <button className="dash-logout" onClick={logout}>Sign Out</button>
      </aside>

      {/* ──── Main ──── */}
      <main className="dash-main">

        {/* ════════════ BOOKINGS ════════════ */}
        {tab === 'bookings' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">My Bookings</h2>
                <p className="dash-section-sub">
                  {bookings.length} total &middot; {active.length} active &middot; {completed.length} completed
                </p>
              </div>
              <Link to="/start" className="btn-sm btn-primary">+ New Booking</Link>
            </div>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by ref, destination, agent..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, padding: '8px 14px',
                  background: 'var(--bg2)', border: '1px solid var(--offwhite3)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, outline: 'none',
                }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 14px', background: 'var(--bg2)',
                  border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 13,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {loading && <div className="dash-loading"><div className="dash-spinner" /></div>}

            {!loading && bookings.length === 0 && (
              <div className="dash-empty">
                <div className="dash-empty-icon">📋</div>
                <p>No bookings yet. Start planning your first trip!</p>
                <Link to="/start" className="btn-hero-primary" style={{ marginTop: '1rem' }}>Plan a Trip</Link>
              </div>
            )}

            {!loading && bookings.length > 0 && filteredBookings.length === 0 && (
              <div className="dash-empty">
                <div className="dash-empty-icon">🔍</div>
                <p>No bookings match your search.</p>
              </div>
            )}

            <div className="booking-list">
              {filteredBookings.map(b => {
                const pInfo = PATHS[b.travel_path];
                return (
                  <div
                    key={b.id}
                    className={`bcard ${selected?.id === b.id ? 'bcard-selected' : ''}`}
                    onClick={() => setSelected(b)}
                  >
                    <div className="bcard-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {pInfo && <span style={{ fontSize: 20 }}>{pInfo.icon}</span>}
                        <div>
                          <div className="bcard-dest serif">{b.destination}</div>
                          <div className="bcard-meta-row">
                            <span>{b.service}</span>
                            {b.agent_name && <span> &middot; Agent: {b.agent_name}</span>}
                          </div>
                        </div>
                      </div>
                      <span className={`pill ${STATUS_COLORS[b.status] || 'pill-pending'}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="bcard-details">
                      <div className="bd"><strong>{b.reference}</strong>Ref</div>
                      <div className="bd"><strong>{'\u20A6'}{Number(b.amount).toLocaleString()}</strong>Amount</div>
                      <div className="bd"><strong>{b.travel_date || '\u2014'}</strong>Travel date</div>
                      <div className="bd"><strong>{b.travel_path}</strong>Path</div>
                    </div>
                    <div className="bcard-actions">
                      {b.agent_name && (
                        <button
                          className="btn-sm btn-msg"
                          onClick={e => { e.stopPropagation(); setSelected(b); setTab('messages'); }}
                        >
                          Message Agent
                        </button>
                      )}
                      {b.payment_status === 'unpaid' && (
                        <button
                          className="btn-sm btn-pay"
                          onClick={e => { e.stopPropagation(); setPayBooking(b); setTab('payments'); }}
                        >
                          Pay Now
                        </button>
                      )}
                      {['pending', 'agent_assigned'].includes(b.status) && (
                        <button
                          className="btn-sm btn-cancel"
                          onClick={e => { e.stopPropagation(); cancelBooking(b.id); }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {b.notes && (
                      <div className="bcard-notes">
                        <span>📝</span> {b.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ MESSAGES ════════════ */}
        {tab === 'messages' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Messages</h2>
                <p className="dash-section-sub">Chat with your assigned agent</p>
              </div>
            </div>

            {!selected ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">💬</div>
                <p>Select a booking to chat with your agent.</p>
                <button className="btn-ghost" onClick={() => setTab('bookings')}>View Bookings</button>
              </div>
            ) : userPlan === 'free' ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">🔒</div>
                <h3 className="serif" style={{ marginBottom: 8 }}>Upgrade to Chat</h3>
                <p>Agent chat requires a Premium or Gold subscription.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                  <Link to="/upgrade" className="btn-primary" style={{ textDecoration: 'none' }}>View Plans</Link>
                </div>
              </div>
            ) : (
              <div className="chat-wrap">
                <div className="chat-booking-bar">
                  <span className="serif" style={{ fontSize: 15 }}>{selected.destination}</span>
                  <span className={`pill ${STATUS_COLORS[selected.status]}`} style={{ fontSize: 10 }}>
                    {selected.status?.replace('_', ' ')}
                  </span>
                  {userPlan === 'gold' && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>👑 Unlimited</span>
                  )}
                  {userPlan === 'premium' && chatTimeLeft !== null && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: chatTimeLeft < 300000 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      ⏱ {Math.floor(chatTimeLeft / 60000)}m {Math.floor((chatTimeLeft % 60000) / 1000)}s left
                    </span>
                  )}
                  {userPlan === 'premium' && chatTimeLeft !== null && chatTimeLeft <= 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                      Session expired — <Link to="/upgrade" style={{ color: 'var(--gold)' }}>Upgrade to Gold</Link>
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    Agent: {selected.agent_name || 'Pending'}
                  </span>
                  {selected.agent_id && userPlan !== 'free' && (
                    <button onClick={async () => {
                      try {
                        const data = await sessionsApi.startVideo({ receiverId: selected.agent_id, bookingId: selected.id });
                        if (data.joinUrl) window.open(data.joinUrl, '_blank', 'width=800,height=600');
                        else alert(data.error || 'Failed to start call');
                      } catch (e) { alert('Failed to start video call'); }
                    }}
                    style={{ marginLeft: 8, padding: '4px 12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {'\uD83D\uDCF9'} Video Call
                    </button>
                  )}
                </div>
                <div className="chat-messages">
                  {messages.length === 0 && (
                    <div className="chat-empty">No messages yet. Send one to get started!</div>
                  )}
                  {messages.map(m => (
                    <div
                      key={m.id}
                      className={`chat-msg ${m.sender_id === user?.id ? 'chat-msg-me' : 'chat-msg-them'}`}
                    >
                      <div className="chat-msg-sender">{m.sender_name} &middot; {m.sender_role}</div>
                      <div className="chat-msg-body">{m.body}</div>
                      <div className="chat-msg-time">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={msgEnd} />
                </div>
                <form className="chat-input" onSubmit={sendMsg}>
                  <input
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={['cancelled', 'completed'].includes(selected.status)}
                  />
                  <button type="submit" disabled={!msgInput.trim()}>Send</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ════════════ PAYMENTS ════════════ */}
        {tab === 'payments' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Payments</h2>
                <p className="dash-section-sub">Manage your booking payments</p>
              </div>
            </div>

            {payBooking && (
              <div style={{ maxWidth: 480, marginBottom: '2rem' }}>
                <PaystackCheckout
                  bookingId={payBooking.id}
                  amount={payBooking.amount}
                  reference={payBooking.reference}
                  onSuccess={() => { setPayBooking(null); loadAll(); }}
                  onClose={() => setPayBooking(null)}
                />
              </div>
            )}

            {!payBooking && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem', background: 'var(--bg2)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--muted)' }}>
                To make a payment, go to <button style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, textDecoration: 'underline', padding: 0 }} onClick={() => setTab('bookings')}>Bookings</button> and click "Pay Now" on an unpaid booking.
              </div>
            )}

            <h3 className="serif" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: '1rem' }}>Payment History</h3>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--offwhite3)' }}>
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Destination</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        No payments yet
                      </td>
                    </tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.reference || '\u2014'}</span></td>
                      <td style={{ fontSize: 13 }}>{p.destination || '\u2014'}</td>
                      <td className="serif" style={{ fontSize: 15 }}>{'\u20A6'}{Number(p.amount).toLocaleString()}</td>
                      <td>
                        <span className={`pill ${
                          p.status === 'completed' || p.status === 'released' ? 'pill-completed' :
                          p.status === 'in_escrow' ? 'pill-info' :
                          p.status === 'refunded' ? 'pill-cancelled' : 'pill-pending'
                        }`}>
                          {p.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════ REVIEWS ════════════ */}
        {tab === 'reviews' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Reviews</h2>
                <p className="dash-section-sub">Rate your completed bookings</p>
              </div>
            </div>

            {reviewMsg && (
              <div style={{
                padding: '10px 14px', marginBottom: '1rem', borderRadius: 'var(--radius-sm)',
                background: reviewMsg.includes('success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: reviewMsg.includes('success') ? 'var(--success)' : 'var(--danger)',
                fontSize: 13, border: '1px solid',
                borderColor: reviewMsg.includes('success') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              }}>
                {reviewMsg}
              </div>
            )}

            {reviewableBookings.length === 0 && !reviewBookingId && (
              <div className="dash-empty">
                <div className="dash-empty-icon">⭐</div>
                <p>No completed bookings to review right now.</p>
              </div>
            )}

            {/* Reviewable bookings list */}
            <div className="booking-list">
              {reviewableBookings.map(b => {
                const pInfo = PATHS[b.travel_path];
                const isActive = reviewBookingId === b.id;
                return (
                  <div key={b.id} className={`bcard ${isActive ? 'bcard-selected' : ''}`}>
                    <div className="bcard-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {pInfo && <span style={{ fontSize: 20 }}>{pInfo.icon}</span>}
                        <div>
                          <div className="bcard-dest serif">{b.destination}</div>
                          <div className="bcard-meta-row">
                            {b.agent_name && <span>Agent: {b.agent_name}</span>}
                            <span> &middot; {b.service}</span>
                          </div>
                        </div>
                      </div>
                      <span className="pill pill-completed">completed</span>
                    </div>

                    {!isActive ? (
                      <div className="bcard-actions" style={{ marginTop: 10 }}>
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => { setReviewBookingId(b.id); setReviewRating(0); setReviewComment(''); setReviewMsg(''); }}
                        >
                          Write Review
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--offwhite3)' }}>
                        {/* Star rating */}
                        <div style={{ marginBottom: '0.8rem' }}>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Rating</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  fontSize: 28, lineHeight: 1, padding: 2,
                                  color: star <= reviewRating ? 'var(--gold)' : 'var(--offwhite3)',
                                  transition: 'color 0.15s',
                                }}
                                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Comment */}
                        <div style={{ marginBottom: '0.8rem' }}>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Comment</div>
                          <textarea
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder="Share your experience with this agent..."
                            rows={3}
                            style={{
                              width: '100%', padding: '10px 12px', background: 'var(--bg2)',
                              border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                              color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 13,
                              resize: 'vertical', outline: 'none',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-sm btn-primary"
                            disabled={reviewRating < 1 || reviewSubmitting}
                            onClick={submitReview}
                            style={{ opacity: reviewRating < 1 || reviewSubmitting ? 0.4 : 1 }}
                          >
                            {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                          </button>
                          <button
                            className="btn-sm btn-ghost"
                            onClick={() => { setReviewBookingId(null); setReviewRating(0); setReviewComment(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ PROFILE ════════════ */}
        {tab === 'profile' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">My Profile</h2>
                <p className="dash-section-sub">Your account information</p>
              </div>
            </div>

            {/* Info card */}
            <div className="profile-card">
              <div className="profile-avatar">{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div className="profile-info">
                <div className="pi-row"><span>Email</span><strong>{user?.email}</strong></div>
                <div className="pi-row"><span>Travel path</span><strong>{pathInfo ? `${pathInfo.icon} ${pathInfo.label}` : '\u2014'}</strong></div>
                <div className="pi-row">
                  <span>Email verified</span>
                  <strong style={{ color: user?.is_verified ? 'var(--success)' : 'var(--danger)' }}>
                    {user?.is_verified ? '\u2713 Verified' : '\u2717 Not verified'}
                  </strong>
                </div>
                <div className="pi-row"><span>Member since</span><strong>{new Date(user?.created_at).toLocaleDateString()}</strong></div>
              </div>
            </div>

            {/* Edit form */}
            <div style={{ padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius)' }}>
              <h3 className="serif" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: '1rem' }}>Edit Profile</h3>

              {profileMsg && (
                <div style={{
                  padding: '10px 14px', marginBottom: '1rem', borderRadius: 'var(--radius-sm)',
                  background: profileMsg.includes('success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: profileMsg.includes('success') ? 'var(--success)' : 'var(--danger)',
                  fontSize: 13,
                }}>
                  {profileMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>First Name</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Last Name</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Country</label>
                  <input
                    type="text"
                    value={profileForm.country}
                    onChange={e => setProfileForm(f => ({ ...f, country: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={profileSaving}
                style={{
                  padding: '10px 24px', background: 'var(--gold)', color: 'var(--bg)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13,
                  cursor: profileSaving ? 'not-allowed' : 'pointer',
                  opacity: profileSaving ? 0.5 : 1, transition: 'background 0.15s',
                }}
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════ SECURITY ════════════ */}
        {tab === 'security' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Security</h2>
                <p className="dash-section-sub">Change your password</p>
              </div>
            </div>

            <div style={{ maxWidth: 480, padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius)' }}>

              {secMsg && (
                <div style={{
                  padding: '10px 14px', marginBottom: '1rem', borderRadius: 'var(--radius-sm)',
                  background: secMsg.includes('success') || secMsg.includes('changed') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: secMsg.includes('success') || secMsg.includes('changed') ? 'var(--success)' : 'var(--danger)',
                  fontSize: 13,
                }}>
                  {secMsg}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Current Password</label>
                <input
                  type="password"
                  value={secForm.currentPassword}
                  onChange={e => setSecForm(f => ({ ...f, currentPassword: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg)',
                    border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>New Password</label>
                <input
                  type="password"
                  value={secForm.newPassword}
                  onChange={e => setSecForm(f => ({ ...f, newPassword: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg)',
                    border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Confirm New Password</label>
                <input
                  type="password"
                  value={secForm.confirmPassword}
                  onChange={e => setSecForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg)',
                    border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={changePassword}
                disabled={secSaving || !secForm.currentPassword || !secForm.newPassword || !secForm.confirmPassword}
                style={{
                  padding: '10px 24px', background: 'var(--gold)', color: 'var(--bg)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13,
                  cursor: secSaving ? 'not-allowed' : 'pointer',
                  opacity: (secSaving || !secForm.currentPassword || !secForm.newPassword || !secForm.confirmPassword) ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {secSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════ NOTIFICATIONS ════════════ */}
        {tab === 'notifications' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Notifications</h2>
                <p className="dash-section-sub">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {notifications.length === 0 && (
              <div className="dash-empty">
                <div className="dash-empty-icon">🔔</div>
                <p>No notifications yet.</p>
              </div>
            )}

            <div className="notif-list">
              {notifications.map((n, i) => (
                <div key={n.id || i} className={`notif-item ${!n.is_read ? 'notif-unread' : ''}`}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-body">{n.body}</div>
                  <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
