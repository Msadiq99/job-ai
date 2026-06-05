// js/state.js

const STATE_KEY = 'msdk3_app_state_v1';

const DEFAULT_MOCK_CV = {
  personal: {
    fullname: 'M. Sadiq',
    title: 'Senior Artificial Intelligence Engineer',
    email: 'sadiqgeneralmail@gmail.com',
    phone: '+966565712713',
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

const DEFAULT_MOCK_APPLICATIONS = [];

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
