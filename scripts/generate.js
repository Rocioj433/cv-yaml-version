/**
 * CV-YAML Generator
 * ==================
 * Lee data/cv.yaml, renderiza en HTML con estilo Harvard,
 * y exporta a PDF usando Playwright (Chromium).
 *
 * Uso: node scripts/generate.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { chromium } = require('playwright');

// ── Paths ──────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const YAML_PATH = path.join(ROOT, 'data', 'cv.yaml');
const TEMPLATE_HTML = path.join(ROOT, 'templates', 'cv.html');
const TEMPLATE_CSS = path.join(ROOT, 'templates', 'cv.css');
const OUTPUT_DIR = path.join(ROOT, 'output');
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'cv.html');
const OUTPUT_PDF = path.join(OUTPUT_DIR, 'cv.pdf');

// ── Helpers ────────────────────────────────────────────

/**
 * Formatea una fecha YAML (YYYY-MM o "present") a texto legible.
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'present') return 'Presente';
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const parts = String(dateStr).split('-');
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${months[monthIdx] || parts[1]} ${parts[0]}`;
  }
  return String(dateStr);
}

/**
 * Genera el rango de fechas formateado.
 */
function dateRange(start, end) {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

/**
 * Procesa texto con **bold** a <strong> tags.
 */
function processBold(text) {
  if (!text) return '';
  return String(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Genera HTML para una lista de highlights.
 */
function renderHighlights(highlights) {
  if (!highlights || highlights.length === 0) return '';
  const items = highlights.map(h => `        <li>${processBold(h)}</li>`).join('\n');
  return `      <ul class="cv-highlights">\n${items}\n      </ul>`;
}

// ── Section Builders ───────────────────────────────────

function buildContactInfo(cv) {
  const parts = [];

  if (cv.location) {
    parts.push(`<span>${cv.location}</span>`);
  }
  if (cv.email) {
    parts.push(`<a href="mailto:${cv.email}">${cv.email}</a>`);
  }
  if (cv.social_networks) {
    cv.social_networks.forEach(sn => {
      if (sn.network === 'LinkedIn') {
        parts.push(`<a href="https://linkedin.com/in/${encodeURIComponent(sn.username)}" target="_blank">LinkedIn</a>`);
      } else if (sn.network === 'GitHub') {
        parts.push(`<a href="https://github.com/${sn.username}" target="_blank">GitHub: ${sn.username}</a>`);
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

  const entries = sections.education.map(edu => {
    return `
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
      </div>`;
  }).join('\n');

  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Educación</h2>
      ${entries}
    </section>`;
}

function buildExperienceSection(sections) {
  if (!sections.experience || sections.experience.length === 0) return '';

  const entries = sections.experience.map(exp => {
    return `
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
      </div>`;
  }).join('\n');

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
      ? `<p style="font-size:10pt;color:#3a3a3a;margin-bottom:4px;font-style:italic;">${processBold(proj.summary)}</p>`
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

  const rows = sections.skills.map(skill => {
    return `
        <div class="cv-skill-row">
          <span class="cv-skill-label">${skill.label}:</span>
          <span class="cv-skill-details">${processBold(skill.details)}</span>
        </div>`;
  }).join('\n');

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

  const items = sections.language.map(lang => {
    return `<span class="cv-language-item"><span class="cv-language-label">${lang.label}:</span> <span class="cv-language-level">${lang.details}</span></span>`;
  }).join('\n        ');

  return `
    <section class="cv-section">
      <h2 class="cv-section-title">Idiomas</h2>
      <div class="cv-languages-grid">
        ${items}
      </div>
    </section>`;
}

// ── Main Generator ─────────────────────────────────────

async function generate() {
  console.log('📄 Leyendo cv.yaml...');
  const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
  const data = yaml.load(yamlContent);
  const cv = data.cv;
  const sections = cv.sections;

  console.log('🎨 Construyendo HTML...');

  // Read template
  let html = fs.readFileSync(TEMPLATE_HTML, 'utf8');
  const cssContent = fs.readFileSync(TEMPLATE_CSS, 'utf8');

  // Replace external CSS link with inline styles for PDF fidelity
  html = html.replace(
    '<link rel="stylesheet" href="cv.css">',
    `<style>\n${cssContent}\n</style>`
  );

  // Replace title
  html = html.replace('{{NAME}} — Curriculum Vitae', `${cv.name} — Curriculum Vitae`);

  // Inject sections
  html = html.replace('{{NAME}}', cv.name || '');
  html = html.replace('{{CONTACT_INFO}}', buildContactInfo(cv));
  html = html.replace('{{SUMMARY_SECTION}}', buildSummarySection(sections));
  html = html.replace('{{EDUCATION_SECTION}}', buildEducationSection(sections));
  html = html.replace('{{EXPERIENCE_SECTION}}', buildExperienceSection(sections));
  html = html.replace('{{PROJECTS_SECTION}}', buildProjectsSection(sections));
  html = html.replace('{{SKILLS_SECTION}}', buildSkillsSection(sections));
  html = html.replace('{{LANGUAGES_SECTION}}', buildLanguagesSection(sections));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write the rendered HTML
  fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
  console.log(`✅ HTML generado: ${OUTPUT_HTML}`);

  // ── PDF Generation with Playwright ──
  console.log('🖨️  Generando PDF con Playwright...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load the HTML file
  await page.goto(`file://${OUTPUT_HTML}`, { waitUntil: 'networkidle' });

  // Wait for fonts to load
  await page.waitForTimeout(1500);

  // Generate PDF
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  console.log(`✅ PDF generado: ${OUTPUT_PDF}`);
  console.log('\n🎉 ¡CV generado exitosamente!');
}

// ── Run ────────────────────────────────────────────────
generate().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
