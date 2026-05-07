export type ItemType = 'lost' | 'found';
export type ItemStatus = 'active' | 'matched' | 'resolved' | 'expired';
export type ItemCategory = 'wallet' | 'phone' | 'card' | 'key' | 'bag' | 'book' | 'electronics' | 'clothing' | 'other';

export interface ItemFormState {
  type: ItemType;
  category: ItemCategory;
  title: string;
  description: string;
  location: string;
  lostDate: string;
  verificationQ: string;
}

export interface ItemCreateInput extends ItemFormState {
  status: 'active';
  lostDate: string;
  imageKeys: string[];
  ownerName: string;
}

export const categories: ItemCategory[] = ['wallet', 'phone', 'card', 'key', 'bag', 'book', 'electronics', 'clothing', 'other'];

export function toAmplifyDateTime(dateOnly: string) {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);

  if (!dateOnly || Number.isNaN(date.valueOf())) {
    throw new Error('Invalid lost/found date');
  }

  return date.toISOString();
}

export function toDateInputValue(dateTime?: string | null) {
  if (!dateTime) return '';
  return dateTime.slice(0, 10);
}

export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/(\.[^/.]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const sanitizedBaseName = baseName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${sanitizedBaseName || 'upload'}${extension}`;
}

export function buildItemImagePath(itemId: string, fileName: string) {
  const safeFileName = sanitizeStorageFileName(fileName);

  return ({ identityId }: { identityId?: string }) => {
    if (!identityId) {
      throw new Error('Missing Amplify identity id for S3 upload');
    }

    return `item-images/${identityId}/${itemId}/${safeFileName}`;
  };
}

export function toItemCreateInput(form: ItemFormState, imageKeys: string[], ownerName: string): ItemCreateInput {
  return {
    ...form,
    status: 'active',
    lostDate: toAmplifyDateTime(form.lostDate),
    imageKeys,
    ownerName,
  };
}
