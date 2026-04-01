import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import { storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { addItem } from '../hooks/useFirestore';
import ItemForm, { type ItemFormData } from '../components/ItemForm';

export default function PostNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: ItemFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      const tempId = crypto.randomUUID();

      // 이미지 업로드 — UID로 격리된 경로
      const imageUrls: string[] = [];
      for (const file of data.images) {
        const fileId = crypto.randomUUID();
        const storageRef = ref(storage, `users/${user.uid}/items/${tempId}/${fileId}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      // Firestore에 저장 (verificationA는 서버에서 hash 처리)
      const itemId = await addItem({
        type: data.type,
        status: 'active',
        category: data.category,
        title: data.title,
        description: data.description,
        location: data.location,
        lostDate: Timestamp.fromDate(new Date(data.lostDate)),
        imageUrls,
        verificationQ: data.verificationQ,
        verificationA: data.verificationA,
        userId: user.uid,
        userName: user.displayName ?? '',
      });

      navigate(`/item/${itemId}`);
    } catch (error) {
      console.error('등록 실패:', error);
      alert('등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">분실물/습득물 등록</h1>
      <ItemForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
