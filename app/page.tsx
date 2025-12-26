"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, User, Calendar as CalendarIcon, AlertTriangle, ChevronRight, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function V2Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Director Hierarchical State
  const [teamGroups, setTeamGroups] = useState<{ [key: string]: any[] }>({});
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Date Filter State
  const [filterRange, setFilterRange] = useState("today");

  // States for Modals
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // New Feedback Data State
  const [feedbackMain, setFeedbackMain] = useState<"success" | "fail">("success");
  const [failReason, setFailReason] = useState<"no_answer" | "busy" | "inconvenient">("no_answer");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(getTodayDate());
  const [noNextDate, setNoNextDate] = useState(false);

  // Customer Tags (High Potential)
  const [tags, setTags] = useState({
    renewal: false,
    referral: false
  });

  function getTodayDate() {
    const d = new Date();
    // Use local YYYY-MM-DD to avoid UTC shift
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Reset Modal State on Open
  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setFeedbackMain("success");
    setFailReason("no_answer");
    setNote("");
    setNextDate(getTodayDate());
    setNoNextDate(false);
    setTags({ renewal: false, referral: false });
    setShowFeedbackModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !profile) return;
      setLoading(true);
      try {
        const tasksRef = collection(db, "tasks");
        const usersRef = collection(db, "users");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let tasksSnapshot;
        let usersSnapshot;

        if (profile.role === 'director') {
          const [tSnap, uSnap] = await Promise.all([
            getDocs(query(tasksRef, where("completed", "==", false))),
            getDocs(query(usersRef))
          ]);
          tasksSnapshot = tSnap;
          usersSnapshot = uSnap;

        } else if (profile.role === 'manager') {
          tasksSnapshot = await getDocs(query(tasksRef, where("teamId", "==", profile.teamId), where("completed", "==", false)));
        } else {
          tasksSnapshot = await getDocs(query(tasksRef, where("ownerId", "==", user.uid), where("completed", "==", false)));
        }

        const fetchedTasks: any[] = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          let isOverdue = false;
          if (data.dueDate) {
            const due = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < today) isOverdue = true;
          }
          return { id: doc.id, ...data, isOverdue };
        });

        fetchedTasks.sort((a, b) => {
          const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate || 0);
          const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate || 0);
          return dateA - dateB;
        });

        setTasks(fetchedTasks);

        if (profile.role === 'director' && usersSnapshot) {
          const uidToTeamMap: { [key: string]: string } = {};
          const emailToTeamMap: { [key: string]: string } = {};

          usersSnapshot.docs.forEach(uDoc => {
            const uData = uDoc.data();
            const uEmail = uDoc.id.toLowerCase();
            const uTeamId = uData.teamId || "未分類團隊";

            emailToTeamMap[uEmail] = uTeamId;
            if (uData.uid) {
              uidToTeamMap[uData.uid] = uTeamId;
            }
          });

          const groups: any = {};
          fetchedTasks.forEach(t => {
            let assignedTeam = "未分類團隊";
            if (t.ownerId && uidToTeamMap[t.ownerId]) {
              assignedTeam = uidToTeamMap[t.ownerId];
            } else if (t.ownerId && emailToTeamMap[t.ownerId?.toLowerCase()]) {
              assignedTeam = emailToTeamMap[t.ownerId?.toLowerCase()];
            } else if (t.teamId) {
              assignedTeam = t.teamId;
            }

            if (!groups[assignedTeam]) groups[assignedTeam] = [];
            groups[assignedTeam].push(t);
          });
          setTeamGroups(groups);
        }

      } catch (e) {
        console.error("Fetch tasks error:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, profile, authLoading]);

  const submitFeedback = async () => {
    if (!selectedTask) return;
    try {
      const resultDetail = feedbackMain === "success" ? "success" : failReason;
      const statusLabel = feedbackMain === "success" ? "completed" : "failed";

      // 1. Update Current Task
      await updateDoc(doc(db, "tasks", selectedTask.id), {
        completed: true,
        completedAt: serverTimestamp(),
        result: resultDetail,
        note: note
      });

      // 2. Add Care Log
      const logData = {
        title: selectedTask.title,
        dueDate: selectedTask.dueDate,
        completedAt: serverTimestamp(),
        status: statusLabel,
        resultDetail: resultDetail,
        note: note,
        type: "care",
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, `contracts/${selectedTask.contractId}/careLogs`), logData);

      // 3. Update Contract (Tags) - Only if High Potential selected in Success
      if (feedbackMain === "success") {
        const updates: any = {};
        if (tags.renewal) updates.highRenewalPotential = true;
        if (tags.referral) updates.highReferralPotential = true;

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "contracts", selectedTask.contractId), updates);
        }
      }

      // 4. Create Follow-up Task
      // - Success: Conditioned on !noNextDate
      // - Fail: MANDATORY (Always create)
      const shouldCreateTask = (feedbackMain === "success" && !noNextDate) || (feedbackMain === "fail");

      if (shouldCreateTask && nextDate) {
        const newTitle = `[關懷後續] ${selectedTask.title}`;
        const safeStudentName = selectedTask.studentName || selectedTask.clientName || "";
        const safeClientName = selectedTask.clientName || selectedTask.studentName || "";

        await addDoc(collection(db, "tasks"), {
          title: newTitle,
          dueDate: new Date(nextDate),
          contractId: selectedTask.contractId,
          ownerId: selectedTask.ownerId,
          teamId: selectedTask.teamId,
          studentName: safeStudentName,
          clientName: safeClientName,
          completed: false,
          status: "pending",
          createdAt: serverTimestamp()
        });
      }

      setShowFeedbackModal(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("提交失敗");
    }
  };

  // --- KANBAN VIEW HELPER ---
  const renderKanbanColumn = (title: string, taskList: any[], bgColor: string, textColor: string, borderColor: string) => (
    <div className={`p-4 rounded-3xl ${bgColor} border-2 ${borderColor} min-w-[280px] flex-1 flex flex-col h-full`}>
      <div className={`flex justify-between items-center mb-4 ${textColor}`}>
        <h3 className="font-black text-lg">{title}</h3>
        <span className="bg-white/60 px-2 py-1 rounded-lg text-xs font-bold">{taskList.length}</span>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
        {taskList.length === 0 && (
          <div className="text-center py-10 opacity-40 font-bold text-sm">此區無待辦事項</div>
        )}
        {taskList.map(task => (
          <div
            key={task.id}
            onClick={() => handleTaskClick(task)}
            className={`bg-white p-4 rounded-2xl shadow-sm border-2 transition-all active:scale-95 cursor-pointer hover:shadow-md ${task.isOverdue ? 'border-red-200 ring-2 ring-red-100' : 'border-transparent'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs">
                  {(task.studentName || task.clientName)?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 leading-none">{task.studentName || task.clientName}</h4>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{task.title}</p>
                </div>
              </div>
              {task.isOverdue && <AlertTriangle size={16} className="text-red-500" />}
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mt-3 pt-3 border-t border-gray-50">
              <span className="flex items-center gap-1">
                <CalendarIcon size={12} />
                {task.dueDate?.toDate ? task.dueDate.toDate().toLocaleDateString() : task.dueDate}
              </span>
              {task.isOverdue && <span className="text-red-500">已逾期</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Director View: TEAM SELECTION
  if (profile?.role === 'director' && selectedTeamId === null && !loading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen pb-24">
        <div className="max-w-md mx-auto space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-gray-900">待辦事項總覽 (總監模式)</h1>
            <p className="text-gray-500">請選擇要檢視的團隊</p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {Object.keys(teamGroups).length === 0 && (
              <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-2xl">
                目前沒有任何待辦事項
              </div>
            )}
            {Object.entries(teamGroups).map(([tid, teamTasks]) => (
              <button
                key={tid}
                onClick={() => setSelectedTeamId(tid)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-blue-300 transition-all group"
              >
                <div className="text-left">
                  <h3 className="text-xl font-black text-gray-900 mb-1">{tid}</h3>
                  <p className="text-sm font-bold text-gray-400">待辦總數: {teamTasks.length} 筆</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ChevronRight size={24} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- FILTER LOGIC ---
  let rawTasks = (profile?.role === 'director' && selectedTeamId)
    ? teamGroups[selectedTeamId]
    : tasks;

  const displayTasks = rawTasks.filter(task => {
    if (filterRange === "all") return true;
    if (!task.dueDate) return false;

    const due = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filterRange === 'today') return diffDays <= 0;
    if (filterRange === '3days') return diffDays <= 3;
    if (filterRange === 'week') return diffDays <= 7;
    if (filterRange === 'month') return diffDays <= 30;
    return true;
  });

  const viewTitle = (profile?.role === 'director' && selectedTeamId)
    ? `${selectedTeamId} - 待辦看板`
    : "待辦任務看板";

  const showBackButton = profile?.role === 'director' && selectedTeamId;

  const tasksNewbie = displayTasks.filter(t => t.taskType === 'newbie');
  const tasksFirst = displayTasks.filter(t => t.taskType === 'first_class');
  const tasksSystem = displayTasks.filter(t => t.taskType === 'system');
  const tasksGeneral = displayTasks.filter(t => !['newbie', 'first_class', 'system'].includes(t.taskType));

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen pb-24 overflow-x-hidden">
      <header className="mb-8 space-y-6">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={() => setSelectedTeamId(null)}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200 border border-white text-gray-600 hover:scale-105 transition-transform"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-gray-900">{viewTitle}</h1>
            <p className="text-gray-500 font-bold mt-1">
              {loading ? "載入中..." : `今日需處理共 ${displayTasks.length} 件`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today', label: '今天' },
            { id: '3days', label: '三天內' },
            { id: 'week', label: '一週內' },
            { id: 'month', label: '一個月內' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterRange(opt.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterRange === opt.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold">載入中...</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-250px)]">
          {renderKanbanColumn("新手關懷", tasksNewbie, "bg-emerald-50/80", "text-emerald-800", "border-emerald-100")}
          {renderKanbanColumn("首課關懷", tasksFirst, "bg-blue-50/80", "text-blue-800", "border-blue-100")}
          {renderKanbanColumn("系統關懷", tasksSystem, "bg-purple-50/80", "text-purple-800", "border-purple-100")}
          {renderKanbanColumn("一般關懷", tasksGeneral, "bg-orange-50/80", "text-orange-800", "border-orange-100")}
        </div>
      )}

      {/* Updated Feedback Modal */}
      {showFeedbackModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-t-[40px] sm:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-gray-900 mb-6 text-center">任務回報</h3>

            {/* Main Option Toggle */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setFeedbackMain("success")}
                className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${feedbackMain === 'success' ? 'bg-green-50 border-green-500 text-green-700 shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}
              >
                <CheckCircle size={32} />
                聯繫成功
              </button>
              <button
                onClick={() => setFeedbackMain("fail")}
                className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${feedbackMain === 'fail' ? 'bg-red-50 border-red-500 text-red-700 shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}
              >
                <XCircle size={32} />
                未聯繫成功
              </button>
            </div>

            <div className="space-y-5">

              {/* ------------- SCENARIO A: SUCCESS ------------- */}
              {feedbackMain === "success" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-400 ml-1">備註說明</label>
                    <textarea
                      className="w-full h-24 bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 focus:border-green-500 outline-none mt-1 resize-none"
                      placeholder="請記錄家長回饋..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    ></textarea>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-400 ml-1">下次追蹤日期</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={noNextDate}
                          onChange={e => setNoNextDate(e.target.checked)}
                        />
                        <span className="text-xs font-bold text-green-600">不設定下次聯絡日</span>
                      </label>
                    </div>
                    <input
                      type="date"
                      disabled={noNextDate}
                      className={`w-full p-4 border-2 rounded-2xl font-bold mt-1 transition-colors ${noNextDate ? 'bg-gray-100 text-gray-300 border-gray-100' : 'bg-white border-green-200 text-gray-900 focus:border-green-500'}`}
                      value={nextDate}
                      onChange={e => setNextDate(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-xs font-bold text-gray-400 ml-1 mb-2 block">客戶標記 (可複選)</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTags({ ...tags, renewal: !tags.renewal })}
                        className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${tags.renewal ? 'bg-orange-50 border-orange-400 text-orange-600' : 'bg-white border-gray-200 text-gray-400'}`}
                      >
                        🔥 高續約可能
                      </button>
                      <button
                        onClick={() => setTags({ ...tags, referral: !tags.referral })}
                        className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${tags.referral ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-white border-gray-200 text-gray-400'}`}
                      >
                        👍 高推薦可能
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ------------- SCENARIO B: FAIL ------------- */}
              {feedbackMain === "fail" && (
                <>
                  {/* Fail Reasons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'no_answer', label: '未接聽' },
                      { id: 'busy', label: '忙線中' },
                      { id: 'inconvenient', label: '不方便' }
                    ].map(r => (
                      <button
                        key={r.id}
                        onClick={() => setFailReason(r.id as any)}
                        className={`p-3 rounded-xl font-bold text-sm border-2 transition-all ${failReason === r.id ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-400'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 ml-1">備註說明</label>
                    <textarea
                      className="w-full h-24 bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 focus:border-red-500 outline-none mt-1 resize-none"
                      placeholder="請輸入原因..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-red-500 ml-1 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      下次聯絡日 (必填)
                    </label>
                    <input
                      type="date"
                      className="w-full p-4 border-2 border-red-500 bg-red-50/10 rounded-2xl font-bold mt-1 text-gray-900 focus:ring-2 focus:ring-red-200 outline-none"
                      value={nextDate}
                      onChange={e => setNextDate(e.target.value)}
                    />
                    <p className="text-[10px] text-red-400 mt-1 font-bold ml-1">* 若未修改，系統將自動設為今日稍後再次追蹤</p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold rounded-2xl">取消</button>
                <button onClick={submitFeedback} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700">確認送出</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}