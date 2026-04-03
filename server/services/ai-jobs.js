/**
 * Tragency AI Job Consultant
 * Professional conversational engine for job seekers
 *
 * Flow:
 * 1. Ask about profession, skills, experience
 * 2. Ask about target country and preferences
 * 3. Assess eligibility for visa sponsorship
 * 4. Recommend matching jobs from database
 * 5. Offer paid services (consultation, auto-apply, agent matching)
 */

const { query } = require('../db');

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Consulting', 'Engineering',
  'Education', 'Energy', 'Automotive', 'Retail', 'Telecom',
  'Mining', 'Aerospace', 'Hospitality', 'Legal', 'Marketing',
];

const VISA_TYPES_BY_COUNTRY = {
  'United Kingdom': { type: 'Skilled Worker Visa', minSalary: '£38,700/year', requirements: 'Job offer from licensed sponsor, English proficiency, salary threshold met' },
  'United States': { type: 'H-1B Visa', minSalary: '$60,000+/year', requirements: 'Bachelor\'s degree minimum, employer petition, annual lottery (April)' },
  'Canada': { type: 'LMIA Work Permit / Global Talent Stream', minSalary: 'CAD 50,000+/year', requirements: 'Job offer + LMIA approval, or Express Entry with job offer for PR' },
  'Germany': { type: 'EU Blue Card', minSalary: '€45,300/year (€41,042 for shortage occupations)', requirements: 'University degree, recognized qualification, job offer above salary threshold' },
  'Australia': { type: 'Subclass 482 (TSS) Visa', minSalary: 'AUD 70,000+/year', requirements: 'Occupation on skilled list, 2+ years experience, employer sponsorship' },
  'UAE': { type: 'Employment Visa', minSalary: 'Varies by emirate', requirements: 'Job offer from UAE company, medical fitness, security clearance' },
  'Netherlands': { type: 'Highly Skilled Migrant Visa', minSalary: '€46,107/year (under 30: €33,000)', requirements: 'Job offer from recognized sponsor, degree qualification' },
  'Ireland': { type: 'Critical Skills Employment Permit', minSalary: '€38,000+/year', requirements: 'Occupation on critical skills list, degree, job offer' },
  'Singapore': { type: 'Employment Pass', minSalary: 'SGD 5,000+/month', requirements: 'Job offer, degree, relevant experience, salary threshold' },
  'New Zealand': { type: 'Accredited Employer Work Visa', minSalary: 'NZD median wage+', requirements: 'Job offer from accredited employer, occupation assessment' },
};

