/**
 * Service PDF Séquence EPS - génération côté serveur via Chromium
 * - Références de la séquence
 * - Projet de séquence
 */
 
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatContent(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return escapeHtml(s).replace(/\n/g, '<br>');
}

function parseJsonArray(jsonString) {
  try {
    const arr = JSON.parse(jsonString || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseJsonObject(jsonString) {
  try {
    const obj = JSON.parse(jsonString || '{}');
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

function buildBaseStyles() {
  return `
    @page { size: A4; margin: 15mm 18mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #333; }
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; word-break: normal; overflow-wrap: break-word; }

    .header { text-align: center; margin-bottom: 5mm; }
    .header h1 { margin: 0; color: #1e3a5f; font-size: 20pt; }
    .subheader { text-align: center; margin: 1mm 0 5mm; color: #486581; font-size: 10pt; }

    .bandeau { background: #1e3a5f; color: #fff; padding: 6pt 8pt; text-align: center; font-weight: 700; font-size: 10pt; margin-bottom: 5mm; border-radius: 5pt; }
    .section-title { text-align: center; color: #1e3a5f; font-weight: 800; font-size: 12pt; margin: 6mm 0 3mm; }
    .card { margin-bottom: 4mm; border-radius: 6pt; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .card-header { padding: 5pt 8pt; color: #fff; font-weight: 700; font-size: 10pt; }
    .card-body { border: 2pt solid; border-top: none; padding: 6pt 8pt; background: #fff; font-size: 10pt; overflow: hidden; }

    .rich-content { word-break: normal; overflow-wrap: break-word; }
    .rich-content ul, .rich-content ol { padding-left: 1.1em; margin: 0.15em 0; }
    .rich-content li { margin: 0.08em 0; }
    .rich-content p { margin: 0.15em 0; }
  `;
}

function buildReferencesHtml({ sequence, activite }) {
  const title = 'Références de la séquence';
  const subtitle = [activite?.nom, sequence?.titre].filter(Boolean).join(' — ');
  const socle = parseJsonArray(sequence?.socle_commun);
  const attendus = parseJsonArray(sequence?.attendus_fin_cycle);

  const listBlock = (items) => {
    if (!items || items.length === 0) return '<p style="color:#666;">—</p>';
    return `<ul>${items.map((x) => `<li class="rich-content">${formatContent(x)}</li>`).join('')}</ul>`;
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${buildBaseStyles()}</style>
</head>
<body>
  <div class="header"><h1>${escapeHtml(title)}</h1></div>
  ${subtitle ? `<div class="subheader">${escapeHtml(subtitle)}</div>` : ''}
  <div class="bandeau">${escapeHtml(activite?.classe?.nom ? `${activite.nom} — ${activite.classe.nom}` : (activite?.nom || ''))}</div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Socle commun</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${listBlock(socle)}</div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Projet établissement</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(sequence?.projet_etablissement)}</div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Projet EPS</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">
      <div><strong>Axe prioritaire :</strong> ${formatContent(sequence?.projet_eps_axe_prioritaire)}</div>
      <div style="margin-top:3mm;"><strong>Axe secondaire :</strong> ${formatContent(sequence?.projet_eps_axe_secondaire)}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Attendus de fin de cycle</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${listBlock(attendus)}</div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Projet de classe</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">
      <div><strong>Moteur :</strong> ${formatContent(sequence?.projet_classe_moteur)}</div>
      <div style="margin-top:2mm;"><strong>Méthodologique :</strong> ${formatContent(sequence?.projet_classe_methodologique)}</div>
      <div style="margin-top:2mm;"><strong>Sociale :</strong> ${formatContent(sequence?.projet_classe_sociale)}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Condition d'enseignement</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(sequence?.conditions_enseignement)}</div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Situation d'observation / Évaluation diagnostique</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(sequence?.situation_observation)}</div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Comportement observés</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(sequence?.comportements_observes)}</div>
  </div>

  <div class="card">
    <div class="card-header" style="background:#92d050;">Hypothèses explicatives / problème à résoudre</div>
    <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(sequence?.hypotheses_explicatives)}</div>
  </div>
</body>
</html>`;
}

function buildProjetHtml({ sequence, activite }) {
  const title = 'Projet de séquence';
  const subtitle = sequence?.titre ? `Séquence : ${sequence.titre}` : '';
  const tableauLecons = parseJsonArray(sequence?.tableau_lecons);
  const blocks = tableauLecons
    .filter((x) => x && typeof x === 'object' && !Array.isArray(x))
    .map((x) => ({
      titre: x.titre ?? '',
      objectif: x.objectif ?? '',
      quoi: x.quoi ?? '',
      comment: x.comment ?? '',
    }));

  const leconsBlock = () => {
    if (!blocks || blocks.length === 0) return '<p style="color:#666;">Aucune leçon.</p>';
    return blocks.map((b, i) => `
      <div class="card" style="border:2pt solid #92d050;">
        <div class="card-header" style="background:#92d050;">Leçon ${i + 1}</div>
        <div class="card-body" style="border-color:#92d050; background:#e8f5e0;">
          <div style="margin-bottom:3mm;">
            <div style="color:#92d050;font-weight:700;font-size:9pt;margin-bottom:1mm;">Titre de la leçon</div>
            <div class="rich-content">${formatContent(b.titre)}</div>
          </div>
          <div style="margin-bottom:3mm;">
            <div style="color:#92d050;font-weight:700;font-size:9pt;margin-bottom:1mm;">Objectif</div>
            <div class="rich-content">${formatContent(b.objectif)}</div>
          </div>
          <div style="margin-bottom:3mm;">
            <div style="color:#92d050;font-weight:700;font-size:9pt;margin-bottom:1mm;">QUOI (apprendre)</div>
            <div class="rich-content">${formatContent(b.quoi)}</div>
          </div>
          <div>
            <div style="color:#92d050;font-weight:700;font-size:9pt;margin-bottom:1mm;">COMMENT</div>
            <div class="rich-content">${formatContent(b.comment)}</div>
          </div>
        </div>
      </div>
    `).join('');
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${buildBaseStyles()}</style>
</head>
<body>
  <div class="header"><h1>${escapeHtml(title)}</h1></div>
  ${subtitle ? `<div class="subheader">${escapeHtml(subtitle)}</div>` : ''}
  <div class="bandeau">${escapeHtml(activite?.classe?.nom ? `${activite.nom} — ${activite.classe.nom}` : (activite?.nom || ''))}</div>

  ${leconsBlock()}
</body>
</html>`;
}

async function getChromiumExecutablePath() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const chromium = require('@sparticuz/chromium');
      return await chromium.executablePath();
    } catch (e) {
      console.error('Chromium Lambda:', e.message);
    }
  }
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_EXECUTABLE_PATH;
  if (envPath) return envPath;
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const fs = require('fs');
  for (const p of winPaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

async function renderPdfBuffer(html) {
  const executablePath = await getChromiumExecutablePath();
  if (!executablePath) {
    throw new Error('Chromium introuvable. En local : installez Chrome/Edge ou définissez PUPPETEER_EXECUTABLE_PATH.');
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch {
    throw new Error('puppeteer-core est requis : npm install puppeteer-core');
  }

  let chromium;
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isLambda) {
    try {
      chromium = require('@sparticuz/chromium');
    } catch (_) {}
  }

  const launchOptions = {
    executablePath,
    headless: true,
    args: isLambda && chromium ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (isLambda && chromium) {
    launchOptions.defaultViewport = chromium.defaultViewport;
  }

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '18mm', right: '18mm' },
    });
  } finally {
    await browser.close();
  }
}

async function generateSequenceReferencesPdfBuffer(sequence, activite = null) {
  const html = buildReferencesHtml({ sequence, activite });
  return renderPdfBuffer(html);
}

async function generateSequenceProjetPdfBuffer(sequence, activite = null) {
  const html = buildProjetHtml({ sequence, activite });
  return renderPdfBuffer(html);
}

module.exports = {
  generateSequenceReferencesPdfBuffer,
  generateSequenceProjetPdfBuffer,
  parseJsonArray,
  parseJsonObject,
};
