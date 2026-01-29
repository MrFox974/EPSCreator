import api from './api';

/**
 * Récupérer les séquences d'une activité
 */
export const getSequencesByActivite = async (activiteId) => {
  try {
    const response = await api.get(`/api/sequences/activite/${activiteId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des séquences:', error);
    throw error;
  }
};

/**
 * Récupérer une séquence par ID
 */
export const getSequenceById = async (id) => {
  try {
    const response = await api.get(`/api/sequences/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la séquence:', error);
    throw error;
  }
};

/**
 * Créer une nouvelle séquence
 */
export const createSequence = async (data) => {
  try {
    const response = await api.post('/api/sequences', data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création de la séquence:', error);
    throw error;
  }
};

/**
 * Mettre à jour une séquence
 */
export const updateSequence = async (id, data) => {
  try {
    const response = await api.put(`/api/sequences/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la séquence:', error);
    throw error;
  }
};

/**
 * Supprimer une séquence
 */
export const deleteSequence = async (id) => {
  try {
    const response = await api.delete(`/api/sequences/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression de la séquence:', error);
    throw error;
  }
};
