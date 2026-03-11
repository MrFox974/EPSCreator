/**
 * Service PDF leçon EPS - Option B : génération côté serveur via Chromium
 * Rendu net, marges A4 (2,5 cm), texte vectoriel.
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

/** Texte ou HTML (Quill) : préserve le HTML si déjà balisé, sinon échappe et \n -> <br> */
function formatContent(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return escapeHtml(s).replace(/\n/g, '<br>');
}

/** Construit le HTML complet d'une leçon pour impression PDF */
function buildLeconHtml(fiche) {
  const title = fiche?.titre || 'Préparation leçon EPS';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 15mm 18mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #333; }
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; word-break: normal; overflow-wrap: break-word; }

    .header { text-align: center; margin-bottom: 5mm; }
    .header h1 { margin: 0; color: #1e3a5f; font-size: 24pt; }

    .bandeau { background: #1e3a5f; color: #fff; padding: 6pt 8pt; text-align: center; font-weight: 700; font-size: 10pt; margin-bottom: 5mm; border-radius: 5pt; word-break: normal; overflow-wrap: break-word; }
    .objet { background: #d9d9d9; padding: 6pt 8pt; border-radius: 5pt; margin-bottom: 5mm; font-size: 10pt; word-break: normal; overflow-wrap: break-word; }

    .badges { background: #7a9bb8; padding: 6pt 8pt; border-radius: 5pt; display: flex; flex-wrap: wrap; gap: 6pt; margin-bottom: 6mm; }
    .badge { display: inline-flex; border-radius: 5pt; overflow: hidden; }
    .badge-label { background: #1e3a5f; color: #fff; font-weight: 700; padding: 5pt 8pt; font-size: 9pt; }
    .badge-value { background: #fff; color: #1e3a5f; font-weight: 600; padding: 5pt 8pt; font-size: 9pt; word-break: normal; overflow-wrap: break-word; min-width: 0; }

    .section-title { text-align: center; color: #1e3a5f; font-weight: 800; font-size: 12pt; margin: 6mm 0 3mm; }
    .situations-subtitle { text-align: center; color: #1e3a5f; font-size: 10pt; margin: 0 0 4mm 0; }
    /* Remplir la page au maximum. Pas de saut forcé entre sections : si 2 blocs tiennent sur une page, on les met. Saut uniquement si un bloc (titre + contenu) ne rentre pas en entier. */
    .section-block, .subsection-block {
      break-before: auto; page-break-before: auto;
      break-after: auto; page-break-after: auto;
      break-inside: avoid; page-break-inside: avoid;
    }
    .card { margin-bottom: 4mm; border-radius: 6pt; overflow: hidden; break-inside: avoid; }
    .card-header { padding: 5pt 8pt; color: #fff; font-weight: 700; font-size: 10pt; }
    .card-body { border: 2pt solid; border-top: none; padding: 6pt 8pt; background: #fff; font-size: 10pt; word-break: normal; overflow-wrap: break-word; overflow: hidden; }

    .situation-card { border: 2pt solid; border-radius: 6pt; margin-bottom: 4mm; overflow: hidden; break-inside: avoid; }
    .situation-header { padding: 5pt 8pt; color: #fff; font-weight: 700; font-size: 10pt; }
    .situation-body { padding: 6pt 8pt; background: #fff; word-break: normal; overflow-wrap: break-word; overflow: hidden; }
    .situation-field { margin-bottom: 4pt; }
    .situation-field-label { font-weight: 700; color: #333; margin-bottom: 1pt; font-size: 9pt; }
    .situation-field-value { color: #555; font-size: 9pt; word-break: normal; overflow-wrap: break-word; }

    .rich-content { word-break: normal; overflow-wrap: break-word; }
    .rich-content ul, .rich-content ol { padding-left: 1.1em; margin: 0.15em 0; }
    .rich-content li { margin: 0.08em 0; }
    .rich-content p { margin: 0.15em 0; }
    .rich-content .ql-align-center { text-align: center; }
    .rich-content .ql-align-right { text-align: right; }
    .rich-content .ql-indent-1 { padding-left: 2em; }
    .rich-content .ql-indent-2 { padding-left: 4em; }
  </style>
</head>
<body>
  <div class="header"><h1>${escapeHtml(title)}</h1></div>
  <div class="bandeau"><span class="rich-content">${formatContent(fiche?.bandeau_titre)}</span></div>
  <div class="objet"><strong>OBJET D'ENSEIGNEMENT</strong><br><span class="rich-content">${formatContent(fiche?.objet_enseignement)}</span></div>

  <div class="badges">
    <div class="badge"><span class="badge-label">LEÇON</span><span class="badge-value">${escapeHtml(fiche?.lecon_numero ?? '')}</span></div>
    <div class="badge"><span class="badge-label">APSA</span><span class="badge-value">${escapeHtml(fiche?.apsa ?? '')}</span></div>
    <div class="badge"><span class="badge-label">CLASSE</span><span class="badge-value">${escapeHtml(fiche?.classe ?? '')}</span></div>
    <div class="badge"><span class="badge-label">EFFECTIF</span><span class="badge-value">${escapeHtml(fiche?.effectif ?? '')}</span></div>
  </div>

  <div class="section-block">
    <div class="section-title">Accroche programme</div>
    <div class="card">
      <div class="card-header" style="background:#92d050;">Champs d'apprentissage</div>
      <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(fiche?.champs_apprentissage)}</div>
    </div>
    <div class="card">
      <div class="card-header" style="background:#92d050;">Compétences attendues</div>
      <div class="card-body rich-content" style="border-color:#92d050; background:#e8f5e0;">${formatContent(fiche?.competences_attendues)}</div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">LES CONTENUS DE LA LEÇON</div>
    <div class="card">
      <div class="card-header" style="background:#4a90a4;">Intension pédagogique</div>
      <div class="card-body rich-content" style="border-color:#4a90a4;">${formatContent(fiche?.intension_pedagogique)}</div>
    </div>
    <div class="card">
    <div class="card-header" style="background:#4a90a4;">Intension éducatif</div>
    <div class="card-body rich-content" style="border-color:#4a90a4;">${formatContent(fiche?.intension_educatif)}</div>
  </div>
  <div class="card">
    <div class="card-header" style="background:#4a90a4;">Objectif - vue enseignante</div>
    <div class="card-body rich-content" style="border-color:#4a90a4;">${formatContent(fiche?.objectif_enseignante)}</div>
  </div>
  <div class="card">
    <div class="card-header" style="background:#4a90a4;">Objectif - vue élève</div>
    <div class="card-body rich-content" style="border-color:#4a90a4;">${formatContent(fiche?.objectif_eleve)}</div>
  </div>
  <div class="card">
    <div class="card-header" style="background:#6b7b5a;">QUOI - Le ciblage</div>
    <div class="card-body rich-content" style="border-color:#6b7b5a;">${formatContent(fiche?.quoi_ciblage)}</div>
  </div>
  <div class="card">
    <div class="card-header" style="background:#6b7b5a;">COMMENT - Contenu d'enseignement principal</div>
    <div class="card-body rich-content" style="border-color:#6b7b5a;">${formatContent(fiche?.comment_enseignement)}</div>
  </div>

    <div class="card">
      <div class="card-header" style="background:#e74c3c;">Points de sécurité</div>
      <div class="card-body rich-content" style="border-color:#e74c3c;">${formatContent(fiche?.points_securite)}</div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">LES SITUATIONS</div>
    <p class="situations-subtitle">... PRÉSENTATION DE L'OBJECTIF (BILAN)</p>
    ${buildSituationsSection(fiche)}
  </div>
</body>
</html>`;
}

function parseSituations(jsonString) {
  try {
    const arr = JSON.parse(jsonString || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function buildSituationsSection(fiche) {
  const echauffement = parseSituations(fiche?.situations_echauffement);
  const apprentissage = parseSituations(fiche?.situations_apprentissage);
  const finale = parseSituations(fiche?.situations_finale);

  const situationHtml = (sit, idx, color) => `
    <div class="situation-card" style="border-color:${color};">
      <div class="situation-header" style="background:${color};">Situation ${idx + 1}</div>
      <div class="situation-body">
        <div class="situation-field"><div class="situation-field-label">But</div><div class="situation-field-value">${formatContent(sit?.but)}</div></div>
        <div class="situation-field"><div class="situation-field-label">Consigne</div><div class="situation-field-value">${formatContent(sit?.consigne)}</div></div>
        <div class="situation-field"><div class="situation-field-label">Critères de réussite</div><div class="situation-field-value">${formatContent(sit?.criteres_reussite)}</div></div>
        <div class="situation-field"><div class="situation-field-label">Critères de réalisation</div><div class="situation-field-value">${formatContent(sit?.criteres_realisation)}</div></div>
        <div class="situation-field"><div class="situation-field-label">Aménagement</div><div class="situation-field-value">${formatContent(sit?.amenagement)}</div></div>
      </div>
    </div>`;

  let html = '';
  if (echauffement.length > 0) {
    html += '<div class="subsection-block"><h3 style="color:#1e3a5f;font-weight:700;font-size:11pt;margin:5mm 0 2mm;">Echauffement</h3>';
    html += echauffement.map((sit, i) => situationHtml(sit, i, '#e74c3c')).join('');
    html += '</div>';
  }
  if (apprentissage.length > 0) {
    html += '<div class="subsection-block"><h3 style="color:#1e3a5f;font-weight:700;font-size:11pt;margin:5mm 0 2mm;">Situations d\'apprentissages</h3>';
    html += apprentissage.map((sit, i) => situationHtml(sit, i, '#5dade2')).join('');
    html += '</div>';
  }
  if (finale.length > 0) {
    html += '<div class="subsection-block"><h3 style="color:#1e3a5f;font-weight:700;font-size:11pt;margin:5mm 0 2mm;">Situations finale</h3>';
    html += finale.map((sit, i) => situationHtml(sit, i, '#e74c3c')).join('');
    html += '</div>';
  }
  return html || '<p style="color:#666;">Aucune situation.</p>';
}

/** Résout le binaire Chromium : Lambda (@sparticuz/chromium) ou local (env ou chemins Windows) */
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

/**
 * Génère un buffer PDF à partir des données fiche (Option B - serveur).
 * @param {Object} fiche - Données fiche EPS (plain object)
 * @returns {Promise<Buffer>}
 */
async function generateFicheEpsPdfBuffer(fiche) {
  const executablePath = await getChromiumExecutablePath();
  if (!executablePath) {
    throw new Error(
      'Chromium introuvable. En local : installez Chrome ou Edge, ou définissez PUPPETEER_EXECUTABLE_PATH.'
    );
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
    const html = buildLeconHtml(fiche);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '18mm', bottom: '15mm', left: '18mm' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = {
  buildLeconHtml,
  generateFicheEpsPdfBuffer,
};
