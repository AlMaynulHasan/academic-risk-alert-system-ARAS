import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Feedback,
  Intervention,
  FollowUp,
  InterventionStatus,
  InterventionStatusHistoryEntry,
  StudentProgressComparison,
  AssignedAdvisee,
  Assessment,
  RiskLevel,
} from '../types';
import { getCurrentUtcIso } from '../utils/date';
import { academicRecordService } from './academicRecordService';
import { riskService, CurrentRiskStatus } from './riskService';
import { notificationService } from './alertService';
import { calculateProgressComparison } from '../../modules/teacher/progressComparison';

export interface CreateInterventionInput {
  studentId: string;
  teacherId: string;
  teacherName?: string;
  reason: string;
  actionPlan: string;
  targetDate: string; // YYYY-MM-DD
  status?: InterventionStatus;
  initialNotes?: string;
}

export interface UpdateInterventionInput {
  interventionId: string;
  teacherId: string;
  actionPlan?: string;
  reason?: string;
  targetDate?: string;
  status?: InterventionStatus;
  notes?: string;
}

export interface AddFollowUpInput {
  interventionId: string;
  teacherId: string;
  progressNotes: string;
  statusUpdate: InterventionStatus;
  meetingDate: string; // YYYY-MM-DD
  outcome?: string;
  completed?: boolean;
}

