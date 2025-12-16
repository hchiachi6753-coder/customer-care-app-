"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/schema";
import { useRouter } from "next/navigation";

interface TaskWithId extends Task {
  id: string;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<TaskWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const taskDoc = await getDoc(doc(db, "tasks", params.id));
        if (taskDoc.exists()) {
          setTask({ id: taskDoc.id, ...taskDoc.data() } as TaskWithId);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching task:", error);
        setLoading(false);
      }
    };

    fetchTask();
  }, [params.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "未設定";
    return new Date(dateString).toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">電話</span>
              <a 
                href={`tel:${task.parentName}`} 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                📞 {task.parentName}
              </a>
            </div>
            {task.email && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email</span>
                <a 
                  href={`mailto:${task.email}`} 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ✉️ {task.email}
                </a>
              </div>
            )}
            {task.lineId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Line ID</span>
                <span className="text-green-600 font-medium">
                  💬 {task.lineId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section B: Milestones */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">重要里程碑</h2>
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="flex-1">
                <h3 className="font-medium text-green-900">新手加入日</h3>
                <p className="text-green-700 text-sm">{formatDate(task.joinDate)}</p>
              </div>
              <div className="text-green-600 text-xl">🌱</div>
            </div>
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">首課日期</h3>
                <p className="text-blue-700 text-sm">{formatDate(task.firstClassDate)}</p>
              </div>
              <div className="text-blue-600 text-xl">🏫</div>
            </div>
          </div>
        </div>

        {/* Section C: Interaction Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">互動時間軸</h2>
          <div className="space-y-4">
            {/* Timeline Item 1 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">新手關懷任務</h3>
                <p className="text-gray-600 text-sm">預計執行日期: {formatDate(task.joinDate)}</p>
                <p className="text-gray-500 text-xs mt-1">狀態: 待處理</p>
              </div>
            </div>

            {/* Timeline Item 2 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">首課關懷任務</h3>
                <p className="text-gray-600 text-sm">預計執行日期: {formatDate(task.firstClassDate)}</p>
                <p className="text-gray-500 text-xs mt-1">狀態: 待處理</p>
              </div>
            </div>

            {/* Timeline Item 3 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">月度關懷任務</h3>
                <p className="text-gray-600 text-sm">定期關懷追蹤</p>
                <p className="text-gray-500 text-xs mt-1">狀態: 進行中</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速動作</h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${task.parentName}`}
              className="flex items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              📞 撥打電話
            </a>
            {task.email && (
              <a
                href={`mailto:${task.email}`}
                className="flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                ✉️ 發送郵件
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}