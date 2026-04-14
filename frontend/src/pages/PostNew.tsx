import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import ItemForm, { type ItemFormData } from '../components/ItemForm';
import { useAuth } from '../hooks/useAuth';
import { addItem } from '../hooks/useFirestore';
import { storage } from '../lib/firebase';

export default function PostNew() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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
          New post
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Share enough detail to make the match trustworthy.</h1>
        <p className="mt-4 text-sm leading-6 text-sky-100/90">
          Strong titles, useful photos, and a verification question make it easier to reconnect owners with their items while preventing false claims.
        </p>
        <div className="mt-6 space-y-3 text-sm text-sky-50">
          <div className="rounded-2xl bg-white/10 p-4">Use photos for bags, wallets, IDs, and electronics whenever possible.</div>
          <div className="rounded-2xl bg-white/10 p-4">Avoid putting the verification answer in the description.</div>
          <div className="rounded-2xl bg-white/10 p-4">Posts stay more useful when the location and date are specific.</div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <ItemForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </section>
  );
}
