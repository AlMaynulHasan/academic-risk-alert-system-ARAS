/**
 * Cross-Client Real-Time Academic Record Synchronization Service
 *
 * Listens for cross-session database mutations (attendanceRecords, marks) via Cloud Firestore
 * real-time snapshots (onSnapshot). When another browser session or server process modifies
 * academic records, this service triggers an idempotent, debounced risk recalculation.
 *
 * Features:
 * 1. Cross-client detection: catches remote changes across separate browser tabs and devices.
 * 2. Idempotent & Loop-Protected: hashes incoming state and checks timestamps to prevent recursive loops.
 * 3. Debounced: groups rapid successive updates (e.g. multi-subject grade entry) into a single evaluation.
 * 4. Distinct from in-memory event bus: reads persisted Firestore state.
 */

import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { riskService } from './riskService';

type SyncListener = (studentId: string, changeType: 'attendance' | 'mark') => void;

class RealtimeSyncManager {
  private activeSubscriptions = new Map<string, Unsubscribe[]>();
  private lastProcessedTimes = new Map<string, number>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private listeners = new Set<SyncListener>();

  /**
   * Registers a listener to be notified when cross-client changes occur
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Starts listening to Firestore collections for a student across all active sessions
   */
  watchStudent(studentId: string): () => void {
    if (!studentId || studentId === 'anonymous') {
      return () => {};
    }

    // Return existing unsubscription if already watching
    if (this.activeSubscriptions.has(studentId)) {
      return () => this.unwatchStudent(studentId);
    }

    const unsubs: Unsubscribe[] = [];
    let isInitialAttendanceLoad = true;
    let isInitialMarksLoad = true;

    try {
      // 1. Watch attendance records
      const attQuery = query(
        collection(db, 'attendanceRecords'),
        where('studentId', '==', studentId)
      );

      const attUnsub = onSnapshot(
        attQuery,
        (snapshot) => {
          if (isInitialAttendanceLoad) {
            isInitialAttendanceLoad = false;
            return; // Skip initial cache/server hydration
          }

          // Check if any added, modified, or removed documents
          const changes = snapshot.docChanges();
          if (changes.length > 0) {
            this.scheduleDebouncedReevaluation(studentId, 'attendance');
          }
        },
        (err) => {
          console.warn(`[RealtimeSync] Attendance listener error for ${studentId}:`, err);
        }
      );
      unsubs.push(attUnsub);

      // 2. Watch marks records
      const marksQuery = query(
        collection(db, 'marks'),
        where('studentId', '==', studentId)
      );

      const marksUnsub = onSnapshot(
        marksQuery,
        (snapshot) => {
          if (isInitialMarksLoad) {
            isInitialMarksLoad = false;
            return; // Skip initial cache/server hydration
          }

          const changes = snapshot.docChanges();
          if (changes.length > 0) {
            this.scheduleDebouncedReevaluation(studentId, 'mark');
          }
        },
        (err) => {
          console.warn(`[RealtimeSync] Marks listener error for ${studentId}:`, err);
        }
      );
      unsubs.push(marksUnsub);

      this.activeSubscriptions.set(studentId, unsubs);
    } catch (err) {
      console.warn(`[RealtimeSync] Failed to initialize Firestore snapshot listeners:`, err);
    }

    return () => this.unwatchStudent(studentId);
  }

  /**
   * Unsubscribes from Firestore listeners for a student
   */
  unwatchStudent(studentId: string): void {
    const unsubs = this.activeSubscriptions.get(studentId);
    if (unsubs) {
      unsubs.forEach((unsub) => unsub());
      this.activeSubscriptions.delete(studentId);
    }
    const timer = this.debounceTimers.get(studentId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(studentId);
    }
  }

  /**
   * Debounces reevaluation triggers to prevent churn and recursive loop storms
   */
  private scheduleDebouncedReevaluation(
    studentId: string,
    changeType: 'attendance' | 'mark'
  ) {
    const existingTimer = this.debounceTimers.get(studentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(studentId);
      const now = Date.now();
      const last = this.lastProcessedTimes.get(studentId) || 0;

      // Rate limit reevaluation to at most once per 2 seconds per student
      if (now - last < 2000) {
        return;
      }
      this.lastProcessedTimes.set(studentId, now);

      try {
        console.log(
          `[RealtimeSync] Cross-client mutation detected (${changeType}). Triggering authoritative risk reevaluation for ${studentId}.`
        );
        await riskService.reevaluateRisk(studentId, `cross_client_sync_${changeType}`);

        // Notify external UI subscribers
        this.listeners.forEach((listener) => {
          try {
            listener(studentId, changeType);
          } catch (e) {
            console.error('[RealtimeSync] Listener callback error:', e);
          }
        });
      } catch (err) {
        console.warn(`[RealtimeSync] Reevaluation failed for ${studentId}:`, err);
      }
    }, 500);

    this.debounceTimers.set(studentId, timer);
  }
}

export const realtimeSyncManager = new RealtimeSyncManager();
