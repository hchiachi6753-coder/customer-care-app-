"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronRight, Users } from "lucide-react";

export default function V2CustomerList() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Collapse State
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Dynamic User Map for Team Assignment (Director View)
  const [userTeamMap, setUserTeamMap] = useState<{ [key: string]: string }>({});

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user || !profile) return;
      setLoading(true);
      try {
        const contractsRef = collection(db, "contracts");
        const usersRef = collection(db, "users");

        let cSnap, uSnap;

        if (profile.role === 'director') {
          // Fetch ALL for director to support hierarchy AND dynamic mapping
          [cSnap, uSnap] = await Promise.all([
            getDocs(query(contractsRef, orderBy("startDate", "desc"))),
            getDocs(query(usersRef))
          ]);
        } else if (profile.role === 'manager') {
          // For Manager, strictly use teamId stored? Or also dynamic?
          // Consistency suggests dynamic.
          // But let's stick to simple logic for now: Filter by stored teamId might be safer if we don't fetch all users.
          // However, if we want "Change team -> Move data", dynamic is best.
          // Let's implement Dynamic for Manager too if possible, but they only see THEIR team.
          // Complexity trade-off: Stick to existing logic for Manager unless requested.
          cSnap = await getDocs(query(contractsRef, where("teamId", "==", profile.teamId), orderBy("startDate", "desc")));
        } else {
          cSnap = await getDocs(query(contractsRef, where("ownerId", "==", user.uid), orderBy("startDate", "desc")));
        }

        if (cSnap) {
          setCustomers(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        // Build User Map if Director
        if (profile.role === 'director' && uSnap) {
          const map: { [key: string]: string } = {};
          uSnap.docs.forEach(doc => {
            const data = doc.data();
            const tid = data.teamId || "未分類團隊";
            // Map both ID (Email) and UID
            map[doc.id.toLowerCase()] = tid;
            if (data.uid) map[data.uid] = tid;
          });
          setUserTeamMap(map);
        }

      } catch (e) {
        console.error("Fetch customers error:", e);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, [user, profile]);

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.studentName?.toLowerCase() || "").includes(term) ||
      (c.parentName?.toLowerCase() || "").includes(term) ||
      (c.phone?.toLowerCase() || "").includes(term) ||
      (c.email?.toLowerCase() || "").includes(term) ||
      (c.lineId?.toLowerCase() || "").includes(term)
    );
  });

  // Group By Month
  const groupCustomersByMonth = () => {
    const groups: { [key: string]: any[] } = {};
    filteredCustomers.forEach(customer => {
      let monthKey = "未分類";
      if (customer.startDate && customer.startDate.toDate) {
        const date = customer.startDate.toDate();
        monthKey = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      } else if (customer.startDate && typeof customer.startDate === 'string') {
        const date = new Date(customer.startDate);
        monthKey = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      }
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(customer);
    });
    return groups;
  };

  const groupedByMonth = groupCustomersByMonth();

  // Helper: Group By Team (Dynamic Logic)
  const groupCustomersByTeam = (list: any[]) => {
    const groups: { [key: string]: any[] } = {};
    list.forEach(c => {
      let tid = "未分類團隊";

      if (profile?.role === 'director') {
        // Try dynamic lookup
        if (c.ownerId && userTeamMap[c.ownerId]) {
          tid = userTeamMap[c.ownerId];
        } else if (c.ownerId && userTeamMap[c.ownerId?.toLowerCase()]) {
          tid = userTeamMap[c.ownerId?.toLowerCase()];
        } else if (c.teamId) {
          tid = c.teamId; // Fallback
        }
      } else {
        tid = c.teamId || "未分類團隊";
      }

      if (!groups[tid]) groups[tid] = [];
      groups[tid].push(c);
    });
    return groups;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">客戶列表 (V2)</h1>
            <p className="text-gray-500">
              {profile?.role === 'director' ? '團隊業績月報' : '依合約起始月份分類檢視'}
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="輸入姓名、電話、Email 或 Line ID 搜尋..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 font-bold focus:border-blue-500 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {loading ? (
          <div className="text-center py-10 text-gray-400 font-bold">資料加載中...</div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedByMonth).length === 0 && (
              <div className="text-center p-10 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                <p className="text-gray-400 font-bold">沒有找到符合「{searchTerm}」的客戶資料</p>
              </div>
            )}

            {Object.entries(groupedByMonth).map(([month, monthList], sectionIndex) => {
              const isAltSection = sectionIndex % 2 === 1;
              const isDirector = profile?.role === 'director';

              return (
                <section
                  key={month}
                  className={`rounded-xl shadow-sm border overflow-hidden ${isAltSection ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-gray-200'
                    }`}
                >
                  <div className={`px-6 py-3 border-b flex justify-between items-center ${isAltSection ? 'bg-indigo-100/50 border-indigo-100' : 'bg-gray-100 border-gray-200'
                    }`}>
                    <h2 className="font-bold text-gray-700">
                      {month} 成交客戶 ({monthList.length})
                    </h2>
                  </div>

                  {isDirector ? (
                    // DIRECTOR VIEW: Show Team Summaries (Sorted by Team ID?)
                    <div className="p-4 space-y-2">
                      {Object.entries(groupCustomersByTeam(monthList)).sort().map(([teamId, teamList]) => {
                        const teamKey = `${month}-${teamId}`;
                        const isExpanded = expandedSections[teamKey];

                        return (
                          <div key={teamKey} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                            <button
                              onClick={() => toggleSection(teamKey)}
                              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-800 text-left">{teamId}</h3>
                                  <p className="text-xs text-gray-400 font-bold text-left">共 {teamList.length} 位客戶</p>
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-100">
                                <CustomerTable list={teamList} router={router} searchTerm={searchTerm} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <CustomerTable list={monthList} router={router} searchTerm={searchTerm} isAlt={isAltSection} />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerTable({ list, router, searchTerm, isAlt = false }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className={`text-xs uppercase font-bold text-gray-500 ${isAlt ? 'bg-indigo-50/50' : 'bg-gray-50'}`}>
          <tr>
            <th className="px-6 py-2">學員姓名</th>
            <th className="px-6 py-2">產品</th>
            <th className="px-6 py-2">合約起始日</th>
            <th className="px-6 py-2">操作</th>
          </tr>
        </thead>
        <tbody className={isAlt ? 'divide-y divide-indigo-100' : 'divide-y divide-gray-100'}>
          {list.map((c: any, index: number) => {
            let rowClass = "";
            if (isAlt) {
              rowClass = index % 2 === 1 ? 'bg-indigo-50/40' : 'bg-white/60';
            } else {
              rowClass = index % 2 === 1 ? 'bg-gray-50' : 'bg-white';
            }

            return (
              <tr key={c.id} className={`transition-colors ${rowClass} hover:bg-blue-100`}>
                <td className="px-6 py-2">
                  <button
                    onClick={() => router.push(`/v2/contracts/${c.id}`)}
                    className="text-base font-black text-gray-900 hover:text-blue-600 text-left transition-colors flex items-center gap-1"
                  >
                    {c.studentName}
                  </button>
                  {searchTerm && (
                    <div className="text-xs text-gray-400 font-medium">
                      {c.parentName && <span>家長:{c.parentName} </span>}
                      {c.phone && <span>Tel:{c.phone} </span>}
                    </div>
                  )}
                </td>
                <td className="px-6 py-2 text-sm text-gray-600">{c.product}</td>
                <td className="px-6 py-2 text-sm text-gray-600">
                  {c.startDate?.toDate
                    ? c.startDate.toDate().toLocaleDateString()
                    : (typeof c.startDate === 'string' ? c.startDate : "N/A")}
                </td>
                <td className="px-6 py-2">
                  <Link href={`/v2/contracts/${c.id}?view=history`} className="text-blue-600 font-bold text-sm hover:underline">
                    查看歷程 →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}