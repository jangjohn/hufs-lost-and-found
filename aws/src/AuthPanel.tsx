import { Authenticator } from '@aws-amplify/ui-react';
import { amplifyOutputs } from './amplifyClient';
import '@aws-amplify/ui-react/styles.css';

type AuthenticatorOptions = {
  loginMechanisms: ('email')[];
  socialProviders?: ('google')[];
};

type AmplifyOutputsWithOAuth = {
  auth?: {
    oauth?: {
      identity_providers?: string[];
    };
  };
};

export function hasGoogleProvider(outputs: AmplifyOutputsWithOAuth | undefined) {
  return Boolean(outputs?.auth?.oauth?.identity_providers?.includes('GOOGLE'));
}

export const authenticatorOptions: AuthenticatorOptions = {
  loginMechanisms: ['email'],
  ...(hasGoogleProvider(amplifyOutputs as AmplifyOutputsWithOAuth | undefined)
    ? { socialProviders: ['google' as const] }
    : {}),
};

export default function AuthPanel() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-head">
          <span className="eyebrow">
            <span className="d" />
            한국외대 캠퍼스 전용
          </span>
          <h1>로그인</h1>
          <p>분실물·습득물을 등록하고 비슷한 글과 연결해요.</p>
        </div>

        <Authenticator {...authenticatorOptions} />

        <div className="ac-note">
          <svg className="ic" viewBox="0 0 24 24">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>
            <code>.ac.kr</code> 학교 이메일 계정만 이용할 수 있습니다.
          </span>
        </div>
      </section>

      <div className="trust">
        <span className="trust-item">
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          학교 이메일 인증
        </span>
        <span className="tsep" />
        <span className="trust-item">
          <svg className="ic" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
          </svg>
          본인 확인 후 전달
        </span>
        <span className="tsep" />
        <span className="trust-item">
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
            <path d="M8 12h8" />
          </svg>
          추천 연결
        </span>
      </div>
    </main>
  );
}
