"use client";

import { useState } from "react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, note: string) => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onConfirm,
}: CreateTaskModalProps) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!date.trim()) return;
    
    onConfirm(date, note);
    setDate("");
    setNote("");
  };

  const handleClose = () => {
    onClose();
    setDate("");
    setNote("");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            新增一般關懷任務
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Date Input */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              預計執行日期
            </h3>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
              required
            />
          </div>

          {/* Note Input */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              任務備註 (選填)
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white text-gray-900"
              placeholder="例如：客戶來電詢問續約..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!date.trim()}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              !date.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            確認建立
          </button>
        </div>
      </div>
    </div>
  );
}