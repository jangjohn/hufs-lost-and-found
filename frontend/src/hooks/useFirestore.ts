import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import type { QueryConstraint, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Item, ItemType, ItemCategory } from '../lib/types';

interface ItemFilters {
  type?: ItemType;
  category?: ItemCategory;
  location?: string;
}

export function useItems(filters: ItemFilters = {}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    ];

    if (filters.type) {
      constraints.unshift(where('type', '==', filters.type));
    }
    if (filters.category) {
      constraints.unshift(where('category', '==', filters.category));
    }
    if (filters.location) {
      constraints.unshift(where('location', '==', filters.location));
    }

    const q = query(collection(db, 'items'), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Item[];
      setItems(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [filters.type, filters.category, filters.location]);

  return { items, loading };
}

// verificationA 는 서버에서 hash 후 verificationAHash로 저장
export async function addItem(
  data: Omit<Item, 'id' | 'createdAt' | 'expiresAt' | 'visionLabels' | 'embeddingId'> & { verificationA: string }
) {
  // 클라이언트에서 SHA-256 hash 생성 후 저장
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(data.verificationA.trim().toLowerCase())
  );
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { verificationA, ...rest } = data;
  void verificationA;

  const docRef = await addDoc(collection(db, 'items'), {
    ...rest,
    verificationAHash: hashHex,
    visionLabels: [],
    embeddingId: '',
    createdAt: serverTimestamp(),
    // expiresAt는 onItemCreated Cloud Function에서 서버 시간 기준으로 계산
  });

  return docRef.id;
}

export async function getItem(id: string): Promise<Item | null> {
  const docSnap = await getDoc(doc(db, 'items', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Item;
}

export async function updateItem(id: string, data: Partial<DocumentData>) {
  await updateDoc(doc(db, 'items', id), data);
}

// in 查询 30개 제한 분할 유틸
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function getMatchesForUser(userId: string) {
  const itemsQuery = query(collection(db, 'items'), where('userId', '==', userId));
  const itemsSnap = await getDocs(itemsQuery);
  const itemIds = itemsSnap.docs.map((d) => d.id);

  if (itemIds.length === 0) return [];

  // Firestore in 查询 최대 30개 제한 → 분할
  const chunks = chunkArray(itemIds, 30);

  const allSnaps = await Promise.all(
    chunks.flatMap((chunk) => [
      getDocs(query(collection(db, 'matches'), where('lostItemId', 'in', chunk))),
      getDocs(query(collection(db, 'matches'), where('foundItemId', 'in', chunk))),
    ])
  );

  const seen = new Set<string>();
  return allSnaps.flatMap((snap) =>
    snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
  );
}
