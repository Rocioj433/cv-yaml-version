/**
 * CV-YAML Generator (Multi-formato)
 * ====================================
 * Lee un archivo CV en YAML, JSON o Markdown,
 * lo renderiza en HTML con estilo Harvard,
 * y exporta a PDF usando Playwright (Chromium).
 *
 * Uso:
 *   node scripts/generate.js                    → usa data/cv.yaml (default)
 *   node scripts/generate.js data/cv.json       → usa JSON
 *   node scripts/generate.js data/cv.md         → usa Markdown
 *   node scripts/generate.js mi-cv.yaml         → cualquier ruta
 *
 * Scripts npm:
 *   npm run generate          → YAML
 *   npm run generate:json     → JSON
 *   npm run generate:md       → Markdown
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { parseCV } = require('./parsers');

// ── Paths ──────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_HTML = path.join(ROOT, 'templates', 'cv.html');
const TEMPLATE_CSS = path.join(ROOT, 'templates', 'cv.css');
const OUTPUT_DIR = path.join(ROOT, 'output');
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'cv.html');
const OUTPUT_PDF = path.join(OUTPUT_DIR, 'CV_JohnDoe.pdf');

// Resolve input file from CLI arg or default to cv.yaml
const inputArg = process.argv[2] || 'data/cv.yaml';
const INPUT_FILE = path.isAbsolute(inputArg)
  ? inputArg
  : path.join(ROOT, inputArg);

// ── Helpers ────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'present') return 'Presente';
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
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

// ── Section Builders ───────────────────────────────────

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

// ── Main Generator ─────────────────────────────────────

async function generate() {
  const ext = path.extname(INPUT_FILE).toLowerCase();
  console.log(`\n🔧 CV Generator — Multi-formato`);
  console.log(`   Archivo: ${INPUT_FILE}`);
  console.log(`   Formato: ${ext}\n`);

  // Parse input file
  const cv = parseCV(INPUT_FILE);
  const sections = cv.sections;

  console.log(`👤 Nombre: ${cv.name}`);
  console.log('🎨 Construyendo HTML...');

  // Read template
  let html = fs.readFileSync(TEMPLATE_HTML, 'utf8');
  const cssContent = fs.readFileSync(TEMPLATE_CSS, 'utf8');

  // Inline CSS for PDF fidelity
  html = html.replace(
    '<link rel="stylesheet" href="cv.css">',
    `<style>\n${cssContent}\n</style>`
  );

  // Replace placeholders
  html = html.replace('{{NAME}} — Curriculum Vitae', `${cv.name} — Curriculum Vitae`);
  html = html.replace('{{NAME}}', cv.name || '');
  html = html.replace('{{HEADLINE}}', cv.headline || '');
  html = html.replace('{{CONTACT_INFO}}', buildContactInfo(cv));
  html = html.replace('{{SUMMARY_SECTION}}', buildSummarySection(sections));
  html = html.replace('{{EDUCATION_SECTION}}', buildEducationSection(sections));
  html = html.replace('{{EXPERIENCE_SECTION}}', buildExperienceSection(sections));
  html = html.replace('{{PROJECTS_SECTION}}', buildProjectsSection(sections));
  html = html.replace('{{SKILLS_SECTION}}', buildSkillsSection(sections));
  html = html.replace('{{LANGUAGES_SECTION}}', buildLanguagesSection(sections));

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write HTML
  fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
  console.log(`✅ HTML generado: ${OUTPUT_HTML}`);

  // Generate PDF with Playwright
  console.log('🖨️  Generando PDF con Playwright...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${OUTPUT_HTML}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();

  console.log(`✅ PDF generado: ${OUTPUT_PDF}`);
  console.log('\n🎉 ¡CV generado exitosamente!\n');
}

generate().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
