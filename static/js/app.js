// js/app.js
import { State } from './state.js';
import { Router } from './router.js';
import { 
  renderKanbanBoard, 
  renderExperienceList, 
  renderEducationList, 
  renderJobDetailsModal,
  closeModal
} from './components.js';
import { testGeminiApiKey, tailorResume, parseResumeTextWithAI, searchWebForVacancies } from './api.js';

// Hold references to tailored outputs temporarily before saving to tracker
let lastTailoredOutput = null;
let currentActiveTailorTab = 'output-resume';

// Skills builder tags list
let activeSkillsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize State and Router
  await State.load();
  Router.init();

  // 2. Initialize UI states
  initApiStatusIndicator();
  initMasterCvView();
  initTailorWorkspaceView();
  initSettingsView();
  initDashboardMetrics();
  initJobSearchView();

  // 3. Subscribe to state changes to automatically refresh views
  State.subscribe((data) => {
    initApiStatusIndicator();
    initDashboardMetrics();
    
    // Refresh Kanban if current route is dashboard
    if (Router.currentRoute === 'dashboard') {
      renderKanbanBoard(handleCardClicked, handleStatusMove);
    }
  });

  // 4. Listen to route changes
  Router.onRouteChanged((route) => {
    if (route === 'dashboard') {
      renderKanbanBoard(handleCardClicked, handleStatusMove);
    } else if (route === 'master-cv') {
      loadCvToForm();
    } else if (route === 'job-search') {
      const keywordInput = document.getElementById('search-role-keyword');
      if (keywordInput && !keywordInput.value) {
        keywordInput.value = State.data.masterCv.personal.title || '';
      }
    }
  });

  // 5. Global modal close binding
  const closeModalBtn = document.getElementById('btn-close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }
});

/* ==========================================================================
   Dashboard View Operations
   ========================================================================== */
function initDashboardMetrics() {
  const metricsEl = document.getElementById('header-metrics');
  if (!metricsEl) return;

  const apps = State.data.applications || [];
  const total = apps.length;
  const applied = apps.filter(a => ['applied', 'interviewing', 'offers'].includes(a.status)).length;
  const interviewing = apps.filter(a => a.status === 'interviewing').length;

  metricsEl.innerHTML = `
    <div class="metrics-row">
      <div class="metric-pill">
        <span class="metric-pill-label">Total Logs</span>
        <span class="metric-pill-val">${total}</span>
      </div>
      <div class="metric-pill">
        <span class="metric-pill-label">Applied</span>
        <span class="metric-pill-val">${applied}</span>
      </div>
      <div class="metric-pill">
        <span class="metric-pill-label">Interviews</span>
        <span class="metric-pill-val" style="color:var(--warning);">${interviewing}</span>
      </div>
    </div>
  `;
}

function handleCardClicked(appId) {
  renderJobDetailsModal(appId, (id) => {
    State.deleteApplication(id);
  });
}

function handleStatusMove(appId, direction) {
  const app = State.data.applications.find(a => a.id === appId);
  if (!app) return;

  const statusFlow = ['wishlist', 'applied', 'interviewing', 'offers', 'archived'];
  const currentIndex = statusFlow.indexOf(app.status);
  
  if (direction === 'left' && currentIndex > 0) {
    State.updateApplicationStatus(appId, statusFlow[currentIndex - 1]);
  } else if (direction === 'right' && currentIndex < statusFlow.length - 1) {
    State.updateApplicationStatus(appId, statusFlow[currentIndex + 1]);
  }
}


/* ==========================================================================
   Master CV View Operations
   ========================================================================== */
