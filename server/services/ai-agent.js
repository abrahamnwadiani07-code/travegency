/**
 * Tragency AI Travel Agent — Professional Conversational Engine
 *
 * Features:
 * - Phase-based conversation flow (greeting → gathering → deepening → advising → ready)
 * - Learns from every user message and references previous answers
 * - Professional, warm, expert tone
 * - Path-specific deep knowledge
 * - Comprehensive visa database
 * - Falls back to Claude API if ANTHROPIC_API_KEY is set
 */

// ══════════════════════════════════════════════════════════════════════════════
// VISA KNOWLEDGE DATABASE
// ══════════════════════════════════════════════════════════════════════════════

const VISA_DB = {
  'nigeria-uk-education': {
    visa: 'Student Visa (formerly Tier 4)',
    fee: '£490',
    processing: '3–6 weeks',
    ihs: '£1,035/year (Immigration Health Surcharge)',
    checklist: [
      'Valid international passport (must be valid for duration of stay)',
      'CAS (Confirmation of Acceptance for Studies) from your university',
      'IELTS Academic score — minimum 6.0 overall (some courses require 6.5–7.0)',
      'Financial evidence: bank statements showing £1,334/month (London) or £1,023/month (outside London) held for 28 consecutive days',
      'TB test certificate from an approved clinic in Nigeria',
      'Academic transcripts and degree certificates',
      'English language test certificate (IELTS/TOEFL/PTE)',
      'Passport-sized photographs (45mm × 35mm, white background)',
      'Proof of accommodation in the UK',
      'Immigration Health Surcharge (IHS) payment confirmation',
    ],
    tips: [
      'Apply no earlier than 6 months before your course starts, but at least 3 weeks before you travel',
      'The 28-day financial rule is strict — your bank balance must never dip below the required amount during the 28-day period',
      'Your CAS number is the most important document — ensure all details match your passport exactly',
      'Consider opening a Barclays or HSBC account before departure for easier banking in the UK',
      'NHS surcharge must be paid upfront when you apply — budget for this',
    ],
    timeline: '6–8 months before course start: begin IELTS prep → 4–5 months: apply to universities → 2–3 months: receive CAS → 6 weeks before: apply for visa',
  },
  'nigeria-uk-tourism': {
    visa: 'Standard Visitor Visa',
    fee: '£115',
    processing: '3 weeks (15 working days)',
    checklist: [
      'Valid international passport with at least 1 blank page',
      'Completed online visa application form',
      'Bank statements for the last 6 months showing consistent income',
      'Employment letter on company letterhead (stating salary, position, approved leave dates)',
      'Hotel booking confirmation or letter of invitation from UK host',
      'Return flight booking (or travel itinerary)',
      'Travel insurance covering the full duration of stay',
      'Evidence of ties to Nigeria (property ownership, family, employment)',
      'Previous travel history (if any — stamps from other countries help)',
      'Passport-sized photographs',
    ],
    tips: [
      'The most common rejection reason is failing to prove "ties to home country" — show property, stable job, family, ongoing education',
      'Your bank statements should show regular income, not sudden large deposits',
      'A letter of invitation from someone in the UK should include their immigration status, address, and relationship to you',
      'If self-employed, provide business registration (CAC), tax receipts, and contracts',
      'Apply at least 4–5 weeks before travel to account for any delays',
    ],
  },
  'nigeria-uk-medical': {
    visa: 'Standard Visitor Visa (Medical)',
    fee: '£115 (up to 6 months) / £500 (11 months)',
    processing: '3 weeks',
    checklist: [
      'Valid international passport',
      'Medical referral letter from your Nigerian doctor or hospital',
      'Letter from the UK hospital confirming your appointment, treatment plan, and estimated cost',
      'Proof of funds to cover treatment costs AND living expenses',
      'TB test certificate',
      'Evidence of where you will stay during treatment',
      'Travel and medical insurance',
      'If being accompanied: companion details and their funding proof',
    ],
    tips: [
      'Contact the UK hospital directly and request a formal treatment plan with itemized costs',
      'If someone is paying for your treatment, provide a sponsorship letter and their financial evidence',
      'For lengthy treatments, consider the 11-month medical visitor visa',
    ],
  },
  'nigeria-uk-business': {
    visa: 'Standard Visitor Visa (Business)',
    fee: '£115',
    processing: '3 weeks',
    checklist: [
      'Valid international passport',
      'Formal invitation letter from the UK company (on letterhead, stating purpose, dates, who covers costs)',
      'Company registration documents (CAC certificate)',
      'Bank statements (personal and/or business) for 6 months',
      'Employment letter or business ownership proof',
      'Return flight booking',
      'Hotel or accommodation booking',
      'Conference registration (if attending an event)',
    ],
  },
  'nigeria-usa-education': {
    visa: 'F-1 Student Visa',
    fee: '$185 visa fee + $350 SEVIS fee',
    processing: 'Varies — schedule interview as early as possible',
    checklist: [
      'Valid international passport (valid 6+ months beyond intended stay)',
      'Form I-20 from your US university (Certificate of Eligibility)',
      'SEVIS fee receipt (Form I-901 — pay at fmjfee.com)',
      'DS-160 confirmation page (Online Nonimmigrant Visa Application)',
      'Visa appointment confirmation letter',
      'Financial evidence: bank statements, scholarship letters, or sponsor letter showing you can cover tuition + living (approximately $35,000–$70,000/year)',
      'Academic transcripts, diplomas, and degree certificates',
      'Standardized test scores (TOEFL, SAT, GRE/GMAT as applicable)',
      'Passport-sized photograph (2×2 inches, white background, taken within 6 months)',
      'Evidence of ties to Nigeria (property, family, job to return to)',
    ],
    tips: [
      'The visa interview is the MOST critical step — you have about 2–3 minutes to convince the officer',
      'Common interview questions: "Why this university?", "Why this program?", "Who is funding you?", "What will you do after graduation?"',
      'Be confident, concise, and honest — do NOT memorize scripted answers',
      'If you have a scholarship, lead with it — it shows merit and reduces financial concern',
      'Dress professionally — first impressions matter at the embassy',
      'Arrive at the embassy 30 minutes before your appointment',
    ],
    timeline: '12–15 months before: research schools and take TOEFL → 10 months: apply → 6 months: receive I-20 → 4 months: pay SEVIS fee and schedule interview → 2 months: attend interview',
  },
  'nigeria-usa-tourism': {
    visa: 'B-1/B-2 Visitor Visa',
    fee: '$185',
    processing: 'Varies (interview wait times can be weeks)',
    checklist: [
      'Valid international passport',
      'DS-160 confirmation page',
      'Bank statements for 6 months showing strong financial standing',
      'Employment letter (or business documents if self-employed)',
      'Evidence of strong ties to Nigeria',
      'Travel itinerary and purpose statement',
      'Hotel booking and return flight',
      'Invitation letter (if visiting family or friends — include their US immigration status)',
      'Previous travel history (especially to Schengen, UK, or other visa countries)',
    ],
    tips: [
      'US tourist visas are known to be difficult — the burden is on YOU to prove you will return to Nigeria',
      'Strong ties include: stable employment, property ownership, ongoing education, family dependents in Nigeria',
      'If you have traveled to Europe or UK before without overstaying, this significantly helps',
      'Answer questions directly and briefly — do not over-explain',
    ],
  },
  'nigeria-canada-education': {
    visa: 'Study Permit',
    fee: 'CAD 150',
    processing: '4–16 weeks (varies by season)',
    checklist: [
      'Valid international passport',
      'Letter of Acceptance from a Designated Learning Institution (DLI)',
      'Proof of financial support: Guaranteed Investment Certificate (GIC) of CAD 20,635 + first year tuition paid',
      'IELTS Academic score (minimum 6.0 overall, no band below 5.5 for most programs)',
      'Statement of Purpose explaining why you chose Canada and this program',
      'Two passport photographs',
      'Police clearance certificate',
      'Medical examination results from a panel physician',
      'Academic transcripts and certificates',
      'Proof of ties to Nigeria (letter of intent to return)',
    ],
    tips: [
      'The GIC is mandatory — open it with Scotiabank, CIBC, or BMO before applying',
      'Student Direct Stream (SDS) fast-tracks processing if you have IELTS 6.0+ and GIC — processing in ~20 days',
      'A strong Statement of Purpose can make or break your application — explain your career goals clearly',
      'After your study permit, you can get a Post-Graduation Work Permit (PGWP) for up to 3 years',
    ],
  },
  'nigeria-canada-relocation': {
    visa: 'Express Entry (Permanent Residence)',
    fee: 'CAD 1,365 (application) + CAD 500 (right of PR)',
    processing: '6–12 months',
    checklist: [
      'Valid international passport',
      'Educational Credential Assessment (ECA) from WES or IQAS',
      'IELTS General Training score (CLB 7+ recommended — 6.0 in each band minimum)',
      'Police clearance certificate from every country you lived in 6+ months',
      'Medical examination from a designated panel physician',
      'Proof of funds: CAD 13,757 (single) / CAD 17,127 (couple) / CAD 21,085 (family of 3)',
      'Detailed work experience letters for the past 10 years (on company letterhead)',
      'Reference letters from employers',
      'Birth certificate and marriage certificate (if applicable)',
      'Digital photographs meeting IRCC specifications',
    ],
    tips: [
      'Your CRS score determines if you get invited — aim for 470+ for Federal Skilled Worker',
      'Provincial Nominee Program (PNP) gives 600 bonus points — explore Ontario, BC, Alberta, Manitoba',
      'French language proficiency gives significant bonus points — consider TEF/TCF',
      'A Canadian job offer gives 50–200 bonus points',
      'The process is points-based and transparent — use the CRS calculator on the IRCC website',
    ],
  },
  'nigeria-germany-education': {
    visa: 'Student Visa (Studentenvisum)',
    fee: '€75',
    processing: '4–12 weeks',
    checklist: [
      'Valid international passport',
      'University admission letter (Zulassungsbescheid)',
      'Blocked account (Sperrkonto) with €11,208 for one year of living expenses',
      'Health insurance (statutory or private — starting from ~€110/month)',
      'Academic transcripts and degree certificates (with certified translations)',
      'Language proficiency: TestDaF, DSH (for German-taught), or IELTS/TOEFL (for English-taught)',
      'APS certificate (Academic Evaluation Centre — required for some countries)',
      'Motivation letter',
      'CV/Resume',
      'Proof of financial means beyond blocked account if applicable',
    ],
    tips: [
      'Many German universities are tuition-FREE — you only pay a semester fee of €150–350',
      'The blocked account (Sperrkonto) is opened with providers like Expatrio, Fintiba, or Deutsche Bank',
      'You are allowed to work 120 full days or 240 half days per year on a student visa',
      'After graduation, you get an 18-month job-seeker visa to find work in Germany',
    ],
  },
  'nigeria-australia-education': {
    visa: 'Student Visa (Subclass 500)',
    fee: 'AUD 710',
    processing: '4–8 weeks',
    checklist: [
      'Valid international passport',
      'Confirmation of Enrolment (CoE) from your institution',
      'Genuine Temporary Entrant (GTE) statement — a personal letter explaining your intentions',
      'IELTS 5.5+ overall (or equivalent PTE/TOEFL)',
      'Proof of financial capacity: AUD 21,041/year for living + tuition + travel costs',
      'Overseas Student Health Cover (OSHC) for entire visa duration',
      'Academic transcripts and qualifications',
      'Police clearance certificate',
      'Medical examination (if required)',
    ],
    tips: [
      'The GTE statement is crucial — immigration uses it to assess if you are a genuine student',
      'OSHC is mandatory — providers include Medibank, Bupa, Allianz, and OSHC Worldcare',
      'You can work up to 48 hours per fortnight during semester and unlimited during breaks',
      'After study, you may be eligible for a Temporary Graduate Visa (subclass 485) for 2–4 years',
    ],
  },
  'nigeria-uae-tourism': {
    visa: 'Tourist Visa',
    fee: 'AED 300–350 (approximately $80–95)',
    processing: '3–5 business days',
    checklist: [
      'Valid international passport (minimum 6 months validity)',
      'Passport-sized photograph with white background',
      'Completed visa application form',
      'Bank statements for 3 months',
      'Confirmed hotel reservation',
      'Confirmed return flight ticket',
      'Travel insurance',
      'Cover letter stating purpose and duration of visit',
    ],
    tips: [
      'UAE tourist visas are relatively easy to obtain compared to Western countries',
      'Apply through an airline (Emirates/Etihad offer visa services) or through approved visa agencies',
      'The 30-day visa can be extended once for an additional 30 days',
      'Dubai is expensive — budget at least $150–200/day for comfortable travel',
    ],
  },
  'nigeria-uae-medical': {
    visa: 'Medical Treatment Entry Permit',
    fee: 'AED 350',
    processing: '3–5 business days',
    checklist: [
      'Valid international passport',
      'Medical referral letter from Nigerian doctor',
      'Confirmed appointment from UAE hospital',
      'Proof of medical insurance or funds for treatment',
      'Return flight ticket',
      'Passport photographs',
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATION STATE MACHINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Phases:
 * 1. GREETING - First message, introduce self based on path
 * 2. GATHERING - Collect: from_country, to_country, specific details
 * 3. DEEPENING - Ask path-specific follow-up questions
 * 4. ADVISING - Provide visa info, checklist, tips
 * 5. READY - All info gathered, recommend agent matching
 */

const PATH_LABELS = {
  education: 'Education', tourism: 'Tourism', medical: 'Medical',
  business: 'Business', relocation: 'Relocation', religious: 'Religious', family: 'Family',
};

const COUNTRY_MAP = {
  'nigeria': 'Nigeria', 'ghana': 'Ghana', 'kenya': 'Kenya', 'south africa': 'South Africa',
  'cameroon': 'Cameroon', 'egypt': 'Egypt', 'ethiopia': 'Ethiopia', 'tanzania': 'Tanzania',
  'senegal': 'Senegal', 'rwanda': 'Rwanda', 'uganda': 'Uganda', 'morocco': 'Morocco',
  'uk': 'United Kingdom', 'united kingdom': 'United Kingdom', 'england': 'United Kingdom',
  'london': 'United Kingdom', 'britain': 'United Kingdom', 'great britain': 'United Kingdom',
  'usa': 'United States', 'us': 'United States', 'united states': 'United States',
  'america': 'United States', 'new york': 'United States', 'california': 'United States',
  'canada': 'Canada', 'toronto': 'Canada', 'vancouver': 'Canada', 'ottawa': 'Canada',
  'germany': 'Germany', 'berlin': 'Germany', 'munich': 'Germany', 'frankfurt': 'Germany',
  'australia': 'Australia', 'sydney': 'Australia', 'melbourne': 'Australia',
  'uae': 'UAE', 'dubai': 'UAE', 'abu dhabi': 'UAE', 'united arab emirates': 'UAE',
  'france': 'France', 'paris': 'France',
  'italy': 'Italy', 'spain': 'Spain', 'portugal': 'Portugal',
  'turkey': 'Turkey', 'istanbul': 'Turkey',
  'india': 'India', 'china': 'China', 'japan': 'Japan',
  'saudi arabia': 'Saudi Arabia', 'mecca': 'Saudi Arabia', 'jeddah': 'Saudi Arabia',
  'south korea': 'South Korea', 'ireland': 'Ireland', 'dublin': 'Ireland',
  'new zealand': 'New Zealand', 'malaysia': 'Malaysia', 'singapore': 'Singapore',
  'netherlands': 'Netherlands', 'sweden': 'Sweden', 'norway': 'Norway',
  'denmark': 'Denmark', 'finland': 'Finland', 'switzerland': 'Switzerland',
  'austria': 'Austria', 'poland': 'Poland', 'belgium': 'Belgium',
  'qatar': 'Qatar', 'doha': 'Qatar',
};

const AFRICAN = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Cameroon', 'Egypt', 'Ethiopia', 'Tanzania', 'Senegal', 'Rwanda', 'Uganda', 'Morocco'];

function findCountries(text) {
  const lower = text.toLowerCase();
  const found = [];
  // Sort by key length descending so "united kingdom" matches before "uk"
  const sorted = Object.entries(COUNTRY_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [key, val] of sorted) {
    if (lower.includes(key) && !found.find(c => c.name === val)) {
      found.push({ name: val, pos: lower.indexOf(key), isAfrican: AFRICAN.includes(val) });
    }
  }
  return found;
}

function extractFromTo(allText) {
  const countries = findCountries(allText);
  if (countries.length < 2) return { from: countries[0]?.isAfrican ? countries[0]?.name : null, to: !countries[0]?.isAfrican ? countries[0]?.name : null };

  // Look for "from X" and "to Y" patterns
  const lower = allText.toLowerCase();
  const fromMatch = lower.match(/(?:from|based in|live in|i'm in|i am in|coming from|residing in|located in)\s+([\w\s]+)/);
  const toMatch = lower.match(/(?:to|in the|travel to|go to|move to|study in|visit|relocate to|work in|moving to)\s+([\w\s]+)/);

  let from = null, to = null;

  if (fromMatch) {
    const fc = findCountries(fromMatch[1]);
    if (fc.length) from = fc[0].name;
  }
  if (toMatch) {
    const tc = findCountries(toMatch[1]);
    if (tc.length) to = tc[0].name;
  }

  // Fallback: first African country = from, first non-African = to
  if (!from) from = countries.find(c => c.isAfrican)?.name;
  if (!to) to = countries.find(c => !c.isAfrican && c.name !== from)?.name;
  if (!to && countries.length >= 2) to = countries.find(c => c.name !== from)?.name;

  return { from, to };
}

function getVisaKey(from, to, path) {
  const normalize = (s) => (s || '').toLowerCase()
    .replace('united kingdom', 'uk')
    .replace('united states', 'usa')
    .replace('united arab emirates', 'uae');
  return `${normalize(from)}-${normalize(to)}-${path}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

async function generateResponse(messages, context) {
  const userMessages = messages.filter(m => m.role === 'user');
  const allUserText = userMessages.map(m => m.content).join(' ');
  const lastMsg = userMessages[userMessages.length - 1]?.content || '';
  const msgCount = userMessages.length;
  const path = context.travel_path;
  const pathLabel = PATH_LABELS[path] || 'Travel';

  // ── Extract countries from full conversation ──
  const detected = extractFromTo(allUserText);
  const from = context.from_country || detected.from;
  const to = context.to_country || detected.to;

  const updates = {};
  if (from && !context.from_country) updates.from_country = from;
  if (to && !context.to_country) updates.to_country = to;

  // ── Phase 1: GREETING (first message) ──
  if (msgCount === 1) {
    const greetings = {
      education: `Hello! I'm your **${pathLabel} Travel** specialist at Tragency. Welcome! 🎓\n\nI'll personally guide you through everything you need to study abroad — from understanding visa requirements to preparing your document checklist.\n\nBefore I can give you tailored advice, I need to understand your situation. Let's take it step by step.\n\n**First question:** Which country are you currently based in?`,
      tourism: `Hello! Welcome to Tragency. I'm your **${pathLabel}** travel specialist. ✈️\n\nI'll help you plan the perfect trip — visa requirements, documents, costs, and what to expect.\n\nLet's start with the basics.\n\n**Which country are you travelling from?**`,
      medical: `Hello! I'm your **Medical Travel** specialist at Tragency. 🏥\n\nI understand that seeking medical treatment abroad is a big decision. I'm here to guide you through every step — from choosing the right destination to understanding the visa and documentation process.\n\n**To give you the most accurate advice, which country are you currently in?**`,
      business: `Hello! I'm your **Business Travel** specialist at Tragency. 💼\n\nWhether you're attending conferences, meeting clients, or exploring new markets — I'll ensure your travel documentation is in order.\n\n**Let's start: which country are you based in?**`,
      relocation: `Hello! Welcome to Tragency. I'm your **Relocation** specialist. 🏠\n\nMoving to a new country is one of life's biggest decisions. I'll walk you through the immigration pathways, visa requirements, and everything you need to make your move successful.\n\n**First, which country are you currently living in?**`,
      religious: `Hello! I'm your **Religious Travel** specialist at Tragency. 🕌\n\nWhether you're planning Hajj, Umrah, a Holy Land visit, or another pilgrimage — I'll help ensure your spiritual journey is well-prepared.\n\n**Which country will you be travelling from?**`,
      family: `Hello! Welcome to Tragency. I'm your **Family Travel** specialist. 👨‍👩‍👧‍👦\n\nI help families plan stress-free trips together — handling all the paperwork so you can focus on making memories.\n\n**To get started, which country is your family based in?**`,
    };

    // If countries already detected from first message
    if (from && to) {
      const visa = VISA_DB[getVisaKey(from, to, path)];
      if (visa) {
        return buildVisaResponse(from, to, path, pathLabel, visa, updates);
      }
      return buildFollowUp(from, to, path, pathLabel, updates, msgCount);
    }
    if (from && !to) {
      return { content: `Thank you! So you're based in **${from}**.\n\n**Which country would you like to ${path === 'education' ? 'study in' : path === 'relocation' ? 'relocate to' : path === 'medical' ? 'receive treatment in' : 'travel to'}?**`, updates };
    }
    if (to && !from) {
      return { content: `Great choice — **${to}**!\n\n**And which country are you currently based in?**`, updates };
    }

    return { content: greetings[path] || greetings.tourism, updates };
  }

  // ── Phase 2: GATHERING (need from + to) ──
  if (!from) {
    // Try to understand what they said
    const mentioned = findCountries(lastMsg);
    if (mentioned.length) {
      const c = mentioned[0];
      if (c.isAfrican) {
        updates.from_country = c.name;
        return { content: `Thank you! So you're based in **${c.name}**.\n\n**And which country would you like to ${path === 'education' ? 'study in' : path === 'relocation' ? 'relocate to' : 'travel to'}?**`, updates };
      } else {
        updates.to_country = c.name;
        return { content: `**${c.name}** — excellent choice!\n\n**Which country are you currently based in?** This helps me give you the exact visa requirements for your nationality.`, updates };
      }
    }
    return { content: `I appreciate your response! To give you accurate visa requirements, I need to know your **current country of residence**. Could you let me know which country you're based in?`, updates };
  }

  if (!to) {
    const mentioned = findCountries(lastMsg);
    // Only use a country that is DIFFERENT from the origin
    const destCountry = mentioned.find(x => x.name !== from);
    if (destCountry) {
      updates.to_country = destCountry.name;
      const visa = VISA_DB[getVisaKey(from, destCountry.name, path)];
      if (visa) {
        return buildVisaResponse(from, destCountry.name, path, pathLabel, visa, updates);
      }
      // Fallback to global knowledge base
      const globalVisa = getVisaInfo(destCountry.name, path);
      if (globalVisa) {
        return buildVisaResponseFromKnowledge(from, destCountry.name, path, pathLabel, globalVisa, updates);
      }
      return buildFollowUp(from, destCountry.name, path, pathLabel, updates, msgCount);
    }
    return { content: `Thank you! I have your origin as **${from}**.\n\n**Now, which country are you looking to ${path === 'education' ? 'study in' : path === 'relocation' ? 'move to' : 'visit'}?** For example: United Kingdom, United States, Canada, Germany, Australia, or UAE.`, updates };
  }

  // ── Phase 3: Have both countries — check if we already gave visa info ──
  const alreadyAdvised = messages.some(m => m.role === 'assistant' && (m.content.includes('Required Documents') || m.content.includes('Document Checklist') || m.content.includes('Visa Type')));

  if (!alreadyAdvised) {
    const visa = VISA_DB[getVisaKey(from, to, path)];
    if (visa) {
      return buildVisaResponse(from, to, path, pathLabel, visa, updates);
    }
    // Fallback to global knowledge base
    const globalVisa = getVisaInfo(to, path);
    if (globalVisa) {
      return buildVisaResponseFromKnowledge(from, to, path, pathLabel, globalVisa, updates);
    }
    return buildFollowUp(from, to, path, pathLabel, updates, msgCount);
  }

  // ── Phase 4: Post-advice — answer follow-up questions intelligently ──
  const lower = lastMsg.toLowerCase();

  // Detect if user is asking about cost/money
  if (lower.match(/cost|how much|price|fee|expensive|cheap|budget|afford|money|pay|fund/)) {
    const visa = VISA_DB[getVisaKey(from, to, path)];
    return {
      content: `Great question about costs! Here's a breakdown for **${pathLabel.toLowerCase()}** travel from **${from}** to **${to}**:\n\n${visa ? `**Visa Application Fee:** ${visa.fee}\n${visa.ihs ? `**Health Surcharge:** ${visa.ihs}\n` : ''}` : ''}**Other estimated costs:**\n- Flight tickets: varies by season\n- Accommodation: depends on location and duration\n- Living expenses: budget research needed\n- Travel insurance: typically $50–$200\n\nA Tragency agent can help you create a detailed budget. **Would you like to connect with a specialist agent who handles ${from} → ${to} ${pathLabel.toLowerCase()} travel?** They can give you exact figures.`,
      updates,
    };
  }

  // Detect if user is asking about timeline/when
  if (lower.match(/how long|when|time|duration|timeline|deadline|how soon|processing/)) {
    const visa = VISA_DB[getVisaKey(from, to, path)];
    return {
      content: `Here's the typical timeline for **${pathLabel.toLowerCase()}** from **${from}** to **${to}**:\n\n${visa?.processing ? `**Visa Processing:** ${visa.processing}\n` : ''}${visa?.timeline ? `**Recommended Timeline:** ${visa.timeline}\n` : ''}\n**General advice:** Start preparations at least 3–6 months in advance. Visa processing times can vary, and some documents take weeks to obtain.\n\nA Tragency agent can create a personalized timeline for your specific situation. **Shall I match you with a specialist?**`,
      updates,
    };
  }

  // Detect if user is asking about chances/eligibility
  if (lower.match(/chance|eligible|qualify|reject|denied|refuse|difficult|hard|easy|success rate/)) {
    return {
      content: `I understand your concern about eligibility. Here's what I can tell you:\n\n**Key factors that strengthen your application:**\n1. Complete and accurate documentation\n2. Strong financial evidence (consistent, not sudden deposits)\n3. Clear purpose statement\n4. Evidence of ties to ${from} (job, property, family)\n5. Previous travel history to other countries\n\n**Common reasons for rejection:**\n- Insufficient financial evidence\n- Incomplete documentation\n- Failure to demonstrate genuine intent\n- Inconsistencies in the application\n\nThis is exactly why working with a verified Tragency agent is valuable — they know what immigration officers look for and can review your application before submission.\n\n**Would you like to connect with an experienced agent?**`,
      updates,
    };
  }

  // Detect if user says yes/ready/agent
  if (lower.match(/yes|ready|agent|connect|match|find|sure|okay|ok|proceed|let's go|go ahead/)) {
    const visa = VISA_DB[getVisaKey(from, to, path)];
    const checklist = visa?.checklist || [
      'Valid international passport', 'Visa application form', 'Bank statements (3-6 months)',
      'Passport photographs', 'Travel insurance', 'Proof of purpose',
    ];
    const content = `Excellent! I'm glad I could help. Let me summarize what we've discussed:\n\n**Your Journey:** ${from} → ${to} (${pathLabel})\n${visa ? `**Visa Type:** ${visa.visa}\n**Fee:** ${visa.fee}\n**Processing:** ${visa.processing}\n` : ''}\nI'll now match you with verified agents who specialize in **${from} → ${to} ${pathLabel.toLowerCase()} travel**. These agents have been background-checked and reviewed by our team.\n\nClick **"Find My Agent"** below to see your matched specialists! 🤝\n\n\`\`\`json\n${JSON.stringify({ ready: true, travelPath: path, fromCountry: from, toCountry: to, purpose: pathLabel, checklist })}\n\`\`\``;
    return { content, updates };
  }

  // Default: acknowledge and guide back
  return {
    content: `Thank you for sharing that. I've noted this for your ${pathLabel.toLowerCase()} travel from **${from}** to **${to}**.\n\nIs there anything else you'd like to know about the visa process, costs, or timeline? Or are you **ready to connect with a specialist agent** who can handle your case personally?\n\nJust say **"ready"** when you'd like me to find your perfect agent! 🤝`,
    updates,
  };
}

// ── Build detailed visa response ────────────────────────────────────────────
function buildVisaResponse(from, to, path, pathLabel, visa, updates) {
  const checklist = visa.checklist.map((d, i) => `${i + 1}. ${d}`).join('\n');
  const tips = visa.tips ? visa.tips.map((t, i) => `- ${t}`).join('\n') : '';

  let content = `Thank you! Here's everything you need to know about **${pathLabel}** travel from **${from}** to **${to}**:\n\n`;
  content += `**Visa Type:** ${visa.visa}\n`;
  content += `**Application Fee:** ${visa.fee}\n`;
  content += `**Processing Time:** ${visa.processing}\n`;
  if (visa.ihs) content += `**Health Surcharge:** ${visa.ihs}\n`;

  content += `\n📋 **Required Documents:**\n${checklist}\n`;

  if (tips) {
    content += `\n💡 **Expert Tips:**\n${tips}\n`;
  }

  if (visa.timeline) {
    content += `\n📅 **Recommended Timeline:**\n${visa.timeline}\n`;
  }

  content += `\n---\n\nThis is a detailed process, and having expert guidance makes a real difference. Our verified agents specialize in exactly this route and have helped hundreds of travellers like you.\n\n**Would you like to connect with a specialist ${pathLabel.toLowerCase()} agent for the ${from} → ${to} route?** They'll review your documents, handle applications, and ensure nothing is missed. Just say **"yes"** or **"ready"** when you'd like to proceed! 🤝`;

  return { content, updates };
}

// ── Build follow-up for routes without specific visa data ───────────────────
function buildFollowUp(from, to, path, pathLabel, updates, msgCount) {
  const content = `Thank you! So you're planning **${pathLabel.toLowerCase()}** travel from **${from}** to **${to}**.\n\nWhile I have comprehensive data for many popular routes, the requirements for **${from} → ${to}** can be quite specific and may change frequently.\n\nHere are the **general documents** you'll likely need:\n\n1. Valid international passport (minimum 6 months validity)\n2. Visa application form (specific to ${to}'s embassy)\n3. Bank statements (3–6 months)\n4. Passport-sized photographs\n5. Proof of purpose (admission letter, hotel booking, invitation, etc.)\n6. Travel insurance\n7. Return travel itinerary\n8. Proof of accommodation\n\n**I strongly recommend connecting with a Tragency agent** who specializes in the ${from} → ${to} route. They'll have the most current, accurate requirements and can guide you through the entire process.\n\n**Ready to find your specialist agent?** Just say **"yes"** or **"ready"**! 🤝\n\n\`\`\`json\n${JSON.stringify({ ready: true, travelPath: path, fromCountry: from, toCountry: to, purpose: pathLabel, checklist: ['Valid international passport', 'Visa application form', 'Bank statements (3-6 months)', 'Passport photographs', 'Proof of purpose', 'Travel insurance', 'Return travel itinerary', 'Proof of accommodation'] })}\n\`\`\``;

  return { content, updates };
}

// ══════════════════════════════════════════════════════════════════════════════
// CLAUDE API INTEGRATION
// ══════════════════════════════════════════════════════════════════════════════

// ── Build visa response from global knowledge base ──────────────────────────
function buildVisaResponseFromKnowledge(from, to, path, pathLabel, info, updates) {
  let content = `Excellent! Here's what I know about **${pathLabel}** travel from **${from}** to **${to}**:\n\n`;
  content += `**Visa Type:** ${info.visa}\n`;
  content += `**Application Fee:** ${info.fee}\n`;
  content += `**Processing Time:** ${info.processing}\n`;
  if (info.minSalary) content += `**Minimum Salary:** ${info.minSalary}\n`;
  if (info.minFunds) content += `**Minimum Funds:** ${info.minFunds}\n`;
  if (info.workRights) content += `**Work Rights:** ${info.workRights}\n`;
  if (info.postStudy) content += `**Post-Study Options:** ${info.postStudy}\n`;
  if (info.maxStay) content += `**Maximum Stay:** ${info.maxStay}\n`;
  if (info.minIncome) content += `**Minimum Income:** ${info.minIncome}\n`;

  if (info.requirements && info.requirements.length) {
    content += `\n**Key Requirements:**\n`;
    info.requirements.forEach(r => { content += `- ${r}\n`; });
  }

  if (info.documents && info.documents.length) {
    content += `\n**Document Checklist:**\n`;
    info.documents.forEach(d => { content += `- ${d}\n`; });
  }

  if (info.tips && info.tips.length) {
    content += `\n**Pro Tips:**\n`;
    info.tips.forEach(t => { content += `- ${t}\n`; });
  }

  if (info.applyUrl) content += `\n**Apply Here:** ${info.applyUrl}\n`;
  if (info.sponsorList) content += `**Sponsor List:** ${info.sponsorList}\n`;

  content += `\nThis is comprehensive guidance based on our knowledge base. **Would you like to connect with a verified Tragency agent** who specializes in ${from} → ${to} ${pathLabel.toLowerCase()} travel? They can handle the entire process for you.\n\n`;
  content += `Just say **"yes"** or **"connect me"** when you're ready!\n\n`;
  content += `\`\`\`json\n${JSON.stringify({
    ready: true,
    travelPath: path,
    fromCountry: from,
    toCountry: to,
    purpose: pathLabel,
    checklist: info.documents || info.requirements || [],
  })}\n\`\`\``;

  return { content, updates };
}

// Import global visa knowledge base
const { VISA_KNOWLEDGE, getVisaInfo, getAllCountries, searchKnowledge } = require('../data/visa-knowledge');

// Build dynamic system prompt with injected visa data for the specific route
function buildSystemPrompt(context) {
  const fromCountry = context.from_country || '';
  const toCountry = context.to_country || '';
  const path = context.travel_path || '';

  let visaContext = '';
  if (toCountry && path) {
    const info = getVisaInfo(toCountry, path);
    if (info) {
      visaContext = `\n\nVISA INFORMATION FOR ${fromCountry || 'traveller'} → ${toCountry} (${path}):\n`;
      visaContext += `- Visa Type: ${info.visa}\n`;
      visaContext += `- Fee: ${info.fee}\n`;
      visaContext += `- Processing Time: ${info.processing}\n`;
      if (info.minSalary) visaContext += `- Minimum Salary: ${info.minSalary}\n`;
      if (info.minFunds) visaContext += `- Minimum Funds: ${info.minFunds}\n`;
      if (info.workRights) visaContext += `- Work Rights: ${info.workRights}\n`;
      if (info.postStudy) visaContext += `- Post-Study: ${info.postStudy}\n`;
      if (info.requirements) visaContext += `- Requirements: ${info.requirements.join(', ')}\n`;
      if (info.documents) visaContext += `- Documents: ${info.documents.join(', ')}\n`;
      if (info.tips) visaContext += `- Pro Tips: ${info.tips.join(' | ')}\n`;
      if (info.applyUrl) visaContext += `- Apply: ${info.applyUrl}\n`;
      if (info.sponsorList) visaContext += `- Sponsor List: ${info.sponsorList}\n`;
    }
  }

  // List all countries we have data for
  const countries = getAllCountries();
  const countryList = countries.map(c => `${c.flag} ${c.name} (${c.categories.join(', ')})`).join('\n');

  return `You are Tragency AI, the world's most knowledgeable travel and immigration consultant. You work for Tragency, a global travel marketplace connecting travellers with verified agents.

YOUR EXPERTISE:
- You have deep knowledge of visa requirements for 25+ countries across all categories
- You know sponsorship rules, salary thresholds, processing times, document requirements
- You understand the nuances of each country's immigration system
- You give SPECIFIC, ACTIONABLE advice — not generic responses
- You learn from each user message and build on previous context

YOUR PERSONALITY:
- Professional yet warm — like a trusted friend who happens to be an immigration expert
- Confident and specific — never vague or wishy-washy
- Encouraging but honest about challenges
- You ask ONE question at a time, never overwhelm
- You ALWAYS reference what the user previously told you ("You mentioned you're a nurse from Nigeria...")
- You proactively share relevant tips the user didn't ask about

YOUR KNOWLEDGE (use this to give accurate responses):
${visaContext}

COUNTRIES YOU HAVE DETAILED DATA FOR:
${countryList}

CONVERSATION RULES:
1. Ask one focused question at a time
2. Confirm understanding before moving to next topic ("So you're a software engineer with 5 years experience looking to work in Canada — is that right?")
3. When you have FROM country, TO country, and PURPOSE → provide SPECIFIC visa info
4. Include exact fees, processing times, salary thresholds, and document lists
5. Share application URLs when available
6. Offer 2-3 pro tips that most people don't know
7. When ready to connect with an agent, include this JSON at the END:
\`\`\`json
{"ready":true,"travelPath":"...","fromCountry":"...","toCountry":"...","purpose":"...","checklist":["doc1","doc2",...]}
\`\`\`

LEARNING BEHAVIOR:
- Track all facts the user shares (profession, experience, budget, family status, timeline)
- Reference these facts naturally in responses
- If the user corrects you, acknowledge and update your understanding
- Build progressively more personalized advice as the conversation continues
- Remember the user's concerns and address them proactively`;
}

// ── Generate suggested quick replies based on context ────────────────────────
function generateSuggestions(context, aiResponse) {
  const suggestions = [];
  const from = context.from_country;
  const to = context.to_country;
  const path = context.travel_path;

  if (!from) {
    suggestions.push('Nigeria', 'Ghana', 'Kenya', 'South Africa', 'India');
  } else if (!to) {
    suggestions.push('United Kingdom', 'United States', 'Canada', 'Germany', 'Australia');
  } else if (aiResponse.includes('ready') || aiResponse.includes('agent')) {
    suggestions.push('Yes, connect me with an agent', 'Tell me more about costs', 'What documents do I need first?');
  } else if (aiResponse.includes('cost') || aiResponse.includes('fee')) {
    suggestions.push('That\'s within my budget', 'Are there scholarships?', 'Connect me with an agent');
  } else if (aiResponse.includes('document') || aiResponse.includes('checklist')) {
    suggestions.push('How long does processing take?', 'What if I\'m missing a document?', 'I\'m ready, connect me');
  } else {
    suggestions.push('Tell me more', 'What are the costs?', 'Connect me with an agent');
  }

  return suggestions.slice(0, 3);
}

// ── Google Gemini API call ──────────────────────────────────────────────────
async function callGemini(systemPrompt, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    // Build Gemini conversation format
    const contents = [];

    // Add system instruction as first user message context
    contents.push({
      role: 'user',
      parts: [{ text: `[SYSTEM INSTRUCTIONS — follow these exactly]\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nNow respond to the conversation below. Remember: be warm, professional, specific, and ask ONE question at a time. Always suggest 2-3 quick reply options at the end of your response in this format:\n**Quick replies:** option1 | option2 | option3` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions exactly, be warm and professional, give specific visa/travel advice, ask one question at a time, and suggest quick replies.' }]
    });

    // Add conversation history
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 1500,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log('[Gemini] Response received successfully');
      return text;
    }
    console.error('[Gemini] No text in response:', JSON.stringify(data).substring(0, 200));
    return null;
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    return null;
  }
}

// ── Claude API call ─────────────────────────────────────────────────────────
async function callClaude(systemPrompt, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();
    if (data.content?.[0]?.text) {
      console.log('[Claude] Response received successfully');
      return data.content[0].text;
    }
    return null;
  } catch (err) {
    console.error('[Claude] Error:', err.message);
    return null;
  }
}

// ── Groq API call (Llama 3.3 70B — free, fastest) ───────────────────────────
async function callGroq(systemPrompt, messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const groqMessages = [
      { role: 'system', content: systemPrompt + '\n\nIMPORTANT: At the end of every response, suggest 2-3 quick reply options the user can click. Format them as:\n**Quick replies:** option1 | option2 | option3' },
      ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (text) {
      console.log(`[Groq] Response in ${data.usage?.total_time ? (data.usage.total_time * 1000).toFixed(0) + 'ms' : 'fast'}`);
      return text;
    }
    console.error('[Groq] No text:', JSON.stringify(data).substring(0, 200));
    return null;
  } catch (err) {
    console.error('[Groq] Error:', err.message);
    return null;
  }
}

// ── Main chat function with fallback chain ──────────────────────────────────
async function chat(messages, context) {
  const systemPrompt = buildSystemPrompt(context);

  // Try AI providers in order: Groq (free+fast) → Gemini (free) → Claude → Built-in
  let aiText = null;
  let provider = 'built-in';

  // 1. Try Groq (free, fastest, Llama 3.3 70B)
  aiText = await callGroq(systemPrompt, messages);
  if (aiText) provider = 'groq';

  // 2. Try Google Gemini (free)
  aiText = await callGemini(systemPrompt, messages);
  if (aiText) provider = 'gemini';

  // 2. Try Claude (if Gemini fails)
  if (!aiText) {
    aiText = await callClaude(systemPrompt, messages);
    if (aiText) provider = 'claude';
  }

  // 3. Fallback to built-in engine
  if (aiText) {
    // Extract suggested replies from AI response
    let suggestions = [];
    const quickMatch = aiText.match(/\*\*Quick replies?:\*\*\s*(.+)/i);
    if (quickMatch) {
      suggestions = quickMatch[1].split('|').map(s => s.trim()).filter(Boolean);
      // Remove the quick replies line from the main response
      aiText = aiText.replace(/\*\*Quick replies?:\*\*\s*.+/i, '').trim();
    }

    if (suggestions.length === 0) {
      suggestions = generateSuggestions(context, aiText);
    }

    return { content: aiText, updates: {}, suggestions, provider };
  }

  // Built-in engine fallback
  const result = await generateResponse(messages, context);
  result.suggestions = generateSuggestions(context, result.content);
  result.provider = 'built-in';
  return result;
}

module.exports = { chat, VISA_DB, VISA_KNOWLEDGE, findCountries, extractFromTo, getVisaInfo, getAllCountries, searchKnowledge };
