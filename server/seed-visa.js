require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();
const { query } = require('./db');

const VISA_DATA = [
  // ══ NIGERIA → UK ══
  { from: 'Nigeria', to: 'United Kingdom', category: 'education', visa_type: 'Student Visa (Tier 4)', processing_time: '3-6 weeks', visa_fee: '£363',
    requirements: ['Valid passport (6+ months)', 'CAS letter from university', 'IELTS score 6.0+', 'TB test certificate', 'Financial proof (£1,334/month London, £1,023 outside)'],
    documents: ['Passport', 'CAS letter', 'IELTS certificate', 'Bank statements (28 days)', 'TB test result', 'Passport photos', 'Previous qualifications'],
    application_url: 'https://www.gov.uk/student-visa/apply', embassy_url: 'https://www.gov.uk/world/nigeria' },
  { from: 'Nigeria', to: 'United Kingdom', category: 'tourism', visa_type: 'Standard Visitor Visa', processing_time: '3 weeks', visa_fee: '£100',
    requirements: ['Valid passport', 'Proof of accommodation', 'Return flight booking', 'Bank statements (6 months)', 'Employment letter'],
    documents: ['Passport', 'Invitation letter (if visiting someone)', 'Hotel booking', 'Flight itinerary', 'Bank statements', 'Employment letter', 'Passport photos'],
    application_url: 'https://www.gov.uk/standard-visitor-visa/apply', embassy_url: 'https://www.gov.uk/world/nigeria' },
  { from: 'Nigeria', to: 'United Kingdom', category: 'business', visa_type: 'Skilled Worker Visa', processing_time: '3-8 weeks', visa_fee: '£625-£1,423',
    requirements: ['Job offer from licensed sponsor', 'Certificate of Sponsorship (CoS)', 'English language B1+', 'Minimum salary £38,700/year', 'Criminal record certificate'],
    documents: ['Passport', 'CoS reference number', 'English test certificate', 'Criminal record certificate', 'TB test', 'Bank statements', 'Qualifications'],
    application_url: 'https://www.gov.uk/skilled-worker-visa/apply', embassy_url: 'https://www.gov.uk/world/nigeria' },
  { from: 'Nigeria', to: 'United Kingdom', category: 'medical', visa_type: 'Medical Treatment Visa', processing_time: '3 weeks', visa_fee: '£100',
    requirements: ['Valid passport', 'Letter from UK hospital/clinic', 'Proof of medical condition', 'Proof of funds for treatment', 'Return travel plan'],
    documents: ['Passport', 'Hospital appointment letter', 'Medical records', 'Bank statements', 'Flight booking', 'Accommodation proof'],
    application_url: 'https://www.gov.uk/standard-visitor-visa/apply', embassy_url: 'https://www.gov.uk/world/nigeria' },

  // ══ NIGERIA → USA ══
  { from: 'Nigeria', to: 'United States', category: 'education', visa_type: 'F-1 Student Visa', processing_time: '2-4 weeks', visa_fee: '$185 + $350 SEVIS',
    requirements: ['I-20 from SEVP-certified school', 'SEVIS fee payment', 'Proof of financial support', 'Intent to return home', 'English proficiency (TOEFL/IELTS)'],
    documents: ['Valid passport', 'I-20 form', 'DS-160 confirmation', 'SEVIS receipt', 'Bank statements', 'Sponsor letter', 'Academic transcripts', 'Passport photos'],
    application_url: 'https://ceac.state.gov/genniv/', embassy_url: 'https://ng.usembassy.gov/' },
  { from: 'Nigeria', to: 'United States', category: 'tourism', visa_type: 'B-1/B-2 Visitor Visa', processing_time: '2-8 weeks', visa_fee: '$185',
    requirements: ['Strong ties to home country', 'Proof of financial means', 'Clear travel purpose', 'No immigrant intent', 'Clean travel history helps'],
    documents: ['Valid passport', 'DS-160 confirmation', 'Passport photo', 'Bank statements (6 months)', 'Employment letter', 'Property documents', 'Previous travel stamps'],
    application_url: 'https://ceac.state.gov/genniv/', embassy_url: 'https://ng.usembassy.gov/' },
  { from: 'Nigeria', to: 'United States', category: 'business', visa_type: 'H-1B Work Visa', processing_time: '3-6 months (lottery April)', visa_fee: '$460 + $500 fraud fee',
    requirements: ['Bachelor degree minimum', 'Specialty occupation', 'Employer petition required', 'Labor Condition Application', 'Annual cap/lottery system'],
    documents: ['Valid passport', 'I-797 approval notice', 'Educational credentials', 'Resume/CV', 'Employer petition documents', 'Pay stubs (if extending)'],
    application_url: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations', embassy_url: 'https://ng.usembassy.gov/' },

  // ══ NIGERIA → CANADA ══
  { from: 'Nigeria', to: 'Canada', category: 'education', visa_type: 'Study Permit', processing_time: '8-16 weeks', visa_fee: 'CAD $150',
    requirements: ['Letter of acceptance from DLI', 'Proof of funds (CAD $20,635/year + tuition)', 'Clean criminal record', 'Medical exam', 'Intent to leave after studies'],
    documents: ['Valid passport', 'Acceptance letter', 'Proof of funds', 'Immigration medical exam', 'Police clearance', 'Statement of purpose', 'Passport photos'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html', embassy_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html' },
  { from: 'Nigeria', to: 'Canada', category: 'tourism', visa_type: 'Temporary Resident Visa', processing_time: '4-8 weeks', visa_fee: 'CAD $100',
    requirements: ['Valid passport', 'Proof of funds', 'Ties to home country', 'Clean travel history', 'Medical exam may be required'],
    documents: ['Valid passport', 'Bank statements', 'Employment letter', 'Invitation letter (if applicable)', 'Travel itinerary', 'Passport photos'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html', embassy_url: 'https://www.canadainternational.gc.ca/nigeria-nigeria/' },
  { from: 'Nigeria', to: 'Canada', category: 'business', visa_type: 'LMIA Work Permit / Express Entry', processing_time: '3-12 months', visa_fee: 'CAD $155 + $85 biometrics',
    requirements: ['Job offer + positive LMIA', 'Or Express Entry profile (CRS 470+)', 'Language test (IELTS CLB 7+)', 'Education credential assessment', 'Work experience proof'],
    documents: ['Valid passport', 'LMIA approval', 'Job offer letter', 'IELTS results', 'ECA report', 'Police clearance', 'Medical exam', 'Proof of funds'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html', embassy_url: 'https://www.canadainternational.gc.ca/nigeria-nigeria/' },
  { from: 'Nigeria', to: 'Canada', category: 'relocation', visa_type: 'Permanent Residence (Express Entry)', processing_time: '6-12 months', visa_fee: 'CAD $1,365',
    requirements: ['CRS score 470+', 'Language test CLB 7+', 'Education assessment (ECA)', '1+ year skilled work experience', 'Medical exam + police clearance', 'Proof of settlement funds CAD $13,757+'],
    documents: ['Valid passport', 'IELTS results', 'ECA report', 'Work reference letters', 'Police clearance', 'Medical exam', 'Proof of funds', 'Birth certificate'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html', embassy_url: 'https://www.canadainternational.gc.ca/nigeria-nigeria/' },

  // ══ NIGERIA → GERMANY ══
  { from: 'Nigeria', to: 'Germany', category: 'education', visa_type: 'Student Visa (National Visa)', processing_time: '4-12 weeks', visa_fee: '€75',
    requirements: ['University admission letter', 'Blocked account (€11,208/year)', 'Health insurance', 'Academic qualifications recognized', 'German/English proficiency'],
    documents: ['Valid passport', 'Admission letter', 'Blocked account proof', 'Health insurance', 'Academic certificates', 'Motivation letter', 'CV', 'Passport photos'],
    application_url: 'https://nigeria.diplo.de/ng-en/service/visa', embassy_url: 'https://nigeria.diplo.de/' },
  { from: 'Nigeria', to: 'Germany', category: 'business', visa_type: 'EU Blue Card', processing_time: '4-8 weeks', visa_fee: '€75',
    requirements: ['University degree recognized in Germany', 'Job offer with min €45,300/year salary', 'Health insurance', 'No criminal record'],
    documents: ['Valid passport', 'Job contract', 'Degree certificate + recognition', 'CV', 'Health insurance', 'Passport photos', 'Application form'],
    application_url: 'https://nigeria.diplo.de/ng-en/service/visa', embassy_url: 'https://nigeria.diplo.de/' },

  // ══ NIGERIA → UAE ══
  { from: 'Nigeria', to: 'UAE', category: 'tourism', visa_type: 'Tourist Visa', processing_time: '3-5 days', visa_fee: '$90-$190',
    requirements: ['Valid passport (6+ months)', 'Hotel booking', 'Return flight', 'Bank statement', 'Passport photo'],
    documents: ['Passport copy', 'Passport photo', 'Bank statement', 'Flight booking', 'Hotel reservation'],
    application_url: 'https://www.ivp.gov.ae/', embassy_url: 'https://www.mofaic.gov.ae/' },
  { from: 'Nigeria', to: 'UAE', category: 'business', visa_type: 'Employment Visa', processing_time: '2-4 weeks', visa_fee: 'AED 300-500',
    requirements: ['Job offer from UAE company', 'Medical fitness test', 'Emirates ID registration', 'Security clearance', 'Educational certificates attested'],
    documents: ['Passport', 'Job offer letter', 'Educational certificates (attested)', 'Medical fitness certificate', 'Passport photos', 'Visa application form'],
    application_url: 'https://www.mohre.gov.ae/', embassy_url: 'https://www.mofaic.gov.ae/' },
  { from: 'Nigeria', to: 'UAE', category: 'religious', visa_type: 'Hajj/Umrah Visa (transit via UAE)', processing_time: '1-2 weeks', visa_fee: 'Varies',
    requirements: ['Valid passport', 'Confirmed pilgrimage booking', 'Meningitis vaccination certificate', 'Return flight booking'],
    documents: ['Passport', 'Pilgrimage booking confirmation', 'Vaccination certificate', 'Flight itinerary', 'Passport photos'],
    application_url: 'https://www.ivp.gov.ae/', embassy_url: 'https://www.mofaic.gov.ae/' },

  // ══ NIGERIA → AUSTRALIA ══
  { from: 'Nigeria', to: 'Australia', category: 'education', visa_type: 'Student Visa (Subclass 500)', processing_time: '4-6 weeks', visa_fee: 'AUD $710',
    requirements: ['CoE from registered institution', 'Genuine Temporary Entrant (GTE)', 'English proficiency (IELTS 5.5+)', 'Health insurance (OSHC)', 'Financial capacity proof'],
    documents: ['Valid passport', 'CoE letter', 'IELTS certificate', 'OSHC insurance', 'Bank statements', 'GTE statement', 'Academic transcripts', 'Police clearance'],
    application_url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500', embassy_url: 'https://nigeria.embassy.gov.au/' },
  { from: 'Nigeria', to: 'Australia', category: 'business', visa_type: 'TSS Visa (Subclass 482)', processing_time: '1-4 months', visa_fee: 'AUD $1,455-$2,645',
    requirements: ['Occupation on skilled list', '2+ years relevant experience', 'English proficiency (IELTS 5.0+)', 'Employer nomination', 'Health & character requirements'],
    documents: ['Valid passport', 'Skills assessment', 'Employer nomination', 'English test', 'Work references', 'Qualifications', 'Police clearance', 'Medical exam'],
    application_url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-skill-shortage-482', embassy_url: 'https://nigeria.embassy.gov.au/' },

  // ══ INDIA → USA ══
  { from: 'India', to: 'United States', category: 'education', visa_type: 'F-1 Student Visa', processing_time: '3-5 weeks', visa_fee: '$185 + $350 SEVIS',
    requirements: ['I-20 from SEVP school', 'SEVIS fee paid', 'Financial proof', 'GRE/GMAT/TOEFL scores', 'Intent to return'],
    documents: ['Valid passport', 'I-20', 'DS-160', 'SEVIS receipt', 'Bank statements', 'Sponsor documents', 'Academic records', 'Test scores'],
    application_url: 'https://ceac.state.gov/genniv/', embassy_url: 'https://in.usembassy.gov/' },
  { from: 'India', to: 'United States', category: 'business', visa_type: 'H-1B Work Visa', processing_time: '3-6 months', visa_fee: '$460 + $500',
    requirements: ['Bachelor degree in specialty', 'Employer petition', 'Lottery selection (April)', 'Prevailing wage compliance'],
    documents: ['Valid passport', 'I-797', 'Educational credentials', 'Resume', 'Employer docs', 'Pay stubs'],
    application_url: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations', embassy_url: 'https://in.usembassy.gov/' },

  // ══ INDIA → CANADA ══
  { from: 'India', to: 'Canada', category: 'education', visa_type: 'Study Permit', processing_time: '4-8 weeks', visa_fee: 'CAD $150',
    requirements: ['Acceptance from DLI', 'Proof of funds', 'SDS stream eligible', 'Medical exam', 'IELTS 6.0+'],
    documents: ['Valid passport', 'Acceptance letter', 'GIC certificate', 'Tuition payment receipt', 'IELTS', 'Medical exam', 'Police clearance'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html', embassy_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/' },

  // ══ GHANA → UK ══
  { from: 'Ghana', to: 'United Kingdom', category: 'education', visa_type: 'Student Visa', processing_time: '3-6 weeks', visa_fee: '£363',
    requirements: ['CAS from UK university', 'IELTS 6.0+', 'TB test', 'Financial proof', 'Academic qualifications'],
    documents: ['Passport', 'CAS letter', 'IELTS', 'Bank statements', 'TB test', 'Previous certificates'],
    application_url: 'https://www.gov.uk/student-visa/apply', embassy_url: 'https://www.gov.uk/world/ghana' },
  { from: 'Ghana', to: 'United Kingdom', category: 'tourism', visa_type: 'Standard Visitor Visa', processing_time: '3 weeks', visa_fee: '£100',
    requirements: ['Valid passport', 'Travel purpose', 'Sufficient funds', 'Ties to Ghana'],
    documents: ['Passport', 'Bank statements', 'Employment letter', 'Hotel booking', 'Flight itinerary'],
    application_url: 'https://www.gov.uk/standard-visitor-visa/apply', embassy_url: 'https://www.gov.uk/world/ghana' },

  // ══ KENYA → CANADA ══
  { from: 'Kenya', to: 'Canada', category: 'education', visa_type: 'Study Permit', processing_time: '8-12 weeks', visa_fee: 'CAD $150',
    requirements: ['DLI acceptance', 'Proof of funds', 'Medical exam', 'Police certificate', 'Study plan'],
    documents: ['Passport', 'Acceptance letter', 'Bank statements', 'Medical exam', 'Police certificate', 'Passport photos'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html', embassy_url: 'https://www.canadainternational.gc.ca/kenya/' },

  // ══ SOUTH AFRICA → AUSTRALIA ══
  { from: 'South Africa', to: 'Australia', category: 'business', visa_type: 'TSS 482 Visa', processing_time: '1-3 months', visa_fee: 'AUD $1,455',
    requirements: ['Skilled occupation', '2+ years experience', 'English proficiency', 'Employer sponsorship'],
    documents: ['Passport', 'Skills assessment', 'English test', 'Work references', 'Employer nomination', 'Police clearance'],
    application_url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-skill-shortage-482', embassy_url: 'https://southafrica.embassy.gov.au/' },

  // ══ PHILIPPINES → UAE ══
  { from: 'Philippines', to: 'UAE', category: 'business', visa_type: 'Employment Visa', processing_time: '2-3 weeks', visa_fee: 'AED 300',
    requirements: ['Job offer from UAE employer', 'OFW registration', 'Medical fitness', 'Attested documents'],
    documents: ['Passport', 'Job contract', 'OEC certificate', 'Medical certificate', 'Educational documents (attested)', 'NBI clearance'],
    application_url: 'https://www.mohre.gov.ae/', embassy_url: 'https://abudhabi.philembassy.net/' },

  // ══ GENERIC: FAMILY category ══
  { from: 'Nigeria', to: 'United Kingdom', category: 'family', visa_type: 'Family Visa', processing_time: '12-24 weeks', visa_fee: '£1,538',
    requirements: ['UK-based sponsor', 'Minimum income £29,000/year', 'English A1 test', 'Genuine relationship proof', 'Suitable accommodation'],
    documents: ['Passport', 'Marriage/birth certificate', 'Sponsor employment details', 'Bank statements', 'Accommodation proof', 'English test', 'Photos together', 'Communication evidence'],
    application_url: 'https://www.gov.uk/uk-family-visa', embassy_url: 'https://www.gov.uk/world/nigeria' },
  { from: 'Nigeria', to: 'United States', category: 'family', visa_type: 'IR/CR-1 Spouse Visa', processing_time: '12-18 months', visa_fee: '$325 + $120 affidavit',
    requirements: ['US citizen/resident sponsor', 'I-130 petition approved', 'Financial sponsorship (I-864)', 'Medical exam', 'No criminal record'],
    documents: ['Passport', 'Marriage certificate', 'I-130 approval', 'I-864 affidavit', 'Tax returns', 'Birth certificate', 'Police clearance', 'Medical exam', 'Photos'],
    application_url: 'https://travel.state.gov/content/travel/en/us-visas/immigrate/family-immigration.html', embassy_url: 'https://ng.usembassy.gov/' },
  { from: 'Nigeria', to: 'Canada', category: 'family', visa_type: 'Family Sponsorship', processing_time: '12-24 months', visa_fee: 'CAD $1,080',
    requirements: ['Canadian citizen/PR sponsor', 'Genuine relationship', 'Sponsor income requirements', 'Medical exam', 'Police clearance'],
    documents: ['Passport', 'Marriage/birth certificate', 'Sponsor PR card/citizenship', 'Proof of relationship', 'Police clearance', 'Medical exam', 'Financial documents'],
    application_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html', embassy_url: 'https://www.canadainternational.gc.ca/nigeria-nigeria/' },
];

async function seedVisa() {
  console.log('\n🌍 Seeding visa requirements...');
  let count = 0;
  for (const v of VISA_DATA) {
    try {
      await query(`
        INSERT INTO visa_requirements (from_country, to_country, category, visa_type, processing_time, visa_fee, requirements, documents, application_url, embassy_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (from_country, to_country, category) DO UPDATE SET
          visa_type = EXCLUDED.visa_type, processing_time = EXCLUDED.processing_time,
          visa_fee = EXCLUDED.visa_fee, requirements = EXCLUDED.requirements,
          documents = EXCLUDED.documents, application_url = EXCLUDED.application_url,
          embassy_url = EXCLUDED.embassy_url, updated_at = NOW()
      `, [v.from, v.to, v.category, v.visa_type, v.processing_time, v.visa_fee,
          JSON.stringify(v.requirements), JSON.stringify(v.documents),
          v.application_url, v.embassy_url]);
      count++;
    } catch (e) { console.error(`  ✗ ${v.from}→${v.to} (${v.category}):`, e.message); }
  }
  console.log(`  ✓ ${count} visa requirement routes seeded`);
  console.log('✅ Visa seeding complete!');
  process.exit(0);
}

seedVisa().catch(e => { console.error(e); process.exit(1); });
