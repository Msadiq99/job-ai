// js/router.js

const VIEW_METADATA = {
  dashboard: {
    title: 'Dashboard & Tracker',
    subtitle: 'Track your job applications and auto-generation pipelines.'
  },
  'master-cv': {
    title: 'Master CV Profile',
    subtitle: 'Update your base resume details. MSDK3 uses this profile to generate tailored applications.'
  },
  'tailor-workspace': {
    title: 'Tailor Workspace',
    subtitle: 'Let MSDK3 adapt your CV for a specific job listing.'
  },
  'job-search': {
    title: 'Job Search Agent',
    subtitle: 'MSDK3 scans the web to discover active vacancies matching your profile.'
  },
  settings: {
    title: 'Settings & API Configuration',
    subtitle: 'Configure API keys and data backups.'
  }
};

class ClientRouter {
  constructor() {
    this.currentRoute = 'dashboard';
    this.listeners = [];
  }

  init() {
    // Bind click handlers to sidebar nav items
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        const route = button.getAttribute('data-tab');
        if (route) {
          this.navigate(route);
        }
      });
    });

    // Initial navigation
    this.navigate(this.currentRoute);
  }

  onRouteChanged(callback) {
    this.listeners.push(callback);
  }

  navigate(route) {
    if (!VIEW_METADATA[route]) {
      console.warn(`Route "${route}" not found.`);
      return;
    }

    this.currentRoute = route;

    // 1. Update navigation menu button active states
    document.querySelectorAll('.nav-item').forEach(button => {
      if (button.getAttribute('data-tab') === route) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // 2. Update visible section view
    document.querySelectorAll('.tab-view').forEach(view => {
      if (view.id === `view-${route}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // 3. Update main header titles
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    
    if (titleEl && subtitleEl) {
      titleEl.textContent = VIEW_METADATA[route].title;
      subtitleEl.textContent = VIEW_METADATA[route].subtitle;
    }

    // 4. Trigger listeners
    this.listeners.forEach(cb => cb(route));
  }
}

export const Router = new ClientRouter();
