// js/state.js

const STATE_KEY = 'msdk3_app_state_v1';

const DEFAULT_MOCK_CV = {
  personal: {
    fullname: 'Mohamed El Sadiq',
    title: 'Senior Project Engineer',
    email: 'sadiqgeneralmail@gmail.com',
    phone: '+966565712713',
    website: 'https://linkedin.com/in/msadiq',
    summary: 'Senior Project Engineer with 17+ years of experience delivering industrial, utility, and energy-related projects across Saudi Arabia. Proven leadership in project execution, plant operations, maintenance, commissioning, and asset reliability, with strong multidisciplinary expertise in mechanical, electrical, and instrumentation systems. Extensive experience supporting Aramco-regulated environments, EPC/PMC coordination, and high-risk operational facilities. Recognized for driving safety, reliability, and performance across complex industrial plants.'
  },
  experience: [
    {
      id: 'exp-1',
      company: 'Abdullah Hashim Industrial Gases & Equipment (AHG)',
      role: 'Senior Project Engineer',
      dates: 'Jan 2025 - Present',
      bullets: [
        'Lead multidisciplinary engineering and project execution activities for large-scale industrial gas and utility facilities, acting as the technical focal point between operations, maintenance, contractors, and management.',
        'Oversee project planning, engineering reviews, construction coordination, and commissioning readiness for plant upgrades, brownfield modifications, and reliability-driven capital projects.',
        'Provide senior-level oversight of mechanical, electrical, and instrumentation systems, including rotating equipment, compressors, cryogenic systems, power distribution, and DCS-controlled processes.',
        'Manage contractor performance, technical compliance, and HSE adherence, ensuring alignment with international engineering standards and company governance.',
        'Drive asset integrity, reliability improvement, and lifecycle optimization initiatives, reducing unplanned downtime and improving plant availability.',
        'Support management with project risk assessments, cost control, schedule monitoring, and executive reporting.'
      ]
    },
    {
      id: 'exp-2',
      company: 'Abdullah Hashim Industrial Gases & Equipment (AHG)',
      role: 'Assistant Plant Manager (CO2)',
      dates: 'Sep 2022 - Dec 2024',
      bullets: [
        'Directed CO2 production operations, including raw material handling, compression, storage, and distribution, ensuring safe and reliable output.',
        'Led preventive and corrective maintenance strategies to maximize equipment uptime and operational efficiency.',
        'Enforced regulatory compliance, conducted audits, and closed corrective actions in line with corporate and international standards.',
        'Championed HSE leadership, risk assessments, and safety culture across production and maintenance teams.',
        'Delivered measurable cost reductions through process optimization and resource efficiency improvements.'
      ]
    },
    {
      id: 'exp-3',
      company: 'Abdullah Hashim Industrial Gases & Equipment (AHG)',
      role: 'Senior Operations & Maintenance Engineer (ASU)',
      dates: 'Jan 2012 - Sep 2022',
      bullets: [
        'Led operations and maintenance for Air Separation Units (O2 / N2) in high-demand industrial environments.',
        'Developed and executed preventive maintenance programs, reducing downtime and extending equipment lifecycle.',
        'Conducted root cause analysis for critical equipment failures and implemented long-term reliability solutions.',
        'Supervised and mentored technicians, ensuring high technical performance and safety compliance.',
        'Supported capital projects, plant upgrades, and commissioning activities.'
      ]
    },
    {
      id: 'exp-4',
      company: 'Dar El Tasmeem Construction (EPC)',
      role: 'MEP Site Engineer',
      dates: 'Jan 2011 - Jan 2012',
      bullets: [
        'Performed as a site-based EPC execution engineer, supervising MEP works to ensure compliance with approved drawings, project specifications, and HSE requirements.',
        'Acted as the site interface between EPC project management, subcontractors, and consultants, supporting coordination and resolution of technical and constructability issues.',
        'Reviewed shop drawings, material submittals, and method statements, ensuring alignment with design intent and international standards.',
        'Supervised installation, testing, and commissioning support for MEP, HVAC, electrical, and plumbing systems, contributing to timely project delivery.',
        'Monitored site progress and quality, supporting schedule adherence, inspection approvals, and handover readiness.'
      ]
    },
    {
      id: 'exp-5',
      company: 'Cairo Electric Consultant (PMC)',
      role: 'Electrical Engineer',
      dates: 'Jan 2008 - Jan 2011',
      bullets: [
        'Worked in a consultant / PMC-style role, providing design review, site supervision, and technical compliance oversight for electrical systems.',
        'Oversaw installation and testing of power and light-current systems, ensuring compliance with approved designs, local regulations, and international electrical codes.',
        'Prepared and reviewed shop drawings, technical calculations, and material submissions, coordinating approvals with contractors and stakeholders.',
        'Conducted site inspections, progress evaluations, and quality checks, reporting findings and recommendations to project management teams.',
        'Ensured contractor adherence to building codes, safety standards, and project specifications, supporting safe and compliant project execution.'
      ]
    },
    {
      id: 'exp-6',
      company: 'Air Products & Aramco Projects',
      role: 'Senior Project Engineer (PMC Oversight)',
      dates: '2012 - Present (Highlights)',
      bullets: [
        'Supported owner-side / PMC oversight for industrial gas plants, oil refineries, and natural gas facilities with Air Products and Aramco across Saudi Arabia and the GCC.',
        'Directed equipment installation, plant modifications, mechanical completion, pre-commissioning, and commissioning activities.',
        'Executed natural gas purging, leak testing, pressure testing, drying, and system cleaning in compliance with international standards and HSE requirements.',
        'Supported ASU, specialty gases, cryogenic systems, and rotating equipment commissioning and operational readiness.',
        'Delivered medical gas systems installation and commissioning for government, private, and military hospitals.',
        'Managed industrial gas and cryogenic equipment installations for food, beverage, and multi-industry clients, coordinating EPC contractors and operations teams.'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      school: 'Higher Technological Institute (HTI), Egypt',
      degree: 'Bachelor of Electrical Engineering (B.Eng.)',
      dates: 'Graduated: June 2008'
    }
  ],
  skills: [
    'Senior Project Engineering (PMC)',
    'EPC Contractor Oversight',
    'Project Execution & Governance',
    'Engineering Design Review',
    'Construction Supervision',
    'Commissioning & Startup',
    'Mechanical Completion',
    'Operational Readiness & Handover',
    'Electrical Systems (HV/MV, MCC, Switchgear)',
    'Instrumentation & Control (DCS/PLC)',
    'Rotating Equipment Integration',
    'Plant Operations & Asset Integrity',
    'Shutdown & Turnaround Management',
    'HSE Leadership',
    'QA/QC Compliance',
    'International Standards (IEC, ISA, IEEE)',
    'Multidisciplinary Coordination',
    'Risk Management',
    'Schedule & Progress Monitoring'
  ]
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
