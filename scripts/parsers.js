/**
 * CV Data Parsers
 * ================
 * Módulo con parsers para YAML, JSON y Markdown.
 * Todos retornan la misma estructura normalizada:
 *
 * {
 *   name, headline, location, email, photo,
 *   social_networks: [{ network, username }],
 *   sections: {
 *     summary: [string],
 *     education: [{ institution, area, start_date, end_date, location, highlights }],
 *     experience: [{ company, position, start_date, end_date, location, highlights }],
 *     projects: [{ name, start_date, end_date, summary, highlights }],
 *     skills: [{ label, details }],
 *     language: [{ label, details }]
 *   }
 * }
 */

const fs = require('fs');
const yaml = require('js-yaml');
const { marked } = require('marked');

// ── YAML Parser ────────────────────────────────────────
function parseYAML(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(content);
  return data.cv;
}

// ── JSON Parser ────────────────────────────────────────
function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  return data.cv;
}

// ── Markdown Parser ────────────────────────────────────
// Convención del formato MD:
//   # Nombre Completo           → name
//   - **key:** value            → metadata (location, email, linkedin, github)
//   ## Sección                  → section header
//   ### Título | Subtítulo      → entry (institution|company | area|position)
//   - **fecha:** start — end    → dates
//   - **ubicacion:** lugar      → location
//   - **descripcion:** texto    → summary (projects)
//   - texto libre               → highlight

function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const cv = {
    name: '',
    headline: '',
    location: '',
    email: '',
    photo: '',
    social_networks: [],
    sections: {
      summary: [],
      education: [],
      experience: [],
      projects: [],
      skills: [],
      language: [],
    },
  };

  let currentSection = null; // 'summary', 'education', etc.
  let currentEntry = null;
  let inHeaderMeta = true; // before first ## section

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── H1: Name ──
    if (/^# /.test(trimmed) && !/^## /.test(trimmed) && !/^### /.test(trimmed)) {
      cv.name = trimmed.replace(/^# /, '').trim();
      inHeaderMeta = true;
      continue;
    }

    // ── H2: Section header ──
    if (/^## /.test(trimmed) && !/^### /.test(trimmed)) {
      // Save previous entry
      if (currentEntry && currentSection) {
        pushEntry(cv, currentSection, currentEntry);
      }
      currentEntry = null;

      const sectionTitle = trimmed.replace(/^## /, '').trim().toLowerCase();
      currentSection = mapSectionName(sectionTitle);
      inHeaderMeta = false;
      continue;
    }

    // ── H3: Entry (Education/Experience/Projects) ──
    if (/^### /.test(trimmed)) {
      // Save previous entry
      if (currentEntry && currentSection) {
        pushEntry(cv, currentSection, currentEntry);
      }

      const entryText = trimmed.replace(/^### /, '').trim();
      currentEntry = parseEntryHeader(entryText, currentSection);
      continue;
    }

    // ── Header metadata (before first section) ──
    if (inHeaderMeta && /^- \*\*/.test(trimmed)) {
      const { key, value } = parseMetaLine(trimmed);
      if (key === 'location') cv.location = value;
      else if (key === 'email') cv.email = value;
      else if (key === 'linkedin') {
        cv.social_networks.push({ network: 'LinkedIn', username: value });
      } else if (key === 'github') {
        cv.social_networks.push({ network: 'GitHub', username: value });
      }
      continue;
    }

    // ── Section content ──
    if (currentSection === 'summary' && trimmed && !trimmed.startsWith('-')) {
      cv.sections.summary.push(trimmed);
      continue;
    }

    // ── Skills / Languages (simple key-value lists) ──
    if ((currentSection === 'skills' || currentSection === 'language') && /^- \*\*/.test(trimmed)) {
      const { key, value } = parseMetaLine(trimmed);
      if (currentSection === 'skills') {
        cv.sections.skills.push({ label: key, details: value });
      } else {
        cv.sections.language.push({ label: key, details: value });
      }
      continue;
    }

    // ── Entry metadata and highlights ──
    if (currentEntry && /^- /.test(trimmed)) {
      const bulletContent = trimmed.replace(/^- /, '').trim();

      // Check if it's metadata
      if (/^\*\*fecha:\*\*/i.test(bulletContent)) {
        const dateStr = bulletContent.replace(/^\*\*fecha:\*\*\s*/i, '').trim();
        const dateParts = dateStr.split(/\s*[—–-]\s*/);
        currentEntry.start_date = dateParts[0] ? dateParts[0].trim() : '';
        currentEntry.end_date = dateParts[1] ? dateParts[1].trim() : '';
      } else if (/^\*\*ubicacion:\*\*/i.test(bulletContent)) {
        currentEntry.location = bulletContent.replace(/^\*\*ubicacion:\*\*\s*/i, '').trim();
      } else if (/^\*\*descripcion:\*\*/i.test(bulletContent)) {
        currentEntry.summary = bulletContent.replace(/^\*\*descripcion:\*\*\s*/i, '').trim();
      } else {
        // It's a highlight
        if (!currentEntry.highlights) currentEntry.highlights = [];
        currentEntry.highlights.push(bulletContent);
      }
      continue;
    }
  }

  // Save last entry
  if (currentEntry && currentSection) {
    pushEntry(cv, currentSection, currentEntry);
  }

  return cv;
}

// ── MD Helper Functions ────────────────────────────────

function mapSectionName(title) {
  const mapping = {
    'perfil profesional': 'summary',
    'resumen': 'summary',
    'summary': 'summary',
    'educación': 'education',
    'educacion': 'education',
    'education': 'education',
    'experiencia profesional': 'experience',
    'experiencia': 'experience',
    'experience': 'experience',
    'proyectos': 'projects',
    'projects': 'projects',
    'habilidades técnicas': 'skills',
    'habilidades': 'skills',
    'skills': 'skills',
    'idiomas': 'language',
    'languages': 'language',
  };
  return mapping[title] || 'summary';
}

function parseMetaLine(line) {
  const match = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
  if (match) {
    return { key: match[1].trim().toLowerCase(), value: match[2].trim() };
  }
  return { key: '', value: '' };
}

function parseEntryHeader(text, section) {
  const parts = text.split('|').map(p => p.trim());
  const entry = {
    highlights: [],
    start_date: '',
    end_date: '',
    location: '',
  };

  if (section === 'education') {
    entry.institution = parts[0] || '';
    entry.area = parts[1] || '';
  } else if (section === 'experience') {
    entry.company = parts[0] || '';
    entry.position = parts[1] || '';
  } else if (section === 'projects') {
    entry.name = parts[0] || '';
    entry.summary = '';
  }

  return entry;
}

function pushEntry(cv, section, entry) {
  if (section === 'education') {
    cv.sections.education.push(entry);
  } else if (section === 'experience') {
    cv.sections.experience.push(entry);
  } else if (section === 'projects') {
    cv.sections.projects.push(entry);
  }
}

// ── Auto-detect & parse ───────────────────────────────

function parseCV(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();

  switch (ext) {
    case 'yaml':
    case 'yml':
      console.log('📄 Formato detectado: YAML');
      return parseYAML(filePath);
    case 'json':
      console.log('📄 Formato detectado: JSON');
      return parseJSON(filePath);
    case 'md':
    case 'markdown':
      console.log('📄 Formato detectado: Markdown');
      return parseMarkdown(filePath);
    default:
      throw new Error(`Formato no soportado: .${ext}. Usa .yaml, .json o .md`);
  }
}

module.exports = { parseCV, parseYAML, parseJSON, parseMarkdown };
