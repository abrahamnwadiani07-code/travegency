import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookings as bookingsApi, agents as agentsApi, payments as paymentsApi, auth as authApi, admin as adminApi } from '../../services/api';
import { PATHS } from '../../data/paths';
import './Dashboard.css';
import './AgentDashboard.css';

const STATUS_COLORS = {
  pending: 'pill-pending', agent_assigned: 'pill-info',
  confirmed: 'pill-confirmed', in_progress: 'pill-info',
  completed: 'pill-completed', cancelled: 'pill-cancelled',
};

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('bookings');

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Messages
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const msgEnd = useRef(null);
  const pollRef = useRef(null);

  // Earnings
  const [payments, setPayments] = useState([]);

  // Performance / Stats
  const [stats, setStats] = useState(null);

  // Profile
  const [agentProfile, setAgentProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', bio: '', location: '', experienceYrs: '', ratePerTrip: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [availability, setAvailability] = useState(true);

  // Settings
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Loading
  const [loading, setLoading] = useState(true);

  // ── Load data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Chat polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selected) {
      loadMessages(selected.id);
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadMessages(selected.id), 8000);
    }
    return () => clearInterval(pollRef.current);
  }, [selected]);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load profile when profile tab is active ─────────────────────────────
  useEffect(() => {
    if (tab === 'profile' && !agentProfile) loadProfile();
  }, [tab]);

  // ── Load stats when performance tab is active ───────────────────────────
  useEffect(() => {
    if (tab === 'performance' && !stats) loadStats();
  }, [tab]);

  // ── Load notifications when tab is active ───────────────────────────────
  useEffect(() => {
    if (tab === 'notifications') loadNotifications();
  }, [tab]);

  // ── Data loaders ────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    try {
      const [bk, py] = await Promise.all([
        bookingsApi.list({ limit: 100 }),
        paymentsApi.list({ limit: 100 }),
      ]);
      setBookings(bk.bookings || []);
      setPayments(py.payments || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadMessages(id) {
    try {
      const { messages: data } = await bookingsApi.getMessages(id);
      setMessages(data || []);
    } catch (e) { console.error(e); }
  }

  async function loadProfile() {
    try {
      const { agent } = await agentsApi.myProfile();
      setAgentProfile(agent);
      setProfileForm({
        displayName: agent.displayName || agent.display_name || '',
        bio: agent.bio || '',
        location: agent.location || '',
        experienceYrs: agent.experienceYrs || agent.experience_yrs || '',
        ratePerTrip: agent.ratePerTrip || agent.rate_per_trip || '',
      });
      setAvailability(agent.is_available !== false);
    } catch (e) { console.error(e); }
  }

  async function loadStats() {
    try {
      const data = await agentsApi.myStats();
      setStats(data);
    } catch (e) { console.error(e); }
  }

  async function loadNotifications() {
    try {
      const { notifications: n } = await adminApi.notifications();
      setNotifications(n || []);
    } catch (e) { console.error(e); }
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  async function sendMsg(e) {
    e.preventDefault();
    if (!msgInput.trim() || !selected) return;
    try {
      await bookingsApi.sendMessage(selected.id, msgInput.trim());
      setMsgInput('');
      loadMessages(selected.id);
    } catch (e) { console.error(e); }
  }

  async function markComplete(id) {
    if (!window.confirm('Mark this booking as completed? This will release payment to you.')) return;
    try {
      await bookingsApi.updateStatus(id, { status: 'completed' });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b));
      if (selected?.id === id) setSelected(s => ({ ...s, status: 'completed' }));
    } catch (e) { alert(e.message); }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const { agent } = await agentsApi.updateMyProfile({
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        location: profileForm.location,
        experienceYrs: Number(profileForm.experienceYrs) || 0,
        ratePerTrip: Number(profileForm.ratePerTrip) || 0,
      });
      setAgentProfile(agent);
      setProfileMsg('Profile updated successfully.');
    } catch (e) { setProfileMsg(e.message || 'Failed to update profile.'); }
    finally { setProfileSaving(false); }
  }

  async function toggleAvail() {
    const next = !availability;
    try {
      await agentsApi.toggleAvailability(next);
      setAvailability(next);
    } catch (e) { alert(e.message || 'Failed to toggle availability.'); }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg('New password must be at least 6 characters.');
      return;
    }
    setPwSaving(true);
    try {
      const { message } = await authApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg(message || 'Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { setPwMsg(e.message || 'Failed to change password.'); }
    finally { setPwSaving(false); }
  }

  // ── Computed values ─────────────────────────────────────────────────────
  const activeBookings = bookings.filter(b => !['cancelled', 'completed'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarned = payments.filter(p => p.status === 'released').reduce((s, p) => s + Number(p.amount) * 0.95, 0);
  const pendingPayout = payments.filter(p => p.status === 'in_escrow').reduce((s, p) => s + Number(p.amount) * 0.95, 0);

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  const NAV = [
    { id: 'bookings',      label: 'Bookings',      icon: '\ud83d\udccb' },
    { id: 'messages',      label: 'Messages',       icon: '\ud83d\udcac' },
    { id: 'earnings',      label: 'Earnings',       icon: '\ud83d\udcb0' },
    { id: 'performance',   label: 'Performance',    icon: '\ud83d\udcca' },
    { id: 'profile',       label: 'Profile',        icon: '\ud83d\udc64' },
    { id: 'settings',      label: 'Settings',       icon: '\u2699\ufe0f' },
    { id: 'notifications', label: 'Notifications',  icon: '\ud83d\udd14' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="dash">
      {/* ══ Sidebar ══ */}
      <aside className="dash-sidebar">
        <div className="dash-user">
          <div className="dash-avatar" style={{ background: 'var(--accent)', color: '#fff' }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <div className="dash-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="dash-user-email">{user?.email}</div>
          </div>
        </div>

        <div className="dash-path-badge" style={{ borderColor: 'var(--accent)' }}>
          <span style={{ fontSize: 18 }}>{'\ud83e\udd1d'}</span>
          <div>
            <div className="dpb-label">Role</div>
            <div className="dpb-name" style={{ color: 'var(--accent)' }}>Verified Agent</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="agent-quick-stats">
          <div className="aqs-item">
            <div className="aqs-val">{activeBookings.length}</div>
            <div className="aqs-lbl">Active</div>
          </div>
          <div className="aqs-item">
            <div className="aqs-val">{completedBookings.length}</div>
            <div className="aqs-lbl">Completed</div>
          </div>
          <div className="aqs-item">
            <div className="aqs-val">{'\u20a6'}{Math.round(totalEarned).toLocaleString()}</div>
            <div className="aqs-lbl">Earned</div>
          </div>
        </div>

        <nav className="dash-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`dash-nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => setTab(n.id)}
            >
              <span className="dni-icon">{n.icon}</span>
              {n.label}
              {n.id === 'bookings' && activeBookings.length > 0 && (
                <span className="dni-badge">{activeBookings.length}</span>
              )}
              {n.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                <span className="dni-badge">{notifications.filter(n => !n.read).length}</span>
              )}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={logout}>Sign Out</button>
      </aside>

      {/* ══ Main ══ */}
      <main className="dash-main">

        {/* ── TAB 1: BOOKINGS ── */}
        {tab === 'bookings' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Assigned Bookings</h2>
                <p className="dash-section-sub">{bookings.length} total {'\u00b7'} {activeBookings.length} active {'\u00b7'} {completedBookings.length} completed</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['all', 'pending', 'agent_assigned', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
                  <button
                    key={s}
                    className={`pill ${statusFilter === s ? 'pill-active' : 'pill-filter'}`}
                    onClick={() => setStatusFilter(s)}
                    style={{
                      cursor: 'pointer',
                      border: statusFilter === s ? '1px solid var(--gold)' : '1px solid var(--offwhite3)',
                      background: statusFilter === s ? 'rgba(212,168,83,0.15)' : 'transparent',
                      color: statusFilter === s ? 'var(--gold)' : 'var(--muted)',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontFamily: "'Outfit', sans-serif",
                      textTransform: 'capitalize',
                    }}
                  >
                    {s === 'all' ? 'All' : s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {loading && <div className="dash-loading"><div className="dash-spinner" /></div>}

            {!loading && filteredBookings.length === 0 && (
              <div className="dash-empty">
                <div className="dash-empty-icon">{'\ud83d\udccb'}</div>
                <p>{statusFilter === 'all' ? "No bookings assigned yet. They'll appear here when travellers book you." : `No ${statusFilter.replace('_', ' ')} bookings.`}</p>
              </div>
            )}

            <div className="booking-list">
              {filteredBookings.map(b => {
                const path = PATHS[b.travel_path];
                return (
                  <div key={b.id} className={`bcard ${selected?.id === b.id ? 'bcard-selected' : ''}`}>
                    <div className="bcard-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {path && <span style={{ fontSize: 20 }}>{path.icon}</span>}
                        <div>
                          <div className="bcard-dest serif">{b.destination}</div>
                          <div className="bcard-meta-row">
                            <span>{b.traveller_name || b.traveller_email}</span>
                            <span> {'\u00b7'} {b.service}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`pill ${STATUS_COLORS[b.status] || 'pill-pending'}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="bcard-details">
                      <div className="bd"><strong>{b.reference}</strong>Ref</div>
                      <div className="bd"><strong>{'\u20a6'}{Math.round(Number(b.amount) * 0.95).toLocaleString()}</strong>Your payout (95%)</div>
                      <div className="bd"><strong>{b.travel_date ? new Date(b.travel_date).toLocaleDateString() : '\u2014'}</strong>Travel date</div>
                      <div className="bd"><strong>{'\u20a6'}{Number(b.amount).toLocaleString()}</strong>Booking value</div>
                    </div>
                    {b.notes && (
                      <div className="bcard-notes">
                        <span>{'\ud83d\udcdd'}</span> {b.notes}
                      </div>
                    )}
                    <div className="bcard-actions">
                      <button
                        className="btn-sm btn-msg"
                        onClick={() => { setSelected(b); setTab('messages'); }}
                      >
                        Message Traveller
                      </button>
                      {['agent_assigned', 'confirmed', 'in_progress'].includes(b.status) && (
                        <button
                          className="btn-sm btn-complete-agent"
                          onClick={() => markComplete(b.id)}
                          style={{
                            background: 'rgba(76,175,80,0.12)',
                            color: 'var(--success, #4caf50)',
                            border: '1px solid rgba(76,175,80,0.25)',
                          }}
                        >
                          {'\u2713'} Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: MESSAGES ── */}
        {tab === 'messages' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Traveller Messages</h2>
                <p className="dash-section-sub">Chat with your assigned travellers</p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">{'\ud83d\udcac'}</div>
                <p>No bookings yet. Messages will appear when you have assigned bookings.</p>
              </div>
            ) : (
              <div className="agent-chat-layout">
                {/* Booking selector sidebar */}
                <div className="agent-booking-list">
                  <div className="abl-title">Bookings</div>
                  {bookings.filter(b => b.status !== 'cancelled').map(b => (
                    <div
                      key={b.id}
                      className={`abl-item ${selected?.id === b.id ? 'abl-item-active' : ''}`}
                      onClick={() => setSelected(b)}
                    >
                      <div className="abl-dest">{b.destination}</div>
                      <div className="abl-name">{b.traveller_name || b.traveller_email || '\u2014'}</div>
                      <span className={`pill ${STATUS_COLORS[b.status]}`} style={{ fontSize: 9 }}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Chat area */}
                {!selected ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="dash-empty">
                      <div className="dash-empty-icon">{'\ud83d\udcac'}</div>
                      <p>Select a booking to start chatting.</p>
                    </div>
                  </div>
                ) : (
                  <div className="chat-wrap" style={{ flex: 1 }}>
                    <div className="chat-booking-bar">
                      <span className="serif" style={{ fontSize: 15 }}>{selected.destination}</span>
                      <span className={`pill ${STATUS_COLORS[selected.status]}`} style={{ fontSize: 10 }}>
                        {selected.status?.replace('_', ' ')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        {selected.traveller_name || selected.traveller_email}
                      </span>
                      <button
                        style={{ marginLeft: 12, padding: '4px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('tragency_token');
                            const res = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/sessions/video/start`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ bookingId: selected.id }),
                            });
                            const data = await res.json();
                            if (data.url) window.open(data.url, '_blank');
                            else alert('Video call URL not available');
                          } catch (e) { alert('Failed to start video call'); }
                        }}
                      >
                        {'\uD83D\uDCF9'} Video Call
                      </button>
                    </div>
                    <div className="chat-messages">
                      {messages.length === 0 && (
                        <div className="chat-empty">No messages yet. Introduce yourself to the traveller!</div>
                      )}
                      {messages.map(m => (
                        <div
                          key={m.id}
                          className={`chat-msg ${m.sender_id === user?.id ? 'chat-msg-me' : 'chat-msg-them'}`}
                        >
                          <div className="chat-msg-sender">{m.sender_name} {'\u00b7'} {m.sender_role}</div>
                          <div className="chat-msg-body">{m.body}</div>
                          <div className="chat-msg-time">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' \u00b7 '}
                            {new Date(m.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      <div ref={msgEnd} />
                    </div>
                    <form className="chat-input" onSubmit={sendMsg}>
                      <input
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        placeholder="Type a message to the traveller\u2026"
                        disabled={['cancelled', 'completed'].includes(selected.status)}
                      />
                      <button type="submit" disabled={!msgInput.trim()}>Send {'\u2192'}</button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: EARNINGS ── */}
        {tab === 'earnings' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Earnings</h2>
                <p className="dash-section-sub">Your Tragency payouts (95% of booking value)</p>
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <StatCard label="Total earned" value={`\u20a6${Math.round(totalEarned).toLocaleString()}`} sub="released to you" />
              <StatCard label="Pending payout" value={`\u20a6${Math.round(pendingPayout).toLocaleString()}`} sub="in escrow" accent />
              <StatCard label="Jobs completed" value={completedBookings.length} sub="trips finished" />
              <StatCard label="Platform rate" value="95%" sub="you keep 95%" />
            </div>

            <div className="earnings-table-wrap">
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Destination</th>
                    <th>Booking Value</th>
                    <th>Agent Payout (95%)</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        No earnings yet
                      </td>
                    </tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td><span className="ref-code">{p.reference || '\u2014'}</span></td>
                      <td style={{ fontSize: 13 }}>{p.destination || '\u2014'}</td>
                      <td className="serif" style={{ fontSize: 15 }}>{'\u20a6'}{Number(p.amount).toLocaleString()}</td>
                      <td className="serif" style={{ fontSize: 15, color: 'var(--success)' }}>
                        {'\u20a6'}{Math.round(Number(p.amount) * 0.95).toLocaleString()}
                      </td>
                      <td>
                        <span className={`pill ${
                          p.status === 'released' ? 'pill-completed' :
                          p.status === 'in_escrow' ? 'pill-info' : 'pill-pending'
                        }`}>{p.status?.replace('_', ' ')}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="earnings-note">
              <span>{'\ud83d\udd12'}</span>
              Earnings in escrow are released automatically when you mark a booking as complete and the traveller confirms. Platform fee: 5%.
            </div>
          </div>
        )}

        {/* ── TAB 4: PERFORMANCE ── */}
        {tab === 'performance' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Performance</h2>
                <p className="dash-section-sub">Your agent metrics and ratings</p>
              </div>
            </div>

            {!stats ? (
              <div className="dash-loading"><div className="dash-spinner" /></div>
            ) : (
              <>
                {/* Booking stats */}
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                  <StatCard label="Total bookings" value={stats.bookings?.total ?? 0} sub="all time" />
                  <StatCard label="Active" value={stats.bookings?.active ?? 0} sub="in progress" accent />
                  <StatCard label="Completed" value={stats.bookings?.completed ?? 0} sub="finished" />
                  <StatCard label="Cancelled" value={stats.bookings?.cancelled ?? 0} sub="dropped" />
                  <StatCard label="This month" value={stats.bookings?.this_month ?? 0} sub={new Date().toLocaleString('default', { month: 'long' })} />
                </div>

                {/* Rating */}
                <div style={{ marginBottom: '2rem' }}>
                  <div className="profile-card">
                    <div style={{ textAlign: 'center', minWidth: 120 }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--gold)' }} className="serif">
                        {stats.reviews?.avg_rating ? Number(stats.reviews.avg_rating).toFixed(1) : '\u2014'}
                      </div>
                      <div style={{ fontSize: 22, letterSpacing: 2, marginTop: 4 }}>
                        {renderStars(stats.reviews?.avg_rating || 0)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                        {stats.reviews?.total ?? 0} review{(stats.reviews?.total ?? 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="profile-info">
                      <div className="pi-row">
                        <span>Average rating</span>
                        <strong>{stats.reviews?.avg_rating ? Number(stats.reviews.avg_rating).toFixed(2) : 'N/A'}</strong>
                      </div>
                      <div className="pi-row">
                        <span>Total reviews</span>
                        <strong>{stats.reviews?.total ?? 0}</strong>
                      </div>
                      <div className="pi-row">
                        <span>Total earned</span>
                        <strong>{'\u20a6'}{Math.round(stats.payments?.total_earned ?? 0).toLocaleString()}</strong>
                      </div>
                      <div className="pi-row">
                        <span>Pending payout</span>
                        <strong>{'\u20a6'}{Math.round(stats.payments?.pending_payout ?? 0).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly booking trend */}
                <div className="agent-tips">
                  <div className="at-title serif">Monthly Booking Trend (Last 6 months)</div>
                  {stats.monthlyBookings && stats.monthlyBookings.length > 0 ? (
                    stats.monthlyBookings.slice(-6).map((mb, i) => {
                      const maxCount = Math.max(...stats.monthlyBookings.slice(-6).map(m => m.count), 1);
                      const barWidth = Math.max((mb.count / maxCount) * 100, 4);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < stats.monthlyBookings.slice(-6).length - 1 ? '1px solid var(--offwhite3)' : 'none' }}>
                          <span style={{ fontSize: 13, color: 'var(--muted)', width: 80, flexShrink: 0 }}>{mb.month}</span>
                          <div style={{ flex: 1, background: 'var(--offwhite2)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                            <div style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--accent), var(--gold))',
                              borderRadius: 4,
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', width: 30, textAlign: 'right' }}>{mb.count}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: 13 }}>No monthly data available yet.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 5: PROFILE ── */}
        {tab === 'profile' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Agent Profile</h2>
                <p className="dash-section-sub">Edit your public agent information</p>
              </div>
            </div>

            {!agentProfile ? (
              <div className="dash-loading"><div className="dash-spinner" /></div>
            ) : (
              <>
                {/* Availability toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '1rem 1.2rem', marginBottom: '1.5rem',
                  background: availability ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)',
                  border: `1px solid ${availability ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'}`,
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: availability ? 'var(--success, #4caf50)' : 'var(--danger, #f44336)',
                  }} />
                  <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>
                    {availability ? 'Available for new bookings' : 'Currently unavailable'}
                  </span>
                  <button
                    onClick={toggleAvail}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--offwhite3)',
                      background: 'var(--bg2)',
                      color: 'var(--ink)',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {availability ? 'Go Unavailable' : 'Go Available'}
                  </button>
                </div>

                {/* Profile edit form */}
                <div className="profile-card" style={{ flexDirection: 'column', gap: '1.5rem' }}>
                  <form onSubmit={saveProfile} style={{ width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <FieldGroup label="Display Name" value={profileForm.displayName} onChange={v => setProfileForm(p => ({ ...p, displayName: v }))} />
                      <FieldGroup label="Location" value={profileForm.location} onChange={v => setProfileForm(p => ({ ...p, location: v }))} />
                      <FieldGroup label="Experience (years)" value={profileForm.experienceYrs} onChange={v => setProfileForm(p => ({ ...p, experienceYrs: v }))} type="number" />
                      <FieldGroup label="Rate per trip (\u20a6)" value={profileForm.ratePerTrip} onChange={v => setProfileForm(p => ({ ...p, ratePerTrip: v }))} type="number" />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        rows={4}
                        style={{
                          width: '100%', padding: '10px 14px',
                          background: 'var(--bg)', border: '1px solid var(--offwhite3)',
                          borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
                          fontFamily: "'Outfit', sans-serif", fontSize: 14,
                          resize: 'vertical', outline: 'none',
                        }}
                        placeholder="Tell travellers about yourself..."
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        style={{
                          padding: '10px 24px',
                          background: 'var(--gold)', color: 'var(--bg)',
                          border: 'none', borderRadius: 'var(--radius-sm)',
                          fontFamily: "'Outfit', sans-serif", fontWeight: 600,
                          fontSize: 14, cursor: profileSaving ? 'not-allowed' : 'pointer',
                          opacity: profileSaving ? 0.6 : 1,
                        }}
                      >
                        {profileSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                      {profileMsg && (
                        <span style={{ fontSize: 13, color: profileMsg.includes('success') ? 'var(--success, #4caf50)' : 'var(--danger, #f44336)' }}>
                          {profileMsg}
                        </span>
                      )}
                    </div>
                  </form>
                </div>

                {/* Tips */}
                <div className="agent-tips" style={{ marginTop: '1.5rem' }}>
                  <div className="at-title serif">Tips for great service</div>
                  {[
                    'Respond to new bookings within 2 hours to maintain your rating.',
                    'Message travellers proactively with updates \u2014 they appreciate it.',
                    'Mark bookings complete only after the traveller confirms satisfaction.',
                    'Keep your bio and rate updated to attract more bookings.',
                  ].map((tip, i) => (
                    <div key={i} className="at-tip">
                      <div className="at-num">{i + 1}</div>
                      <div className="at-text">{tip}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 6: SETTINGS ── */}
        {tab === 'settings' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Settings</h2>
                <p className="dash-section-sub">Account settings and security</p>
              </div>
            </div>

            {/* Account info */}
            <div className="profile-card" style={{ marginBottom: '2rem' }}>
              <div className="profile-avatar" style={{ background: 'var(--accent)', color: '#fff' }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="profile-info">
                <div className="pi-row"><span>Email</span><strong>{user?.email}</strong></div>
                <div className="pi-row"><span>Role</span><strong style={{ color: 'var(--accent)' }}>{user?.role}</strong></div>
                <div className="pi-row">
                  <span>Email verified</span>
                  <strong style={{ color: user?.is_verified ? 'var(--success)' : 'var(--danger)' }}>
                    {user?.is_verified ? '\u2713 Verified' : '\u2717 Not verified'}
                  </strong>
                </div>
                <div className="pi-row"><span>Member since</span><strong>{new Date(user?.created_at).toLocaleDateString()}</strong></div>
              </div>
            </div>

            {/* Change password */}
            <div className="profile-card" style={{ flexDirection: 'column', gap: '1rem' }}>
              <h3 className="serif" style={{ fontSize: 18, color: 'var(--ink)', margin: 0 }}>Change Password</h3>
              <form onSubmit={changePassword} style={{ width: '100%', maxWidth: 420 }}>
                <FieldGroup
                  label="Current password"
                  value={pwForm.currentPassword}
                  onChange={v => setPwForm(p => ({ ...p, currentPassword: v }))}
                  type="password"
                />
                <FieldGroup
                  label="New password"
                  value={pwForm.newPassword}
                  onChange={v => setPwForm(p => ({ ...p, newPassword: v }))}
                  type="password"
                />
                <FieldGroup
                  label="Confirm new password"
                  value={pwForm.confirmPassword}
                  onChange={v => setPwForm(p => ({ ...p, confirmPassword: v }))}
                  type="password"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={pwSaving}
                    style={{
                      padding: '10px 24px',
                      background: 'var(--gold)', color: 'var(--bg)',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                      fontFamily: "'Outfit', sans-serif", fontWeight: 600,
                      fontSize: 14, cursor: pwSaving ? 'not-allowed' : 'pointer',
                      opacity: pwSaving ? 0.6 : 1,
                    }}
                  >
                    {pwSaving ? 'Changing...' : 'Change Password'}
                  </button>
                  {pwMsg && (
                    <span style={{ fontSize: 13, color: pwMsg.toLowerCase().includes('success') || pwMsg.toLowerCase().includes('changed') ? 'var(--success, #4caf50)' : 'var(--danger, #f44336)' }}>
                      {pwMsg}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 7: NOTIFICATIONS ── */}
        {tab === 'notifications' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Notifications</h2>
                <p className="dash-section-sub">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">{'\ud83d\udd14'}</div>
                <p>No notifications yet.</p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map(n => (
                  <div key={n.id} className={`notif-item ${!n.read ? 'notif-unread' : ''}`}>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-body">{n.body || n.message}</div>
                    <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent ? 'stat-card-accent' : ''}`}>
      <div className="sc-label">{label}</div>
      <div className="sc-value serif">{value}</div>
      {sub && <div className="sc-sub">{sub}</div>}
    </div>
  );
}

function FieldGroup({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'var(--bg)', border: '1px solid var(--offwhite3)',
          borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
          fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
        }}
      />
    </div>
  );
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <>
      {Array.from({ length: full }, (_, i) => <span key={`f${i}`} style={{ color: 'var(--gold)' }}>{'\u2605'}</span>)}
      {half && <span style={{ color: 'var(--gold)' }}>{'\u2606'}</span>}
      {Array.from({ length: empty }, (_, i) => <span key={`e${i}`} style={{ color: 'var(--offwhite3)' }}>{'\u2606'}</span>)}
    </>
  );
}
