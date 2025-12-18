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

## [1.1.0] - 2024-12-20

### Added
- **任務完成模態框 (TaskCompletionModal)**
  - 動態通話狀態選擇（成功聯繫、未接聽、忙線中）
  - 智能日期邏輯：成功時選填，失敗時必填
  - 紅色警示樣式用於重新排程模式
  - 自定義日期選擇器解決瀏覽器兼容性問題
  - **行程預覽卡片**：顯示「下一次系統排程」和「手動預約任務」
  - **智慧過濾**：預覽列表自動截斷到最近的系統任務
  - **欄位簡化**：移除插入行程開關，改為常駐日期欄位
  - **動態提示**：根據通話狀態改變日期欄位標題

### Enhanced
- **任務處理邏輯優化**
  - 實施嚴格的結果邏輯：完成 vs 重新排程
  - 成功聯繫：標記完成 + 可選建立新任務
  - 失敗聯繫：保持開啟 + 重新排程到新日期
  - 日期格式標準化（統一使用斜線格式）

- **UX 改善**
  - 解決「隱形任務」bug（日期格式問題）
  - 成功聯繫時日期欄位真正空白，避免使用者困惑
  - 動態標籤和樣式根據通話結果調整
  - 強制重新渲染機制確保狀態正確更新

### Fixed
- **日期處理 Bug 修正**
  - 修正重新排程後任務消失的問題
  - 確保備註和通話記錄正確儲存
  - 解決瀏覽器日期輸入框無法清空的問題
  - 實施自定義日期選擇器避免預設值顯示
  - **日期格式統一**：修復 HTML (YYYY-MM-DD) 與 Firestore (YYYY/MM/DD) 格式不符問題
  - **系統任務識別**：增強識別邏輯，檢查標題關鍵字（月度、首課、新手）

### Technical Improvements
- **狀態管理優化**
  - 移除衝突的 useEffect 邏輯
  - 實施專用的 handleOutcomeChange 處理函數
  - 使用 key 屬性強制組件重新渲染
  - 改善模態框重置邏輯

---

## [1.2.0] - 2024-12-20

### Added
- **四欄位看板佈局 (4-Column Kanban Board)**
  - 將原本的3欄改為4欄：新手關懷、首課關懷、月度關懷、一般關懷
  - 明確區分系統生成任務 vs 手動建立任務
  - 新增月度關懷欄位（紫色主題 + 🗓️ 圖標）
  - 一般關懷改為手動任務專用（橙色主題 + 📋 圖標）

- **客戶列表時間軸分組 (Timeline Grouped Client List)**
  - 按合約起始日期分組顯示（YYYY年 MM月）
  - 分組標題顯示客戶數量統計
  - 未設定日期的客戶歸類到底部
  - 單行緊湊佈局：學員姓名 + (家長：姓名) + 產品狀態 + 日期

### Enhanced
- **視覺優化與排序邏輯**
  - 客戶列表標題加深背景色（slate-200）並增大字體
  - 客戶行高減少30%，使用邊框分隔取代間距
  - 實施二級排序：主要按日期，次要按建檔時間
  - 客戶列表：最新合約優先，同日內最晚建檔優先
  - 關懷歷程：最早任務優先，同日內系統任務優先

- **關懷歷程完整性修復**
  - 確保手動建立的一般關懷任務顯示在時間軸中
  - 新增一般關懷（手動）類型：📞 圖標 + 橙色主題
  - 區分系統月度關懷 vs 手動一般關懷
  - 完整的任務類型支援和視覺識別

### Fixed
- **任務分類邏輯優化**
  - 修正月度關懷和一般關懷的過濾條件
  - 使用 `isSystemGenerated` 標記區分任務來源
  - 確保所有任務類型都能正確顯示和分類

### UI/UX Improvements
- **緊湊化設計**
  - 客戶列表採用單行佈局，資訊密度提升
  - 優化間距和視覺層次，提升掃描效率
  - 響應式文字截斷，避免版面破壞

### Technical Enhancements
- **穩定排序算法**
  - 實施多層級排序邏輯避免排序不穩定
  - 處理邊界情況（缺失日期、建檔時間）
  - 確保業務邏輯一致性（系統任務優先於手動任務）

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