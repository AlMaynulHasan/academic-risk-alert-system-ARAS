/**
 * Academic Record Change Hook
 * Shared integration bus connecting Academic Record updates (Dev 1)
 * to Risk Engine triggers (Dev 2).
 */

export type AcademicRecordSource = 'attendance' | 'mark' | 'assessment' | 'enrollment';

export type AcademicRecordListener = (studentId: string, source: AcademicRecordSource) => Promise<void>;

const listeners: Set<AcademicRecordListener> = new Set();

/**
 * Register a listener to be notified when academic records change.
 */
export function registerAcademicRecordListener(listener: AcademicRecordListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all registered subscribers that an academic record has changed for a student.
 */
export async function onAcademicRecordChanged(studentId: string, source: AcademicRecordSource): Promise<void> {
  const tasks = Array.from(listeners).map(async (fn) => {
    try {
      await fn(studentId, source);
    } catch (err) {
      console.error(`[AcademicRecordHook] Error executing listener for student ${studentId}:`, err);
    }
  });
  await Promise.all(tasks);
}
