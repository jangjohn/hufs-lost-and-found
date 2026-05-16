import { describe, expect, it } from 'vitest';
import { buildItemImagePath, toItemCreateInput } from './awsItem';

describe('AWS item helpers', () => {
  it('converts the date-only form value into an Amplify datetime payload', () => {
    const payload = toItemCreateInput(
      {
        type: 'lost',
        category: 'wallet',
        title: 'Lost wallet',
        description: 'Black wallet near the library',
        location: 'Library',
        lostDate: '2026-05-07',
        verificationQ: 'What brand is it?',
        verificationA: 'hermes'
      },
      ['item-images/ap-northeast-2:abc/item-1/wallet.jpg'],
      'student@hufs.ac.kr',
    );

    expect(payload).toEqual({
      type: 'lost',
      status: 'active',
      category: 'wallet',
      title: 'Lost wallet',
      description: 'Black wallet near the library',
      location: 'Library',
      lostDate: '2026-05-07T00:00:00.000Z',
      imageKeys: ['item-images/ap-northeast-2:abc/item-1/wallet.jpg'],
      verificationQ: 'What brand is it?',
      ownerName: 'student@hufs.ac.kr',
    });
    expect(payload).not.toHaveProperty('ownerId');
  });

  it('rejects invalid date values before calling Amplify Data', () => {
    expect(() =>
      toItemCreateInput(
        {
          type: 'found',
          category: 'phone',
          title: 'Phone',
          description: 'Found on campus',
          location: 'Student Center',
          lostDate: 'not-a-date',
          verificationQ: 'What case color?',
          verificationA: 'black'
        },
        [],
        'student@hufs.ac.kr',
      ),
    ).toThrow('Invalid lost/found date');
  });

  it('builds a private identity-scoped S3 image path with a safe filename', () => {
    const path = buildItemImagePath('item-123', 'My Photo (1).jpg')({
      identityId: 'ap-northeast-2:abc',
    });

    expect(path).toBe('item-images/ap-northeast-2:abc/item-123/My-Photo-1.jpg');
  });
});
