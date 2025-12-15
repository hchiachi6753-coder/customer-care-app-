# Project Technical Specifications

## 1. Core Tech Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS.
- **Backend:** Google Firebase (Firestore, Auth, Cloud Functions v2).
- **Styling:** Mobile-first, Tailwind utility classes.
- **Strict Rule:** DO NOT use AWS SDK. Use Firebase SDK only.

## 2. Data Structure (See types/schema.ts)
- **Users:** Agents, Managers.
- **Contracts:** The core entity. Start Date (T=0) determines tasks.
- **Tasks:** Generated automatically via Cloud Functions.

## 3. Development Pattern
- Use Functional Components.
- Use `react-hook-form` for inputs.
- Ensure all Firestore writes are type-safe.