export interface IInterventionService {
  createIntervention(
    input: CreateInterventionInput,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  updateIntervention(
    input: UpdateInterventionInput,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;
  addFollowUp(
    input: AddFollowUpInput,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  getProgressComparison(studentId: string, interventionId: string): Promise<StudentProgressComparison>;
  addFeedback(
    feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  listFeedback(studentId: string, includePrivate?: boolean): Promise<Feedback[]>;
  listInterventions(teacherId?: string, studentId?: string): Promise<Intervention[]>;
  listFollowUps(interventionId: string): Promise<FollowUp[]>;
  getAssignedAdvisees(teacherId: string, isAdmin?: boolean): Promise<AssignedAdvisee[]>;
  checkAdvisorAuthorization(teacherId: string, studentId: string): Promise<boolean>;
}

export class InterventionService implements IInterventionService {
  /**
   * Verifies if a faculty member is assigned as an advisor to a student.
   * Admins are globally authorized.
   */
  async checkAdvisorAuthorization(teacherId: string, studentId: string): Promise<boolean> {
    try {
      // 1. Check direct doc key ${teacherId}_${studentId}
      const directDocRef = doc(db, 'advisorAssignments', `${teacherId}_${studentId}`);
      const directSnap = await getDoc(directDocRef);
      if (directSnap.exists() && directSnap.data().status === 'active') {
        return true;
      }

      // 2. Query by fields in case of auto-generated IDs
      const q = query(
        collection(db, 'advisorAssignments'),
        where('teacherId', '==', teacherId),
        where('studentId', '==', studentId),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      console.warn(`checkAdvisorAuthorization check error:`, err);
      return false;
    }
  }

  /**
   * Fetches all advisees assigned to a teacher from advisorAssignments.
   * If teacher is admin, fetches all active assignments or profiles.
   */
  async getAssignedAdvisees(teacherId: string, isAdmin = false): Promise<AssignedAdvisee[]> {
    try {
      let assignmentsSnap;
      if (isAdmin) {
        assignmentsSnap = await getDocs(collection(db, 'advisorAssignments'));
      } else {
        const q = query(
          collection(db, 'advisorAssignments'),
          where('teacherId', '==', teacherId),
          where('status', '==', 'active')
        );
        assignmentsSnap = await getDocs(q);
      }

      const assignedStudentIds = new Set<string>();
      const assignmentMeta = new Map<string, { id: string; assignedDate: string }>();

      assignmentsSnap.forEach((d) => {
        const data = d.data();
        if (data.studentId) {
          assignedStudentIds.add(data.studentId);
          assignmentMeta.set(data.studentId, {
            id: d.id,
            assignedDate: data.assignedDate || data.createdAt?.slice(0, 10) || '',
          });
        }
      });

      // If no assignments found for teacher, return empty array immediately
      if (assignedStudentIds.size === 0) {
        return [];
      }

      // Fetch user docs, student profiles, risk statuses, attendance, and interventions in parallel
      const advisees: AssignedAdvisee[] = [];

      for (const studentId of assignedStudentIds) {
        const meta = assignmentMeta.get(studentId) || { id: studentId, assignedDate: '' };

        // 1. Fetch user doc for display name & email
        let displayName = 'Student';
        let email = '';
        try {
          const userSnap = await getDoc(doc(db, 'users', studentId));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            displayName = uData.displayName || displayName;
            email = uData.email || email;
          }
        } catch {
          // fallback
        }

        // 2. Fetch student profile
        const profile = await academicRecordService.getStudentProfile(studentId);

        // 3. Fetch current risk status
        let currentRisk: CurrentRiskStatus | null = null;
        try {
          currentRisk = await riskService.getCurrentRisk(studentId);
        } catch {
          // non-blocking
        }

        // 4. Fetch attendance summary
        let attendancePercentage = 100;
        let totalClasses = 0;
        let attendedClasses = 0;
        try {
          const att = await academicRecordService.getAttendance(studentId);
          attendancePercentage = att.percentage;
          totalClasses = att.totalClasses;
          attendedClasses = att.attendedClasses;
        } catch {
          // non-blocking
        }

        // 5. Fetch marks summary
        let marksAverage: number | null = null;
        try {
          const marksSummary = await academicRecordService.getMarks(studentId);
          marksAverage = marksSummary.percentage;
        } catch {
          // non-blocking
        }

        // 6. Count active interventions
        let activeInterventionsCount = 0;
        try {
          const qInt = query(
            collection(db, 'interventions'),
            where('studentId', '==', studentId)
          );
          const intSnap = await getDocs(qInt);
          intSnap.forEach((d) => {
            const status = d.data().status;
            if (status === 'open' || status === 'in_progress' || status === 'escalated') {
              activeInterventionsCount++;
            }
          });
        } catch {
          // non-blocking
        }

        // Determine currentRiskLevel
        let currentRiskLevel: RiskLevel | 'Insufficient data' = 'Low';
        let riskScore: number | null = null;
        let reasons: string[] = [];
        let riskComputedAt: string | undefined = undefined;

        if (currentRisk) {
          if (currentRisk.isSufficientData === false) {
            currentRiskLevel = 'Insufficient data';
            riskScore = null;
          } else {
            currentRiskLevel = currentRisk.riskLevel;
            riskScore = currentRisk.marksAverage !== undefined ? (100 - currentRisk.attendanceRate) : null;
          }
          reasons = currentRisk.reasons || [];
          riskComputedAt = currentRisk.computedAt;
        }

        advisees.push({
          assignmentId: meta.id,
          studentId,
          displayName,
          email,
          rollNumber: profile?.studentId || studentId.slice(0, 8).toUpperCase(),
          department: profile?.department || 'Computer Science and Engineering',
          batch: profile?.batch || '2022',
          level: profile?.level || 'Level 3, Term 1',
          cgpa: profile?.cgpa ?? null,
          assignedDate: meta.assignedDate,
          currentRiskLevel,
          riskScore,
          reasons,
          riskComputedAt,
          attendancePercentage,
          totalClasses,
          attendedClasses,
          marksAverage,
          activeInterventionsCount,
        });
      }

      // Sort by risk priority (High > Medium > Insufficient data > Low)
      return advisees.sort((a, b) => {
        const order: Record<string, number> = {
          High: 1,
          Medium: 2,
          'Insufficient data': 3,
          Low: 4,
        };
        const rankA = order[a.currentRiskLevel] || 5;
        const rankB = order[b.currentRiskLevel] || 5;
        if (rankA !== rankB) return rankA - rankB;
        return a.attendancePercentage - b.attendancePercentage;
      });
    } catch (err) {
      console.warn(`InterventionService.getAssignedAdvisees error for ${teacherId}:`, err);
      return [];
    }
  }

  /**
   * Creates a structured academic intervention plan.
   * Verifies advisor authorization and stores full status history.
   */
  async createIntervention(
    input: CreateInterventionInput,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!input.studentId || !input.teacherId || !input.reason || !input.actionPlan || !input.targetDate) {
      throw new Error('VALIDATION_ERROR: studentId, teacherId, reason, actionPlan, and targetDate are required.');
    }

    // Authorization check
    if (actor && actor.role !== 'admin') {
      const isAuthorized = await this.checkAdvisorAuthorization(actor.uid, input.studentId);
      if (!isAuthorized) {
        throw new Error(`AUTHORIZATION_ERROR: Faculty member ${actor.uid} is not assigned as the advisor for student ${input.studentId}.`);
      }
    }

    const docId = `int_${input.studentId}_${Date.now()}`;
    const now = getCurrentUtcIso();
    const initialStatus = input.status || 'open';

    const statusHistory: InterventionStatusHistoryEntry[] = [
      {
        status: initialStatus,
        changedAt: now,
        changedBy: actor?.uid || input.teacherId,
        notes: input.initialNotes || 'Intervention plan initiated by advisor',
      },
    ];

    const payload: Intervention = {
      id: docId,
      studentId: input.studentId,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      reason: input.reason,
      actionPlan: input.actionPlan,
      targetDate: input.targetDate,
      status: initialStatus,
      statusHistory,
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || input.teacherId,
      updatedBy: actor?.uid || input.teacherId,
    };

    try {
      await setDoc(doc(db, 'interventions', docId), payload);

      // Create in-app advising notification for the student
      try {
        await notificationService.createNotification({
          userId: input.studentId,
          title: 'Academic Advising Intervention',
          message: `Your academic advisor has scheduled an intervention plan: "${input.reason}". Target Date: ${input.targetDate}.`,
          category: 'intervention',
          isRead: false,
          readAt: null,
          link: '/student/dashboard',
          createdBy: actor?.uid || input.teacherId,
        });
      } catch (notifErr) {
        console.warn('Student notification dispatch note:', notifErr);
      }

      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `interventions/${docId}`);
      throw err;
    }
  }

  /**
   * Updates an existing intervention and records status transition in statusHistory.
   */
  async updateIntervention(
    input: UpdateInterventionInput,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    const intRef = doc(db, 'interventions', input.interventionId);
    const snap = await getDoc(intRef);
    if (!snap.exists()) {
      throw new Error(`NOT_FOUND: Intervention with ID "${input.interventionId}" not found.`);
    }

    const existing = snap.data() as Intervention;
    const now = getCurrentUtcIso();
    const actingUid = actor?.uid || input.teacherId;

    // Check authorization: acting user must be the teacher or admin
    if (actor && actor.role !== 'admin' && existing.teacherId !== actingUid) {
      const isAssigned = await this.checkAdvisorAuthorization(actingUid, existing.studentId);
      if (!isAssigned) {
        throw new Error('AUTHORIZATION_ERROR: You are not authorized to update this intervention.');
      }
    }

    const updates: Partial<Intervention> = {
      updatedAt: now,
      updatedBy: actingUid,
    };

    if (input.actionPlan !== undefined) updates.actionPlan = input.actionPlan;
    if (input.reason !== undefined) updates.reason = input.reason;
    if (input.targetDate !== undefined) updates.targetDate = input.targetDate;

    if (input.status && input.status !== existing.status) {
      updates.status = input.status;
      const history = existing.statusHistory ? [...existing.statusHistory] : [];
      history.push({
        status: input.status,
        changedAt: now,
        changedBy: actingUid,
        notes: input.notes || `Status transitioned from ${existing.status} to ${input.status}`,
      });
      updates.statusHistory = history;
    }

    try {
      await updateDoc(intRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `interventions/${input.interventionId}`);
    }
  }

  /**
   * Logs a follow-up meeting and updates parent intervention status.
   */
  async addFollowUp(
    input: AddFollowUpInput,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!input.interventionId || !input.teacherId || !input.progressNotes || !input.meetingDate) {
      throw new Error('VALIDATION_ERROR: interventionId, teacherId, progressNotes, and meetingDate are required.');
    }

    // Fetch parent intervention
    const intRef = doc(db, 'interventions', input.interventionId);
    const intSnap = await getDoc(intRef);
    if (!intSnap.exists()) {
      throw new Error(`NOT_FOUND: Parent intervention with ID "${input.interventionId}" does not exist.`);
    }

    const intervention = intSnap.data() as Intervention;
    const actingUid = actor?.uid || input.teacherId;
    const now = getCurrentUtcIso();

    // Authorization check
    if (actor && actor.role !== 'admin') {
      const isAssigned = await this.checkAdvisorAuthorization(actingUid, intervention.studentId);
      if (!isAssigned && intervention.teacherId !== actingUid) {
        throw new Error('AUTHORIZATION_ERROR: You are not authorized to log follow-ups for this intervention.');
      }
    }

    const followUpId = `flw_${input.interventionId}_${Date.now()}`;
    const followUpPayload: FollowUp = {
      id: followUpId,
      interventionId: input.interventionId,
      teacherId: input.teacherId,
      progressNotes: input.progressNotes,
      statusUpdate: input.statusUpdate,
      meetingDate: input.meetingDate,
      outcome: input.outcome || '',
      completed: input.completed ?? true,
      createdAt: now,
      updatedAt: now,
      createdBy: actingUid,
    };

    try {
      // 1. Create append-only followUp document
      await setDoc(doc(db, 'followUps', followUpId), followUpPayload);

      // 2. Update parent intervention status & history
      const history = intervention.statusHistory ? [...intervention.statusHistory] : [];
      history.push({
        status: input.statusUpdate,
        changedAt: now,
        changedBy: actingUid,
        notes: `Follow-up meeting (${input.meetingDate}): ${input.progressNotes.slice(0, 100)}`,
      });

      await updateDoc(intRef, {
        status: input.statusUpdate,
        statusHistory: history,
        updatedAt: now,
        updatedBy: actingUid,
      });

      return followUpId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `followUps/${followUpId}`);
      throw err;
    }
  }

