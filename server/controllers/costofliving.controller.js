const { query } = require('../db');

// ── GET /api/cost-of-living/compare?from=Lagos&to=Toronto — compare two cities
const compareCities = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Both "from" and "to" query parameters are required' });
    }

    const { rows } = await query(
      `SELECT * FROM cost_of_living WHERE LOWER(city) = LOWER($1) OR LOWER(city) = LOWER($2)`,
      [from, to]
    );

    const fromCity = rows.find(r => r.city.toLowerCase() === from.toLowerCase());
    const toCity = rows.find(r => r.city.toLowerCase() === to.toLowerCase());

    if (!fromCity) return res.status(404).json({ error: `City not found: ${from}` });
    if (!toCity) return res.status(404).json({ error: `City not found: ${to}` });

    // Calculate totals and differences
    const calcTotal = (c) => (c.rent_1br || 0) + (c.groceries_monthly || 0) + (c.transport_monthly || 0) + (c.utilities_monthly || 0) + (c.internet_monthly || 0) + (c.healthcare_monthly || 0);

    const fromTotal = calcTotal(fromCity);
    const toTotal = calcTotal(toCity);
    const difference = toTotal - fromTotal;
    const percentChange = fromTotal > 0 ? Math.round((difference / fromTotal) * 100) : 0;

    // Category-level comparison
    const categories = [
      { name: 'Rent (1BR)', from: fromCity.rent_1br, to: toCity.rent_1br },
      { name: 'Rent (3BR)', from: fromCity.rent_3br, to: toCity.rent_3br },
      { name: 'Groceries', from: fromCity.groceries_monthly, to: toCity.groceries_monthly },
      { name: 'Transport', from: fromCity.transport_monthly, to: toCity.transport_monthly },
      { name: 'Utilities', from: fromCity.utilities_monthly, to: toCity.utilities_monthly },
      { name: 'Internet', from: fromCity.internet_monthly, to: toCity.internet_monthly },
      { name: 'Dining Out (per meal)', from: fromCity.dining_out, to: toCity.dining_out },
      { name: 'Healthcare', from: fromCity.healthcare_monthly, to: toCity.healthcare_monthly },
    ].map(c => ({
      ...c,
      difference: c.to - c.from,
      percent_change: c.from > 0 ? Math.round(((c.to - c.from) / c.from) * 100) : 0,
    }));

    res.json({
      from: fromCity,
      to: toCity,
      comparison: {
        from_monthly_total: fromTotal,
        to_monthly_total: toTotal,
        difference,
        percent_change: percentChange,
        more_expensive: difference > 0 ? to : difference < 0 ? from : 'equal',
        salary_comparison: {
          from_avg: fromCity.avg_salary,
          to_avg: toCity.avg_salary,
          difference: (toCity.avg_salary || 0) - (fromCity.avg_salary || 0),
        },
        quality_of_life: {
          from_score: fromCity.quality_of_life_score,
          to_score: toCity.quality_of_life_score,
        },
        safety: {
          from_score: fromCity.safety_score,
          to_score: toCity.safety_score,
        },
        categories,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/cost-of-living/cities — list all cities ──────────────────────
const getCities = async (req, res, next) => {
  try {
    const { country, sort } = req.query;

    let sql = `SELECT * FROM cost_of_living`;
    const params = [];

    if (country) {
      params.push(country);
      sql += ` WHERE LOWER(country) = LOWER($${params.length})`;
    }

    if (sort === 'cheapest') {
      sql += ` ORDER BY (COALESCE(rent_1br, 0) + COALESCE(groceries_monthly, 0) + COALESCE(transport_monthly, 0)) ASC`;
    } else if (sort === 'expensive') {
      sql += ` ORDER BY (COALESCE(rent_1br, 0) + COALESCE(groceries_monthly, 0) + COALESCE(transport_monthly, 0)) DESC`;
    } else if (sort === 'quality') {
      sql += ` ORDER BY quality_of_life_score DESC NULLS LAST`;
    } else if (sort === 'safety') {
      sql += ` ORDER BY safety_score DESC NULLS LAST`;
    } else {
      sql += ` ORDER BY city ASC`;
    }

    const { rows } = await query(sql, params);

    // Add monthly total to each city
    const cities = rows.map(c => ({
      ...c,
      monthly_total: (c.rent_1br || 0) + (c.groceries_monthly || 0) + (c.transport_monthly || 0) + (c.utilities_monthly || 0) + (c.internet_monthly || 0) + (c.healthcare_monthly || 0),
    }));

    res.json({ cities, total: cities.length });
  } catch (err) { next(err); }
};

// ── GET /api/cost-of-living/:city — get single city data ──────────────────
const getCity = async (req, res, next) => {
  try {
    const { city } = req.params;

    const { rows } = await query(
      `SELECT * FROM cost_of_living WHERE LOWER(city) = LOWER($1)`,
      [city]
    );

    if (!rows.length) return res.status(404).json({ error: `City not found: ${city}` });

    const c = rows[0];
    const monthlyTotal = (c.rent_1br || 0) + (c.groceries_monthly || 0) + (c.transport_monthly || 0) + (c.utilities_monthly || 0) + (c.internet_monthly || 0) + (c.healthcare_monthly || 0);

    res.json({
      city: {
        ...c,
        monthly_total: monthlyTotal,
        breakdown: {
          rent_1br: c.rent_1br,
          rent_3br: c.rent_3br,
          groceries_monthly: c.groceries_monthly,
          transport_monthly: c.transport_monthly,
          utilities_monthly: c.utilities_monthly,
          internet_monthly: c.internet_monthly,
          dining_out: c.dining_out,
          healthcare_monthly: c.healthcare_monthly,
        },
      },
    });
  } catch (err) { next(err); }
};

module.exports = { compareCities, getCities, getCity };
