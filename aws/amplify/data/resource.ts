import { type ClientSchema, a, defineData, defineFunction } from '@aws-amplify/backend';

const verifyAnswerHandler = defineFunction({
  name: 'verify-answer',
  entry: './verify-answer/handler.ts',
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

        verificationQ: a.string().required(),

        ownerName: a.string(),
        expiresAt: a.datetime(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read']),
        allow.owner().to(['create', 'update', 'delete', 'read']),
      ]),

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
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
