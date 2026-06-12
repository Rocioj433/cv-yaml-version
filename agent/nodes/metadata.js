function parseDate(dateStr) {
  if (!dateStr || dateStr === 'present') return null;
  const parts = String(dateStr).split('-');
  if (parts.length === 2) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
  if (parts.length === 1) return new Date(parseInt(parts[0]), 0);
  return null;
}

function countSkills(skills) {
  if (!Array.isArray(skills)) return 0;
  const all = skills.map(s => s.details || '').join(', ');
  return all.split(',').map(s => s.trim()).filter(Boolean).length;
}

function getDateRange(sections) {
  let earliest = null;
  let latest = null;

  ['experience', 'education', 'projects'].forEach(sectionName => {
    const entries = sections[sectionName];
    if (!Array.isArray(entries)) return;
    entries.forEach(entry => {
      const start = parseDate(entry.start_date);
      const end = parseDate(entry.end_date);
      if (start && (!earliest || start < earliest)) earliest = start;
      if (end && (!latest || end > latest)) latest = end;
      if (start && !end && (!latest || start > latest)) latest = start;
    });
  });

  return {
    earliest: earliest ? earliest.toISOString().split('T')[0] : null,
    latest: latest ? latest.toISOString().split('T')[0] : null,
  };
}

function getDurationYears(earliest, latest) {
  if (!earliest || !latest) return null;
  const e = new Date(earliest);
  const l = new Date(latest);
  return Math.max(0, Math.round((l - e) / (365.25 * 24 * 60 * 60 * 1000)));
}

function metadata(state) {
  const { cv } = state;
  const sections = cv.sections || {};

  const dateRange = getDateRange(sections);

  const meta = {
    totalExperiences: (sections.experience || []).length,
    totalEducation: (sections.education || []).length,
    totalProjects: (sections.projects || []).length,
    totalSkills: countSkills(sections.skills),
    totalSkillCategories: (sections.skills || []).length,
    totalLanguages: (sections.language || []).length,
    totalHighlights: 0,
    dateRange,
    careerDurationYears: getDurationYears(dateRange.earliest, dateRange.latest),
    hasPhoto: !!cv.photo,
    socialNetworks: (cv.social_networks || []).map(s => s.network),
  };

  ['experience', 'education', 'projects'].forEach(sectionName => {
    const entries = sections[sectionName];
    if (!Array.isArray(entries)) return;
    entries.forEach(entry => {
      if (entry.highlights) meta.totalHighlights += entry.highlights.length;
    });
  });

  return {
    ...state,
    metadata: meta,
  };
}

module.exports = { metadata };
