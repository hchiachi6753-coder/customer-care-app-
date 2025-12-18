import { Timestamp } from 'firebase/firestore';

export type Role = 'agent' | 'manager' | 'director';
export type ContractType = 'new' | 'renew';
export type TaskType = 'onboarding' | 'first_lesson' | 'monthly_care';
export type TaskStatus = 'pending' | 'done' | 'deferred';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  teamId?: string;
}

export interface Contract {
  id: string;
  contractNo: string; // e.g., "20251215-001"
  agentId: string;
  parentName: string;
  studentName: string;
  phone: string;
  email?: string;
  lineId?: string;
  type: ContractType;
  product: string;
  paymentMethod: string;
  source?: string;
  productCycle: number; // default 24
  startDate: Timestamp; // T=0
  noviceDate: Timestamp;
  firstLessonDate: Timestamp;
  joinDate?: string; // YYYY-MM-DD
  firstClassDate?: string; // YYYY-MM-DD
  note?: string;
  status: 'active' | 'risk' | 'finished';
}

export interface Task {
  id: string;
  contractId: string;
  agentId: string;
  clientName: string;
  parentName: string;
  product: string;
  email?: string;
  lineId?: string;
  joinDate?: string;
  firstClassDate?: string;
  dueDate: Timestamp;
  taskType: TaskType;
  isCompleted: boolean;
  status: TaskStatus;
  priority: 'normal' | 'high';
  completedAt?: string;
  completionNote?: string;
  callOutcome?: 'connected' | 'no_answer' | 'busy' | 'none';
  serviceType?: 'normal' | 'help_needed' | 'complaint' | 'none';
  isSystemGenerated?: boolean;
}

export interface TaskLog {
  id: string;
  taskId: string;
  callStatus: 'success' | 'no_answer' | 'busy';
  serviceTag: 'normal' | 'help' | 'complaint';
  note: string;
  createdAt: Timestamp;
}

// Task Completion Options
export const CALL_OUTCOME_OPTIONS = [
  { value: 'connected', label: '成功聯繫' },
  { value: 'no_answer', label: '未接聽' },
  { value: 'busy', label: '忙線中' },
  { value: 'none', label: '未撥打' }
] as const;

export const SERVICE_TYPE_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'help_needed', label: '需要協助' },
  { value: 'complaint', label: '客訴' },
  { value: 'none', label: '無' }
] as const;