# Customer Care App

客戶關懷管理系統 - 基於 Next.js 和 Firebase 的 CRM 應用程式

## 項目概述

這是一個專為教育機構設計的客戶關懷管理系統，採用 Salesforce Lightning 風格的 UI 設計，提供完整的客戶生命週期管理功能。

### 核心功能
- **智能任務生成**: 每個合約自動生成 26 個關懷任務（2個關懷任務 + 24個月度任務）
- **三階段關懷**: 新手關懷、首課關懷、月度關懷的完整流程
- **客戶詳情頁**: 整合關懷歷史時間軸的完整客戶檔案
- **移動優先設計**: 響應式界面，支持各種設備

### 技術架構
- **前端**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **後端**: Firebase (Firestore + Cloud Functions)
- **部署**: Vercel (前端) + Firebase (雲函數)
- **UI 風格**: Salesforce Lightning 設計系統

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

同時啟動 Firebase 模擬器（開發環境）：
```bash
cd functions
npm run serve
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 開發指南

### 主要頁面
- `app/page.tsx` - 主控台（今日待辦任務）
- `app/contracts/new/page.tsx` - 新增合約表單
- `app/customers/[id]/page.tsx` - 客戶詳情頁

### 資料庫設計
- **合約 (contracts)**: 包含客戶基本資料和關鍵日期
- **任務 (tasks)**: 自動生成的關懷任務，包含反正規化資料
- **任務記錄 (taskLogs)**: 任務執行記錄

### 關鍵特性
- **資料反正規化**: 任務中儲存客戶姓名、家長姓名、產品資訊以避免 N+1 查詢
- **日期邏輯**: 使用手動輸入的 noviceDate 和 firstLessonDate
- **UI 模式**: 採用 Salesforce Lightning 設計系統

## 部署

### 前端部署 (Vercel)
```bash
# 部署到 Vercel
vercel --prod
```

### 後端部署 (Firebase)
```bash
# 部署雲函數
cd functions
npm run deploy
```

### 環境變數設定
確保在 Vercel 中設定以下環境變數：
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 項目結構
```
├── app/                 # Next.js App Router 頁面
│   ├── contracts/       # 合約管理
│   ├── customers/       # 客戶詳情
│   └── page.tsx        # 主控台
├── functions/          # Firebase Cloud Functions
├── lib/               # 共用工具函數
├── types/             # TypeScript 類型定義
└── TECH_SPEC.md       # 技術規格文檔
```

## 更多資源

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
