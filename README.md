# HUFS Lost & Found

This repository contains two versions of the HUFS Lost & Found project.

## Project versions

| Directory | Purpose | Stack |
| --- | --- | --- |
| `aws/` | Current AWS migration submission | AWS Amplify Hosting, Cognito, AppSync, DynamoDB, S3 |
| `firebase/` | Original implementation kept for migration comparison | Firebase Hosting, Firebase Auth, Firestore, Cloud Functions, Cloud Storage |

## Recommended review path

For the AWS migration submission, start with:

```bash
cd aws
cat README.md
cat SUBMISSION.md
```

For the original Firebase/GCP implementation, start with:

```bash
cd firebase
cat README.md
```

The Firebase version is preserved so reviewers can compare the pre-migration architecture with the AWS version.
