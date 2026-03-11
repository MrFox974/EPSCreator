/**
 * Page Projet de séquence - Blocs de leçons (L1, L2, ...) avec Objectif, QUOI, COMMENT
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditableField from '../../components/EditableField';
import SavePopup from '../../components/SavePopup';
import { downloadSequenceProjetPdf, getSequenceById, updateSequence } from '../../../utils/sequence.api';
import { getActiviteById } from '../../../utils/activite.api';

const defaultBlock = (index) => ({
  titre: `L${index + 1} - [à compléter]`,
  objectif: '',
  quoi: '',
  comment: '',
});

function parseTableauLecons(str) {
  try {
    const arr = JSON.parse(str || '[]');
    if (!Array.isArray(arr) || arr.length === 0) {
      return [defaultBlock(0)];
    }
    return arr.map((item, i) => ({
      titre: item.titre ?? defaultBlock(i).titre,
      objectif: item.objectif ?? '',
      quoi: item.quoi ?? '',
      comment: item.comment ?? '',
    }));
  } catch {
    return [defaultBlock(0)];
  }
}

function SequenceProjet() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sequence, setSequence] = useState(null);
  const [activite, setActivite] = useState(null);
  const [blocks, setBlocks] = useState([defaultBlock(0)]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const sequenceIdRef = useRef(id);
  const blocksRef = useRef(blocks);

  useEffect(() => {
    sequenceIdRef.current = id;
  }, [id]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getSequenceById(id);
        setSequence(data.sequence);
        setBlocks(parseTableauLecons(data.sequence.tableau_lecons));
        if (data.sequence.activite_support_id) {
          const act = await getActiviteById(data.sequence.activite_support_id);
          setActivite(act.activite);
        }
      } catch (error) {
        console.error('Erreur chargement séquence:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const saveTableau = useCallback(async (newBlocks) => {
    const currentId = sequenceIdRef.current;
    if (!currentId) return;
    setSaveStatus('saving');
    try {
      await updateSequence(currentId, {
        tableau_lecons: JSON.stringify(newBlocks),
      });
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setErrorMessage('Erreur de connexion');
      setSaveStatus('error');
    }
  }, []);

  const updateBlock = useCallback((index, field, value) => {
    const next = blocksRef.current.map((b, i) =>
      i === index ? { ...b, [field]: value } : b
    );
    setBlocks(next);
    saveTableau(next);
  }, [saveTableau]);

  const saveDate = useCallback(async (value) => {
    const currentId = sequenceIdRef.current;
    if (!currentId) return;
    setSaveStatus('saving');
    try {
      await updateSequence(currentId, { date: value || null });
      setSequence((prev) => (prev ? { ...prev, date: value || null } : null));
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erreur sauvegarde date:', error);
      setSaveStatus('error');
    }
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    try {
      if (!id) return;
      setDownloadingPdf(true);
      const response = await downloadSequenceProjetPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projet_sequence_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement PDF projet:', error);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }, [id]);

  const addBlock = useCallback(() => {
    const next = [...blocksRef.current, defaultBlock(blocksRef.current.length)];
    setBlocks(next);
    saveTableau(next);
  }, [saveTableau]);

  const handleGoBack = () => {
    if (sequence?.activite_support_id) {
      navigate(`/activite/${sequence.activite_support_id}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-[#1e3a5f] text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-slate-600 hover:text-[#1e3a5f] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour à l'activité</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5a87] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            title="Télécharger en PDF"
          >
            {downloadingPdf ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span className="font-medium">Télécharger PDF</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-center gap-6">
            <div className="flex-1 h-[4px] bg-[#1e3a5f]" />
            <h1 className="text-[#1e3a5f] text-3xl md:text-4xl font-bold whitespace-nowrap">
              Projet de séquence
            </h1>
            <div className="flex-1 h-[4px] bg-[#1e3a5f]" />
          </div>
          {activite && (
            <p className="text-center text-slate-500 mt-2">
              {activite.nom}
              {activite.classe?.nom ? ` - ${activite.classe.nom}` : ''}
            </p>
          )}
          {/* Date éditable sous le titre - clic + icône calendrier */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {isEditingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  onBlur={() => {
                    saveDate(tempDate);
                    setIsEditingDate(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveDate(tempDate);
                      setIsEditingDate(false);
                    }
                    if (e.key === 'Escape') setIsEditingDate(false);
                  }}
                  className="border border-[#1e3a5f]/30 rounded-lg px-3 py-2 text-[#1e3a5f] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50"
                  autoFocus
                />
                <span className="text-slate-500 text-xs">Entrée pour enregistrer</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempDate(sequence?.date || new Date().toISOString().slice(0, 10));
                  setIsEditingDate(true);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors text-[#1e3a5f] border border-transparent hover:border-[#1e3a5f]/20"
                title="Cliquez pour modifier la date"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {sequence?.date
                    ? new Date(sequence.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Cliquez pour ajouter une date'}
                </span>
              </button>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {blocks.map((block, index) => (
            <div
              key={index}
              className="rounded-xl border-2 border-[#92d050] overflow-hidden bg-white shadow-sm"
            >
              <div className="bg-[#92d050] px-4 py-3">
                <h2 className="text-white font-semibold text-base">
                  Leçon {index + 1}
                </h2>
              </div>
              <div className="p-4 space-y-4 bg-[#e8f5e0]/30 border-t-0 border-2 border-[#92d050] border-t-0">
                <div>
                  <label className="block text-sm font-semibold text-[#92d050] mb-1">
                    Titre de la leçon
                  </label>
                  <div className="rounded-lg p-2 bg-transparent">
                    <EditableField
                      value={block.titre}
                      onChange={(_, val) => updateBlock(index, 'titre', val)}
                      fieldName={`titre-${index}`}
                      placeholder="L1 - [à compléter]"
                      richText
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#92d050] mb-1">
                    Objectif
                  </label>
                  <div className="rounded-lg p-2 bg-transparent">
                    <EditableField
                      value={block.objectif}
                      onChange={(_, val) => updateBlock(index, 'objectif', val)}
                      fieldName={`objectif-${index}`}
                      placeholder="Objectif de la leçon..."
                      multiline
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#92d050] mb-1">
                    QUOI (apprendre)
                  </label>
                  <div className="rounded-lg p-2 bg-transparent">
                    <EditableField
                      value={block.quoi}
                      onChange={(_, val) => updateBlock(index, 'quoi', val)}
                      fieldName={`quoi-${index}`}
                      placeholder="Ce que les élèves apprennent..."
                      multiline
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#92d050] mb-1">
                    COMMENT
                  </label>
                  <div className="rounded-lg p-2 bg-transparent">
                    <EditableField
                      value={block.comment}
                      onChange={(_, val) => updateBlock(index, 'comment', val)}
                      fieldName={`comment-${index}`}
                      placeholder="Comment (situation, consigne...)"
                      multiline
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addBlock}
            className="w-full rounded-xl border-2 border-dashed border-[#92d050] bg-[#e8f5e0]/50 hover:bg-[#e8f5e0] py-4 flex items-center justify-center gap-2 text-[#1e3a5f] font-semibold transition-colors"
            title="Ajouter une leçon"
          >
            <span className="w-8 h-8 rounded-full bg-[#92d050] text-white flex items-center justify-center text-xl">
              +
            </span>
            <span>Ajouter une leçon (L{blocks.length + 1})</span>
          </button>
        </div>
      </div>

      <SavePopup status={saveStatus} errorMessage={errorMessage} />
    </div>
  );
}

export default SequenceProjet;