function initMasterCvView() {
  // Left profile section switching
  const tabs = document.querySelectorAll('.profile-nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-profile-section');
      document.querySelectorAll('.profile-section-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      document.getElementById(`sec-${target}`).classList.add('active');
    });
  });

  // Form buttons
  const addExpBtn = document.getElementById('btn-add-experience');
  if (addExpBtn) {
    addExpBtn.addEventListener('click', () => {
      const expList = State.data.masterCv.experience || [];
      expList.push({
        id: `exp-${Date.now()}`,
        company: '',
        role: '',
        dates: '',
        bullets: ['']
      });
      renderExperienceList();
    });
  }

  const addEduBtn = document.getElementById('btn-add-education');
  if (addEduBtn) {
    addEduBtn.addEventListener('click', () => {
      const eduList = State.data.masterCv.education || [];
      eduList.push({
        id: `edu-${Date.now()}`,
        school: '',
        degree: '',
        dates: ''
      });
      renderEducationList();
    });
  }

  // Remove dynamic items (delegated click listener)
  const formArea = document.querySelector('.profile-form-area');
  if (formArea) {
    formArea.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.btn-remove-item');
      if (!removeBtn) return;

      const type = removeBtn.getAttribute('data-remove-type');
      const id = removeBtn.getAttribute('data-remove-id');

      if (type === 'experience') {
        State.data.masterCv.experience = State.data.masterCv.experience.filter(item => item.id !== id);
        renderExperienceList();
      } else if (type === 'education') {
        State.data.masterCv.education = State.data.masterCv.education.filter(item => item.id !== id);
        renderEducationList();
      }
    });
  }

  // Skills input tag handling
  const skillsInput = document.getElementById('skills-tag-input');
  if (skillsInput) {
    skillsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = skillsInput.value.trim().replace(/,$/, '');
        if (val && !activeSkillsList.includes(val)) {
          activeSkillsList.push(val);
          renderSkillTags();
          skillsInput.value = '';
        }
      }
    });
  }

  // Save changes button click
  const saveCvBtn = document.getElementById('btn-save-cv');
  if (saveCvBtn) {
    saveCvBtn.addEventListener('click', saveFormToState);
  }

  // Load CV
  loadCvToForm();

  // Collapsible toggle for upload panel
  const btnToggleUpload = document.getElementById('btn-toggle-upload-panel');
  const uploadBody = document.getElementById('cv-upload-body');
  if (btnToggleUpload && uploadBody) {
    btnToggleUpload.addEventListener('click', () => {
      uploadBody.classList.toggle('hidden');
      const icon = btnToggleUpload.querySelector('i');
      if (icon) {
        if (uploadBody.classList.contains('hidden')) {
          icon.setAttribute('data-lucide', 'chevron-down');
        } else {
          icon.setAttribute('data-lucide', 'chevron-up');
        }
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Paste raw text toggle
  const btnTogglePaste = document.getElementById('btn-toggle-paste-textarea');
  const pasteWrapper = document.getElementById('cv-paste-wrapper');
  const parseBar = document.getElementById('cv-parse-actions-bar');
  if (btnTogglePaste && pasteWrapper) {
    btnTogglePaste.addEventListener('click', () => {
      pasteWrapper.classList.toggle('hidden');
      if (!pasteWrapper.classList.contains('hidden')) {
        parseBar.classList.remove('hidden');
        parseBar.style.display = 'flex';
      } else if (document.getElementById('cv-file-picker').files.length === 0) {
        parseBar.classList.add('hidden');
        parseBar.style.display = 'none';
      }
    });
  }

  // Drag & Drop Dropzone bindings
  const dropzone = document.getElementById('cv-dropzone');
  const filePicker = document.getElementById('cv-file-picker');
  const filenameLabel = document.getElementById('cv-upload-filename');

  let selectedFileTextContent = '';

  function handleSelectedCvFile(file) {
    filenameLabel.textContent = file.name;
    parseBar.classList.remove('hidden');
    parseBar.style.display = 'flex';

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (file.name.endsWith('.json')) {
        let success = false;
        try {
          const parsed = JSON.parse(content);
          let targetCv = null;
          
          if (parsed.personal && parsed.experience) {
            targetCv = parsed;
          } else if (parsed.masterCv && parsed.masterCv.personal && parsed.masterCv.experience) {
            targetCv = parsed.masterCv;
          }
          
          if (targetCv) {
            // Ensure IDs exist for experience and education
            if (targetCv.experience) {
              targetCv.experience.forEach((exp, idx) => {
                if (!exp.id) exp.id = `exp-${Date.now()}-${idx}`;
              });
            }
            if (targetCv.education) {
              targetCv.education.forEach((edu, idx) => {
                if (!edu.id) edu.id = `edu-${Date.now()}-${idx}`;
              });
            }
            
            State.data.masterCv = targetCv;
            State.save();
            loadCvToForm();
            alert('Master CV profile restored successfully from JSON backup!');
            success = true;
          } else {
            alert('Invalid JSON structure. The file must contain a "personal" and "experience" section (or be a full backup containing a "masterCv" object).');
          }
        } catch (err) {
          alert('Failed to parse JSON file: ' + err.message);
        }
        
        // Reset file picker and clean up UI state
        filenameLabel.textContent = 'No file selected';
        parseBar.classList.add('hidden');
        parseBar.style.display = 'none';
        filePicker.value = '';
        selectedFileTextContent = '';
      } else {
        selectedFileTextContent = content;
      }
    };
    reader.readAsText(file);
  }

  if (dropzone && filePicker) {
    dropzone.addEventListener('click', () => filePicker.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        filePicker.files = files;
        handleSelectedCvFile(files[0]);
      }
    });

    filePicker.addEventListener('change', (e) => {
      if (filePicker.files.length > 0) {
        handleSelectedCvFile(filePicker.files[0]);
      }
    });
  }

  // Parse CV button trigger
  const btnParse = document.getElementById('btn-parse-uploaded-cv');
  const parseLoading = document.getElementById('cv-parse-loading-state');
  const parseLoadingStep = document.getElementById('cv-parse-loading-step');

  if (btnParse) {
    btnParse.addEventListener('click', async () => {
      let rawText = '';
      if (!pasteWrapper.classList.contains('hidden')) {
        rawText = document.getElementById('cv-paste-text').value.trim();
      } else {
        rawText = selectedFileTextContent;
      }

      if (!rawText) {
        alert('Please paste some resume text or upload a plain text/markdown file to parse.');
        return;
      }

      parseBar.classList.add('hidden');
      parseBar.style.display = 'none';
      parseLoading.classList.remove('hidden');

      try {
        const parsedCv = await parseResumeTextWithAI(rawText, State.data.settings, (msg) => {
          parseLoadingStep.textContent = msg;
        });

        // Ensure IDs exist for experience and education
        if (parsedCv.experience) {
          parsedCv.experience.forEach((exp, idx) => {
            if (!exp.id) exp.id = `exp-${Date.now()}-${idx}`;
          });
        }
        if (parsedCv.education) {
          parsedCv.education.forEach((edu, idx) => {
            if (!edu.id) edu.id = `edu-${Date.now()}-${idx}`;
          });
        }

        State.data.masterCv = parsedCv;
        State.save();
        loadCvToForm();

        parseLoading.classList.add('hidden');
        document.getElementById('cv-paste-text').value = '';
        if (!pasteWrapper.classList.contains('hidden')) {
          pasteWrapper.classList.add('hidden');
        }
        filePicker.value = '';
        selectedFileTextContent = '';
        alert('Resume parsed and imported into Master CV profile successfully!');
      } catch (err) {
        alert(`Parsing failed: ${err.message}`);
        parseLoading.classList.add('hidden');
        parseBar.classList.remove('hidden');
        parseBar.style.display = 'flex';
      }
    });
  }
}

