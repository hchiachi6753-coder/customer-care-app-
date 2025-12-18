"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Contract } from "@/types/schema";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ContractWithId extends Contract {
  id: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractWithId[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithId[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(
      collection(db, "contracts"),
      where("agentId", "==", "temp-agent-id")
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const contractsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ContractWithId[];
        
        // Client-side sorting: Primary by startDate, Secondary by createdAt (both descending)
        contractsData.sort((a, b) => {
          const dateCompare = b.startDate.seconds - a.startDate.seconds;
          if (dateCompare !== 0) return dateCompare;
          
          // Tie-breaker: createdAt (newer first)
          const aCreated = a.createdAt?.seconds || 0;
          const bCreated = b.createdAt?.seconds || 0;
          return bCreated - aCreated;
        });
        
        setContracts(contractsData);
        setFilteredContracts(contractsData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredContracts(contracts);
    } else {
      const filtered = contracts.filter(contract =>
        contract.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.parentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContracts(filtered);
    }
  }, [searchTerm, contracts]);

  // Group contracts by start date (YYYY年 MM月)
  const groupedContracts = () => {
    const groups: { [key: string]: ContractWithId[] } = {};
    
    filteredContracts.forEach(contract => {
      let groupKey = '未設定日期';
      
      if (contract.startDate) {
        const date = contract.startDate.toDate();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        groupKey = `${year}年 ${month}月`;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(contract);
    });
    
    // Sort groups by date (newest first)
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      if (a === '未設定日期') return 1;
      if (b === '未設定日期') return -1;
      return b.localeCompare(a);
    });
    
    // Sort contracts within each group: Primary by startDate, Secondary by createdAt (both newest first)
    sortedGroupKeys.forEach(key => {
      groups[key].sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        
        const dateCompare = b.startDate.seconds - a.startDate.seconds;
        if (dateCompare !== 0) return dateCompare;
        
        // Tie-breaker: createdAt (newer first)
        const aCreated = a.createdAt?.seconds || 0;
        const bCreated = b.createdAt?.seconds || 0;
        return bCreated - aCreated;
      });
    });
    
    return sortedGroupKeys.map(key => ({
      groupName: key,
      contracts: groups[key]
    }));
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '進行中';
      case 'risk': return '風險';
      case 'finished': return '已完成';
      default: return status;
    }
  };

  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleCustomerClick = async (contractId: string) => {
    // Find a task for this contract to navigate to customer detail page
    const tasksQuery = query(
      collection(db, "tasks"),
      where("contractId", "==", contractId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    
    if (!tasksSnapshot.empty) {
      const firstTask = tasksSnapshot.docs[0];
      router.push(`/customers/${firstTask.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-900">我的客戶列表</h1>
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 bg-white p-4 border-b border-gray-200 z-10">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 w-full px-4 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
          placeholder="搜尋家長或學員姓名..."
        />
      </div>

      {/* Main Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">載入中...</div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">查無資料</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedContracts().map((group) => (
              <div key={group.groupName}>
                {/* Group Header */}
                <div className="sticky top-20 bg-slate-200 p-3 rounded-lg mb-3 z-5 border-b border-gray-300">
                  <h2 className="font-bold text-gray-800 text-lg">
                    {group.groupName} ({group.contracts.length})
                  </h2>
                </div>
                
                {/* Contracts in Group */}
                <div className="ml-2">
                  {group.contracts.map((contract) => (
                    <div 
                      key={contract.id} 
                      className="bg-white py-2 px-4 shadow-sm border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleCustomerClick(contract.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 truncate">
                            {contract.studentName}
                          </span>
                          <span className="text-sm text-gray-400 truncate">
                            (家長：{contract.parentName})
                          </span>
                          <span className="text-sm text-gray-500 truncate">
                            {contract.product} | {getStatusText(contract.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {contract.startDate && (
                            <span className="text-xs text-gray-400">
                              {contract.startDate.toDate().toLocaleDateString('zh-TW')}
                            </span>
                          )}
                          <button
                            onClick={(e) => handleCall(contract.phone, e)}
                            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                          >
                            📞
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-blue-600">
            <div className="text-xl mb-1">🏠</div>
            <span className="text-xs">待辦</span>
          </Link>
          <Link href="/contracts/new" className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-blue-600">
            <div className="text-xl mb-1">➕</div>
            <span className="text-xs">新增</span>
          </Link>
          <Link href="/contracts" className="flex flex-col items-center py-2 px-4 text-blue-600">
            <div className="text-xl mb-1">👥</div>
            <span className="text-xs font-medium">客戶</span>
          </Link>
        </div>
      </div>
    </div>
  );
}