// 檔案路徑：app/admin/team/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/lib/firebase'; // 確保引入 db
import { collection, query, orderBy, getDocs } from 'firebase/firestore'; // 引入 Firestore 讀取功能

// 🛑 設定您的 5 個固定團隊
const TEAM_OPTIONS = [
  { id: 'team1', name: 'Team 1' },
  { id: 'team2', name: 'Team 2' },
  { id: 'team3', name: 'Team 3' },
  { id: 'team4', name: 'Team 4' },
  { id: 'team5', name: 'Team 5' },
];

export default function TeamManagementPage() {
  const { profile } = useAuth();
  const router = useRouter();

  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales', 
    teamId: 'team1', 
  });

  // 系統狀態
  const [users, setUsers] = useState<any[]>([]); // 儲存成員列表
  const [isLoadingList, setIsLoadingList] = useState(true); // 列表讀取中
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. 檢查權限
  useEffect(() => {
    if (profile && profile.role !== 'director') {
      router.push('/');
    }
  }, [profile, router]);

  // 2. 定義讀取成員列表的函式
  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc')); // 依建立時間排序
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (err) {
      console.error("讀取列表失敗:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  // 3. 畫面載入時，執行讀取
  useEffect(() => {
    if (profile?.role === 'director') {
      fetchUsers();
    }
  }, [profile]);

  // 4. 輸入變更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 5. 送出表單 (新增成員)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 密碼檢查
    if (formData.password.length < 6) {
      setError('⚠️ 密碼長度太短囉！請至少輸入 6 個字元。');
      return; 
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '新增失敗');
      }

      setSuccess(`🎉 成功新增成員：${formData.name} (分配至 ${formData.teamId})`);
      setFormData({ name: '', email: '', password: '', role: 'sales', teamId: 'team1' }); 
      
      // ✨ 關鍵：新增成功後，重新讀取列表，讓新成員立刻出現
      fetchUsers();

    } catch (err: any) {
      setError(`❌ 錯誤: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 輔助函式：把 teamId 轉成中文顯示
  const getTeamName = (id: string) => {
    const team = TEAM_OPTIONS.find(t => t.id === id);
    return team ? team.name : id;
  };

  return (
    <ProtectedRoute>
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">團隊成員管理</h1>

        {/* --- 新增成員區塊 --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-700">新增成員</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 姓名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="請輸入姓名" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (登入帳號)</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="user@company.com" />
              </div>

              {/* 密碼 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                <input type="text" name="password" required value={formData.password} onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="至少 6 碼" />
              </div>

              {/* 角色 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色權限</label>
                <select name="role" value={formData.role} onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="sales">業務 (Sales) - 僅看個人</option>
                  <option value="manager">主管 (Manager) - 看團隊</option>
                  <option value="director">總監 (Director) - 看全部</option>
                </select>
              </div>

              {/* 團隊 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所屬團隊</label>
                <select name="teamId" value={formData.teamId} onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {TEAM_OPTIONS.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              {error && <div className="p-3 bg-red-100 text-red-700 rounded mb-4 border border-red-200">{error}</div>}
              {success && <div className="p-3 bg-green-100 text-green-700 rounded mb-4 border border-green-200">{success}</div>}
              <button type="submit" disabled={isSubmitting}
                className={`px-6 py-2 rounded text-white font-medium transition-colors ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSubmitting ? '處理中...' : '新增成員'}
              </button>
            </div>
          </form>
        </div>

        {/* --- 成員列表區塊 (回來了！) --- */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 overflow-hidden">
           <h2 className="text-xl font-bold mb-4 text-gray-700">成員列表 ({users.length})</h2>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50 border-b">
                   <th className="p-3 font-medium text-gray-600">姓名</th>
                   <th className="p-3 font-medium text-gray-600">Email</th>
                   <th className="p-3 font-medium text-gray-600">角色</th>
                   <th className="p-3 font-medium text-gray-600">團隊</th>
                   <th className="p-3 font-medium text-gray-600">建立時間</th>
                 </tr>
               </thead>
               <tbody>
                 {isLoadingList ? (
                   <tr><td colSpan={5} className="p-4 text-center text-gray-500">載入中...</td></tr>
                 ) : users.length === 0 ? (
                   <tr><td colSpan={5} className="p-4 text-center text-gray-500">目前沒有其他成員</td></tr>
                 ) : (
                   users.map((user) => (
                     <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                       <td className="p-3 font-medium text-gray-800">{user.name}</td>
                       <td className="p-3 text-gray-600">{user.email}</td>
                       <td className="p-3">
                         <span className={`px-2 py-1 rounded text-xs font-medium ${
                           user.role === 'director' ? 'bg-purple-100 text-purple-700' :
                           user.role === 'manager' ? 'bg-orange-100 text-orange-700' :
                           'bg-blue-100 text-blue-700'
                         }`}>
                           {user.role === 'director' ? '總監' : user.role === 'manager' ? '主管' : '業務'}
                         </span>
                       </td>
                       <td className="p-3 text-gray-600">
                         {getTeamName(user.teamId)}
                       </td>
                       <td className="p-3 text-gray-400 text-sm">
                         {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}