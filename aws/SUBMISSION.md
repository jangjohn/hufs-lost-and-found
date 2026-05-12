# AWS Migration Submission Summary

## What was migrated

A separate AWS version of the HUFS Lost & Found application was created under `aws/`.

The existing Firebase implementation was intentionally kept under `firebase/` for comparison.

## AWS services used

- **AWS Amplify Hosting** for frontend hosting
- **Amazon Cognito** for user authentication
- **AWS AppSync + DynamoDB** for lost/found item, match, and verification data
- **Amazon S3** for item image storage
- **Amplify Gen2** for infrastructure-as-code backend definitions

## Implemented features

- Cognito email sign-in flow through Amplify Authenticator
- Lost/found item board backed by Amplify Data
- Item creation form that writes to AppSync/DynamoDB
- Category/type/search filters
- Image upload to S3 through Amplify Storage
- Matching preview based on category/location
- Responsive web UI
- Amplify backend resources defined as code

## Important files

```text
aws/amplify/backend.ts
aws/amplify/auth/resource.ts
aws/amplify/data/resource.ts
aws/amplify/storage/resource.ts
aws/src/App.tsx
aws/src/styles.css
aws/README.md
```

## Build verification

The AWS project build was verified locally with:

```powershell
npm run build
```

Result: successful Vite production build.

## Notes

Run `npx ampx sandbox --outputs-out-dir src` for local AWS testing. Amplify Hosting runs `npx ampx pipeline-deploy` during preBuild to generate the same client configuration before the Vite build.
