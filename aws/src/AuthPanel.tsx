import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export const authenticatorOptions: {
  loginMechanisms: ('email')[];
  socialProviders: ('google')[];
} = {
  loginMechanisms: ['email'],
  socialProviders: ['google'],
};

export default function AuthPanel() {
  return <Authenticator {...authenticatorOptions} />;
}
