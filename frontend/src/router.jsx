import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import EpsLeconSkeleton from './components/skeletons/EpsLeconSkeleton';

const Home = lazy(() => import('./pages/home/Home'));
const EleveHub = lazy(() => import('./pages/eleve/EleveHub'));
const EnseignantHub = lazy(() => import('./pages/enseignant/EnseignantHub'));
const ApplicationHub = lazy(() => import('./pages/enseignant/ApplicationHub'));
const CourseOrientation = lazy(() => import('./pages/enseignant/CourseOrientation'));
const Dashboard = lazy(() => import('./pages/dashboard/dashboard'));
const Activite = lazy(() => import('./pages/activite/activite'));
const EpsLecon = lazy(() => import('./pages/eps-lecon/eps-lecon'));
const Sequence = lazy(() => import('./pages/sequence/sequence'));
const SequenceProjet = lazy(() => import('./pages/sequence/SequenceProjet'));
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
      {/* Accueil — choix Élève / Enseignant */}
      <Route
        index
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <Home />
          </Suspense>
        }
      />
      <Route
        path="eleve"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <EleveHub />
          </Suspense>
        }
      />
      <Route
        path="enseignant"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <EnseignantHub />
          </Suspense>
        }
      />
      <Route
        path="enseignant/mes-cours"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard />
          </Suspense>
        }
      />
      <Route
        path="enseignant/application"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <ApplicationHub />
          </Suspense>
        }
      />
      <Route
        path="enseignant/application/course-orientation"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <CourseOrientation />
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
      
      {/* Séquence EPS - Références de la séquence */}
      <Route
        path="sequence/:id"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <Sequence />
          </Suspense>
        }
      />
      {/* Projet de séquence - blocs L1, L2, ... */}
      <Route
        path="sequence/:id/projet"
        element={
          <Suspense fallback={<DashboardSkeleton />}>
            <SequenceProjet />
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
