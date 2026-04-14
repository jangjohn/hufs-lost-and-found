import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider, useAuth } from './hooks/useAuth';

const Home = lazy(() => import('./pages/Home'));
const PostNew = lazy(() => import('./pages/PostNew'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Verify = lazy(() => import('./pages/Verify'));
const Matches = lazy(() => import('./pages/Matches'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner label="Checking your account" fullScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner label="Loading page" fullScreen />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/post" element={<ProtectedRoute><PostNew /></ProtectedRoute>} />
              <Route path="/item/:id" element={<PostDetail />} />
              <Route path="/verify/:id" element={<ProtectedRoute><Verify /></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
