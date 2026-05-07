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
  return <Authenticator {...authenticatorOptions} />;
}
