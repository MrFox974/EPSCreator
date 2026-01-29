import api from './api';

/**
 * Service API pour les fiches EPS
 */

/**
 * Récupérer toutes les fiches EPS
 */
export const getAllFiches = async () => {
  try {
    const response = await api.get('/api/fiche-eps');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des fiches:', error);
    throw error;
  }
};

/**
 * Récupérer une fiche EPS par ID
 */
export const getFicheById = async (id) => {
  try {
    const response = await api.get(`/api/fiche-eps/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la fiche:', error);
    throw error;
  }
};

/**
 * Créer une nouvelle fiche EPS
 */
export const createFiche = async (data = {}) => {
  try {
    const response = await api.post('/api/fiche-eps', data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création de la fiche:', error);
    throw error;
  }
};

/**
 * Mettre à jour une fiche EPS complète
 */
export const updateFiche = async (id, data) => {
  try {
    const response = await api.put(`/api/fiche-eps/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la fiche:', error);
    throw error;
  }
};

/**
 * Mettre à jour un champ spécifique d'une fiche
 */
export const updateFicheField = async (id, field, value) => {
  try {
    const response = await api.patch(`/api/fiche-eps/${id}/field`, { field, value });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du champ:', error);
    throw error;
  }
};

/**
 * Supprimer une fiche EPS
 */
export const deleteFiche = async (id) => {
  try {
    const response = await api.delete(`/api/fiche-eps/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression de la fiche:', error);
    throw error;
  }
};

/**
 * Réordonner les leçons
 */
export const reorderFiches = async (orderedIds) => {
  try {
    const response = await api.post('/api/fiche-eps/reorder', { orderedIds });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    throw error;
  }
};
