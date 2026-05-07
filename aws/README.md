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
npm run dev
```

The local UI includes a demo cache so it can be shown immediately even before cloud resources are provisioned.

## Deploy with AWS Amplify Hosting

1. Push this repository to GitHub.
2. Open AWS Amplify Console.
3. Choose **Create new app** -> **Host web app**.
4. Connect the GitHub repository.
5. Set the app root to:

```text
lost-and-found/aws
```

If Amplify asks for build settings, use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
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

## Deploy backend sandbox

Install dependencies first:

```powershell
npm install
```

Then run:

```powershell
npx ampx sandbox
```

This provisions the Amplify Gen2 backend resources in your AWS account:

- Cognito user pool
- DynamoDB-backed GraphQL API
- S3 bucket for item images

## Assignment note

This is an AWS-only project folder created for the migration submission. The original Firebase implementation remains in the parent project for comparison.
