import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import ItemForm, { type ItemFormData } from '../components/ItemForm';
import { useAuth } from '../hooks/useAuth';
import { addItem } from '../hooks/useFirestore';
import { storage } from '../lib/firebase';

const locale = 'ko' as const;

const text = {
  ko: {
    badge: '새 게시글',
    title: '정확한 정보가 있을수록 더 빠르게 주인을 찾을 수 있습니다.',
    description: '제목, 사진, 본인 확인 질문을 구체적으로 작성하면 잘못된 신고를 줄이고 실제 주인과 더 빠르게 연결할 수 있습니다.',
    tip1: '가방, 지갑, 학생증, 전자기기는 사진을 함께 올리면 찾기 쉽습니다.',
    tip2: '본인 확인 답변은 설명란에 노출하지 마세요.',
    tip3: '장소와 날짜를 구체적으로 적을수록 게시글의 신뢰도가 높아집니다.',
  },
  en: {
    badge: 'New post',
    title: 'Share enough detail to make the match trustworthy.',
    description: 'Strong titles, useful photos, and a verification question make it easier to reconnect owners with their items while preventing false claims.',
    tip1: 'Use photos for bags, wallets, IDs, and electronics whenever possible.',
    tip2: 'Avoid putting the verification answer in the description.',
    tip3: 'Posts stay more useful when the location and date are specific.',
  },
};

export default function PostNew() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const t = text[locale];

  const handleSubmit = async (data: ItemFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      const tempId = crypto.randomUUID();
      const imageUrls: string[] = [];

      for (const file of data.images) {
        const fileId = crypto.randomUUID();
        const storageRef = ref(storage, `users/${user.uid}/items/${tempId}/${fileId}`);
        const snapshot = await uploadBytes(storageRef, file);
        imageUrls.push(await getDownloadURL(snapshot.ref));
      }

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

      window.location.assign(`/item/${itemId}`);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('The post could not be published. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[2rem] bg-[linear-gradient(155deg,_#0f172a,_#0369a1)] p-6 text-white shadow-lg">
        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
          {t.badge}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-4 text-sm leading-6 text-sky-100/90">{t.description}</p>
        <div className="mt-6 space-y-3 text-sm text-sky-50">
          <div className="rounded-2xl bg-white/10 p-4">{t.tip1}</div>
          <div className="rounded-2xl bg-white/10 p-4">{t.tip2}</div>
          <div className="rounded-2xl bg-white/10 p-4">{t.tip3}</div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <ItemForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </section>
  );
}
