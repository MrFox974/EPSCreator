import api from './api';

/**
 * Service API pour les écoles
 */

export const getAllEcoles = async () => {
  try {
    const response = await api.get('/api/ecoles');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des écoles:', error);
    throw error;
  }
};

export const getEcoleById = async (id) => {
  try {
    const response = await api.get(`/api/ecoles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'école:', error);
    throw error;
  }
};

export const createEcole = async (data) => {
  try {
    const response = await api.post('/api/ecoles', data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création de l\'école:', error);
    throw error;
  }
};

export const updateEcole = async (id, data) => {
  try {
    const response = await api.put(`/api/ecoles/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'école:', error);
    throw error;
  }
};

export const deleteEcole = async (id) => {
  try {
    const response = await api.delete(`/api/ecoles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'école:', error);
    throw error;
  }
};
