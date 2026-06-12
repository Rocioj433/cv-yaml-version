const fs = require('fs');
const path = require('path');
const express = require('express');
const yaml = require('js-yaml');
const { chromium } = require('playwright');
const { parseCV } = require('./scripts/parsers');

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const TEMPLATE_HTML = path.join(ROOT, 'templates', 'cv.html');
const TEMPLATE_CSS = path.join(ROOT, 'templates', 'cv.css');
const DATA_FILE = path.join(ROOT, 'data', 'cv.yaml');
const OUTPUT_DIR = path.join(ROOT, 'output');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(ROOT, 'ui')));

// ── Helpers (reused from generate.js) ──

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'present') return 'Presente';
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const parts = String(dateStr).split('-');
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${months[monthIdx] || parts[1]} ${parts[0]}`;
  }
  return String(dateStr);
}

function dateRange(start, end) {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

function processBold(text) {
  if (!text) return '';
  return String(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function renderHighlights(highlights) {
  if (!highlights || highlights.length === 0) return '';
  const items = highlights.map(h => `        <li>${processBold(h)}</li>`).join('\n');
  return `      <ul class="cv-highlights">\n${items}\n      </ul>`;
}

function buildContactInfo(cv) {
  const parts = [];
  if (cv.location) parts.push(`<span>${cv.location}</span>`);
  if (cv.email) parts.push(`<a href="mailto:${cv.email}">${cv.email}</a>`);
  if (cv.social_networks) {
    cv.social_networks.forEach(sn => {
      const isFullUrl = /^https?:\/\//i.test(sn.username);
      if (sn.network === 'LinkedIn') {
        const href = isFullUrl ? sn.username : `https://linkedin.com/in/${encodeURIComponent(sn.username)}`;
        parts.push(`<a href="${href}" target="_blank">LinkedIn</a>`);
      } else if (sn.network === 'GitHub') {
        const href = isFullUrl ? sn.username : `https://github.com/${sn.username}`;
        parts.push(`<a href="${href}" target="_blank">GitHub</a>`);
      } else {
        parts.push(`<span>${sn.network}: ${sn.username}</span>`);
      }
    });
  }
  return parts.join('<span class="separator">|</span>');
}

function buildSummarySection(sections) {
  if (!sections.summary || sections.summary.length === 0) return '';
  const text = sections.summary.join(' ');
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Perfil Profesional</h2>
      <div class="cv-summary">
        <p>${processBold(text)}</p>
      </div>
    </section>`;
}

function buildEducationSection(sections) {
  if (!sections.education || sections.education.length === 0) return '';
  const entries = sections.education.map(edu => `
      <div class="cv-entry">
        <div class="cv-entry-header">
          <span class="cv-entry-title">${edu.institution || ''}</span>
          <span class="cv-entry-date">${dateRange(edu.start_date, edu.end_date)}</span>
        </div>
        <div class="cv-entry-meta">
          <span class="cv-entry-subtitle">${edu.area || ''}</span>
          ${edu.location ? `<span class="cv-entry-location">${edu.location}</span>` : ''}
        </div>
        ${renderHighlights(edu.highlights)}
      </div>`).join('\n');
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Educación</h2>
      ${entries}
    </section>`;
}

