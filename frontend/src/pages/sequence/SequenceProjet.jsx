/**
 * Page Projet de séquence - Blocs de leçons (L1, L2, ...) avec Objectif, QUOI, COMMENT
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditableField from '../../components/EditableField';
import SavePopup from '../../components/SavePopup';
import { getSequenceById, updateSequence } from '../../../utils/sequence.api';
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
                  <label className="block text-sm font-semibold text-[#1e3a5f] mb-1">
                    Titre de la leçon
                  </label>
                  <div className="bg-white rounded-lg p-2 border border-[#92d050]/40">
                    <EditableField
                      value={block.titre}
                      onChange={(val) => updateBlock(index, 'titre', val)}
                      fieldName={`titre-${index}`}
                      placeholder="L1 - [à compléter]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1e3a5f] mb-1">
                    Objectif
                  </label>
                  <div className="bg-white rounded-lg p-2 border border-[#92d050]/40">
                    <EditableField
                      value={block.objectif}
                      onChange={(val) => updateBlock(index, 'objectif', val)}
                      fieldName={`objectif-${index}`}
                      placeholder="Objectif de la leçon..."
                      multiline
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1e3a5f] mb-1">
                    QUOI (apprendre)
                  </label>
                  <div className="bg-white rounded-lg p-2 border border-[#92d050]/40">
                    <EditableField
                      value={block.quoi}
                      onChange={(val) => updateBlock(index, 'quoi', val)}
                      fieldName={`quoi-${index}`}
                      placeholder="Ce que les élèves apprennent..."
                      multiline
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1e3a5f] mb-1">
                    COMMENT
                  </label>
                  <div className="bg-white rounded-lg p-2 border border-[#92d050]/40">
                    <EditableField
                      value={block.comment}
                      onChange={(val) => updateBlock(index, 'comment', val)}
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
