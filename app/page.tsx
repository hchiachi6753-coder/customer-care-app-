"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskType } from "@/types/schema";
import Link from "next/link";

interface TaskWithId extends Task {
  id: string;
}

const taskTypeTranslations: Record<TaskType, string> = {
  onboarding: "🌱 新生關懷",
  first_lesson: "📚 首課關懷",
  monthly_care: "💝 月度關懷"
};

export default function Home() {
  const [dueTasks, setDueTasks] = useState<TaskWithId[]>([]);
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
        
        // Get end of today
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        
        // Filter for due tasks (pending + due <= end of today)
        const filteredTasks = tasksData.filter(task => {
          const dueDate = task.dueDate.toDate();
          return task.status === 'pending' && dueDate <= endOfToday;
        });
        
        // Sort by due date (ascending)
        filteredTasks.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);
        
        setDueTasks(filteredTasks);
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
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

  // Group tasks by type
  const groupedTasks = dueTasks.reduce((groups, task) => {
    const type = task.taskType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(task);
    return groups;
  }, {} as Record<TaskType, TaskWithId[]>);

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
        ) : dueTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">太棒了！今天沒有待辦事項 🎉</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([taskType, tasks]) => (
              <div key={taskType}>
                {/* Section Header */}
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  {taskTypeTranslations[taskType as TaskType]} ({tasks.length})
                </h2>
                
                {/* Task Cards */}
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 text-lg">
                            {task.clientName}
                          </h3>
                          <p className={`text-sm font-medium ${
                            isOverdue(task.dueDate) ? 'text-red-600' :
                            isToday(task.dueDate) ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {formatDate(task.dueDate)}
                          </p>
                        </div>
                        {task.priority === 'high' && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            高優先
                          </span>
                        )}
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        📞 撥打電話
                      </button>
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