# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-12-19

### Added
- **初始版本發布**
  - 完整的客戶關懷管理系統
  - Salesforce Lightning 風格的 UI 設計
  - 移動優先的響應式設計

### Features
- **主控台 (Dashboard)**
  - 三階段任務分組：新手關懷、首課關懷、一般關懷
  - 嚴格的日期過濾（只顯示今日及逾期任務）
  - F-Pattern 佈局設計
  - 點擊導航到客戶詳情頁

- **合約管理**
  - 新增合約表單，包含 CRM 欄位（email, lineId, parentName, product）
  - 動態日期依賴關係
  - 表單驗證和錯誤處理

- **客戶詳情頁**
  - 完整的客戶聯絡資訊
  - 整合關懷歷史時間軸
  - 視覺化任務狀態指示器
  - 垂直時間軸設計，包含日期徽章和狀態點

- **自動任務生成系統**
  - Firebase Cloud Functions 觸發器
  - 每個合約自動生成 26 個任務（2個關懷任務 + 24個月度任務）
  - 資料反正規化策略，避免 N+1 查詢問題

### Technical Implementation
- **前端**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **後端**: Firebase (Firestore, Cloud Functions v2)
- **部署**: Vercel (前端) + Firebase (雲函數)
- **UI 組件**: Lucide React 圖標
- **狀態管理**: React Context + Hooks

### Database Schema
- **contracts**: 核心客戶資料，包含 noviceDate 和 firstLessonDate 手動輸入欄位
- **tasks**: 自動生成的關懷任務，包含反正規化欄位（clientName, parentName, product）
- **taskLogs**: 任務執行記錄

### Key Architectural Decisions
- **資料策略**: 實施反正規化模式，在 Task 文檔中儲存 clientName, parentName, product
- **日期邏輯**: 使用合約中的手動 noviceDate 和 firstLessonDate，而非計算的 T+0 日期
- **UI 模式**: 採用 Salesforce Lightning 設計系統，slate-50 背景，白色卡片，彩色左邊框
- **導航模式**: 實施點擊導航模式（非直接撥號）從控制台卡片到客戶詳情頁

### Deployment Configuration
- **成功部署到 Vercel**（前端）和 Firebase（雲函數）
- **環境變數配置**: 正確的 Firebase 配置
- **Next.js 配置**: 啟用 Turbopack 並排除 /functions 目錄

---

## Future Releases

### Planned Features
- 任務完成狀態更新
- 客戶搜索和篩選功能
- 報表和分析功能
- 通知系統
- 批量操作功能

### Technical Improvements
- 性能優化
- 離線支援
- 更多的測試覆蓋率
- 國際化支援