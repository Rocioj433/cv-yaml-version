const PLACEHOLDERS = {
  name: 'John Doe',
  headline: 'Fullstack Developer',
  email: 'john.doe@example.com',
  location: 'San Francisco, CA',
  linkedin: 'https://www.linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
};

function sanitizeField(value, fieldType) {
  if (!value) return value;
  const placeholder = PLACEHOLDERS[fieldType];
  if (placeholder && String(value) !== placeholder) {
    return { changed: true, from: value, to: placeholder };
  }
  return { changed: false };
}

function sanitize(state) {
  const { cv } = state;
  const sanitized = JSON.parse(JSON.stringify(cv));
  const changes = [];

  const nameResult = sanitizeField(sanitized.name, 'name');
  if (nameResult.changed) {
    sanitized.name = nameResult.to;
    changes.push({ field: 'name', from: nameResult.from, to: nameResult.to });
  }

  const headlineResult = sanitizeField(sanitized.headline, 'headline');
  if (headlineResult.changed) {
    sanitized.headline = headlineResult.to;
    changes.push({ field: 'headline', from: headlineResult.from, to: headlineResult.to });
  }

  const emailResult = sanitizeField(sanitized.email, 'email');
  if (emailResult.changed) {
    sanitized.email = emailResult.to;
    changes.push({ field: 'email', from: emailResult.from, to: emailResult.to });
  }

  const locResult = sanitizeField(sanitized.location, 'location');
  if (locResult.changed) {
    sanitized.location = locResult.to;
    changes.push({ field: 'location', from: locResult.from, to: locResult.to });
  }

  if (sanitized.social_networks) {
    sanitized.social_networks.forEach((sn, i) => {
      if (sn.network === 'LinkedIn') {
        const r = sanitizeField(sn.username, 'linkedin');
        if (r.changed) {
          sanitized.social_networks[i] = { ...sn, username: r.to };
          changes.push({ field: `social_networks[${i}].username`, from: r.from, to: r.to });
        }
      }
      if (sn.network === 'GitHub') {
        const r = sanitizeField(sn.username, 'github');
        if (r.changed) {
          sanitized.social_networks[i] = { ...sn, username: r.to };
          changes.push({ field: `social_networks[${i}].username`, from: r.from, to: r.to });
        }
      }
    });
  }

  return {
    ...state,
    sanitizedCv: sanitized,
    changes,
    sanitizeStatus: changes.length > 0 ? 'modified' : 'clean',
  };
}

module.exports = { sanitize };
