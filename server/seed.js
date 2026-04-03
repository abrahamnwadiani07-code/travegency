/**
 * Tragency — Seed demo data
 * Run: npm run seed
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt  = require('bcryptjs');
const { query, pool } = require('./db');

async function seed() {
  console.log('🌱 Seeding Tragency demo data…\n');

  try {
    const hash = await bcrypt.hash('password123', 12);

    // ── Admin user ──────────────────────────────────────────────────────────
    const { rows: [admin] } = await query(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, country, is_verified)
      VALUES ('Admin', 'Tragency', 'admin@tragency.com', '+234800000000', $1, 'admin', 'Nigeria', TRUE)
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
      RETURNING id
    `, [hash]);
    console.log('  ✓ Admin user: admin@tragency.com / password123');

    // ── Demo traveller ──────────────────────────────────────────────────────
    const { rows: [traveller] } = await query(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, country, travel_path, destination, is_verified)
      VALUES ('Chioma', 'Adeyemi', 'chioma@example.com', '+2348012345678', $1, 'traveller', 'Nigeria', 'education', 'United Kingdom', TRUE)
      ON CONFLICT (email) DO UPDATE SET first_name = 'Chioma'
      RETURNING id
    `, [hash]);
    console.log('  ✓ Traveller: chioma@example.com / password123');

    // ── Agent users + profiles ──────────────────────────────────────────────
    const agentsData = [
      { first: 'Emeka', last: 'Okafor', email: 'emeka@tragency.com', display: 'Emeka Okafor', bio: 'UK education specialist with 8 years experience helping students secure admissions to Russell Group universities.', location: 'Lagos, Nigeria', exp: 8, rate: 350000, paths: [{ path: 'education', primary: true }, { path: 'tourism', primary: false }] },
      { first: 'Fatima', last: 'Ibrahim', email: 'fatima@tragency.com', display: 'Fatima Ibrahim', bio: 'Medical tourism expert. I help patients access world-class healthcare in India, Turkey, and the UAE.', location: 'Abuja, Nigeria', exp: 5, rate: 500000, paths: [{ path: 'medical', primary: true }, { path: 'tourism', primary: false }] },
      { first: 'Tunde', last: 'Bakare', email: 'tunde@tragency.com', display: 'Tunde Bakare', bio: 'Business travel and relocation specialist. Visa processing, accommodation, and corporate logistics.', location: 'Lagos, Nigeria', exp: 10, rate: 450000, paths: [{ path: 'business', primary: true }, { path: 'relocation', primary: false }] },
      { first: 'Amina', last: 'Yusuf', email: 'amina@tragency.com', display: 'Amina Yusuf', bio: 'Religious pilgrimage coordinator — Hajj, Umrah, and Holy Land tours. Licensed and trusted by 500+ families.', location: 'Kano, Nigeria', exp: 12, rate: 600000, paths: [{ path: 'religious', primary: true }, { path: 'family', primary: false }] },
      { first: 'Ngozi', last: 'Eze', email: 'ngozi@tragency.com', display: 'Ngozi Eze', bio: 'Family relocation and tourism expert. I make moving abroad stress-free for Nigerian families.', location: 'Port Harcourt, Nigeria', exp: 6, rate: 400000, paths: [{ path: 'family', primary: true }, { path: 'relocation', primary: false }, { path: 'tourism', primary: false }] },
    ];

    for (const a of agentsData) {
      const { rows: [agentUser] } = await query(`
        INSERT INTO users (first_name, last_name, email, phone, password_hash, role, country, is_verified)
        VALUES ($1, $2, $3, '+2340000000', $4, 'agent', 'Nigeria', TRUE)
        ON CONFLICT (email) DO UPDATE SET role = 'agent'
        RETURNING id
      `, [a.first, a.last, a.email, hash]);

      const { rows: [agent] } = await query(`
        INSERT INTO agents (user_id, display_name, bio, location, experience_yrs, rate_per_trip, rating, total_reviews, status, verified_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [agentUser.id, a.display, a.bio, a.location, a.exp, a.rate,
          (3.5 + Math.random() * 1.5).toFixed(2), Math.floor(5 + Math.random() * 50)]);

      if (agent) {
        for (const p of a.paths) {
          await query(
            `INSERT INTO agent_paths (agent_id, path, is_primary) VALUES ($1, $2::travel_path, $3) ON CONFLICT DO NOTHING`,
            [agent.id, p.path, p.primary]
          );
        }
        console.log(`  ✓ Agent: ${a.email} / password123`);
      }
    }

    // ── Demo booking ────────────────────────────────────────────────────────
    const { rows: matchAgent } = await query(`
      SELECT a.id FROM agents a
      JOIN agent_paths ap ON ap.agent_id = a.id
      WHERE ap.path = 'education' AND a.status = 'active'
      LIMIT 1
    `);

    if (matchAgent.length) {
      await query(`
        INSERT INTO bookings (reference, traveller_id, agent_id, travel_path, service, destination, amount, platform_fee, agent_payout, status, notes)
        VALUES ('TRG-EDU-10001', $1, $2, 'education', 'University Admission', 'United Kingdom', 350000, 17500, 332500, 'confirmed', 'Looking for MSc programs in Computer Science')
        ON CONFLICT (reference) DO NOTHING
      `, [traveller.id, matchAgent[0].id]);

      console.log('  ✓ Demo booking: TRG-EDU-10001');
    }

    console.log('\n✅ Seeding complete!\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
