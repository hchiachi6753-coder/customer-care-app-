"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Shield, Mail, User, Edit2, Key, Trash2, AlertCircle } from "lucide-react";

export default function V2MemberManager() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null); // For Edit & Delete

  // New Member Form
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "sales",
    password: "password123",
    teamId: "Team1" // Default to Team1
  });

  // 1. Fetch Members (Fetch & Deduplicate)
  const fetchMembers = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let q;
      if (profile.role === 'director') {
        // Director sees ALL users to manage multiple teams
        q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      } else {
        // Others see only their team members
        q = query(collection(db, "users"), where("teamId", "==", profile.teamId));
      }

      const snapshot = await getDocs(q);

      const uniqueMap = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const email = data.email?.toLowerCase();
        if (!email) return;

        // Dedup Logic: unique by email
        const existing = uniqueMap.get(email);
        if (!existing || doc.id === email) {
          uniqueMap.set(email, { id: doc.id, ...data });
        }
      });
      setMembers(Array.from(uniqueMap.values()));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [profile]);

  // 2. Add Member Logic
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== "director") return alert("只有總監可以新增成員");

    setLoading(true);
    try {
      const emailKey = newMember.email.toLowerCase().trim();
      const assignedTeamId = newMember.teamId || "Team1";

      await setDoc(doc(db, "users", emailKey), {
        name: newMember.name,
        email: emailKey,
        role: newMember.role,
        teamId: assignedTeamId,
        createdAt: serverTimestamp(),
        status: "invited",
        password: newMember.password
      });

      alert(`帳號預建完成！\n姓名：${newMember.name}\nEmail：${newMember.email}\n密碼：${newMember.password}\n團隊：${assignedTeamId}\n\n請務必將此資訊提供給業務進行登入。`);
      setShowAddModal(false);

      // Reset form
      setNewMember({
        name: "",
        email: "",
        role: "sales",
        password: "password123",
        teamId: "Team1"
      });

      fetchMembers();
    } catch (e) {
      console.error(e);
      alert("新增失敗");
    }
    setLoading(false);
  };

  // 3. Edit Name Logic
  const openEditModal = (member: any) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleUpdateName = async () => {
    if (!editingMember || !editingMember.name) return;
    try {
      await updateDoc(doc(db, "users", editingMember.id), {
        name: editingMember.name,
        password: editingMember.password || "",
        teamId: editingMember.teamId // Update Team ID
      });
      alert("資料已更新！");
      setShowEditModal(false);
      setEditingMember(null);
      fetchMembers();
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  };

  // 4. Reset Password Logic (Send Email)
  const handleResetPassword = async (email: string) => {
    if (!confirm(`確定要發送「重設密碼信」給 ${email} 嗎？\n\n對方將會收到一封 Email，請他點擊連結重新設定密碼。`)) return;

    try {
      await sendPasswordResetEmail(auth, email);
      alert(`已發送重設密碼信至 ${email}`);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/user-not-found') {
        alert("此 Email 尚未註冊為系統使用者，無法重設密碼。\n請確認該業務是否已經完成第一次登入註冊。");
      } else {
        alert("發送失敗：" + e.message);
      }
    }
  };

  // 5. Delete Member Logic
  const handleDeleteMember = async (id: string, name: string) => {
    const confirmStr = prompt(`⚠️ 危險動作！\n\n您確定要刪除成員「${name}」嗎？\n這將導致他無法再登入系統。\n\n確認刪除請輸入：DELETE`);
    if (confirmStr !== "DELETE") return;

    try {
      await deleteDoc(doc(db, "users", id));
      alert(`成員 ${name} 已刪除`);
      fetchMembers();
    } catch (e) {
      console.error(e);
      alert("刪除失敗");
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">團隊成員管理</h1>
            <p className="text-sm text-gray-500">
              {profile?.role === 'director' ? '管理所有團隊成員' : `管理 ${profile?.teamId} 團隊成員`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
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
                <th className="px-6 py-4">團隊</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4 text-right">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
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
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">{m.teamId || "未分類"}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border ${m.role === 'director'
                      ? 'bg-purple-50 text-purple-700 border-purple-100'
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                      {m.role === 'director' ? '總監' : '業務'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="編輯姓名"
                      >
                        <Edit2 size={18} />
                      </button>

                      <button
                        onClick={() => handleResetPassword(m.email)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="發送重設密碼信"
                      >
                        <Key size={18} />
                      </button>

                      {m.role !== 'director' && (
                        <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="刪除成員"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
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
                    type="text" required
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
                    type="email" required
                    className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="業務的登入 Email"
                    value={newMember.email}
                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-900">初始密碼 *</label>
                <input
                  type="text" required
                  className="w-full p-3 border-2 border-gray-400 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-600 outline-none"
                  placeholder="例如: 123456"
                  value={newMember.password}
                  onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                />
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

              {/* 團隊 ID 選單 */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">所屬團隊 (Team Selection)</label>
                <select
                  className="w-full p-3 border-2 border-gray-400 rounded-xl text-gray-900 focus:border-blue-600 bg-white"
                  value={newMember.teamId}
                  onChange={e => setNewMember({ ...newMember, teamId: e.target.value })}
                >
                  <option value="Team1">Team1</option>
                  <option value="Team2">Team2</option>
                  <option value="Team3">Team3</option>
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

      {/* 編輯成員 Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">編輯成員資料</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 focus:border-blue-500 outline-none font-bold"
                  value={editingMember.name}
                  onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                />
              </div>

              {/* 團隊選擇 (編輯模式) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">所屬團隊</label>
                <select
                  className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 focus:border-blue-500 outline-none font-bold bg-white"
                  value={editingMember.teamId || ""}
                  onChange={e => setEditingMember({ ...editingMember, teamId: e.target.value })}
                >
                  <option value="">未分配</option>
                  <option value="Team1">Team1</option>
                  <option value="Team2">Team2</option>
                  <option value="Team3">Team3</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 font-bold mb-1">Email (無法修改)</p>
                <p className="text-sm font-black text-gray-600">{editingMember.email}</p>
              </div>

              {/* 編輯密碼 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">初始/備用密碼</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 focus:border-blue-500 outline-none font-bold placeholder:text-gray-300"
                  placeholder="若需修改請輸入"
                  value={editingMember.password || ""}
                  onChange={e => setEditingMember({ ...editingMember, password: e.target.value })}
                />
                {editingMember.status === 'active' ? (
                  <p className="text-[10px] text-orange-500 font-bold mt-1">
                    ⚠️ 此成員已啟用。修改此處主要是為了紀錄，若要強制更改登入密碼，建議使用「重設密碼信」。
                  </p>
                ) : (
                  <p className="text-[10px] text-blue-500 font-bold mt-1">
                    ℹ️ 此成員尚未登入，修改此密碼將成為他的「首次登入密碼」。
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-gray-400 font-bold">取消</button>
              <button onClick={handleUpdateName} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">儲存變更</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}