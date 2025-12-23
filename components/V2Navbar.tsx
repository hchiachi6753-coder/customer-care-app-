"use client";

import { useRouter, usePathname } from "next/navigation";
import { CheckSquare, Users, PlusCircle, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function V2Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  const tabs = [
    { id: "tasks", label: "待辦", path: "/v2", icon: <CheckSquare size={24} /> },
    { id: "customers", label: "客戶", path: "/v2/customers", icon: <Users size={24} /> },
    { id: "new", label: "新增", path: "/v2/new-contract", icon: <PlusCircle size={24} /> },
  ];

  // 只有總監可以看到成員管理
  if (profile?.role === "director") {
    tabs.push({ id: "members", label: "成員", path: "/v2/members", icon: <Settings size={24} /> });
  }

  return (
    <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/90 backdrop-blur-md rounded-[30px] shadow-2xl border border-gray-100 flex items-center justify-around px-4 z-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.path)}
          className={`flex flex-col items-center gap-1 transition-all ${pathname === tab.path
              ? 'text-orange-600 scale-110'
              : 'text-gray-500 hover:text-gray-900' // 改深顏色，增加互動感
            }`}
        >
          <div className={`p-2 rounded-2xl ${pathname === tab.path ? 'bg-orange-50 shadow-sm' : 'hover:bg-gray-50'}`}>
            {tab.icon}
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}