const { guardrail } = require('./nodes/guardrail');
const { sanitize } = require('./nodes/sanitize');
const { ats } = require('./nodes/ats');
const { metadata } = require('./nodes/metadata');

const DEFAULT_ANALYZE_FLOW = ['guardrail', 'ats', 'metadata'];
const DEFAULT_SANITIZE_FLOW = ['guardrail', 'sanitize', 'ats', 'metadata'];

const NODE_MAP = {
  guardrail,
  sanitize,
  ats,
  metadata,
};

function runNode(name, state) {
  const node = NODE_MAP[name];
  if (!node) throw new Error(`Nodo desconocido: ${name}`);
  return node(state);
}

function buildReport(state) {
  return {
    timestamp: new Date().toISOString(),
    status: state.sanitizeStatus || state.guardrailStatus || 'completed',
    guardrail: {
      status: state.guardrailStatus || 'skipped',
      issues: state.issues || [],
    },
    sanitize: state.changes ? {
      status: state.sanitizeStatus || 'skipped',
      changes: state.changes,
      totalChanges: state.changes.length,
    } : { status: 'skipped', changes: [], totalChanges: 0 },
    ats: {
      score: state.atsScore ?? null,
      label: state.atsLabel ?? null,
      warnings: state.atsWarnings || [],
    },
    metadata: state.metadata || null,
  };
}

async function runAgent(mode, cv) {
  let flow;
  if (mode === 'sanitize') {
    flow = DEFAULT_SANITIZE_FLOW;
  } else {
    flow = DEFAULT_ANALYZE_FLOW;
  }

  let state = { cv, issues: [], changes: [], atsWarnings: [] };

  for (const nodeName of flow) {
    state = runNode(nodeName, state);
  }

  const report = buildReport(state);

  return {
    mode,
    report,
    sanitizedCv: state.sanitizedCv || null,
    originalCv: cv,
  };
}

module.exports = { runAgent };
