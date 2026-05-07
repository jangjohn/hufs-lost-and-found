# AWS Migration Submission Summary

## What was migrated

A separate AWS version of the HUFS Lost & Found application was created under `aws/`.

The existing Firebase implementation was intentionally kept unchanged for comparison.

## AWS services used

- **AWS Amplify Hosting** for frontend hosting
- **Amazon Cognito** for user authentication
- **AWS AppSync + DynamoDB** for lost/found item, match, and verification data
- **Amazon S3** for item image storage
- **Amplify Gen2** for infrastructure-as-code backend definitions

## Implemented features

- School email sign-in flow UI
- Lost/found item board
- Item creation form
- Category/type/search filters
- S3 image object field
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

The UI includes local demo persistence so the application can be demonstrated immediately. The AWS backend definitions are ready for Amplify Gen2 deployment using `npx ampx sandbox` or Amplify Hosting connected to GitHub.
