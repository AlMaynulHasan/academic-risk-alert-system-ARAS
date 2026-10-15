import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AlertDelivery, Notification, AlertCounter, RiskLevel } from '../types';
import { getCurrentUtcIso, getCurrentDhakaMonthPeriod, formatDhakaDateTime } from '../utils/date';
import { CurrentRiskStatus } from './riskService';
import { academicRecordService } from './academicRecordService';

export const MONTHLY_ALERT_LIMIT = 2; // Strict limit: max 2 risk alerts per calendar month in Asia/Dhaka

export interface EmailStubPayload {
  toEmail: string;
  studentName: string;
  subject: string;
  body: string;
  riskLevel: RiskLevel;
  deliveredAt: string;
}

/**
 * Clean email delivery stub.
 * Logs and simulates external SMTP / SendGrid / transactional email delivery.
 */
export async function sendRiskEmailStub(payload: EmailStubPayload): Promise<{ success: boolean; messageId: string }> {
  // In production, this would call a Cloud Function or serverless API endpoint.
  console.log(`[EmailDispatcher STUB] Delivering risk alert email to ${payload.toEmail}: "${payload.subject}"`);
  return {
    success: true,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  };
}

export interface TryDeliverResult {
  delivered: boolean;
  deliveryId?: string;
  notificationId?: string;
  reason?: 'MONTHLY_QUOTA_EXCEEDED' | 'DUPLICATE_SUPPRESSED' | 'LOW_RISK_NO_ALERT' | 'DELIVERY_ERROR';
  details?: string;
}

export interface IAlertService {
  tryDeliverRiskAlert(studentId: string, riskStatus: CurrentRiskStatus, assessmentId?: string): Promise<TryDeliverResult>;
  listAlerts(studentId: string): Promise<AlertDelivery[]>;
  acknowledgeAlert(alertId: string, studentId: string): Promise<void>;
  getMonthlyQuotaStatus(studentId: string): Promise<{ period: string; count: number; limit: number; remaining: number }>;
}

