import { defineBackend } from '@aws-amplify/backend';
import { Aspects, IAspect, Lazy } from 'aws-cdk-lib';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const backend = defineBackend({
  auth,
  data,
  storage,
});

const bucket = backend.storage.resources.bucket;

// Aspect to ensure the analyze-image Lambda (L2 Function in the construct tree) gets
// the STORAGE_BUCKET_NAME env var, plus keep the S3 grant and Rekognition policy.
// This works regardless of whether backend.data.resources.functions exposes the entry
// (it may be empty for handler functions) because we visit the actual defining constructs.
class AnalyzeImageFunctionAspect implements IAspect {
  visit(node: any) {
    // Duck-type for Lambda L2 constructs that support addEnvironment (the real defining
    // instances, not IFunction refs which make addEnvironment a no-op).
    if (node && typeof node.addEnvironment === 'function' && typeof node.functionName === 'string') {
      const logicalId = (node.node.id || '').toLowerCase();
      const fnTok = (node.functionName || '').toLowerCase();
      if (logicalId.includes('analyze-image') || logicalId.includes('analyzeimagelambda') || fnTok.includes('analyze-image') || fnTok.includes('analyzeimagelambda')) {
        node.addEnvironment('STORAGE_BUCKET_NAME', bucket.bucketName);
        bucket.grantRead(node);
        node.addToRolePolicy(
          new PolicyStatement({
            actions: ['rekognition:DetectLabels'],
            resources: ['*'],
          })
        );
        // Force via cfn override too, in case Amplify internal overrides Environment later
        try {
          const cfn = node.node.findChild('Resource') as any;
          const curr = (cfn.environment && cfn.environment.variables) || {};
          cfn.addPropertyOverride('Environment.Variables', Lazy.any({
            produce: () => ({...curr, STORAGE_BUCKET_NAME: bucket.bucketName })
          }));
        } catch (e) {}
      }
    }
  }
}

Aspects.of(backend.stack).add(new AnalyzeImageFunctionAspect());
