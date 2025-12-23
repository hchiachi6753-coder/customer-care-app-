"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Shield, Mail, User } from "lucide-react";

export default function V2MemberManager() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "sales",
    password: "password123" // 預設密碼，建議請業務登入後修改
  });

  // 抓取同團隊的所有成員
  useEffect(() => {
    const fetchMembers = async () => {
      if (!profile?.teamId) return;
      try {
        const q = query(collection(db, "users"), where("teamId", "==", profile.teamId));
        const snapshot = await getDocs(q);

        // 💡 前端過濾重複：確保同一個 Email 只出現一次
        // 優先保留 ID 等於 Email 的那筆 (如果有的話)，或是最新的
        const uniqueMap = new Map();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const email = data.email?.toLowerCase();
          if (!email) return;

          // 如果 Map 裡面還從未有過這個人，就加入
          // 或者如果當前這筆 doc.id 長得像 email (代表是用新規則 setDoc 建立的)，就覆蓋掉舊的亂數 ID
          const existing = uniqueMap.get(email);
          if (!existing || doc.id === email) {
            uniqueMap.set(email, { id: doc.id, ...data });
          }
        });

        setMembers(Array.from(uniqueMap.values()));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchMembers();
  }, [profile]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== "director") return alert("只有總監可以新增成員");

    setLoading(true);
    try {
      // 💡 註：在前端直接建立 Auth 帳號需要管理權限。
      // 這裡我們先實作「Firestore 資料預建」，讓業務第一次用該 Email 登入時自動關聯。
      // 之後我們可以補上 Firebase Admin SDK 或是導引業務自行註冊。

      const emailKey = newMember.email.toLowerCase().trim(); // 統一小寫去空格

      // 💡 關鍵修正：將 doc(db, "users", emailKey) 作為第二個參數
      await setDoc(doc(db, "users", emailKey), {
        name: newMember.name,
        email: emailKey,
        role: newMember.role,
        teamId: profile.teamId,
        createdAt: serverTimestamp(),
        status: "invited"
      });

      alert(`帳號預建完成！\n姓名：${newMember.name}\nEmail：${newMember.email}\n密碼：${newMember.password}\n\n請直接將資訊提供給業務進行登入即可。`);
      setShowAddModal(false);
      window.location.reload();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">團隊成員管理</h1>
            <p className="text-sm text-gray-500">管理 {profile?.teamId} 團隊的成員權限</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700"
          >
            <UserPlus size={18} /> 新增業務
          </button>
        </header>

        {/* 成員列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
              <tr>
                <th className="px-6 py-4">成員姓名</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">工作負載</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                    {/* 頭像與狀態小點 */}
                    <div className="relative">
                      <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-black">
                        {m.name?.[0] || 'U'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{m.name}</div>
                      <div className="text-[10px] text-gray-400">{m.email}</div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border ${m.role === 'director'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                      {m.role === 'director' ? '總監' : '業務'}
                    </span>
                  </td>

                  {/* 新增：工作負載/戰績概覽 */}
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <div className="text-center px-3 py-1 bg-red-50 rounded-lg border border-red-100">
                        <div className="text-[10px] text-red-400 font-bold uppercase">逾期</div>
                        <div className="text-sm font-black text-red-700">3</div> {/* 這裡未來可帶入真實數字 */}
                      </div>
                      <div className="text-center px-3 py-1 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-[10px] text-green-400 font-bold uppercase">今日</div>
                        <div className="text-sm font-black text-green-700">5</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-blue-600 transition-colors p-2">
                      {/* 更多操作按鈕，例如編輯或重設密碼 */}
                      <Shield size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增成員 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddMember} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">新增團隊成員</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">姓名</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 p-3 border-2 border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 outline-none transition-all"
                    placeholder="請輸入真實姓名"
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="業務的登入 Email"
                    value={newMember.email}
                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  />
                </div>
              </div>
              {/* 在 Email 欄位下方新增密碼欄位 */}
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-900">初始密碼 *</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border-2 border-gray-400 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-600 outline-none"
                  placeholder="例如: 123456"
                  value={newMember.password}
                  onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                />
                {/* 下方的字體加深並標註至少六位數 */}
                <p className="text-xs font-bold text-blue-700">※ 密碼設定完成後請直接口頭告知業務，長度至少需 6 位數。</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">權限角色</label>
                <select
                  className="w-full p-3 border-2 border-gray-400 rounded-xl text-gray-900 focus:border-blue-600 bg-white"
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                >
                  <option value="sales">業務 (Sales)</option>
                  <option value="manager">業務主管 (Manager)</option>
                  <option value="director">總監 (Director)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-400 font-bold">取消</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">確認新增</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}