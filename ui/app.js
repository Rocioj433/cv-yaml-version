// ── State ──
let cvData = null;
let editing = false;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  updateThemeIcon();
  await loadCV();
  startAutoPreview();
});

// ── API ──
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

// ── Load CV ──
async function loadCV() {
  try {
    const res = await api('/api/cv');
    if (!res.success) throw new Error(res.error);
    cvData = res.data;
    populateForm(cvData);
  } catch (err) {
    toast('Error al cargar CV: ' + err.message, 'error');
  }
}

// ── Populate Form ──
function populateForm(data) {
  // Basic fields
  setVal('field-name', data.name);
  setVal('field-headline', data.headline);
  setVal('field-location', data.location);
  setVal('field-email', data.email);

  // Social networks
  const linkedin = (data.social_networks || []).find(s => s.network === 'LinkedIn');
  const github = (data.social_networks || []).find(s => s.network === 'GitHub');
  setVal('field-linkedin', linkedin ? linkedin.username : '');
  setVal('field-github', github ? github.username : '');

  // Summary
  setVal('field-summary', (data.sections.summary || []).join('\n'));

  // Dynamic lists
  populateList('education-list', data.sections.education || [], 'education');
  populateList('experience-list', data.sections.experience || [], 'experience');
  populateList('projects-list', data.sections.projects || [], 'projects');
  populateList('skills-list', data.sections.skills || [], 'skills');
  populateList('languages-list', data.sections.language || [], 'languages');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

// ── Collect Form Data ──
function collectForm() {
  const linkedinVal = getVal('field-linkedin');
  const githubVal = getVal('field-github');
  const social_networks = [];
  if (linkedinVal) social_networks.push({ network: 'LinkedIn', username: linkedinVal });
  if (githubVal) social_networks.push({ network: 'GitHub', username: githubVal });

  return {
    name: getVal('field-name'),
    headline: getVal('field-headline'),
    location: getVal('field-location'),
    email: getVal('field-email'),
    photo: '',
    social_networks,
    sections: {
      summary: collectSummary(),
      education: collectList('education-list', 'education'),
      experience: collectList('experience-list', 'experience'),
      projects: collectList('projects-list', 'projects'),
      skills: collectList('skills-list', 'skills'),
      language: collectList('languages-list', 'languages'),
    },
  };
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function collectSummary() {
  const text = getVal('field-summary');
  return text ? [text] : [];
}

// ── Dynamic List Renderers ──

function entryTemplate(type, data, idx) {
  switch (type) {
    case 'education': return educationEntry(data, idx);
    case 'experience': return experienceEntry(data, idx);
    case 'projects': return projectEntry(data, idx);
    case 'skills': return skillEntry(data, idx);
    case 'languages': return languageEntry(data, idx);
    default: return '';
  }
}

function educationEntry(data, idx) {
  const h = data.highlights || [];
  const highlightsHtml = h.map((hl, hi) => highlightItem(idx, hi, hl)).join('');
  return `
    <div class="entry-card" data-idx="${idx}">
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input class="form-input" value="${esc(data.institution || '')}" placeholder="Institución" onchange="updateEntry(${idx},'education','institution',this.value)">
        <input class="form-input" value="${esc(data.area || '')}" placeholder="Título / Área" onchange="updateEntry(${idx},'education','area',this.value)">
      </div>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input class="form-input" value="${esc(data.start_date || '')}" placeholder="Inicio (2024-02)" onchange="updateEntry(${idx},'education','start_date',this.value)">
        <input class="form-input" value="${esc(data.end_date || '')}" placeholder="Fin (2026-03 o 'present')" onchange="updateEntry(${idx},'education','end_date',this.value)">
      </div>
      <input class="form-input mb-2" value="${esc(data.location || '')}" placeholder="Ubicación" onchange="updateEntry(${idx},'education','location',this.value)">
      <div class="highlights-container">
        ${highlightsHtml}
      </div>
      <button type="button" class="btn btn-secondary text-xs mt-1" onclick="addHighlight(${idx},'education')">+ Highlight</button>
      <button type="button" class="btn btn-danger text-xs mt-1 ml-1" onclick="removeEntry(${idx},'education')">Eliminar</button>
    </div>`;
}

function experienceEntry(data, idx) {
  const h = data.highlights || [];
  const highlightsHtml = h.map((hl, hi) => highlightItem(idx, hi, hl)).join('');
  return `
    <div class="entry-card" data-idx="${idx}">
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input class="form-input" value="${esc(data.company || '')}" placeholder="Empresa" onchange="updateEntry(${idx},'experience','company',this.value)">
        <input class="form-input" value="${esc(data.position || '')}" placeholder="Cargo" onchange="updateEntry(${idx},'experience','position',this.value)">
      </div>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input class="form-input" value="${esc(data.start_date || '')}" placeholder="Inicio (2022-03)" onchange="updateEntry(${idx},'experience','start_date',this.value)">
        <input class="form-input" value="${esc(data.end_date || '')}" placeholder="Fin (2024-03 o 'present')" onchange="updateEntry(${idx},'experience','end_date',this.value)">
      </div>
      <input class="form-input mb-2" value="${esc(data.location || '')}" placeholder="Ubicación" onchange="updateEntry(${idx},'experience','location',this.value)">
      <div class="highlights-container">
        ${highlightsHtml}
      </div>
      <button type="button" class="btn btn-secondary text-xs mt-1" onclick="addHighlight(${idx},'experience')">+ Highlight</button>
      <button type="button" class="btn btn-danger text-xs mt-1 ml-1" onclick="removeEntry(${idx},'experience')">Eliminar</button>
    </div>`;
}

function projectEntry(data, idx) {
  const h = data.highlights || [];
  const highlightsHtml = h.map((hl, hi) => highlightItem(idx, hi, hl)).join('');
  return `
    <div class="entry-card" data-idx="${idx}">
      <input class="form-input mb-2" value="${esc(data.name || '')}" placeholder="Nombre del proyecto" onchange="updateEntry(${idx},'projects','name',this.value)">
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input class="form-input" value="${esc(data.start_date || '')}" placeholder="Inicio" onchange="updateEntry(${idx},'projects','start_date',this.value)">
        <input class="form-input" value="${esc(data.end_date || '')}" placeholder="Fin" onchange="updateEntry(${idx},'projects','end_date',this.value)">
      </div>
      <input class="form-input mb-2" value="${esc(data.summary || '')}" placeholder="Descripción breve" onchange="updateEntry(${idx},'projects','summary',this.value)">
      <div class="highlights-container">
        ${highlightsHtml}
      </div>
      <button type="button" class="btn btn-secondary text-xs mt-1" onclick="addHighlight(${idx},'projects')">+ Highlight</button>
      <button type="button" class="btn btn-danger text-xs mt-1 ml-1" onclick="removeEntry(${idx},'projects')">Eliminar</button>
    </div>`;
}

function skillEntry(data, idx) {
  return `
    <div class="entry-card flex items-center gap-2" data-idx="${idx}">
      <input class="form-input flex-1" value="${esc(data.label || '')}" placeholder="Ej: Frontend" onchange="updateEntry(${idx},'skills','label',this.value)">
      <input class="form-input flex-[2]" value="${esc(data.details || '')}" placeholder="Ej: React, TypeScript, CSS" onchange="updateEntry(${idx},'skills','details',this.value)">
      <button type="button" class="btn btn-danger text-xs flex-shrink-0" onclick="removeEntry(${idx},'skills')">×</button>
    </div>`;
}

function languageEntry(data, idx) {
  return `
    <div class="entry-card flex items-center gap-2" data-idx="${idx}">
      <input class="form-input flex-1" value="${esc(data.label || '')}" placeholder="Ej: Inglés" onchange="updateEntry(${idx},'languages','label',this.value)">
      <input class="form-input flex-1" value="${esc(data.details || '')}" placeholder="Ej: Nativo / Intermedio" onchange="updateEntry(${idx},'languages','details',this.value)">
      <button type="button" class="btn btn-danger text-xs flex-shrink-0" onclick="removeEntry(${idx},'languages')">×</button>
    </div>`;
}

function highlightItem(entryIdx, hlIdx, value) {
  return `
    <div class="highlight-item">
      <span class="text-gray-400 mt-0.5">–</span>
      <input class="form-input text-xs flex-1" value="${esc(value || '')}" placeholder="Logro o detalle..." onchange="updateHighlight(${entryIdx},'${currentListType(entryIdx)}',${hlIdx},this.value)">
      <button type="button" class="btn-icon text-xs flex-shrink-0" onclick="removeHighlight(${entryIdx},'${currentListType(entryIdx)}',${hlIdx})">×</button>
    </div>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── State Management for Lists ──
// We store data in a global array to avoid DOM dependency
let listState = {
  education: [],
  experience: [],
  projects: [],
  skills: [],
  languages: [],
};

function populateList(containerId, data, type) {
  listState[type] = JSON.parse(JSON.stringify(data));
  renderList(containerId, type);
}

function renderList(containerId, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = listState[type].map((item, idx) => entryTemplate(type, item, idx)).join('');
}

function addEntry(type) {
  const empty = emptyFor(type);
  listState[type].push(empty);
  const containerId = type + '-list';
  renderList(containerId, type);
  markEdited();
}

function removeEntry(idx, type) {
  listState[type].splice(idx, 1);
  renderList(type + '-list', type);
  markEdited();
}

function updateEntry(idx, type, field, value) {
  if (listState[type] && listState[type][idx]) {
    listState[type][idx][field] = value;
    markEdited();
  }
}

function updateHighlight(entryIdx, type, hlIdx, value) {
  const entry = listState[type] && listState[type][entryIdx];
  if (entry && entry.highlights) {
    entry.highlights[hlIdx] = value;
    markEdited();
  }
}

function addHighlight(entryIdx, type) {
  const entry = listState[type] && listState[type][entryIdx];
  if (entry) {
    if (!entry.highlights) entry.highlights = [];
    entry.highlights.push('');
    renderList(type + '-list', type);
    markEdited();
  }
}

function removeHighlight(entryIdx, type, hlIdx) {
  const entry = listState[type] && listState[type][entryIdx];
  if (entry && entry.highlights) {
    entry.highlights.splice(hlIdx, 1);
    renderList(type + '-list', type);
    markEdited();
  }
}

function currentListType(entryIdx) {
  // Find which list contains this index
  for (const type of ['education', 'experience', 'projects', 'skills', 'languages']) {
    if (entryIdx < listState[type].length) return type;
  }
  return 'education';
}

function emptyFor(type) {
  switch (type) {
    case 'education': return { institution: '', area: '', start_date: '', end_date: '', location: '', highlights: [] };
    case 'experience': return { company: '', position: '', start_date: '', end_date: '', location: '', highlights: [] };
    case 'projects': return { name: '', start_date: '', end_date: '', summary: '', highlights: [] };
    case 'skills': return { label: '', details: '' };
    case 'languages': return { label: '', details: '' };
    default: return {};
  }
}

function collectList(containerId, type) {
  return listState[type] || [];
}

// ── Auto-preview ──
let previewTimeout = null;
let lastPreviewData = '';

function markEdited() {
  editing = true;
  if (previewTimeout) clearTimeout(previewTimeout);
  previewTimeout = setTimeout(refreshPreview, 800);
}

function startAutoPreview() {
  // Initial preview after load
  setTimeout(refreshPreview, 500);
}

async function refreshPreview() {
  const data = collectForm();
  const key = JSON.stringify(data);
  if (key === lastPreviewData) return;
  lastPreviewData = key;

  try {
    const res = await api('/api/render', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success) {
      const frame = document.getElementById('preview-frame');
      const scaledHtml = res.html
        .replace('<body>', '<body><div id="cv-scaler" style="transform-origin:top center;display:inline-block;">')
        .replace('</body>', '</div></body>')
        .replace('</head>', `
  <style>
    body{margin:0;overflow:hidden;background:#e2e8f0;display:flex;align-items:flex-start;justify-content:center;}
    #cv-scaler{transform-origin:top center;}
  </style>
  <script>
    function fitCV(){
      var p=document.querySelector(".cv-page"),s=document.getElementById("cv-scaler");
      if(!p||!s)return;
      p.style.margin="0";
      var r=p.getBoundingClientRect();
      var pw=r.width,ph=r.height;
      if(!pw)return;
      var maxW=window.innerWidth-4;
      var scale=Math.min(1,maxW/pw);
      s.style.transform="scale("+scale+")";
      document.body.style.height=(ph*scale)+"px";
    }
    window.addEventListener("load",fitCV);
    window.addEventListener("resize",fitCV);
  <\/script>
</head>`);
      frame.srcdoc = scaledHtml;
    }
  } catch (err) {
    // silent fail on preview
  }
}

// ── Save ──
async function saveCV() {
  const data = collectForm();
  try {
    const res = await api('/api/cv', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.success) {
      editing = false;
      toast('CV guardado correctamente', 'success');
    } else {
      toast('Error al guardar: ' + res.error, 'error');
    }
  } catch (err) {
    toast('Error de conexión', 'error');
  }
}

// ── Generate PDF ──
async function generatePDF() {
  const overlay = document.getElementById('loading');
  overlay.classList.add('active');

  const data = collectForm();
  try {
    const res = await api('/api/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success) {
      toast('PDF generado correctamente', 'success');
      // Open in new tab
      window.open(res.pdfUrl, '_blank');
    } else {
      toast('Error al generar PDF: ' + res.error, 'error');
    }
  } catch (err) {
    toast('Error de conexión', 'error');
  } finally {
    overlay.classList.remove('active');
  }
}

// ── Dark/Light Theme ──
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('sun-icon').classList.toggle('hidden', !isDark);
  document.getElementById('moon-icon').classList.toggle('hidden', isDark);
}

// ── Section Toggle ──
function toggleSection(header) {
  const content = header.nextElementSibling;
  header.classList.toggle('collapsed');
  if (content.style.display === 'none') {
    content.style.display = '';
  } else {
    content.style.display = 'none';
  }
}

// ── Toast ──
function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'toast show toast-' + type;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}

// ── Agent Functions ──

let lastReport = null;

async function runAnalyze() {
  const overlay = document.getElementById('loading');
  overlay.classList.add('active');
  try {
    const res = await api('/api/agent/analyze', { method: 'POST' });
    if (res.success) {
      lastReport = res.report;
      displayReport(res.report, 'analyze');
      toast('Análisis completado', 'success');
    } else {
      toast('Error: ' + res.error, 'error');
    }
  } catch (err) {
    toast('Error de conexión', 'error');
  } finally {
    overlay.classList.remove('active');
  }
}

async function runSanitize() {
  if (!confirm('¿Sanitizar datos personales? Se reemplazarán por placeholders genéricos.')) return;
  const overlay = document.getElementById('loading');
  overlay.classList.add('active');
  try {
    const res = await api('/api/agent/sanitize', { method: 'POST' });
    if (res.success) {
      lastReport = res.report;
      displayReport(res.report, 'sanitize');
      toast('Datos sanitizados', 'success');
      await loadCV();
    } else {
      toast('Error: ' + res.error, 'error');
    }
  } catch (err) {
    toast('Error de conexión', 'error');
  } finally {
    overlay.classList.remove('active');
  }
}

function showReport() {
  if (!lastReport) {
    toast('Primero ejecutá un análisis o sanitización', 'info');
    return;
  }
  displayReport(lastReport, 'view');
}

function displayReport(report, mode) {
  const modal = document.getElementById('report-modal');
  const content = document.getElementById('report-content');

  const modeLabels = { analyze: '🔍 Análisis', sanitize: '🧹 Sanitización', view: '📋 Reporte' };
  const date = new Date(report.timestamp);

  let html = `<div class="flex items-center justify-between mb-2 pb-2 border-b border-border dark:border-[#3a3a4f]">
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reporte</span>
      <span class="text-xs px-1.5 py-0.5 rounded bg-panel dark:bg-[#3a3a4f]">${modeLabels[mode] || 'Reporte'}</span>
    </div>
    <button class="btn-icon text-xs flex-shrink-0" onclick="hideReport()">✕</button>
  </div>
  <div class="text-xs text-gray-400 mb-2">${date.toLocaleString()}</div>`;

  // Guardrail issues
  if (report.guardrail.issues.length > 0) {
    html += `<div class="mb-2"><span class="text-xs font-semibold text-gray-500 uppercase">Datos sensibles</span></div>`;
    report.guardrail.issues.forEach(i => {
      const icon = i.severity === 'error' ? '🔴' : '🟡';
      html += `<div class="flex items-start gap-1.5 text-xs ${i.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}"><span>${icon}</span><span>${esc(i.message)}</span></div>`;
    });
  } else {
    html += `<div class="text-xs text-green-600 dark:text-green-400 mb-2">✅ Sin issues de datos sensibles</div>`;
  }

  // Sanitize changes
  if (report.sanitize.changes && report.sanitize.changes.length > 0) {
    html += `<div class="mt-3 mb-1"><span class="text-xs font-semibold text-gray-500 uppercase">Cambios realizados (${report.sanitize.totalChanges})</span></div>`;
    report.sanitize.changes.forEach(c => {
      html += `<div class="text-xs flex items-start gap-1.5 text-blue-600 dark:text-blue-400"><span>✏️</span><span><strong>${esc(c.field)}</strong>: ${esc(c.from)} → ${esc(c.to)}</span></div>`;
    });
  }

  // ATS
  if (report.ats.score !== null) {
    const colors = { excellent: 'text-green-600', good: 'text-blue-600', fair: 'text-yellow-600', poor: 'text-red-600' };
    html += `<div class="mt-3 mb-1"><span class="text-xs font-semibold text-gray-500 uppercase">ATS Score</span></div>`;
    const colorClass = colors[report.ats.label] || 'text-gray-600';
    html += `<div class="text-sm font-bold ${colorClass}">${report.ats.score}/100 (${report.ats.label})</div>`;
    if (report.ats.warnings.length > 0) {
      report.ats.warnings.forEach(w => {
        html += `<div class="text-xs text-yellow-600 dark:text-yellow-400 flex items-start gap-1.5"><span>⚠️</span><span>${esc(w.message)}</span></div>`;
      });
    }
  }

  // Metadata
  if (report.metadata) {
    html += `<div class="mt-3 mb-1"><span class="text-xs font-semibold text-gray-500 uppercase">Métricas</span></div>`;
    html += `<div class="grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-400">`;
    html += `<div>🧑‍💼 Experiencias: ${report.metadata.totalExperiences}</div>`;
    html += `<div>🎓 Educación: ${report.metadata.totalEducation}</div>`;
    html += `<div>📁 Proyectos: ${report.metadata.totalProjects}</div>`;
    html += `<div>🔧 Skills: ${report.metadata.totalSkills}</div>`;
    html += `<div>📅 Rango: ${report.metadata.dateRange.earliest || '—'} → ${report.metadata.dateRange.latest || '—'}</div>`;
    html += `<div>⏳ Duración: ${report.metadata.careerDurationYears || '—'} años</div>`;
    html += `</div>`;
  }

  content.innerHTML = html;
  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function hideReport() {
  document.getElementById('report-modal').classList.add('opacity-0', 'pointer-events-none');
}

document.getElementById('report-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideReport();
});

// ── Re-scale preview on window resize ──
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    lastPreviewData = '';
    refreshPreview();
  }, 400);
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCV();
  }
  if (e.key === 'Escape') {
    hideReport();
  }
});
