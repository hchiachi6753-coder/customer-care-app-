"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

export default function Navbar() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'director': return '總監';
      case 'manager': return '主管';
      case 'sales': return '銷售';
      default: return role;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Don't show navbar if user is not logged in
  if (!user || !profile) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Left: App Title */}
        <button
          onClick={() => router.push('/')}
          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          客戶關懷系統
        </button>

        {/* Right: User Info & Logout */}
        <div className="flex items-center gap-4">
          {profile.role === 'director' && (
            <button
              onClick={() => router.push('/admin/team')}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-medium"
            >
              ⚙️ 團隊管理
            </button>
          )}
          <span className="text-gray-700">
            👋 Hi, {profile.name} ({getRoleLabel(profile.role)})
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            登出
          </button>
        </div>
      </div>
    </nav>
  );
}