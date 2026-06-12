const ACTION_VERBS = [
  'led', 'built', 'designed', 'launched', 'reduced', 'generated', 'optimized',
  'architected', 'coached', 'negotiated', 'developed', 'created', 'implemented',
  'delivered', 'improved', 'increased', 'drove', 'established', 'managed',
  'mentored', 'migrated', 'spearheaded', 'transformed', 'automated',
  'engineered', 'integrated', 'orchestrated', 'pioneered', 'scaled',
  'streamlined', 'accelerated', 'achieved', 'authored', 'championed',
  'consolidated', 'coordinated', 'cultivated', 'deployed', 'enabled',
  'executed', 'expanded', 'facilitated', 'forecasted', 'formulated',
  'founded', 'generated', 'grew', 'initiated', 'instituted', 'launched',
  'mentored', 'negotiated', 'overhauled', 'produced', 'programmed',
  'rebuilt', 'reconciled', 'reduced', 'reengineered', 'reorganized',
  'restructured', 'revamped', 'revitalized', 'simplified', 'solved',
  'standardized',   'strengthened', 'systematized', 'upgraded',
  'containerized', 'collaborated',
];

const STANDARD_SECTIONS = ['summary', 'experience', 'education', 'skills', 'projects', 'language'];

function checkCareerObjective(cv) {
  const warnings = [];
  const summary = cv.sections?.summary;
  if (!summary || summary.length === 0 || !summary[0].trim()) {
    warnings.push({ field: 'sections.summary', type: 'career_objective', severity: 'error', message: 'Falta Career Objective / Perfil Profesional — obligatorio para ATS' });
  } else {
    const text = summary.join(' ');
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 20) {
      warnings.push({ field: 'sections.summary', type: 'career_objective', severity: 'warning', message: `Career Objective muy corto (${wordCount} palabras) — mínimo 20-40 palabras para incluir keywords` });
    }
    if (!/\d/.test(text)) {
      warnings.push({ field: 'sections.summary', type: 'career_objective', severity: 'warning', message: 'Career Objective sin números/años — agregá años de experiencia o métricas' });
    }
  }
  return warnings;
}

function checkSectionNames(cv) {
  const warnings = [];
  const sections = cv.sections || {};
  const sectionNames = Object.keys(sections).filter(k => Array.isArray(sections[k]) && sections[k].length > 0);

  sectionNames.forEach(name => {
    if (!STANDARD_SECTIONS.includes(name)) {
      warnings.push({ field: `sections.${name}`, type: 'section_name', severity: 'warning', message: `La sección "${name}" no es un nombre estándar ATS` });
    }
  });

  return warnings;
}

function checkDateConsistency(cv) {
  const warnings = [];
  const dateRegex = /^\d{4}-\d{2}$/;
  const yearRegex = /^\d{4}$/;
  const formats = new Set();

  const sections = cv.sections || {};
  ['experience', 'education', 'projects'].forEach(sectionName => {
    const entries = sections[sectionName];
    if (!Array.isArray(entries)) return;
    entries.forEach(entry => {
      [entry.start_date, entry.end_date].forEach(d => {
        if (!d || d === 'present') return;
        if (dateRegex.test(d)) formats.add('YYYY-MM');
        else if (yearRegex.test(d)) formats.add('YYYY');
        else formats.add('other');
      });
    });
  });

  if (formats.size > 1) {
    warnings.push({ field: 'dates', type: 'date_format', severity: 'warning', message: `Formatos de fecha mezclados: ${[...formats].join(', ')}` });
  }

  return warnings;
}

function checkActionVerbs(cv) {
  const warnings = [];
  const experiences = cv.sections?.experience;
  if (!Array.isArray(experiences)) return warnings;

  experiences.forEach((exp, i) => {
    if (!exp.highlights || exp.highlights.length === 0) return;
    const entriesWithoutVerb = exp.highlights.filter(h => {
      const firstWord = String(h).trim().toLowerCase().split(/\s+/)[0].replace(/^["'(*¿¡]/, '');
      return !ACTION_VERBS.includes(firstWord);
    });
    if (entriesWithoutVerb.length > 0) {
      warnings.push({ field: `sections.experience[${i}].highlights`, type: 'action_verb', severity: 'warning', message: `"${exp.company}" tiene highlights que no empiezan con verbo de acción (ej: Led, Built, Designed)` });
    }
  });

  return warnings;
}

function checkMetrics(cv) {
  const warnings = [];
  const experiences = cv.sections?.experience;
  if (!Array.isArray(experiences)) return warnings;

  experiences.forEach((exp, i) => {
    if (!exp.highlights || exp.highlights.length === 0) return;
    const hasMetric = exp.highlights.some(h => /[\d%$€£]/.test(String(h)));
    if (!hasMetric) {
      warnings.push({ field: `sections.experience[${i}].highlights`, type: 'metrics', severity: 'warning', message: `"${exp.company}" sin métricas cuantificables — agregá números, % o \$` });
    }
  });

  return warnings;
}

function checkSkillsFormat(cv) {
  const warnings = [];
  const skills = cv.sections?.skills;
  if (!Array.isArray(skills)) return warnings;

  skills.forEach((skill, i) => {
    if (skill.details && /\*\*/.test(skill.details)) {
      warnings.push({ field: `sections.skills[${i}].details`, type: 'skill_format', severity: 'warning', message: 'Skills con formato **bold** — ATS prefiere texto plano' });
    }
  });

  return warnings;
}

function ats(state) {
  const { cv } = state;
  const warnings = [];

  warnings.push(...checkCareerObjective(cv));
  warnings.push(...checkSectionNames(cv));
  warnings.push(...checkDateConsistency(cv));
  warnings.push(...checkActionVerbs(cv));
  warnings.push(...checkMetrics(cv));
  warnings.push(...checkSkillsFormat(cv));

  let score = 100;
  const deductionMap = {
    career_objective: 15,
    section_name: 10,
    date_format: 10,
    action_verb: 5,
    metrics: 5,
    skill_format: 5,
  };
  warnings.forEach(w => { score -= deductionMap[w.type] || 5; });
  score = Math.max(0, score);

  const scoreLabel = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return { ...state, atsScore: score, atsLabel: scoreLabel, atsWarnings: warnings };
}

module.exports = { ats };
