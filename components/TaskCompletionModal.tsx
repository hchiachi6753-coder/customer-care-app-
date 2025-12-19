"use client";

import { useState, useEffect } from "react";
import { CALL_OUTCOME_OPTIONS, SERVICE_TYPE_OPTIONS } from "@/types/schema";

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    note: string;
    callOutcome: string;
    serviceType: string;
    nextContactDate?: string;
    isReschedule?: boolean;
  }) => void;
  taskTitle: string;
  schedulePreview?: { manualTasks: any[], systemTask: any | null } | null;
}

export default function TaskCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
  schedulePreview,
}: TaskCompletionModalProps) {
  const [note, setNote] = useState("");
  const [callOutcome, setCallOutcome] = useState("connected");
  const [serviceType, setServiceType] = useState("normal");
  const [nextContactDate, setNextContactDate] = useState<string>("");
  const [inputKey, setInputKey] = useState(0); // 強制重新渲染
  
  const handleOutcomeChange = (newOutcome: string) => {
    setCallOutcome(newOutcome);
    
    if (newOutcome === 'connected') {
      setNextContactDate('');
      setInputKey(prev => prev + 1); // 強制重新渲染清空
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setNextContactDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ 
      note, 
      callOutcome, 
      serviceType,
      nextContactDate: nextContactDate && nextContactDate.trim() ? nextContactDate.trim() : undefined,
      isReschedule: callOutcome !== 'connected'
    });
  };

  const getCallOutcomeColor = (value: string) => {
    switch (value) {
      case "connected": return "bg-green-100 text-green-800 border-green-300";
      case "no_answer": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "busy": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getServiceTypeColor = (value: string) => {
    switch (value) {
      case "normal": return "bg-gray-100 text-gray-800 border-gray-300";
      case "help_needed": return "bg-orange-100 text-orange-800 border-orange-300";
      case "complaint": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            完成任務: {taskTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section 1: Call Outcome */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">通話狀態</h3>
            <div className="flex flex-wrap gap-2">
              {CALL_OUTCOME_OPTIONS.slice(0, 3).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOutcomeChange(option.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    callOutcome === option.value
                      ? getCallOutcomeColor(option.value) + " ring-2 ring-offset-1"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Service Type */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">服務標籤</h3>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPE_OPTIONS.slice(0, 3).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setServiceType(option.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    serviceType === option.value
                      ? getServiceTypeColor(option.value) + " ring-2 ring-offset-1"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Note */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">備註</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="請輸入執行紀錄..."
            />
          </div>

          {/* Schedule Preview - Only show for successful calls */}
          {schedulePreview && callOutcome === 'connected' && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 text-sm">
              <h4 className="font-bold text-slate-700 mb-2">📅 後續預定行程：</h4>
              
              {/* Manual Tasks */}
              {schedulePreview.manualTasks.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">👤 中途停靠 (手動預約):</div>
                  <ul>
                    {schedulePreview.manualTasks.map((task, index) => (
                      <li key={index} className="text-slate-600 pl-2 mb-1 border-l-2 border-slate-300 flex justify-between">
                        <span>{new Date(task.dueDate.toDate()).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })} - 一般關懷</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Divider */}
              {schedulePreview.manualTasks.length > 0 && schedulePreview.systemTask && (
                <hr className="my-3 border-dashed border-slate-300" />
              )}
              
              {/* System Task */}
              {schedulePreview.systemTask && (
                <div>
                  <div className="text-xs text-blue-500 mb-1">🤖 系統排程 (下一站):</div>
                  <div className="text-blue-800 font-bold pl-2 border-l-2 border-blue-400">
                    {new Date(schedulePreview.systemTask.dueDate.toDate()).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })} - 月度關懷
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {schedulePreview.manualTasks.length === 0 && !schedulePreview.systemTask && (
                <div className="text-gray-400 italic">無後續預定行程</div>
              )}
            </div>
          )}

          {/* Dynamic Date Input based on Call Outcome */}
          <div>
            <h3 className={`text-sm font-medium mb-3 ${
              callOutcome === 'connected' ? 'text-gray-700' : 'text-red-600 font-bold'
            }`}>
              {callOutcome === 'connected' ? '插入新的聯絡行程 (選填)' : '預約再次撥打時間 (必填)'}
            </h3>
            {callOutcome === 'connected' ? (
              <div className="relative">
                <input
                  key={inputKey}
                  type="text"
                  value={nextContactDate ? new Date(nextContactDate).toLocaleDateString('zh-TW') : ''}
                  placeholder="點擊選擇日期（選填）"
                  readOnly
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'date';
                    input.value = nextContactDate || '';
                    input.style.position = 'fixed';
                    input.style.top = '50%';
                    input.style.left = '50%';
                    input.style.transform = 'translate(-50%, -50%)';
                    input.style.zIndex = '10000';
                    input.style.opacity = '0';
                    input.style.pointerEvents = 'auto';
                    document.body.appendChild(input);
                    
                    input.onchange = (e) => {
                      const value = (e.target as HTMLInputElement).value;
                      if (value) {
                        setNextContactDate(value);
                      }
                      document.body.removeChild(input);
                    };
                    
                    input.onblur = () => {
                      if (document.body.contains(input)) {
                        document.body.removeChild(input);
                      }
                    };
                    
                    setTimeout(() => {
                      input.focus();
                      input.click();
                    }, 10);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer bg-white text-gray-900"
                />
              </div>
            ) : (
              <input
                key={inputKey}
                type="date"
                value={nextContactDate}
                onChange={(e) => setNextContactDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full px-3 py-2 border border-red-500 rounded-lg focus:ring-2 focus:border-red-500 focus:ring-red-200 outline-none bg-white text-gray-900"
                required
              />
            )}
            <div className="mt-2 flex gap-2">
              {callOutcome === 'connected' && (
                <button 
                  type="button"
                  onClick={() => {
                    setNextContactDate('');
                    setInputKey(prev => prev + 1); // 強制重新渲染 input
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                >
                  清除日期
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setNextContactDate(tomorrow.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
              >
                設定為明天
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              // 重置狀態
              setNote("");
              setCallOutcome("connected");
              setServiceType("normal");
              setNextContactDate("");
              setInputKey(prev => prev + 1);
            }}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              handleConfirm();
              // 重置狀態
              setNote("");
              setCallOutcome("connected");
              setServiceType("normal");
              setNextContactDate("");
              setInputKey(prev => prev + 1);
            }}
            disabled={callOutcome !== 'connected' && !nextContactDate.trim()}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              callOutcome !== 'connected' && !nextContactDate.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {callOutcome === 'connected' ? '確定完成' : '重新排程'}
          </button>
        </div>
      </div>
    </div>
  );
}