# Project Technical Specifications & Rules

## 1. Core Tech Stack (Strict)
- **Framework:** Next.js 14+ (App Router). Note: Configured for Next.js 16+ Turbopack.
- **Language:** TypeScript (.ts, .tsx).
- **Styling:** Tailwind CSS (Use utility classes, avoid external CSS files).
- **Icons:** Lucide React.
- **Backend:** Google Firebase (Firestore, Auth, Functions v2).
- **Deployment:** Vercel (Frontend), Firebase Cloud Functions (Backend).
- **State Management:** React Context + Hooks.

## 2. Coding Conventions
- **Components:** Use Functional Components with `interface Props`.
- **Typing:** STRICT TypeScript mode. No `any`. Always import types from `@/types/schema`.
- **Localization & Data Storage:**
  - **UI Display:** Traditional Chinese (Taiwan).
  - **Internal Data (Enum/Types):** MUST use English keys (e.g., `type: 'new'`, `status: 'pending'`).
  - **Mapping:** Handle mapping between English values and Chinese labels in the frontend component.
- **UI Consistency:**
  - Inputs/Selects: `h-12`, `px-4`, `rounded-lg`, `border-gray-300`, `text-gray-900`, `bg-white`.
  - Buttons: `h-14`, `rounded-lg`, `font-bold`.

## 3. Database Schema (Firestore)
- Refer to `types/schema.ts` for the Single Source of Truth.
- **Collections:**
  - `users`: Agents and Managers.
  - `contracts`: Core client data.
    - **New Fields:** `noviceDate` (Timestamp), `firstLessonDate` (Timestamp) - *Manual input by agent*.
    - **Crucial Fields:** `product`, `paymentMethod`, `source`, `note`, `studentName`, `parentName`.
  - `tasks`: Generated automatically via Cloud Functions.
    - **Denormalized Fields (Crucial):** `clientName`, `parentName`, `product`. *Stored directly in Task to avoid N+1 queries on Dashboard.*
    - **Fields:** `contractId`, `taskType`, `status`, `dueDate`.

## 4. Business Logic & Task Generation (Cloud Functions)
- **Trigger:** `onContractCreated`
- **Task Generation Rules (Total 26 Tasks):**
  1. **Novice Care (新手關懷):** Due Date = `contract.noviceDate` (Manual Input).
  2. **First Lesson (首課關懷):** Due Date = `contract.firstLessonDate` (Manual Input).
  3. **Monthly Care (月度關懷):** Due Date = `contract.startDate` + X months (Calculated automatically).

## 5. App Architecture & Navigation
- **Layout:** Mobile-first design with a **Fixed Bottom Navigation Bar**.
- **Core Routes (Tabs):**
  1. **Dashboard (Home `/`):**
     - **Purpose:** Daily To-Do List (Action-oriented).
     - **Logic (Strict):**
       - **Filter:** Show ONLY tasks where `dueDate <= Today` (Includes Overdue).
       - **Hide:** strictly HIDE all future tasks.
       - **Grouping:** Group tasks by `taskType`.
     - **UI:** Card layout displaying Student Name, Parent Name, Product, and Status.
  2. **Add Contract (`/contracts/new`):**
     - Purpose: New client entry form.
     - Inputs: Start Date, Novice Date, First Lesson Date.
  3. **My Clients (`/contracts`):**
     - Purpose: Searchable list of all clients.

## 6. UI Design System (Salesforce Lightning Style)
- **Layout Pattern:** F-Pattern layout for dashboard
- **Color Scheme:**
  - Background: `bg-slate-50`
  - Cards: `bg-white` with colored left borders
  - Task Types: Green (newcomer), Blue (first class), Gray (general)
- **Typography:** Clean, professional fonts with proper hierarchy
- **Components:**
  - Cards: `rounded-lg shadow-sm border-l-4`
  - Buttons: `h-14 rounded-lg font-bold`
  - Inputs: `h-12 px-4 rounded-lg border-gray-300`

## 7. Customer Detail Page Architecture
- **Timeline Design:** Vertical timeline with connecting lines
- **Status Indicators:** Colored dots (green=completed, gray=pending)
- **Date Formatting:** Localized Chinese date display
- **Task Grouping:** Chronological order with visual separation

## 8. Data Denormalization Strategy
- **Purpose:** Avoid N+1 queries on dashboard
- **Implementation:** Store `clientName`, `parentName`, `product` directly in Task documents
- **Trade-off:** Slight data redundancy for significant performance gain
- **Maintenance:** Update denormalized data when contract changes

## 9. Build & Deployment Configuration (Crucial)
- **Next.js Config:** Enable empty `turbopack: {}` and exclude `/functions` directory
- **Environment Variables:** Required Firebase keys in Vercel
- **Deployment Status:** ✅ Successfully deployed to Vercel (frontend) and Firebase (Cloud Functions)
- **Firebase Functions:** v2 with proper TypeScript configuration
- **Vercel Settings:** Automatic deployments from main branch