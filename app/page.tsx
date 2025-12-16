"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskType } from "@/types/schema";
import Link from "next/link";

interface TaskWithId extends Task {
  id: string;
}

export default function Home() {
  const [allTasks, setAllTasks] = useState<TaskWithId[]>([]);
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

    return (
      <div className={`bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-3 border-t-4 ${borderColor}`}>
        <div className="flex justify-between items-start">
          {/* Left Side - Info */}
          <div className="flex-1">
            {/* Header - Client Name + Parent Name */}
            <div className="mb-2">
              <h3 className="text-base font-bold text-gray-900">
                {task.clientName}
              </h3>
              <p className="text-sm text-gray-500">
                {task.parentName}
              </p>
            </div>
            
            {/* Body - Product Badge */}
            <div className="mb-3">
              <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                {task.product}
              </span>
            </div>
            
            {/* Footer - Date Status */}
            <div>
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
          
          {/* Right Side - Action */}
          <div className="ml-4">
            <button className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors">
              📞
            </button>
          </div>
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
        <h1 className="text-xl font-bold text-gray-900">今日待辦事項</h1>
      </div>

      {/* Main Content */}
      <div className="p-4">
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