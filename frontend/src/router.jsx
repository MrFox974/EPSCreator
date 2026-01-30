import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import EpsLeconSkeleton from './components/skeletons/EpsLeconSkeleton';

const Dashboard = lazy(() => import('./pages/dashboard/dashboard'));
const Activite = lazy(() => import('./pages/activite/activite'));
const EpsLecon = lazy(() => import('./pages/eps-lecon/eps-lecon'));
const Sequence = lazy(() => import('./pages/sequence/sequence'));
const VMATimer = lazy(() => import('./pages/outils/VMATimer'));

// Skeleton simple pour le dashboard
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1e3a5f] border-t-transparent"></div>
  </div>
);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<ErrorBoundary />}>
      {/* Dashboard - Page d'accueil */}
      <Route
        index
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard />
          </Suspense>
        }
      />
      
      {/* Page Activité Support */}
      <Route
        path="activite/:id"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <Activite />
          </Suspense>
        }
      />
      
      {/* Leçon EPS avec ID dynamique */}
      <Route
        path="lecon/:id"
        element={
          <Suspense fallback={<EpsLeconSkeleton />}>
            <EpsLecon />
          </Suspense>
        }
      />
      
      {/* Séquence EPS avec ID dynamique */}
      <Route
        path="sequence/:id"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <Sequence />
          </Suspense>
        }
      />

      {/* Outil Validation VMA */}
      <Route
        path="outils/vma"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <VMATimer />
          </Suspense>
        }
      />
    </Route>
  )
);
