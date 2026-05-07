import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'lostFoundImages',
  access: (allow) => ({
    'item-images/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ],
  }),
});
