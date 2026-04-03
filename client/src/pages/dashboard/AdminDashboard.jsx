import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { admin as adminApi, payments as paymentsApi, agents as agentsApi, bookings as bookingsApi, auth as authApi } from '../../services/api';
import { PATHS } from '../../data/paths';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import './AdminDashboard.css';

const STATUS_COLORS = {
  pending: 'pill-pending', agent_assigned: 'pill-info',
  confirmed: 'pill-confirmed', in_progress: 'pill-info',
  completed: 'pill-completed', cancelled: 'pill-cancelled',
};

const PAYMENT_PILL = {
  released: 'pill-completed',
  in_escrow: 'pill-info',
  refunded: 'pill-cancelled',
  pending: 'pill-pending',
};

const ROLE_PILL = {
  admin: 'pill-cancelled',
  agent: 'pill-info',
  traveller: 'pill-pending',
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent ? 'stat-card-accent' : ''}`}>
      <div className="sc-label">{label}</div>
      <div className="sc-value serif">{value}</div>
      {sub && <div className="sc-sub">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');

  // Data
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [payments, setPayments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bookings tab
  const [searchedBookings, setSearchedBookings] = useState([]);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);

  // Users tab
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Settings tab
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Subscriptions tab
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [grantForm, setGrantForm] = useState({ userId: '', plan: 'premium', days: 30 });
  const [grantMsg, setGrantMsg] = useState('');

  // KYC tab
  const [kycAgents, setKycAgents] = useState([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [dash, pay, ag, notif] = await Promise.all([
        adminApi.dashboard(),
        paymentsApi.list({ limit: 100 }),
        agentsApi.list({ status: '' }),
        adminApi.notifications(),
      ]);
      setStats(dash.stats);
      setRecent(dash.recentBookings || []);
      setPayments(pay.payments || []);
      setAgents(ag.agents || []);
      setNotifications(notif.notifications || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  async function loadUsers(search, role) {
    setUsersLoading(true);
    try {
      const params = { limit: 200 };
      if (search) params.search = search;
      if (role) params.role = role;
      const { users: u } = await adminApi.users(params);
      setUsers(u || []);
    } catch (e) { console.error(e); }
    finally { setUsersLoading(false); }
  }

  // ── Bookings search ───────────────────────────────────────────────────────
  async function searchBookings(searchVal, statusVal) {
    setBookingsLoading(true);
    try {
      const params = {};
      if (searchVal) params.ref = searchVal;
      if (searchVal) params.destination = searchVal;
      if (searchVal) params.traveller = searchVal;
      if (statusVal) params.status = statusVal;
      const { bookings: bk } = await bookingsApi.search(params);
      setSearchedBookings(bk || []);
      setBookingsLoaded(true);
    } catch (e) { console.error(e); }
    finally { setBookingsLoading(false); }
  }

  // ── Payment actions ───────────────────────────────────────────────────────
  async function releasePayment(id) {
    if (!window.confirm('Release this payment from escrow to the agent?')) return;
    try {
      await paymentsApi.release(id);
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'released' } : p));
      loadDashboard();
    } catch (e) { alert(e.message); }
  }

  async function refundPayment(id) {
    if (!window.confirm('Refund this payment to the traveller? This cannot be undone.')) return;
    try {
      await paymentsApi.refund(id);
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'refunded' } : p));
      loadDashboard();
    } catch (e) { alert(e.message); }
  }

  // ── Agent actions ─────────────────────────────────────────────────────────
  async function approveAgent(id) {
    if (!window.confirm('Approve this agent? They will be able to receive bookings.')) return;
    try {
      await agentsApi.updateStatus(id, 'active');
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
    } catch (e) { alert(e.message); }
  }

  async function suspendAgent(id) {
    if (!window.confirm('Suspend this agent? They will no longer receive new bookings.')) return;
    try {
      await agentsApi.updateStatus(id, 'suspended');
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'suspended' } : a));
    } catch (e) { alert(e.message); }
  }

  // ── Load subscriptions ───────────────────────────────────────────────────
  async function loadSubscriptions() {
    setSubsLoading(true);
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch('/api/admin/subscriptions', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (e) { console.error(e); }
    finally { setSubsLoading(false); }
  }

  async function handleGrantSub(e) {
    e.preventDefault();
    setGrantMsg('');
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch('/api/admin/subscriptions/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: grantForm.userId, plan: grantForm.plan, durationDays: parseInt(grantForm.days) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGrantMsg(`Granted ${grantForm.plan} to user!`);
      loadSubscriptions();
    } catch (e) { setGrantMsg(e.message); }
  }

  async function cancelSub(id) {
    if (!window.confirm('Cancel this subscription?')) return;
    try {
      const token = localStorage.getItem('tragency_token');
      await fetch(`/api/admin/subscriptions/${id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    } catch (e) { alert(e.message); }
  }

  // ── Load KYC agents ────────────────────────────────────────────────────
  async function loadKycAgents() {
    setKycLoading(true);
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch('/api/admin/agents', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setKycAgents(data.agents || []);
    } catch (e) { console.error(e); }
    finally { setKycLoading(false); }
  }

  async function handleApproveKyc(agentId) {
    if (!window.confirm('Approve this agent? They will be able to receive bookings.')) return;
    try {
      const token = localStorage.getItem('tragency_token');
      await fetch(`/api/admin/agents/${agentId}/approve`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: 'KYC verified and approved' }),
      });
      setKycAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'active', kyc_status: 'approved' } : a));
      setSelectedKyc(null);
    } catch (e) { alert(e.message); }
  }

  async function handleRejectKyc(agentId) {
    if (!rejectReason) { alert('Please provide a rejection reason'); return; }
    try {
      const token = localStorage.getItem('tragency_token');
      await fetch(`/api/admin/agents/${agentId}/reject`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setKycAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'rejected', kyc_status: 'rejected' } : a));
      setSelectedKyc(null);
      setRejectReason('');
    } catch (e) { alert(e.message); }
  }

  async function handleSuspendKyc(agentId) {
    if (!window.confirm('Suspend this agent?')) return;
    try {
      const token = localStorage.getItem('tragency_token');
      await fetch(`/api/admin/agents/${agentId}/suspend`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'Suspended by admin' }),
      });
      setKycAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'suspended' } : a));
    } catch (e) { alert(e.message); }
  }

  // ── Change password ───────────────────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg({ text: '', type: '' });
    if (newPassword.length < 6) {
      setPwMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPwMsg({ text: 'Password changed successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setPwMsg({ text: e.message || 'Failed to change password.', type: 'error' });
    } finally { setPwLoading(false); }
  }

  // ── Tab click handler ─────────────────────────────────────────────────────
  function handleTabClick(id) {
    setTab(id);
    if (id === 'users' && users.length === 0) loadUsers('', '');
    if (id === 'bookings' && !bookingsLoaded) searchBookings('', '');
    if (id === 'subscriptions' && subscriptions.length === 0) loadSubscriptions();
    if (id === 'kyc' && kycAgents.length === 0) loadKycAgents();
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const pendingAgents = agents.filter(a => a.status === 'pending_review').length;
  const escrowPayments = payments.filter(p => p.status === 'in_escrow');

  const paymentSummary = {
    total: payments.length,
    inEscrow: escrowPayments.length,
    escrowAmount: escrowPayments.reduce((s, p) => s + Number(p.amount), 0),
    released: payments.filter(p => p.status === 'released').length,
    refunded: payments.filter(p => p.status === 'refunded').length,
  };

  const NAV = [
    { id: 'overview',      label: 'Overview',       icon: '\u{1F4CA}' },
    { id: 'bookings',      label: 'Bookings',       icon: '\u{1F4CB}' },
    { id: 'payments',      label: 'Payments',       icon: '\u{1F4B0}' },
    { id: 'agents',        label: 'Agents',         icon: '\u{1F91D}', badge: pendingAgents },
    { id: 'kyc',           label: 'KYC Review',     icon: '\u{1F4DD}' },
    { id: 'subscriptions', label: 'Subscriptions',  icon: '\u{1F451}' },
    { id: 'users',         label: 'Users',          icon: '\u{1F465}' },
    { id: 'settings',      label: 'Settings',       icon: '\u2699\uFE0F' },
    { id: 'notifications', label: 'Notifications',  icon: '\u{1F514}', badge: unreadCount },
  ];

  return (
    <div className="dash">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-user">
          <div className="dash-avatar" style={{ background: 'var(--danger)', color: '#fff' }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <div className="dash-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="dash-user-email">{user?.email}</div>
          </div>
        </div>

        <div className="dash-path-badge" style={{ borderColor: 'var(--danger)' }}>
          <span style={{ fontSize: 18 }}>{'\u{1F6E1}\uFE0F'}</span>
          <div>
            <div className="dpb-label">Role</div>
            <div className="dpb-name" style={{ color: 'var(--danger)' }}>Administrator</div>
          </div>
        </div>

        <nav className="dash-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`dash-nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => handleTabClick(n.id)}
            >
              <span className="dni-icon">{n.icon}</span>
              {n.label}
              {n.badge > 0 && <span className="dni-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={logout}>Sign Out</button>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="dash-main">
        {loading && <div className="dash-loading"><div className="dash-spinner" /></div>}

        {/* ═══ OVERVIEW ═══════════════════════════════════════════════ */}
        {!loading && tab === 'overview' && stats && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Platform Overview</h2>
                <p className="dash-section-sub">Real-time Tragency stats</p>
              </div>
            </div>

            <div className="stats-grid">
              <StatCard label="Total Users" value={stats.users.total} sub={`${stats.users.new_30d} new this month`} />
              <StatCard label="Travellers" value={stats.users.travellers} sub="registered travellers" />
              <StatCard label="Active Agents" value={stats.agents.active} sub={`of ${stats.agents.total} total`} accent />
              <StatCard label="Pending Reviews" value={stats.agents.pending_review} sub="agents awaiting approval" accent />
              <StatCard label="Total Bookings" value={stats.bookings.total} sub={`${stats.bookings.completed} completed`} />
              <StatCard label="Bookings This Month" value={stats.bookings.new_30d} sub="last 30 days" />
              <StatCard label="Money in Escrow" value={`\u20A6${Number(stats.payments.in_escrow).toLocaleString()}`} sub="held securely" accent />
              <StatCard label="Platform Revenue" value={`\u20A6${Math.round(Number(stats.payments.released) * 0.05).toLocaleString()}`} sub="5% of released payments" />
            </div>

            <h3 className="serif" style={{ marginTop: '2rem', marginBottom: '1rem' }}>Recent Bookings</h3>
            <div className="admin-table-wrap">
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Ref</th><th>Traveller</th><th>Destination</th>
                    <th>Path</th><th>Amount</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No recent bookings</td></tr>
                  )}
                  {recent.slice(0, 10).map(b => (
                    <tr key={b.id}>
                      <td><span className="ref-code">{b.reference}</span></td>
                      <td>{b.traveller_name}</td>
                      <td>{b.destination}</td>
                      <td>{PATHS[b.travel_path]?.icon} {b.travel_path}</td>
                      <td className="serif">{'\u20A6'}{Number(b.amount).toLocaleString()}</td>
                      <td><span className={`pill ${STATUS_COLORS[b.status] || 'pill-pending'}`}>{b.status?.replace(/_/g, ' ')}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ BOOKINGS ══════════════════════════════════════════════ */}
        {!loading && tab === 'bookings' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">All Bookings</h2>
                <p className="dash-section-sub">{searchedBookings.length} bookings found</p>
              </div>
            </div>

            <div className="admin-filters" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search by reference, destination, or traveller..."
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchBookings(bookingSearch, bookingStatusFilter); }}
                style={{
                  flex: 1, minWidth: 220, padding: '10px 14px',
                  background: 'var(--bg2)', border: '1px solid var(--offwhite3)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
                  fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                }}
              />
              <select
                value={bookingStatusFilter}
                onChange={e => { setBookingStatusFilter(e.target.value); searchBookings(bookingSearch, e.target.value); }}
                style={{
                  padding: '10px 14px', background: 'var(--bg2)',
                  border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="agent_assigned">Agent Assigned</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => searchBookings(bookingSearch, bookingStatusFilter)}
                style={{
                  padding: '10px 20px', background: 'var(--gold)', color: 'var(--bg)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </div>

            {bookingsLoading && <div className="dash-loading"><div className="dash-spinner" /></div>}

            {!bookingsLoading && (
              <div className="admin-table-wrap">
                <table className="pay-table">
                  <thead>
                    <tr>
                      <th>Ref</th><th>Traveller</th><th>Destination</th>
                      <th>Path</th><th>Amount</th><th>Status</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedBookings.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No bookings found</td></tr>
                    )}
                    {searchedBookings.map(b => (
                      <tr key={b.id}>
                        <td><span className="ref-code">{b.reference}</span></td>
                        <td>{b.traveller_name || '—'}</td>
                        <td>{b.destination}</td>
                        <td>{PATHS[b.travel_path]?.icon} {b.travel_path}</td>
                        <td className="serif">{'\u20A6'}{Number(b.amount).toLocaleString()}</td>
                        <td><span className={`pill ${STATUS_COLORS[b.status] || 'pill-pending'}`}>{b.status?.replace(/_/g, ' ')}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ PAYMENTS ══════════════════════════════════════════════ */}
        {!loading && tab === 'payments' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Escrow Management</h2>
                <p className="dash-section-sub">Manage payment releases and refunds</p>
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <StatCard label="Total Payments" value={paymentSummary.total} sub="all time" />
              <StatCard label="In Escrow" value={paymentSummary.inEscrow} sub={`\u20A6${paymentSummary.escrowAmount.toLocaleString()} held`} accent />
              <StatCard label="Released" value={paymentSummary.released} sub="paid to agents" />
              <StatCard label="Refunded" value={paymentSummary.refunded} sub="returned to travellers" />
            </div>

            <div className="admin-table-wrap">
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Ref</th><th>Payer</th><th>Amount</th>
                    <th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No payments yet</td></tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td><span className="ref-code">{p.reference || '—'}</span></td>
                      <td>{p.payer_name || '—'}</td>
                      <td className="serif">{'\u20A6'}{Number(p.amount).toLocaleString()}</td>
                      <td>
                        <span className={`pill ${PAYMENT_PILL[p.status] || 'pill-pending'}`}>
                          {p.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        {p.status === 'in_escrow' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-sm"
                              style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                              onClick={() => releasePayment(p.id)}
                            >
                              Release
                            </button>
                            <button
                              className="btn-sm"
                              style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                              onClick={() => refundPayment(p.id)}
                            >
                              Refund
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ AGENTS ════════════════════════════════════════════════ */}
        {!loading && tab === 'agents' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Agent Management</h2>
                <p className="dash-section-sub">
                  {agents.length} agents
                  {pendingAgents > 0 && (
                    <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: 'var(--gold)', color: 'var(--bg)', fontSize: 11, fontWeight: 700 }}>
                      {pendingAgents} pending review
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Location</th><th>Rating</th>
                    <th>Bookings</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No agents registered</td></tr>
                  )}
                  {agents.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.display_name}</strong></td>
                      <td>{a.location || '—'}</td>
                      <td>{'\u2B50'} {a.rating || '—'} ({a.total_reviews || 0})</td>
                      <td>{a.total_bookings || 0}</td>
                      <td>
                        <span className={`pill ${a.status === 'active' ? 'pill-completed' : a.status === 'pending_review' ? 'pill-pending' : 'pill-cancelled'}`}>
                          {a.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {a.status === 'pending_review' && (
                          <button
                            className="btn-sm"
                            style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                            onClick={() => approveAgent(a.id)}
                          >
                            Approve
                          </button>
                        )}
                        {a.status === 'active' && (
                          <button
                            className="btn-sm"
                            style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                            onClick={() => suspendAgent(a.id)}
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ USERS ═════════════════════════════════════════════════ */}
        {!loading && tab === 'users' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">User Management</h2>
                <p className="dash-section-sub">{users.length} users loaded</p>
              </div>
            </div>

            <div className="admin-filters" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadUsers(userSearch, userRoleFilter); }}
                style={{
                  flex: 1, minWidth: 220, padding: '10px 14px',
                  background: 'var(--bg2)', border: '1px solid var(--offwhite3)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
                  fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: 'none',
                }}
              />
              <select
                value={userRoleFilter}
                onChange={e => { setUserRoleFilter(e.target.value); loadUsers(userSearch, e.target.value); }}
                style={{
                  padding: '10px 14px', background: 'var(--bg2)',
                  border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">All roles</option>
                <option value="traveller">Traveller</option>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => loadUsers(userSearch, userRoleFilter)}
                style={{
                  padding: '10px 20px', background: 'var(--gold)', color: 'var(--bg)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </div>

            {usersLoading && <div className="dash-loading"><div className="dash-spinner" /></div>}

            {!usersLoading && (
              <div className="admin-table-wrap">
                <table className="pay-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Role</th>
                      <th>Verified</th><th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No users found</td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.first_name} {u.last_name}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`pill ${ROLE_PILL[u.role] || 'pill-pending'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ color: u.is_verified ? 'var(--success)' : 'var(--danger)' }}>
                          {u.is_verified ? '\u2713 Verified' : '\u2717 Unverified'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ KYC REVIEW ═════════════════════════════════════════════ */}
        {!loading && tab === 'kyc' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">KYC & Agent Approval</h2>
                <p className="dash-section-sub">Review agent applications, verify documents, approve or reject</p>
              </div>
              <button className="btn-ghost" onClick={loadKycAgents}>Refresh</button>
            </div>

            {kycLoading ? <div className="dash-loading"><div className="dl-spinner" /> Loading agents...</div> : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Agency</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>KYC</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycAgents.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.first_name} {a.last_name}</strong></td>
                        <td>{a.agency_name || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{a.email}</td>
                        <td>
                          <span className={`pill ${a.status === 'active' ? 'pill-completed' : a.status === 'pending_review' ? 'pill-pending' : a.status === 'suspended' ? 'pill-cancelled' : 'pill-info'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${a.kyc_status === 'approved' ? 'pill-completed' : a.kyc_status === 'rejected' ? 'pill-cancelled' : 'pill-pending'}`}>
                            {a.kyc_status || 'not_submitted'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {a.status !== 'active' && (
                              <button className="btn-sm btn-sm-success" onClick={() => handleApproveKyc(a.id)}>Approve</button>
                            )}
                            {a.status !== 'suspended' && a.status !== 'rejected' && (
                              <button className="btn-sm btn-sm-danger" onClick={() => { setSelectedKyc(a); setRejectReason(''); }}>Review</button>
                            )}
                            {a.status === 'active' && (
                              <button className="btn-sm btn-sm-warn" onClick={() => handleSuspendKyc(a.id)}>Suspend</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {kycAgents.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No agents found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* KYC Review Modal */}
            {selectedKyc && (
              <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedKyc(null); }}>
                <div className="admin-modal anim-fadeUp">
                  <button className="admin-modal-close" onClick={() => setSelectedKyc(null)}>&times;</button>
                  <h3 className="serif">Review Agent: {selectedKyc.first_name} {selectedKyc.last_name}</h3>

                  <div className="kyc-details">
                    <div className="kyc-row"><span>Agency:</span><strong>{selectedKyc.agency_name || '—'}</strong></div>
                    <div className="kyc-row"><span>Email:</span><strong>{selectedKyc.email}</strong></div>
                    <div className="kyc-row"><span>Phone:</span><strong>{selectedKyc.phone || '—'}</strong></div>
                    <div className="kyc-row"><span>Country:</span><strong>{selectedKyc.country || '—'}</strong></div>
                    <div className="kyc-row"><span>License:</span><strong>{selectedKyc.license_number || '—'}</strong></div>
                    <div className="kyc-row"><span>Status:</span><span className={`pill ${selectedKyc.status === 'active' ? 'pill-completed' : 'pill-pending'}`}>{selectedKyc.status}</span></div>
                    <div className="kyc-row"><span>KYC Status:</span><span className={`pill ${selectedKyc.kyc_status === 'approved' ? 'pill-completed' : 'pill-pending'}`}>{selectedKyc.kyc_status || 'not_submitted'}</span></div>
                    {selectedKyc.bio && <div className="kyc-bio"><span>Bio:</span><p>{selectedKyc.bio}</p></div>}
                    {selectedKyc.specializations && <div className="kyc-row"><span>Specializations:</span><strong>{Array.isArray(selectedKyc.specializations) ? selectedKyc.specializations.join(', ') : selectedKyc.specializations}</strong></div>}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 6 }}>Rejection reason (required to reject):</label>
                    <textarea
                      value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Missing business registration document..."
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)', fontSize: 14, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button className="btn-primary" onClick={() => handleApproveKyc(selectedKyc.id)}>Approve Agent</button>
                    <button className="btn-danger" onClick={() => handleRejectKyc(selectedKyc.id)}>Reject</button>
                    <button className="btn-ghost" onClick={() => setSelectedKyc(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SUBSCRIPTIONS ═══════════════════════════════════════════ */}
        {!loading && tab === 'subscriptions' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Subscription Management</h2>
                <p className="dash-section-sub">View, grant, and manage user subscriptions</p>
              </div>
              <button className="btn-ghost" onClick={loadSubscriptions}>Refresh</button>
            </div>

            {/* Grant subscription form */}
            <div style={{ padding: 20, background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--offwhite3)', marginBottom: 20 }}>
              <h4 className="serif" style={{ marginBottom: 12 }}>Grant Subscription</h4>
              <form onSubmit={handleGrantSub} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>User ID</label>
                  <input value={grantForm.userId} onChange={e => setGrantForm(p => ({ ...p, userId: e.target.value }))}
                    placeholder="User UUID" required
                    style={{ padding: '8px 12px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)', fontSize: 13, width: 280 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Plan</label>
                  <select value={grantForm.plan} onChange={e => setGrantForm(p => ({ ...p, plan: e.target.value }))}
                    style={{ padding: '8px 12px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                    <option value="premium">Premium</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Days</label>
                  <input type="number" value={grantForm.days} onChange={e => setGrantForm(p => ({ ...p, days: e.target.value }))}
                    style={{ padding: '8px 12px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)', fontSize: 13, width: 80 }} />
                </div>
                <button type="submit" className="btn-primary">Grant</button>
              </form>
              {grantMsg && <p style={{ marginTop: 8, fontSize: 13, color: grantMsg.includes('Granted') ? 'var(--success)' : '#ef4444' }}>{grantMsg}</p>}
            </div>

            {subsLoading ? <div className="dash-loading"><div className="dl-spinner" /> Loading...</div> : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.first_name} {s.last_name}</strong><br/><span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.email}</span></td>
                        <td>
                          <span className={`pill ${s.plan === 'gold' ? 'pill-completed' : 'pill-info'}`} style={{ fontWeight: 700 }}>
                            {s.plan === 'gold' ? '\uD83D\uDC51 Gold' : '\u2B50 Premium'}
                          </span>
                        </td>
                        <td>{'\u20A6'}{Number(s.amount).toLocaleString()}</td>
                        <td><span className={`pill ${s.status === 'active' ? 'pill-completed' : 'pill-cancelled'}`}>{s.status}</span></td>
                        <td style={{ fontSize: 12 }}>{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</td>
                        <td>
                          {s.status === 'active' && (
                            <button className="btn-sm btn-sm-danger" onClick={() => cancelSub(s.id)}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No subscriptions yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS ══════════════════════════════════════════════ */}
        {!loading && tab === 'settings' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Settings</h2>
                <p className="dash-section-sub">Admin profile and security</p>
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-avatar" style={{ background: 'var(--danger)', color: '#fff' }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="profile-info">
                <div className="pi-row"><span>Full name</span><strong>{user?.first_name} {user?.last_name}</strong></div>
                <div className="pi-row"><span>Email</span><strong>{user?.email}</strong></div>
                <div className="pi-row"><span>Role</span><strong style={{ color: 'var(--danger)' }}>Administrator</strong></div>
                <div className="pi-row">
                  <span>Email verified</span>
                  <strong style={{ color: user?.is_verified ? 'var(--success)' : 'var(--danger)' }}>
                    {user?.is_verified ? '\u2713 Verified' : '\u2717 Not verified'}
                  </strong>
                </div>
                <div className="pi-row"><span>Member since</span><strong>{new Date(user?.created_at).toLocaleDateString()}</strong></div>
              </div>
            </div>

            <div style={{
              padding: '2rem', background: 'var(--bg2)',
              border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius)',
            }}>
              <h3 className="serif" style={{ marginBottom: '1.2rem', fontSize: '1.1rem', color: 'var(--ink)' }}>Change Password</h3>

              <form onSubmit={handleChangePassword} style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--offwhite3)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {pwMsg.text && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                    background: pwMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: pwMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${pwMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                  }}>
                    {pwMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    padding: '10px 24px', background: 'var(--gold)', color: 'var(--bg)',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 14,
                    cursor: pwLoading ? 'not-allowed' : 'pointer',
                    opacity: pwLoading ? 0.6 : 1, alignSelf: 'flex-start',
                  }}
                >
                  {pwLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ NOTIFICATIONS ═════════════════════════════════════════ */}
        {!loading && tab === 'notifications' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div>
                <h2 className="serif">Notifications</h2>
                <p className="dash-section-sub">
                  {notifications.length} total
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: 'var(--gold)', color: 'var(--bg)', fontSize: 11, fontWeight: 700 }}>
                      {unreadCount} unread
                    </span>
                  )}
                </p>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">{'\u{1F514}'}</div>
                <p>No notifications yet.</p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map(n => (
                  <div key={n.id} className={`notif-item ${n.is_read ? '' : 'notif-unread'}`}>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-body">{n.body}</div>
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
