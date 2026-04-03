/**
 * Tragency Global Visa & Sponsorship Knowledge Base
 * Comprehensive visa info for 40+ destination countries across all categories
 * AI uses this to give intelligent, accurate responses
 */

const VISA_KNOWLEDGE = {
  // ══════════════════════════════════════════════════════════════════════
  // UNITED KINGDOM
  // ══════════════════════════════════════════════════════════════════════
  'United Kingdom': {
    flag: '🇬🇧', currency: 'GBP',
    sponsorship: {
      education: { visa: 'Student Visa (formerly Tier 4)', fee: '£363', processing: '3-6 weeks', minFunds: '£1,334/month (London), £1,023/month (outside)', workRights: '20hrs/week during term, full-time during holidays', postStudy: 'Graduate Route — 2 years post-study work (3 years PhD)', requirements: ['CAS from licensed sponsor', 'IELTS 6.0+ (or equivalent)', 'TB test', 'Financial proof (28 days in bank)', 'Valid passport'], documents: ['Passport', 'CAS letter', 'IELTS certificate', 'Bank statements', 'TB test result', 'Academic transcripts', 'Passport photos'], applyUrl: 'https://www.gov.uk/student-visa/apply', tips: ['Apply up to 6 months before course starts', 'Maintenance funds must be held for 28 consecutive days', 'Some universities are trusted sponsors — faster processing'] },
      business: { visa: 'Skilled Worker Visa', fee: '£625-£1,423', processing: '3-8 weeks', minSalary: '£38,700/year (or going rate for role)', requirements: ['Certificate of Sponsorship from licensed employer', 'Job at appropriate skill level (RQF 3+)', 'English B1+', 'Salary meets threshold', 'Criminal record certificate'], documents: ['Passport', 'CoS reference number', 'English test', 'Criminal record certificate', 'TB test (some countries)', 'Bank statements'], applyUrl: 'https://www.gov.uk/skilled-worker-visa', sponsorList: 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers', tips: ['80,000+ licensed sponsors in the UK', 'Health & care worker visa has lower salary threshold', 'Can switch from student visa to skilled worker'] },
      tourism: { visa: 'Standard Visitor Visa', fee: '£100', processing: '3 weeks', maxStay: '6 months', requirements: ['Valid passport', 'Proof of accommodation', 'Return ticket', 'Financial proof', 'No work intent'], applyUrl: 'https://www.gov.uk/standard-visitor-visa' },
      medical: { visa: 'Medical Treatment Visa', fee: '£100', processing: '3 weeks', requirements: ['Hospital letter', 'Proof of funds for treatment', 'Medical records'], applyUrl: 'https://www.gov.uk/standard-visitor-visa' },
      family: { visa: 'Family Visa', fee: '£1,538', processing: '12-24 weeks', minIncome: '£29,000/year', requirements: ['UK-based sponsor', 'Minimum income', 'English A1', 'Genuine relationship proof', 'Suitable accommodation'], applyUrl: 'https://www.gov.uk/uk-family-visa' },
      relocation: { visa: 'Global Talent Visa', fee: '£623', processing: '3-8 weeks', requirements: ['Endorsement from approved body', 'Exceptional talent/promise in field', 'No job offer needed', 'No minimum salary'], applyUrl: 'https://www.gov.uk/global-talent', tips: ['Tech Nation endorses tech workers', 'No English language requirement', 'Leads to settlement in 3-5 years'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // UNITED STATES
  // ══════════════════════════════════════════════════════════════════════
  'United States': {
    flag: '🇺🇸', currency: 'USD',
    sponsorship: {
      education: { visa: 'F-1 Student Visa', fee: '$185 + $350 SEVIS', processing: '2-5 weeks', workRights: '20hrs/week on-campus, OPT after graduation (12 months, 36 months STEM)', requirements: ['I-20 from SEVP school', 'SEVIS fee paid', 'Financial proof covering full program', 'Strong ties to home country', 'English proficiency'], documents: ['Passport', 'I-20', 'DS-160 confirmation', 'SEVIS receipt', 'Bank statements/sponsor letter', 'Academic transcripts', 'Test scores (TOEFL/GRE/GMAT)'], applyUrl: 'https://ceac.state.gov/genniv/', tips: ['Apply early — interview wait times vary by embassy', 'OPT allows 12 months work, STEM extension adds 24 months', 'Can apply for H-1B while on OPT'] },
      business: { visa: 'H-1B Work Visa', fee: '$460 + $500 fraud fee + $750-1,500 ACWIA', processing: '3-6 months', minSalary: 'Prevailing wage (varies by role/location)', requirements: ['Bachelor degree in specialty occupation', 'Employer petition', 'Lottery selection (April each year)', 'Labor Condition Application'], sponsorList: 'https://h1bdata.info/', tips: ['Annual cap: 65,000 regular + 20,000 US masters', 'Lottery registration in March, selection in April', 'Cap-exempt: universities, nonprofits, government research', 'L-1 visa alternative for intracompany transfers'] },
      tourism: { visa: 'B-1/B-2 Visitor Visa', fee: '$185', processing: '2-8 weeks', maxStay: '6 months', requirements: ['Strong ties to home country', 'Financial means', 'Clear travel purpose'], applyUrl: 'https://ceac.state.gov/genniv/' },
      family: { visa: 'IR/CR-1 Spouse Visa or K-1 Fiancé', fee: '$325-535', processing: '12-24 months', requirements: ['US citizen/resident sponsor', 'I-130 petition', 'Financial sponsorship (I-864)', 'Medical exam'], applyUrl: 'https://travel.state.gov/content/travel/en/us-visas/immigrate/family-immigration.html' },
      relocation: { visa: 'EB-1/EB-2/EB-3 Green Card', fee: '$700-1,500', processing: '12-36 months', requirements: ['Labor certification (PERM) for most categories', 'Job offer from US employer', 'Priority date current'], tips: ['EB-1A for extraordinary ability — no job offer needed', 'EB-2 NIW for national interest waiver', 'EB-3 for professionals and skilled workers'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // CANADA
  // ══════════════════════════════════════════════════════════════════════
  'Canada': {
    flag: '🇨🇦', currency: 'CAD',
    sponsorship: {
      education: { visa: 'Study Permit', fee: 'CAD $150', processing: '4-16 weeks', workRights: '20hrs/week during study, full-time during breaks, PGWP after graduation', postStudy: 'Post-Graduation Work Permit (PGWP) — 1-3 years', requirements: ['Acceptance from DLI', 'Proof of funds (CAD $20,635/year + tuition)', 'No criminal record', 'Medical exam'], documents: ['Passport', 'Acceptance letter', 'Proof of funds/GIC', 'Medical exam', 'Police clearance', 'Study plan', 'English/French test'], applyUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html', tips: ['SDS (Student Direct Stream) for faster processing from select countries', 'PGWP leads to Canadian PR through Express Entry', 'Quebec requires separate CAQ'] },
      business: { visa: 'LMIA Work Permit / Global Talent Stream', fee: 'CAD $155 + $85 biometrics', processing: '2-12 months', requirements: ['Job offer + positive LMIA', 'Or Express Entry with CRS 470+', 'Language test CLB 7+', 'Education credential assessment'], sponsorList: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html', tips: ['Global Talent Stream: 2-week processing for tech workers', 'LMIA-exempt categories available (CUSMA, IEC)', 'Provincial Nominee Programs can add 600 CRS points'] },
      tourism: { visa: 'Visitor Visa/eTA', fee: 'CAD $100/$7', processing: '2-8 weeks', maxStay: '6 months' },
      family: { visa: 'Family Sponsorship', fee: 'CAD $1,080', processing: '12-24 months', requirements: ['Canadian citizen/PR sponsor', 'Genuine relationship', 'Minimum income (parents/grandparents only)'] },
      relocation: { visa: 'Express Entry (PR)', fee: 'CAD $1,365', processing: '6-12 months', requirements: ['CRS score 470+', 'Language CLB 7+', 'ECA for education', '1+ year skilled work', 'Settlement funds CAD $13,757+'], tips: ['Three streams: FSW, CEC, FST', 'PNP nomination adds 600 points', 'French language bonus points available'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // GERMANY
  // ══════════════════════════════════════════════════════════════════════
  'Germany': {
    flag: '🇩🇪', currency: 'EUR',
    sponsorship: {
      education: { visa: 'Student Visa', fee: '€75', processing: '4-12 weeks', workRights: '120 full days or 240 half days per year', postStudy: '18 months post-study job-seeking visa', requirements: ['University admission', 'Blocked account €11,208/year', 'Health insurance', 'Recognized qualifications'], applyUrl: 'https://www.make-it-in-germany.com/en/visa-residence/types/studying', tips: ['Many programs taught in English', 'Public universities have no/low tuition', 'Blocked account proves financial means'] },
      business: { visa: 'EU Blue Card', fee: '€75-100', processing: '4-8 weeks', minSalary: '€45,300/year (€41,042 shortage occupations)', requirements: ['University degree recognized in Germany', 'Job offer above salary threshold', 'Health insurance'], applyUrl: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card', tips: ['Shortage occupations have lower salary threshold', 'PR after 21 months with B1 German', 'Opportunity Card (Chancenkarte) for job seekers without offer'] },
      relocation: { visa: 'Opportunity Card (Chancenkarte)', fee: '€75', processing: '4-8 weeks', requirements: ['Points-based: degree, experience, age, German/English', 'No job offer needed', '1 year to find employment'], tips: ['New as of June 2024', 'Part-time work allowed while job seeking'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // AUSTRALIA
  // ══════════════════════════════════════════════════════════════════════
  'Australia': {
    flag: '🇦🇺', currency: 'AUD',
    sponsorship: {
      education: { visa: 'Student Visa (Subclass 500)', fee: 'AUD $710', processing: '4-6 weeks', workRights: '48hrs/fortnight during term, unlimited during breaks', postStudy: 'Temporary Graduate visa (subclass 485) — 2-4 years', requirements: ['CoE from CRICOS provider', 'GTE statement', 'IELTS 5.5+', 'OSHC health insurance', 'Financial capacity'], applyUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500' },
      business: { visa: 'TSS Visa (Subclass 482)', fee: 'AUD $1,455-$2,645', processing: '1-4 months', minSalary: 'AUD $70,000+/year (TSMIT)', requirements: ['Occupation on skilled list', '2+ years experience', 'IELTS 5.0+', 'Employer nomination', 'Health & character checks'], sponsorList: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list' },
      relocation: { visa: 'Skilled Independent (Subclass 189)', fee: 'AUD $4,640', processing: '6-18 months', requirements: ['Points test 65+', 'Skills assessment', 'IELTS 6.0+', 'Age under 45', 'Nominated occupation'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // UAE
  // ══════════════════════════════════════════════════════════════════════
  'UAE': {
    flag: '🇦🇪', currency: 'AED',
    sponsorship: {
      business: { visa: 'Employment Visa', fee: 'AED 300-500', processing: '2-4 weeks', requirements: ['Job offer from UAE company', 'Medical fitness', 'Emirates ID', 'Security clearance', 'Attested educational certificates'], tips: ['No income tax', 'Golden Visa for 10 years available for high earners/specialists', 'Free zone companies can sponsor'] },
      tourism: { visa: 'Tourist Visa', fee: '$90-190', processing: '3-5 days', maxStay: '30-90 days' },
      religious: { visa: 'Transit/Visit for Hajj/Umrah', fee: 'Varies', requirements: ['Confirmed pilgrimage booking', 'Meningitis vaccination', 'Return ticket'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // ADDITIONAL COUNTRIES (condensed)
  // ══════════════════════════════════════════════════════════════════════
  'Netherlands': { flag: '🇳🇱', currency: 'EUR', sponsorship: { business: { visa: 'Highly Skilled Migrant', fee: '€210', minSalary: '€46,107/year (under 30: €33,000)', processing: '2-4 weeks', requirements: ['Recognized sponsor employer', 'Salary threshold met', 'Valid passport'], tips: ['30% ruling: tax-free allowance for 5 years', 'Fastest processing in EU'] } } },
  'Ireland': { flag: '🇮🇪', currency: 'EUR', sponsorship: { business: { visa: 'Critical Skills Employment Permit', fee: '€1,000', minSalary: '€38,000+', processing: '4-8 weeks', requirements: ['Occupation on critical skills list', 'Job offer', 'Degree qualification'], tips: ['Stamp 4 after 2 years — open work permission', 'Tech sector very active'] } } },
  'Singapore': { flag: '🇸🇬', currency: 'SGD', sponsorship: { business: { visa: 'Employment Pass', fee: 'SGD $105', minSalary: 'SGD $5,000/month', processing: '3-8 weeks', requirements: ['Job offer', 'Degree', 'Relevant experience'], tips: ['ONE Pass for top talent — $30,000/month', 'Tech.Pass for tech professionals'] } } },
  'New Zealand': { flag: '🇳🇿', currency: 'NZD', sponsorship: { business: { visa: 'Accredited Employer Work Visa', fee: 'NZD $750', processing: '4-8 weeks', requirements: ['Accredited employer', 'Job offer at median wage+', 'Skills match'] } } },
  'Japan': { flag: '🇯🇵', currency: 'JPY', sponsorship: { business: { visa: 'Engineer/Specialist Visa', fee: '¥4,000', processing: '1-3 months', requirements: ['Bachelor degree or 10 years experience', 'Job offer from Japanese company', 'Certificate of Eligibility'], tips: ['Highly Skilled Professional visa for fast-track PR'] } } },
  'South Korea': { flag: '🇰🇷', currency: 'KRW', sponsorship: { business: { visa: 'E-7 Professional Work Visa', fee: '$80', processing: '2-4 weeks', requirements: ['Job offer', 'Relevant degree or experience', 'Employer sponsorship'] } } },
  'Sweden': { flag: '🇸🇪', currency: 'SEK', sponsorship: { business: { visa: 'Work Permit', fee: 'SEK 2,000', minSalary: 'SEK 27,360/month', processing: '2-6 months', requirements: ['Job offer with minimum salary', 'Union-approved terms', 'Health insurance'] } } },
  'Norway': { flag: '🇳🇴', currency: 'NOK', sponsorship: { business: { visa: 'Skilled Worker Permit', fee: 'NOK 6,300', processing: '1-3 months', requirements: ['Job offer', 'Relevant qualifications', 'Minimum salary', 'Full-time position'] } } },
  'Denmark': { flag: '🇩🇰', currency: 'DKK', sponsorship: { business: { visa: 'Fast-Track / Pay Limit Scheme', fee: 'DKK 3,345', minSalary: 'DKK 465,000/year', processing: '1-4 weeks', tips: ['Fast-track for certified companies — 2 weeks processing'] } } },
  'Switzerland': { flag: '🇨🇭', currency: 'CHF', sponsorship: { business: { visa: 'L/B Permit', fee: 'CHF 65-150', processing: '2-6 weeks', requirements: ['Job offer', 'Employer proves no local candidate available', 'Qualifications recognized'], tips: ['Highest salaries in Europe', 'Quotas apply for non-EU nationals'] } } },
  'France': { flag: '🇫🇷', currency: 'EUR', sponsorship: { business: { visa: 'Talent Passport', fee: '€99', processing: '2-8 weeks', requirements: ['Job offer 1.5x minimum wage', 'Or recognized talent/skills', 'Masters degree'], tips: ['Tech Visa for startups — fast processing', '4-year renewable'] } } },
  'Qatar': { flag: '🇶🇦', currency: 'QAR', sponsorship: { business: { visa: 'Work Visa', fee: 'QAR 200', processing: '1-3 weeks', requirements: ['Job offer', 'Medical test', 'Employer sponsorship', 'Attested certificates'] } } },
  'Saudi Arabia': { flag: '🇸🇦', currency: 'SAR', sponsorship: { business: { visa: 'Work Visa (Iqama)', fee: 'SAR 650', processing: '2-4 weeks', requirements: ['Job offer', 'Medical test', 'Employer sponsorship'] }, religious: { visa: 'Hajj/Umrah Visa', fee: 'Free-SAR 300', requirements: ['Authorized travel agent', 'Meningitis vaccination', 'Mahram for women under 45'] } } },
  'Portugal': { flag: '🇵🇹', currency: 'EUR', sponsorship: { business: { visa: 'Tech Visa / Work Visa', fee: '€90', processing: '2-4 weeks', requirements: ['Job offer from certified company', 'Qualifications'], tips: ['Digital Nomad Visa available', 'NHR tax regime — 10 years reduced tax'] } } },
  'Spain': { flag: '🇪🇸', currency: 'EUR', sponsorship: { business: { visa: 'Highly Skilled Worker Visa', fee: '€80', processing: '4-8 weeks', requirements: ['Job offer', 'University degree', 'Salary above €40,000'] }, relocation: { visa: 'Digital Nomad Visa', fee: '€80', requirements: ['Remote work proof', 'Income €2,520+/month', 'Health insurance'] } } },
  'Italy': { flag: '🇮🇹', currency: 'EUR', sponsorship: { business: { visa: 'Work Visa (Nulla Osta)', fee: '€116', processing: '4-12 weeks', requirements: ['Job offer', 'Quota allocation (Decreto Flussi)', 'Employer applies for work authorization'] } } },
  'Poland': { flag: '🇵🇱', currency: 'PLN', sponsorship: { business: { visa: 'Type A Work Permit', fee: 'PLN 100', processing: '1-2 months', requirements: ['Job offer', 'Employer obtains work permit', 'Labor market test'] } } },
  'Belgium': { flag: '🇧🇪', currency: 'EUR', sponsorship: { business: { visa: 'Single Permit', fee: '€350', processing: '2-4 months', requirements: ['Job offer', 'Work permit approved by region', 'Qualifications'] } } },
};

// ── Helper: Get sponsorship info for any route ──────────────────────────────
function getVisaInfo(toCountry, category) {
  const country = VISA_KNOWLEDGE[toCountry];
  if (!country) return null;
  const info = country.sponsorship?.[category];
  if (!info) return null;
  return { ...info, country: toCountry, flag: country.flag, currency: country.currency };
}

// ── Helper: Get all countries with sponsorship info ─────────────────────────
function getAllCountries() {
  return Object.entries(VISA_KNOWLEDGE).map(([name, data]) => ({
    name, flag: data.flag, currency: data.currency,
    categories: Object.keys(data.sponsorship || {}),
  }));
}

// ── Helper: Search knowledge base ───────────────────────────────────────────
function searchKnowledge(query) {
  const lower = query.toLowerCase();
  const results = [];
  for (const [country, data] of Object.entries(VISA_KNOWLEDGE)) {
    for (const [category, info] of Object.entries(data.sponsorship || {})) {
      const text = JSON.stringify(info).toLowerCase();
      if (text.includes(lower) || country.toLowerCase().includes(lower)) {
        results.push({ country, flag: data.flag, category, ...info });
      }
    }
  }
  return results;
}

module.exports = { VISA_KNOWLEDGE, getVisaInfo, getAllCountries, searchKnowledge };
