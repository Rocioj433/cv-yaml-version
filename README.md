# CV Generator — YAML-powered

Generador de CV técnico que separa datos (YAML) de presentación (HTML/CSS), con editor web, preview en vivo, exportación a PDF y un agente integrado para sanitización, análisis ATS y métricas.

---

## Features

- **Editor web** con preview en vivo vía iframe auto-scalado
- **Exportación a PDF** con Playwright (fidelidad A4)
- **Modo oscuro/claro** con persistencia en localStorage
- **3 formatos de entrada**: YAML, JSON, Markdown
- **Agente integrado** con 4 nodos:
  - **Guardrail** — detecta datos sensibles (nombre real, emails, perfiles)
  - **Sanitize** — reemplaza datos personales por placeholders (John Doe)
  - **ATS Checker** — evalúa compatibilidad con sistemas de tracking (score 0-100)
  - **Metadata** — extrae métricas del CV (experiencias, skills, rango de fechas)

---

## Quick Start

```bash
npm install
npm start              # Abrir editor en http://localhost:3000
npm run generate       # Generar CV desde CLI (YAML → HTML → PDF)
npm run agent          # Analizar CV con el agente
```

---

## Project Structure

```
├── agent/              # Agente: guardrail, sanitize, ATS, metadata
│   ├── nodes/          #   Nodos individuales del pipeline
│   └── orchestrator.js #   Orquestador (StateGraph simplificado)
├── data/               # Fuente de verdad: cv.yaml
├── output/             # HTML y PDF generados
├── scripts/            # Generador CLI (generate.js, parsers.js)
├── templates/          # Plantilla HTML (cv.html) + CSS (cv.css)
├── ui/                 # Frontend: index.html + app.js
├── server.js           # Express server con APIs REST
└── package.json
```

---

## Usage

### Editor Web

```bash
npm start
# Abrir http://localhost:3000
```

Disponible en el header:
- **Guardar** — persiste cambios a `data/cv.yaml`
- **PDF** — genera PDF con Playwright
- **🔍 Analizar** — ejecuta guardrail + ATS + metadata
- **🧹 Sanitizar** — reemplaza datos personales por placeholders
- **📋 Reporte** — muestra el último reporte del agente

### CLI

```bash
npm run generate          # Generar HTML + PDF desde data/cv.yaml
npm run generate:json     # Desde data/cv.json
npm run generate:md       # Desde data/cv.md
npm run agent             # Analizar CV (guardrail + ATS + metadata)
npm run agent:sanitize    # Sanitizar y guardar CV
```

### API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/cv` | GET | Obtener CV actual |
| `/api/cv` | PUT | Guardar CV |
| `/api/render` | POST | Renderizar HTML desde datos |
| `/api/generate` | POST | Generar PDF |
| `/api/agent/analyze` | POST | Ejecutar agente (solo análisis) |
| `/api/agent/sanitize` | POST | Ejecutar agente (sanitizar + guardar) |

---

## Agent — ATS Checker

Evalúa el CV contra reglas de compatibilidad ATS:

| Check | Descripción | Deducción |
|-------|-------------|-----------|
| Career Objective | ¿Existe resumen profesional? ¿Tiene keywords y números? | 15 pts |
| Section Names | ¿Usa nombres de sección estándar? | 10 pts |
| Date Format | ¿Todas las fechas usan el mismo formato? | 10 pts |
| Action Verbs | ¿Los highlights empiezan con verbos como *Led, Built, Designed*? | 5 pts c/u |
| Metrics | ¿Cada experiencia tiene logros cuantificados (números, %)? | 5 pts c/u |

---

## Tech Stack

- **Runtime**: Node.js
- **Server**: Express
- **CSS**: Tailwind CDN + custom styles
- **PDF**: Playwright (Chromium)
- **Parsers**: js-yaml, marked
- **Agent**: Pipeline pattern (StateGraph-inspired)

---

## License

ISC
