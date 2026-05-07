import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function AuthPanel() {
  return <Authenticator loginMechanisms={['email']} />;
}
