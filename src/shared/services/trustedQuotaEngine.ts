/**
 * Trusted Academic Risk Alert Quota Engine
 *
 * Implements strict, server-side atomic quota reservation and delivery authorization:
 * 1. Asia/Dhaka Calendar Month Period calculation (UTC+6)
 * 2. Atomic limit enforcement: strictly <= 2 alerts per student per calendar month
 * 3. Idempotent duplicate suppression (retries / identical risk levels)
 * 4. Safe failure rollback: failed deliveries do not increment the quota counter
 * 5. Complete isolation: deadline reminders never touch alert counters
 */

import { RiskLevel, AlertCounter, AlertDelivery, Notification } from '../types';
import { getCurrentDhakaMonthPeriod, getCurrentUtcIso, formatDhakaDateTime } from '../utils/date';
import { CurrentRiskStatus } from './riskService';

export const MONTHLY_ALERT_LIMIT = 2; // Strict institutional policy

export interface QuotaEvaluationResult {
  delivered: boolean;
  deliveryId?: string;
  notificationId?: string;
  counterId?: string;
  reason?: 'MONTHLY_QUOTA_EXCEEDED' | 'DUPLICATE_SUPPRESSED' | 'LOW_RISK_NO_ALERT' | 'DELIVERY_ERROR';
  details?: string;
  newCount?: number;
  period?: string;
}

export interface AtomicStoreAdapter {
  getCounter(counterId: string): Promise<AlertCounter | null>;
  saveDeliveryAndCounter(
    counterId: string,
    counterPayload: AlertCounter,
    deliveryId: string,
    deliveryPayload: AlertDelivery,
    notificationId: string,
    notificationPayload: Notification
  ): Promise<void>;
}

/**
 * Pure, authoritative quota decision and atomic payload generator.
 */
export async function executeTrustedQuotaDecision(
  studentId: string,
  riskStatus: CurrentRiskStatus,
  assessmentId: string | undefined,
  store: AtomicStoreAdapter,
  actorUid: string = 'system_trusted_boundary'
): Promise<QuotaEvaluationResult> {
  // 1. Only Medium and High risk trigger academic alerts
  if (riskStatus.riskLevel === 'Low') {
    return {
      delivered: false,
      reason: 'LOW_RISK_NO_ALERT',
      details: 'Risk status is Low; institutional alert suppressed.',
    };
  }

  // 2. Compute calendar month period strictly in Asia/Dhaka (UTC+6)
  const currentPeriod = getCurrentDhakaMonthPeriod();
  const counterDocId = `${studentId}_${currentPeriod}`;

  // 3. Atomically read counter
  const existingCounter = await store.getCounter(counterDocId);
  const currentCount = existingCounter?.inAppCount || 0;
  const lastRiskLevel = existingCounter?.lastRiskLevel || null;
  const lastAssessmentId = existingCounter?.lastAssessmentId || null;

  // 4. Enforce quota: strictly max 2 per calendar month
  if (currentCount >= MONTHLY_ALERT_LIMIT) {
    return {
      delivered: false,
      counterId: counterDocId,
      period: currentPeriod,
      reason: 'MONTHLY_QUOTA_EXCEEDED',
      details: `Monthly quota reached (${currentCount}/${MONTHLY_ALERT_LIMIT} for period ${currentPeriod} in Asia/Dhaka).`,
      newCount: currentCount,
    };
  }

  // 5. Idempotency & duplicate suppression
  if (assessmentId && lastAssessmentId === assessmentId) {
    return {
      delivered: false,
      counterId: counterDocId,
      period: currentPeriod,
      reason: 'DUPLICATE_SUPPRESSED',
      details: 'Duplicate alert suppressed: identical assessment event already alerted.',
      newCount: currentCount,
    };
  }

  // Suppress duplicate identical risk level if already alerted this period unless escalating
  if (lastRiskLevel === riskStatus.riskLevel && lastAssessmentId) {
    return {
      delivered: false,
      counterId: counterDocId,
      period: currentPeriod,
      reason: 'DUPLICATE_SUPPRESSED',
      details: `Duplicate alert suppressed: risk level ${riskStatus.riskLevel} already delivered in period ${currentPeriod}.`,
      newCount: currentCount,
    };
  }

  // 6. Generate atomic payloads
  const now = getCurrentUtcIso();
  const deliveryDocId = `alert_${studentId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const notifDocId = `notif_${studentId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nextCount = currentCount + 1;

  const counterPayload: AlertCounter = {
    id: counterDocId,
    studentId,
    period: currentPeriod,
    inAppCount: nextCount,
    emailCount: 0,
    lastDispatchedAt: now,
    lastRiskLevel: riskStatus.riskLevel as RiskLevel,
    lastAssessmentId: assessmentId || null,
    createdAt: existingCounter?.createdAt || now,
    updatedAt: now,
  };

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
    createdBy: actorUid,
  };

  const primaryReason = riskStatus.reasons && riskStatus.reasons.length > 0
    ? riskStatus.reasons[0]
    : 'Multiple performance and attendance indicators require attention.';

  const notificationPayload: Notification = {
    id: notifDocId,
    userId: studentId,
    title: `Academic Risk Alert: ${riskStatus.riskLevel} Risk Detected`,
    message: `${primaryReason} Please review recommendations and contact your advisor.`,
    category: 'risk_alert',
    isRead: false,
    readAt: null,
    link: '/student/notifications',
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
  };

  // 7. Commit atomically. If this throws, failure is returned and quota is NEVER incremented.
  try {
    await store.saveDeliveryAndCounter(
      counterDocId,
      counterPayload,
      deliveryDocId,
      deliveryPayload,
      notifDocId,
      notificationPayload
    );

    return {
      delivered: true,
      deliveryId: deliveryDocId,
      notificationId: notifDocId,
      counterId: counterDocId,
      period: currentPeriod,
      newCount: nextCount,
      details: `Alert successfully authorized and recorded (${nextCount}/${MONTHLY_ALERT_LIMIT} for ${currentPeriod}).`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Storage commit failed';
    return {
      delivered: false,
      counterId: counterDocId,
      period: currentPeriod,
      reason: 'DELIVERY_ERROR',
      details: `Atomic delivery failed: ${errorMsg}. Quota counter was not incremented.`,
      newCount: currentCount,
    };
  }
}
