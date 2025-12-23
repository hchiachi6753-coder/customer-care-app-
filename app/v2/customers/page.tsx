"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function V2CustomerList() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user || !profile) return;
      setLoading(true);
      try {
        const contractsRef = collection(db, "contracts");
        let q;

        // 根據權限抓取合約
        if (profile.role === 'director') {
          q = query(contractsRef, orderBy("startDate", "desc"));
        } else if (profile.role === 'manager') {
          q = query(contractsRef, where("teamId", "==", profile.teamId), orderBy("startDate", "desc"));
        } else {
          q = query(contractsRef, where("ownerId", "==", user.uid), orderBy("startDate", "desc"));
        }

        const snapshot = await getDocs(q);
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Fetch customers error:", e);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, [user, profile]);

  // 按月份分組邏輯
  const groupCustomersByMonth = () => {
    const groups: { [key: string]: any[] } = {};
    customers.forEach(customer => {
      const date = customer.startDate.toDate();
      const monthKey = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(customer);
    });
    return groups;
  };

  const groupedData = groupCustomersByMonth();

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">客戶列表 (V2)</h1>
          <p className="text-gray-500">依合約起始月份分類檢視</p>
        </header>

        {loading ? (
          <div className="text-center py-10 text-gray-400 font-bold">資料加載中...</div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedData).map(([month, list]) => (
              <section key={month} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* 月份標題列 */}
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                  <h2 className="font-bold text-gray-700">{month} 成交客戶 ({list.length})</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">學員姓名</th>
                        <th className="px-6 py-4">產品</th>
                        <th className="px-6 py-4">合約起始日</th>
                        <th className="px-6 py-4">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {list.map((c, index) => (
                        /* 斑馬紋設計：偶數行使用淺灰色背景 */
                        <tr key={c.id} className={`transition-colors ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50/50`}>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => router.push(`/v2/contracts/${c.id}`)} // 統一導向詳情頁 (含歷程與內聯編輯)
                              className="text-lg font-black text-gray-900 hover:text-blue-600 text-left transition-colors flex items-center gap-1"
                            >
                              {c.studentName}
                              {/* <span className="text-[10px] font-normal text-gray-400 italic">(點擊查看詳情)</span> */}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.product}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.startDate.toDate().toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <Link href={`/v2/contracts/${c.id}`} className="text-blue-600 font-bold text-sm hover:underline">
                              查看歷程 →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}