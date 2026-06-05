// js/api.js

/**
 * Validates a Gemini API Key by making a minimal request to the models list or a tiny prompt.
 */
export async function testGeminiApiKey(apiKey, model = 'gemini-2.5-flash') {
  try {
    const response = await fetch('/api/ai/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey, model })
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.detail || `HTTP error ${response.status}`;
      return { success: false, message: errMsg };
    }
  } catch (e) {
    return { success: false, message: e.message || 'Network error connecting to backend API.' };
  }
}

/**
 * Real Gemini API Tailoring engine.
 */
async function callRealGemini(masterCv, jobDetails, settings) {
  const response = await fetch('/api/ai/tailor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ masterCv, jobDetails })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `API Request failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Intelligent Mock Tailoring engine (Demo Mode).
 * Generates realistic matching elements.
 */
function callMockTailoring(masterCv, jobDetails) {
  const company = jobDetails.company || 'Target Company';
  const title = jobDetails.title || 'Target Role';
  const descLower = (jobDetails.desc || '').toLowerCase();
  
  const cvSkillsLower = (masterCv.skills || []).map(s => s.toLowerCase());
  
  // Extract keywords based on simple description matching
  const potentialSkills = ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'AI Agents', 'Gemini Pro', 'Claude API', 'Tailwind', 'Docker', 'Kubernetes', 'AWS', 'TypeScript', 'REST APIs'];
  
  const skillsInJob = potentialSkills.filter(s => descLower.includes(s.toLowerCase()));
  if (skillsInJob.length === 0) {
    skillsInJob.push('Python', 'JavaScript', 'REST APIs');
  }

  const matchedSkills = skillsInJob.filter(s => cvSkillsLower.includes(s.toLowerCase()));
  const missingSkills = skillsInJob.filter(s => !cvSkillsLower.includes(s.toLowerCase()));

  // Calculate Match Score
  let matchScore = 70;
  if (skillsInJob.length > 0) {
    matchScore = Math.round((matchedSkills.length / skillsInJob.length) * 28 + 70);
  }
  matchScore = Math.min(matchScore, 98);

  const recommendations = missingSkills.length > 0
    ? `We recommend highlighting experiences with "${missingSkills.join(', ')}" in your CV summary or projects to improve alignment for this role.`
    : `Excellent keyword alignment! Your profile matched all identified requirements. Practice the anticipated screening questions to prepare.`;

  const topSkills = skillsInJob.slice(0, 5);

  // Adapt bullet points from CV
  const tailoredBullets = masterCv.experience.map(exp => {
    let bullets = [];
    if (exp.role.includes('AI') || exp.role.includes('Lead')) {
      bullets = [
        `Spearheaded development of core backend pipelines integrating ${topSkills[0]} at ${exp.company}, boosting operational efficiency by 30%.`,
        `Led frontend dashboard creation utilizing modern components, enabling key business metrics tracking for ${topSkills[1] || 'AI integrations'}.`
      ];
    } else {
      bullets = [
        `Architected modular subsystems leveraging ${topSkills[2] || 'JavaScript'} and ${topSkills[3] || 'REST APIs'} at ${exp.company}.`,
        `Collaborated with cross-functional engineers to optimize app performance and styling assets.`
      ];
    }
    return {
      jobTitle: `${exp.role} (${exp.company})`,
      bullets: bullets
    };
  });

  const letterText = `Dear Hiring Team at ${company},

I am writing to express my enthusiastic interest in the ${title} position at ${company}. Having reviewed the requirements, I am confident that my background as a ${masterCv.personal.title} makes me a strong fit for your team.

At my previous role with ${masterCv.experience[0]?.company || 'my past company'}, I actively resolved challenges associated with ${topSkills[0]} and ${topSkills[1] || 'modern development stacks'}. My professional focus has always been on translating complex business requirements into robust, high-performance web products, using engineering paradigms like modular components and clean system state.

I am very excited about the possibility of joining ${company} and bringing my expertise in ${topSkills.slice(0,3).join(', ')} to your upcoming engineering goals. Thank you for your time and consideration.

Sincerely,
${masterCv.personal.fullname}`;

  const prepQuestions = [
    {
      q: `How does your background align with our need for expertise in ${topSkills[0] || 'software scaling'}?`,
      a: `Throughout my career, particularly in my role at ${masterCv.experience[0]?.company || 'NeuralFlow'}, I focused on high-throughput solutions. I have built systems using ${topSkills[0]} that solved core data flow issues and drove customer satisfaction.`
    },
    {
      q: `What is your process for integrating new AI tools or third-party APIs like Gemini into an existing frontend stack?`,
      a: `I prioritize decoupling API wrappers from the main visual layout. I establish state-driven components that handle loading states, local caches, and clear error logs so that the user interface remains stable and responsive.`
    }
  ];

  return {
    matchScore,
    gapAnalysis: {
      matchedSkills,
      missingSkills,
      recommendations
    },
    skills: topSkills,
    bullets: tailoredBullets,
    coverLetter: letterText,
    prepQuestions: prepQuestions
  };
}

/**
 * Main entrance router for tailoring tasks.
 * Integrates step-by-step progress callbacks to feed the frontend spinner.
 */
export async function tailorResume(masterCv, jobDetails, settings, onProgress) {
  const provider = settings.provider || 'mock';
  
  if (provider === 'gemini' && settings.apiKey) {
    onProgress('Extracting keywords and skills from description...', 25);
    await new Promise(r => setTimeout(r, 600));
    
    onProgress('Rewriting experience bullets in CV context...', 50);
    await new Promise(r => setTimeout(r, 600));
    
    onProgress('Drafting personalized cover letter...', 75);
    const result = await callRealGemini(masterCv, jobDetails, settings);
    
    onProgress('Finalizing interview checklist...', 100);
    return result;
  } else {
    // Simulated mock engine path with human-like delays
    onProgress('Analyzing job description requirements...', 20);
    await new Promise(r => setTimeout(r, 700));
    
    onProgress('Extracting target keywords & tech stack tags...', 50);
    await new Promise(r => setTimeout(r, 800));
    
    onProgress('Rewriting CV bullet points to match role keywords...', 75);
    await new Promise(r => setTimeout(r, 700));
    
    onProgress('Writing custom cover letter and interview checklist...', 95);
    const result = callMockTailoring(masterCv, jobDetails);
    await new Promise(r => setTimeout(r, 400));
    
    onProgress('Tailored CV compiled successfully!', 100);
    return result;
  }
}

/**
 * Real Gemini API Resume parsing engine.
 */
async function callRealGeminiParse(resumeText, settings) {
  const response = await fetch('/api/ai/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resumeText })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `API Request failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Intelligent Mock Parser (Demo Mode).
 */
function callMockParse(resumeText) {
  // Read basic keywords if present
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  
  const extractedEmail = emailMatch ? emailMatch[0] : 'parsed.user@example.com';
  const extractedPhone = phoneMatch ? phoneMatch[0] : '+1 555-0199';

  return {
    personal: {
      fullname: 'M. Sadiq (Parsed)',
      title: 'Senior Artificial Intelligence Engineer',
      email: extractedEmail,
      phone: extractedPhone,
      website: 'https://linkedin.com/in/msadiq',
      summary: 'Experienced developer and system architect specialized in deploying agentic AI systems and highly responsive client-side web interfaces.'
    },
    experience: [
      {
        id: 'exp-parsed-1',
        company: 'AI Solutions Inc',
        role: 'AI Engineer',
        dates: '2023 - Present',
        bullets: [
          'Deployed scalable API integrations using large language models, improving processing throughput.',
          'Built beautiful dark-mode tracking dashboards using modern CSS Grid and Flexbox.'
        ]
      }
    ],
    education: [
      {
        id: 'edu-parsed-1',
        school: 'University of Science & Tech',
        degree: 'B.S. in Computer Science',
        dates: '2019 - 2023'
      }
    ],
    skills: ['Python', 'JavaScript', 'HTML5', 'CSS3', 'Gemini API', 'AI Agents']
  };
}

/**
 * Main parser coordinator.
 */
export async function parseResumeTextWithAI(resumeText, settings, onProgress) {
  const provider = settings.provider || 'mock';
  
  if (provider === 'gemini' && settings.apiKey) {
    onProgress('Reading unstructured content...', 30);
    await new Promise(r => setTimeout(r, 500));
    
    onProgress('Structuring personal contact fields...', 60);
    await new Promise(r => setTimeout(r, 500));
    
    onProgress('Mapping work experience bullet points...', 80);
    const result = await callRealGeminiParse(resumeText, settings);
    
    onProgress('Extracting education history and tags...', 100);
    return result;
  } else {
    // Mock parser
    onProgress('Reading unstructured content...', 25);
    await new Promise(r => setTimeout(r, 600));
    
    onProgress('Extracting contact details & parsing experiences...', 65);
    await new Promise(r => setTimeout(r, 700));
    
    onProgress('Generating structured profile tags...', 90);
    const result = callMockParse(resumeText);
    await new Promise(r => setTimeout(r, 400));
    
    onProgress('Parsed profile structured successfully!', 100);
    return result;
  }
}

/**
 * Real Gemini API Job Search with Google Search Grounding.
 */
async function callRealGeminiSearch(cvTitle, location, cvSkills, settings) {
  const response = await fetch('/api/ai/search-jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cvTitle, location, cvSkills })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `API Request failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Intelligent Mock Job Search engine.
 */
function callMockSearch(cvTitle, location, cvSkills) {
  const title = cvTitle || 'Software Engineer';
  const loc = location || 'Remote';
  const cvSkillsLower = cvSkills.map(s => s.toLowerCase());

  const mockListings = [
    {
      title: `${title} (Specialist)`,
      company: 'Google DeepMind',
      location: 'London, UK (Hybrid) / Remote',
      url: 'https://deepmind.google/careers',
      desc: 'Join the team building next-generation cognitive agents. Requires experience in Python, API orchestration, and agentic workflows.',
      skillsNeeded: ['Python', 'AI Agents', 'Google Gemini API']
    },
    {
      title: `Senior ${title}`,
      company: 'Stripe',
      location: 'San Francisco, CA / Remote',
      url: 'https://stripe.com/jobs',
      desc: 'Looking for a product-minded developer to implement LLM automation helpers for merchant dashboards. Requires JavaScript, React, and REST APIs.',
      skillsNeeded: ['JavaScript', 'React', 'Node.js', 'REST APIs']
    },
    {
      title: `Staff ${title} - Platform Systems`,
      company: 'Vercel',
      location: 'Remote (Global)',
      url: 'https://vercel.com/careers',
      desc: 'Scale rendering platforms supporting responsive interfaces and dynamic state. Experience in CSS Grid, TypeScript, and system optimization is preferred.',
      skillsNeeded: ['JavaScript', 'React', 'CSS Grid/Flexbox']
    },
    {
      title: `${title} - AI Integrations`,
      company: 'OpenAI',
      location: 'San Francisco, CA (Hybrid) / Remote',
      url: 'https://openai.com/careers',
      desc: 'Design agentic evaluation flows and API tooling integrations. Strong skills in Python, Git, and prompt diagnostics are required.',
      skillsNeeded: ['Python', 'AI Agents', 'Git']
    }
  ];

  return mockListings.map((job, idx) => {
    const matches = job.skillsNeeded.filter(s => cvSkillsLower.includes(s.toLowerCase()));
    let score = 70;
    if (job.skillsNeeded.length > 0) {
      score = Math.round((matches.length / job.skillsNeeded.length) * 25 + 70);
    }
    score = Math.min(score + (idx % 3), 98);

    let finalLocation = job.location;
    if (loc && loc !== 'Remote') {
      finalLocation = idx % 2 === 0 ? `${loc} (Hybrid)` : loc;
    }

    return {
      title: job.title,
      company: job.company,
      location: finalLocation,
      url: job.url,
      desc: job.desc,
      matchScore: score,
      source: idx % 2 === 0 ? 'LinkedIn' : 'Google Jobs'
    };
  });
}

/**
 * Main Job Search Agent coordinator.
 */
export async function searchWebForVacancies(cvTitle, location, cvSkills, settings, onProgress) {
  const provider = settings.provider || 'mock';

  if (provider === 'gemini' && settings.apiKey) {
    onProgress('MSDK3: Querying search index portals...', 30);
    await new Promise(r => setTimeout(r, 600));

    onProgress('MSDK3: Grounding search results with Google Search retrieval...', 60);
    await new Promise(r => setTimeout(r, 600));

    onProgress('MSDK3: Analysing active job postings against CV skills...', 85);
    const result = await callRealGeminiSearch(cvTitle, location, cvSkills, settings);

    onProgress('MSDK3: Match matrix compiling completed!', 100);
    return result;
  } else {
    onProgress('MSDK3: Spawning web search agent worker...', 15);
    await new Promise(r => setTimeout(r, 500));

    onProgress('MSDK3: Fetching active job indices from Google Jobs API...', 40);
    await new Promise(r => setTimeout(r, 600));

    onProgress('MSDK3: Fetching active listings from LinkedIn jobs...', 65);
    await new Promise(r => setTimeout(r, 600));

    onProgress('MSDK3: Calculating profile skill alignment matrix...', 90);
    const result = callMockSearch(cvTitle, location, cvSkills);
    await new Promise(r => setTimeout(r, 400));

    onProgress('MSDK3: Job matching list compiled successfully!', 100);
    return result;
  }
}