export interface INotificationService {
  listNotifications(userId: string): Promise<Notification[]>;
  markRead(notificationId: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  dispatchDeadlineReminders(studentId: string): Promise<number>;
}

export class AlertService implements IAlertService {
  /**
   * Concurrency-safe delivery of risk alerts.
   * Executes inside an atomic Cloud Firestore transaction (runTransaction).
   * Invariant: Maximum 2 alerts per student per calendar month in Asia/Dhaka.
   * Duplicate unchanged alerts are suppressed unless risk escalates.
   * Failed attempts do NOT increment quota counter.
   */
  async tryDeliverRiskAlert(
    studentId: string,
    riskStatus: CurrentRiskStatus,
    assessmentId?: string
  ): Promise<TryDeliverResult> {
    // 1. Only Medium and High risk statuses trigger alerts
    if (riskStatus.riskLevel === 'Low') {
      return { delivered: false, reason: 'LOW_RISK_NO_ALERT', details: 'Risk level is Low; alerts are suppressed.' };
    }

    const currentPeriod = getCurrentDhakaMonthPeriod(); // e.g. "2026-10" in Asia/Dhaka
    const counterDocId = `${studentId}_${currentPeriod}`;
    const counterRef = doc(db, 'alertCounters', counterDocId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        // A. Read current monthly quota document
        const counterSnap = await transaction.get(counterRef);
        let currentCount = 0;
        let lastDispatchedLevel: RiskLevel | null = null;
        let lastDispatchedAssessmentId: string | null = null;

        if (counterSnap.exists()) {
          const counterData = counterSnap.data() as AlertCounter & {
            lastRiskLevel?: RiskLevel;
            lastAssessmentId?: string;
          };
          currentCount = counterData.inAppCount || 0;
          lastDispatchedLevel = counterData.lastRiskLevel || null;
          lastDispatchedAssessmentId = counterData.lastAssessmentId || null;
        }

        // B. Check Monthly Quota Limit under concurrency
        if (currentCount >= MONTHLY_ALERT_LIMIT) {
          return {
            delivered: false,
            reason: 'MONTHLY_QUOTA_EXCEEDED' as const,
            details: `Monthly quota reached (${currentCount}/${MONTHLY_ALERT_LIMIT} for period ${currentPeriod} in Asia/Dhaka).`,
          };
        }

        // C. Check Idempotency & Duplicate Suppression
        if (assessmentId && lastDispatchedAssessmentId === assessmentId) {
          return {
            delivered: false,
            reason: 'DUPLICATE_SUPPRESSED' as const,
            details: 'Identical assessment has already been alerted.',
          };
        }

        // If previous alert was identical risk level and not escalating, suppress duplicate
        if (lastDispatchedLevel === riskStatus.riskLevel && lastDispatchedAssessmentId) {
          return {
            delivered: false,
            reason: 'DUPLICATE_SUPPRESSED' as const,
            details: `Alert with identical risk level (${riskStatus.riskLevel}) already dispatched this period.`,
          };
        }

        // D. Prepare Documents
        const now = getCurrentUtcIso();
        const deliveryDocId = `alert_${studentId}_${Date.now()}`;
        const deliveryRef = doc(db, 'alertDeliveries', deliveryDocId);

        const notifDocId = `notif_${studentId}_${Date.now()}`;
        const notifRef = doc(db, 'notifications', notifDocId);

        const deliveryPayload: AlertDelivery = {
          id: deliveryDocId,
          studentId,
          riskAssessmentId: assessmentId || `asmt_${now}`,
          riskLevel: riskStatus.riskLevel as 'Medium' | 'High',
          channel: 'in_app',
          status: 'delivered',
          acknowledgedAt: null,
          createdAt: now,
          updatedAt: now,
          createdBy: 'system_risk_engine',
        };

        const primaryReason = riskStatus.reasons && riskStatus.reasons.length > 0
          ? riskStatus.reasons[0]
          : 'Multiple performance and attendance indicators require attention.';

        const notifPayload: Notification = {
          id: notifDocId,
          userId: studentId,
          title: `Academic Risk Alert: ${riskStatus.riskLevel} Risk Detected`,
          message: `${primaryReason} Please review your recommendations and meet your advisor.`,
          category: 'risk_alert',
          isRead: false,
          readAt: null,
          link: '/student/notifications',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system_risk_engine',
        };

        // E. Atomic Write: increment counter ONLY on successful delivery
        transaction.set(deliveryRef, deliveryPayload);
        transaction.set(notifRef, notifPayload);

        const newCount = currentCount + 1;
        transaction.set(
          counterRef,
          {
            id: counterDocId,
            studentId,
            period: currentPeriod,
            inAppCount: newCount,
            emailCount: 0,
            lastDispatchedAt: now,
            lastRiskLevel: riskStatus.riskLevel,
            lastAssessmentId: assessmentId || null,
            createdAt: counterSnap.exists() ? (counterSnap.data()?.createdAt || now) : now,
            updatedAt: now,
          },
          { merge: true }
        );

        return {
          delivered: true,
          deliveryId: deliveryDocId,
          notificationId: notifDocId,
        };
      });

      // Stub Email notification outside transaction (best effort)
      if (result.delivered) {
        sendRiskEmailStub({
          toEmail: `student_${studentId}@university.edu.bd`,
          studentName: `Student ${studentId}`,
          subject: `[Urgent] Academic Risk Alert: ${riskStatus.riskLevel} Level`,
          body: `An academic alert has been generated. Main factor: ${riskStatus.reasons[0] || 'Academic standing review.'}`,
          riskLevel: riskStatus.riskLevel,
          deliveredAt: getCurrentUtcIso(),
        }).catch((err) => console.warn('Email stub error:', err));
      }