function loadCvToForm() {
  const cv = State.data.masterCv;
  if (!cv) return;

  // Personal Info (resilient to missing personal block)
  const personal = cv.personal || {};
  document.getElementById('cv-fullname').value = personal.fullname || '';
  document.getElementById('cv-title').value = personal.title || '';
  document.getElementById('cv-email').value = personal.email || '';
  document.getElementById('cv-phone').value = personal.phone || '';
  document.getElementById('cv-website').value = personal.website || '';
  document.getElementById('cv-summary').value = personal.summary || '';

  // Experience and Education Lists
  renderExperienceList();
  renderEducationList();

  // Skills tags
  activeSkillsList = [...(cv.skills || [])];
  renderSkillTags();
}

function renderSkillTags() {
  const container = document.getElementById('skills-tags-container');
  if (!container) return;

  container.innerHTML = activeSkillsList.map(skill => `
    <span class="skill-tag">
      ${escapeHtml(skill)}
      <button type="button" class="skill-tag-remove" data-skill="${escapeHtml(skill)}">&times;</button>
    </span>
  `).join('');

  // Add click to remove bindings
  container.querySelectorAll('.skill-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillName = btn.getAttribute('data-skill');
      activeSkillsList = activeSkillsList.filter(s => s !== skillName);
      renderSkillTags();
    });
  });
}

