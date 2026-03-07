/**
 * Page Références de la séquence EPS
 * Design aligné sur la page Leçon (eps-lecon)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditableField from '../../components/EditableField';
import SavePopup from '../../components/SavePopup';
import { getSequenceById, updateSequence } from '../../../utils/sequence.api';
import { getActiviteById } from '../../../utils/activite.api';

const defaultSequenceData = {
  titre: 'Projet de séquence',
  periode: '',
  socle_commun: '[]',
  projet_etablissement: '',
  projet_eps_axe_prioritaire: '',
  projet_eps_axe_secondaire: '',
  attendus_fin_cycle: '[]',
  projet_classe_moteur: '',
  projet_classe_methodologique: '',
  projet_classe_sociale: '',
  conditions_enseignement: '',
  situation_observation: '',
  comportements_observes: '',
  hypotheses_explicatives: '',
  tableau_lecons: '[]',
};

function Sequence() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sequence, setSequence] = useState(defaultSequenceData);
  const [activite, setActivite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const sequenceRef = useRef(sequence);
  const sequenceIdRef = useRef(id);

  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  useEffect(() => {
    sequenceIdRef.current = id;
  }, [id]);

  useEffect(() => {
    const loadSequence = async () => {
      if (!id) return;
      try {
        const data = await getSequenceById(id);
        const mergedData = { ...defaultSequenceData, ...data.sequence };
        setSequence(mergedData);
        if (data.sequence.activite_support_id) {
          const activiteData = await getActiviteById(data.sequence.activite_support_id);
          setActivite(activiteData.activite);
        }
      } catch (error) {
        console.error('Erreur chargement séquence:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadSequence();
  }, [id, navigate]);

  const saveSequence = useCallback(async (dataToSave) => {
    const currentId = sequenceIdRef.current;
    if (!currentId) return;
    setSaveStatus('saving');
    try {
      await updateSequence(currentId, dataToSave);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setErrorMessage('Erreur de connexion');
      setSaveStatus('error');
    }
  }, []);

  const handleFieldChange = useCallback((fieldName, value) => {
    const currentSequence = sequenceRef.current;
    const updatedSequence = { ...currentSequence, [fieldName]: value };
    setSequence(updatedSequence);
    saveSequence(updatedSequence);
  }, [saveSequence]);

  const parseJSON = (str, fallback = []) => {
    try {
      return JSON.parse(str || '[]');
    } catch {
      return fallback;
    }
  };

  const handleListItemChange = useCallback((fieldName, index, value) => {
    const currentSequence = sequenceRef.current;
    const items = parseJSON(currentSequence[fieldName]);
    items[index] = value;
    handleFieldChange(fieldName, JSON.stringify(items));
  }, [handleFieldChange]);

  const handleAddListItem = useCallback((fieldName, defaultValue = '') => {
    const currentSequence = sequenceRef.current;
    const items = parseJSON(currentSequence[fieldName]);
    items.push(defaultValue);
    handleFieldChange(fieldName, JSON.stringify(items));
  }, [handleFieldChange]);

  const handleRemoveListItem = useCallback((fieldName, index) => {
    const currentSequence = sequenceRef.current;
    const items = parseJSON(currentSequence[fieldName]);
    items.splice(index, 1);
    handleFieldChange(fieldName, JSON.stringify(items));
  }, [handleFieldChange]);

  const handleGoBack = () => {
    if (sequence.activite_support_id) {
      navigate(`/activite/${sequence.activite_support_id}`);
    } else {
      navigate('/');
    }
  };

  const MultilineEditable = ({ fieldName, placeholder = 'Cliquez pour éditer...' }) => (
    <EditableField
      value={sequence[fieldName] || ''}
      onChange={handleFieldChange}
      fieldName={fieldName}
      placeholder={placeholder}
      multiline
    />
  );

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-[#1e3a5f] text-xl">Chargement...</div>
      </div>
    );
  }

  const socleCommun = parseJSON(sequence.socle_commun);
  const attendusCycle = parseJSON(sequence.attendus_fin_cycle);

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      {/* Barre de navigation - même style que la leçon */}
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

      <div className="max-w-5xl mx-auto overflow-hidden break-words">
        {/* En-tête - Références de la séquence (design leçon) */}
        <header className="py-6 px-6 bg-white">
          <div className="flex items-center justify-center gap-6">
            <div className="flex-1 h-[4px] bg-[#1e3a5f]"></div>
            <h1 className="text-[#1e3a5f] text-4xl md:text-5xl font-bold whitespace-nowrap">
              Références de la séquence
            </h1>
            <div className="flex-1 h-[4px] bg-[#1e3a5f]"></div>
          </div>
        </header>

        {/* Bandeau bleu foncé - contexte (activité / classe) */}
        <div className="bg-[#1e3a5f] py-3 px-6">
          <p className="text-white text-center text-base md:text-lg font-semibold tracking-wide">
            {activite?.nom || sequence.titre || 'Projet de séquence'}
            {activite?.classe?.nom ? ` - ${activite.classe.nom}` : ''}
          </p>
        </div>

        {/* Sections dans l'ordre demandé - style Accroche programme (leçon) */}
        <div className="mx-6 mt-8">
          <h2 className="text-[#1e3a5f] font-bold text-2xl mb-6">
            Références
          </h2>

          {/* 1. Socle commun */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md flex items-center justify-between">
              <h3 className="text-white font-semibold text-base">Socle commun</h3>
              <button
                onClick={() => handleAddListItem('socle_commun', 'D : ')}
                className="bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors text-xl font-bold"
                title="Ajouter un domaine"
              >
                +
              </button>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="space-y-2">
                {socleCommun.map((domaine, index) => (
                  <div key={index} className="flex items-start gap-2 group">
                    <div className="flex-1 bg-white rounded-lg p-2 border border-[#92d050]/30">
                      <EditableField
                        value={domaine}
                        onChange={(val) => handleListItemChange('socle_commun', index, val)}
                        placeholder="Ex: D1.4 : Les langages des arts et du corps"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveListItem('socle_commun', index)}
                      className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {socleCommun.length === 0 && (
                  <p className="text-[#333] text-sm italic">Cliquez sur + pour ajouter un domaine</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Projet établissement */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Projet établissement</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base">
                <MultilineEditable fieldName="projet_etablissement" placeholder="Ex: Favoriser la réussite de tous les élèves" />
              </div>
            </div>
          </div>

          {/* 3. Projet EPS */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Projet EPS</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md space-y-4">
              <div>
                <span className="text-[#333] font-medium block mb-1">Axe prioritaire :</span>
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="projet_eps_axe_prioritaire" placeholder="Ex: Faire réussir tous les élèves" />
                </div>
              </div>
              <div>
                <span className="text-[#333] font-medium block mb-1">Axe secondaire :</span>
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="projet_eps_axe_secondaire" placeholder="Ex: Faire vivre aux élèves une culture commune" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Attendus de fin de cycle */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md flex items-center justify-between">
              <h3 className="text-white font-semibold text-base">Attendus de fin de cycle</h3>
              <button
                onClick={() => handleAddListItem('attendus_fin_cycle', 'AFC : ')}
                className="bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors text-xl font-bold"
                title="Ajouter un attendu"
              >
                +
              </button>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="space-y-2">
                {attendusCycle.map((attendu, index) => (
                  <div key={index} className="flex items-start gap-2 group">
                    <div className="flex-1 bg-white rounded-lg p-2 border border-[#92d050]/30">
                      <EditableField
                        value={attendu}
                        onChange={(val) => handleListItemChange('attendus_fin_cycle', index, val)}
                        placeholder="Ex: AFC1 : Réaliser des actions décisives..."
                        multiline
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveListItem('attendus_fin_cycle', index)}
                      className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {attendusCycle.length === 0 && (
                  <p className="text-[#333] text-sm italic">Cliquez sur + pour ajouter un attendu</p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Projet de classe */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Projet de classe</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md space-y-4">
              <div>
                <span className="text-[#333] font-medium block mb-1">Moteur :</span>
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="projet_classe_moteur" placeholder="Ex: Passage d'une motricité non-réactive à une motricité DYNAMIQUE, REACTIVE et PLANIFIEE" />
                </div>
              </div>
              <div>
                <span className="text-[#333] font-medium block mb-1">Méthodologique :</span>
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="projet_classe_methodologique" placeholder="Ex: Développement de la PRISE D'INFORMATION..." />
                </div>
              </div>
              <div>
                <span className="text-[#333] font-medium block mb-1">Sociale :</span>
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="projet_classe_sociale" placeholder="Ex: Passage de l'attentisme à l'ENGAGEMENT COLLECTIF..." />
                </div>
              </div>
            </div>
          </div>

          {/* 6. Condition d'enseignement */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Condition d'enseignement</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base">
                <MultilineEditable fieldName="conditions_enseignement" placeholder="Ex: 2 grands terrains de 26 x 13. Des ballons de taille 6-7. 4 paniers..." />
              </div>
            </div>
          </div>

          {/* 7. Situation d'observation / Évaluation diagnostique */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Situation d'observation / Évaluation diagnostique</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base">
                <MultilineEditable fieldName="situation_observation" placeholder="Décrire la situation d'observation ou d'évaluation diagnostique..." />
              </div>
            </div>
          </div>

          {/* 8. Comportement observés */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Comportement observés</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base">
                <MultilineEditable fieldName="comportements_observes" placeholder="Décrire les comportements observés chez les élèves..." />
              </div>
            </div>
          </div>

          {/* 9. Hypothèses explicatives / problème à résoudre */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Hypothèses explicatives / problème à résoudre</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base">
                <MultilineEditable fieldName="hypotheses_explicatives" placeholder="Expliquer les hypothèses et le problème à résoudre..." />
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des leçons - navigation vers les leçons (style leçon : bandeau bleu foncé) */}
        <section className="mx-6 mb-8 mt-12">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
            <h2 className="text-[#1e3a5f] text-2xl md:text-3xl font-bold whitespace-nowrap">
              Tableau des leçons
            </h2>
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
          </div>
          <div className="bg-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/80 text-sm">
                {activite?.lecons?.length || 0} leçon(s) dans cette activité
              </span>
            </div>
            {!activite?.lecons || activite.lecons.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/70 mb-3">Aucune leçon dans cette activité</p>
                <button
                  onClick={() => navigate(`/activite/${sequence.activite_support_id}`)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Créer des leçons
                </button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...(activite.lecons || [])]
                  .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                  .map((lecon, index) => (
                    <div
                      key={lecon.id}
                      className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/lecon/${lecon.id}`)}
                    >
                      <div className="text-[#1e3a5f] font-bold text-sm mb-1">
                        Leçon {lecon.lecon_numero || index + 1}
                      </div>
                      <div className="text-slate-700 text-sm line-clamp-3">
                        {lecon.titre || 'Sans titre'}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <SavePopup status={saveStatus} errorMessage={errorMessage} />
    </div>
  );
}

export default Sequence;
