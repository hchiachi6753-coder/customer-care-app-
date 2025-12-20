# Project Technical Specifications & Rules

## Version History
- **v1.0**: Initial CRM system with task management
- **v2.0**: Authentication, RBAC, and Management Dashboard (2024-12-20)

## 1. Core Tech Stack (Strict)
- **Framework:** Next.js 14+ (App Router). Note: Configured for Next.js 16+ Turbopack.
- **Language:** TypeScript (.ts, .tsx).
- **Styling:** Tailwind CSS (Use utility classes, avoid external CSS files).
- **Icons:** Lucide React.
- **Backend:** Google Firebase (Firestore, Auth, Functions v2).
- **Deployment:** Vercel (Frontend), Firebase Cloud Functions (Backend).
- **State Management:** React Context + Hooks.

## 2. Authentication & Authorization System

### 2.1 Authentication Method
- **Login**: Email/Password or Google Workspace SSO integration
- **Registration**: Closed system - admin-only account creation or invitation-based
- **Security**: Internal staff access only, no public registration

### 2.2 User Data Structure
```typescript
interface User {
  uid: string;           // System unique identifier
  role: 'sales' | 'manager' | 'director';
  teamId: string;        // Team identifier
  name: string;          // Display name
  email: string;
  avatar?: string;       // Avatar URL
}
```

### 2.3 Role-Based Access Control (RBAC)

| Role | Position | Data Read Scope | Data Write Scope | Default Landing Page |
|------|----------|----------------|------------------|---------------------|
| **Sales** | 銷售人員 | Own data only | Own clients only | Personal Todo Kanban |
| **Manager** | 銷售主管 | Team-wide data | Team clients | Team Management Dashboard |
| **Director** | 銷售總監 | Company-wide data | All clients | Organization Overview Dashboard |

### 2.4 Database Query Rules
```typescript
// Sales Query
where('ownerId', '==', currentUser.uid)

// Manager Query (Team Wide)
where('teamId', '==', currentUser.teamId)

// Manager Query (Target Individual)
where('ownerId', '==', targetSalesId)

// Director Query
// Team View: where('teamId', '==', selectedTeamId)
// Global View: (No Filter or date-limited)
```

## 3. Management Dashboard Architecture

### 3.1 Sales View (Individual)
- **Entry Point**: Personal Todo Kanban
- **Data Scope**: Only own clients and tasks
- **Restrictions**: No team switching or expansion options

### 3.2 Manager View (Team Management)
- **Entry Point**: Team Dashboard
- **Layer 1 (Summary)**: Staff cards with name, avatar, today's task count
- **Layer 2 (Drill Down)**: Click staff card → individual's kanban view
- **Expand All Mode**: "View All Team Tasks" button → mixed kanban with owner avatars

### 3.3 Director View (Organization)
- **Entry Point**: Organization Dashboard
- **Layer 1 (Teams)**: All sales team cards/buttons
- **Layer 2 (Team Drill)**: Click team → team dashboard (same as manager view)
- **Global Expand**: "View All Company Tasks" button (use with caution)

## 4. Coding Conventions
- **Components:** Use Functional Components with `interface Props`.
- **Typing:** STRICT TypeScript mode. No `any`. Always import types from `@/types/schema`.
- **Localization & Data Storage:**
  - **UI Display:** Traditional Chinese (Taiwan).
  - **Internal Data (Enum/Types):** MUST use English keys (e.g., `type: 'new'`, `status: 'pending'`).
  - **Mapping:** Handle mapping between English values and Chinese labels in the frontend component.
- **UI Consistency:**
  - Inputs/Selects: `h-12`, `px-4`, `rounded-lg`, `border-gray-300`, `text-gray-900`, `bg-white`.
  - Buttons: `h-14`, `rounded-lg`, `font-bold`.

