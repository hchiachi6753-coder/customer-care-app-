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
  type: ContractType;
  productCycle: number; // default 24
  startDate: Timestamp; // T=0
  firstLessonDate?: Timestamp | null;
  status: 'active' | 'risk' | 'finished';
}

export interface Task {
  id: string;
  contractId: string;
  agentId: string;
  dueDate: Timestamp;
  taskType: TaskType;
  isCompleted: boolean;
  status: TaskStatus;
  priority: 'normal' | 'high';
}

export interface TaskLog {
  id: string;
  taskId: string;
  callStatus: 'success' | 'no_answer' | 'busy';
  serviceTag: 'normal' | 'help' | 'complaint';
  note: string;
  createdAt: Timestamp;
}