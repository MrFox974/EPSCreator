import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF à partir du contenu HTML d'une leçon
 * @param {HTMLElement} element - L'élément HTML à convertir en PDF
 * @param {string} filename - Le nom du fichier PDF (sans extension)
 */
export const generateLeconPDF = async (element, filename = 'lecon') => {
  try {
    // Options pour html2canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Améliore la qualité
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Calculer les dimensions du PDF
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pdfWidth = 210; // Largeur A4 en mm
    const pdfHeight = (imgHeight * pdfWidth) / imgWidth; // Hauteur proportionnelle
    
    // Créer le PDF
    const pdf = new jsPDF({
      orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    });
    
    // Ajouter l'image au PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Télécharger le PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};

/**
 * Génère le HTML d'une leçon pour le PDF
 * @param {Object} fiche - Les données de la fiche EPS
 * @returns {string} - Le HTML généré
 */
const generateLeconHTML = (fiche) => {
  const parseSituations = (jsonString) => {
    try {
      return JSON.parse(jsonString || '[]');
    } catch {
      return [];
    }
  };

  const situationsEchauffement = parseSituations(fiche.situations_echauffement);
  const situationsApprentissage = parseSituations(fiche.situations_apprentissage);
  const situationsFinale = parseSituations(fiche.situations_finale);

  const formatText = (text) => {
    if (!text) return '';
    return String(text).replace(/\n/g, '<br>');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .header h1 {
          color: #1e3a5f;
          font-size: 36px;
          margin: 0;
        }
        .bandeau {
          background: #1e3a5f;
          color: white;
          padding: 15px;
          text-align: center;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .objet-enseignement {
          background: #d9d9d9;
          padding: 15px;
          margin-bottom: 20px;
        }
        .badges {
          background: #7a9bb8;
          padding: 15px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        .badge {
          display: flex;
        }
        .badge-label {
          background: #1e3a5f;
          color: white;
          padding: 8px 15px;
          font-weight: bold;
        }
        .badge-value {
          background: white;
          color: #1e3a5f;
          padding: 8px 15px;
        }
        .section {
          margin: 30px 0;
        }
        .section-title {
          color: #1e3a5f;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 15px;
          text-align: center;
        }
        .card {
          margin-bottom: 15px;
        }
        .card-header {
          padding: 10px 15px;
          color: white;
          font-weight: bold;
        }
        .card-body {
          border: 2px solid;
          border-top: none;
          padding: 15px;
          background: white;
        }
        .situation-card {
          border: 2px solid;
          border-radius: 8px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .situation-header {
          padding: 10px 15px;
          color: white;
          font-weight: bold;
        }
        .situation-body {
          padding: 15px;
          background: white;
        }
        .situation-field {
          margin-bottom: 10px;
        }
        .situation-field-label {
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .situation-field-value {
          color: #666;
        }
      </style>
    </head>
    <body>
      <!-- En-tête -->
      <div class="header">
        <h1>${formatText(fiche.titre || 'Préparation leçon EPS')}</h1>
      </div>

      <!-- Bandeau -->
      <div class="bandeau">
        ${formatText(fiche.bandeau_titre || '')}
      </div>

      <!-- Objet d'enseignement -->
      <div class="objet-enseignement">
        <strong>OBJET D'ENSEIGNEMENT</strong><br>
        ${formatText(fiche.objet_enseignement || '')}
      </div>

      <!-- Badges -->
      <div class="badges">
        <div class="badge">
          <div class="badge-label">LEÇON</div>
          <div class="badge-value">${formatText(fiche.lecon_numero || '')}</div>
        </div>
        <div class="badge">
          <div class="badge-label">APSA</div>
          <div class="badge-value">${formatText(fiche.apsa || '')}</div>
        </div>
        <div class="badge">
          <div class="badge-label">CLASSE</div>
          <div class="badge-value">${formatText(fiche.classe || '')}</div>
        </div>
        <div class="badge">
          <div class="badge-label">EFFECTIF</div>
          <div class="badge-value">${formatText(fiche.effectif || '')}</div>
        </div>
      </div>

      <!-- Accroche programme -->
      <div class="section">
        <div class="section-title">Accroche programme</div>
        
        <div class="card">
          <div class="card-header" style="background: #92d050;">Champs d'apprentissage :</div>
          <div class="card-body" style="border-color: #92d050; background: #e8f5e0;">
            ${formatText(fiche.champs_apprentissage || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #92d050;">Compétences attendues :</div>
          <div class="card-body" style="border-color: #92d050; background: #e8f5e0;">
            ${formatText(fiche.competences_attendues || '')}
          </div>
        </div>
      </div>

      <!-- Contenus de la leçon -->
      <div class="section">
        <div class="section-title">LES CONTENUS DE LA LEÇON</div>
        
        <div class="card">
          <div class="card-header" style="background: #4a90a4;">Intension pédagogique</div>
          <div class="card-body" style="border-color: #4a90a4;">
            ${formatText(fiche.intension_pedagogique || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #4a90a4;">Intension éducatif</div>
          <div class="card-body" style="border-color: #4a90a4;">
            ${formatText(fiche.intension_educatif || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #4a90a4;">Objectif - vue enseignante</div>
          <div class="card-body" style="border-color: #4a90a4;">
            ${formatText(fiche.objectif_enseignante || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #4a90a4;">Objectif - vue élève</div>
          <div class="card-body" style="border-color: #4a90a4;">
            ${formatText(fiche.objectif_eleve || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #6b7b5a;">QUOI - Le ciblage</div>
          <div class="card-body" style="border-color: #6b7b5a;">
            ${formatText(fiche.quoi_ciblage || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #6b7b5a;">COMMENT - Contenu d'enseignement principal</div>
          <div class="card-body" style="border-color: #6b7b5a;">
            ${formatText(fiche.comment_enseignement || '')}
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="background: #e74c3c;">Points de sécurité</div>
          <div class="card-body" style="border-color: #e74c3c;">
            ${formatText(fiche.points_securite || '')}
          </div>
        </div>
      </div>

      <!-- Situations -->
      <div class="section">
        <div class="section-title">LES SITUATIONS</div>
        
        ${situationsEchauffement.length > 0 ? `
          <h3 style="color: #1e3a5f; font-weight: bold; margin-top: 20px;">Echauffement</h3>
          ${situationsEchauffement.map((sit, idx) => `
            <div class="situation-card" style="border-color: #e74c3c;">
              <div class="situation-header" style="background: #e74c3c;">Situation ${idx + 1}</div>
              <div class="situation-body">
                <div class="situation-field">
                  <div class="situation-field-label">But :</div>
                  <div class="situation-field-value">${formatText(sit.but || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Consigne :</div>
                  <div class="situation-field-value">${formatText(sit.consigne || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Critères de réussite :</div>
                  <div class="situation-field-value">${formatText(sit.criteres_reussite || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Critères de réalisation :</div>
                  <div class="situation-field-value">${formatText(sit.criteres_realisation || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Aménagement :</div>
                  <div class="situation-field-value">${formatText(sit.amenagement || '')}</div>
                </div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${situationsApprentissage.length > 0 ? `
          <h3 style="color: #1e3a5f; font-weight: bold; margin-top: 20px;">Situations d'apprentissages</h3>
          ${situationsApprentissage.map((sit, idx) => `
            <div class="situation-card" style="border-color: #5dade2;">
              <div class="situation-header" style="background: #5dade2;">Situation ${idx + 1}</div>
              <div class="situation-body">
                <div class="situation-field">
                  <div class="situation-field-label">But :</div>
                  <div class="situation-field-value">${formatText(sit.but || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Consigne :</div>
                  <div class="situation-field-value">${formatText(sit.consigne || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Critères de réussite :</div>
                  <div class="situation-field-value">${formatText(sit.criteres_reussite || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Critères de réalisation :</div>
                  <div class="situation-field-value">${formatText(sit.criteres_realisation || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Aménagement :</div>
                  <div class="situation-field-value">${formatText(sit.amenagement || '')}</div>
                </div>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${situationsFinale.length > 0 ? `
          <h3 style="color: #1e3a5f; font-weight: bold; margin-top: 20px;">Situations finale</h3>
          ${situationsFinale.map((sit, idx) => `
            <div class="situation-card" style="border-color: #e74c3c;">
              <div class="situation-header" style="background: #e74c3c;">Situation ${idx + 1}</div>
              <div class="situation-body">
                <div class="situation-field">
                  <div class="situation-field-label">But :</div>
                  <div class="situation-field-value">${formatText(sit.but || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Consigne :</div>
                  <div class="situation-field-value">${formatText(sit.consigne || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Critères de réussite :</div>
                  <div class="situation-field-value">${formatText(sit.criteres_reussite || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Critères de réalisation :</div>
                  <div class="situation-field-value">${formatText(sit.criteres_realisation || '')}</div>
                </div>
                <div class="situation-field">
                  <div class="situation-field-label">Aménagement :</div>
                  <div class="situation-field-value">${formatText(sit.amenagement || '')}</div>
                </div>
              </div>
            </div>
          `).join('')}
        ` : ''}
      </div>
    </body>
    </html>
  `;
};

/**
 * Génère un PDF à partir des données d'une leçon
 * @param {Object} fiche - Les données de la fiche EPS
 * @param {string} filename - Le nom du fichier PDF (sans extension)
 */
export const generateLeconPDFFromData = async (fiche, filename = 'lecon') => {
  try {
    // Créer un iframe temporaire pour isoler le HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Écrire le HTML dans l'iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(generateLeconHTML(fiche));
    iframeDoc.close();

    // Attendre que le contenu soit chargé
    await new Promise((resolve) => {
      iframe.onload = resolve;
      if (iframe.contentDocument.readyState === 'complete') {
        resolve();
      }
    });

    // Attendre un peu plus pour que les styles soient appliqués
    await new Promise(resolve => setTimeout(resolve, 200));

    // Générer le PDF depuis le body de l'iframe
    const bodyElement = iframeDoc.body;
    await generateLeconPDF(bodyElement, filename);

    // Nettoyer
    document.body.removeChild(iframe);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};
