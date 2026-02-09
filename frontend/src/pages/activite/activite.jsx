/**
 * Page Activité Support - Affiche les leçons d'une activité
 * Avec drag and drop pour réorganiser
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { getActiviteById } from '../../../utils/activite.api';
import { createFiche, deleteFiche, reorderFiches, getFicheById } from '../../../utils/fiche-eps.api';
import { getSequencesByActivite, createSequence, deleteSequence } from '../../../utils/sequence.api';
import { generateLeconPDFFromData } from '../../../utils/pdf-generator';

// Désactiver toutes les animations
const animateLayoutChanges = () => false;

// Composant pour une leçon draggable
function SortableLeconCard({ lecon, activite, isReordering, onDelete, onClick, onDownload }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ 
    id: lecon.id,
    animateLayoutChanges,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isReordering) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, transition: 'none' }}
        {...attributes}
        {...listeners}
        className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-dashed border-slate-300 cursor-grab active:cursor-grabbing"
      >
        <div 
          className="h-2"
          style={{ backgroundColor: activite.couleur || '#5dade2' }}
        />
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: activite.couleur || '#5dade2' }}
            >
              {lecon.lecon_numero || '#'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">
                {lecon.titre || 'Leçon sans titre'}
              </h3>
              <p className="text-slate-400 text-sm">
                Leçon {lecon.lecon_numero || '-'}
              </p>
            </div>
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <div 
        className="h-2"
        style={{ backgroundColor: activite.couleur || '#5dade2' }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: activite.couleur || '#5dade2' }}
            >
              {lecon.lecon_numero || '#'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-[#1e3a5f] transition-colors">
                {lecon.titre || 'Leçon sans titre'}
              </h3>
              <p className="text-slate-400 text-sm">
                Leçon {lecon.lecon_numero || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                onDownload(lecon);
              }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Télécharger en PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(lecon);
              }}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {new Date(lecon.created_at).toLocaleDateString('fr-FR')}
          </span>
          <span className="text-[#1e3a5f] text-sm font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Ouvrir
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function Activite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activite, setActivite] = useState(null);
  const [lecons, setLecons] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [leconModal, setLeconModal] = useState({ open: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, name: '', type: 'lecon' });
  
  // Formulaire
  const [leconForm, setLeconForm] = useState({ titre: 'Nouvelle leçon EPS', lecon_numero: '' });

  // Sensors pour le drag and drop - distance 0 pour réponse instantanée
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger les données
  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await getActiviteById(id);
      setActivite(data.activite);
      // Trier les leçons par ordre
      const sortedLecons = [...(data.activite.lecons || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      setLecons(sortedLecons);
      
      // Charger les séquences
      const seqData = await getSequencesByActivite(id);
      setSequences(seqData.sequences || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gérer le drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setLecons((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  // Sauvegarder l'ordre
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const orderedIds = lecons.map((l) => l.id);
      await reorderFiches(orderedIds);
      setHasChanges(false);
      setIsReordering(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  // Annuler la réorganisation
  const handleCancelReorder = () => {
    // Recharger l'ordre original
    if (activite) {
      const sortedLecons = [...(activite.lecons || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      setLecons(sortedLecons);
    }
    setHasChanges(false);
    setIsReordering(false);
  };

  // Créer une leçon
  const handleLeconSubmit = async (e) => {
    e.preventDefault();
    try {
      // Récupérer la dernière leçon pour la copier si elle existe
      const lastLecon = lecons.length > 0 ? lecons[lecons.length - 1] : null;
      
      const ficheData = { 
        titre: leconForm.titre || 'Nouvelle leçon EPS',
        lecon_numero: leconForm.lecon_numero,
        activite_support_id: parseInt(id),
        ordre: lecons.length
      };
      
      // Si une leçon précédente existe, copier son contenu
      if (lastLecon) {
        ficheData.copyFromId = lastLecon.id;
      }
      
      const result = await createFiche(ficheData);
      setLeconModal({ open: false });
      navigate(`/lecon/${result.fiche.id}`);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Télécharger une leçon en PDF
  const handleDownloadPDF = async (lecon) => {
    try {
      // Charger la leçon complète
      const data = await getFicheById(lecon.id);
      if (data.fiche) {
        const filename = `${lecon.titre || 'lecon'}_${lecon.lecon_numero || ''}`.replace(/[^a-z0-9]/gi, '_');
        await generateLeconPDFFromData(data.fiche, filename);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  // Supprimer une leçon ou séquence
  const handleConfirmDelete = async () => {
    try {
      if (confirmModal.type === 'sequence') {
        await deleteSequence(confirmModal.id);
      } else {
        await deleteFiche(confirmModal.id);
      }
      setConfirmModal({ open: false, id: null, name: '', type: 'lecon' });
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // Créer une nouvelle séquence
  const handleCreateSequence = async () => {
    try {
      const result = await createSequence({
        titre: `Projet de séquence - ${activite.nom}`,
        activite_support_id: parseInt(id),
      });
      navigate(`/sequence/${result.sequence.id}`);
    } catch (error) {
      console.error('Erreur création séquence:', error);
    }
  };

  // Retour au dashboard avec école et classe dépliées
  const handleGoBack = () => {
    if (activite?.classe?.ecole?.id && activite?.classe?.id) {
      // Sauvegarder l'état déplié pour l'école et la classe
      const expandedEcoles = { [activite.classe.ecole.id]: true };
      const expandedClasses = { [activite.classe.id]: true };
      localStorage.setItem('dashboard_expanded_ecoles', JSON.stringify(expandedEcoles));
      localStorage.setItem('dashboard_expanded_classes', JSON.stringify(expandedClasses));
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1e3a5f] border-t-transparent"></div>
      </div>
    );
  }

  if (!activite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Activité non trouvée</p>
      </div>
    );
  }

  const { classe } = activite;
  const { ecole } = classe || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header 
        className="shadow-lg"
        style={{ background: `linear-gradient(to right, ${activite.couleur || '#5dade2'}, ${activite.couleur || '#5dade2'}dd)` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <button onClick={handleGoBack} className="hover:text-white transition-colors">
              Dashboard
            </button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {ecole && (
              <>
                <span>{ecole.nom}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            {classe && <span>{classe.nom}</span>}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{activite.nom}</h1>
              {activite.champ_apprentissage && (
                <p className="text-white/80 mt-1">{activite.champ_apprentissage}</p>
              )}
              {activite.description && (
                <p className="text-white/60 text-sm mt-2">{activite.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Bouton réorganiser */}
              {lecons.length > 1 && !isReordering && (
                <button
                  onClick={() => setIsReordering(true)}
                  className="bg-white/20 backdrop-blur-sm text-white px-3 py-2 md:px-4 md:py-3 rounded-xl text-sm md:text-base font-semibold hover:bg-white/30 transition-all flex items-center gap-1 md:gap-2 border border-white/30"
                  title="Réorganiser les leçons"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                  <span className="hidden sm:inline">Réorganiser</span>
                </button>
              )}
              
              {/* Bouton nouvelle leçon */}
              {!isReordering && (
                <button
                  onClick={() => {
                    setLeconForm({ titre: 'Nouvelle leçon EPS', lecon_numero: String(lecons.length + 1) });
                    setLeconModal({ open: true });
                  }}
                  className="bg-white/20 backdrop-blur-sm text-white px-3 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-semibold hover:bg-white/30 transition-all flex items-center gap-1 md:gap-2 border border-white/30"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Nouvelle leçon</span>
                  <span className="sm:hidden">Leçon</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Barre de réorganisation */}
      {isReordering && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="font-medium">Mode réorganisation</span>
              <span className="text-amber-600 text-sm">- Glissez les leçons pour les réorganiser</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelReorder}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={!hasChanges || saving}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  hasChanges 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Valider
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton retour */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-slate-600 hover:text-[#1e3a5f] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Retour au dashboard</span>
        </button>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Section Séquence - couleur de l'activité */}
        <div className="mb-8" style={{ ['--activite-couleur']: activite?.couleur || '#5dade2' }}>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Projet de séquence</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Carte pour créer une séquence */}
            {sequences.length === 0 && (
              <button
                onClick={handleCreateSequence}
                className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-6 hover:bg-slate-50 hover:border-slate-400 transition-all group min-h-[140px] flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-3 group-hover:!bg-[var(--activite-couleur)] group-hover:text-white transition-all">
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-white transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-slate-500 font-medium group-hover:text-[var(--activite-couleur)] transition-colors">Créer un projet de séquence</span>
              </button>
            )}
            
            {/* Séquences existantes */}
            {sequences.map((seq) => (
              <div 
                key={seq.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/sequence/${seq.id}`)}
              >
                <div className="h-2" style={{ backgroundColor: 'var(--activite-couleur)' }} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: 'var(--activite-couleur)' }}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-[var(--activite-couleur)] transition-colors">
                          {seq.titre || 'Projet de séquence'}
                        </h3>
                        {seq.periode && (
                          <p className="text-slate-400 text-sm">{seq.periode}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setConfirmModal({ open: true, id: seq.id, name: seq.titre || 'ce projet', type: 'sequence' });
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {new Date(seq.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-sm font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1" style={{ color: 'var(--activite-couleur)' }}>
                      Ouvrir
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Leçons */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Leçons</h2>
          
          {lecons.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Aucune leçon</h3>
              <p className="text-slate-500 mb-4">Créez votre première leçon pour cette activité</p>
              <button
                onClick={() => {
                  setLeconForm({ titre: 'Nouvelle leçon EPS', lecon_numero: '1' });
                  setLeconModal({ open: true });
                }}
                className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#2d5a87] transition-all"
              >
                Créer une leçon
              </button>
            </div>
          ) : isReordering ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={lecons.map(l => l.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lecons.map((lecon) => (
                  <SortableLeconCard
                    key={lecon.id}
                    lecon={lecon}
                    activite={activite}
                    isReordering={true}
                    onDelete={() => {}}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lecons.map((lecon) => (
              <SortableLeconCard
                key={lecon.id}
                lecon={lecon}
                activite={activite}
                isReordering={false}
                onDelete={(l) => setConfirmModal({ open: true, id: l.id, name: l.titre || 'cette leçon', type: 'lecon' })}
                onClick={() => navigate(`/lecon/${lecon.id}`)}
                onDownload={handleDownloadPDF}
              />
            ))}
          </div>
        )}
        </div>
      </main>

      {/* Modal Nouvelle Leçon */}
      <Modal 
        isOpen={leconModal.open} 
        onClose={() => setLeconModal({ open: false })}
        title="Nouvelle leçon"
      >
        <form onSubmit={handleLeconSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
            <input
              type="text"
              value={leconForm.titre}
              onChange={(e) => setLeconForm({ ...leconForm, titre: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: Préparation leçon EPS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de leçon</label>
            <input
              type="text"
              value={leconForm.lecon_numero}
              onChange={(e) => setLeconForm({ ...leconForm, lecon_numero: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: 1, 2, 3..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLeconModal({ open: false })}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5a87] transition-colors"
            >
              Créer et ouvrir
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.type === 'sequence' ? 'Supprimer le projet de séquence ?' : 'Supprimer la leçon ?'}
        message={`Êtes-vous sûr de vouloir supprimer "${confirmModal.name}" ? Cette action est irréversible.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null, name: '', type: 'lecon' })}
      />
    </div>
  );
}

export default Activite;
