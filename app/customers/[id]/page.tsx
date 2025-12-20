"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CreateTaskModal from "@/components/CreateTaskModal";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ContractData {
  id: string;
  contractNo?: string;
  studentName: string; 
  parentName: string;
  phone: string;
  email?: string;
  lineId?: string;
  product: string;
  note?: string;
  ownerId?: string;
  teamId?: string;
  status?: string;
}

interface TaskWithId {
  id: string;
  title?: string;
  dueDate: Timestamp;
  taskType?: string;
  isCompleted: boolean;
  status: string;
  callOutcome?: string;
  serviceType?: string;
  completionNote?: string;
  createdAt?: Timestamp;
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
  const { user, userProfile } = useAuth();
  
  const [contract, setContract] = useState<ContractData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🛑 修正：這裡改成讀取 contracts
        const docRef = doc(db, "contracts", resolvedParams.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const currentContract = { id: docSnap.id, ...data } as ContractData;
          setContract(currentContract);
          
          const tasksQuery = query(
            collection(db, "tasks"),
            where("contractId", "==", currentContract.id)
          );
          
          const tasksSnapshot = await getDocs(tasksQuery);
          const contractTasks = tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TaskWithId[];
          
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
    if (!contract || !user) return;
    
    try {
      await addDoc(collection(db, "tasks"), {
        contractId: contract.id,
        agentId: user.uid,
        clientName: contract.studentName,
        parentName: contract.parentName,
        product: contract.product,
        email: contract.email || "",
        lineId: contract.lineId || "",
        phone: contract.phone,
        dueDate: Timestamp.fromDate(new Date(date.replace(/-/g, '/'))),
        taskType: 'monthly_care',
        isCompleted: false,
        status: 'pending',
        priority: 'normal',
        isSystemGenerated: false,
        completionNote: note,
        ownerId: user.uid,
        teamId: userProfile?.teamId || "main_team",
        createdAt: Timestamp.now()
      });
      
      setIsCreateModalOpen(false);
      window.location.reload(); 
    } catch (error) {
      console.error('Error creating task:', error);
      alert('建立任務失敗，請重試');
    }
  };

  const buildTimeline = (tasks: TaskWithId[]) => {
    const events: TimelineEvent[] = [];
    const today = new Date();
    
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const dueDate = task.dueDate.toDate();
      let eventType: TimelineEvent['type'] = 'monthly_care';
      let title = task.title || '月度關懷';
      let icon = '🗓️';
      let color = 'purple';
      
      if (task.taskType === 'novice_care' || task.taskType === 'newcomer') {
        eventType = 'newcomer';
        title = task.title || '新手關懷';
        icon = '🌱';
        color = 'green';
      } else if (task.taskType === 'first_lesson' || task.taskType === 'first_class') {
        eventType = 'first_class';
        title = task.title || '首課關懷';
        icon = '🏫';
        color = 'blue';
      } else if (task.taskType === 'monthly_care') {
        eventType = 'general_care';
        icon = '📞';
        color = 'orange';
      }
      
      let status: TimelineEvent['status'] = 'pending';
      if (task.isCompleted) status = 'completed';
      else if (dueDate < today) status = 'overdue';
      
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
    
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimeline(events);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;
  if (!contract) return <div className="p-8 text-center text-gray-500">找不到客戶資料</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={() => router.back()} className="mr-4 text-gray-600">← 返回</button>
        <h1 className="text-lg font-bold text-gray-800">客戶詳情</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{contract.studentName}</h2>
              <p className="text-gray-500 text-sm mt-1">家長：{contract.parentName}</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{contract.product}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-gray-600">
             <div className="col-span-2">📞 <a href={`tel:${contract.phone}`} className="text-blue-600">{contract.phone}</a></div>
             {contract.email && <div className="col-span-2">✉️ {contract.email}</div>}
             {contract.lineId && <div className="col-span-2">💬 Line: {contract.lineId}</div>}
          </div>
          {contract.note && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">{contract.note}</div>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg font-bold text-gray-800">關懷歷程</h3>
            <button onClick={() => setIsCreateModalOpen(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow">+ 新增紀錄</button>
          </div>
          <div className="space-y-4">
            {timeline.length === 0 ? <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed">尚無關懷紀錄</div> : timeline.map((event) => (
              <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${event.color}-500`}></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                  <div className="flex items-center gap-2"><span className="text-xl">{event.icon}</span><span className="font-bold text-gray-800">{event.title}</span></div>
                  <span className="text-xs text-gray-400">{event.date.toLocaleDateString()}</span>
                </div>
                <div className="pl-9 text-xs text-gray-500">{event.status === 'completed' ? '已完成' : event.status === 'overdue' ? '已逾期' : '待處理'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <CreateTaskModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateTask} studentName={contract.studentName} />
    </div>
  );
}