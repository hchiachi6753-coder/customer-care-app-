"use client";

import { useForm } from "react-hook-form";
import { addDoc, collection, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ContractType } from "@/types/schema";
import { useAuth } from "@/contexts/AuthContext";

interface FormData {
  parentName: string;
  studentName: string;
  phone: string;
  email?: string;
  lineId?: string;
  type: ContractType;
  product: string;
  paymentMethod: string;
  source?: string;
  startDate: string;
  noviceDate: string;
  firstLessonDate: string;
  note?: string;
}

export default function NewContractPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, profile } = useAuth();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: "new",
      product: "勤學包",
      paymentMethod: "一次付清",
      startDate: new Date().toISOString().split('T')[0],
      noviceDate: new Date().toISOString().split('T')[0],
      firstLessonDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
      })()
    }
  });

  const watchType = watch("type");
  const watchStartDate = watch("startDate");

  // Auto-update novice and first lesson dates when start date changes
  useEffect(() => {
    if (watchStartDate) {
      setValue("noviceDate", watchStartDate);
      const startDate = new Date(watchStartDate);
      const firstLessonDate = new Date(startDate);
      firstLessonDate.setDate(firstLessonDate.getDate() + 7);
      setValue("firstLessonDate", firstLessonDate.toISOString().split('T')[0]);
    }
  }, [watchStartDate, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!user) {
      alert("請先登入");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 準備合約資料
      const contractData: any = {
        contractNo: `C-${Date.now()}`,
        agentId: user.uid,
        parentName: data.parentName,
        studentName: data.studentName,
        phone: data.phone,
        email: data.email || null,
        lineId: data.lineId || null,
        type: data.type,
        product: data.product,
        paymentMethod: data.paymentMethod,
        source: data.source || null,
        productCycle: 24,
        startDate: Timestamp.fromDate(new Date(data.startDate)),
        noviceDate: Timestamp.fromDate(new Date(data.noviceDate)),
        firstLessonDate: Timestamp.fromDate(new Date(data.firstLessonDate)),
        note: data.note || null,
        status: "active",
        ownerId: user.uid,
        teamId: profile?.teamId || "main_team",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 2. 寫入「合約」
      const docRef = await addDoc(collection(db, "contracts"), contractData);
      console.log("合約建立成功，ID:", docRef.id);

      // 🛑 3. 自動產生「待辦任務 (tasks)」

      // 任務 A: 新手關懷
      await addDoc(collection(db, "tasks"), {
        title: `新手關懷 - ${data.studentName}`,
        type: "novice_care",
        dueDate: Timestamp.fromDate(new Date(data.noviceDate)),
        status: "pending",
        contractId: docRef.id,
        parentName: data.parentName,
        phone: data.phone,
        ownerId: user.uid,
        teamId: profile?.teamId || "main_team",
        createdAt: serverTimestamp(),
      });

      // 任務 B: 首課關懷
      await addDoc(collection(db, "tasks"), {
        title: `首課關懷 - ${data.studentName}`,
        type: "first_lesson",
        dueDate: Timestamp.fromDate(new Date(data.firstLessonDate)),
        status: "pending",
        contractId: docRef.id,
        parentName: data.parentName,
        phone: data.phone,
        ownerId: user.uid,
        teamId: profile?.teamId || "main_team",
        createdAt: serverTimestamp(),
      });

      alert("成功建立合約，並已自動加入待辦事項！");
      router.push("/");

    } catch (error: any) {
      console.error("Firebase error:", error);
      alert(`Error: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">新增成交合約</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">家長姓名 *</label>
            <input {...register("parentName", { required: "請輸入家長姓名" })} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" placeholder="請輸入家長姓名" />
            {errors.parentName && <p className="text-red-500 text-sm mt-1">{errors.parentName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">學員姓名 *</label>
            <input {...register("studentName", { required: "請輸入學員姓名" })} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" placeholder="請輸入學員姓名" />
            {errors.studentName && <p className="text-red-500 text-sm mt-1">{errors.studentName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話 *</label>
            <input type="tel" {...register("phone", { required: "請輸入聯絡電話" })} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" placeholder="09xx-xxx-xxx" />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" {...register("email")} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" placeholder="example@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Line ID</label>
            <input type="text" {...register("lineId")} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" placeholder="Line ID" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">合約性質</label>
            <select {...register("type")} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none">
              <option value="new">新約</option>
              <option value="renew">續約</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">購買產品</label>
            <select {...register("product")} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none">
              <option value="升級包">升級包</option>
              <option value="勤學包">勤學包</option>
              <option value="大拍檔">大拍檔</option>
              <option value="小拍檔">小拍檔</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">付款方式</label>
            <select {...register("paymentMethod")} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none">
              <option value="一次付清">一次付清</option>
              <option value="分期付款">分期付款</option>
            </select>
          </div>

          {watchType === "new" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">來源</label>
              <select {...register("source")} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none">
                <option value="">請選擇來源</option>
                <option value="行銷單">行銷單</option>
                <option value="MGM(舊生介紹)">MGM(舊生介紹)</option>
                <option value="業務自建">業務自建</option>
                <option value="結案單">結案單</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">合約起始日 (T=0) *</label>
            <input type="date" {...register("startDate", { required: "請選擇合約起始日" })} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新手關懷日期 *</label>
            <input type="date" {...register("noviceDate", { required: "請選擇新手關懷日期" })} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">首課關懷日期 *</label>
            <input type="date" {...register("firstLessonDate", { required: "請選擇首課關懷日期" })} className="h-12 w-full px-4 bg-white border border-gray-300 rounded-lg outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea {...register("note")} rows={3} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg outline-none resize-none" placeholder="MGM介紹人資訊或其他詳細說明" />
          </div>

          <button type="submit" disabled={isLoading} className="h-14 w-full bg-blue-600 text-white font-bold px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-6">
            {isLoading ? "傳送中..." : "確認送出"}
          </button>
        </form>
      </div>
    </div>
  );
}