## 5. Database Schema (Firestore)
- Refer to `types/schema.ts` for the Single Source of Truth.
- **Collections:**
  - `users`: Agents and Managers.
  - `contracts`: Core client data.
    - **New Fields:** `noviceDate` (Timestamp), `firstLessonDate` (Timestamp) - *Manual input by agent*.
    - **RBAC Fields:** `ownerId` (string), `teamId` (string) - *Required for access control*.
    - **Crucial Fields:** `product`, `paymentMethod`, `source`, `note`, `studentName`, `parentName`.
  - `tasks`: Generated automatically via Cloud Functions.
    - **Denormalized Fields (Crucial):** `clientName`, `parentName`, `product`. *Stored directly in Task to avoid N+1 queries on Dashboard.*
    - **RBAC Fields:** `ownerId` (string), `teamId` (string) - *Inherited from contract*.
    - **Fields:** `contractId`, `taskType`, `status`, `dueDate`.

### 5.1 Data Migration Strategy
```typescript
// Migration script for existing data
const migrateExistingData = async () => {
  // Add ownerId and teamId to existing contracts and tasks
  // Default: assign to temp admin user during migration
  // Batch update in chunks of 500 documents
};
```

## 6. Business Logic & Task Generation (Cloud Functions)
- **Trigger:** `onContractCreated`
- **Task Generation Rules (Total 26 Tasks):**
  1. **Novice Care (新手關懷):** Due Date = `contract.noviceDate` (Manual Input).
  2. **First Lesson (首課關懷):** Due Date = `contract.firstLessonDate` (Manual Input).
  3. **Monthly Care (月度關懷):** Due Date = `contract.startDate` + X months (Calculated automatically).

## 7. App Architecture & Navigation
- **Layout:** Mobile-first design with a **Fixed Bottom Navigation Bar**.
- **Core Routes (Tabs):**
  1. **Dashboard (Home `/`):**
     - **Purpose:** Daily To-Do List (Action-oriented).
     - **Logic (Strict):**
       - **Filter:** Show ONLY tasks where `dueDate <= Today` (Includes Overdue).
       - **Hide:** strictly HIDE all future tasks.
       - **Grouping:** 4-Column Kanban Board by task type and source.
     - **UI:** 4-Column layout: Newcomer, First Lesson, Monthly Care (System), General Care (Manual).
     - **Task Classification:**
       - Newcomer Care: `taskType === 'onboarding'`
       - First Lesson Care: `taskType === 'first_lesson'`
       - Monthly Care: `taskType === 'monthly_care'` AND `isSystemGenerated !== false`
       - General Care: `taskType === 'monthly_care'` AND `isSystemGenerated === false`
  2. **Add Contract (`/contracts/new`):**
     - Purpose: New client entry form.
     - Inputs: Start Date, Novice Date, First Lesson Date.
  3. **My Clients (`/contracts`):**
     - Purpose: Timeline-grouped client list.
     - **Grouping:** By contract start date (YYYY年 MM月).
     - **Sorting:** Primary by contract date (desc), Secondary by createdAt (desc).
     - **Layout:** Single-line compact rows with responsive text truncation.

## 8. UI Design System (Salesforce Lightning Style)
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

## 9. Customer Detail Page Architecture
- **Timeline Design:** Vertical timeline with connecting lines
- **Status Indicators:** Colored dots (green=completed, gray=pending)
- **Date Formatting:** Localized Chinese date display
- **Task Grouping:** Chronological order with visual separation

## 10. Data Denormalization Strategy
- **Purpose:** Avoid N+1 queries on dashboard
- **Implementation:** Store `clientName`, `parentName`, `product` directly in Task documents
- **Trade-off:** Slight data redundancy for significant performance gain
- **Maintenance:** Update denormalized data when contract changes
- **Task Source Identification:** Use `isSystemGenerated` flag to distinguish system vs manual tasks

## 11. Task Classification & Sorting Logic
- **System vs Manual Tasks:**
  - System Tasks: `isSystemGenerated !== false` (auto-generated monthly milestones)
  - Manual Tasks: `isSystemGenerated === false` (agent-created follow-ups)
- **Client List Sorting:**
  - Primary: `contractStartDate` (descending - newest first)
  - Secondary: `createdAt` (descending - latest created first)
- **Care History Sorting:**
  - Primary: `dueDate` (ascending - earliest first)
  - Secondary: `createdAt` (ascending - system tasks before manual tasks)
- **Timeline Grouping:** Group clients by contract start month for better organization

## 13. Security Implementation

