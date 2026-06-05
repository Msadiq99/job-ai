// js/components.js
import { State } from './state.js';

/**
 * Renders the Kanban Board Columns and Cards.
 */
export function renderKanbanBoard(onCardClick, onStatusMove) {
  const container = document.getElementById('kanban-board');
  if (!container) return;

  const columns = [
    { id: 'wishlist', title: 'Wishlist', icon: 'bookmark' },
    { id: 'applied', title: 'Applied', icon: 'send' },
    { id: 'interviewing', title: 'Interviewing', icon: 'message-square' },
    { id: 'offers', title: 'Offers', icon: 'award' },
    { id: 'archived', title: 'Archived', icon: 'archive' }
  ];

  const apps = State.data.applications;

  container.innerHTML = columns.map(col => {
    const colApps = apps.filter(app => app.status === col.id);
    return `
      <div class="kanban-column" data-status="${col.id}">
        <div class="kanban-header">
          <div class="flex items-center gap-2" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="${col.icon}" style="width:16px; height:16px; color:var(--accent);"></i>
            <h3>${col.title}</h3>
          </div>
          <span class="kanban-count">${colApps.length}</span>
        </div>
        <div class="kanban-cards" id="column-${col.id}">
          ${colApps.map(app => renderJobCard(app)).join('')}
          ${colApps.length === 0 ? `<div class="empty-state" style="padding:20px; font-size:0.8rem;">No items</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Re-bind Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind click listeners for cards
  document.querySelectorAll('.job-card').forEach(card => {
    const appId = card.getAttribute('data-id');
    card.addEventListener('click', (e) => {
      // Prevent modal opening when clicking quick move buttons
      if (e.target.closest('.card-quick-btn')) return;
      onCardClick(appId);
    });
  });

  // Bind move click listeners
  document.querySelectorAll('.card-quick-btn').forEach(btn => {
    const appId = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    btn.addEventListener('click', () => {
      onStatusMove(appId, action);
    });
  });
}

/**
 * Renders an individual Job Card inside a Kanban column.
 */
function renderJobCard(app) {
  const planBadge = app.planType === 'Auto-Apply Ready' 
    ? '<span class="badge badge-purple">Auto-Apply</span>' 
    : '<span class="badge badge-blue">Manual</span>';

  const scoreBadge = app.tailoredCv && typeof app.tailoredCv.matchScore === 'number'
    ? `<span class="badge badge-purple" style="background-color: var(--accent-glow); color: var(--accent-hover); border: 1px solid var(--accent);">${app.tailoredCv.matchScore}% Match</span>`
    : '';

  // Determine which nav arrows to render based on current status
  let actionButtons = '';
  if (app.status === 'wishlist') {
    actionButtons = `<button class="card-quick-btn" data-id="${app.id}" data-action="right" title="Move to Applied"><i data-lucide="chevron-right"></i></button>`;
  } else if (app.status === 'archived') {
    actionButtons = `<button class="card-quick-btn" data-id="${app.id}" data-action="left" title="Move back to Offers"><i data-lucide="chevron-left"></i></button>`;
  } else {
    actionButtons = `
      <button class="card-quick-btn" data-id="${app.id}" data-action="left" title="Move Back"><i data-lucide="chevron-left"></i></button>
      <button class="card-quick-btn" data-id="${app.id}" data-action="right" title="Move Forward"><i data-lucide="chevron-right"></i></button>
    `;
  }

  // Format date nicely
  const dateStr = app.dateAdded ? new Date(app.dateAdded).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';

  return `
    <div class="job-card" data-id="${app.id}">
      <div class="job-card-header">
        <span class="card-company">${escapeHtml(app.company)}</span>
        <span class="card-date">${dateStr}</span>
      </div>
      <div class="card-title">${escapeHtml(app.title)}</div>
      <div class="job-card-footer">
        <div style="display: flex; gap: 6px; align-items: center;">
          ${planBadge}
          ${scoreBadge}
        </div>
        <div class="card-actions-quick">
          ${actionButtons}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Master CV Dynamic Experience Forms list.
 */
export function renderExperienceList() {
  const container = document.getElementById('experience-list');
  if (!container) return;

  const experience = State.data.masterCv.experience || [];
  container.innerHTML = experience.map(exp => `
    <div class="dynamic-item-card" data-exp-id="${exp.id}">
      <button type="button" class="btn-remove-item" data-remove-type="experience" data-remove-id="${exp.id}" title="Remove job">
        <i data-lucide="trash-2" style="width:18px; height:18px;"></i>
      </button>
      <div class="form-grid">
        <div class="form-group">
          <label>Company Name</label>
          <input type="text" class="exp-company" value="${escapeHtml(exp.company)}" placeholder="e.g. Acme Corp">
        </div>
        <div class="form-group">
          <label>Job Title / Role</label>
          <input type="text" class="exp-role" value="${escapeHtml(exp.role)}" placeholder="e.g. Lead Developer">
        </div>
        <div class="form-group full-width">
          <label>Dates Employed</label>
          <input type="text" class="exp-dates" value="${escapeHtml(exp.dates)}" placeholder="e.g. Jan 2022 - Present or 2021 - 2024">
        </div>
        <div class="form-group full-width">
          <label>Achievement Bullets (One per line)</label>
          <textarea class="exp-bullets" rows="4" placeholder="Write accomplishments... (each line starts a new bullet)">${exp.bullets ? exp.bullets.join('\n') : ''}</textarea>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Render Master CV Dynamic Education Forms list.
 */
export function renderEducationList() {
  const container = document.getElementById('education-list');
  if (!container) return;

  const education = State.data.masterCv.education || [];
  container.innerHTML = education.map(edu => `
    <div class="dynamic-item-card" data-edu-id="${edu.id}">
      <button type="button" class="btn-remove-item" data-remove-type="education" data-remove-id="${edu.id}" title="Remove degree">
        <i data-lucide="trash-2" style="width:18px; height:18px;"></i>
      </button>
      <div class="form-grid">
        <div class="form-group">
          <label>School / University</label>
          <input type="text" class="edu-school" value="${escapeHtml(edu.school)}" placeholder="e.g. MIT">
        </div>
        <div class="form-group">
          <label>Degree / Field of Study</label>
          <input type="text" class="edu-degree" value="${escapeHtml(edu.degree)}" placeholder="e.g. B.S. in Computer Engineering">
        </div>
        <div class="form-group full-width">
          <label>Graduation Year or Dates</label>
          <input type="text" class="edu-dates" value="${escapeHtml(edu.dates)}" placeholder="e.g. 2018 - 2022 or Graduated 2021">
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Renders the detail overlay modal content when a job application card is clicked.
 */
export function renderJobDetailsModal(appId, onDeleteApp) {
  const app = State.data.applications.find(a => a.id === appId);
  const bodyEl = document.getElementById('modal-job-body');
  const titleEl = document.getElementById('modal-job-title');
  
  if (!app || !bodyEl || !titleEl) return;

  titleEl.textContent = app.title;

  // Format bullets
  let bulletsHtml = '<p class="text-muted">No tailored experiences generated.</p>';
  if (app.tailoredCv && app.tailoredCv.bullets && app.tailoredCv.bullets.length > 0) {
    bulletsHtml = app.tailoredCv.bullets.map(group => `
      <div style="margin-bottom:12px;">
        <strong style="color:var(--accent-hover); font-size:0.85rem;">${escapeHtml(group.jobTitle)}</strong>
        <ul style="padding-left:20px; font-size:0.85rem; margin-top:4px;">
          ${group.bullets.map(b => `<li style="margin-bottom:4px;">${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  // Format Q&A
  let qaHtml = '<p class="text-muted">No interview prep plan generated.</p>';
  if (app.prepQuestions && app.prepQuestions.length > 0) {
    qaHtml = app.prepQuestions.map(item => `
      <div class="qa-item" style="margin-bottom:12px; background-color:var(--bg-surface);">
        <div class="qa-question" style="font-size:0.85rem; font-weight:600;">Q: ${escapeHtml(item.q)}</div>
        <div class="qa-answer" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">A: ${escapeHtml(item.a)}</div>
      </div>
    `).join('');
  }

  // Format cover letter
  const letterHtml = app.coverLetter 
    ? `<div class="cover-letter-preview" id="modal-letter-preview" style="max-height:220px; font-size:0.85rem; border:1px solid var(--border-color); background-color:var(--bg-surface); padding:16px;">${escapeHtml(app.coverLetter)}</div>`
    : '<p class="text-muted">No cover letter generated.</p>';

  bodyEl.innerHTML = `
    <div class="modal-job-meta">
      <div class="meta-field">
        <span class="meta-label">Company</span>
        <span class="meta-val">${escapeHtml(app.company)}</span>
      </div>
      <div class="meta-field">
        <span class="meta-label">Date Added</span>
        <span class="meta-val">${new Date(app.dateAdded).toLocaleDateString()}</span>
      </div>
      <div class="meta-field">
        <span class="meta-label">Plan Mode</span>
        <span class="meta-val">${escapeHtml(app.planType)}</span>
      </div>
      <div class="meta-field">
        <span class="meta-label">Job Link</span>
        <span class="meta-val">
          ${app.url ? `<a href="${escapeHtml(app.url)}" target="_blank" style="display:inline-flex; align-items:center; gap:4px;">View Posting <i data-lucide="external-link" style="width:12px; height:12px;"></i></a>` : 'N/A'}
        </span>
      </div>
    </div>

    ${(() => {
      if (!app.tailoredCv || typeof app.tailoredCv.matchScore !== 'number') return '';
      const score = app.tailoredCv.matchScore;
      const gap = app.tailoredCv.gapAnalysis || { matchedSkills: [], missingSkills: [], recommendations: '' };

      const matchedHtml = gap.matchedSkills && gap.matchedSkills.length > 0
        ? gap.matchedSkills.map(s => `<span class="tag-pill tag-match"><i data-lucide="check" style="width:10px; height:10px;"></i> ${escapeHtml(s)}</span>`).join('')
        : '<span style="font-size:0.75rem; color:var(--text-muted);">None</span>';

      const missingHtml = gap.missingSkills && gap.missingSkills.length > 0
        ? gap.missingSkills.map(s => `<span class="tag-pill tag-missing"><i data-lucide="flag" style="width:10px; height:10px;"></i> ${escapeHtml(s)}</span>`).join('')
        : '<span style="font-size:0.75rem; color:var(--text-muted);">None</span>';

      return `
        <div style="background-color: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="background: var(--accent-glow); color: var(--accent-hover); font-size: 1.4rem; font-weight: 800; font-family: 'Outfit', sans-serif; width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--accent); flex-shrink: 0;">
              ${score}%
            </div>
            <div>
              <strong style="font-size: 0.9rem; color: var(--text-main); display: block;">MSDK3 Profile Alignment Rating</strong>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; line-height: 1.3;">${escapeHtml(gap.recommendations)}</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 12px;">
            <div>
              <span style="font-size: 0.65rem; color: var(--success); font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 6px;">Matched Keywords</span>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">${matchedHtml}</div>
            </div>
            <div>
              <span style="font-size: 0.65rem; color: var(--warning); font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 6px;">Missing / Gaps</span>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">${missingHtml}</div>
            </div>
          </div>
        </div>
      `;
    })()}

    <div>
      <h4 class="modal-section-title">Tailored CV Experience Bullets</h4>
      ${bulletsHtml}
    </div>

    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <h4 class="modal-section-title" style="margin:0; border:none; padding:0;">Cover Letter</h4>
        ${app.coverLetter ? `<button class="btn btn-secondary btn-small" id="modal-btn-copy-letter"><i data-lucide="copy" style="width:12px; height:12px;"></i> Copy</button>` : ''}
      </div>
      ${letterHtml}
    </div>

    <div>
      <h4 class="modal-section-title">Interview Prep Q&A</h4>
      ${qaHtml}
    </div>

    <div class="modal-action-row">
      <button class="btn btn-secondary" id="modal-btn-close">Close Details</button>
      <button class="btn btn-danger" id="modal-btn-delete"><i data-lucide="trash-2"></i> Delete Application</button>
    </div>
  `;

  // Bind inner copy, close, delete listeners
  const closeBtn = document.getElementById('modal-btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  const deleteBtn = document.getElementById('modal-btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this job application record?')) {
        onDeleteApp(appId);
        closeModal();
      }
    });
  }

  const copyLetterBtn = document.getElementById('modal-btn-copy-letter');
  if (copyLetterBtn) {
    copyLetterBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(app.coverLetter);
      const originalText = copyLetterBtn.innerHTML;
      copyLetterBtn.innerHTML = '<i data-lucide="check" style="width:12px; height:12px;"></i> Copied!';
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        copyLetterBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }, 2000);
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Open modal visual backdrop
  document.getElementById('job-modal').classList.remove('hidden');
}

export function closeModal() {
  const modal = document.getElementById('job-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Simple HTML escaping helper to prevent XSS injection in DOM templates
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
