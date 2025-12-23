"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'sales' | 'manager' | 'director';
  teamId: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        const emailKey = firebaseUser.email!.toLowerCase().trim();
        
        // 1. 先用 UID 找 (正式帳號)
        let userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        // 2. 找不到，改用 Email 找 (總監預建名單)
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, "users", emailKey));
        }

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // 💡 確保設定正確的 TypeScript 類型結構
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData.name || '',
            role: userData.role || 'sales',
            teamId: userData.teamId || ''
          });
          
          // 💡 自動對接：如果目前還是用 Email 登入，幫他更新成 UID 存檔，下次就更快
          if (userDoc.id === emailKey) {
            await setDoc(doc(db, "users", firebaseUser.uid), {
              ...userData,
              uid: firebaseUser.uid,
              status: "active"
            });
          }
        } else {
          setProfile(null); // 真的沒資料才失敗
        }
        
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};