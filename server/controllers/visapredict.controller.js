const { query } = require('../db');

const GROQ_KEY = process.env.GROQ_API_KEY;

async function callGroq(systemPrompt, userMessage) {
  if (!GROQ_KEY) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], max_tokens: 1500, temperature: 0.3 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

const VISA_SYSTEM_PROMPT = `You are a visa application success predictor with deep knowledge of immigration policies worldwide. Given the applicant's profile, predict their visa approval probability and provide actionable feedback.

You MUST respond in valid JSON format only, with no additional text. Use this exact structure:
{
  "probability": <number 0-100>,
  "positive_factors": ["factor 1", "factor 2"],
  "negative_factors": ["factor 1", "factor 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "summary": "Brief overall assessment"
}

Be realistic and data-driven. Consider the specific visa type, country pair, and applicant profile.`;

// ── POST /api/visa/predict — predict visa success probability ─────────────
const predictVisa = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      from_country, to_country, visa_type, travel_purpose,
      age, has_travel_history, financial_status, has_sponsor,
      has_property, employment_status, has_family_ties,
    } = req.body;

    if (!from_country || !to_country || !visa_type || !travel_purpose) {
      return res.status(400).json({ error: 'from_country, to_country, visa_type, and travel_purpose are required' });
    }

    const profileData = {
      age: age || null,
      has_travel_history: has_travel_history || false,
      financial_status: financial_status || 'moderate',
      has_sponsor: has_sponsor || false,
      has_property: has_property || false,
      employment_status: employment_status || 'employed',
      has_family_ties: has_family_ties || false,
    };

    const userMessage = [
      `From Country: ${from_country}`,
      `To Country: ${to_country}`,
      `Visa Type: ${visa_type}`,
      `Travel Purpose: ${travel_purpose}`,
      `Age: ${age || 'Not specified'}`,
      `Travel History: ${has_travel_history ? 'Yes, has previous international travel' : 'No previous international travel'}`,
      `Financial Status: ${financial_status || 'moderate'}`,
      `Has Sponsor: ${has_sponsor ? 'Yes' : 'No'}`,
      `Owns Property: ${has_property ? 'Yes' : 'No'}`,
      `Employment Status: ${employment_status || 'employed'}`,
      `Family Ties in Home Country: ${has_family_ties ? 'Yes' : 'No'}`,
    ].join('\n');

    let probability = 50;
    let factors = [];
    let improvements = [];

    const aiResponse = await callGroq(VISA_SYSTEM_PROMPT, userMessage);

    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = Math.max(0, Math.min(100, parseInt(parsed.probability) || 50));
          factors = [
            ...(parsed.positive_factors || []).map(f => ({ type: 'positive', text: f })),
            ...(parsed.negative_factors || []).map(f => ({ type: 'negative', text: f })),
          ];
          improvements = (parsed.improvements || []).map(i => ({ text: i }));
        }
      } catch (parseErr) {
        // Fall through to rule-based
      }
    }

    // Rule-based fallback or enhancement
    if (!factors.length) {
      // Positive factors
      if (has_travel_history) {
        factors.push({ type: 'positive', text: 'Previous international travel history demonstrates compliance with visa conditions' });
        probability += 10;
      }
      if (financial_status === 'strong') {
        factors.push({ type: 'positive', text: 'Strong financial standing shows ability to fund travel and stay' });
        probability += 12;
      } else if (financial_status === 'moderate') {
        factors.push({ type: 'positive', text: 'Moderate financial status — adequate but could be strengthened' });
        probability += 5;
      }
      if (has_sponsor) {
        factors.push({ type: 'positive', text: 'Having a sponsor in the destination country strengthens the application' });
        probability += 8;
      }
      if (has_property) {
        factors.push({ type: 'positive', text: 'Property ownership demonstrates strong ties to home country' });
        probability += 7;
      }
      if (employment_status === 'employed') {
        factors.push({ type: 'positive', text: 'Current employment shows economic ties and reason to return' });
        probability += 8;
      } else if (employment_status === 'self-employed') {
        factors.push({ type: 'positive', text: 'Self-employment shows economic activity, though stability may be questioned' });
        probability += 5;
      }
      if (has_family_ties) {
        factors.push({ type: 'positive', text: 'Family ties in home country demonstrate roots and intent to return' });
        probability += 6;
      }

      // Negative factors
      if (!has_travel_history) {
        factors.push({ type: 'negative', text: 'No previous travel history — first-time applicants face more scrutiny' });
        probability -= 8;
      }
      if (financial_status === 'weak') {
        factors.push({ type: 'negative', text: 'Weak financial status may raise concerns about ability to fund travel' });
        probability -= 15;
      }
      if (employment_status === 'unemployed') {
        factors.push({ type: 'negative', text: 'Unemployment may raise concerns about ties to home country and financial stability' });
        probability -= 12;
      }
      if (!has_family_ties && !has_property) {
        factors.push({ type: 'negative', text: 'Lack of family ties and property may weaken evidence of intent to return' });
        probability -= 5;
      }

      // Age considerations
      if (age && age < 25) {
        factors.push({ type: 'negative', text: 'Younger applicants may face additional scrutiny for immigration intent' });
        probability -= 3;
      } else if (age && age >= 30 && age <= 50) {
        factors.push({ type: 'positive', text: 'Age range indicates established career and stronger home ties' });
        probability += 3;
      }

      // Improvements
      if (!has_travel_history) {
        improvements.push({ text: 'Consider applying for visas to less restrictive countries first to build travel history' });
      }
      if (financial_status !== 'strong') {
        improvements.push({ text: 'Strengthen your bank statements — maintain consistent balance for 6+ months' });
      }
      if (!has_sponsor && (visa_type === 'tourist' || visa_type === 'visit')) {
        improvements.push({ text: 'Get a sponsor or invitation letter from someone in the destination country' });
      }
      if (!has_property) {
        improvements.push({ text: 'Document any assets or investments that show ties to your home country' });
      }
      if (employment_status === 'unemployed') {
        improvements.push({ text: 'Secure employment or a business before applying — employment letters strengthen applications significantly' });
      }
      improvements.push({ text: 'Prepare a detailed travel itinerary with confirmed hotel bookings and return flight' });
      improvements.push({ text: 'Use an experienced immigration agent to review your application before submission' });

      probability = Math.max(10, Math.min(95, probability));
    }

    const { rows } = await query(`
      INSERT INTO visa_predictions (user_id, from_country, to_country, visa_type, travel_purpose, probability, factors, improvements, profile_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      userId,
      from_country,
      to_country,
      visa_type,
      travel_purpose,
      probability,
      JSON.stringify(factors),
      JSON.stringify(improvements),
      JSON.stringify(profileData),
    ]);

    res.status(201).json({ prediction: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/visa/predictions — get user's past predictions ───────────────
const getPredictions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { rows } = await query(
      `SELECT * FROM visa_predictions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ predictions: rows });
  } catch (err) { next(err); }
};

module.exports = { predictVisa, getPredictions };
