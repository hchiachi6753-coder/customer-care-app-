"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/schema";
import { useRouter } from "next/navigation";

interface TaskWithId extends Task {
  id: string;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'newcomer' | 'first_class' | 'monthly_care';
  title: string;
  status: 'completed' | 'pending' | 'overdue';
  icon: string;
  color: string;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<TaskWithId | null>(null);
  const [allTasks, setAllTasks] = useState<TaskWithId[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the specific task
        const taskDoc = await getDoc(doc(db, "tasks", params.id));
        if (taskDoc.exists()) {
          const currentTask = { id: taskDoc.id, ...taskDoc.data() } as TaskWithId;
          setTask(currentTask);
          
          // Fetch all tasks for this contract to build timeline
          const tasksQuery = query(
            collection(db, "tasks"),
            where("contractId", "==", currentTask.contractId)
          );
          const tasksSnapshot = await getDocs(tasksQuery);
          const contractTasks = tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TaskWithId[];
          
          setAllTasks(contractTasks);
          buildTimeline(contractTasks);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const buildTimeline = (tasks: TaskWithId[]) => {
    const events: TimelineEvent[] = [];
    const today = new Date();
    
    tasks.forEach(task => {
      const dueDate = task.dueDate.toDate();
      let eventType: TimelineEvent['type'] = 'monthly_care';
      let title = '月度關懷';
      let icon = '📅';
      let color = 'blue';
      
      if (task.taskType === 'onboarding') {
        eventType = 'newcomer';
        title = '新手關懷';
        icon = '🌱';
        color = 'green';
      } else if (task.taskType === 'first_lesson') {
        eventType = 'first_class';
        title = '首課關懷';
        icon = '🏫';
        color = 'blue';
      }
      
      let status: TimelineEvent['status'] = 'pending';
      if (task.isCompleted) {
        status = 'completed';
      } else if (dueDate < today) {
        status = 'overdue';
      }
      
      events.push({
        id: task.id,
        date: dueDate,
        type: eventType,
        title,
        status,
        icon,
        color
      });
    });
    
    // Sort by date (earliest first)
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    setTimeline(events);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', { 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'risk': return 'bg-red-100 text-red-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '進行中';
      case 'risk': return '風險';
      case 'finished': return '已完成';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">找不到客戶資料</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => router.back()}
            className="text-blue-600 text-sm mb-4 hover:text-blue-800"
          >
            ← 返回
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{task.clientName}</h1>
              <p className="text-gray-500">家長: {task.parentName}</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-2">
                {task.product}
              </span>
              <div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('active')}`}>
                  {getStatusText('active')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Section A: Contact Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">聯絡資訊</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">家長姓名</span>
              <span className="text-gray-900">{task.parentName}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">電話</span>
              <a 
                href={`tel:${task.parentName}`} 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                📞 點擊撥號
              </a>
            </div>
            {task.email && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Email</span>
                <a 
                  href={`mailto:${task.email}`} 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ✉️ 發送郵件
                </a>
              </div>
            )}
            {task.lineId && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Line ID</span>
                <span className="text-green-600 font-medium">
                  💬 {task.lineId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section B: Care History Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">關懷歷程</h2>
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {/* Timeline Events */}
            <div className="space-y-6">
              {timeline.map((event, index) => {
                const statusColors = {
                  completed: 'bg-green-500 border-green-200',
                  pending: 'bg-blue-500 border-blue-200',
                  overdue: 'bg-red-500 border-red-200'
                };
                const statusTexts = {
                  completed: '已完成',
                  pending: '待處理',
                  overdue: '逾期'
                };
                const statusTextColors = {
                  completed: 'text-green-600',
                  pending: 'text-blue-600',
                  overdue: 'text-red-600'
                };
                
                return (
                  <div key={event.id} className="relative flex items-start">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 w-12 text-right mr-4">
                      <div className="text-xs text-gray-500 font-medium">
                        {formatShortDate(event.date)}
                      </div>
                    </div>
                    
                    {/* Timeline Dot */}
                    <div className={`relative flex-shrink-0 w-3 h-3 rounded-full border-2 ${statusColors[event.status]} z-10`}></div>
                    
                    {/* Event Content */}
                    <div className="flex-1 ml-4 pb-6">
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">{event.icon}</span>
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        預計執行: {formatDate(event.date)}
                      </p>
                      <p className={`text-xs font-medium ${statusTextColors[event.status]}`}>
                        狀態: {statusTexts[event.status]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}