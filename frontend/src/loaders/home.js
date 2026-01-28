import api from '../../utils/api';

// Retourne tout de suite : la page s'affiche, les données arrivent via Await (Suspense).
// Même logique qu'avant, mais "tests" est une promesse au lieu d'être attendue ici.
export const homeLoader = () => {
  const testsPromise = api
    .get('/api/test/getAll')
    .then(({ data }) => {
      const raw = data.tests;
      return Array.isArray(raw) ? raw : [];
    })
    .catch((error) => {
      console.error('Erreur dans homeLoader:', error);
      throw new Response('Erreur lors du chargement des données', {
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Internal Server Error',
      });
    });
  return { tests: testsPromise };
};
