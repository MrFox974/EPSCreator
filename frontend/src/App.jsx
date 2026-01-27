/**
 * ============================================================================
 * APP COMPONENT - React Router v7
 * ============================================================================
 * 
 * Ce composant est le point d'entrée de l'application React Router v7.
 * 
 * FONCTIONNALITÉS V7 UTILISÉES :
 * 
 * 1. RouterProvider
 *    - Nouveau composant dans v7 (remplace <BrowserRouter>)
 *    - Prend un router créé avec createBrowserRouter()
 *    - Gère automatiquement la navigation, les loaders, les erreurs
 * 
 * 2. Suspense
 *    - Nécessaire pour les composants lazy loaded
 *    - Affiche un fallback pendant le chargement des composants
 *    - React Router v7 utilise Suspense pour le streaming de données
 * 
 * DIFFÉRENCES AVEC L'ANCIENNE APPROCHE :
 * 
 * ❌ AVANT (React Router v6 classique) :
 *    <BrowserRouter>
 *      <Routes>
 *        <Route path="/home" element={<Home />} />
 *      </Routes>
 *    </BrowserRouter>
 * 
 * ✅ MAINTENANT (React Router v7) :
 *    <RouterProvider router={router} />
 * 
 * Avantages :
 * - Configuration centralisée dans router.jsx
 * - Support natif des loaders et error boundaries
 * - Meilleure performance avec lazy loading
 */

import { RouterProvider } from 'react-router-dom';
import { Suspense } from 'react';
import { router } from './router';

function App() {
  return (
    /**
     * SUSPENSE - Nécessaire pour le lazy loading
     * 
     * Suspense permet d'afficher un fallback pendant que les composants
     * lazy loaded sont en cours de chargement.
     * 
     * React Router v7 utilise aussi Suspense pour :
     * - Le streaming de données depuis les loaders
     * - L'affichage progressif du contenu
     */
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      }
    >
      {/**
       * ROUTER PROVIDER - Composant principal React Router v7
       * 
       * RouterProvider prend le router créé avec createBrowserRouter()
       * et gère automatiquement :
       * - La navigation entre les routes
       * - L'exécution des loaders
       * - L'affichage des error boundaries
       * - Le lazy loading des composants
       * 
       * Tout est géré automatiquement, pas besoin de configuration supplémentaire !
       */}
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;
