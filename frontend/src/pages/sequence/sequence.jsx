/**
 * Page Projet de Séquence EPS
 * Structure inspirée du document PDF
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditableField from '../../components/EditableField';
import SavePopup from '../../components/SavePopup';
import { getSequenceById, updateSequence } from '../../../utils/sequence.api';
import { getActiviteById } from '../../../utils/activite.api';

// Données par défaut pour une nouvelle séquence
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
  caracteristiques_eleves: '',
  conditions_enseignement: '',
  situation_observation: '',
  comportements_observes: '',
  hypotheses_explicatives: '',
  tableau_lecons: '[]',
  mode_groupement: '',
  roles: '',
};

function Sequence() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [sequence, setSequence] = useState(defaultSequenceData);
  const [activite, setActivite] = useState(null);
  const [loading, setLoading] = useState(true);
  // Status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs pour éviter les closures stales
  const sequenceRef = useRef(sequence);
  const sequenceIdRef = useRef(id);
  
  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);
  
  useEffect(() => {
    sequenceIdRef.current = id;
  }, [id]);

  // Charger la séquence
  useEffect(() => {
    const loadSequence = async () => {
      if (!id) return;
      
      try {
        const data = await getSequenceById(id);
        const mergedData = { ...defaultSequenceData, ...data.sequence };
        setSequence(mergedData);
        
        // Charger l'activité associée
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

  // Sauvegarder la séquence
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

  // Gérer le changement d'un champ
  const handleFieldChange = useCallback((fieldName, value) => {
    const currentSequence = sequenceRef.current;
    const updatedSequence = { ...currentSequence, [fieldName]: value };
    setSequence(updatedSequence);
    saveSequence(updatedSequence);
  }, [saveSequence]);

  // Parser JSON safely
  const parseJSON = (str, fallback = []) => {
    try {
      return JSON.parse(str || '[]');
    } catch {
      return fallback;
    }
  };

  // Gérer les items d'une liste JSON
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

  // Retour à l'activité
  const handleGoBack = () => {
    if (sequence.activite_support_id) {
      navigate(`/activite/${sequence.activite_support_id}`);
    } else {
      navigate('/');
    }
  };

  // Composant pour un champ éditable simple
  const SimpleEditable = ({ fieldName, placeholder = 'Cliquez pour éditer...' }) => (
    <EditableField
      value={sequence[fieldName] || ''}
      onChange={handleFieldChange}
      fieldName={fieldName}
      placeholder={placeholder}
    />
  );

  // Composant pour un champ éditable multiline
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1e3a5f] border-t-transparent"></div>
      </div>
    );
  }

  const socleCommun = parseJSON(sequence.socle_commun);
  const attendusCycle = parseJSON(sequence.attendus_fin_cycle);

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      {/* Barre de navigation */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3">
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
        
        {/* En-tête */}
        <header className="py-6 px-6 bg-white">
          <div className="flex items-center justify-center gap-6">
            <div className="flex-1 h-[4px] bg-[#2e7d32]"></div>
            <h1 className="text-[#2e7d32] text-3xl md:text-4xl font-bold whitespace-nowrap">
              <SimpleEditable fieldName="titre" placeholder="Projet de séquence" />
            </h1>
            <div className="flex-1 h-[4px] bg-[#2e7d32]"></div>
          </div>
          {activite && (
            <p className="text-center text-slate-500 mt-2">
              {activite.nom} {activite.classe?.nom ? `- ${activite.classe.nom}` : ''}
            </p>
          )}
        </header>

        {/* Période */}
        <section className="px-6 mb-6">
          <div className="bg-[#e8f5e9] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-[#2e7d32] font-semibold">Période :</span>
              <div className="flex-1">
                <SimpleEditable fieldName="periode" placeholder="Ex: Période 2" />
              </div>
            </div>
          </div>
        </section>

        {/* Socle commun */}
        <section className="px-6 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#2e7d32] font-bold text-lg">Socle commun</h2>
              <button
                onClick={() => handleAddListItem('socle_commun', 'D : ')}
                className="text-[#2e7d32] hover:bg-[#e8f5e9] p-1 rounded transition-colors"
                title="Ajouter un domaine"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {socleCommun.map((domaine, index) => (
                <div key={index} className="flex items-start gap-2 group">
                  <div className="flex-1 bg-white rounded-lg p-2">
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
                <p className="text-slate-400 text-sm italic">Cliquez sur + pour ajouter un domaine</p>
              )}
            </div>
          </div>
        </section>

        {/* Projet d'établissement */}
        <section className="px-6 mb-6">
          <div className="bg-[#fff3e0] rounded-xl p-4">
            <h2 className="text-[#e65100] font-bold text-lg mb-2">Projet d'établissement</h2>
            <div className="bg-white rounded-lg p-3">
              <span className="text-slate-600 font-medium">Axe prioritaire : </span>
              <MultilineEditable fieldName="projet_etablissement" placeholder="Ex: Favoriser la réussite de tous les élèves" />
            </div>
          </div>
        </section>

        {/* Projet EPS */}
        <section className="px-6 mb-6">
          <div className="bg-[#e3f2fd] rounded-xl p-4">
            <h2 className="text-[#1565c0] font-bold text-lg mb-3">Projet EPS</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <span className="text-slate-600 font-medium">Axe prioritaire : </span>
                <MultilineEditable fieldName="projet_eps_axe_prioritaire" placeholder="Ex: Faire réussir tous les élèves" />
              </div>
              <div className="bg-white rounded-lg p-3">
                <span className="text-slate-600 font-medium">Axe secondaire : </span>
                <MultilineEditable fieldName="projet_eps_axe_secondaire" placeholder="Ex: Faire vivre aux élèves une culture commune" />
              </div>
            </div>
          </div>
        </section>

        {/* Attendus de fin de cycle */}
        <section className="px-6 mb-6">
          <div className="bg-[#fce4ec] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#c2185b] font-bold text-lg">Attendus de fin de cycle</h2>
              <button
                onClick={() => handleAddListItem('attendus_fin_cycle', 'AFC : ')}
                className="text-[#c2185b] hover:bg-[#f8bbd9] p-1 rounded transition-colors"
                title="Ajouter un attendu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {attendusCycle.map((attendu, index) => (
                <div key={index} className="flex items-start gap-2 group">
                  <div className="flex-1 bg-white rounded-lg p-2">
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
                <p className="text-slate-400 text-sm italic">Cliquez sur + pour ajouter un attendu</p>
              )}
            </div>
          </div>
        </section>

        {/* Projet de classe */}
        <section className="px-6 mb-6">
          <div className="bg-[#f3e5f5] rounded-xl p-4">
            <h2 className="text-[#7b1fa2] font-bold text-lg mb-3">Projet de classe - Axes de transformation</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <span className="text-[#7b1fa2] font-semibold">Moteur : </span>
                <MultilineEditable fieldName="projet_classe_moteur" placeholder="Ex: Passage d'une motricité non-réactive à une motricité DYNAMIQUE, REACTIVE et PLANIFIEE" />
              </div>
              <div className="bg-white rounded-lg p-3">
                <span className="text-[#7b1fa2] font-semibold">Méthodologique : </span>
                <MultilineEditable fieldName="projet_classe_methodologique" placeholder="Ex: Développement de la PRISE D'INFORMATION..." />
              </div>
              <div className="bg-white rounded-lg p-3">
                <span className="text-[#7b1fa2] font-semibold">Sociale : </span>
                <MultilineEditable fieldName="projet_classe_sociale" placeholder="Ex: Passage de l'attentisme à l'ENGAGEMENT COLLECTIF..." />
              </div>
            </div>
          </div>
        </section>

        {/* Caractéristiques des élèves */}
        <section className="px-6 mb-6">
          <div className="bg-slate-100 rounded-xl p-4">
            <h2 className="text-slate-700 font-bold text-lg mb-2">Caractéristiques des élèves</h2>
            <div className="bg-white rounded-lg p-3">
              <MultilineEditable fieldName="caracteristiques_eleves" placeholder="Décrire les caractéristiques des élèves..." />
            </div>
          </div>
        </section>

        {/* Conditions d'enseignement */}
        <section className="px-6 mb-6">
          <div className="bg-slate-100 rounded-xl p-4">
            <h2 className="text-slate-700 font-bold text-lg mb-2">Conditions d'enseignement</h2>
            <div className="bg-white rounded-lg p-3">
              <MultilineEditable fieldName="conditions_enseignement" placeholder="Ex: 2 grands terrain de 26 x 13. Des ballons de taille 6-7. 4 paniers..." />
            </div>
          </div>
        </section>

        {/* Mode de groupement & Rôles */}
        <section className="px-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#e8eaf6] rounded-xl p-4">
              <h2 className="text-[#3949ab] font-bold text-lg mb-2">Mode de groupement</h2>
              <div className="bg-white rounded-lg p-3">
                <MultilineEditable fieldName="mode_groupement" placeholder="Ex: Affinitaire - corpulence" />
              </div>
            </div>
            <div className="bg-[#e8eaf6] rounded-xl p-4">
              <h2 className="text-[#3949ab] font-bold text-lg mb-2">Rôles</h2>
              <div className="bg-white rounded-lg p-3">
                <MultilineEditable fieldName="roles" placeholder="Ex: PB, NPB, D, Observateur, Arbitre" />
              </div>
            </div>
          </div>
        </section>

        {/* Situation d'observation / Évaluation diagnostique */}
        <section className="px-6 mb-6">
          <div className="bg-[#fff8e1] rounded-xl p-4">
            <h2 className="text-[#f57f17] font-bold text-lg mb-2">Situation d'observation / Évaluation diagnostique</h2>
            <div className="bg-white rounded-lg p-3">
              <MultilineEditable fieldName="situation_observation" placeholder="Décrire la situation d'observation ou d'évaluation diagnostique..." />
            </div>
          </div>
        </section>

        {/* Comportements observés */}
        <section className="px-6 mb-6">
          <div className="bg-[#ffebee] rounded-xl p-4">
            <h2 className="text-[#c62828] font-bold text-lg mb-2">Comportements observés</h2>
            <div className="bg-white rounded-lg p-3">
              <MultilineEditable fieldName="comportements_observes" placeholder="Décrire les comportements observés chez les élèves..." />
            </div>
          </div>
        </section>

        {/* Hypothèses explicatives */}
        <section className="px-6 mb-6">
          <div className="bg-[#e0f7fa] rounded-xl p-4">
            <h2 className="text-[#00838f] font-bold text-lg mb-2">Hypothèses explicatives et problème à résoudre</h2>
            <div className="bg-white rounded-lg p-3">
              <MultilineEditable fieldName="hypotheses_explicatives" placeholder="Expliquer les hypothèses et le problème à résoudre..." />
            </div>
          </div>
        </section>

        {/* Tableau des leçons (automatique depuis l'activité) */}
        <section className="px-6 mb-8">
          <div className="bg-[#2e7d32] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Tableau des leçons</h2>
              <span className="text-white/60 text-sm">
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
                    <div className="text-[#2e7d32] font-bold text-sm mb-1">
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

      {/* Popup de sauvegarde */}
      <SavePopup 
        status={saveStatus}
        errorMessage={errorMessage}
      />
    </div>
  );
}

export default Sequence;
