"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where, orderBy, onSnapshot, updateDoc, addDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Users, UserPlus, Phone, Mail, User } from "lucide-react";

// Helper for sorting logs
const getTime = (item: any) => {
  if (item.dueDate) return item.dueDate.seconds;
  if (item.completedAt) return item.completedAt.seconds;
  if (item.createdAt) return item.createdAt.seconds;
  return 0;
};

export default function V2ContractDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHistoryView = searchParams.get('view') === 'history';

  const [contract, setContract] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Inline Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    lineId: ""
  });

  // Modal States
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showMGMModal, setShowMGMModal] = useState(false);

  // New Item States
  const [newRelation, setNewRelation] = useState({ relation: "", name: "", phone: "", email: "" });
  const [newMGM, setNewMGM] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    if (!id) return;
    const unsubContract = onSnapshot(doc(db, "contracts", id as string), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setContract({ id: docSnap.id, ...data });
        // Sync items if not editing
        if (!isEditing) {
          setFormData({
            phone: data.phone || "",
            email: data.email || "",
            lineId: data.lineId || ""
          });
        }
      }
    });

    // Fetch Tasks & Care Logs logic (Preserved)
    const qTasks = query(collection(db, "tasks"), where("contractId", "==", id));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const taskLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data(), source: 'task' }));

      const qLogs = query(collection(db, `contracts/${id}/careLogs`), orderBy("createdAt", "desc"));
      getDocs(qLogs).then(snap => {
        const directLogs = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'log' }));
        setLogs([...taskLogs, ...directLogs]);
      });
    });

    return () => {
      unsubContract();
      unsubTasks();
    };
  }, [id, isEditing]);

  // Sorted Logs (Ascending: Past -> Future)
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => getTime(a) - getTime(b));
  }, [logs]);

  const handleToggleEdit = async () => {
    if (isEditing) {
      try {
        await updateDoc(doc(db, "contracts", id as string), {
          phone: formData.phone,
          email: formData.email,
          lineId: formData.lineId
        });
      } catch (e) {
        console.error("Update failed:", e);
        alert("儲存失敗");
        return;
      }
    }
    setIsEditing(!isEditing);
  };

  // Add Relation Logic
  const handleAddRelation = async () => {
    if (!newRelation.name) return alert("請輸入姓名");
    const currentRelations = contract.relations || [];
    const updatedRelations = [...currentRelations, { ...newRelation, id: Date.now() }];

    try {
      await updateDoc(doc(db, "contracts", id as string), { relations: updatedRelations });
      setNewRelation({ relation: "", name: "", phone: "", email: "" });
      setShowRelationModal(false);
    } catch (e) {
      console.error(e);
      alert("新增失敗");
    }
  };

  // Add MGM Logic
  const handleAddMGM = async () => {
    if (!newMGM.name) return alert("請輸入姓名");
    const currentMGM = contract.mgm || [];
    const updatedMGM = [...currentMGM, { ...newMGM, id: Date.now() }];

    try {
      await updateDoc(doc(db, "contracts", id as string), { mgm: updatedMGM });
      setNewMGM({ name: "", phone: "", email: "" });
      setShowMGMModal(false);
    } catch (e) {
      console.error(e);
      alert("新增失敗");
    }
  };

  if (!contract) return <div className="p-10 text-center font-bold text-gray-400">載入中...</div>;

  return (
    <div className="p-4 pb-32 space-y-6 max-w-lg mx-auto">
      {/* 返回按鈕 */}
      <button
        onClick={() => router.push("/v2/customers")}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-800 mb-2 transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> 返回列表
      </button>

      {/* 判斷顯示模式：如果有 ?view=history 則只顯示歷程頭像，隱藏詳情卡片 */}
      {isHistoryView ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{contract.studentName}</h2>
            <p className="text-sm font-bold text-gray-400">關懷歷程紀錄</p>
          </div>
          <LinkToDetail id={contract.id} />
        </div>
      ) : (
        /* 客戶詳情完整卡片 (僅在非歷程模式顯示) */
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-1">{contract.studentName}</h2>
              <p className="text-gray-400 font-bold text-sm">家長：{contract.parentName}</p>
            </div>
            <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full font-black text-[10px]">
              {contract.productName || contract.product}
            </span>
          </div>

          {/* 合約開始日期顯示 */}
          <div className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl inline-block">
            合約開始：{contract.startDate?.toDate ? contract.startDate.toDate().toLocaleDateString() : (contract.startDate || "未設定")}
          </div>

          {/* 聯繫資訊 */}
          <div className="bg-blue-50/50 p-5 rounded-[30px] space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">聯繫資訊</span>
              <button
                onClick={handleToggleEdit}
                className="text-[10px] font-black bg-white text-blue-600 px-4 py-1.5 rounded-full shadow-sm border border-blue-100 active:scale-95 transition-all"
              >
                {isEditing ? "💾 儲存" : "✏️ 編輯"}
              </button>
            </div>

            <input
              disabled={!isEditing}
              className={`w-full h-11 px-5 rounded-xl border-2 font-bold text-sm transition-all ${isEditing ? 'bg-white border-blue-400 text-gray-900 shadow-md' : 'bg-transparent border-transparent text-gray-900'}`}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="電話"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">Email</label>
                <input
                  disabled={!isEditing}
                  className={`w-full h-11 px-5 rounded-xl border-2 font-bold text-sm transition-all ${isEditing ? 'bg-white border-blue-400 text-gray-900 shadow-md' : 'bg-transparent border-transparent text-gray-900'}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">Line ID</label>
                <input
                  disabled={!isEditing}
                  className={`w-full h-11 px-5 rounded-xl border-2 font-bold text-sm transition-all ${isEditing ? 'bg-white border-blue-400 text-gray-900 shadow-md' : 'bg-transparent border-transparent text-gray-900'}`}
                  value={formData.lineId}
                  onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                  placeholder="Line ID"
                />
              </div>
            </div>
          </div>

          {/* 1. 重要關係人 (Relations) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">重要關係人</span>
              <button onClick={() => setShowRelationModal(true)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                + 新增關係人
              </button>
            </div>

            <div className="space-y-2">
              {contract.relations && contract.relations.length > 0 ? (
                contract.relations.map((rel: any, idx: number) => (
                  <div key={idx} className="bg-gray-50/80 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md">{rel.relation}</span>
                        <span className="font-bold text-gray-900 text-sm">{rel.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-medium flex gap-3">
                        {rel.phone && <span className="flex items-center gap-1"><Phone size={10} /> {rel.phone}</span>}
                        {rel.email && <span className="flex items-center gap-1"><Mail size={10} /> {rel.email}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 font-bold">尚無關係人資料</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. MGM 推薦名單 */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center ml-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MGM 推薦名單</span>
              <button onClick={() => setShowMGMModal(true)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                + 新增推薦人
              </button>
            </div>

            <div className="space-y-2">
              {contract.mgm && contract.mgm.length > 0 ? (
                contract.mgm.map((m: any, idx: number) => (
                  <div key={idx} className="bg-blue-50/30 p-4 rounded-2xl flex items-center justify-between border border-blue-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-md">推薦</span>
                        <span className="font-bold text-gray-900 text-sm">{m.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-medium flex gap-3">
                        {m.phone && <span className="flex items-center gap-1"><Phone size={10} /> {m.phone}</span>}
                        {m.email && <span className="flex items-center gap-1"><Mail size={10} /> {m.email}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 font-bold">尚無推薦名單</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 關懷歷程 Timeline */}
      <div className="space-y-4">
        {/* 如果是歷程模式，標題可以省略或調整 */}
        {!isHistoryView && <h3 className="text-lg font-bold text-gray-900 ml-4">關懷歷程</h3>}

        <div className="relative pl-8 border-l-2 border-gray-100 ml-4 space-y-4">
          {sortedLogs.map((log) => {
            // ... Timeline logic ...
            let statusColor = "bg-gray-200";
            let statusLabel = "未完成";
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            let isOverdue = false;

            const dueDate = log.dueDate?.toDate ? log.dueDate.toDate() : null;
            if (dueDate) dueDate.setHours(0, 0, 0, 0);

            if (log.status === "completed" || log.completedAt) {
              if (dueDate && log.completedAt && log.completedAt.toDate() > dueDate) {
                statusColor = "bg-orange-400";
                statusLabel = "補登完成";
              } else {
                statusColor = "bg-green-500";
                statusLabel = "準時完成";
              }
            } else {
              if (dueDate && now > dueDate) {
                statusColor = "bg-red-500";
                statusLabel = "已逾期";
                isOverdue = true;
              } else {
                statusColor = "bg-blue-400";
                statusLabel = "待處理";
              }
            }

            return (
              <div key={log.id} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[39px] top-2 w-5 h-5 rounded-full border-4 border-white shadow-sm ${statusColor}`}></div>

                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-800 text-base">{log.title || "關懷紀錄"}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {log.dueDate ? new Date(log.dueDate.toDate()).toLocaleDateString() : "無日期"}
                        {isOverdue && <span className="text-red-500 font-bold ml-1">(逾期)</span>}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg text-white ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {log.note && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-xl mt-1 leading-relaxed">
                      {log.note}
                    </p>
                  )}
                  {log.completedAt && (
                    <div className="text-[10px] text-gray-300 font-medium text-right mt-1">
                      完成於: {new Date(log.completedAt.toDate()).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Relation Modal */}
      {showRelationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900">新增重要關係人</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">關係 (例: 弟弟, 阿姨)</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newRelation.relation} onChange={e => setNewRelation({ ...newRelation, relation: e.target.value })} placeholder="請輸入關係" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">姓名</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newRelation.name} onChange={e => setNewRelation({ ...newRelation, name: e.target.value })} placeholder="請輸入姓名" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">電話</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newRelation.phone} onChange={e => setNewRelation({ ...newRelation, phone: e.target.value })} placeholder="請輸入電話" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newRelation.email} onChange={e => setNewRelation({ ...newRelation, email: e.target.value })} placeholder="請輸入 Email" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRelationModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold">取消</button>
              <button onClick={handleAddRelation} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">確認新增</button>
            </div>
          </div>
        </div>
      )}

      {/* Add MGM Modal */}
      {showMGMModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900">新增 MGM 推薦人</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">被推薦人姓名</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newMGM.name} onChange={e => setNewMGM({ ...newMGM, name: e.target.value })} placeholder="請輸入姓名" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">電話</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newMGM.phone} onChange={e => setNewMGM({ ...newMGM, phone: e.target.value })} placeholder="請輸入電話" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  value={newMGM.email} onChange={e => setNewMGM({ ...newMGM, email: e.target.value })} placeholder="請輸入 Email" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowMGMModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold">取消</button>
              <button onClick={handleAddMGM} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">確認新增</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// 簡單的 Link 組件，避免在 JSX 裡寫太長的邏輯
function LinkToDetail({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(`/v2/contracts/${id}`)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
      查看完整資料 →
    </button>
  );
}