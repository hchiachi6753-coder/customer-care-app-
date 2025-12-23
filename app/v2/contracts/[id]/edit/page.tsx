"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

export default function V2EditContract() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isEditingContact, setIsEditingContact] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      const docSnap = await getDoc(doc(db, "contracts", id as string));
      if (docSnap.exists()) {
        const data = docSnap.data();
        // 確保電話欄位是陣列，方便增加多組電話
        setFormData({
          ...data,
          phones: data.phones || [data.phone || ""], 
        });
      }
      
      // 獲取關懷歷程記錄
      const logsQuery = query(
        collection(db, "taskLogs"),
        where("contractId", "==", id as string),
        orderBy("createdAt", "desc")
      );
      const logsSnap = await getDocs(logsQuery);
      setLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setLoading(false);
    };
    fetchContract();
  }, [id]);

  const handleUpdate = async () => {
    try {
      await updateDoc(doc(db, "contracts", id as string), {
        ...formData,
        phone: formData.phones[0], // 同步更新主電話欄位
      });
      alert("資料已更新！");
      router.back();
    } catch (e) { console.error(e); }
  };

  if (loading || !formData) return <div className="p-8">載入中...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 mb-6 font-bold">
          <ArrowLeft size={20} /> 返回
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">客戶檔案管理</h1>

        <div className="space-y-6">
          {/* 頂部整合板塊：客戶核心名片 */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-1">{formData.studentName}</h2>
                <p className="text-gray-400 font-bold">家長姓名：{formData.parentName}</p>
              </div>
              <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full font-black text-xs">
                {formData.product || formData.productName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-100">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">合約性質</label>
                <p className="font-bold text-gray-700">{formData.contractType}</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">合約起訖</label>
                <p className="font-bold text-gray-700">{formData.startDate?.toDate?.()?.toLocaleDateString() || formData.startDate} ~ {formData.endDate || '未設定'}</p>
              </div>
            </div>

            {/* 聯繫資訊區塊 */}
            <div className="bg-blue-50/50 p-6 rounded-[30px] space-y-4">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-black text-blue-500 uppercase tracking-wider">聯繫資訊 (更新)</span>
                <button 
                  onClick={() => setIsEditingContact(!isEditingContact)}
                  className="text-xs font-black bg-white text-blue-600 px-4 py-1.5 rounded-full shadow-sm border border-blue-100 active:scale-95 transition-all"
                >
                  {isEditingContact ? "💾 鎖定並儲存" : "✏️ 點選編輯"}
                </button>
              </div>

              {/* 電話欄位 - 瘦身 50% */}
              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 mb-1 ml-4">聯繫電話</label>
                <input 
                  type="tel"
                  disabled={!isEditingContact}
                  className={`w-full h-12 px-5 rounded-2xl border-2 font-bold transition-all ${
                    isEditingContact 
                      ? 'bg-white border-blue-400 text-gray-900 shadow-md' 
                      : 'bg-gray-50 border-transparent text-gray-500 cursor-not-allowed'
                  }`}
                  value={formData.phones[0] || ''}
                  placeholder="請輸入電話"
                  onChange={e => {
                    const newPhones = [...formData.phones];
                    newPhones[0] = e.target.value;
                    setFormData({...formData, phones: newPhones});
                  }}
                />
              </div>

              {/* Email 欄位 - 瘦身 50% */}
              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 mb-1 ml-4">Email 地址</label>
                <input 
                  type="email"
                  disabled={!isEditingContact}
                  className={`w-full h-12 px-5 rounded-2xl border-2 font-bold transition-all ${
                    isEditingContact 
                      ? 'bg-white border-blue-400 text-gray-900 shadow-md' 
                      : 'bg-gray-50 border-transparent text-gray-500 cursor-not-allowed'
                  }`}
                  value={formData.email || ''}
                  placeholder="請輸入 Email"
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleUpdate}
          className="w-full mt-8 bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Save size={20}/> 儲存所有變更
        </button>

        {/* 在客戶資料區塊下方，直接加入這個時間軸區塊 */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
            <h3 className="text-xl font-black text-gray-900">關懷歷程時間軸</h3>
          </div>

          <div className="relative ml-4 border-l-2 border-orange-100 pl-8 pb-10 space-y-8">
            {logs.length === 0 ? (
              <p className="text-gray-400 font-bold italic">尚無歷史紀錄...</p>
            ) : (
              logs.map((log, index) => (
                <div key={log.id} className="relative">
                  {/* 時間軸圓點 */}
                  <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm bg-orange-500"></div>
                  
                  <div className="bg-white p-6 rounded-[30px] shadow-sm border border-orange-50 flex flex-col gap-3 transition-all hover:shadow-md">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                          log.contactStatus === "成功聯繫" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                        }`}>
                          {log.contactStatus}
                        </span>
                        {log.feedbackType === "issue" && (
                          <span className="text-[10px] font-black px-3 py-1 rounded-full bg-red-100 text-red-600">
                            問題追蹤：{log.issueCategory}
                          </span>
                        )}
                      </div>
                      <time className="text-xs font-bold text-gray-400">
                        {log.createdAt?.toDate().toLocaleString()}
                      </time>
                    </div>

                    <p className="text-gray-700 font-bold leading-relaxed">
                      {log.content || "（未填寫詳細內容）"}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                          {log.operatorName?.[0] || "系"}
                        </div>
                        <span className="text-xs font-bold text-gray-400">
                          紀錄者：{log.operatorName}
                        </span>
                      </div>
                      
                      {/* 高續約/MGM 標籤回顯 */}
                      <div className="flex gap-1">
                        {log.isHighRenewal && <span className="text-[10px] text-emerald-600 font-black italic">#高續約意願</span>}
                        {log.isHighMGM && <span className="text-[10px] text-purple-600 font-black italic">#高MGM潛力</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}