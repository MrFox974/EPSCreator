import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.REACT_APP_PROTOCOLE}://${import.meta.env.REACT_APP_CLIENT_IP}${import.meta.env.REACT_APP_CLIENT_PORT}`,
  withCredentials: true
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERCEPTOR REQUEST 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accesToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;

});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERCEPTOR RESPONSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

api.interceptors.response.use(
  (response) => response, // ✅ OK → retourne directement
  async (error) => {      // ❌ Erreur → traite
        
    // Y a pas d'erreur? Rejette et bye
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;
    const { config } = error;

    // C'est pas un 401? Rejette et bye
    if (status !== 401) {
      return Promise.reject(error);
    }

    // On a déjà essayé de refresh? Rejette et bye (évite boucle infinie)
    if (config._retry) {
      return Promise.reject(error);
    }

    // OK, on va tenter un refresh
    config._retry = true;

    try {
      // Appelle le serveur pour un nouveau token
      const response = await axios.post(
        'http://localhost:5000/refresh',
        {},
        { withCredentials: true }
      );

      // Récupère le nouveau token
      const { accessToken } = response.data;

      // Le sauvegarde
      localStorage.setItem('accessToken', accessToken);

      // Le met dans le header de la requête échouée
      config.headers.Authorization = `Bearer ${accessToken}`;

      // La renvoie avec le nouveau token
      return api(config);
      
    } catch (refreshError) {
      // Le refresh a échoué = on est vraiment déconnecté
      localStorage.removeItem('accessToken');
      window.location.href = '/connection';
      return Promise.reject(refreshError);
    }
  }
);

export default api;