function buildExperienceSection(sections) {
  if (!sections.experience || sections.experience.length === 0) return '';
  const entries = sections.experience.map(exp => `
      <div class="cv-entry">
        <div class="cv-entry-header">
          <span class="cv-entry-title">${exp.company || ''}</span>
          <span class="cv-entry-date">${dateRange(exp.start_date, exp.end_date)}</span>
        </div>
        <div class="cv-entry-meta">
          <span class="cv-entry-subtitle">${exp.position || ''}</span>
          ${exp.location ? `<span class="cv-entry-location">${exp.location}</span>` : ''}
        </div>
        ${renderHighlights(exp.highlights)}
      </div>`).join('\n');
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Experiencia Profesional</h2>
      ${entries}
    </section>`;
}

function buildProjectsSection(sections) {
  if (!sections.projects || sections.projects.length === 0) return '';
  const entries = sections.projects.map(proj => {
    const summaryLine = proj.summary
      ? `<p style="font-size:9pt;color:#3a3a3a;margin-bottom:3px;font-style:italic;">${processBold(proj.summary)}</p>`
      : '';
    return `
      <div class="cv-entry">
        <div class="cv-entry-header">
          <span class="cv-entry-title">${proj.name || ''}</span>
          <span class="cv-entry-date">${dateRange(proj.start_date, proj.end_date)}</span>
        </div>
        ${summaryLine}
        ${renderHighlights(proj.highlights)}
      </div>`;
  }).join('\n');
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Proyectos</h2>
      ${entries}
    </section>`;
}

function buildSkillsSection(sections) {
  if (!sections.skills || sections.skills.length === 0) return '';
  const rows = sections.skills.map(skill => `
        <div class="cv-skill-row">
          <span class="cv-skill-label">${skill.label}:</span>
          <span class="cv-skill-details">${processBold(skill.details)}</span>
        </div>`).join('\n');
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Habilidades Técnicas</h2>
      <div class="cv-skills-grid">
        ${rows}
      </div>
    </section>`;
}

function buildLanguagesSection(sections) {
  if (!sections.language || sections.language.length === 0) return '';
  const items = sections.language.map(lang =>
    `<span class="cv-language-item"><span class="cv-language-label">${lang.label}:</span> <span class="cv-language-level">${lang.details}</span></span>`
  ).join('\n        ');
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Idiomas</h2>
      <div class="cv-languages-grid">
        ${items}
      </div>
    </section>`;
}

// ── Render CV to HTML ──

function renderCV(data) {
  const cv = data.cv || data;
  const sections = cv.sections || {};

  let html = fs.readFileSync(TEMPLATE_HTML, 'utf8');
  const cssContent = fs.readFileSync(TEMPLATE_CSS, 'utf8');

  html = html.replace(
    '<link rel="stylesheet" href="cv.css">',
    `<style>\n${cssContent}\n</style>`
  );

  html = html.replace('{{NAME}} — Curriculum Vitae', `${cv.name || ''} — Curriculum Vitae`);
  html = html.replace('{{NAME}}', cv.name || '');
  html = html.replace('{{HEADLINE}}', cv.headline || '');
  html = html.replace('{{CONTACT_INFO}}', buildContactInfo(cv));
  html = html.replace('{{SUMMARY_SECTION}}', buildSummarySection(sections));
  html = html.replace('{{EDUCATION_SECTION}}', buildEducationSection(sections));
  html = html.replace('{{EXPERIENCE_SECTION}}', buildExperienceSection(sections));
  html = html.replace('{{PROJECTS_SECTION}}', buildProjectsSection(sections));
  html = html.replace('{{SKILLS_SECTION}}', buildSkillsSection(sections));
  html = html.replace('{{LANGUAGES_SECTION}}', buildLanguagesSection(sections));

  return html;
}

// ── API Routes ──

app.get('/api/cv', (req, res) => {
  try {
    const data = parseCV(DATA_FILE);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/cv', (req, res) => {
  try {
    const yamlStr = yaml.dump({ cv: req.body }, { lineWidth: 120, indent: 2 });
    fs.writeFileSync(DATA_FILE, yamlStr, 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/render', (req, res) => {
  try {
    const html = renderCV(req.body);
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const html = renderCV(req.body);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const htmlPath = path.join(OUTPUT_DIR, 'cv.html');
    fs.writeFileSync(htmlPath, html, 'utf8');

    const pdfPath = path.join(OUTPUT_DIR, 'CV_JohnDoe.pdf');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();

    res.json({ success: true, pdfUrl: '/output/CV_JohnDoe.pdf' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/output', express.static(path.join(ROOT, 'output')));

app.listen(PORT, () => {
  console.log(`🚀 CV Editor corriendo en http://localhost:${PORT}`);
});
