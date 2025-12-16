import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Import types
import {Contract, Task, TaskType} from "./types/schema";

initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 10 });

export const onContractCreated = onDocumentCreated(
  "contracts/{contractId}",
  async (event) => {
    const contractData = event.data?.data() as Contract;
    const contractId = event.params.contractId;

    if (!contractData) {
      logger.error("No contract data found");
      return;
    }

    const startDate = contractData.startDate;
    const noviceDate = contractData.noviceDate;
    const firstLessonDate = contractData.firstLessonDate;
    const agentId = contractData.agentId;
    const clientName = contractData.studentName;
    const parentName = contractData.parentName;
    const product = contractData.product;
    const email = contractData.email;
    const lineId = contractData.lineId;
    const joinDate = contractData.joinDate;
    const firstClassDate = contractData.firstClassDate;
    const batch = db.batch();

    // Task A: Novice Care (use manual noviceDate)
    const noviceTask: Omit<Task, 'id'> = {
      contractId,
      agentId,
      clientName,
      parentName,
      product,
      email,
      lineId,
      joinDate,
      firstClassDate,
      dueDate: noviceDate as any,
      taskType: 'onboarding' as TaskType,
      isCompleted: false,
      status: 'pending',
      priority: 'normal'
    };
    const noviceRef = db.collection('tasks').doc();
    batch.set(noviceRef, noviceTask);

    // Task B: First Lesson Care (use manual firstLessonDate)
    const firstLessonTask: Omit<Task, 'id'> = {
      contractId,
      agentId,
      clientName,
      parentName,
      product,
      email,
      lineId,
      joinDate,
      firstClassDate,
      dueDate: firstLessonDate as any,
      taskType: 'first_lesson' as TaskType,
      isCompleted: false,
      status: 'pending',
      priority: 'normal'
    };
    const firstLessonRef = db.collection('tasks').doc();
    batch.set(firstLessonRef, firstLessonTask);

    // Monthly Tasks: 24 tasks (T+1 to T+24 months)
    for (let i = 1; i <= 24; i++) {
      const dueDate = new Date(startDate.toDate());
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const monthlyTask: Omit<Task, 'id'> = {
        contractId,
        agentId,
        clientName,
        parentName,
        product,
        email,
        lineId,
        joinDate,
        firstClassDate,
        dueDate: Timestamp.fromDate(dueDate) as any,
        taskType: 'monthly_care' as TaskType,
        isCompleted: false,
        status: 'pending',
        priority: 'normal'
      };
      
      const monthlyRef = db.collection('tasks').doc();
      batch.set(monthlyRef, monthlyTask);
    }

    try {
      await batch.commit();
      logger.info(`Created 26 tasks for contract ${contractId}`);
    } catch (error) {
      logger.error(`Error creating tasks for contract ${contractId}:`, error);
    }
  }
);
