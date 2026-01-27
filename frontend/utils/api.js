import axios from 'axios';

// Construction de l'URL avec valeurs par défaut si les variables d'env ne sont pas définies
const protocol = import.meta.env.VITE_PROTOCOLE || 'http';
const host = import.meta.env.VITE_SERVER_HOST || 'localhost';
const port = import.meta.env.VITE_SERVER_PORT || '8080';

let baseURL

if (!port || port === '' || port === '443' || port === '80') {
  baseURL = `${protocol}://${host}`;
} else {
  baseURL = `${protocol}://${host}:${port}`;
}

console.log('API Base URL:', baseURL);
console.log('Variables d\'environnement:', {
  VITE_PROTOCOLE: import.meta.env.VITE_PROTOCOLE,
  VITE_SERVER_HOST: import.meta.env.VITE_SERVER_HOST,
  VITE_SERVER_PORT: import.meta.env.VITE_SERVER_PORT
});

const api = axios.create({
  baseURL: baseURL,
  withCredentials: true
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERCEPTOR REQUEST 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<━━━━━━

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
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
      const refreshURL = `${baseURL}/refresh`;
      const response = await axios.post(
        refreshURL,
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
