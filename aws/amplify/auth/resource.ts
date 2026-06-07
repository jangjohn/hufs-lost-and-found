import { defineAuth, secret } from '@aws-amplify/backend';
import { preSignUp } from './pre-sign-up/resource';

declare const process: {
  env: Record<string, string | undefined>;
};

const enableGoogleSignIn = process.env.ENABLE_GOOGLE_SIGN_IN === 'true';

export const auth = defineAuth({
  loginWith: {
    email: true,
    ...(enableGoogleSignIn
      ? {
          externalProviders: {
            google: {
              clientId: secret('GOOGLE_CLIENT_ID'),
              clientSecret: secret('GOOGLE_CLIENT_SECRET'),
              scopes: ['email', 'profile'],
            },
            callbackUrls: [
              'http://localhost:5173/',
              'https://main.d16slcsf31va.amplifyapp.com/',
            ],
            logoutUrls: [
              'http://localhost:5173/',
              'https://main.d16slcsf31va.amplifyapp.com/',
            ],
          },
        }
      : {}),
  },
  // .ac.kr 학교 이메일만 가입 허용 — 이메일/비밀번호 및 소셜(Google) 가입 모두 적용.
  triggers: {
    preSignUp,
  },
});
