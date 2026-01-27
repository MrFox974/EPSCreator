import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import HomeSkeleton from './components/skeletons/HomeSkeleton';
import AboutSkeleton from './components/skeletons/AboutSkeleton';
import { homeLoader } from './loaders/home';
import { aboutLoader } from './loaders/about';

const Home = lazy(() => import('./pages/home/home'));
const About = lazy(() => import('./pages/about/about'));

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<ErrorBoundary />}>
      <Route
        path="home"
        element={
          <Suspense fallback={<HomeSkeleton />}>
            <Home />
          </Suspense>
        }
        loader={homeLoader}
      />
      <Route
        path="about"
        element={
          <Suspense fallback={<AboutSkeleton />}>
            <About />
          </Suspense>
        }
        loader={aboutLoader}
      />
    </Route>
  )
);
