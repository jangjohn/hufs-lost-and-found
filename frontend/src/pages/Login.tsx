import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const locale = 'ko' as const;

const text = {
  ko: {
    badge: '학교 계정 로그인',
    heroTitle: '교내 구성원의 분실물이 다시 주인을 찾을 수 있도록 돕습니다.',
    heroDescription: 'HUFS 분실물 찾기는 분실물 등록, 매칭 결과 확인, 본인 확인 절차까지 한곳에서 처리할 수 있는 교내 서비스입니다.',
    feature1: '학교 계정으로만 안전하게 로그인할 수 있습니다.',
    feature2: 'AI 기반 매칭과 알림 흐름을 지원합니다.',
    feature3: '모바일과 데스크톱 모두에서 빠르게 신고할 수 있습니다.',
    signInTitle: '로그인',
    signInDescription: '학교 Google 계정으로 로그인하고 게시글 작성, 알림 관리, 매칭 확인 기능을 이용하세요.',
    continueWithGoogle: 'Google로 계속하기',
    accountHint: '`.ac.kr` 계정만 게시글 작성과 알림 기능을 사용할 수 있습니다.',
  },
  en: {
    badge: 'University access',
    heroTitle: 'Reconnect students with what matters.',
    heroDescription: 'HUFS Lost & Found helps students post items, review possible matches, and verify ownership before returning belongings.',
    feature1: 'Secure sign-in limited to university accounts.',
    feature2: 'AI-assisted matching and notification workflow.',
    feature3: 'Designed for quick reporting on both desktop and mobile.',
    signInTitle: 'Sign in',
    signInDescription: 'Use your university Google account to post items, manage alerts, and review matches.',
    continueWithGoogle: 'Continue with Google',
    accountHint: 'Only `.ac.kr` accounts are allowed to access posting and notification features.',
  },
};

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const t = text[locale];

  const handleLogin = async () => {
    setError('');

    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-[linear-gradient(155deg,_#0f172a,_#0369a1)] p-8 text-white sm:p-10">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
            {t.badge}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{t.heroTitle}</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-sky-100/90">{t.heroDescription}</p>
          <div className="mt-8 grid gap-3 text-sm text-slate-100">
            <div className="rounded-2xl bg-white/10 p-4">{t.feature1}</div>
            <div className="rounded-2xl bg-white/10 p-4">{t.feature2}</div>
            <div className="rounded-2xl bg-white/10 p-4">{t.feature3}</div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 sm:p-10">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900">{t.signInTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{t.signInDescription}</p>

            <button
              onClick={handleLogin}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.27-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.3-1.93-6.17-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  fill="#34A853"
                />
                <path
                  d="M5.83 14.11A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.43.35-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l2.85-2.22.8-.62Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05L5.83 9.9c.87-2.6 3.3-4.52 6.17-4.52Z"
                  fill="#EA4335"
                />
              </svg>
              {t.continueWithGoogle}
            </button>

            <p className="mt-4 text-xs text-slate-500">{t.accountHint}</p>
            {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