async function generateJobResponse(messages, context) {
  const userMessages = messages.filter(m => m.role === 'user');
  const allUserText = userMessages.map(m => m.content).join(' ');
  const lastMsg = userMessages[userMessages.length - 1]?.content || '';
  const msgCount = userMessages.length;
  const lower = lastMsg.toLowerCase();

  // Extract info from conversation
  const info = context._jobInfo || {};
  const updates = {};

  // Detect profession from text
  if (!info.profession) {
    const professions = [
      'software engineer', 'developer', 'programmer', 'data scientist', 'data analyst',
      'nurse', 'doctor', 'pharmacist', 'dentist', 'surgeon',
      'accountant', 'auditor', 'financial analyst', 'banker',
      'teacher', 'lecturer', 'professor',
      'mechanical engineer', 'civil engineer', 'electrical engineer', 'chemical engineer',
      'project manager', 'product manager', 'business analyst',
      'marketing', 'sales', 'hr', 'human resources',
      'architect', 'designer', 'ux designer', 'graphic designer',
      'lawyer', 'solicitor', 'barrister',
      'chef', 'hospitality',
    ];
    for (const p of professions) {
      if (allUserText.toLowerCase().includes(p)) {
        info.profession = p.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
  }

  // Detect experience years
  if (!info.experience) {
    const expMatch = allUserText.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
    if (expMatch) info.experience = parseInt(expMatch[1]);
  }

  // Detect target country
  if (!info.targetCountry) {
    const countries = ['United Kingdom', 'United States', 'Canada', 'Germany', 'Australia', 'UAE', 'Netherlands', 'Ireland', 'Singapore', 'New Zealand'];
    const countryAliases = { 'uk': 'United Kingdom', 'us': 'United States', 'usa': 'United States', 'america': 'United States', 'dubai': 'UAE', 'uae': 'UAE' };
    for (const [alias, name] of Object.entries(countryAliases)) {
      if (lower.includes(alias)) { info.targetCountry = name; break; }
    }
    if (!info.targetCountry) {
      for (const c of countries) {
        if (allUserText.toLowerCase().includes(c.toLowerCase())) { info.targetCountry = c; break; }
      }
    }
  }

  // Detect qualification
  if (!info.qualification) {
    if (allUserText.toLowerCase().match(/phd|doctorate/)) info.qualification = 'PhD';
    else if (allUserText.toLowerCase().match(/master|msc|mba|ma\b/)) info.qualification = 'Masters';
    else if (allUserText.toLowerCase().match(/bachelor|bsc|beng|degree|graduated/)) info.qualification = 'Bachelors';
    else if (allUserText.toLowerCase().match(/diploma|hnd|ond/)) info.qualification = 'Diploma';
  }

  // Store updates
  if (Object.keys(info).length > 0) {
    updates._jobInfo = info;
  }

  // ── Message 1: Greeting ──
  if (msgCount === 1 && !info.profession && !info.targetCountry) {
    return {
      content: `Welcome to Tragency's **Job & Visa Sponsorship** service! 💼\n\nI'm your AI career consultant. I'll help you find jobs abroad with visa sponsorship — and if you want, our system can even **auto-apply** to matching positions on your behalf.\n\nLet's build your profile. **What is your profession or field of work?**\n\nFor example: Software Engineer, Nurse, Accountant, Data Scientist, Teacher, Mechanical Engineer, etc.`,
      updates,
    };
  }

  // ── Need profession ──
  if (!info.profession) {
    // Check if they mentioned something
    if (lastMsg.length > 2 && lastMsg.length < 100) {
      info.profession = lastMsg.trim().split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      updates._jobInfo = info;
      return {
        content: `Great — so you're a **${info.profession}**. That's a strong profession for international opportunities.\n\n**How many years of professional experience do you have?**`,
        updates,
      };
    }
    return {
      content: `To match you with the right jobs, I need to know your **profession or job title**. What do you currently do or what field are you in?`,
      updates,
    };
  }

  // ── Need experience ──
  if (!info.experience) {
    const numMatch = lastMsg.match(/(\d+)/);
    if (numMatch) {
      info.experience = parseInt(numMatch[1]);
      updates._jobInfo = info;
      return {
        content: `**${info.experience} years** of experience as a **${info.profession}** — that's solid!\n\n**What is your highest educational qualification?**\n\n- Bachelor's degree\n- Master's degree (MSc, MBA, MA)\n- PhD / Doctorate\n- Diploma / HND`,
        updates,
      };
    }
    return {
      content: `Thanks! **How many years of experience** do you have as a ${info.profession}?`,
      updates,
    };
  }

  // ── Need qualification ──
  if (!info.qualification) {
    if (lower.match(/phd|doctorate/)) info.qualification = 'PhD';
    else if (lower.match(/master|msc|mba|ma\b/)) info.qualification = 'Masters';
    else if (lower.match(/bachelor|bsc|beng|degree|first/)) info.qualification = 'Bachelors';
    else if (lower.match(/diploma|hnd|ond|certificate/)) info.qualification = 'Diploma';
    else {
      info.qualification = lastMsg.trim();
    }
    updates._jobInfo = info;

    return {
      content: `Perfect — **${info.qualification}** with **${info.experience} years** as a **${info.profession}**.\n\n**Which country would you like to work in?** Here are the top destinations with visa sponsorship:\n\n🇬🇧 **United Kingdom** — Skilled Worker Visa (min £38,700/yr)\n🇺🇸 **United States** — H-1B Visa ($60,000+/yr)\n🇨🇦 **Canada** — LMIA / Global Talent (CAD 50,000+/yr)\n🇩🇪 **Germany** — EU Blue Card (€45,300+/yr)\n🇦🇺 **Australia** — TSS 482 Visa (AUD 70,000+/yr)\n🇦🇪 **UAE** — Employment Visa\n🇳🇱 **Netherlands** — Highly Skilled Migrant\n🇮🇪 **Ireland** — Critical Skills Permit\n🇸🇬 **Singapore** — Employment Pass\n🇳🇿 **New Zealand** — Work Visa`,
      updates,
    };
  }

  // ── Need target country ──
  if (!info.targetCountry) {
    const countries = { 'uk': 'United Kingdom', 'united kingdom': 'United Kingdom', 'us': 'United States', 'usa': 'United States', 'america': 'United States', 'canada': 'Canada', 'germany': 'Germany', 'australia': 'Australia', 'uae': 'UAE', 'dubai': 'UAE', 'netherlands': 'Netherlands', 'ireland': 'Ireland', 'singapore': 'Singapore', 'new zealand': 'New Zealand' };
    for (const [key, val] of Object.entries(countries)) {
      if (lower.includes(key)) { info.targetCountry = val; break; }
    }
    if (!info.targetCountry && lastMsg.length > 2) {
      info.targetCountry = lastMsg.trim();
    }

    if (info.targetCountry) {
      updates._jobInfo = info;
      const visaInfo = VISA_TYPES_BY_COUNTRY[info.targetCountry];

      // Search for matching jobs
      let jobResults = [];
      try {
        const { rows } = await query(`
          SELECT j.title, j.country, j.city, j.salary_min, j.salary_max, j.salary_currency,
                 j.visa_type, c.name AS company_name
          FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
          WHERE j.status = 'active' AND j.country = $1 AND j.visa_sponsored = TRUE
          ORDER BY j.created_at DESC LIMIT 5
        `, [info.targetCountry]);
        jobResults = rows;
      } catch (e) { /* ignore */ }

      let content = `Excellent choice! Here's your profile summary:\n\n`;
      content += `**Profile:**\n`;
      content += `- Profession: **${info.profession}**\n`;
      content += `- Experience: **${info.experience} years**\n`;
      content += `- Qualification: **${info.qualification}**\n`;
      content += `- Target: **${info.targetCountry}**\n\n`;

      if (visaInfo) {
        content += `**Visa Sponsorship in ${info.targetCountry}:**\n`;
        content += `- Type: **${visaInfo.type}**\n`;
        content += `- Minimum salary: **${visaInfo.minSalary}**\n`;
        content += `- Requirements: ${visaInfo.requirements}\n\n`;
      }

      if (jobResults.length > 0) {
        content += `**🔥 ${jobResults.length} matching jobs found right now:**\n`;
        jobResults.forEach((j, i) => {
          const salary = j.salary_min && j.salary_max
            ? `${j.salary_currency} ${Number(j.salary_min).toLocaleString()} – ${Number(j.salary_max).toLocaleString()}`
            : 'Competitive';
          content += `${i + 1}. **${j.title}** at ${j.company_name || 'Company'} — ${j.city || j.country} (${salary})\n`;
        });
        content += `\n`;
      } else {
        content += `We're actively sourcing ${info.profession} roles in ${info.targetCountry}.\n\n`;
      }

      content += `**Here's what I can offer you:**\n\n`;
      content += `1. 📋 **Job Board Access** (₦5,000/month) — Browse all visa-sponsored jobs, full details, apply links\n`;
      content += `2. 🤖 **Auto-Apply** (₦15,000/month) — Upload your CV, we auto-apply to 50+ matching jobs monthly\n`;
      content += `3. 🤝 **Agent Placement** (₦25,000) — Get matched with a recruitment agent who handles everything\n\n`;
      content += `**Which service interests you?** Or ask me anything about working in ${info.targetCountry}!\n\n`;
      content += `\`\`\`json\n${JSON.stringify({
        ready: true,
        service: 'jobs',
        travelPath: 'business',
        fromCountry: context.from_country || 'Nigeria',
        toCountry: info.targetCountry,
        purpose: 'Employment',
        profession: info.profession,
        experience: info.experience,
        qualification: info.qualification,
        checklist: [
          'Updated CV/Resume', 'Cover letter template', 'Educational certificates',
          'Professional certifications', 'Reference letters', 'Portfolio (if applicable)',
          'Passport copy', 'English language test (IELTS/TOEFL)',
        ],
      })}\n\`\`\``;

      return { content, updates };
    }

    return {
      content: `Which country would you like to work in? You can name any country — I'll check visa sponsorship availability and find matching jobs for you.`,
      updates,
    };
  }

  // ── Post-assessment: handle follow-up questions ──
  if (lower.match(/auto.?apply|automatic|apply for me|apply automatically/)) {
    return {
      content: `**Auto-Apply Service** (₦15,000/month):\n\nHow it works:\n1. Upload your CV once\n2. Our system scans new jobs daily matching your profile\n3. We auto-apply to up to **50 jobs per month** on your behalf\n4. You get email notifications for every application\n5. Track all applications from your dashboard\n\nYou're a **${info.profession}** with **${info.experience} years** experience targeting **${info.targetCountry}** — our system will find and apply to the best matches.\n\n**Ready to subscribe?** Click "Subscribe" below to get started! 🚀\n\n\`\`\`json\n${JSON.stringify({ ready: true, service: 'jobs-auto-apply', targetCountry: info.targetCountry, profession: info.profession })}\n\`\`\``,
      updates,
    };
  }

  if (lower.match(/board|browse|search|find jobs|see jobs|view jobs/)) {
    return {
      content: `**Job Board Access** (₦5,000/month):\n\n- Browse **all visa-sponsored jobs** across 15+ countries\n- Full salary details and company information\n- Direct apply links to company career pages\n- New jobs added daily from live sources\n- Filter by country, industry, salary, visa type\n\n**Ready to access the job board?** Click "Subscribe" below!\n\n\`\`\`json\n${JSON.stringify({ ready: true, service: 'jobs-board', targetCountry: info.targetCountry })}\n\`\`\``,
      updates,
    };
  }

  if (lower.match(/agent|placement|help me|someone|recruit/)) {
    return {
      content: `**Agent Placement Service** (₦25,000 one-time):\n\nWe'll match you with a verified **recruitment agent** who specializes in placing professionals in **${info.targetCountry}**. They will:\n\n1. Review and optimize your CV\n2. Identify the best employers for your profile\n3. Handle applications and follow-ups\n4. Prepare you for interviews\n5. Assist with visa processing after you land a job\n\n**Ready to get matched with a recruitment specialist?**\n\n\`\`\`json\n${JSON.stringify({ ready: true, service: 'jobs-agent', travelPath: 'business', fromCountry: context.from_country || 'Nigeria', toCountry: info.targetCountry, purpose: 'Employment', profession: info.profession, checklist: ['Updated CV', 'Cover letter', 'Certificates', 'References', 'Passport copy'] })}\n\`\`\``,
      updates,
    };
  }

  // Default follow-up
  return {
    content: `Is there anything else you'd like to know about working in **${info.targetCountry}** as a **${info.profession}**?\n\nOr choose a service to get started:\n\n1. 📋 **"Job Board"** — Browse and apply (₦5,000/month)\n2. 🤖 **"Auto-Apply"** — We apply for you (₦15,000/month)\n3. 🤝 **"Agent"** — Get a recruitment specialist (₦25,000)\n\nJust tell me which one interests you!`,
    updates,
  };
}

module.exports = { generateJobResponse, VISA_TYPES_BY_COUNTRY, INDUSTRIES };
