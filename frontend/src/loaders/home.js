import api from '../../utils/api';


export const homeLoader = async () => {
  
  try {
    
    const { data } = await api.get('/api/test/getAll');
    
    console.log('HomeLoader - Données préchargées:', data);
    
    return {
      tests: data.tests || []
    };
    
  } catch (error) {

    console.error('Erreur dans homeLoader:', error);
    
    throw new Response(
      'Erreur lors du chargement des données',
      { 
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Internal Server Error'
      }
    );
  }
};
