"use client";

import { useRouter, usePathname } from "next/navigation";
import { CheckSquare, Users, PlusCircle, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function V2Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  const tabs = [
    { id: "tasks", label: "待辦", path: "/v2", icon: <CheckSquare size={20} /> },
    { id: "new", label: "新增", path: "/v2/new-contract", icon: <PlusCircle size={20} /> },
    { id: "customers", label: "客戶", path: "/v2/customers", icon: <Users size={20} /> },
  ];

  // 只有總監可以看到成員管理
  if (profile?.role === "director") {
    tabs.push({ id: "members", label: "成員", path: "/v2/members", icon: <Settings size={20} /> });
  }

  return (
    <nav className="fixed bottom-4 left-4 right-4 h-14 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 flex items-center justify-around px-2 z-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.path)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl transition-all ${pathname === tab.path
            ? 'bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
        >
          {/* Icon - 稍微縮小一點點以適應橫向佈局，但保持清晰 */}
          {/* 備註：User 說字體不要動，Icon 沒特別說，但橫向 24px 可能略大，改用 20px 比較平衡，或者維持 22px */}
          <div className={`${pathname === tab.path ? 'scale-110' : ''}`}>
            {/* 這裡我們重新渲染 icon 並傳入 slightly smaller size 讓橫排好看，或者直接沿用 tab.icon */}
            {tab.icon}
          </div>

          <span className="text-xs font-black uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}