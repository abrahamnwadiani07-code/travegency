# Tragency Backend — Node.js + PostgreSQL API

Complete REST API for the Tragency travel marketplace.

## Tech Stack
- **Node.js** + **Express** — API server
- **PostgreSQL** — primary database
- **JWT** — authentication
- **bcryptjs** — password hashing
- **Nodemailer** — transactional emails
- **Paystack** — escrow payment gateway (Nigeria)
- **helmet + cors** — security

---

## Quick Start

### 1. Install PostgreSQL and create the database
```sql
CREATE DATABASE tragency;
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB credentials, JWT secret, email config, Paystack keys
```

### 4. Run migrations
```bash
npm run migrate
```

### 5. Seed demo data
```bash
npm run seed
```

### 6. Start server
```bash
npm run dev        # development (nodemon)
npm start          # production
```

Server runs at: `http://localhost:5000`
Health check:   `http://localhost:5000/health`

---

## API Reference

### Auth
| Method | Endpoint                    | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| POST   | /api/auth/register          | —    | Register traveller       |
| POST   | /api/auth/login             | —    | Login (returns JWT)      |
| GET    | /api/auth/me                | JWT  | Get current user         |
| POST   | /api/auth/verify-email      | —    | Verify email token       |
| POST   | /api/auth/forgot-password   | —    | Send reset email         |
| POST   | /api/auth/reset-password    | —    | Reset with token         |

### Agents
| Method | Endpoint                    | Auth       | Description              |
|--------|-----------------------------|------------|--------------------------|
| GET    | /api/agents                 | —          | List agents (filterable) |
| GET    | /api/agents/:id             | —          | Get single agent         |
| GET    | /api/agents/match/:path     | —          | Best agent for path      |
| POST   | /api/agents                 | Admin      | Onboard agent            |
| PATCH  | /api/agents/:id/status      | Admin      | Suspend/activate         |

### Bookings
| Method | Endpoint                       | Auth  | Description              |
|--------|--------------------------------|-------|--------------------------|
| GET    | /api/bookings                  | JWT   | List bookings            |
| GET    | /api/bookings/:id              | JWT   | Get booking detail       |
| POST   | /api/bookings                  | JWT   | Create booking           |
| PATCH  | /api/bookings/:id/status       | JWT   | Update status            |
| GET    | /api/bookings/:id/messages     | JWT   | Get messages             |
| POST   | /api/bookings/:id/messages     | JWT   | Send message             |

### Payments
| Method | Endpoint                       | Auth  | Description              |
|--------|--------------------------------|-------|--------------------------|
| GET    | /api/payments                  | JWT   | List payments            |
| GET    | /api/payments/summary          | Admin | Platform stats           |
| POST   | /api/payments/initiate         | JWT   | Init Paystack payment    |
| POST   | /api/payments/webhook          | —     | Paystack webhook         |
| POST   | /api/payments/:id/release      | Admin | Release from escrow      |
| POST   | /api/payments/:id/refund       | Admin | Refund to traveller      |

### Admin
| Method | Endpoint                       | Auth  | Description              |
|--------|--------------------------------|-------|--------------------------|
| GET    | /api/admin/dashboard           | Admin | Platform stats           |
| GET    | /api/admin/users               | Admin | All users                |
| PATCH  | /api/admin/users/:id           | Admin | Update user              |
| GET    | /api/admin/notifications       | JWT   | User notifications       |

---

## Database Schema

```
users        — travellers, agents, admins
agents       — agent profiles (linked to users)
agent_paths  — which travel paths each agent handles
bookings     — trip bookings (traveller ↔ agent)
payments     — escrow payment records
messages     — in-booking chat
notifications— system alerts
```

## Travel Paths (ENUMs)
`education` · `tourism` · `medical` · `business` · `relocation` · `religious` · `family`

## Booking Status Flow
```
pending → agent_assigned → confirmed → in_progress → completed
                                    ↘ cancelled
                                    ↘ disputed
```

## Payment Status Flow
```
unpaid → in_escrow → released   (trip completed)
                  → refunded    (trip cancelled)
                  → disputed    (under review)
```

---

## Connecting to the Frontend

Copy `src/api.frontend.js` into your React project as `src/services/api.js`.

Then in your Portal.jsx, replace the fake submit with:
```js
import { registerAndStore, bookings } from '../services/api';

async function handleSubmit(e) {
  e.preventDefault();
  // 1. Register user
  const user = await registerAndStore({
    firstName: form.firstName,
    lastName:  form.lastName,
    email:     form.email,
    phone:     form.phone,
    password:  form.password,
    country:   form.country,
    travelPath: pathId,
    destination: form.destination,
    travelDate: form.date,
    notes: form.notes,
  });

  // 2. Create booking
  const { booking, reference } = await bookings.create({
    travelPath: pathId,
    service:    form.service || path.steps[0],
    destination: form.destination,
    travelDate: form.date,
    amount:     form.amount || path.rate,
    notes:      form.notes,
  });

  // 3. Navigate to success screen with reference
  setReference(reference);
  setStep('success');
}
```

---

## Deployment Notes

- Set `NODE_ENV=production` in your hosting environment
- Use a managed PostgreSQL instance (Railway, Supabase, RDS)
- Store all secrets in environment variables — never commit `.env`
- Set up Paystack webhook URL in your Paystack dashboard:
  `https://yourdomain.com/api/payments/webhook`
- Recommended hosting: Railway, Render, or a VPS with PM2