function saveFormToState() {
  // Read personal
  const personal = {
    fullname: document.getElementById('cv-fullname').value,
    title: document.getElementById('cv-title').value,
    email: document.getElementById('cv-email').value,
    phone: document.getElementById('cv-phone').value,
    website: document.getElementById('cv-website').value,
    summary: document.getElementById('cv-summary').value
  };

  // Read experiences
  const experience = [];
  document.querySelectorAll('#experience-list .dynamic-item-card').forEach(card => {
    const id = card.getAttribute('data-exp-id');
    const company = card.querySelector('.exp-company').value;
    const role = card.querySelector('.exp-role').value;
    const dates = card.querySelector('.exp-dates').value;
    const bulletsText = card.querySelector('.exp-bullets').value;
    
    const bullets = bulletsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    experience.push({ id, company, role, dates, bullets });
  });

  // Read education
  const education = [];
  document.querySelectorAll('#education-list .dynamic-item-card').forEach(card => {
    const id = card.getAttribute('data-edu-id');
    const school = card.querySelector('.edu-school').value;
    const degree = card.querySelector('.edu-degree').value;
    const dates = card.querySelector('.edu-dates').value;

    education.push({ id, school, degree, dates });
  });

  // Update State & save
  State.updateMasterCv(personal, experience, education, activeSkillsList);

  // Show status popup
  const saveStatus = document.getElementById('save-status-msg');
  if (saveStatus) {
    saveStatus.classList.remove('hidden');
    setTimeout(() => {
      saveStatus.classList.add('hidden');
    }, 2500);
  }
}


/* ==========================================================================
   Tailor Workspace Operations
   ========================================================================== */
function initTailorWorkspaceView() {
  // Submit tailoring
  const btnRun = document.getElementById('btn-run-tailoring');
  if (btnRun) {
    btnRun.addEventListener('click', runResumeTailoringProcess);
  }

  // Tailored tab switches
  const tabButtons = document.querySelectorAll('.tabs-header-results .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-output-tab');
      currentActiveTailorTab = target;
      
      document.querySelectorAll('.output-tab-content').forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(target).classList.add('active');
    });
  });

  // Copy Buttons
  const btnCopyBullets = document.getElementById('btn-copy-bullets');
  if (btnCopyBullets) {
    btnCopyBullets.addEventListener('click', () => {
      if (!lastTailoredOutput) return;
      const bulletsText = lastTailoredOutput.bullets.map(g => 
        `-- ${g.jobTitle} --\n` + g.bullets.map(b => `• ${b}`).join('\n')
      ).join('\n\n');
      copyTextToClipboard(bulletsText, btnCopyBullets);
    });
  }

  const btnCopyCoverLetter = document.getElementById('btn-copy-coverletter');
  if (btnCopyCoverLetter) {
    btnCopyCoverLetter.addEventListener('click', () => {
      const coverLetterContent = document.getElementById('coverletter-text-container').innerText;
      copyTextToClipboard(coverLetterContent, btnCopyCoverLetter);
    });
  }

  // Add to tracker button
  const btnAddToTracker = document.getElementById('btn-add-tailored-to-tracker');
  if (btnAddToTracker) {
    btnAddToTracker.addEventListener('click', saveTailoredAppToTracker);
  }
}

