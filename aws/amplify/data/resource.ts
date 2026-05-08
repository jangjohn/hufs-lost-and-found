import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
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
      verificationAHash: a.string(),
      ownerName: a.string(),
      expiresAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'delete']),
      allow.owner().to(['create', 'update', 'delete', 'read']),
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
    .authorization((allow) => [allow.owner().to(['read', 'create'])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
