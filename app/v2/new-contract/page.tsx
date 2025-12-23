"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function V2NewContract() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    parentName: "",
    studentName: "",
    phone: "",
    email: "",
    lineId: "",
    contractType: "新約",
    product: "升級包",
    paymentMethod: "一次付清",
    source: "行銷單",
    startDate: new Date().toISOString().split("T")[0],
    noviceDate: new Date().toISOString().split("T")[0],
    firstLessonDate: "",
    note: "",
    gender: "男" // 預設一個值，避免空白
  });

  useEffect(() => {
    const start = new Date(formData.startDate);
    const defaultFirst = new Date(start);
    defaultFirst.setDate(start.getDate() + 7);
    setFormData(prev => ({ ...prev, firstLessonDate: defaultFirst.toISOString().split("T")[0] }));
  }, [formData.startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      alert("權限尚未載入（或資料庫無此帳號文件），請稍候再試");
      return;
    }
    setLoading(true);

    try {
      const start = new Date(formData.startDate);

      // 1. 寫入合約 (包含所有新定義欄位)
      const contractRef = await addDoc(collection(db, "contracts"), {
        ...formData,
        startDate: Timestamp.fromDate(start),
        ownerId: user.uid,
        teamId: profile.teamId || "main_team",
        createdAt: serverTimestamp(),
        status: "active"
      });

      // 2. 依照規格計算 8 筆任務
      const tasks = [
        { type: "newbie", date: new Date(formData.noviceDate), label: "新手關懷" },
        { type: "first_class", date: new Date(formData.firstLessonDate), label: "首課關懷" },
        { type: "system", date: new Date(start.getTime() + 20 * 24 * 60 * 60 * 1000), label: "系統推播 A" },
        { type: "system", date: new Date(start.getTime() + 40 * 24 * 60 * 60 * 1000), label: "系統推播 B" },
        { type: "system", date: new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000), label: "系統推播 C" },
        { type: "system", date: new Date(start.getTime() + 120 * 24 * 60 * 60 * 1000), label: "系統推播 D" },
        { type: "system", date: new Date(start.getTime() + 180 * 24 * 60 * 60 * 1000), label: "系統推播 E" },
        { type: "system", date: new Date(start.getTime() + 240 * 24 * 60 * 60 * 1000), label: "系統推播 F" },
      ];

      await Promise.all(tasks.map(task =>
        addDoc(collection(db, "tasks"), {
          contractId: contractRef.id,
          taskType: task.type,
          title: task.label,
          dueDate: Timestamp.fromDate(task.date),
          status: "pending",
          ownerId: user.uid,
          teamId: profile.teamId || "main_team",
          clientName: formData.studentName,
          createdAt: serverTimestamp(),
        })
      ));

      alert("成功建立合約與 8 筆關懷任務！");
      router.push("/v2");
    } catch (error) {
      console.error(error);
      alert("儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto my-10 bg-white rounded-2xl shadow-2xl border border-gray-200">
      <h1 className="text-2xl font-bold mb-8 text-gray-900 border-b pb-4">新增成交合約 (V2)</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 基本資料 */}
        <div className="space-y-4">
          <h2 className="font-semibold text-blue-700">基本資料</h2>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">家長姓名 *</label>
            <input type="text" required className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 outline-none"
              value={formData.parentName} onChange={e => setFormData({ ...formData, parentName: e.target.value })} />
          </div>
          <div className="flex gap-4">
            <div className="flex-[2]">
              <label className="block text-sm font-bold text-gray-900 mb-2">學生姓名</label>
              <input
                required
                placeholder="請輸入姓名"
                className="w-full p-4 border-2 border-gray-400 rounded-2xl text-gray-900 font-bold focus:border-blue-600 outline-none"
                value={formData.studentName}
                onChange={e => setFormData({ ...formData, studentName: e.target.value })}
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-900 mb-2">性別</label>
              <div className="flex bg-gray-200 p-1 rounded-2xl h-[60px]">
                {['男', '女'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 rounded-xl font-black transition-all ${formData.gender === g
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-500'
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">聯絡電話 *</label>
            <input type="text" required className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 outline-none"
              value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-900 mb-1">Email</label>
              <input type="email" className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 outline-none"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-900 mb-1">Line ID</label>
              <input type="text" className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 outline-none"
                value={formData.lineId} onChange={e => setFormData({ ...formData, lineId: e.target.value })} />
            </div>
          </div>
        </div>

        {/* 合約細節 */}
        <div className="space-y-4">
          <h2 className="font-semibold text-blue-700">合約資訊</h2>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">合約性質</label>
            <select className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900"
              value={formData.contractType} onChange={e => setFormData({ ...formData, contractType: e.target.value })}>
              <option>新約</option><option>續約</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">購買產品</label>
            <select className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900"
              value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })}>
              <option>升級包</option><option>勤學包</option><option>大拍檔</option><option>小拍檔</option><option>升級包副約</option><option>大排檔副約</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">來源</label>
            <select className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900"
              value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
              <option>行銷單</option><option>MGM(舊生介紹)</option><option>業務自建</option><option>結案單</option>
            </select>
          </div>
        </div>

        {/* 日期設定 (全寬) */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">合約起始日 (T=0)</label>
            <input type="date" required className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900"
              value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">新手關懷日期</label>
            <input type="date" required className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900"
              value={formData.noviceDate} onChange={e => setFormData({ ...formData, noviceDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">首課關懷 (T+7)</label>
            <input type="date" required className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white"
              value={formData.firstLessonDate} onChange={e => setFormData({ ...formData, firstLessonDate: e.target.value })} />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-900 mb-1">備註</label>
          <textarea className="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-900" rows={2}
            value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} />
        </div>

        <button type="submit" disabled={loading} className="md:col-span-2 w-full bg-blue-700 text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all shadow-lg disabled:bg-gray-400">
          {loading ? "正在處理中，請稍候..." : "確認新增合約並產生 8 筆關懷任務"}
        </button>
      </form>
    </div>
  );
}