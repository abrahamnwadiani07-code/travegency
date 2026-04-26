import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { admin as adminApi, payments as paymentsApi, agents as agentsApi, bookings as bookingsApi, auth as authApi } from '../../services/api';
import { PATHS } from '../../data/paths';
import './Dashboard.css';
import './AdminDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

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

  // Job posting
  const [jobForm, setJobForm] = useState({ title: '', description: '', country: '', city: '', industry: 'Technology', visa_sponsored: true, visa_type: '', salary_min: '', salary_max: '', salary_currency: 'USD', experience_min: 0, apply_url: '', company_name: '', employment_type: 'full-time' });
  const [jobPosting, setJobPosting] = useState(false);
  const [jobMsg, setJobMsg] = useState('');

  // Revenue tab
  const [revenue, setRevenue] = useState(null);
  const [stripeStats, setStripeStats] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  // Pricing tab
  const [pricingConfig, setPricingConfig] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [editCountry, setEditCountry] = useState(null);
  const [editPrices, setEditPrices] = useState({});
  const [pricingMsg, setPricingMsg] = useState('');

  // Exchange rates tab
  const [exchangeRates, setExchangeRates] = useState({});
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeMsg, setExchangeMsg] = useState('');
  const [exchangeEditing, setExchangeEditing] = useState(false);
  const [editRates, setEditRates] = useState({});

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
      const res = await fetch(`${API_BASE}/admin/subscriptions`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${API_BASE}/admin/subscriptions/grant`, {
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
      await fetch(`${API_BASE}/admin/subscriptions/${id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    } catch (e) { alert(e.message); }
  }

  // ── Load revenue ───────────────────────────────────────────────────────
  async function loadRevenue() {
    setRevenueLoading(true);
    try {
      const token = localStorage.getItem('tragency_token');
      const [revRes, stripeRes] = await Promise.all([
        fetch(`${API_BASE}/admin/revenue`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/stripe/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const revData = await revRes.json();
      const stripeData = await stripeRes.json();
      setRevenue(revData);
      setStripeStats(stripeData);
    } catch (e) { console.error(e); }
    finally { setRevenueLoading(false); }
  }

  // ── Load pricing config ───────────────────────────────────────────────
  async function loadPricing() {
    setPricingLoading(true);
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch(`${API_BASE}/admin/pricing`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPricingConfig(data.pricing);
    } catch (e) { console.error(e); }
    finally { setPricingLoading(false); }
  }

  async function savePricing(country) {
    setPricingMsg('');
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch(`${API_BASE}/admin/pricing/${encodeURIComponent(country)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editPrices),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPricingMsg(`Pricing updated for ${country}`);
      setEditCountry(null);
      loadPricing();
    } catch (e) { setPricingMsg(e.message); }
  }

  async function handleRefund(chargeId) {
    if (!window.confirm('Issue a full refund for this charge?')) return;
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch(`${API_BASE}/admin/refund/${chargeId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Refund issued: ${data.refund.amount} ${data.refund.currency}`);
      loadRevenue();
    } catch (e) { alert(e.message); }
  }

  // ── Load KYC agents ────────────────────────────────────────────────────
  async function loadKycAgents() {
    setKycLoading(true);
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch(`${API_BASE}/admin/agents`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setKycAgents(data.agents || []);
    } catch (e) { console.error(e); }
    finally { setKycLoading(false); }
  }

  async function handleApproveKyc(agentId) {
    if (!window.confirm('Approve this agent? They will be able to receive bookings.')) return;
    try {
      const token = localStorage.getItem('tragency_token');
      await fetch(`${API_BASE}/admin/agents/${agentId}/approve`, {
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
      await fetch(`${API_BASE}/admin/agents/${agentId}/reject`, {
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
      await fetch(`${API_BASE}/admin/agents/${agentId}/suspend`, {
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
    if (id === 'revenue' && !revenue) loadRevenue();
    if (id === 'pricing' && !pricingConfig) loadPricing();
    if (id === 'kyc' && kycAgents.length === 0) loadKycAgents();
    if (id === 'exchange' && Object.keys(exchangeRates).length === 0) loadExchangeRates();
  }

  // ── Exchange rates ──────────────────────────────────────────────────────
  async function loadExchangeRates() {
    setExchangeLoading(true);
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch(`${API_BASE}/admin/exchange-rates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const rates = data.rates || {};
      // Provide defaults if empty
      if (Object.keys(rates).length === 0) {
        const defaults = {
          NGN: 0.00065, GHS: 0.065, KES: 0.0065, ZAR: 0.055,
          TZS: 0.00038, UGX: 0.00027, ETB: 0.008, RWF: 0.00072,
          EGP: 0.02, XAF: 0.0016, AED: 0.27, SAR: 0.27,
          QAR: 0.27, KRW: 0.00075, CNY: 0.14, PHP: 0.018,
          PKR: 0.0035, BDT: 0.0084,
        };
        setExchangeRates(defaults);
        setEditRates(defaults);
      } else {
        setExchangeRates(rates);
        setEditRates(rates);
      }
    } catch (e) { console.error(e); }
    finally { setExchangeLoading(false); }
  }

  async function saveExchangeRates() {
    setExchangeLoading(true);
    setExchangeMsg('');
    try {
      const token = localStorage.getItem('tragency_token');
      const res = await fetch(`${API_BASE}/admin/exchange-rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rates: editRates }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setExchangeRates({ ...editRates });
      setExchangeEditing(false);
      setExchangeMsg('Exchange rates saved successfully!');
    } catch (e) { setExchangeMsg('Error: ' + e.message); }
    finally { setExchangeLoading(false); }
  }

  function addExchangeRate() {
    const code = window.prompt('Enter currency code (e.g. NGN, GHS, KES):');
    if (!code) return;
    const rate = window.prompt(`Enter rate for ${code.toUpperCase()} to USD (e.g. 0.00065):`);
    if (!rate || isNaN(Number(rate))) return;
    setEditRates(prev => ({ ...prev, [code.toUpperCase()]: Number(rate) }));
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
    { id: 'revenue',       label: 'Revenue',         icon: '\u{1F4B5}' },
    { id: 'pricing',       label: 'Pricing',         icon: '\u{1F3F7}' },
    { id: 'exchange',      label: 'Exchange Rates',  icon: '\u{1F4B1}' },
    { id: 'users',         label: 'Users',          icon: '\u{1F465}' },
    { id: 'postjob',       label: 'Post Job',       icon: '\u{1F4DD}' },
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

        {/* ═══ POST JOB ═════════════════════════════════════════════ */}
        {!loading && tab === 'postjob' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div><h2 className="serif">Post a Job</h2><p className="dash-section-sub">Add job listings for any country</p></div>
            </div>

            {jobMsg && <div style={{ padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13, background: jobMsg.includes('posted') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: jobMsg.includes('posted') ? '#10b981' : '#ef4444' }}>{jobMsg}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault(); setJobPosting(true); setJobMsg('');
              try {
                const token = localStorage.getItem('tragency_token');
                const res = await fetch(`${API_BASE}/jobs`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify(jobForm),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setJobMsg('Job posted successfully!');
                setJobForm({ title: '', description: '', country: '', city: '', industry: 'Technology', visa_sponsored: true, visa_type: '', salary_min: '', salary_max: '', salary_currency: 'USD', experience_min: 0, apply_url: '', company_name: '', employment_type: 'full-time' });
              } catch (err) { setJobMsg(err.message); }
              finally { setJobPosting(false); }
            }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Job Title *</label>
                <input value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} required
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Description *</label>
                <textarea value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} required rows={4}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Company Name</label>
                <input value={jobForm.company_name} onChange={e => setJobForm(p => ({ ...p, company_name: e.target.value }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Country *</label>
                <input value={jobForm.country} onChange={e => setJobForm(p => ({ ...p, country: e.target.value }))} required placeholder="e.g. United Kingdom"
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>City</label>
                <input value={jobForm.city} onChange={e => setJobForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. London"
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Industry</label>
                <select value={jobForm.industry} onChange={e => setJobForm(p => ({ ...p, industry: e.target.value }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }}>
                  {['Technology','Finance','Healthcare','Engineering','Education','Consulting','Energy','Marketing','Legal','Hospitality','Retail','General'].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Visa Sponsored?</label>
                <select value={jobForm.visa_sponsored ? 'yes' : 'no'} onChange={e => setJobForm(p => ({ ...p, visa_sponsored: e.target.value === 'yes' }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }}>
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Visa Type</label>
                <input value={jobForm.visa_type} onChange={e => setJobForm(p => ({ ...p, visa_type: e.target.value }))} placeholder="e.g. Skilled Worker"
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Min Salary</label>
                <input type="number" value={jobForm.salary_min} onChange={e => setJobForm(p => ({ ...p, salary_min: e.target.value }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Max Salary</label>
                <input type="number" value={jobForm.salary_max} onChange={e => setJobForm(p => ({ ...p, salary_max: e.target.value }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Currency</label>
                <select value={jobForm.salary_currency} onChange={e => setJobForm(p => ({ ...p, salary_currency: e.target.value }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }}>
                  {['USD','GBP','EUR','CAD','AUD','NGN','INR','AED','SGD','JPY'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Min Experience (years)</label>
                <input type="number" value={jobForm.experience_min} onChange={e => setJobForm(p => ({ ...p, experience_min: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>Apply URL</label>
                <input value={jobForm.apply_url} onChange={e => setJobForm(p => ({ ...p, apply_url: e.target.value }))} placeholder="https://..."
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" disabled={jobPosting} style={{ padding: '12px 32px', background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {jobPosting ? 'Posting...' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══ REVENUE ═══════════════════════════════════════════════ */}
        {!loading && tab === 'revenue' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div><h2 className="serif">Revenue & Payments</h2><p className="dash-section-sub">Track income, Stripe balance, and issue refunds</p></div>
              <button className="btn-ghost" onClick={loadRevenue}>Refresh</button>
            </div>

            {revenueLoading ? <div className="dash-loading"><div className="dl-spinner" /> Loading...</div> : revenue && (
              <>
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                  <StatCard label="Total Revenue" value={`${revenue.revenue?.total?.count || 0} payments`} sub={`All time`} accent />
                  <StatCard label="This Month" value={`${revenue.revenue?.monthly?.count || 0} payments`} />
                  {revenue.revenue?.byPlan?.map(p => (
                    <StatCard key={p.plan} label={`${p.plan?.toUpperCase()} subscribers`} value={p.count} sub={`Total: ${Number(p.total).toLocaleString()}`} />
                  ))}
                </div>

                {/* Stripe Balance */}
                {stripeStats?.enabled && (
                  <div style={{ padding: 16, background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--offwhite3)', marginBottom: 20 }}>
                    <h4 className="serif" style={{ marginBottom: 12 }}>Stripe Balance</h4>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      {stripeStats.balance?.available?.map((b, i) => (
                        <div key={i}><span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>{b.currency} {b.amount.toLocaleString()}</span><br/><span style={{ fontSize: 12, color: 'var(--muted)' }}>Available</span></div>
                      ))}
                      {stripeStats.balance?.pending?.map((b, i) => (
                        <div key={i}><span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 18 }}>{b.currency} {b.amount.toLocaleString()}</span><br/><span style={{ fontSize: 12, color: 'var(--muted)' }}>Pending</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revenue by Currency */}
                {revenue.revenue?.byCurrency?.length > 0 && (
                  <div style={{ padding: 16, background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--offwhite3)', marginBottom: 20 }}>
                    <h4 className="serif" style={{ marginBottom: 12 }}>Revenue by Currency</h4>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {revenue.revenue.byCurrency.map((c, i) => (
                        <div key={i} style={{ padding: '8px 16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--offwhite2)' }}>
                          <strong style={{ color: 'var(--gold)' }}>{c.currency} {Number(c.total).toLocaleString()}</strong>
                          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>({c.count} payments)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Payments */}
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Currency</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>
                      {(revenue.recentPayments || []).map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.first_name} {p.last_name}</strong><br/><span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</span></td>
                          <td><span className={`pill ${p.plan === 'gold' ? 'pill-completed' : 'pill-info'}`}>{p.plan}</span></td>
                          <td style={{ fontWeight: 600 }}>{Number(p.amount).toLocaleString()}</td>
                          <td>{p.currency}</td>
                          <td><span className={`pill ${p.status === 'active' ? 'pill-completed' : 'pill-cancelled'}`}>{p.status}</span></td>
                          <td style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td>{p.gateway_ref && p.gateway_ref.startsWith('ch_') && (
                            <button className="btn-sm btn-sm-danger" onClick={() => handleRefund(p.gateway_ref)}>Refund</button>
                          )}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ PRICING ══════════════════════════════════════════════════ */}
        {!loading && tab === 'pricing' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <div><h2 className="serif">Pricing Management</h2><p className="dash-section-sub">Set location-based pricing for 40+ countries</p></div>
              <button className="btn-ghost" onClick={loadPricing}>Refresh</button>
            </div>

            {pricingMsg && <div style={{ padding: 10, background: pricingMsg.includes('updated') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: pricingMsg.includes('updated') ? '#10b981' : '#ef4444' }}>{pricingMsg}</div>}

            {pricingLoading ? <div className="dash-loading"><div className="dl-spinner" /> Loading...</div> : pricingConfig && (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Country</th><th>Currency</th><th>Premium</th><th>Gold</th><th>Job Board</th><th>Auto-Apply</th><th>Agent</th><th>Actions</th></tr></thead>
                  <tbody>
                    {Object.entries(pricingConfig).map(([country, p]) => (
                      <tr key={country}>
                        <td><strong>{country}</strong></td>
                        <td>{p.symbol} {p.currency}</td>
                        <td>{editCountry === country ? <input type="number" value={editPrices.premium || ''} onChange={e => setEditPrices(prev => ({ ...prev, premium: Number(e.target.value) }))} style={{ width: 80, padding: 4, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 4 }} /> : `${p.symbol}${p.premium.toLocaleString()}`}</td>
                        <td>{editCountry === country ? <input type="number" value={editPrices.gold || ''} onChange={e => setEditPrices(prev => ({ ...prev, gold: Number(e.target.value) }))} style={{ width: 80, padding: 4, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 4 }} /> : `${p.symbol}${p.gold.toLocaleString()}`}</td>
                        <td>{editCountry === country ? <input type="number" value={editPrices.jobBoard || ''} onChange={e => setEditPrices(prev => ({ ...prev, jobBoard: Number(e.target.value) }))} style={{ width: 80, padding: 4, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 4 }} /> : `${p.symbol}${p.jobBoard.toLocaleString()}`}</td>
                        <td>{editCountry === country ? <input type="number" value={editPrices.jobAutoApply || ''} onChange={e => setEditPrices(prev => ({ ...prev, jobAutoApply: Number(e.target.value) }))} style={{ width: 80, padding: 4, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 4 }} /> : `${p.symbol}${p.jobAutoApply.toLocaleString()}`}</td>
                        <td>{editCountry === country ? <input type="number" value={editPrices.agentPlacement || ''} onChange={e => setEditPrices(prev => ({ ...prev, agentPlacement: Number(e.target.value) }))} style={{ width: 80, padding: 4, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--offwhite3)', borderRadius: 4 }} /> : `${p.symbol}${p.agentPlacement.toLocaleString()}`}</td>
                        <td>
                          {editCountry === country ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-sm btn-sm-success" onClick={() => savePricing(country)}>Save</button>
                              <button className="btn-sm btn-sm-danger" onClick={() => setEditCountry(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button className="btn-sm btn-sm-warn" onClick={() => { setEditCountry(country); setEditPrices({ ...p }); }}>Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ EXCHANGE RATES ═══════════════════════════════════════ */}
        {!loading && tab === 'exchange' && (
          <div className="dash-section anim-fadeUp">
            <div className="dash-section-head">
              <h2 className="serif">Exchange Rates (to USD)</h2>
              <p>Manage currency conversion rates used for PayPal payments. These rates convert local currencies to USD.</p>
            </div>

            {exchangeMsg && (
              <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: exchangeMsg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: exchangeMsg.startsWith('Error') ? '#ef4444' : '#22c55e', fontSize: 13 }}>
                {exchangeMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {!exchangeEditing ? (
                <button className="btn-sm btn-primary" onClick={() => setExchangeEditing(true)}>Edit Rates</button>
              ) : (
                <>
                  <button className="btn-sm btn-primary" onClick={saveExchangeRates} disabled={exchangeLoading}>
                    {exchangeLoading ? 'Saving...' : 'Save All'}
                  </button>
                  <button className="btn-sm" onClick={() => { setExchangeEditing(false); setEditRates({ ...exchangeRates }); }}>Cancel</button>
                </>
              )}
              {exchangeEditing && (
                <button className="btn-sm" onClick={addExchangeRate}>+ Add Currency</button>
              )}
            </div>

            {exchangeLoading && Object.keys(editRates).length === 0 ? (
              <div className="dash-loading"><div className="dash-spinner" /></div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th>Rate (1 unit = X USD)</th>
                      <th>Example: 10,000 = USD</th>
                      {exchangeEditing && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(exchangeEditing ? editRates : exchangeRates)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([code, rate]) => (
                        <tr key={code}>
                          <td><strong>{code}</strong></td>
                          <td>
                            {exchangeEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editRates[code] || ''}
                                onChange={e => setEditRates(prev => ({ ...prev, [code]: Number(e.target.value) }))}
                                style={{ width: 120, padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--offwhite3)', borderRadius: 6, color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13 }}
                              />
                            ) : (
                              <span style={{ fontFamily: 'monospace' }}>{rate}</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                            ${(10000 * (exchangeEditing ? (editRates[code] || 0) : rate)).toFixed(2)}
                          </td>
                          {exchangeEditing && (
                            <td>
                              <button className="btn-sm btn-cancel" onClick={() => {
                                const next = { ...editRates };
                                delete next[code];
                                setEditRates(next);
                              }}>Remove</button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--offwhite3)' }}>
              <h4 style={{ color: 'var(--ink3)', fontSize: 13, marginBottom: 8 }}>How exchange rates work</h4>
              <ul style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, paddingLeft: 20 }}>
                <li>These rates convert local currency amounts to USD for PayPal payments</li>
                <li>Stripe handles currency conversion automatically (these rates don't affect Stripe)</li>
                <li>Update rates regularly to match current market rates</li>
                <li>Rate = how much 1 unit of the currency is worth in USD</li>
              </ul>
            </div>
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
