/**
 * Page EPS Leçon - Préparation leçon EPS
 * Version éditable avec sauvegarde en base de données
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditableField from '../../components/EditableField';
import SavePopup from '../../components/SavePopup';
import SituationCard from '../../components/SituationCard';
import ConfirmModal from '../../components/ConfirmModal';
import { getFicheById, updateFiche } from '../../../utils/fiche-eps.api';
import { generateLeconPDFFromData } from '../../../utils/pdf-generator';

// Situation vide par défaut
const emptySituation = {
  but: '',
  consigne: '',
  criteres_reussite: '',
  criteres_realisation: '',
  amenagement: ''
};

// Données par défaut pour une nouvelle fiche (avec placeholders)
const defaultFicheData = {
  titre: 'Préparation leçon EPS',
  date: null,
  bandeau_titre: '',
  objet_enseignement: '',
  lecon_numero: '',
  apsa: '',
  classe: '',
  effectif: '',
  champs_apprentissage: '',
  competences_attendues: '',
  intension_pedagogique: '',
  intension_educatif: '',
  objectif_enseignante: '',
  objectif_eleve: '',
  quoi_ciblage: '',
  comment_enseignement: '',
  points_securite: '',
  situations_apprentissages: '',
  generale: '',
  observations_attendues: '',
  regulation: '',
  // Tableaux de situations (JSON stringifié en base)
  situations_echauffement: JSON.stringify([{ ...emptySituation }]),
  situations_apprentissage: JSON.stringify([{ ...emptySituation }]),
  situations_finale: JSON.stringify([{ ...emptySituation }]),
  rangement_bilan: JSON.stringify({
    analyse_reflexive: '',
  }),
};

const defaultRangementBilan = {
  analyse_reflexive: '',
};

function EpsLecon() {
  // Récupérer l'ID depuis l'URL
  const { id } = useParams();
  const navigate = useNavigate();
  
  // État de la fiche
  const [ficheId, setFicheId] = useState(id ? parseInt(id) : null);
  const [fiche, setFiche] = useState(defaultFicheData);
  const [loading, setLoading] = useState(true);
  // Status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs pour éviter les problèmes de closure
  const ficheIdRef = useRef(ficheId);
  const ficheRef = useRef(fiche);
  
  // Mettre à jour les refs quand les états changent
  useEffect(() => {
    ficheIdRef.current = ficheId;
  }, [ficheId]);
  
  useEffect(() => {
    ficheRef.current = fiche;
  }, [fiche]);
  
  // État pour la modal de confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    index: null
  });

  // Date éditable sous le titre (clic pour modifier)
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');

  // Parse les situations depuis JSON (utilise la ref pour avoir la valeur à jour)
  const getSituations = useCallback((type, ficheData = null) => {
    const currentFiche = ficheData || ficheRef.current;
    const key = `situations_${type}`;
    try {
      const parsed = JSON.parse(currentFiche[key] || '[]');
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  // Parse les données de rangement + bilan (JSON)
  const getRangementBilan = useCallback((ficheData = null) => {
    const currentFiche = ficheData || ficheRef.current;
    try {
      const parsed = JSON.parse(currentFiche.rangement_bilan || '{}');
      return {
        ...defaultRangementBilan,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      };
    } catch {
      return { ...defaultRangementBilan };
    }
  }, []);

  // Charger la fiche au montage
  useEffect(() => {
    const loadFiche = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await getFicheById(id);
        if (data.fiche) {
          // Merger avec les valeurs par défaut pour les champs NULL/vides
          const mergedFiche = { ...defaultFicheData };
          Object.keys(data.fiche).forEach(key => {
            if (data.fiche[key] !== null && data.fiche[key] !== '') {
              mergedFiche[key] = data.fiche[key];
            }
          });
          
          // S'assurer que les situations ont des valeurs valides
          ['situations_echauffement', 'situations_apprentissage', 'situations_finale'].forEach(key => {
            if (!mergedFiche[key] || mergedFiche[key] === 'null') {
              mergedFiche[key] = '[]';
            } else {
              try {
                const parsedSituations = JSON.parse(mergedFiche[key]);
                if (!Array.isArray(parsedSituations)) {
                  mergedFiche[key] = '[]';
                }
              } catch {
                mergedFiche[key] = '[]';
              }
            }
          });
          
          setFiche(mergedFiche);
          setFicheId(data.fiche.id);
          ficheRef.current = mergedFiche;
          ficheIdRef.current = data.fiche.id;
        }
      } catch (error) {
        console.error('Erreur chargement fiche:', error);
        // Rediriger vers le dashboard si la fiche n'existe pas
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadFiche();
  }, [id, navigate]);

  // Sauvegarde en base de données (utilise les refs pour avoir les valeurs à jour)
  const saveFiche = useCallback(async (newFiche) => {
    setSaveStatus('saving');
    setErrorMessage('');
    
    try {
      const currentFicheId = ficheIdRef.current;
      if (currentFicheId) {
        await updateFiche(currentFicheId, newFiche);
      }
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setSaveStatus('error');
      setErrorMessage('Erreur de connexion');
    }
  }, []);

  // Gérer le changement d'un champ simple - sauvegarde automatique
  const handleFieldChange = useCallback(async (fieldName, value) => {
    const currentFiche = ficheRef.current;
    const newFiche = { ...currentFiche, [fieldName]: value };
    setFiche(newFiche);
    ficheRef.current = newFiche;
    await saveFiche(newFiche);
  }, [saveFiche]);

  // Gérer le changement d'un champ d'une situation
  const handleSituationFieldChange = useCallback(async (type, index, fieldName, value) => {
    const currentFiche = ficheRef.current;
    const situations = getSituations(type, currentFiche);
    situations[index] = { ...situations[index], [fieldName]: value };
    
    const key = `situations_${type}`;
    const newFiche = { ...currentFiche, [key]: JSON.stringify(situations) };
    setFiche(newFiche);
    ficheRef.current = newFiche;
    await saveFiche(newFiche);
  }, [getSituations, saveFiche]);

  // Gérer le changement d'un champ de la section rangement + bilan (JSON)
  const handleRangementBilanFieldChange = useCallback(async (fieldName, value) => {
    const currentFiche = ficheRef.current;
    const currentRangementBilan = getRangementBilan(currentFiche);
    const updatedRangementBilan = {
      ...currentRangementBilan,
      [fieldName]: value,
    };

    const newFiche = {
      ...currentFiche,
      rangement_bilan: JSON.stringify(updatedRangementBilan),
    };

    setFiche(newFiche);
    ficheRef.current = newFiche;
    await saveFiche(newFiche);
  }, [getRangementBilan, saveFiche]);

  // Ajouter une situation
  const handleAddSituation = useCallback(async (type) => {
    const currentFiche = ficheRef.current;
    const situations = getSituations(type, currentFiche);
    situations.push({ ...emptySituation });
    
    const key = `situations_${type}`;
    const newFiche = { ...currentFiche, [key]: JSON.stringify(situations) };
    
    setFiche(newFiche);
    ficheRef.current = newFiche;
    await saveFiche(newFiche);
  }, [getSituations, saveFiche]);

  // Ouvrir la modal de confirmation pour supprimer
  const handleRequestDelete = useCallback((type, index) => {
    setConfirmModal({ isOpen: true, type, index });
  }, []);

  // Confirmer la suppression
  const handleConfirmDelete = useCallback(async () => {
    const { type, index } = confirmModal;
    const currentFiche = ficheRef.current;
    const situations = getSituations(type, currentFiche);

    if (index === null || index < 0 || index >= situations.length) {
      setConfirmModal({ isOpen: false, type: null, index: null });
      return;
    }
    
    situations.splice(index, 1);
    
    const key = `situations_${type}`;
    const newFiche = { ...currentFiche, [key]: JSON.stringify(situations) };
    setFiche(newFiche);
    ficheRef.current = newFiche;
    await saveFiche(newFiche);
    
    setConfirmModal({ isOpen: false, type: null, index: null });
  }, [confirmModal, getSituations, saveFiche]);

  // Annuler la suppression
  const handleCancelDelete = useCallback(() => {
    setConfirmModal({ isOpen: false, type: null, index: null });
  }, []);

  // Télécharger la leçon en PDF
  const handleDownloadPDF = useCallback(async () => {
    try {
      const currentFiche = ficheRef.current;
      const filename = `${currentFiche.titre || 'lecon'}_${currentFiche.lecon_numero || ''}`.replace(/[^a-z0-9]/gi, '_');
      await generateLeconPDFFromData(currentFiche, filename);
    } catch (error) {
      console.error('Erreur lors du téléchargement PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  }, []);

  // Composant pour afficher du texte multiligne éditable
  const MultilineEditable = ({ fieldName, className = '' }) => (
    <EditableField
      value={fiche[fieldName]}
      onChange={handleFieldChange}
      fieldName={fieldName}
      multiline={true}
      className={className}
    />
  );

  // Composant pour afficher du texte simple éditable
  const SimpleEditable = ({ fieldName, className = '' }) => (
    <EditableField
      value={fiche[fieldName]}
      onChange={handleFieldChange}
      fieldName={fieldName}
      multiline={false}
      className={className}
    />
  );

  // Composant pour le titre de section avec bouton +
  const SectionHeader = ({ title, type, italic = false }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className={`text-[#1e3a5f] font-bold text-xl ${italic ? 'italic' : ''}`}>
        {title}
      </h3>
      <button
        onClick={() => handleAddSituation(type)}
        className="bg-[#1e3a5f] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2a4a6f] transition-colors shadow-md text-xl font-bold"
        title={`Ajouter une situation`}
      >
        +
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-[#1e3a5f] text-xl">Chargement...</div>
      </div>
    );
  }

  // Récupérer les situations
  const situationsEchauffement = getSituations('echauffement');
  const situationsApprentissage = getSituations('apprentissage');
  const situationsFinale = getSituations('finale');
  const rangementBilan = getRangementBilan();

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      {/* Barre de navigation */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              // Retourner vers l'activité si disponible, sinon vers le dashboard
              if (fiche.activite_support_id) {
                navigate(`/activite/${fiche.activite_support_id}`);
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-[#1e3a5f] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour à l'activité</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5a87] transition-colors"
            title="Télécharger en PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Télécharger PDF</span>
          </button>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto overflow-hidden break-words">
        
        {/* En-tête - Préparation leçon EPS */}
        <header className="py-6 px-6 bg-white">
          <div className="flex items-center justify-center gap-6">
            <div className="flex-1 h-[4px] bg-[#1e3a5f]"></div>
            <h1 className="text-[#1e3a5f] text-4xl md:text-5xl font-bold whitespace-nowrap">
              <SimpleEditable fieldName="titre" />
            </h1>
            <div className="flex-1 h-[4px] bg-[#1e3a5f]"></div>
          </div>
          {/* Date éditable sous le titre - clic + icône calendrier */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {isEditingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  onBlur={() => {
                    handleFieldChange('date', tempDate || null);
                    setIsEditingDate(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldChange('date', tempDate || null);
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
                  setTempDate(fiche.date || new Date().toISOString().slice(0, 10));
                  setIsEditingDate(true);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors text-[#1e3a5f] border border-transparent hover:border-[#1e3a5f]/20"
                title="Cliquez pour modifier la date"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {fiche.date
                    ? new Date(fiche.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Cliquez pour ajouter une date'}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Bandeau bleu foncé */}
        <div className="bg-[#1e3a5f] py-3 px-6">
          <p className="text-white text-center text-base md:text-lg font-semibold tracking-wide">
            <EditableField
              value={fiche.bandeau_titre}
              onChange={handleFieldChange}
              fieldName="bandeau_titre"
              className="text-white"
            />
          </p>
        </div>

        {/* Section OBJET D'ENSEIGNEMENT - fond gris */}
        <div className="bg-[#d9d9d9] py-4 px-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <h2 className="text-[#1e3a5f] font-bold text-lg md:text-xl whitespace-nowrap">
              OBJET D'ENSEIGNEMENT
            </h2>
            <div className="text-[#1e3a5f] text-base flex-1">
              <SimpleEditable fieldName="objet_enseignement" />
            </div>
          </div>
        </div>

        {/* Badges : LEÇON, APSA, CLASSE, EFFECTIF - fond bleu-gris */}
        <div className="bg-[#7a9bb8] py-3 px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* LEÇON */}
            <div className="flex items-center">
              <span className="bg-[#1e3a5f] text-white px-4 py-2 text-sm font-bold">
                LEÇON
              </span>
              <span className="bg-white px-6 py-2 text-sm text-[#1e3a5f] font-semibold min-w-[60px]">
                <SimpleEditable fieldName="lecon_numero" />
              </span>
            </div>
            
            {/* APSA */}
            <div className="flex items-center">
              <span className="bg-[#1e3a5f] text-white px-4 py-2 text-sm font-bold">
                APSA
              </span>
              <span className="bg-white px-4 py-2 text-sm text-[#1e3a5f] font-semibold">
                <SimpleEditable fieldName="apsa" />
              </span>
            </div>
            
            {/* CLASSE */}
            <div className="flex items-center">
              <span className="bg-[#1e3a5f] text-white px-4 py-2 text-sm font-bold">
                CLASSE
              </span>
              <span className="bg-white px-4 py-2 text-sm text-[#1e3a5f] font-semibold">
                <SimpleEditable fieldName="classe" />
              </span>
            </div>
            
            {/* EFFECTIF */}
            <div className="flex items-center">
              <span className="bg-[#1e3a5f] text-white px-4 py-2 text-sm font-bold">
                EFFECTIF
              </span>
              <span className="bg-white px-6 py-2 text-sm text-[#1e3a5f] font-semibold min-w-[60px]">
                <SimpleEditable fieldName="effectif" />
              </span>
            </div>
          </div>
        </div>

        {/* Section Accroche programme */}
        <div className="mx-6 mt-8">
          <h2 className="text-[#1e3a5f] font-bold text-2xl mb-6">
            Accroche programme
          </h2>

          {/* Champs d'apprentissage */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Champs d'apprentissage :</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base">
                <MultilineEditable fieldName="champs_apprentissage" />
              </div>
            </div>
          </div>

          {/* Compétences attendues */}
          <div className="mb-6">
            <div className="bg-[#92d050] px-4 py-3 rounded-t-md">
              <h3 className="text-white font-semibold text-base">Compétences attendues :</h3>
            </div>
            <div className="bg-[#e8f5e0] border-2 border-[#92d050] border-t-0 p-4 rounded-b-md">
              <div className="text-[#333] text-base whitespace-pre-line">
                <MultilineEditable fieldName="competences_attendues" />
              </div>
            </div>
          </div>
        </div>

        {/* ========== SECTION 2 : LES CONTENUS DE LA LEÇON ========== */}
        <div className="mt-12 px-6">
          {/* Titre avec lignes */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
            <h2 className="text-[#1e3a5f] text-2xl md:text-3xl font-bold whitespace-nowrap">
              LES CONTENUS DE LA LEÇON
            </h2>
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
          </div>

          {/* Objectif de la leçon */}
          <div className="mb-8">
            <h3 className="text-[#1e3a5f] font-bold text-xl mb-4">
              Objectif de la leçon
            </h3>

            {/* 2 cartes côte à côte */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Intension pédagogique */}
              <div>
                <div className="bg-[#4a90a4] px-4 py-3 rounded-t-md">
                  <h4 className="text-white font-semibold text-base">Intension pédagogique</h4>
                </div>
                <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 rounded-b-md">
                  <div className="text-[#333] text-base">
                    <MultilineEditable fieldName="intension_pedagogique" />
                  </div>
                </div>
              </div>

              {/* Intension éducatif */}
              <div>
                <div className="bg-[#4a90a4] px-4 py-3 rounded-t-md">
                  <h4 className="text-white font-semibold text-base">Intension éducatif</h4>
                </div>
                <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 rounded-b-md">
                  <div className="text-[#333] text-base">
                    <MultilineEditable fieldName="intension_educatif" />
                  </div>
                </div>
              </div>
            </div>

            {/* Objectif - vue enseignante */}
            <div className="mb-4">
              <div className="bg-[#4a90a4] px-4 py-3 rounded-t-md">
                <h4 className="text-white font-semibold text-base">Objectif - vue enseignante</h4>
              </div>
              <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 rounded-b-md">
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="objectif_enseignante" />
                </div>
              </div>
            </div>

            {/* Objectif - vue élève */}
            <div className="mb-4">
              <div className="bg-[#4a90a4] px-4 py-3 rounded-t-md">
                <h4 className="text-white font-semibold text-base">Objectif - vue élève</h4>
              </div>
              <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 rounded-b-md">
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="objectif_eleve" />
                </div>
              </div>
            </div>
          </div>

          {/* Ce qu'il y a à apprendre - en priorité */}
          <div className="mb-8">
            <h3 className="text-[#1e3a5f] font-bold text-xl mb-4">
              Ce qu'il y a à apprendre - en priorité
            </h3>

            {/* QUOI - Le ciblage */}
            <div className="mb-4">
              <div className="bg-[#6b7b5a] px-4 py-3 rounded-t-md">
                <h4 className="text-white font-semibold text-base">QUOI - Le ciblage</h4>
              </div>
              <div className="bg-white border-2 border-[#6b7b5a] border-t-0 p-4 rounded-b-md">
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="quoi_ciblage" />
                </div>
              </div>
            </div>

            {/* COMMENT - Contenu d'enseignement principal */}
            <div className="mb-4">
              <div className="bg-[#6b7b5a] px-4 py-3 rounded-t-md">
                <h4 className="text-white font-semibold text-base">COMMENT - Contenu d'enseignement principal</h4>
              </div>
              <div className="bg-white border-2 border-[#6b7b5a] border-t-0 p-4 rounded-b-md">
                <div className="text-[#333] text-base whitespace-pre-line">
                  <MultilineEditable fieldName="comment_enseignement" />
                </div>
              </div>
            </div>
          </div>

          {/* ========== SECTION : Sécurité ========== */}
          <div className="mb-8">
            <h3 className="text-[#1e3a5f] font-bold text-xl mb-4">
              Sécurité
            </h3>

            {/* Points de sécurité */}
            <div className="mb-4">
              <div className="bg-[#e74c3c] px-4 py-3 rounded-t-md">
                <h4 className="text-white font-semibold text-base">Points de sécurité</h4>
              </div>
              <div className="bg-white border-2 border-[#e74c3c] border-t-0 p-4 rounded-b-md">
                <div className="text-[#333] text-base">
                  <MultilineEditable fieldName="points_securite" />
                </div>
              </div>
            </div>
          </div>

          {/* ========== SECTION : Déroulement de la leçon ========== */}
          <div className="mb-8">
            <h3 className="text-[#1e3a5f] font-bold text-xl mb-4">
              Déroulement de la leçon
            </h3>

            {/* 2 cartes côte à côte */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Situations d'apprentissages */}
              <div>
                <div className="bg-[#4a90a4] px-4 py-3 rounded-t-md">
                  <h4 className="text-white font-semibold text-base">Situations d'apprentissages</h4>
                </div>
                <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 rounded-b-md">
                  <div className="text-[#333] text-base">
                    <MultilineEditable fieldName="situations_apprentissages" />
                  </div>
                </div>
              </div>

              {/* Générale */}
              <div>
                <div className="bg-[#4a90a4] px-4 py-3 rounded-t-md">
                  <h4 className="text-white font-semibold text-base">Générale</h4>
                </div>
                <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 rounded-b-md">
                  <div className="text-[#333] text-base">
                    <MultilineEditable fieldName="generale" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========== SECTION : Régulations principales attendues ========== */}
          <div className="mb-8">
            <h3 className="text-[#1e3a5f] font-bold text-xl mb-4">
              Régulations principales attendues
            </h3>

            {/* Tableau 2 colonnes */}
            <div className="grid md:grid-cols-2 gap-0 mb-4">
              {/* Observations attendues */}
              <div>
                <div className="bg-[#4a90a4] px-4 py-3">
                  <h4 className="text-white font-semibold text-base">Observations attendues</h4>
                </div>
                <div className="bg-white border-2 border-[#4a90a4] border-t-0 p-4 min-h-[100px]">
                  <div className="text-[#333] text-base">
                    <MultilineEditable fieldName="observations_attendues" />
                  </div>
                </div>
              </div>

              {/* Régulation */}
              <div>
                <div className="bg-[#4a90a4] px-4 py-3">
                  <h4 className="text-white font-semibold text-base">Régulation</h4>
                </div>
                <div className="bg-white border-2 border-[#4a90a4] border-t-0 border-l-0 p-4 min-h-[100px]">
                  <div className="text-[#333] text-base">
                    <MultilineEditable fieldName="regulation" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== SECTION 3 : LES SITUATIONS ========== */}
        <div className="mt-12 px-6">
          {/* Titre avec lignes */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
            <h2 className="text-[#1e3a5f] text-2xl md:text-3xl font-bold whitespace-nowrap">
              LES SITUATIONS
            </h2>
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
          </div>
          
          {/* Sous-titre */}
          <p className="text-center text-[#1e3a5f] text-base mb-8">
            ... PRESENTATION DE L'OBJECTIF (BILAN)
          </p>

          {/* ========== Echauffement ========== */}
          <div className="mb-8">
            <SectionHeader title="Echauffement" type="echauffement" />
            
            {situationsEchauffement.map((situation, index) => (
              <SituationCard
                key={index}
                situation={situation}
                index={index}
                type="echauffement"
                color="#e74c3c"
                onFieldChange={(idx, fieldName, value) => 
                  handleSituationFieldChange('echauffement', idx, fieldName, value)
                }
                onDelete={(idx) => handleRequestDelete('echauffement', idx)}
                canDelete={true}
              />
            ))}
            {situationsEchauffement.length === 0 && (
              <p className="text-gray-500 italic border border-dashed border-gray-300 rounded-md px-4 py-3 bg-gray-50">
                Pas d'échauffement.
              </p>
            )}
          </div>

          {/* ========== Situations d'apprentissages ========== */}
          <div className="mb-8">
            <SectionHeader title="Situations d'apprentissages" type="apprentissage" italic />
            
            {situationsApprentissage.map((situation, index) => (
              <SituationCard
                key={index}
                situation={situation}
                index={index}
                type="apprentissage"
                color="#5dade2"
                onFieldChange={(idx, fieldName, value) => 
                  handleSituationFieldChange('apprentissage', idx, fieldName, value)
                }
                onDelete={(idx) => handleRequestDelete('apprentissage', idx)}
                canDelete={true}
              />
            ))}
            {situationsApprentissage.length === 0 && (
              <p className="text-gray-500 italic border border-dashed border-gray-300 rounded-md px-4 py-3 bg-gray-50">
                Pas de situation d'apprentissage.
              </p>
            )}
          </div>

          {/* ========== Situations finale ========== */}
          <div className="mb-8">
            <SectionHeader title="Situations finale" type="finale" italic />
            
            {situationsFinale.map((situation, index) => (
              <SituationCard
                key={index}
                situation={situation}
                index={index}
                type="finale"
                color="#e74c3c"
                onFieldChange={(idx, fieldName, value) => 
                  handleSituationFieldChange('finale', idx, fieldName, value)
                }
                onDelete={(idx) => handleRequestDelete('finale', idx)}
                canDelete={true}
              />
            ))}
            {situationsFinale.length === 0 && (
              <p className="text-gray-500 italic border border-dashed border-gray-300 rounded-md px-4 py-3 bg-gray-50">
                Pas de situation finale.
              </p>
            )}
          </div>

        </div>

        {/* ========== SECTION 4 : RANGEMENT + BILAN ========== */}
        <div className="mt-12 px-6 pb-12">
          {/* Titre avec lignes */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
            <h2 className="text-[#1e3a5f] text-2xl md:text-3xl font-bold whitespace-nowrap">
              RANGEMENT + BILAN
            </h2>
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
          </div>

          {/* 4 cartes empilées */}
          <div className="space-y-6">
            
            {/* Apprentissage */}
            <div className="border-2 border-[#4a90a4] rounded-lg p-4">
              <div className="bg-[#4a90a4] px-4 py-3 rounded-md">
                <h4 className="text-white font-semibold text-lg">Apprentissage</h4>
              </div>
            </div>

            {/* Lien avec l'objet d'enseignement + évaluation */}
            <div className="border-2 border-[#4a90a4] rounded-lg p-4">
              <div className="bg-[#4a90a4] px-4 py-3 rounded-md">
                <h4 className="text-white font-semibold text-lg">Lien avec l'objet d'enseignement + évaluation</h4>
              </div>
            </div>

            {/* Remerciment */}
            <div className="border-2 border-[#4a90a4] rounded-lg p-4">
              <div className="bg-[#4a90a4] px-4 py-3 rounded-md">
                <h4 className="text-white font-semibold text-lg">Remerciment</h4>
              </div>
            </div>

            {/* Bilan individuel */}
            <div className="border-2 border-[#4a90a4] rounded-lg p-4">
              <div className="bg-[#4a90a4] px-4 py-3 rounded-md">
                <h4 className="text-white font-semibold text-lg">Bilan individuel</h4>
              </div>
            </div>

          </div>
        </div>

        {/* ========== SECTION 5 : ANALYSE REFLEXIVE ========== */}
        <div className="mt-12 px-6 pb-12">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
            <h2 className="text-[#1e3a5f] text-2xl md:text-3xl font-bold whitespace-nowrap">
              ANALYSE REFLEXIVE
            </h2>
            <div className="flex-1 h-[3px] bg-[#1e3a5f]"></div>
          </div>

          <div className="bg-[#f2994a] px-4 py-3 rounded-t-md">
            <h4 className="text-white font-semibold text-lg">Analyse réflexive</h4>
          </div>
          <div className="bg-white border-2 border-[#f2994a] border-t-0 p-4 rounded-b-md min-h-[180px]">
            <EditableField
              value={rangementBilan.analyse_reflexive}
              onChange={(_, value) => handleRangementBilanFieldChange('analyse_reflexive', value)}
              fieldName="analyse_reflexive"
              multiline={true}
              className="text-[#333] text-base"
            />
          </div>
        </div>

      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Supprimer cette situation ?"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer cette situation ?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Popup de sauvegarde */}
      <SavePopup 
        status={saveStatus}
        errorMessage={errorMessage}
      />
    </div>
  );
}

export default EpsLecon;
