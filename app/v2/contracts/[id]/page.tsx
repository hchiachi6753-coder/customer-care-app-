"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, where } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";

export default function V2ContractDetail() {
  const { id } = useParams();
  const router = useRouter();

  // 1. 狀態管理
  const [contract, setContract] = useState<any>(null);
  const [rawTasks, setRawTasks] = useState<any[]>([]); // 原始任務資料
  const [rawLogs, setRawLogs] = useState<any[]>([]);   // 原始 Log 資料
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc'); // 預設：最舊在前 (Newbie First)
  const [isEditing, setIsEditing] = useState(false); // 編輯模式開關
  const [formData, setFormData] = useState({ phone: "", email: "", lineId: "" }); // 編輯表單數據

  // 2. 初始資料讀取
  useEffect(() => {
    if (!id) return;
    const fetchContract = async () => {
      try {
        const docRef = doc(db, "contracts", id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setContract(data);
          // 初始化表單資料
          setFormData({
            phone: data.phone || "",
            email: data.email || "",
            lineId: data.lineId || ""
          });
        }
      } catch (e) {
        console.error("Error fetching contract:", e);
      }
    };
    fetchContract();
  }, [id]);

  // 3. 雙重資料抓取 (Dual Fetching)
  useEffect(() => {
    if (!id) return;

    let unsubscribeTasks: () => void;
    let unsubscribeLogs: () => void;

    // A. 抓取舊資料 (Tasks): contractId == id
    const tasksRef = collection(db, "tasks");
    const tasksQuery = query(tasksRef, where("contractId", "==", id));

    unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawTasks(data);
    }, (error) => {
      console.error("Error fetching tasks:", error);
    });

    // B. 抓取新資料 (CareLogs): contracts/{id}/careLogs
    const logsRef = collection(db, "contracts", id as string, "careLogs");
    const logsQuery = query(logsRef, orderBy("createdAt", "desc"));

    unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawLogs(data);
    }, (error) => {
      console.error("Error fetching logs:", error);
    });

    return () => {
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [id]);

  // 4. 計算排序後的 Logs (Derived State)
  const logs = useMemo(() => {
    const merged = [...rawTasks, ...rawLogs];

    merged.sort((a, b) => {
      // 優先順序修正：DueDate (預計執行日) > CompletedAt (實際完成日) > CreatedAt
      // 這樣可以確保原定行程的順序不會因為「提早/延後完成」而亂跳
      const getTime = (item: any) => {
        if (item.dueDate) return item.dueDate.seconds;
        if (item.completedAt) return item.completedAt.seconds;
        if (item.createdAt) return item.createdAt.seconds;
        return 0;
      };

      const timeA = getTime(a);
      const timeB = getTime(b);

      if (timeA !== timeB) {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }

      // 同時間的 Tie-Breaker: Newbie < First Class < System < General
      const typePriority: { [key: string]: number } = {
        'newbie': 1,
        'first_class': 2,
        'system': 3,
        'general': 4
      };
      const pA = typePriority[a.taskType] || 99;
      const pB = typePriority[b.taskType] || 99;

      return sortOrder === 'asc' ? pA - pB : pB - pA;
    });

    return merged;
  }, [rawTasks, rawLogs, sortOrder]);

  // 5. 儲存處理
  const handleToggleEdit = async () => {
    if (isEditing) {
      try {
        await updateDoc(doc(db, "contracts", id as string), {
          phone: formData.phone,
          email: formData.email,
          lineId: formData.lineId
        });
        setContract((prev: any) => ({ ...prev, ...formData }));
      } catch (e) {
        console.error("Update failed:", e);
        alert("儲存失敗");
        return;
      }
    }
    setIsEditing(!isEditing);
  };

  if (!contract) return <div className="p-10 text-center font-bold text-gray-400">載入中...</div>;

  return (
    <div className="p-4 pb-32 space-y-6 max-w-lg mx-auto">

      {/* 返回按鈕 */}
      <button
        onClick={() => router.push("/v2/customers")}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-800 mb-2 transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> 返回列表
      </button>

      {/* 客戶核心名片 */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-1">{contract.studentName}</h2>
            <p className="text-gray-400 font-bold text-sm">家長：{contract.parentName}</p>
          </div>
          <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full font-black text-[10px]">
            {/* 相容舊欄位 product */}
            {contract.productName || contract.product}
          </span>
        </div>

        {/* 合約開始日期顯示 */}
        <div className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl inline-block">
          合約開始：{contract.startDate?.toDate ? contract.startDate.toDate().toLocaleDateString() : (contract.startDate || "未設定")}
        </div>

        {/* 聯繫資訊：高度減半 + 顏色加深 + 編輯鎖 */}
        <div className="bg-blue-50/50 p-5 rounded-[30px] space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">聯繫資訊</span>
            <button
              onClick={handleToggleEdit}
              className="text-[10px] font-black bg-white text-blue-600 px-4 py-1.5 rounded-full shadow-sm border border-blue-100 active:scale-95 transition-all"
            >
              {isEditing ? "💾 儲存" : "✏️ 編輯"}
            </button>
          </div>

          <input
            disabled={!isEditing}
            className={`w-full h-11 px-5 rounded-xl border-2 font-bold text-sm transition-all ${isEditing ? 'bg-white border-blue-400 text-gray-900 shadow-md' : 'bg-transparent border-transparent text-gray-900'
              }`}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="電話"
          />
          <div className="flex gap-2">
            <input
              disabled={!isEditing}
              className={`w-full h-11 px-5 rounded-xl border-2 font-bold text-sm transition-all ${isEditing ? 'bg-white border-blue-400 text-gray-900 shadow-md' : 'bg-transparent border-transparent text-gray-900'
                }`}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
            />
            <input
              disabled={!isEditing}
              className={`w-full h-11 px-5 rounded-xl border-2 font-bold text-sm transition-all ${isEditing ? 'bg-white border-blue-400 text-gray-900 shadow-md' : 'bg-transparent border-transparent text-gray-900'
                }`}
              value={formData.lineId}
              onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
              placeholder="Line ID"
            />
          </div>
        </div>
      </div>

      {/* 關懷歷程區塊 Header */}
      <div className="px-2 flex justify-between items-center mb-4">
        <h3 className="text-lg font-black text-gray-900">關懷歷程</h3>

        {/* 排序切換按鈕 */}
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 text-xs font-bold bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-gray-600"
        >
          {sortOrder === 'desc' ? (
            <>最新在前 <ArrowDown size={14} /></>
          ) : (
            <>最舊在前 <ArrowUp size={14} /></>
          )}
        </button>
      </div>

      {/* 關懷歷程列表 - 直線時間軸設計 */}
      <div className="relative pl-4 space-y-0">
        {/* 左側直線：貫穿整個列表 */}
        <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-gray-200 rounded-full"></div>

        {logs.map((log: any, index: number) => {
          // 時間邏輯判斷
          const dueDate = log.dueDate?.toDate ? log.dueDate.toDate() : null;
          const completedAt = log.completedAt?.toDate ? log.completedAt.toDate() : null;

          // 系統推播如果沒有 completedAt，視為未來或 pending 任務
          const isPending = log.status === 'pending' || (!completedAt && !log.createdAt);
          const now = new Date();

          // 樣式判定邏輯
          let statusConfig = {
            color: "bg-blue-500", // 圓點顏色
            label: "預計關懷",
            textColor: "text-blue-600"
          };

          // 1. 已完成 (Completed)
          if (completedAt || log.status === "completed") {
            // 比較完成時間與預計時間
            let isOverdue = false;
            if (dueDate && completedAt) {
              const d1 = new Date(dueDate); d1.setHours(0, 0, 0, 0);
              const d2 = new Date(completedAt); d2.setHours(0, 0, 0, 0);
              if (d2 > d1) isOverdue = true;
            }

            if (isOverdue) statusConfig = { color: "bg-orange-500", label: "逾期完成", textColor: "text-orange-600" };
            else statusConfig = { color: "bg-green-500", label: "已完成", textColor: "text-green-600" };
          }
          // 2. 未完成 but 已逾期
          else if (dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const d = new Date(dueDate);
            d.setHours(0, 0, 0, 0);
            if (today > d) statusConfig = { color: "bg-red-500", label: "逾期", textColor: "text-red-600" };
          }

          // 關懷類型標籤文字
          const typeLabels: { [key: string]: string } = {
            newbie: "新手關懷",
            first_class: "首課關懷",
            system: "系統推播",
            general: "一般關懷"
          };
          const typeLabel = typeLabels[log.taskType] || "一般關懷";
          const displayStatus = log.contactStatus || statusConfig.label;

          return (
            <div key={log.id} className="relative pl-8 py-4 group">
              {/* 時間軸圓點 */}
              <div className={`absolute left-[15px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 ${statusConfig.color}`}></div>

              <div className="flex flex-col gap-1">
                {/* Header Line: 日期 + 類型 + 狀態 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-gray-400 w-24">
                    {completedAt
                      ? new Date(completedAt.getTime()).toLocaleDateString()
                      : (dueDate ? `${new Date(dueDate.getTime()).toLocaleDateString()}` : "")
                    }
                  </span>
                  <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                    {typeLabel}
                  </span>
                  <span className={`text-[10px] font-bold ${statusConfig.textColor}`}>
                    {displayStatus}
                  </span>
                </div>

                {/* Content */}
                <div className="text-sm font-bold text-gray-700 mt-1 pl-1 border-l-2 border-transparent hover:border-gray-100 transition-all">
                  {log.content || log.note || log.title || (log.taskType === 'system' ? "系統自動排程關懷" : "(無詳細內容)")}
                </div>

                {/* 經手人與標籤 */}
                <div className="flex items-center gap-2 mt-1 pl-1 h-5">
                  {(log.operatorName || log.ownerId) && (
                    <span className="text-[10px] text-gray-300">
                      @{log.operatorName || (log.taskType === 'system' ? "系統" : "User")}
                    </span>
                  )}
                  {log.isHighRenewal && <span className="text-[10px] text-red-400 font-bold">#高續約意願</span>}
                  {log.isHighMGM && <span className="text-[10px] text-purple-400 font-bold">#高MGM</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}