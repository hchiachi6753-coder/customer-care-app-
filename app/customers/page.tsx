"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Contract {
  id: string;
  studentName: string;
  parentName: string;
  phone: string;
  product: string;
  status: string;
  ownerId?: string;
  teamId?: string;
}

export default function CustomerListPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    // 💡 修改後的 fetchCustomers (高容錯版)
    const fetchCustomers = async () => {
      if (!user || !userProfile) return;
      const contractsRef = collection(db, "contracts");
      let q;

      if (userProfile.role === "director") {
        q = query(contractsRef); // 👑 不設任何條件，確保 100% 抓到
      } else {
        // 💼 業務/主管：只過濾權限，先不排序
        q = query(contractsRef, where(userProfile.role === "manager" ? "teamId" : "ownerId", "==", userProfile.role === "manager" ? userProfile.teamId : user.uid));
      }

      const querySnapshot = await getDocs(q);
      // 🎯 在 JavaScript 端手動排序，避免索引報錯
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setCustomers(list);
    };

    fetchCustomers();
  }, [user, userProfile, authLoading, router]);

  const filteredCustomers = customers.filter(c => 
    c.studentName?.includes(searchTerm) || 
    c.parentName?.includes(searchTerm)
  );

  if (loading || authLoading) return <div className="p-8 text-center text-gray-500">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-3">客戶列表</h1>
        <input 
          type="text" 
          placeholder="搜尋姓名..." 
          className="w-full bg-gray-100 rounded-lg py-2 px-4 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="p-4 space-y-3">
        {filteredCustomers.map((customer) => (
          <Link key={customer.id} href={`/customers/${customer.id}`} className="block">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{customer.studentName}</h3>
                <p className="text-gray-500 text-sm">{customer.parentName}</p>
              </div>
              <span className="text-blue-600">➤</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 底部導航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-between items-center z-20">
        <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-gray-600">
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium mt-1">待辦</span>
        </Link>
        <Link href="/customers" className="flex flex-col items-center text-blue-600">
          <span className="text-xl">👥</span>
          <span className="text-xs font-medium mt-1">客戶</span>
        </Link>
      </div>
    </div>
  );
}