/**
 * Location-Based Pricing (Purchasing Power Parity)
 * Prices are fair based on the user's country
 */

const PRICING = {
  // Format: { currency, symbol, premium, gold, jobBoard, jobAutoApply, agentPlacement, matching }
  // All prices are monthly unless noted

  // Africa
  'Nigeria':        { currency: 'NGN', symbol: '₦', premium: 15000, gold: 45000, jobBoard: 5000, jobAutoApply: 15000, agentPlacement: 25000, matching: 5000 },
  'Ghana':          { currency: 'GHS', symbol: 'GH₵', premium: 120, gold: 350, jobBoard: 40, jobAutoApply: 120, agentPlacement: 200, matching: 40 },
  'Kenya':          { currency: 'KES', symbol: 'KES', premium: 1500, gold: 4500, jobBoard: 500, jobAutoApply: 1500, agentPlacement: 2500, matching: 500 },
  'South Africa':   { currency: 'ZAR', symbol: 'R', premium: 250, gold: 750, jobBoard: 85, jobAutoApply: 250, agentPlacement: 420, matching: 85 },
  'Tanzania':       { currency: 'TZS', symbol: 'TSh', premium: 25000, gold: 75000, jobBoard: 8500, jobAutoApply: 25000, agentPlacement: 42000, matching: 8500 },
  'Uganda':         { currency: 'UGX', symbol: 'USh', premium: 35000, gold: 105000, jobBoard: 12000, jobAutoApply: 35000, agentPlacement: 60000, matching: 12000 },
  'Ethiopia':       { currency: 'ETB', symbol: 'Br', premium: 800, gold: 2400, jobBoard: 270, jobAutoApply: 800, agentPlacement: 1350, matching: 270 },
  'Rwanda':         { currency: 'RWF', symbol: 'FRw', premium: 12000, gold: 36000, jobBoard: 4000, jobAutoApply: 12000, agentPlacement: 20000, matching: 4000 },
  'Egypt':          { currency: 'EGP', symbol: 'E£', premium: 450, gold: 1350, jobBoard: 150, jobAutoApply: 450, agentPlacement: 750, matching: 150 },
  'Cameroon':       { currency: 'XAF', symbol: 'FCFA', premium: 8000, gold: 24000, jobBoard: 2700, jobAutoApply: 8000, agentPlacement: 13500, matching: 2700 },

  // Americas
  'United States':  { currency: 'USD', symbol: '$', premium: 15, gold: 45, jobBoard: 5, jobAutoApply: 15, agentPlacement: 25, matching: 5 },
  'Canada':         { currency: 'CAD', symbol: 'CA$', premium: 20, gold: 60, jobBoard: 7, jobAutoApply: 20, agentPlacement: 35, matching: 7 },
  'Brazil':         { currency: 'BRL', symbol: 'R$', premium: 70, gold: 210, jobBoard: 25, jobAutoApply: 70, agentPlacement: 120, matching: 25 },
  'Mexico':         { currency: 'MXN', symbol: 'MX$', premium: 250, gold: 750, jobBoard: 85, jobAutoApply: 250, agentPlacement: 420, matching: 85 },

  // Europe
  'United Kingdom': { currency: 'GBP', symbol: '£', premium: 12, gold: 35, jobBoard: 4, jobAutoApply: 12, agentPlacement: 20, matching: 4 },
  'Germany':        { currency: 'EUR', symbol: '€', premium: 14, gold: 42, jobBoard: 5, jobAutoApply: 14, agentPlacement: 24, matching: 5 },
  'France':         { currency: 'EUR', symbol: '€', premium: 14, gold: 42, jobBoard: 5, jobAutoApply: 14, agentPlacement: 24, matching: 5 },
  'Netherlands':    { currency: 'EUR', symbol: '€', premium: 14, gold: 42, jobBoard: 5, jobAutoApply: 14, agentPlacement: 24, matching: 5 },
  'Ireland':        { currency: 'EUR', symbol: '€', premium: 14, gold: 42, jobBoard: 5, jobAutoApply: 14, agentPlacement: 24, matching: 5 },
  'Spain':          { currency: 'EUR', symbol: '€', premium: 12, gold: 36, jobBoard: 4, jobAutoApply: 12, agentPlacement: 20, matching: 4 },
  'Italy':          { currency: 'EUR', symbol: '€', premium: 12, gold: 36, jobBoard: 4, jobAutoApply: 12, agentPlacement: 20, matching: 4 },
  'Portugal':       { currency: 'EUR', symbol: '€', premium: 10, gold: 30, jobBoard: 4, jobAutoApply: 10, agentPlacement: 18, matching: 4 },
  'Poland':         { currency: 'PLN', symbol: 'zł', premium: 55, gold: 165, jobBoard: 20, jobAutoApply: 55, agentPlacement: 95, matching: 20 },
  'Sweden':         { currency: 'SEK', symbol: 'kr', premium: 150, gold: 450, jobBoard: 50, jobAutoApply: 150, agentPlacement: 250, matching: 50 },
  'Norway':         { currency: 'NOK', symbol: 'kr', premium: 160, gold: 480, jobBoard: 55, jobAutoApply: 160, agentPlacement: 270, matching: 55 },
  'Denmark':        { currency: 'DKK', symbol: 'kr', premium: 100, gold: 300, jobBoard: 35, jobAutoApply: 100, agentPlacement: 170, matching: 35 },
  'Switzerland':    { currency: 'CHF', symbol: 'CHF', premium: 18, gold: 55, jobBoard: 6, jobAutoApply: 18, agentPlacement: 30, matching: 6 },
  'Belgium':        { currency: 'EUR', symbol: '€', premium: 14, gold: 42, jobBoard: 5, jobAutoApply: 14, agentPlacement: 24, matching: 5 },

  // Asia
  'India':          { currency: 'INR', symbol: '₹', premium: 999, gold: 2999, jobBoard: 349, jobAutoApply: 999, agentPlacement: 1699, matching: 349 },
  'UAE':            { currency: 'AED', symbol: 'AED', premium: 55, gold: 165, jobBoard: 20, jobAutoApply: 55, agentPlacement: 95, matching: 20 },
  'Saudi Arabia':   { currency: 'SAR', symbol: 'SAR', premium: 55, gold: 165, jobBoard: 20, jobAutoApply: 55, agentPlacement: 95, matching: 20 },
  'Qatar':          { currency: 'QAR', symbol: 'QAR', premium: 55, gold: 165, jobBoard: 20, jobAutoApply: 55, agentPlacement: 95, matching: 20 },
  'Singapore':      { currency: 'SGD', symbol: 'S$', premium: 20, gold: 60, jobBoard: 7, jobAutoApply: 20, agentPlacement: 35, matching: 7 },
  'Japan':          { currency: 'JPY', symbol: '¥', premium: 2200, gold: 6600, jobBoard: 750, jobAutoApply: 2200, agentPlacement: 3700, matching: 750 },
  'South Korea':    { currency: 'KRW', symbol: '₩', premium: 19000, gold: 57000, jobBoard: 6500, jobAutoApply: 19000, agentPlacement: 32000, matching: 6500 },
  'China':          { currency: 'CNY', symbol: '¥', premium: 99, gold: 299, jobBoard: 35, jobAutoApply: 99, agentPlacement: 169, matching: 35 },
  'Philippines':    { currency: 'PHP', symbol: '₱', premium: 800, gold: 2400, jobBoard: 270, jobAutoApply: 800, agentPlacement: 1350, matching: 270 },
  'Pakistan':       { currency: 'PKR', symbol: 'Rs', premium: 3500, gold: 10500, jobBoard: 1200, jobAutoApply: 3500, agentPlacement: 6000, matching: 1200 },
  'Bangladesh':     { currency: 'BDT', symbol: '৳', premium: 1500, gold: 4500, jobBoard: 500, jobAutoApply: 1500, agentPlacement: 2500, matching: 500 },

  // Oceania
  'Australia':      { currency: 'AUD', symbol: 'A$', premium: 22, gold: 65, jobBoard: 8, jobAutoApply: 22, agentPlacement: 38, matching: 8 },
  'New Zealand':    { currency: 'NZD', symbol: 'NZ$', premium: 24, gold: 70, jobBoard: 8, jobAutoApply: 24, agentPlacement: 40, matching: 8 },
};

// Default pricing (USD) for unknown countries
const DEFAULT_PRICING = { currency: 'USD', symbol: '$', premium: 15, gold: 45, jobBoard: 5, jobAutoApply: 15, agentPlacement: 25, matching: 5 };

function getPricing(country) {
  return PRICING[country] || DEFAULT_PRICING;
}

function formatPrice(amount, pricing) {
  return `${pricing.symbol}${Number(amount).toLocaleString()}`;
}

// Stripe needs amounts in smallest currency unit (cents, kobo, paise, etc.)
function toStripeAmount(amount, currency) {
  const zeroCurrencies = ['JPY', 'KRW', 'UGX', 'RWF', 'TZS', 'XAF'];
  if (zeroCurrencies.includes(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

module.exports = { PRICING, DEFAULT_PRICING, getPricing, formatPrice, toStripeAmount };
