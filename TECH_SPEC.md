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
    - Fields included: `studentName`, `parentName`, `phone`, `startDate`, `agentId`.
    - **Crucial Fields:** `product` (string), `paymentMethod` (string), `source` (optional), `note` (optional).
  - `tasks`: Generated automatically via Cloud Functions (26 tasks per contract).

## 4. App Architecture & Navigation
- **Layout:** Mobile-first design with a **Fixed Bottom Navigation Bar**.
- **Core Routes (Tabs):**
  1. **Dashboard (Home `/`):**
     - Purpose: Daily To-Do List.
     - **Logic & MVP Trade-off:**
       - Query `tasks` by `agentId` (fetch all raw data).
       - **Client-side Filtering:** Filter for `status == 'pending'` and Sort by `dueDate` in the frontend.
       - *Reasoning:* Avoids Firebase Composite Index creation time.
     - UI: Card view with status indicators (Overdue/Today).
  2. **Add Contract (`/contracts/new`):**
     - Purpose: New client entry form.
     - Logic: Writes to `contracts` collection -> Triggers Cloud Function.
  3. **My Clients (`/contracts`):**
     - Purpose: View/Search all clients belonging to the agent.
     - **Logic & MVP Trade-off:**
       - Query `contracts` by `agentId` (fetch all raw data).
       - **Client-side Sorting:** Sort by `startDate` (Desc) in the frontend.
     - UI: Searchable list with direct "Call" action.

## 5. Build & Deployment Configuration (Crucial)
- **Next.js Config (`next.config.ts`):**
  - **Turbopack:** Must explicitly enable empty config (`turbopack: {}`) for Next.js 16 compatibility.
  - **Exclusions:** MUST exclude the `/functions` directory from the Next.js build process to prevent backend dependencies (firebase-functions) from breaking the frontend build.
- **TypeScript Config (`tsconfig.json`):**
  - **Exclusions:** Add `"functions"` to the exclude array to prevent TypeScript compilation of Cloud Functions code.
- **Environment Variables:**
  - Required in Vercel: `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`.
- **Git Repository Structure:**
  - Frontend code: Root directory (deployed to Vercel).
  - Backend code: `/functions` directory (deployed separately to Firebase).

## 6. Common Deployment Issues & Solutions
- **Issue:** "Cannot find module 'firebase-functions'" during Vercel build.
  - **Solution:** Ensure `functions` directory is excluded in both `next.config.ts` and `tsconfig.json`.
- **Issue:** Turbopack webpack config conflict in Next.js 16.
  - **Solution:** Remove webpack config, add empty `turbopack: {}` config.
- **Issue:** TypeScript errors with Chinese enum values.
  - **Solution:** Use English values in code, map to Chinese in UI components.

## 7. Forbidden
- DO NOT use AWS Amplify / DynamoDB.
- DO NOT use class components.
- DO NOT import `firebase-functions` in frontend code.
- DO NOT use Chinese strings as enum/type values in TypeScript interfaces.