const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parseCV } = require('../scripts/parsers');
const { runAgent } = require('./orchestrator');

const DATA_FILE = path.resolve(__dirname, '..', 'data', 'cv.yaml');

function printReport(report) {
  console.log('\n========================================');
  console.log('  CV AGENT — Reporte');
  console.log('========================================\n');

  console.log('── Guardrail ──');
  console.log(`  Estado: ${report.guardrail.status}`);
  if (report.guardrail.issues.length > 0) {
    report.guardrail.issues.forEach(i => {
      const icon = i.severity === 'error' ? '❌' : i.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} [${i.type}] ${i.message}`);
    });
  } else {
    console.log('  ✅ Sin issues');
  }

  console.log('\n── Sanitize ──');
  console.log(`  Estado: ${report.sanitize.status}`);
  if (report.sanitize.changes.length > 0) {
    report.sanitize.changes.forEach(c => {
      console.log(`  ✏️  ${c.field}: "${c.from}" → "${c.to}"`);
    });
  }

  if (report.ats.score !== null) {
    console.log('\n── ATS Check ──');
    console.log(`  Score: ${report.ats.score}/100 (${report.ats.label})`);
    if (report.ats.warnings.length > 0) {
      report.ats.warnings.forEach(w => {
        console.log(`  ⚠️  ${w.message}`);
      });
    }
  }

  if (report.metadata) {
    console.log('\n── Metadata ──');
    console.log(`  Experiencias: ${report.metadata.totalExperiences}`);
    console.log(`  Educación: ${report.metadata.totalEducation}`);
    console.log(`  Proyectos: ${report.metadata.totalProjects}`);
    console.log(`  Skills totales: ${report.metadata.totalSkills}`);
    console.log(`  Categorías de skills: ${report.metadata.totalSkillCategories}`);
    console.log(`  Idiomas: ${report.metadata.totalLanguages}`);
    console.log(`  Highlights totales: ${report.metadata.totalHighlights}`);
    console.log(`  Rango fechas: ${report.metadata.dateRange.earliest} → ${report.metadata.dateRange.latest}`);
    console.log(`  Duración carrera: ${report.metadata.careerDurationYears} años`);
    console.log(`  Redes: ${report.metadata.socialNetworks.join(', ') || 'ninguna'}`);
  }

  console.log('\n========================================\n');
}

async function main() {
  const mode = process.argv[2] || 'analyze';
  const inputFile = process.argv[3] || DATA_FILE;

  if (!['analyze', 'sanitize'].includes(mode)) {
    console.error('Modo: analyze | sanitize');
    console.error('Uso: node agent/agent.js [analyze|sanitize] [archivo]');
    process.exit(1);
  }

  console.log(`📋 Modo: ${mode}`);
  console.log(`📄 Archivo: ${inputFile}`);

  const cv = parseCV(inputFile);
  const result = await runAgent(mode, cv);

  printReport(result.report);

  if (mode === 'sanitize' && result.sanitizedCv) {
    const yamlStr = yaml.dump({ cv: result.sanitizedCv }, { lineWidth: 120, indent: 2 });
    fs.writeFileSync(DATA_FILE, yamlStr, 'utf8');
    console.log(`💾 CV sanitizado guardado en ${DATA_FILE}`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
