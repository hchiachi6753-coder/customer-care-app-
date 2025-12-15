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
    const agentId = contractData.agentId;
    const batch = db.batch();

    // Task A: Onboarding (T+0)
    const onboardingTask: Omit<Task, 'id'> = {
      contractId,
      agentId,
      dueDate: startDate,
      taskType: 'onboarding' as TaskType,
      isCompleted: false,
      status: 'pending',
      priority: 'normal'
    };
    const onboardingRef = db.collection('tasks').doc();
    batch.set(onboardingRef, onboardingTask);

    // Task B: First Lesson (T+0)
    const firstLessonTask: Omit<Task, 'id'> = {
      contractId,
      agentId,
      dueDate: startDate,
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
        dueDate: Timestamp.fromDate(dueDate),
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
