/**
 * Dashboard - Gestion des écoles, classes et activités support
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { getAllEcoles, createEcole, updateEcole, deleteEcole } from '../../../utils/ecole.api';
import { createClasse, updateClasse, deleteClasse } from '../../../utils/classe.api';
import { createActivite, updateActivite, deleteActivite } from '../../../utils/activite.api';

function Dashboard() {
  const navigate = useNavigate();
  const [ecoles, setEcoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Charger l'état des éléments déroulés depuis localStorage
  const [expandedEcoles, setExpandedEcoles] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_expanded_ecoles');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [expandedClasses, setExpandedClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_expanded_classes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Modals
  const [ecoleModal, setEcoleModal] = useState({ open: false, mode: 'create', data: null });
  const [classeModal, setClasseModal] = useState({ open: false, mode: 'create', data: null, ecoleId: null });
  const [activiteModal, setActiviteModal] = useState({ open: false, mode: 'create', data: null, classeId: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, id: null, name: '' });
  
  // Formulaires
  const [ecoleForm, setEcoleForm] = useState({ nom: '', description: '', couleur: '#1e3a5f' });
  const [classeForm, setClasseForm] = useState({ nom: '', niveau: '', effectif: '' });
  const [activiteForm, setActiviteForm] = useState({ nom: '', description: '', champ_apprentissage: '', couleur: '#5dade2' });

  // Sauvegarder l'état des éléments déroulés dans localStorage
  useEffect(() => {
    localStorage.setItem('dashboard_expanded_ecoles', JSON.stringify(expandedEcoles));
  }, [expandedEcoles]);

  useEffect(() => {
    localStorage.setItem('dashboard_expanded_classes', JSON.stringify(expandedClasses));
  }, [expandedClasses]);

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      const data = await getAllEcoles();
      setEcoles(data.ecoles || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle expand - ferme les autres écoles quand on en ouvre une
  const toggleEcole = (id) => {
    setExpandedEcoles(prev => {
      const isCurrentlyExpanded = prev[id];
      if (isCurrentlyExpanded) {
        // Si on ferme, juste toggle
        return { ...prev, [id]: false };
      } else {
        // Si on ouvre, fermer toutes les autres
        return { [id]: true };
      }
    });
  };

  const toggleClasse = (id) => {
    setExpandedClasses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // === ÉCOLE ===
  const openEcoleModal = (mode, ecole = null) => {
    setEcoleForm(ecole ? { nom: ecole.nom, description: ecole.description || '', couleur: ecole.couleur || '#1e3a5f' } : { nom: '', description: '', couleur: '#1e3a5f' });
    setEcoleModal({ open: true, mode, data: ecole });
  };

  const handleEcoleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (ecoleModal.mode === 'create') {
        await createEcole(ecoleForm);
      } else {
        await updateEcole(ecoleModal.data.id, ecoleForm);
      }
      setEcoleModal({ open: false, mode: 'create', data: null });
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // === CLASSE ===
  const openClasseModal = (mode, ecoleId, classe = null) => {
    setClasseForm(classe ? { nom: classe.nom, niveau: classe.niveau || '', effectif: classe.effectif || '' } : { nom: '', niveau: '', effectif: '' });
    setClasseModal({ open: true, mode, data: classe, ecoleId });
  };

  const handleClasseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (classeModal.mode === 'create') {
        await createClasse({ ...classeForm, ecole_id: classeModal.ecoleId });
      } else {
        await updateClasse(classeModal.data.id, classeForm);
      }
      setClasseModal({ open: false, mode: 'create', data: null, ecoleId: null });
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // === ACTIVITÉ ===
  const openActiviteModal = (mode, classeId, activite = null) => {
    setActiviteForm(activite 
      ? { nom: activite.nom, description: activite.description || '', champ_apprentissage: activite.champ_apprentissage || '', couleur: activite.couleur || '#5dade2' } 
      : { nom: '', description: '', champ_apprentissage: '', couleur: '#5dade2' }
    );
    setActiviteModal({ open: true, mode, data: activite, classeId });
  };

  const handleActiviteSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activiteModal.mode === 'create') {
        await createActivite({ ...activiteForm, classe_id: activiteModal.classeId });
      } else {
        await updateActivite(activiteModal.data.id, activiteForm);
      }
      setActiviteModal({ open: false, mode: 'create', data: null, classeId: null });
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // === SUPPRESSION ===
  const openConfirmModal = (type, id, name) => {
    setConfirmModal({ open: true, type, id, name });
  };

  const handleConfirmDelete = async () => {
    try {
      if (confirmModal.type === 'ecole') {
        await deleteEcole(confirmModal.id);
      } else if (confirmModal.type === 'classe') {
        await deleteClasse(confirmModal.id);
      } else if (confirmModal.type === 'activite') {
        await deleteActivite(confirmModal.id);
      }
      setConfirmModal({ open: false, type: null, id: null, name: '' });
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1e3a5f] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard EPS</h1>
              <p className="text-blue-200 mt-1">Gérez vos écoles, classes et activités</p>
            </div>
            <button
              onClick={() => openEcoleModal('create')}
              className="bg-white text-[#1e3a5f] px-3 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-1 md:gap-2"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nouvelle école</span>
              <span className="sm:hidden">École</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {ecoles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-600 mb-2">Aucune école</h3>
            <p className="text-slate-500 mb-6">Commencez par créer votre première école</p>
            <button
              onClick={() => openEcoleModal('create')}
              className="bg-[#1e3a5f] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2d5a87] transition-all"
            >
              Créer une école
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {ecoles.map((ecole) => (
              <div key={ecole.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* École Header */}
                <div 
                  className="p-5 cursor-pointer flex items-center gap-4"
                  style={{ borderLeft: `4px solid ${ecole.couleur || '#1e3a5f'}` }}
                  onClick={() => toggleEcole(ecole.id)}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: ecole.couleur || '#1e3a5f' }}
                  >
                    {ecole.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{ecole.nom}</h2>
                    {ecole.description && (
                      <p className="text-slate-500 text-sm">{ecole.description}</p>
                    )}
                    <p className="text-slate-400 text-xs mt-1">
                      {ecole.classes?.length || 0} classe(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openClasseModal('create', ecole.id); }}
                      className="p-2 text-slate-400 hover:text-[#1e3a5f] hover:bg-slate-100 rounded-lg transition-colors"
                      title="Ajouter une classe"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEcoleModal('edit', ecole); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openConfirmModal('ecole', ecole.id, ecole.nom); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg 
                      className={`w-5 h-5 text-slate-400 transition-transform ${expandedEcoles[ecole.id] ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Classes */}
                {expandedEcoles[ecole.id] && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {!ecole.classes || ecole.classes.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        <p>Aucune classe dans cette école</p>
                        <button
                          onClick={() => openClasseModal('create', ecole.id)}
                          className="mt-2 text-[#1e3a5f] font-medium hover:underline"
                        >
                          + Ajouter une classe
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {ecole.classes.map((classe) => (
                          <div key={classe.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                            {/* Classe Header */}
                            <div 
                              className="p-4 cursor-pointer flex items-center gap-3"
                              onClick={() => toggleClasse(classe.id)}
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                {classe.nom.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">{classe.nom}</h3>
                                <p className="text-slate-400 text-xs">
                                  {classe.niveau && `${classe.niveau} • `}
                                  {classe.activites?.length || 0} activité(s)
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openActiviteModal('create', classe.id); }}
                                  className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Nouvelle activité"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openClasseModal('edit', ecole.id, classe); }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openConfirmModal('classe', classe.id, classe.nom); }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                <svg 
                                  className={`w-4 h-4 text-slate-400 transition-transform ${expandedClasses[classe.id] ? 'rotate-180' : ''}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {/* Activités */}
                            {expandedClasses[classe.id] && (
                              <div className="border-t border-slate-100 bg-slate-50/30 p-3">
                                {!classe.activites || classe.activites.length === 0 ? (
                                  <div className="text-center py-4 text-slate-500 text-sm">
                                    <p>Aucune activité</p>
                                    <button
                                      onClick={() => openActiviteModal('create', classe.id)}
                                      className="mt-1 text-[#1e3a5f] font-medium hover:underline text-xs"
                                    >
                                      + Créer une activité support
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {classe.activites.map((activite) => (
                                      <div 
                                        key={activite.id}
                                        className="bg-white rounded-lg p-3 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer group"
                                        onClick={() => navigate(`/activite/${activite.id}`)}
                                      >
                                        <div 
                                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                                          style={{ backgroundColor: activite.couleur || '#5dade2' }}
                                        >
                                          {activite.nom.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-slate-800 truncate text-sm">{activite.nom}</h4>
                                          {activite.champ_apprentissage && (
                                            <p className="text-slate-400 text-xs">{activite.champ_apprentissage}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openActiviteModal('edit', classe.id, activite); }}
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Modifier"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openConfirmModal('activite', activite.id, activite.nom); }}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Supprimer"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal École */}
      <Modal 
        isOpen={ecoleModal.open} 
        onClose={() => setEcoleModal({ open: false, mode: 'create', data: null })}
        title={ecoleModal.mode === 'create' ? 'Nouvelle école' : 'Modifier l\'école'}
      >
        <form onSubmit={handleEcoleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
            <input
              type="text"
              value={ecoleForm.nom}
              onChange={(e) => setEcoleForm({ ...ecoleForm, nom: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: École Jean Moulin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={ecoleForm.description}
              onChange={(e) => setEcoleForm({ ...ecoleForm, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all resize-none"
              placeholder="Description optionnelle..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={ecoleForm.couleur}
                onChange={(e) => setEcoleForm({ ...ecoleForm, couleur: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={ecoleForm.couleur}
                onChange={(e) => setEcoleForm({ ...ecoleForm, couleur: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEcoleModal({ open: false, mode: 'create', data: null })}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5a87] transition-colors"
            >
              {ecoleModal.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Classe */}
      <Modal 
        isOpen={classeModal.open} 
        onClose={() => setClasseModal({ open: false, mode: 'create', data: null, ecoleId: null })}
        title={classeModal.mode === 'create' ? 'Nouvelle classe' : 'Modifier la classe'}
      >
        <form onSubmit={handleClasseSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
            <input
              type="text"
              value={classeForm.nom}
              onChange={(e) => setClasseForm({ ...classeForm, nom: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: 6ème A"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
            <input
              type="text"
              value={classeForm.niveau}
              onChange={(e) => setClasseForm({ ...classeForm, niveau: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: Collège, Lycée..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Effectif</label>
            <input
              type="number"
              value={classeForm.effectif}
              onChange={(e) => setClasseForm({ ...classeForm, effectif: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Nombre d'élèves"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setClasseModal({ open: false, mode: 'create', data: null, ecoleId: null })}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5a87] transition-colors"
            >
              {classeModal.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Activité */}
      <Modal 
        isOpen={activiteModal.open} 
        onClose={() => setActiviteModal({ open: false, mode: 'create', data: null, classeId: null })}
        title={activiteModal.mode === 'create' ? 'Nouvelle activité support' : 'Modifier l\'activité'}
      >
        <form onSubmit={handleActiviteSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'activité *</label>
            <input
              type="text"
              value={activiteForm.nom}
              onChange={(e) => setActiviteForm({ ...activiteForm, nom: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: Demi-fond, Badminton, Gymnastique..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Champ d'apprentissage</label>
            <input
              type="text"
              value={activiteForm.champ_apprentissage}
              onChange={(e) => setActiviteForm({ ...activiteForm, champ_apprentissage: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex: CA1, CA2, CA3, CA4, CA5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={activiteForm.description}
              onChange={(e) => setActiviteForm({ ...activiteForm, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all resize-none"
              placeholder="Description optionnelle..."
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={activiteForm.couleur}
                onChange={(e) => setActiviteForm({ ...activiteForm, couleur: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={activiteForm.couleur}
                onChange={(e) => setActiviteForm({ ...activiteForm, couleur: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiviteModal({ open: false, mode: 'create', data: null, classeId: null })}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5a87] transition-colors"
            >
              {activiteModal.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title={`Supprimer ${confirmModal.type === 'ecole' ? 'l\'école' : confirmModal.type === 'classe' ? 'la classe' : 'l\'activité'} ?`}
        message={`Êtes-vous sûr de vouloir supprimer "${confirmModal.name}" ? Cette action est irréversible.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, type: null, id: null, name: '' })}
      />
    </div>
  );
}

export default Dashboard;
