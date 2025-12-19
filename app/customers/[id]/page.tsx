"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CreateTaskModal from "@/components/CreateTaskModal";
import { Task } from "@/types/schema";
import { useRouter } from "next/navigation";

interface TaskWithId extends Task {
  id: string;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'newcomer' | 'first_class' | 'monthly_care' | 'general_care';
  title: string;
  status: 'completed' | 'pending' | 'overdue';
  icon: string;
  color: string;
  isCompleted?: boolean;
  callOutcome?: string;
  serviceType?: string;
  completionNote?: string;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [task, setTask] = useState<TaskWithId | null>(null);
  const [allTasks, setAllTasks] = useState<TaskWithId[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the specific task
        const taskDoc = await getDoc(doc(db, "tasks", resolvedParams.id));
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
  }, [resolvedParams.id]);

  const handleCreateTask = async (date: string, note: string) => {
    if (!task) return;
    
    try {
      await addDoc(collection(db, "tasks"), {
        contractId: task.contractId,
        agentId: "temp-agent-id",
        clientName: task.clientName,
        parentName: task.parentName,
        product: task.product,
        email: task.email,
        lineId: task.lineId,
        dueDate: Timestamp.fromDate(new Date(date.replace(/-/g, '/'))),
        taskType: 'monthly_care',
        isCompleted: false,
        status: 'pending',
        priority: 'normal',
        isSystemGenerated: false,
        completionNote: note,
        createdAt: Timestamp.now()
      });
      
      setIsCreateModalOpen(false);
      
      // Refresh tasks list
      const tasksQuery = query(
        collection(db, "tasks"),
        where("contractId", "==", task.contractId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const contractTasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaskWithId[];
      
      setAllTasks(contractTasks);
      buildTimeline(contractTasks);
      
    } catch (error) {
      console.error('Error creating task:', error);
      alert('建立任務失敗，請重試');
    }
  };

  const buildTimeline = (tasks: TaskWithId[]) => {
    const events: TimelineEvent[] = [];
    const today = new Date();
    
    tasks.forEach(task => {
      const dueDate = task.dueDate.toDate();
      let eventType: TimelineEvent['type'] = 'monthly_care';
      let title = '月度關懷';
      let icon = '🗓️';
      let color = 'purple';
      
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
      } else if (task.taskType === 'monthly_care' && task.isSystemGenerated === false) {
        eventType = 'general_care';
        title = '一般關懷 (手動)';
        icon = '📞';
        color = 'orange';
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
        color,
        isCompleted: task.isCompleted,
        callOutcome: task.callOutcome,
        serviceType: task.serviceType,
        completionNote: task.completionNote
      });
    });
    
    // Sort by date: Primary by dueDate, Secondary by createdAt (both ascending - earliest first)
    events.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // Tie-breaker: createdAt (older first - system tasks before manual tasks)
      const aTask = tasks.find(t => t.id === a.id);
      const bTask = tasks.find(t => t.id === b.id);
      const aCreated = aTask?.createdAt?.seconds || 0;
      const bCreated = bTask?.createdAt?.seconds || 0;
      return aCreated - bCreated;
    });
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

  const getCallOutcomeDisplay = (outcome?: string) => {
    const map = {
      connected: { label: '成功聯繫', color: 'bg-green-100 text-green-700' },
      no_answer: { label: '未接聽', color: 'bg-yellow-100 text-yellow-700' },
      busy: { label: '忙線中', color: 'bg-red-100 text-red-700' }
    };
    return outcome ? map[outcome as keyof typeof map] : null;
  };

  const getServiceTypeDisplay = (type?: string) => {
    const map = {
      normal: { label: '正常', color: 'bg-gray-100 text-gray-700' },
      help_needed: { label: '需要協助', color: 'bg-orange-100 text-orange-700' },
      complaint: { label: '客訴', color: 'bg-red-100 text-red-800' }
    };
    return type ? map[type as keyof typeof map] : null;
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">關懷歷程</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              ＋ 新增待辦
            </button>
          </div>
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
                    <div className={`relative flex-shrink-0 w-3 h-3 rounded-full border-2 ${
                      event.isCompleted ? 'bg-green-500 border-green-200' : statusColors[event.status]
                    } z-10`}></div>
                    
                    {/* Event Content */}
                    <div className="flex-1 ml-4 pb-6">
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">{event.icon}</span>
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                      </div>
                      
                      {/* Completion Badges */}
                      {event.isCompleted && (event.callOutcome || event.serviceType) && (
                        <div className="flex gap-2 mb-2">
                          {event.callOutcome && getCallOutcomeDisplay(event.callOutcome) && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              getCallOutcomeDisplay(event.callOutcome)!.color
                            }`}>
                              {getCallOutcomeDisplay(event.callOutcome)!.label}
                            </span>
                          )}
                          {event.serviceType && getServiceTypeDisplay(event.serviceType) && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              getServiceTypeDisplay(event.serviceType)!.color
                            }`}>
                              {getServiceTypeDisplay(event.serviceType)!.label}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Completion Note */}
                      {event.completionNote && (
                        <div className="mt-2 p-2 bg-slate-50 text-slate-600 text-sm rounded border border-slate-100">
                          {event.completionNote}
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 mb-1">
                        {event.isCompleted ? '完成時間' : '預計執行'}: {formatDate(event.date)}
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
      
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateTask}
      />
    </div>
  );
}