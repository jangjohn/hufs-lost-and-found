import { Amplify, type ResourcesConfig } from 'aws-amplify';
import 'aws-amplify/auth/enable-oauth-listener';

const outputModules = import.meta.glob('./amplify_outputs.json', {
  eager: true,
  import: 'default',
}) as Record<string, ResourcesConfig>;

export const amplifyOutputs = outputModules['./amplify_outputs.json'];
export const amplifyConfigured = Boolean(amplifyOutputs);

if (amplifyOutputs) {
  Amplify.configure(amplifyOutputs);
}