  /**
   * Appends faculty advising feedback.
   * Append-only; no silent overwrite or delete allowed.
   */
  async addFeedback(
    feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!feedback.studentId || !feedback.teacherId || !feedback.comment?.trim()) {
      throw new Error('VALIDATION_ERROR: studentId, teacherId, and a non-empty comment are required.');
    }

    const actingUid = actor?.uid || feedback.teacherId;

    // Authorization check
    if (actor && actor.role !== 'admin') {
      const isAssigned = await this.checkAdvisorAuthorization(actingUid, feedback.studentId);
      if (!isAssigned) {
        throw new Error(`AUTHORIZATION_ERROR: You are not authorized to add advising notes for student ${feedback.studentId}.`);
      }
    }

    const docId = `fb_${feedback.studentId}_${Date.now()}`;
    const now = getCurrentUtcIso();

    const payload: Feedback = {
      id: docId,
      studentId: feedback.studentId,
      teacherId: feedback.teacherId,
      teacherName: feedback.teacherName,
      courseId: feedback.courseId || null,
      category: feedback.category || 'general',
      comment: feedback.comment.trim(),
      isPrivateToFaculty: Boolean(feedback.isPrivateToFaculty),
      createdAt: now,
      updatedAt: now,
      createdBy: actingUid,
    };

