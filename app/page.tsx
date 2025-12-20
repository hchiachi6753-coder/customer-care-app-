"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskType } from "@/types/schema";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TaskCompletionModal from "@/components/TaskCompletionModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

interface TaskWithId extends Task {
  id: string;
}

export default function Home() {
  const [allTasks, setAllTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<{ manualTasks: any[], systemTask: any | null } | null>(null);
  const router = useRouter();
  const { user, profile } = useAuth();

  useEffect(() => {
    // Wait for user profile to load
    if (!profile) {
      setLoading(true);
      return;
    }

    // Build query based on user role
    let tasksQuery;
    
    if (profile.role === 'sales') {
      // Sales: Only own tasks
      tasksQuery = query(
        collection(db, "tasks"),
        where("ownerId", "==", user!.uid)
      );
    } else if (profile.role === 'manager') {
      // Manager: Team tasks
      tasksQuery = query(
        collection(db, "tasks"),
        where("teamId", "==", profile.teamId)
      );
    } else {
      // Director: All tasks
      tasksQuery = query(collection(db, "tasks"));
    }

    const unsubscribe = onSnapshot(tasksQuery, 
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
  }, [profile, user]);

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
    return (task.status === 'pending' || task.status === 'todo') && taskDateString <= todayString;
  });

  // Sort by due date (ascending)
  dueTasks.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);

  // Filter tasks by specific types for 4 sections
  const noviceTasks = dueTasks.filter(task => task.taskType === 'onboarding');
  const firstLessonTasks = dueTasks.filter(task => task.taskType === 'first_lesson');
  const monthlyTasks = dueTasks.filter(task => task.taskType === 'monthly_care' && task.isSystemGenerated !== false);
  const generalTasks = dueTasks.filter(task => task.taskType === 'monthly_care' && task.isSystemGenerated === false);
  
  console.log('\n=== 📊 任務分析 ===');
  console.log('- 所有任務:', allTasks.length);
  console.log('- 待辦任務:', dueTasks.length);
  console.log('- 新手關懷:', noviceTasks.length);
  console.log('- 首課關懷:', firstLessonTasks.length);
  console.log('- 月度關懷:', monthlyTasks.length);
  console.log('- 一般關懷:', generalTasks.length);
  
  // 檢查最近的任務
  const recentTasks = allTasks
    .filter(t => t.taskType === 'monthly_care')
    .sort((a, b) => b.dueDate.seconds - a.dueDate.seconds)
    .slice(0, 3);
    
  console.log('\n=== 🔍 最近的一般關懷任務 ===');
  recentTasks.forEach((task, index) => {
    const taskDate = new Date(task.dueDate.seconds * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    console.log(`${index + 1}. ID: ${task.id}`);
    console.log(`   客戶: ${task.clientName}`);
    console.log(`   日期: ${taskDate} (今天: ${today})`);
    console.log(`   狀態: ${task.status}`);
    console.log(`   完成: ${task.isCompleted}`);
    console.log(`   應顯示: ${task.status === 'pending' && taskDate <= today}`);
    console.log('---');
  });

  const handleConfirmCompletion = async (taskData: {
    note: string;
    callOutcome: string;
    serviceType: string;
    nextContactDate?: string;
    isReschedule?: boolean;
  }) => {
    if (!selectedTask) return;
    
    const normalizeDate = (d: string) => d ? d.replace(/-/g, '/') : '';
    
    try {
      if (taskData.callOutcome === 'connected') {
        // Scenario A: Success - Mark Done
        await updateDoc(doc(db, "tasks", selectedTask.id), {
          isCompleted: true,
          status: 'done',
          completionNote: taskData.note,
          callOutcome: taskData.callOutcome,
          serviceType: taskData.serviceType,
          completedAt: new Date().toISOString()
        });
        
        // Create NEW task if date provided
        if (taskData.nextContactDate && taskData.nextContactDate.trim()) {
          await addDoc(collection(db, "tasks"), {
            dueDate: Timestamp.fromDate(new Date(normalizeDate(taskData.nextContactDate))),
            contractId: selectedTask.contractId,
            agentId: "temp-agent-id",
            clientName: selectedTask.clientName,
            parentName: selectedTask.parentName,
            product: selectedTask.product,
            email: selectedTask.email,
            lineId: selectedTask.lineId,
            taskType: 'monthly_care',
            isCompleted: false,
            status: 'pending',
            priority: 'normal',
            isSystemGenerated: false
          });
        }
      } else {
        // Scenario B: Failure - Reschedule current task
        await updateDoc(doc(db, "tasks", selectedTask.id), {
          isCompleted: false,
          status: 'todo',
          dueDate: Timestamp.fromDate(new Date(normalizeDate(taskData.nextContactDate!))),
          completionNote: taskData.note,
          callOutcome: taskData.callOutcome,
          serviceType: taskData.serviceType
        });
      }
      
      setIsModalOpen(false);
      setSelectedTask(null);
      setSchedulePreview(null);
    } catch (error) {
      console.error('Error handling task:', error);
      alert('操作失敗，請重試');
    }
  };

  const openCompleteModal = async (task: TaskWithId) => {
    setSelectedTask(task);
    setSchedulePreview(null);
    
    try {
      // Simplified query - fetch all tasks for this contract and filter client-side
      const contractTasksQuery = query(
        collection(db, "tasks"),
        where("contractId", "==", task.contractId)
      );
      
      const contractTasksSnapshot = await getDocs(contractTasksQuery);
      const allContractTasks = contractTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaskWithId[];
      
      // Client-side filtering and sorting
      const futureTasks = allContractTasks
        .filter(t => 
          t.status === 'pending' && 
          t.dueDate.seconds > task.dueDate.seconds
        )
        .sort((a, b) => a.dueDate.seconds - b.dueDate.seconds)
        .slice(0, 10);
      
      // Find first system task using improved detection
      let systemTask = null;
      let manualTasks = [];
      
      for (let i = 0; i < futureTasks.length; i++) {
        const task = futureTasks[i];
        
        // Check if this is a system task
        const isSystemTask = 
          task.isSystemGenerated === true ||
          (task.taskType && (
            task.taskType.includes('monthly') ||
            task.taskType.includes('first_lesson') ||
            task.taskType.includes('onboarding')
          ));
        
        if (isSystemTask) {
          // Found first system task - stop here
          systemTask = task;
          break;
        } else {
          // This is a manual task
          manualTasks.push(task);
        }
      }
      
      setSchedulePreview({ manualTasks, systemTask });
    } catch (error) {
      console.error('Error fetching future tasks:', error);
      setSchedulePreview({ manualTasks: [], systemTask: null });
    }
    
    setIsModalOpen(true);
  };

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
      <div className={`bg-white p-2.5 rounded-xl shadow-sm border border-gray-200 mb-2 border-l-4 ${borderColor}`}>
        {/* Row 1 - Header: Student Name + Icons */}
        <div className="flex items-center justify-between mb-1">
          <h3 
            className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleNavigation}
          >
            {task.clientName}
          </h3>
          <div className="flex gap-1.5">
            {/* Complete Task Button */}
            <button 
              onClick={() => openCompleteModal(task)}
              className="w-6 h-6 bg-green-100 text-green-600 rounded border border-green-300 hover:bg-green-200 transition-colors flex items-center justify-center"
              title="完成任務"
            >
              ✓
            </button>
            {/* Phone Icon */}
            <button 
              onClick={handleNavigation}
              className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors"
              title={task.parentName ? `電話: ${task.parentName}` : '電話'}
            >
              📞
            </button>
            {/* Email Icon */}
            {task.email && (
              <button 
                onClick={handleNavigation}
                className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors"
                title={`Email: ${task.email}`}
              >
                ✉️
              </button>
            )}
            {/* Line Icon */}
            {task.lineId && (
              <button 
                onClick={handleNavigation}
                className="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors"
                title={`Line: ${task.lineId}`}
              >
                💬
              </button>
            )}
          </div>
        </div>
        
        {/* Row 2 - Parent Name + Product Badge + Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              (家長: {task.parentName})
            </p>
            <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {task.product}
            </span>
          </div>
          <div>
            {isOverdue ? (
              <p className="text-red-600 text-xs font-medium">
                逾期 {formatDateDisplay(task.dueDate)}
              </p>
            ) : isToday ? (
              <p className="text-green-600 text-xs font-medium">
                今日任務
              </p>
            ) : (
              <p className="text-gray-500 text-xs">
                {formatDateDisplay(task.dueDate)}
              </p>
            )}
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
    <ProtectedRoute>
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
            
            {/* Section 3: Monthly Care */}
            <Section 
              title="月度關懷" 
              tasks={monthlyTasks} 
              borderColor="border-t-purple-500"
              icon="🗓️"
            />
            
            {/* Section 4: General Care */}
            <Section 
              title="一般關懷" 
              tasks={generalTasks} 
              borderColor="border-t-orange-500"
              icon="📋"
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

      {/* Task Completion Modal */}
      <TaskCompletionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          setSchedulePreview(null);
        }}
        onConfirm={handleConfirmCompletion}
        taskTitle={selectedTask ? `${selectedTask.clientName} - ${selectedTask.taskType === 'onboarding' ? '新手關懷' : selectedTask.taskType === 'first_lesson' ? '首課關懷' : '月度關懷'}` : ''}
        schedulePreview={schedulePreview}
      />
      </div>
    </ProtectedRoute>
  );
}