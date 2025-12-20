"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, getDocs, writeBatch, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SetupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const createDirectorAccount = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      addLog("❌ 請填寫所有欄位");
      return;
    }

    setLoading(true);
    try {
      addLog("🔄 開始建立總監帳號...");
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      addLog(`✅ Firebase Auth 帳號已建立: ${user.uid}`);
      
      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        role: "director",
        teamId: "main_team",
        createdAt: new Date().toISOString()
      });
      
      addLog(`✅ 使用者資料已建立: ${name} (總監)`);
      
      // Create main team
      await setDoc(doc(db, "teams", "main_team"), {
        id: "main_team",
        name: "主要團隊",
        description: "系統預設團隊",
        createdAt: new Date().toISOString()
      });
      
      addLog("✅ 主要團隊已建立");
      addLog("🎉 總監帳號建立完成！");
      
    } catch (error: any) {
      addLog(`❌ 建立帳號失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const migrateLegacyData = async () => {
    if (!auth.currentUser) {
      addLog("❌ 請先登入總監帳號");
      return;
    }

    setLoading(true);
    const directorId = auth.currentUser.uid;
    
    try {
      addLog("🔄 開始遷移舊資料...");
      
      // Migrate contracts
      addLog("📋 處理合約資料...");
      const contractsQuery = query(collection(db, "contracts"));
      const contractsSnapshot = await getDocs(contractsQuery);
      
      let contractBatch = writeBatch(db);
      let contractCount = 0;
      
      contractsSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (!data.ownerId || !data.teamId) {
          contractBatch.update(docSnapshot.ref, {
            ownerId: directorId,
            teamId: "main_team",
            lastModified: new Date().toISOString(),
            updatedBy: directorId
          });
          contractCount++;
        }
      });
      
      if (contractCount > 0) {
        await contractBatch.commit();
        addLog(`✅ 已更新 ${contractCount} 筆合約資料`);
      } else {
        addLog("ℹ️ 所有合約資料已包含 RBAC 欄位");
      }
      
      // Migrate tasks
      addLog("📝 處理任務資料...");
      const tasksQuery = query(collection(db, "tasks"));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      let taskBatch = writeBatch(db);
      let taskCount = 0;
      
      tasksSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (!data.ownerId || !data.teamId) {
          taskBatch.update(docSnapshot.ref, {
            ownerId: directorId,
            teamId: "main_team",
            lastModified: new Date().toISOString(),
            updatedBy: directorId
          });
          taskCount++;
        }
      });
      
      if (taskCount > 0) {
        await taskBatch.commit();
        addLog(`✅ 已更新 ${taskCount} 筆任務資料`);
      } else {
        addLog("ℹ️ 所有任務資料已包含 RBAC 欄位");
      }
      
      addLog("🎉 資料遷移完成！");
      
    } catch (error: any) {
      addLog(`❌ 資料遷移失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            系統初始化 (System Setup)
          </h1>
          
          {/* Section 1: Create Admin Account */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              1. 建立總監帳號
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                  placeholder="請輸入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                  placeholder="admin@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密碼
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                  placeholder="請輸入密碼"
                />
              </div>
            </div>
            <button
              onClick={createDirectorAccount}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? '處理中...' : '建立總監帳號'}
            </button>
          </div>

          {/* Section 2: Migrate Data */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              2. 舊資料遷移
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              將所有現有的合約和任務資料加入 RBAC 欄位 (ownerId, teamId)
            </p>
            <button
              onClick={migrateLegacyData}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? '遷移中...' : '執行舊資料遷移'}
            </button>
          </div>

          {/* Console/Status Log */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                執行日誌
              </h2>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                清除日誌
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待執行...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}