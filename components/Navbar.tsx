'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // 如果使用者沒登入，就不顯示 Navbar
  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* 左側：Logo (手機版只顯示「客戶關懷」以節省空間) */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">
              客戶關懷<span className="hidden xs:inline">系統</span>
            </Link>
          </div>

          {/* 右側：功能區 */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* 1. 團隊管理按鈕 (只給總監看) */}
            {profile?.role === 'director' && (
              <Link
                href="/admin/team"
                className="flex items-center justify-center bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors rounded-lg px-2 py-2 sm:px-3"
                title="團隊管理"
              >
                {/* 手機/電腦都顯示齒輪，電腦版才多顯示文字 */}
                <span className="text-lg">⚙️</span>
                <span className="hidden md:inline ml-2 font-medium text-sm">團隊管理</span>
              </Link>
            )}

            {/* 2. 名字顯示 (已移除 Hi 和職稱) */}
            <div className="text-sm font-medium text-gray-700 truncate max-w-[100px] sm:max-w-none text-right">
              {profile?.name || 'User'}
            </div>

            {/* 3. 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 font-medium text-sm px-2 py-2 sm:px-3 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              登出
            </button>
          </div>
          
        </div>
      </div>
    </nav>
  );
}