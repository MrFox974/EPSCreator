import axios from 'axios';

// Construction de l'URL avec valeurs par défaut si les variables d'env ne sont pas définies
const protocol = import.meta.env.VITE_PROTOCOLE || 'http';
// Nettoie le host : enlève les slashes finaux, les espaces, et le protocole s'il est présent
let host = (import.meta.env.VITE_SERVER_HOST || 'localhost').replace(/\/+$/, '').trim();
// Enlève le protocole si présent dans le host (ex: https://example.com → example.com)
host = host.replace(/^https?:\/\//, '');

// En prod (Lambda Function URL), VITE_SERVER_PORT n'est pas défini → pas de port dans l'URL
// En local, VITE_SERVER_PORT=8080 → on ajoute le port
const port = import.meta.env.VITE_SERVER_PORT;

let baseURL;

if (!port || port === '' || port === '443' || port === '80') {
  // Pas de port si non défini ou port par défaut (80/443)
  baseURL = `${protocol}://${host}`;
} else {
  // Port défini et différent de 80/443 → on l'ajoute
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
