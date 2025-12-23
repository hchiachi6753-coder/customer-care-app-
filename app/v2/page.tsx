"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp, updateDoc, doc, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function V2Dashboard() {
  const { user, profile } = useAuth(); // 使用修正後的 profile
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filterDays, setFilterDays] = useState(0); // 0=今日, 3=三天, 7=一週, 30=一個月
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null); // 改成存儲整個任務物件，方便抓 contractId
  const [feedbackData, setFeedbackData] = useState({
    contactStatus: "成功聯繫",
    feedbackType: "none",
    issueCategory: "",
    isHighRenewal: false,
    isHighMGM: false,
    content: "",
    nextFollowUpDate: ""
  });

  // 💡 取得當前日期的工具函數
  const getTodayDate = () => {
    const today = new Date();
    // 💡 確保取得的是當地時間的日期
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 💡 開啟回報彈窗函數
  const openFeedbackModal = (task: any) => {
    setActiveTask(task);
    setFeedbackData({
      contactStatus: '成功聯繫', // 預設狀態
      feedbackType: 'none',
      content: '',
      nextFollowUpDate: getTodayDate(), // 💡 這裡就是初始化：預設今天
      issueCategory: '',
      isHighRenewal: false,
      isHighMGM: false
    });
    setShowFeedbackModal(true);
  };

  // 💡 狀態切換邏輯
  const handleStatusChange = (status: string) => {
    const isMandatory = status === "忙線" || status === "未接聽";

    setFeedbackData(prev => ({
      ...prev,
      contactStatus: status,
      feedbackType: status === '成功聯繫' ? prev.feedbackType : 'none',
      // 💡 只要切換到忙線/未接，且目前沒填日期，就自動帶入「今天」
      nextFollowUpDate: isMandatory && !prev.nextFollowUpDate
        ? getTodayDate()
        : prev.nextFollowUpDate
    }));
  };

  useEffect(() => {
    const fetchTasks = async () => {
      // 🔒 強化防護：確保 user、profile 和關鍵權限欄位都存在
      if (!user || !profile || !profile.teamId || !profile.role) {
        console.log("等待權限對接完成...");
        return;
      }

      setLoading(true);
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfRange = new Date();
        endOfRange.setDate(endOfRange.getDate() + filterDays);
        endOfRange.setHours(23, 59, 59, 999);

        const tasksRef = collection(db, "tasks");
        let baseQuery;

        // 修改重點：抓取所有 status == "pending" 且 dueDate <= 篩選結束日期的任務
        // 這樣不論是多早以前的逾期任務，只要還沒完成，都會出現在列表裡
        const commonWheres = [
          where("status", "==", "pending"),
          where("dueDate", "<=", Timestamp.fromDate(endOfRange))
        ];

        if (profile.role === 'director') {
          baseQuery = query(tasksRef, ...commonWheres, orderBy("dueDate", "asc"));
        } else if (profile.role === 'manager') {
          baseQuery = query(tasksRef, ...commonWheres, where("teamId", "==", profile.teamId), orderBy("dueDate", "asc"));
        } else {
          baseQuery = query(tasksRef, ...commonWheres, where("ownerId", "==", user.uid), orderBy("dueDate", "asc"));
        }

        const snapshot = await getDocs(baseQuery);
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("查詢任務失敗:", e);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user, profile, filterDays]);

  // 實作提交函數 (與詳細頁邏輯一致)
  const submitFeedback = async () => {
    if (!activeTask) return;

    // 💡 只有這些狀況是「必填」日期
    const isMandatory =
      feedbackData.contactStatus === "忙線" ||
      feedbackData.contactStatus === "未接聽" ||
      feedbackData.feedbackType === "issue";

    if (isMandatory && !feedbackData.nextFollowUpDate) {
      alert("此狀況必須設定下次聯絡/追蹤日期");
      return;
    }

    try {
      // 更新當前任務
      await updateDoc(doc(db, "tasks", activeTask.id), {
        status: "completed",
        completedAt: serverTimestamp(),
        contactStatus: feedbackData.contactStatus,
        feedbackType: feedbackData.feedbackType,
        issueCategory: feedbackData.issueCategory,
        content: feedbackData.content,
        isHighRenewal: feedbackData.isHighRenewal,
        isHighMGM: feedbackData.isHighMGM
      });

      // 💡 只有在「忙線」、「未接聽」或「有反應問題」時，或者使用者明確設定了日期時，才新增下一次任務
      // 但前端在「成功聯繫且無問題」時隱藏了日期欄位，所以我們要避免送出預設的日期
      const shouldCreateFollowUp =
        feedbackData.contactStatus !== "成功聯繫" ||
        feedbackData.feedbackType === "issue";

      if (shouldCreateFollowUp && feedbackData.nextFollowUpDate) {
        await addDoc(collection(db, "tasks"), {
          contractId: activeTask.contractId,
          taskType: "general",
          title: (() => {
            if (feedbackData.feedbackType === "issue") return `[問題追蹤] ${activeTask.clientName}`;

            // 根據原任務類型給予更明確的標題
            const prefixMap: { [key: string]: string } = {
              'newbie': '新手關懷-後續',
              'first_class': '首課關懷-後續',
              'system': '系統推播-後續',
              'general': '一般關懷'
            };
            const prefix = prefixMap[activeTask.taskType] || "下次關懷";
            return `[${prefix}] ${activeTask.clientName}`;
          })(),
          dueDate: Timestamp.fromDate(new Date(feedbackData.nextFollowUpDate)),
          status: "pending",
          ownerId: user?.uid,
          teamId: profile?.teamId,
          clientName: activeTask.clientName,
          createdAt: serverTimestamp(),
        });
      }

      alert("回報成功！");
      setShowFeedbackModal(false);
      // 重新抓取資料讓卡片消失
      window.location.reload();
    } catch (e) { console.error(e); }
  };

  // 渲染任務卡片
  const renderTaskColumn = (title: string, type: string, bgColor: string, borderColor: string) => {
    const filteredTasks = tasks.filter(t => t.taskType === type);

    // 修正逾期判斷邏輯：只比較日期，不比較時間
    const isOverdue = (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 將今天的時間歸零
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0); // 將任務日期時間歸零

      return checkDate < today; // 只有日期早於今天才算逾期
    };

    return (
      <div className={`flex-1 min-w-[280px] p-4 rounded-xl border-2 ${bgColor} ${borderColor} min-h-[500px]`}>
        <h2 className="font-bold text-lg mb-4 text-gray-800 flex justify-between">
          {title} <span className="text-sm bg-white px-2 py-1 rounded-full border">{filteredTasks.length}</span>
        </h2>
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const taskIsOverdue = isOverdue(task.dueDate.toDate());
            return (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden">
                {/* 逾期紅條標示 */}
                {taskIsOverdue && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}

                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <button
                      onClick={() => router.push(`/v2/contracts/${task.contractId}/edit`)} // 跳轉到編輯頁
                      className="text-lg font-black text-gray-900 hover:text-blue-600 text-left transition-colors flex items-center gap-1"
                    >
                      {task.clientName}
                      <span className="text-[10px] font-normal text-gray-400 italic">(點擊編輯)</span>
                    </button>
                    <span className="text-xs text-gray-400">{task.title}</span>
                  </div>
                  {taskIsOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">逾期</span>}
                </div>

                <div className={`text-xs mt-1 font-medium ${taskIsOverdue ? 'text-red-500' : 'text-blue-600'}`}>
                  📅 {task.dueDate?.toDate().toLocaleDateString()}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => openFeedbackModal(task)}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition-all font-bold"
                  >
                    執行關懷
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">關懷待辦清單 (V2)</h1>
            <p className="text-gray-500">歡迎回來，{profile?.name} ({profile?.role})</p>
          </div>

          {/* 時間篩選按鈕 */}
          <div className="flex bg-white p-1 rounded-lg shadow-sm border">
            {[
              { label: "今日", val: 0 },
              { label: "3天內", val: 3 },
              { label: "一週內", val: 7 },
              { label: "一個月", val: 30 }
            ].map(btn => (
              <button
                key={btn.val}
                onClick={() => setFilterDays(btn.val)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterDays === btn.val ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </header>

        {/* 四大顏色板塊佈局 */}
        <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 no-scrollbar">
          {renderTaskColumn("新手關懷", "newbie", "bg-blue-50", "border-blue-200")}
          {renderTaskColumn("首課關懷", "first_class", "bg-purple-50", "border-purple-200")}
          {renderTaskColumn("系統推播", "system", "bg-green-50", "border-green-200")}
          {renderTaskColumn("一般關懷", "general", "bg-amber-50", "border-amber-200")}
        </div>
      </div>

      {/* 關懷回報彈窗 */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-900 text-center">關懷執行回報</h3>

            <div className="space-y-6">
              {/* 1. 聯絡狀況 (最優先選擇) */}
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-3">聯絡狀況</label>
                <div className="grid grid-cols-3 gap-3">
                  {['成功聯繫', '忙線', '未接聽'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(status)}
                      className={`py-3 rounded-xl font-bold border-2 transition-all ${feedbackData.contactStatus === status
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-100 bg-gray-50 text-gray-400'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 條件顯示：只有「成功聯繫」才顯示反饋與標記 */}
              {feedbackData.contactStatus === "成功聯繫" ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-3">客戶反饋</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFeedbackData({ ...feedbackData, feedbackType: 'none', issueCategory: '' })}
                        className={`py-3 rounded-xl font-bold border-2 transition-all ${feedbackData.feedbackType === 'none' ? 'border-green-600 bg-green-50 text-green-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                      >
                        無特別反饋
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackData({ ...feedbackData, feedbackType: 'issue' })}
                        className={`py-3 rounded-xl font-bold border-2 transition-all ${feedbackData.feedbackType === 'issue' ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                      >
                        反應問題
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-2 bg-blue-50 rounded-2xl">
                    <label className="flex items-center justify-center gap-2 p-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4" checked={feedbackData.isHighRenewal} onChange={e => setFeedbackData({ ...feedbackData, isHighRenewal: e.target.checked })} />
                      <span className="text-xs font-bold text-blue-800">高續約意願</span>
                    </label>
                    <label className="flex items-center justify-center gap-2 p-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4" checked={feedbackData.isHighMGM} onChange={e => setFeedbackData({ ...feedbackData, isHighMGM: e.target.checked })} />
                      <span className="text-xs font-bold text-blue-800">高推薦價值</span>
                    </label>
                  </div>
                </>
              ) : null}

              {/* 判斷是否顯示日期設定區塊 */}
              {(feedbackData.contactStatus !== "成功聯繫" || feedbackData.feedbackType === "issue") && (
                <div className={`p-4 rounded-2xl border-2 space-y-4 ${feedbackData.contactStatus === "成功聯繫" ? "bg-red-50 border-red-100" : "bg-orange-50 border-orange-100"
                  }`}>
                  <div>
                    <label className="block text-xs font-bold mb-2 text-gray-700">
                      {feedbackData.contactStatus === "成功聯繫" ? "設定下次追蹤日期 (必填)" : "設定下次聯絡日期 (必填)"}
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 rounded-lg border-2 border-white text-gray-900 outline-none shadow-sm font-bold"
                      value={feedbackData.nextFollowUpDate}
                      onChange={e => setFeedbackData({ ...feedbackData, nextFollowUpDate: e.target.value })}
                    />
                    {feedbackData.feedbackType === "issue" && (
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-red-800 mb-2">問題分類</label>
                        <div className="flex flex-wrap gap-2">
                          {['師資', '教材', '系統', '服務'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setFeedbackData({ ...feedbackData, issueCategory: cat })}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${feedbackData.issueCategory === cat ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-200'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 成功聯繫且無問題時，提供選擇性日期設定 */}
              {feedbackData.contactStatus === "成功聯繫" && feedbackData.feedbackType === "none" && (
                <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-3">
                  <label className="block text-xs font-bold text-gray-700">下次聯絡/追蹤日期</label>

                  <div className="flex items-center gap-3">
                    {/* 左側：日期方格 */}
                    <input
                      type="date"
                      disabled={!feedbackData.nextFollowUpDate}
                      className={`flex-1 p-3 rounded-xl border-2 border-white text-gray-900 font-bold outline-none shadow-sm transition-all ${!feedbackData.nextFollowUpDate ? 'opacity-30 bg-gray-100' : 'opacity-100 bg-white'
                        }`}
                      value={feedbackData.nextFollowUpDate || ""}
                      onChange={e => setFeedbackData({ ...feedbackData, nextFollowUpDate: e.target.value })}
                    />

                    {/* 右側：不需設定勾選框 */}
                    <div
                      onClick={() => {
                        const isChecking = !!feedbackData.nextFollowUpDate;
                        setFeedbackData({
                          ...feedbackData,
                          nextFollowUpDate: isChecking ? "" : getTodayDate()
                        });
                      }}
                      className="flex items-center gap-2 cursor-pointer whitespace-nowrap bg-white px-3 py-3 rounded-xl border border-blue-200 shadow-sm active:scale-95 transition-all"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!feedbackData.nextFollowUpDate}
                      />
                      <span className="text-xs font-black text-blue-600">不需設定</span>
                    </div>
                  </div>
                </div>
              )}

              <textarea
                placeholder="溝通內容摘要（選填）..."
                className="w-full p-4 border-2 border-gray-100 rounded-2xl h-20 text-gray-900 focus:border-blue-500 outline-none"
                value={feedbackData.content}
                onChange={e => setFeedbackData({ ...feedbackData, content: e.target.value })}
              />
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-colors">取消</button>
              <button onClick={submitFeedback} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black transition-transform active:scale-95">送出回報</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}