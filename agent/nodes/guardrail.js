const PLACEHOLDER_PATTERNS = {
  name: /^john\s+doe$/i,
  email: /@example\.com$/,
  linkedin: /johndoe$/i,
  github: /johndoe$/i,
  location: /san\s*francisco/i,
};

const KNOWN_PLACEHOLDER_LOCATIONS = [
  'san francisco, ca', 'san francisco', 'remote',
];

function isKnownPlaceholder(value, fieldType) {
  if (!value || !fieldType) return false;
  const pattern = PLACEHOLDER_PATTERNS[fieldType];
  if (pattern) return pattern.test(String(value));
  return false;
}

function checkStructure(cv) {
  const errors = [];

  if (!cv.name) errors.push({ field: 'name', type: 'missing', severity: 'error', message: 'Falta el nombre' });
  if (!cv.sections) errors.push({ field: 'sections', type: 'missing', severity: 'error', message: 'Faltan secciones' });
  if (!cv.sections?.experience || cv.sections.experience.length === 0) {
    errors.push({ field: 'sections.experience', type: 'missing', severity: 'warning', message: 'No hay experiencia laboral' });
  }
  if (!cv.sections?.education || cv.sections.education.length === 0) {
    errors.push({ field: 'sections.education', type: 'missing', severity: 'warning', message: 'No hay educación' });
  }
  if (!cv.sections?.skills || cv.sections.skills.length === 0) {
    errors.push({ field: 'sections.skills', type: 'missing', severity: 'warning', message: 'No hay habilidades' });
  }

  return errors;
}

function checkSensitiveData(cv) {
  const issues = [];

  if (cv.name && !isKnownPlaceholder(cv.name, 'name')) {
    issues.push({ field: 'name', type: 'personal', severity: 'error', message: `El nombre "${cv.name}" parece ser un nombre real` });
  }

  if (cv.email && !isKnownPlaceholder(cv.email, 'email')) {
    issues.push({ field: 'email', type: 'personal', severity: 'error', message: `El email "${cv.email}" no es un placeholder genérico` });
  }

  if (cv.location) {
    const loc = cv.location.toLowerCase().trim();
    if (!KNOWN_PLACEHOLDER_LOCATIONS.some(p => loc.includes(p))) {
      issues.push({ field: 'location', type: 'personal', severity: 'warning', message: `La ubicación "${cv.location}" parece ser real` });
    }
  }

  if (cv.social_networks) {
    cv.social_networks.forEach((sn, i) => {
      if (sn.network === 'LinkedIn' && sn.username && !isKnownPlaceholder(sn.username, 'linkedin')) {
        issues.push({ field: `social_networks[${i}].username`, type: 'personal', severity: 'error', message: `LinkedIn "${sn.username}" parece ser un perfil real` });
      }
      if (sn.network === 'GitHub' && sn.username && !isKnownPlaceholder(sn.username, 'github')) {
        issues.push({ field: `social_networks[${i}].username`, type: 'personal', severity: 'error', message: `GitHub "${sn.username}" parece ser un perfil real` });
      }
    });
  }

  if (cv.photo && cv.photo.trim()) {
    issues.push({ field: 'photo', type: 'personal', severity: 'warning', message: 'Hay una foto configurada' });
  }

  return issues;
}

function guardrail(state) {
  const { cv } = state;
  const issues = [];

  const structureIssues = checkStructure(cv);
  issues.push(...structureIssues);

  const sensitiveIssues = checkSensitiveData(cv);
  issues.push(...sensitiveIssues);

  const hasErrors = issues.some(i => i.severity === 'error');
  const hasWarnings = issues.some(i => i.severity === 'warning');

  return {
    ...state,
    issues,
    guardrailStatus: hasErrors ? 'failed' : hasWarnings ? 'warnings' : 'passed',
  };
}

module.exports = { guardrail };
