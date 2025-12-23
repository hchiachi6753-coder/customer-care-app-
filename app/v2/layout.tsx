"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import V2Navbar from "@/components/V2Navbar";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();

  // 💡 使用 useEffect 處理路由跳轉，避免在渲染過程中調用
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // 1. 如果還在載入中，絕對不載入 children (首頁內容)，避免噴紅色錯誤
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-orange-600 font-black animate-pulse">系統權限對接中...</p>
        </div>
      </div>
    );
  }

  // 2. 如果沒有 user (已登出) 顯示載入畫面，等待 useEffect 跳轉
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-orange-600 font-black">正在跳轉至登入頁...</div>
      </div>
    );
  }

  // 3. 如果有 user 但沒有 profile，代表對接失敗
  if (!profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">權限對接失敗</h2>
        <p className="text-gray-500 mb-8">請確認總監已將您的 Email 加入名單，或嘗試重新登入。</p>
        <button 
          onClick={async () => { await signOut(auth); router.push("/login"); }}
          className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg"
        >
          返回登入介面
        </button>
      </div>
    );
  }

  // 3. 只有當 profile 確定存在 (有 teamId, 有 role) 之後，才渲染首頁與導覽列
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 頂部狀態列 */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            {profile.name[0]}
          </div>
          <span className="font-black text-gray-900">{profile.name}</span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">{profile.role}</span>
        </div>
        <button onClick={() => auth.signOut()} className="text-xs font-bold text-gray-400 hover:text-red-500">登出</button>
      </header>

      <main className="pb-24">
        {children}
      </main>

      <V2Navbar />
    </div>
  );
}