async function runResumeTailoringProcess() {
  const company = document.getElementById('tailor-company').value.trim();
  const title = document.getElementById('tailor-title').value.trim();
  const url = document.getElementById('tailor-url').value.trim();
  const desc = document.getElementById('tailor-desc').value.trim();

  if (!company || !title || !desc) {
    alert('Please fill out Company Name, Position Title, and Job Description fields.');
    return;
  }

  // Switch layouts to show loading
  const emptyState = document.getElementById('tailor-empty-state');
  const processingState = document.getElementById('tailor-processing-state');
  const resultsState = document.getElementById('tailored-output-data');

  emptyState.classList.add('hidden');
  resultsState.classList.add('hidden');
  processingState.classList.remove('hidden');

  const stepText = document.getElementById('processing-step');
  const progressFill = document.getElementById('tailor-progress');

  try {
    const jobDetails = { company, title, url, desc };
    const cv = State.data.masterCv;

    // Call API runner
    const result = await tailorResume(cv, jobDetails, State.data.settings, (msg, percentage) => {
      stepText.textContent = msg;
      progressFill.style.width = `${percentage}%`;
    });

    // Save temporary result
    lastTailoredOutput = result;

    // Render results
    renderTailoringResults(result);

    // Swap states
    processingState.classList.add('hidden');
    resultsState.classList.remove('hidden');

  } catch (e) {
    alert(`Error tailoring CV: ${e.message}`);
    processingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

function renderTailoringResults(result) {
  // 1. Render Match Score circular gauge
  const scorePercentEl = document.getElementById('score-text-percent');
  const scoreRingEl = document.getElementById('score-ring-fill');
  const alignmentDescEl = document.getElementById('score-alignment-description');
  const recommendationTextEl = document.getElementById('score-recommendation-text');

  const scoreVal = result.matchScore || 0;
  if (scorePercentEl) {
    scorePercentEl.textContent = `${scoreVal}%`;
  }
  if (scoreRingEl) {
    const circumference = 314.159;
    const offset = circumference - (scoreVal / 100) * circumference;
    scoreRingEl.style.strokeDashoffset = offset;
  }
  if (alignmentDescEl) {
    let alignmentMessage = '';
    if (scoreVal >= 90) {
      alignmentMessage = 'Outstanding alignment! Your Master CV matches almost all key technical skills and requirements for this role.';
    } else if (scoreVal >= 80) {
      alignmentMessage = 'Strong alignment! Your background fits most requirements. Adding the flagged missing keywords will optimize your match rate.';
    } else {
      alignmentMessage = 'Moderate alignment. Notable gaps exist between your Master CV profile and this job description. Review the recommendations.';
    }
    alignmentDescEl.textContent = alignmentMessage;
  }

  // 2. Render Matched & Missing Keywords tags
  const matchedContainer = document.getElementById('matched-keywords-container');
  const missingContainer = document.getElementById('missing-keywords-container');
  const gap = result.gapAnalysis || { matchedSkills: [], missingSkills: [], recommendations: '' };

  if (matchedContainer) {
    matchedContainer.innerHTML = gap.matchedSkills && gap.matchedSkills.length > 0
      ? gap.matchedSkills.map(skill => `<span class="tag-pill tag-match"><i data-lucide="check" style="width:10px; height:10px;"></i> ${escapeHtml(skill)}</span>`).join('')
      : '<span class="text-muted" style="font-size:0.8rem;">None matched</span>';
  }

  if (missingContainer) {
    missingContainer.innerHTML = gap.missingSkills && gap.missingSkills.length > 0
      ? gap.missingSkills.map(skill => `<span class="tag-pill tag-missing"><i data-lucide="flag" style="width:10px; height:10px;"></i> ${escapeHtml(skill)}</span>`).join('')
      : '<span class="text-muted" style="font-size:0.8rem;">None flagged</span>';
  }

  if (recommendationTextEl) {
    recommendationTextEl.textContent = gap.recommendations || 'Review requirements to weave in related skills.';
  }

  // Reset active tab button states
  const tabButtons = document.querySelectorAll('.tabs-header-results .tab-btn');
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-output-tab') === 'output-score') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Reset active tab content panes
  document.querySelectorAll('.output-tab-content').forEach(pane => {
    if (pane.id === 'output-score') {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Render bullets
  const bulletsContainer = document.getElementById('tailored-bullets-container');
  if (bulletsContainer) {
    bulletsContainer.innerHTML = result.bullets.map(group => `
      <div class="tailored-bullet-group">
        <div class="bullet-job-title">${escapeHtml(group.jobTitle)}</div>
        <ul class="bullet-points-ul">
          ${group.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  // Render Cover Letter
  const letterContainer = document.getElementById('coverletter-text-container');
  if (letterContainer) {
    letterContainer.innerText = result.coverLetter || '';
  }

  // Render Interview Prep Q&A
  const qaContainer = document.getElementById('qa-prep-container');
  if (qaContainer) {
    qaContainer.innerHTML = result.prepQuestions.map(item => `
      <div class="qa-item">
        <div class="qa-question">Q: ${escapeHtml(item.q)}</div>
        <div class="qa-answer">A: ${escapeHtml(item.a)}</div>
      </div>
    `).join('');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function saveTailoredAppToTracker() {
  if (!lastTailoredOutput) return;

  const company = document.getElementById('tailor-company').value.trim();
  const title = document.getElementById('tailor-title').value.trim();
  const url = document.getElementById('tailor-url').value.trim();
  const desc = document.getElementById('tailor-desc').value.trim();
  const planType = document.getElementById('application-plan-type').value;

  const newApp = {
    id: `app-${Date.now()}`,
    company,
    title,
    url,
    desc,
    dateAdded: new Date().toISOString().split('T')[0],
    status: 'wishlist', // Default starting column
    planType,
    tailoredCv: lastTailoredOutput,
    coverLetter: document.getElementById('coverletter-text-container').innerText,
    prepQuestions: lastTailoredOutput.prepQuestions
  };

  State.addApplication(newApp);

  // Clear inputs
  document.getElementById('tailor-company').value = '';
  document.getElementById('tailor-title').value = '';
  document.getElementById('tailor-url').value = '';
  document.getElementById('tailor-desc').value = '';
  
  // Reset output states
  document.getElementById('tailored-output-data').classList.add('hidden');
  document.getElementById('tailor-empty-state').classList.remove('hidden');
  lastTailoredOutput = null;

  // Route to Dashboard Tracker
  Router.navigate('dashboard');
}


/* ==========================================================================
   Settings & API Configuration View
   ========================================================================== */
function initSettingsView() {
  const settings = State.data.settings;

  const providerSelect = document.getElementById('settings-provider');
  const apiKeyInput = document.getElementById('settings-api-key');
  const modelSelect = document.getElementById('settings-model');

  // Load current values
  if (providerSelect) providerSelect.value = settings.provider || 'mock';
  if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
  if (modelSelect) modelSelect.value = settings.model || 'gemini-2.5-flash';

  // Toggle API inputs based on provider
  toggleSettingsProviderFields(settings.provider);

  providerSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    toggleSettingsProviderFields(val);
    State.updateSettings({ provider: val });
  });

  apiKeyInput.addEventListener('input', (e) => {
    State.updateSettings({ apiKey: e.target.value });
  });

  modelSelect.addEventListener('change', (e) => {
    State.updateSettings({ model: e.target.value });
  });

  // Test API connection
  const btnTest = document.getElementById('btn-test-api');
  if (btnTest) {
    btnTest.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      const model = modelSelect.value;
      
      if (!key) {
        alert('Please enter an API key to test.');
        return;
      }

      btnTest.disabled = true;
      btnTest.textContent = 'Testing...';

      const res = await testGeminiApiKey(key, model);
      btnTest.disabled = false;
      btnTest.textContent = 'Test Key';

      alert(res.message);
      if (res.success) {
        State.updateSettings({ provider: 'gemini', apiKey: key });
        providerSelect.value = 'gemini';
        toggleSettingsProviderFields('gemini');
      }
    });
  }

  // Import / Export backup JSON logs
  const btnExport = document.getElementById('btn-export-data');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = State.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `msdk3_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  const fileInput = document.getElementById('btn-import-data-file');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = State.importData(event.target.result);
        if (success) {
          alert('Data backup imported successfully!');
          window.location.reload();
        } else {
          alert('Failed to import backup. Please check that the file format is a valid MSDK3 backup JSON.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Clear all data
  const btnWipe = document.getElementById('btn-clear-all-data');
  if (btnWipe) {
    btnWipe.addEventListener('click', () => {
      if (confirm('CRITICAL WARNING: This will permanently delete all your CV profiles, job applications, notes, and API keys. Are you sure you want to proceed?')) {
        State.clearAll();
        alert('All data wiped.');
        window.location.reload();
      }
    });
  }
}

function toggleSettingsProviderFields(provider) {
  const keyContainer = document.getElementById('settings-key-container');
  const modelContainer = document.getElementById('settings-model-container');
  const banner = document.getElementById('settings-status-banner');
  const statusText = document.getElementById('settings-status-text');

  if (provider === 'mock') {
    keyContainer.classList.add('hidden');
    modelContainer.classList.add('hidden');
    banner.className = 'api-status-banner mock';
    statusText.textContent = 'Using Local Demo Mode. Generates intelligent mock resumes without an internet connection or API keys.';
  } else {
    keyContainer.classList.remove('hidden');
    modelContainer.classList.remove('hidden');
    banner.className = 'api-status-banner online';
    statusText.textContent = 'Using Live Google Gemini API. Key is stored locally in your browser storage.';
  }
}

function initApiStatusIndicator() {
  const badge = document.getElementById('global-api-badge');
  const label = badge.querySelector('.status-label');
  const settings = State.data.settings;

  if (settings.provider === 'mock') {
    badge.className = 'api-status-badge mock';
    label.textContent = 'Demo Mode';
  } else {
    if (settings.apiKey) {
      badge.className = 'api-status-badge online';
      label.textContent = 'Gemini Live';
    } else {
      badge.className = 'api-status-badge offline';
      label.textContent = 'Key Missing';
    }
  }
}


/* ==========================================================================
   Helper Utilities
   ========================================================================== */
function copyTextToClipboard(text, triggerButton) {
  navigator.clipboard.writeText(text).then(() => {
    const originalContent = triggerButton.innerHTML;
    triggerButton.innerHTML = `<i data-lucide="check" style="width:14px; height:14px;"></i> Copied!`;
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
      triggerButton.innerHTML = originalContent;
      if (window.lucide) window.lucide.createIcons();
    }, 2000);
  }).catch(err => {
    alert('Failed to copy to clipboard: ' + err);
  });
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================================
   Job Search Agent View Operations
   ========================================================================== */
function initJobSearchView() {
  const btnSearch = document.getElementById('btn-search-jobs');
  if (!btnSearch) return;

  const presetSelect = document.getElementById('search-location-preset');
  const customWrapper = document.getElementById('search-location-custom-wrapper');

  if (presetSelect && customWrapper) {
    presetSelect.addEventListener('change', () => {
      if (presetSelect.value === 'custom') {
        customWrapper.classList.remove('hidden');
      } else {
        customWrapper.classList.add('hidden');
      }
    });
  }

  btnSearch.addEventListener('click', async () => {
    const keyword = document.getElementById('search-role-keyword').value.trim();
    
    let location = 'Remote';
    if (presetSelect) {
      if (presetSelect.value === 'custom') {
        const customInput = document.getElementById('search-location-custom');
        location = customInput ? customInput.value.trim() : '';
      } else {
        location = presetSelect.value;
      }
    }

    if (!keyword) {
      alert('Please enter a role or job title to search.');
      return;
    }

    if (!location) {
      alert('Please select or enter a target location.');
      return;
    }

    const emptyState = document.getElementById('search-empty-state');
    const processingState = document.getElementById('search-processing-state');
    const resultsState = document.getElementById('search-results-data');
    const terminalLog = document.getElementById('search-terminal-log');

    emptyState.classList.add('hidden');
    resultsState.classList.add('hidden');
    processingState.classList.remove('hidden');
    terminalLog.classList.remove('hidden');
    terminalLog.innerHTML = '';

    const progressStepText = document.getElementById('search-progress-step');

    function appendTerminalLog(message) {
      const line = document.createElement('div');
      line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      terminalLog.appendChild(line);
      terminalLog.scrollTop = terminalLog.scrollHeight;
    }

    try {
      appendTerminalLog(`Initiating web search agent worker...`);
      
      const skills = State.data.masterCv.skills || [];
      const settings = State.data.settings;

      const jobs = await searchWebForVacancies(keyword, location, skills, settings, (stepMsg) => {
        progressStepText.textContent = stepMsg;
        appendTerminalLog(stepMsg);
      });

      appendTerminalLog(`Match analysis completed. Found ${jobs.length} relevant vacancies.`);

      // Render vacancy listings
      const container = document.getElementById('search-listings-container');
      if (container) {
        container.innerHTML = jobs.map((job, idx) => `
          <div class="vacancy-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <div>
                <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-hover); font-weight: 700; letter-spacing: 0.05em;">${escapeHtml(job.company)}</span>
                <h4 style="font-size: 1.15rem; font-weight: 600; margin-top: 2px;">${escapeHtml(job.title)}</h4>
                <span class="text-muted" style="font-size: 0.8rem; display: block; margin-top: 4px;">
                  <i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${escapeHtml(job.location)}
                </span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;">
                <span class="badge" style="background-color: var(--accent-glow); color: var(--accent-hover); border: 1px solid var(--accent); padding: 4px 8px; font-weight: 700;">${job.matchScore}% Match</span>
                <span class="text-muted" style="font-size: 0.65rem; font-weight: 500;">via ${escapeHtml(job.source)}</span>
              </div>
            </div>
            
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; border-top: 1px solid var(--border-color); padding-top: 10px; margin: 4px 0;">
              ${escapeHtml(job.desc)}
            </p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 4px;">
              <a href="${escapeHtml(job.url)}" target="_blank" class="btn btn-secondary btn-small" style="padding: 6px 12px; font-size: 0.75rem;">
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> View Posting
              </a>
              <button class="btn btn-primary btn-small btn-save-wishlist" 
                      data-company="${escapeHtml(job.company)}"
                      data-title="${escapeHtml(job.title)}"
                      data-url="${escapeHtml(job.url)}"
                      data-desc="${escapeHtml(job.desc)}"
                      data-score="${job.matchScore}"
                      style="padding: 6px 14px; font-size: 0.75rem;">
                <i data-lucide="bookmark" style="width: 12px; height: 12px;"></i> Save to Wishlist
              </button>
            </div>
          </div>
        `).join('');

        if (window.lucide) {
          window.lucide.createIcons();
        }

        // Bind Wishlist click handlers
        container.querySelectorAll('.btn-save-wishlist').forEach(btn => {
          btn.addEventListener('click', () => {
            const companyName = btn.getAttribute('data-company');
            const jobTitle = btn.getAttribute('data-title');
            const jobUrl = btn.getAttribute('data-url');
            const jobDesc = btn.getAttribute('data-desc');
            const scoreVal = parseInt(btn.getAttribute('data-score')) || 80;

            const newApp = {
              id: `app-${Date.now()}`,
              company: companyName,
              title: jobTitle,
              url: jobUrl,
              desc: jobDesc,
              dateAdded: new Date().toISOString().split('T')[0],
              status: 'wishlist',
              planType: 'Manual',
              tailoredCv: {
                matchScore: scoreVal,
                gapAnalysis: {
                  matchedSkills: State.data.masterCv.skills || [],
                  missingSkills: [],
                  recommendations: 'Saved via Job Search Agent. Run tailoring workspace to adapt CV bullet points.'
                },
                bullets: State.data.masterCv.experience.map(exp => ({
                  jobTitle: `${exp.role} (${exp.company})`,
                  bullets: exp.bullets || []
                }))
              },
              coverLetter: '',
              prepQuestions: []
            };

            State.addApplication(newApp);

            // Animate button
            btn.innerHTML = `<i data-lucide="check" style="width:12px; height:12px;"></i> Saved!`;
            btn.disabled = true;
            btn.style.backgroundColor = 'var(--success-bg)';
            btn.style.color = 'var(--success)';
            btn.style.borderColor = 'var(--success)';
            
            if (window.lucide) {
              window.lucide.createIcons();
            }
          });
        });
      }

      processingState.classList.add('hidden');
      resultsState.classList.remove('hidden');

    } catch (err) {
      appendTerminalLog(`Search failed: ${err.message}`);
      alert(`Search failed: ${err.message}`);
      processingState.classList.add('hidden');
      emptyState.classList.remove('hidden');
    }
  });
}