    try {
      await setDoc(doc(db, 'feedback', docId), payload);

      // If note is NOT private, notify the student
      if (!payload.isPrivateToFaculty) {
        try {
          await notificationService.createNotification({
            userId: feedback.studentId,
            title: 'Advisor Feedback Note',
            message: `Your advisor logged a note: "${payload.comment.slice(0, 90)}${payload.comment.length > 90 ? '...' : ''}"`,
            category: 'general',
            isRead: false,
            readAt: null,
            link: '/student/dashboard',
            createdBy: actingUid,
          });
        } catch {
          // non-blocking
        }
      }

      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `feedback/${docId}`);
      throw err;
    }
  }

  /**
   * Lists feedback for a student.
   * If includePrivate is false, excludes notes flagged isPrivateToFaculty.
   */
  async listFeedback(studentId: string, includePrivate = true): Promise<Feedback[]> {
    try {
      const q = query(
        collection(db, 'feedback'),
        where('studentId', '==', studentId)
      );
      const snap = await getDocs(q);

      const list: Feedback[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<Feedback, 'id'>) };
        if (includePrivate || !item.isPrivateToFaculty) {
          list.push(item);
        }
      });

      // Sort descending by createdAt
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err) {
      console.warn(`InterventionService.listFeedback error for ${studentId}:`, err);
      return [];
    }
  }

  /**
   * Lists interventions, optionally filtered by teacher or student.
   */
  async listInterventions(teacherId?: string, studentId?: string): Promise<Intervention[]> {
    try {
      let q;
      if (studentId) {
        q = query(collection(db, 'interventions'), where('studentId', '==', studentId));
      } else if (teacherId) {
        q = query(collection(db, 'interventions'), where('teacherId', '==', teacherId));
      } else {
        q = collection(db, 'interventions');
      }

      const snap = await getDocs(q);
      const list: Intervention[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Intervention, 'id'>) });
      });

      // Sort descending by createdAt
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err) {
      console.warn('InterventionService.listInterventions error:', err);
      return [];
    }
  }

  /**
   * Lists follow-up records for an intervention.
   */
  async listFollowUps(interventionId: string): Promise<FollowUp[]> {
    try {
      const q = query(
        collection(db, 'followUps'),
        where('interventionId', '==', interventionId)
      );
      const snap = await getDocs(q);

      const list: FollowUp[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<FollowUp, 'id'>) });
      });

      // Sort chronological by meetingDate
      return list.sort((a, b) => (a.meetingDate || '').localeCompare(b.meetingDate || ''));
    } catch (err) {
      console.warn(`InterventionService.listFollowUps error for ${interventionId}:`, err);
      return [];
    }
  }

  /**
   * Computes before/after window comparison for an intervention.
   * Strictly enforces missing data policy.
   */
  async getProgressComparison(
    studentId: string,
    interventionId: string
  ): Promise<StudentProgressComparison> {
    const intSnap = await getDoc(doc(db, 'interventions', interventionId));
    if (!intSnap.exists()) {
      throw new Error(`NOT_FOUND: Intervention ${interventionId} not found.`);
    }
    const intervention = { id: intSnap.id, ...(intSnap.data() as Omit<Intervention, 'id'>) };

    // Fetch student attendance records
    const attendanceSummary = await academicRecordService.getAttendance(studentId);

    // Fetch student marks and all assessments
    const marksSnap = await getDocs(
      query(collection(db, 'marks'), where('studentId', '==', studentId))
    );
    const marksList = marksSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<import('../types').Mark, 'id'>),
    }));

    const asmtSnap = await getDocs(collection(db, 'assessments'));
    const assessmentsList: Assessment[] = [];
    asmtSnap.forEach((d) => assessmentsList.push({ id: d.id, ...(d.data() as Omit<Assessment, 'id'>) }));

    // Fetch current risk status
    let currentRisk: CurrentRiskStatus | null = null;
    try {
      currentRisk = await riskService.getCurrentRisk(studentId);
    } catch {
      // non-blocking
    }

    return calculateProgressComparison({
      intervention,
      attendanceRecords: attendanceSummary.records,
      marks: marksList,
      assessments: assessmentsList,
      currentRisk,
    });
  }
}

export const interventionService = new InterventionService();
