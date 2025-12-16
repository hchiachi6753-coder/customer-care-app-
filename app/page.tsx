"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskType } from "@/types/schema";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskWithId extends Task {
  id: string;
}

export default function Home() {
  const [allTasks, setAllTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        
        setAllTasks(tasksData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Get today's date string (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Convert Firestore timestamp to date string (YYYY-MM-DD)
  const getDateString = (timestamp: any) => {
    const date = timestamp.toDate();
    return date.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDateDisplay = (timestamp: any) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // STRICT filtering: only show tasks due today or overdue
  const todayString = getTodayString();
  const dueTasks = allTasks.filter(task => {
    const taskDateString = getDateString(task.dueDate);
    return task.status === 'pending' && taskDateString <= todayString;
  });

  // Sort by due date (ascending)
  dueTasks.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);

  // Filter tasks by specific types for 3 sections
  const noviceTasks = dueTasks.filter(task => task.taskType === 'onboarding');
  const firstLessonTasks = dueTasks.filter(task => task.taskType === 'first_lesson');
  const generalTasks = dueTasks.filter(task => task.taskType.startsWith('monthly'));

  // Task Card Component
  const TaskCard = ({ task, borderColor }: { task: TaskWithId; borderColor: string }) => {
    const todayString = getTodayString();
    const taskDateString = getDateString(task.dueDate);
    const isOverdue = taskDateString < todayString;
    const isToday = taskDateString === todayString;

    const handleNavigation = () => {
      router.push(`/customers/${task.id}`);
    };

    return (
      <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-3 border-l-4 ${borderColor}`}>
        {/* Row 1 - Header: Student Name + Contact Icons */}
        <div className="flex items-center mb-2">
          <h3 
            className="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleNavigation}
          >
            {task.clientName}
          </h3>
          <div className="flex gap-2 ml-3">
            {/* Phone Icon */}
            <button 
              onClick={handleNavigation}
              className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors"
              title={task.parentName ? `電話: ${task.parentName}` : '電話'}
            >
              📞
            </button>
            {/* Email Icon */}
            {task.email && (
              <button 
                onClick={handleNavigation}
                className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors"
                title={`Email: ${task.email}`}
              >
                ✉️
              </button>
            )}
            {/* Line Icon */}
            {task.lineId && (
              <button 
                onClick={handleNavigation}
                className="w-6 h-6 text-gray-400 hover:text-green-600 transition-colors"
                title={`Line: ${task.lineId}`}
              >
                💬
              </button>
            )}
          </div>
        </div>
        
        {/* Row 2 - Parent Name */}
        <div className="mb-2">
          <p className="text-sm text-gray-500">
            (家長: {task.parentName})
          </p>
        </div>
        
        {/* Row 3 - Product Badge */}
        <div className="mb-3">
          <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
            {task.product}
          </span>
        </div>
        
        {/* Row 4 - Footer: Date Status (Right Aligned) */}
        <div className="flex justify-end">
          {isOverdue ? (
            <p className="text-red-600 text-sm font-medium">
              逾期 {formatDateDisplay(task.dueDate)}
            </p>
          ) : isToday ? (
            <p className="text-green-600 text-sm font-medium">
              今日任務
            </p>
          ) : (
            <p className="text-gray-500 text-sm">
              {formatDateDisplay(task.dueDate)}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Section Component
  const Section = ({ title, tasks, borderColor, icon }: { 
    title: string; 
    tasks: TaskWithId[]; 
    borderColor: string;
    icon: string;
  }) => (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <span className="text-xl mr-2">{icon}</span>
        <h2 className="text-lg font-semibold text-gray-900">
          {title} ({tasks.length})
        </h2>
      </div>
      {tasks.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-500 text-sm">暫無任務</p>
        </div>
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} borderColor={borderColor} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">今日待辦事項</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8">
              <p className="text-gray-500">載入中...</p>
            </div>
          </div>
        ) : dueTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8">
              <p className="text-gray-600 text-lg">太棒了！今天沒有待辦事項 🎉</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Section 1: Novice Care */}
            <Section 
              title="新手關懷" 
              tasks={noviceTasks} 
              borderColor="border-t-green-500"
              icon="🌱"
            />
            
            {/* Section 2: First Lesson */}
            <Section 
              title="首課關懷" 
              tasks={firstLessonTasks} 
              borderColor="border-t-indigo-500"
              icon="🏫"
            />
            
            {/* Section 3: General Care */}
            <Section 
              title="一般關懷" 
              tasks={generalTasks} 
              borderColor="border-t-blue-500"
              icon="📅"
            />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-lg">
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