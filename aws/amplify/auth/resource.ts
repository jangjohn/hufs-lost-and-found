import { defineAuth, secret } from '@aws-amplify/backend';

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
});
