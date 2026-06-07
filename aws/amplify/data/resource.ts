import { type ClientSchema, a, defineData, defineFunction, secret } from '@aws-amplify/backend';

const verifyAnswerHandler = defineFunction({
  name: 'verify-answer',
  entry: './verify-answer/handler.ts',
});

const analyzeImageHandler = defineFunction({
  name: 'analyze-image',
  entry: './analyze-image/handler.ts',
});

const matchItemHandler = defineFunction({
  name: 'match-item',
  entry: './match-item/handler.ts',
  timeoutSeconds: 30,
  environment: {
    OPENAI_API_KEY: secret('OPENAI_API_KEY'),
    PINECONE_API_KEY: secret('PINECONE_API_KEY'),
    PINECONE_INDEX: secret('PINECONE_INDEX'),
  },
});

const schema = a
  .schema({
    VerifyAnswerResult: a.customType({
      success: a.boolean().required(),
      remainingAttempts: a.integer().required(),
      message: a.string().required(),
    }),

    verifyAnswer: a
      .mutation()
      .arguments({
        itemId: a.id().required(),
        answer: a.string().required(),
      })
      .returns(a.ref('VerifyAnswerResult'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(verifyAnswerHandler)),

    // 발행자(owner)가 자기 글의 정답을 서버에서 salt 해시해 VerificationSecret 에 저장.
    // owner 검증은 함수 내부에서 수행. 같은 verify-answer Lambda 가 fieldName 으로 분기 처리.
    setVerificationAnswer: a
      .mutation()
      .arguments({
        itemId: a.id().required(),
        answer: a.string().required(),
      })
      .returns(a.ref('VerifyAnswerResult'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(verifyAnswerHandler)),

    AnalyzeImageLabelsResult: a.customType({
      success: a.boolean().required(),
      message: a.string().required(),
    }),

    GenerateMatchesResult: a.customType({
      success: a.boolean().required(),
      message: a.string().required(),
    }),

    analyzeImageLabels: a
      .mutation()
      .arguments({
        itemId: a.id().required(),
      })
      .returns(a.ref('AnalyzeImageLabelsResult'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(analyzeImageHandler)),

    generateMatches: a
      .mutation()
      .arguments({
        itemId: a.id().required(),
      })
      .returns(a.ref('GenerateMatchesResult'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(matchItemHandler)),

    Item: a
      .model({
        type: a.enum(['lost', 'found']),
        status: a.enum(['active', 'matched', 'resolved', 'expired']),
        category: a.enum(['wallet', 'phone', 'card', 'key', 'bag', 'book', 'electronics', 'clothing', 'other']),
        title: a.string().required(),
        description: a.string().required(),
        location: a.string().required(),
        lostDate: a.datetime().required(),
        imageKeys: a.string().array(),
        visionLabels: a.string().array(),
        embeddingId: a.string(),

        verificationQ: a.string().required(),

        ownerName: a.string(),
        expiresAt: a.datetime(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read']),
        allow.owner().to(['create', 'update', 'delete', 'read']),
      ]),

    // 정답 해시 + salt 는 별도 owner 전용 모델에 저장(비-owner 는 접근 불가).
    // 발행은 서버 setVerificationAnswer 가, 검증은 verify-answer 함수가 IAM(allow.resource)으로 읽는다.
    VerificationSecret: a
      .model({
        itemId: a.id().required(),
        answerHash: a.string().required(),
        salt: a.string().required(),
      })
      .identifier(['itemId'])
      .authorization((allow) => [
        allow.owner(),
      ]),

    Match: a
      .model({
        lostItemId: a.id().required(),
        foundItemId: a.id().required(),
        similarityScore: a.float().required(),
        status: a.enum(['pending', 'verified', 'rejected']),
      })
      .authorization((allow) => [
        allow.owner().to(['read', 'create', 'update']),
      ]),

    VerificationAttempt: a
      .model({
        itemId: a.id().required(),
        userId: a.string().required(),
        success: a.boolean().required(),
        attemptedAt: a.datetime().required(),
      })
      .authorization((allow) => [
        allow.owner().to(['read']),
      ]),
  })
  .authorization((allow) => [
    allow.resource(verifyAnswerHandler).to(['query', 'mutate']),
    allow.resource(analyzeImageHandler).to(['query', 'mutate']),
    allow.resource(matchItemHandler).to(['query', 'mutate']),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
