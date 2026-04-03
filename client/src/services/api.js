const BASE = process.env.REACT_APP_API_URL || '/api';

export const getToken   = ()  => localStorage.getItem('tragency_token');
export const setToken   = (t) => localStorage.setItem('tragency_token', t);
export const clearToken = ()  => localStorage.removeItem('tragency_token');

async function req(path, options = {}) {
  const token = getToken();
  const res   = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register       : (body)  => req('/auth/register',        { method: 'POST', body: JSON.stringify(body) }),
  login          : (body)  => req('/auth/login',            { method: 'POST', body: JSON.stringify(body) }),
  me             : ()      => req('/auth/me'),
  updateProfile  : (body)  => req('/auth/profile',          { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword : (body)  => req('/auth/change-password',  { method: 'POST', body: JSON.stringify(body) }),
  verify         : (token) => req('/auth/verify-email',     { method: 'POST', body: JSON.stringify({ token }) }),
  forgot         : (email) => req('/auth/forgot-password',  { method: 'POST', body: JSON.stringify({ email }) }),
  reset          : (body)  => req('/auth/reset-password',   { method: 'POST', body: JSON.stringify(body) }),
};

// ── Agents ────────────────────────────────────────────────────────────────────
export const agents = {
  list              : (p = {}) => req('/agents?' + new URLSearchParams(p)),
  get               : (id)     => req(`/agents/${id}`),
  match             : (path)   => req(`/agents/match/${path}`),
  create            : (body)   => req('/agents',              { method: 'POST',  body: JSON.stringify(body) }),
  updateStatus      : (id, s)  => req(`/agents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) }),
  // Self-management (agent)
  myProfile         : ()       => req('/agents/me'),
  updateMyProfile   : (body)   => req('/agents/me',           { method: 'PATCH', body: JSON.stringify(body) }),
  toggleAvailability: (avail)  => req('/agents/me/availability', { method: 'PATCH', body: JSON.stringify({ available: avail }) }),
  myStats           : ()       => req('/agents/me/stats'),
  apply             : (body)   => req('/agents/apply',        { method: 'POST', body: JSON.stringify(body) }),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookings = {
  list        : (p = {}) => req('/bookings?' + new URLSearchParams(p)),
  get         : (id)     => req(`/bookings/${id}`),
  search      : (p = {}) => req('/bookings/search?' + new URLSearchParams(p)),
  create      : (body)   => req('/bookings',                { method: 'POST',  body: JSON.stringify(body) }),
  updateStatus: (id, b)  => req(`/bookings/${id}/status`,   { method: 'PATCH', body: JSON.stringify(b) }),
  getMessages : (id)     => req(`/bookings/${id}/messages`),
  sendMessage : (id, body) => req(`/bookings/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = {
  list    : (p = {}) => req('/payments?' + new URLSearchParams(p)),
  summary : ()       => req('/payments/summary'),
  initiate: (bookingId) => req('/payments/initiate', { method: 'POST', body: JSON.stringify({ bookingId }) }),
  release : (id)     => req(`/payments/${id}/release`, { method: 'POST' }),
  refund  : (id)     => req(`/payments/${id}/refund`,  { method: 'POST' }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const admin = {
  dashboard    : ()        => req('/admin/dashboard'),
  users        : (p = {})  => req('/admin/users?' + new URLSearchParams(p)),
  updateUser   : (id, body) => req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  notifications: ()        => req('/admin/notifications'),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviews = {
  create      : (body) => req('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  forAgent    : (agentId) => req(`/reviews/agent/${agentId}`),
};

// ── AI Travel Agent ───────────────────────────────────────────────────────────
export const ai = {
  chat           : (sessionId, message) => req('/ai/chat', { method: 'POST', body: JSON.stringify({ sessionId, message }) }),
  conversation   : (sessionId) => req(`/ai/conversation/${sessionId}`),
  match          : (conversationId) => req('/ai/match', { method: 'POST', body: JSON.stringify({ conversationId }) }),
  selectAgent    : (matchId) => req(`/ai/match/${matchId}/select`, { method: 'POST' }),
  acceptMatch    : (matchId) => req(`/ai/match/${matchId}/accept`, { method: 'POST' }),
  declineMatch   : (matchId) => req(`/ai/match/${matchId}/decline`, { method: 'POST' }),
  getMatches     : () => req('/ai/matches'),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documents = {
  upload         : (body) => req('/documents', { method: 'POST', body: JSON.stringify(body) }),
  forBooking     : (bookingId) => req(`/documents/booking/${bookingId}`),
  review         : (id, body) => req(`/documents/${id}/review`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── Milestones ────────────────────────────────────────────────────────────────
export const milestones = {
  create         : (body) => req('/milestones', { method: 'POST', body: JSON.stringify(body) }),
  forBooking     : (bookingId) => req(`/milestones/booking/${bookingId}`),
  complete       : (id) => req(`/milestones/${id}/complete`, { method: 'PATCH' }),
};

// ── Jobs & Companies ──────────────────────────────────────────────────────────
export const jobs = {
  list             : (p = {}) => req('/jobs?' + new URLSearchParams(p)),
  get              : (id) => req(`/jobs/${id}`),
  create           : (body) => req('/jobs', { method: 'POST', body: JSON.stringify(body) }),
  apply            : (id, body) => req(`/jobs/${id}/apply`, { method: 'POST', body: JSON.stringify(body || {}) }),
  myApplications   : () => req('/jobs/my-applications'),
};

export const companies = {
  list             : (p = {}) => req('/companies?' + new URLSearchParams(p)),
};

// ── News ──────────────────────────────────────────────────────────────────────
export const news = {
  list             : (p = {}) => req('/news?' + new URLSearchParams(p)),
  get              : (id) => req(`/news/${id}`),
  categories       : () => req('/news/categories'),
  create           : (body) => req('/news', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = {
  plans            : () => req('/subscriptions/plans'),
  me               : () => req('/subscriptions/me'),
  subscribe        : (plan, gatewayRef) => req('/subscriptions', { method: 'POST', body: JSON.stringify({ plan, gatewayRef }) }),
  cancel           : () => req('/subscriptions/cancel', { method: 'POST' }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export async function loginAndStore(email, password) {
  const data = await auth.login({ email, password });
  setToken(data.token);
  return data.user;
}

export async function registerAndStore(body) {
  const data = await auth.register(body);
  setToken(data.token);
  return data.user;
}