      return result;
    } catch (err) {
      console.error('AlertService.tryDeliverRiskAlert transaction error:', err);
      return {
        delivered: false,
        reason: 'DELIVERY_ERROR',
        details: err instanceof Error ? err.message : 'Unknown transaction failure',
      };
    }
  }

  /**
   * Fetches monthly alert quota status for a student in Asia/Dhaka
   */
  async getMonthlyQuotaStatus(studentId: string): Promise<{ period: string; count: number; limit: number; remaining: number }> {
    const period = getCurrentDhakaMonthPeriod();
    const counterDocId = `${studentId}_${period}`;
    try {
      const snap = await getDoc(doc(db, 'alertCounters', counterDocId));
      const count = snap.exists() ? (snap.data() as AlertCounter).inAppCount || 0 : 0;
      return {
        period,
        count,
        limit: MONTHLY_ALERT_LIMIT,
        remaining: Math.max(0, MONTHLY_ALERT_LIMIT - count),
      };
    } catch (err) {
      console.warn('Error reading alert counter:', err);
      return { period, count: 0, limit: MONTHLY_ALERT_LIMIT, remaining: MONTHLY_ALERT_LIMIT };
    }
  }

  /**
   * Lists alerts delivered to a student
   */
  async listAlerts(studentId: string): Promise<AlertDelivery[]> {
    try {
      const q = query(
        collection(db, 'alertDeliveries'),
        where('studentId', '==', studentId)
      );
      const snap = await getDocs(q);
      const list: AlertDelivery[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<AlertDelivery, 'id'>) }));
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.warn('AlertService.listAlerts error:', err);
      return [];
    }
  }

  /**
   * Acknowledges an alert
   */
  async acknowledgeAlert(alertId: string, studentId: string): Promise<void> {
    try {
      const alertRef = doc(db, 'alertDeliveries', alertId);
      const snap = await getDoc(alertRef);
      if (!snap.exists()) {
        throw new Error('Alert not found');
      }
      const data = snap.data() as AlertDelivery;
      if (data.studentId !== studentId) {
        throw new Error('Unauthorized to acknowledge this alert');
      }

      await updateDoc(alertRef, {
        status: 'acknowledged',
        acknowledgedAt: getCurrentUtcIso(),
        updatedAt: getCurrentUtcIso(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `alertDeliveries/${alertId}`);
    }
  }
}

export class NotificationService implements INotificationService {
  /**
   * Lists notifications for a user, sorted descending by date
   */
  async listNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const list: Notification[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Notification, 'id'>) }));
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.warn('NotificationService.listNotifications error:', err);
      return [];
    }
  }

  /**
   * Marks a single notification as read
   */
  async markRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      const snap = await getDoc(notifRef);
      if (!snap.exists()) return;
      if ((snap.data() as Notification).userId !== userId) return;

      await updateDoc(notifRef, {
        isRead: true,
        readAt: getCurrentUtcIso(),
        updatedAt: getCurrentUtcIso(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notificationId}`);
    }
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllRead(userId: string): Promise<void> {
    try {
      const list = await this.listNotifications(userId);
      const unread = list.filter((n) => !n.isRead);
      const now = getCurrentUtcIso();
      await Promise.all(
        unread.map((n) =>
          updateDoc(doc(db, 'notifications', n.id), {
            isRead: true,
            readAt: now,
            updatedAt: now,
          })
        )
      );
    } catch (err) {
      console.warn('NotificationService.markAllRead error:', err);
    }
  }

  /**
   * Creates a notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentUtcIso();
    const payload: Notification = {
      ...notification,
      id,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const notifRef = doc(db, 'notifications', id);
      await runTransaction(db, async (txn) => {
        txn.set(notifRef, payload);
      });
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${id}`);
      return id;
    }
  }

  /**
   * Dispatches deadline reminders for upcoming assessments (e.g. within 3 days and 1 day).
   * Note: Deadline reminders use category: 'assignment' and do NOT touch alertCounters.
   * Scoped strictly to student's enrolled courses.
   */
  async dispatchDeadlineReminders(studentId: string): Promise<number> {
    try {
      const now = Date.now();
      // Scoped query: Only fetch active deadlines for courses this student is actively enrolled in
      const deadlines = await academicRecordService.getDeadlines(studentId);
      let dispatched = 0;

      // Existing notifications to avoid duplicate reminders today
      const existingNotifs = await this.listNotifications(studentId);
      const todayDhaka = getCurrentDhakaMonthPeriod();

      for (const deadline of deadlines) {
        const dueTime = new Date(deadline.dueDate).getTime();
        const diffHours = (dueTime - now) / (1000 * 60 * 60);

        // Check if due within 72 hours (3 days) or 24 hours (1 day)
        if (diffHours > 0 && diffHours <= 72) {
          const daysLeft = Math.ceil(diffHours / 24);

          // Check if already dispatched today
          const alreadySent = existingNotifs.some(
            (n) => n.category === 'assignment' && n.message.includes(deadline.title) && n.createdAt.startsWith(todayDhaka)
          );

          if (!alreadySent) {
            await this.createNotification({
              userId: studentId,
              title: `Upcoming Deadline: ${deadline.title}`,
              message: `Reminder: "${deadline.title}" is due in ${daysLeft === 1 ? '1 day' : `${daysLeft} days`} (${formatDhakaDateTime(deadline.dueDate)}).`,
              category: 'assignment',
              isRead: false,
              readAt: null,
              link: '/student/courses',
              createdBy: 'system_reminder_engine',
            });
            dispatched++;
          }
        }
      }
      return dispatched;
    } catch (err) {
      console.warn('dispatchDeadlineReminders error:', err);
      return 0;
    }
  }
}

export const alertService = new AlertService();
export const notificationService = new NotificationService();