### 13.1 Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Contracts access based on role
    match /contracts/{contractId} {
      allow read, write: if request.auth != null && (
        // Sales: own data only
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'sales' && 
         resource.data.ownerId == request.auth.uid) ||
        // Manager: team data
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager' && 
         resource.data.teamId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId) ||
        // Director: all data
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'director'
      );
    }
    
    // Tasks inherit same rules as contracts
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && (
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'sales' && 
         resource.data.ownerId == request.auth.uid) ||
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager' && 
         resource.data.teamId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId) ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'director'
      );
    }
  }
}
```

### 13.2 API Authentication
- All API endpoints require valid Firebase Auth token
- Server-side validation of user roles before data access
- Rate limiting and request validation

## 14. UI/UX Design Specifications

### 14.1 Role-Based Navigation
```typescript
// Navigation menu based on user role
const getNavigationItems = (userRole: Role) => {
  const baseItems = [{ label: '待辦事項', path: '/' }];
  
  if (userRole === 'manager' || userRole === 'director') {
    baseItems.push({ label: '團隊管理', path: '/team' });
  }
  
  if (userRole === 'director') {
    baseItems.push({ label: '組織總覽', path: '/organization' });
  }
  
  return baseItems;
};
```

### 14.2 Permission Error Handling
- **403 Forbidden**: Show "權限不足，請聯繫管理員" message
- **Graceful Degradation**: Hide unavailable features instead of showing errors
- **Loading States**: Clear indicators during permission checks

### 14.3 Team Switching UI
- **Manager/Director**: Dropdown selector for team switching
- **Breadcrumb Navigation**: Show current view context
- **Quick Actions**: "返回我的待辦" button for managers/directors

## 15. Performance & Scalability

### 15.1 Data Pagination
```typescript
// Pagination strategy for large datasets
const ITEMS_PER_PAGE = 50;
const paginateQuery = (baseQuery: Query, lastDoc?: DocumentSnapshot) => {
  return lastDoc 
    ? baseQuery.startAfter(lastDoc).limit(ITEMS_PER_PAGE)
    : baseQuery.limit(ITEMS_PER_PAGE);
};
```

### 15.2 Caching Strategy
- **Client-side**: React Query for API response caching
- **Server-side**: Firebase Functions memory caching for user profiles
- **CDN**: Static assets and images

### 15.3 Database Indexing
```javascript
// Required Firestore indexes
// contracts: ownerId ASC, teamId ASC, startDate DESC
// tasks: ownerId ASC, teamId ASC, dueDate ASC, status ASC
// tasks: contractId ASC, dueDate ASC
```

## 16. Deployment & Environment Management

### 16.1 Environment Configuration
- **Development**: Open access, test data
- **Staging**: Production-like data, restricted access
- **Production**: Live data, full security rules

### 16.2 Initial Setup Process
```bash
# Create initial admin user
firebase functions:shell
> createInitialAdmin({email: 'admin@company.com', role: 'director'})

# Deploy security rules
firebase deploy --only firestore:rules

# Run data migration
npm run migrate:add-rbac-fields
```

### 16.3 User Onboarding Flow
1. Admin creates user account via admin panel
2. System sends invitation email with temporary password
3. User completes profile setup on first login
4. Team assignment and role confirmation

## 17. Audit & Compliance

### 17.1 Activity Logging
```typescript
interface ActivityLog {
  userId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  resource: 'contract' | 'task' | 'user';
  resourceId: string;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}
```

### 17.2 Data Access Monitoring
- Log all data queries with user context
- Monitor cross-team data access attempts
- Generate monthly access reports for compliance

### 17.3 GDPR Compliance
- User data export functionality
- Data deletion workflows
- Consent management for data processing

## 18. Build & Deployment Configuration (Crucial)
- **Next.js Config:** Enable empty `turbopack: {}` and exclude `/functions` directory
- **Environment Variables:** Required Firebase keys in Vercel
- **Deployment Status:** ✅ Successfully deployed to Vercel (frontend) and Firebase (Cloud Functions)
- **Firebase Functions:** v2 with proper TypeScript configuration
- **Vercel Settings:** Automatic deployments from main branch