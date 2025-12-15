# Project Technical Specifications & Rules

## 1. Core Tech Stack (Strict)
- **Framework:** Next.js 14+ (App Router).
- **Language:** TypeScript (.ts, .tsx).
- **Styling:** Tailwind CSS (Use utility classes, avoid external CSS files).
- **Icons:** Lucide React.
- **Backend:** Google Firebase (Firestore, Auth, Functions v2).
- **State Management:** React Context + Hooks.

## 2. Coding Conventions
- **Components:** Use Functional Components with `interface Props`.
- **Typing:** STRICT TypeScript mode. No `any`. Always import types from `@/types/schema`.
- **Localization:** Traditional Chinese (Taiwan) for all UI text.
- **UI Consistency:**
  - Inputs/Selects: `h-12`, `px-4`, `rounded-lg`, `border-gray-300`, `text-gray-900`, `bg-white`.
  - Buttons: `h-14`, `rounded-lg`, `font-bold`.

## 3. Database Schema (Firestore)
- Refer to `types/schema.ts` for the Single Source of Truth.
- **Collections:**
  - `users`: Agents and Managers.
  - `contracts`: Core client data. Start Date (T=0) triggers automation.
  - `tasks`: Generated automatically via Cloud Functions (26 tasks per contract).

## 4. App Architecture & Navigation
- **Layout:** Mobile-first design with a **Fixed Bottom Navigation Bar**.
- **Core Routes (Tabs):**
  1. **Dashboard (Home `/`):**
     - Purpose: Daily To-Do List.
     - **Logic & MVP Trade-off:**
       - Query `tasks` by `agentId` (fetch all raw data).
       - **Client-side Filtering:** Filter for `status == 'pending'` and Sort by `dueDate` in the frontend code.
       - *Reasoning:* Avoids Firebase Composite Index creation time (blocking "Loading" state).
       - *Limitation:* Acceptable for MVP. May impact performance if task count exceeds 10k+.
     - UI: Card view with status indicators (Overdue/Today).
  2. **Add Contract (`/contracts/new`):**
     - Purpose: New client entry form.
     - Logic: Writes to `contracts` collection -> Triggers Cloud Function.
  3. **My Clients (`/contracts`):**
     - Purpose: View/Search all clients belonging to the agent.
     - Logic: Query `contracts` by `agentId`, Sort by `startDate` (Desc).
     - UI: Searchable list with direct "Call" action.

## 5. Forbidden
- DO NOT use AWS Amplify / DynamoDB.
- DO NOT use class components.