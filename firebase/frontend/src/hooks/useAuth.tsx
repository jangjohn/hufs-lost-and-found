/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function useProvideAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 세션 복원 시에도 .ac.kr 복검
        await firebaseUser.reload();
        const email = firebaseUser.email ?? '';
        if (!email.endsWith('.ac.kr')) {
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email ?? '';

    if (!email.endsWith('.ac.kr')) {
      await firebaseSignOut(auth);
      throw new Error('학교 이메일(.ac.kr)로만 가입할 수 있습니다.');
    }

    // Firestore users 문서 생성
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName ?? '',
        fcmTokens: [],
        subscriptions: [],
        createdAt: serverTimestamp(),
      });
    }

    return result.user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return { user, loading, signInWithGoogle, signOut };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useProvideAuth();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
