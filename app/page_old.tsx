"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 定義任務介面
interface Task {
  id: string;
  title: string;
  clientName?: string;
  studentName?: string;
  parentName?: string;
  type: string;
  status: string;
  dueDate: Timestamp;
  contractId: string;
  phone?: string;
  product?: string;
  ownerId?: string; // 新欄位
  agentId?: string; // 舊欄位 (相容用)
}

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. 等待驗證載入完成
    if (authLoading) return;

    // 2. 如果沒登入，踢回登入頁
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchTasks = async () => {
      try {
        let q;
        const tasksRef = collection(db, "tasks");

        // 🛑 核心邏輯：依照角色決定要抓什麼資料
        if (userProfile?.role === "director") {
          // 👑 總監：看全部 (只過濾未完成)
          console.log("身分: 總監 - 載入所有任務");
          q = query(
            tasksRef,
            where("status", "==", "pending")
          );
        } else if (userProfile?.role === "manager") {
          // 💼 主管：看團隊 (Team)
          console.log("身分: 主管 - 載入團隊任務", userProfile.teamId);
          q = query(
            tasksRef,
            where("teamId", "==", userProfile.teamId),
            where("status", "==", "pending")
          );
        } else {
          // 🏃 業務：看自己 (Owner)
          console.log("身分: 業務 - 載入個人任務", user.uid);
          
          // 這裡做一個保護機制：
          // 雖然我們主要用 ownerId，但為了怕舊資料只存了 agentId，我們先抓 ownerId
          // 如果真的抓不到，可以在這裡擴充邏輯 (但目前先專注於 ownerId)
          q = query(
            tasksRef,
            where("ownerId", "==", user.uid),
            where("status", "==", "pending")
          );
        }

        const querySnapshot = await getDocs(q);
        
        // 如果業務抓不到資料，嘗試用舊欄位 agentId 再抓一次 (雙重保險)
        let taskList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        if (taskList.length === 0 && userProfile?.role === 'sales') {
            console.log("查無 ownerId 資料，嘗試使用 agentId 搜尋舊資料...");
            const legacyQuery = query(
                tasksRef,
                where("agentId", "==", user.uid),
                where("status", "==", "pending")
            );
            const legacySnapshot = await getDocs(legacyQuery);
            const legacyList = legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
            taskList = legacyList;
        }

        // 前端排序：日期越舊越上面 (越緊急)
        taskList.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);

        setTasks(taskList);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, userProfile, authLoading, router]);

  // 處理完成任務
  const handleComplete = async (taskId: string, currentStatus: string) => {
    if (!confirm("確定要將此任務標記為完成嗎？")) return;
    
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "completed",
        completedAt: Timestamp.now(),
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Error updating task:", error);
      alert("操作失敗，請重試");
    }
  };

  // 分類顯示
  const noviceTasks = tasks.filter(t => t.type === 'novice_care' || t.type === 'newcomer');
  const firstLessonTasks = tasks.filter(t => t.type === 'first_lesson' || t.type === 'first_class');
  const monthlyTasks = tasks.filter(t => t.type === 'monthly_care');
  const otherTasks = tasks.filter(t => 
    !['novice_care', 'newcomer', 'first_lesson', 'first_class', 'monthly_care'].includes(t.type)
  );

  const getName = (task: Task) => task.studentName || task.clientName || "未命名學員";

  if (authLoading || loading) {
    return <div className="p-8 text-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
             {userProfile?.role === 'director' ? '全域待辦事項' : 
              userProfile?.role === 'manager' ? '團隊待辦事項' : '我的待辦事項'}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
           <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
             待辦: {tasks.length}
           </span>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        
        {noviceTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center">🌱 新手關懷 ({noviceTasks.length})</h2>
            <div className="space-y-3">
              {noviceTasks.map(task => <TaskCard key={task.id} task={task} getName={getName} onComplete={handleComplete} />)}
            </div>
          </div>
        )}

        {firstLessonTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center">🏫 首課關懷 ({firstLessonTasks.length})</h2>
            <div className="space-y-3">
              {firstLessonTasks.map(task => <TaskCard key={task.id} task={task} getName={getName} onComplete={handleComplete} />)}
            </div>
          </div>
        )}

        {monthlyTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center">🗓️ 月度關懷 ({monthlyTasks.length})</h2>
            <div className="space-y-3">
              {monthlyTasks.map(task => <TaskCard key={task.id} task={task} getName={getName} onComplete={handleComplete} />)}
            </div>
          </div>
        )}
        
        {otherTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center">📋 其他任務 ({otherTasks.length})</h2>
            <div className="space-y-3">
              {otherTasks.map(task => <TaskCard key={task.id} task={task} getName={getName} onComplete={handleComplete} />)}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-800">目前沒有待辦事項</h3>
            <p className="text-gray-500 mt-2">
                {userProfile?.role === 'sales' ? '去新增一筆合約來測試看看吧！' : '團隊表現很棒，都處理完了！'}
            </p>
            {userProfile?.role !== 'director' && (
                <div className="mt-8">
                <Link href="/contracts/new" className="text-blue-600 font-medium hover:underline">
                    + 新增合約
                </Link>
                </div>
            )}
          </div>
        )}
      </div>

      {/* 底部導航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-between items-center z-20">
        <div className="flex flex-col items-center text-blue-600">
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium mt-1">待辦</span>
        </div>
        
        {/* 只有非總監才顯示新增按鈕，避免總監誤按 */}
        {userProfile?.role !== 'director' ? (
            <Link href="/contracts/new" className="flex flex-col items-center text-gray-400 hover:text-gray-600">
            <span className="text-xl text-gray-400 font-bold">+</span>
            <span className="text-xs font-medium mt-1">新增</span>
            </Link>
        ) : (
            <div className="w-8"></div> // 佔位用，保持排版平衡
        )}

        <Link href="/customers" className="flex flex-col items-center text-gray-400 hover:text-gray-600">
          <span className="text-xl">👥</span>
          <span className="text-xs font-medium mt-1">客戶</span>
        </Link>
      </div>
    </div>
  );
}

// 卡片組件
function TaskCard({ task, getName, onComplete }: { task: Task, getName: Function, onComplete: Function }) {
  const isOverdue = task.dueDate.seconds * 1000 < Date.now();
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-blue-500'} border-y border-r border-gray-100`}>
      <div className="flex justify-between items-start">
        <Link href={`/customers/${task.contractId}`} className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg">{getName(task)}</h3>
          {task.parentName && <p className="text-gray-500 text-sm">家長: {task.parentName}</p>}
          <div className="flex gap-2 mt-2">
            {task.product && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{task.product}</span>}
            <span className={`text-xs px-2 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600 font-medium' : 'bg-green-100 text-green-600'}`}>
              {isOverdue ? '已逾期' : '今日任務'}
            </span>
          </div>
        </Link>
        <div className="flex gap-3 ml-3">
          <a href={`tel:${task.phone}`} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-green-100 hover:text-green-600 transition-colors">📞</a>
          <button onClick={() => onComplete(task.id, task.status)} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors">✅</button>
        </div>
      </div>
    </div>
  );
}