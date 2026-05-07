# HUFS Lost & Found AWS Version

This folder is an isolated AWS submission version of the HUFS Lost & Found project. It does not replace or modify the original Firebase implementation.

## AWS architecture

- **Hosting**: AWS Amplify Hosting
- **Authentication**: Amazon Cognito via Amplify Auth
- **Database**: AWS AppSync + DynamoDB via Amplify Data
- **Object storage**: Amazon S3 via Amplify Storage
- **Frontend**: React + Vite + TypeScript

## Folder structure

```text
aws/
  amplify/
    auth/resource.ts
    data/resource.ts
    storage/resource.ts
    backend.ts
  src/
    App.tsx
    main.tsx
    styles.css
  amplify.yml
  package.json
```

## Local run

```powershell
npm install
npx ampx sandbox --outputs-out-dir src
npm run dev
```

The sandbox command provisions the Cognito, AppSync/DynamoDB, and S3 resources and writes `src/amplify_outputs.json`, which the frontend uses at runtime.

## Deploy with AWS Amplify Hosting

1. Push this repository to GitHub.
2. Open AWS Amplify Console.
3. Choose **Create new app** -> **Host web app**.
4. Connect the GitHub repository.
5. Set the app root to:

```text
aws
```

If Amplify asks for build settings, use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - APP_ID="${AWS_AMPLIFY_APP_ID:-$AWS_APP_ID}"
        - if [ -n "$APP_ID" ]; then npx ampx pipeline-deploy --branch "${AWS_BRANCH:-main}" --app-id "$APP_ID" --outputs-out-dir src; fi
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Google sign-in setup

This AWS version uses Cognito Hosted UI for Google sign-in. Before deploying
the Google provider change, create an OAuth 2.0 Web application in Google Cloud
Console and add this authorized redirect URI:

```text
https://82957d991e896d39e538.auth.ap-northeast-2.amazoncognito.com/oauth2/idpresponse
```

Then add the OAuth client values to the Amplify `main` branch secrets:

```text
ENABLE_GOOGLE_SIGN_IN=true
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

The app callback and logout URLs are configured in `amplify/auth/resource.ts`
for both local Vite development and the Amplify Hosting URL.

## Deploy backend sandbox

Install dependencies first:

```powershell
npm install
```

Then run:

```powershell
npx ampx sandbox --outputs-out-dir src
```

This provisions the Amplify Gen2 backend resources in your AWS account:

- Cognito user pool
- DynamoDB-backed GraphQL API
- S3 bucket for item images
- `src/amplify_outputs.json` client configuration

## Assignment note

This is an AWS-only project folder created for the migration submission. The original Firebase implementation remains in the parent project for comparison.
