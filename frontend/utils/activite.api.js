import api from './api';

/**
 * Service API pour les activités support (test)
 */

export const getActivitesByClasse = async (classeId) => {
  try {
    const response = await api.get(`/api/activites/classe/${classeId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    throw error;
  }
};

export const getActiviteById = async (id) => {
  try {
    const response = await api.get(`/api/activites/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'activité:', error);
    throw error;
  }
};

export const createActivite = async (data) => {
  try {
    const response = await api.post('/api/activites', data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    throw error;
  }
};

export const updateActivite = async (id, data) => {
  try {
    const response = await api.put(`/api/activites/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité:', error);
    throw error;
  }
};

export const deleteActivite = async (id) => {
  try {
    const response = await api.delete(`/api/activites/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'activité:', error);
    throw error;
  }
};
