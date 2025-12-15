"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskType } from "@/types/schema";
import Link from "next/link";

interface TaskWithId extends Task {
  id: string;
}

const taskTypeTranslations: Record<TaskType, string> = {
  onboarding: "新生關懷",
  first_lesson: "首課關懷",
  monthly_care: "月度關懷"
};

export default function Home() {
  const [tasks, setTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "tasks"),
      where("agentId", "==", "temp-agent-id")
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TaskWithId[];
        
        // Filter pending tasks in client
        const pendingTasks = tasksData.filter(task => task.status === 'pending');
        
        // Sort by due date
        pendingTasks.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);
        
        setTasks(pendingTasks);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (timestamp: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = timestamp.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const isToday = (timestamp: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = timestamp.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-900">今日待辦事項</h1>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">載入中...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">今天沒有待辦事項！休息一下吧 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {taskTypeTranslations[task.taskType]}
                    </h3>
                    <p className="text-sm text-gray-500">合約: {task.contractId}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      isOverdue(task.dueDate) ? 'text-red-600' :
                      isToday(task.dueDate) ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {formatDate(task.dueDate)}
                    </p>
                    {task.priority === 'high' && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        高優先
                      </span>
                    )}
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  📞 撥打電話
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center py-2 px-4 text-blue-600">
            <div className="text-xl mb-1">🏠</div>
            <span className="text-xs font-medium">待辦</span>
          </Link>
          <Link href="/contracts/new" className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-blue-600">
            <div className="text-xl mb-1">➕</div>
            <span className="text-xs">新增</span>
          </Link>
          <Link href="/contracts" className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-blue-600">
            <div className="text-xl mb-1">👥</div>
            <span className="text-xs">客戶</span>
          </Link>
        </div>
      </div>
    </div>
  );
}