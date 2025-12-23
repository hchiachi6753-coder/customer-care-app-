"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function V2SmartLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSmartLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const lowEmail = email.toLowerCase().trim();

    try {
      // 1. 嘗試直接登入
      await signInWithEmailAndPassword(auth, lowEmail, password);
      router.push("/v2");
    } catch (error: any) {
      console.log("登入錯誤:", error.code, error.message);
      
      // 2. 如果登入失敗，判斷是否為「尚未註冊的新成員」
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        
        try {
          // 檢查 Firestore 是否有總監預建的「紙條」
          const emailDoc = await getDoc(doc(db, "users", lowEmail));
          console.log("預建資料檢查:", emailDoc.exists());
          
          if (emailDoc.exists()) {
            // 💡 關鍵：發現是預建名單，自動幫他註冊！
            console.log("找到預建資料，正在自動註冊...");
            try {
              await createUserWithEmailAndPassword(auth, lowEmail, password);
              console.log("註冊成功，正在跳轉...");
              alert("首次登入成功！已為您開通權限。");
              router.push("/v2");
              return; // 重要：成功後直接返回
            } catch (regError: any) {
              console.log("註冊錯誤:", regError.code, regError.message);
              if (regError.code === "auth/email-already-in-use") {
                alert("此 Email 已註冊過，請直接登入或聯繫總監重設密碼。");
              } else {
                alert("註冊失敗：" + regError.message);
              }
            }
          } else {
            console.log("未找到預建資料");
            alert("登入失敗：找不到預建資料。請確認總監是否已將您加入名單。");
          }
        } catch (firestoreError: any) {
          console.log("Firestore 檢查錯誤:", firestoreError.message);
          alert("系統錯誤，請稍後再試。");
        }
      } else {
        alert("登入錯誤：" + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border-t-8 border-orange-500">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">客戶關懷系統</h1>
          <div className="inline-block bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">
            V2 Professional
          </div>
        </header>

        <form onSubmit={handleSmartLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email 帳號</label>
            <input 
              type="email" required placeholder="example@gmail.com"
              className="w-full p-4 border-2 border-gray-200 rounded-2xl text-gray-900 font-bold focus:border-orange-500 outline-none transition-all"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">登入密碼</label>
            <input 
              type="password" required placeholder="請輸入密碼"
              className="w-full p-4 border-2 border-gray-200 rounded-2xl text-gray-900 font-bold focus:border-orange-500 outline-none transition-all"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className={`w-full ${loading ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'} text-white py-5 rounded-2xl font-black shadow-lg shadow-orange-200 transition-all active:scale-95 text-lg`}
          >
            {loading ? "處理中..." : "登入系統"}
          </button>
        </form>
        
        <p className="mt-8 text-center text-xs text-gray-400 font-medium">
          © 2025 CRM V2 版權所有
        </p>
      </div>
    </div>
  );
}