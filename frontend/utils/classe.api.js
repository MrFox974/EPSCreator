import api from './api';

/**
 * Service API pour les classes
 */

export const getClassesByEcole = async (ecoleId) => {
  try {
    const response = await api.get(`/api/classes/ecole/${ecoleId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    throw error;
  }
};

export const getClasseById = async (id) => {
  try {
    const response = await api.get(`/api/classes/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la classe:', error);
    throw error;
  }
};

export const createClasse = async (data) => {
  try {
    const response = await api.post('/api/classes', data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création de la classe:', error);
    throw error;
  }
};

export const updateClasse = async (id, data) => {
  try {
    const response = await api.put(`/api/classes/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la classe:', error);
    throw error;
  }
};

export const deleteClasse = async (id) => {
  try {
    const response = await api.delete(`/api/classes/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression de la classe:', error);
    throw error;
  }
};
