import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider, useAuth } from './hooks/useAuth';

const locale = 'ko' as const;

const text = {
  ko: {
    checkingAccount: '계정을 확인하는 중...',
    loadingPage: '페이지를 불러오는 중...',
  },
  en: {
    checkingAccount: 'Checking your account',
    loadingPage: 'Loading page',
  },
};

const Home = lazy(() => import('./pages/Home'));
const PostNew = lazy(() => import('./pages/PostNew'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Verify = lazy(() => import('./pages/Verify'));
const Matches = lazy(() => import('./pages/Matches'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const t = text[locale];

  if (loading) return <LoadingSpinner label={t.checkingAccount} fullScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  const t = text[locale];

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner label={t.loadingPage} fullScreen />}>
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
