// js/state.js

const STATE_KEY = 'msdk3_app_state_v1';

const DEFAULT_MOCK_CV = {
  personal: {
    fullname: 'M. Sadiq',
    title: 'Senior AI Solutions Engineer',
    email: 'm.sadiq@example.com',
    phone: '+966 50 123 4567',
    website: 'https://github.com/msadiq',
    summary: 'Driven AI engineer with 6+ years of experience building autonomous agents, integrating large language models, and developing highly responsive web interfaces. Specialized in orchestrating Gemini and Claude APIs to automate complex enterprise workflows.'
  },
  experience: [
    {
      id: 'exp-1',
      company: 'NeuralFlow Technologies',
      role: 'Lead AI Engineer',
      dates: '2024 - Present',
      bullets: [
        'Designed and deployed a multi-agent system using Gemini API that automated customer support classification, reducing response latency by 40%.',
        'Built full-stack React dashboards featuring real-time analytics for monitoring agentic workflow health and tokens performance.',
        'Collaborated with product teams to design robust prompt engineering frameworks that increased structured output accuracy by 25%.'
      ]
    },
    {
      id: 'exp-2',
      company: 'AppForge Solutions',
      role: 'Senior Software Engineer',
      dates: '2020 - 2024',
      bullets: [
        'Developed scalable REST APIs using Node.js and Express that served over 100k daily active users.',
        'Led the migration of a legacy monolithic platform into modular microservices, enhancing system uptime to 99.9%.',
        'Implemented modern UI/UX design components using Vanilla CSS and React, improving Core Web Vitals score by 15 points.'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      school: 'King Fahd University of Petroleum and Minerals',
      degree: 'B.S. in Computer Science',
      dates: '2016 - 2020'
    }
  ],
  skills: ['Python', 'JavaScript', 'Google Gemini API', 'Claude API', 'React', 'Node.js', 'AI Agents', 'SQL', 'CSS Grid/Flexbox', 'Git']
};

const DEFAULT_MOCK_APPLICATIONS = [
  {
    id: 'app-mock-1',
    company: 'Google DeepMind',
    title: 'Senior Machine Learning Engineer',
    url: 'https://careers.google.com/jobs/deepmind',
    dateAdded: '2026-06-01',
    status: 'wishlist',
    planType: 'Auto-Apply Ready',
    tailoredCv: {
      bullets: [
        {
          jobTitle: 'Lead AI Engineer (NeuralFlow)',
          bullets: [
            'Architected state-of-the-art multi-agent pipelines leveraging Gemini Pro models, boosting task-completion rates to 94%.',
            'Implemented custom prompt validation logic that eliminated hallucinations in LLM structured outputs.'
          ]
        }
      ]
    },
    coverLetter: `Dear Hiring Team at Google DeepMind,

I am writing to express my strong interest in the Senior Machine Learning Engineer role. With my background in orchestrating multi-agent systems and utilizing the Gemini API at NeuralFlow, I am excited about the opportunity to contribute to DeepMind's state-of-the-art AI systems.

I look forward to discussing how my experience fits your goals.

Sincerely,
M. Sadiq`,
    prepQuestions: [
      {
        q: 'How do you handle latency when querying LLMs in a production workflow?',
        a: 'I utilize asynchronous task queues and prompt caching mechanisms. When using Gemini, I employ streaming responses to start updating the UI immediately.'
      }
    ]
  },
  {
    id: 'app-mock-2',
    company: 'Stripe',
    title: 'Full Stack AI Developer',
    url: 'https://stripe.com/jobs',
    dateAdded: '2026-06-03',
    status: 'applied',
    planType: 'Manual',
    tailoredCv: {
      bullets: [
        {
          jobTitle: 'Senior Software Engineer (AppForge)',
          bullets: [
            'Spearheaded integration of LLM-based assistants inside transaction dashboards, streamlining merchant invoice operations.',
            'Optimized CSS and JavaScript delivery bundles to ensure smooth transitions and micro-animations.'
          ]
        }
      ]
    },
    coverLetter: `Dear Stripe Recruiting Team,

I am thrilled to apply for the Full Stack AI Developer position. I have a long history of writing secure Node.js integrations alongside clean, responsive CSS frontends. Combining this full-stack knowledge with LLM integrations makes this role a perfect fit.

Best regards,
M. Sadiq`,
    prepQuestions: [
      {
        q: 'Why Stripe?',
        a: 'Stripe is the gold standard for web engineering. Integrating intelligent automation and LLMs into payment products is the next frontier of developer enablement.'
      }
    ]
  }
];

class AppState {
  constructor() {
    this.data = {
      masterCv: JSON.parse(JSON.stringify(DEFAULT_MOCK_CV)),
      applications: JSON.parse(JSON.stringify(DEFAULT_MOCK_APPLICATIONS)),
      settings: {
        provider: 'mock',
        apiKey: '',
        model: 'gemini-2.5-flash'
      }
    };
    this.listeners = [];
  }

  // Register callback triggers for data changes
  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.data));
  }

  // Load state from the backend API
  async load() {
    try {
      const response = await fetch('/api/state');
      if (response.ok) {
        const parsed = await response.json();
        this.data.masterCv = parsed.masterCv || DEFAULT_MOCK_CV;
        this.data.applications = parsed.applications || [];
        this.data.settings = parsed.settings || { provider: 'mock', apiKey: '', model: 'gemini-2.5-flash' };
        this.notify();
      }
    } catch (e) {
      console.error('Failed to load state from API backend:', e);
    }
  }

  // Save state to the backend API
  async save() {
    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.data)
      });
      if (response.ok) {
        this.notify();
      }
    } catch (e) {
      console.error('Failed to save state to API backend:', e);
    }
  }

  // Master CV Operations
  updateMasterCv(personal, experience, education, skills) {
    this.data.masterCv.personal = personal;
    this.data.masterCv.experience = experience;
    this.data.masterCv.education = education;
    this.data.masterCv.skills = skills;
    this.save();
  }

  // Tracker / Applications Operations
  addApplication(app) {
    // Check if duplicate ID exists, just in case
    const index = this.data.applications.findIndex(a => a.id === app.id);
    if (index !== -1) {
      this.data.applications[index] = app;
    } else {
      this.data.applications.push(app);
    }
    this.save();
  }

  updateApplicationStatus(appId, newStatus) {
    const app = this.data.applications.find(a => a.id === appId);
    if (app) {
      app.status = newStatus;
      this.save();
    }
  }

  deleteApplication(appId) {
    this.data.applications = this.data.applications.filter(a => a.id !== appId);
    this.save();
  }

  // Settings operations
  updateSettings(settings) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
  }

  clearAll() {
    this.data = {
      masterCv: JSON.parse(JSON.stringify(DEFAULT_MOCK_CV)),
      applications: [],
      settings: {
        provider: 'mock',
        apiKey: '',
        model: 'gemini-2.5-flash'
      }
    };
    this.save();
  }

  // Data backups
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonDataString) {
    try {
      const parsed = JSON.parse(jsonDataString);
      if (parsed.masterCv && parsed.applications && parsed.settings) {
        this.data = parsed;
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error importing backup JSON data:', e);
      return false;
    }
  }
}

// Export singleton instance
export const State = new AppState();
State.load();
