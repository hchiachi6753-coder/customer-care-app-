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
        
        // Client-side sorting by startDate (descending)
        contractsData.sort((a, b) => b.startDate.seconds - a.startDate.seconds);
        
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
          <div className="space-y-3">
            {filteredContracts.map((contract) => (
              <div 
                key={contract.id} 
                className="bg-white rounded-lg p-4 shadow-sm border cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleCustomerClick(contract.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {contract.studentName} ({contract.parentName})
                    </h3>
                    <p className="text-sm text-gray-500">
                      {contract.product} | {getStatusText(contract.status)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleCall(contract.phone, e)}
                    className="ml-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    📞
                  </button>
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