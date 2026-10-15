import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { RiskAssessment, RiskLevel } from '../types';
import { getCurrentUtcIso } from '../utils/date';
import {
  calculateRisk,
  DEFAULT_RISK_CONFIG,
  RiskConfigModel,
  RiskCalculationInput,
  RiskCalculationResult,
  StructuredReason,
} from '../../modules/risk/engine/calculator';
import { generateRecommendations } from '../../modules/risk/engine/recommendations';
import { alertService } from './alertService';
import { registerAcademicRecordListener } from './hooks';

export interface CurrentRiskStatus {
  studentId: string;
  semesterId: string;
  riskLevel: RiskLevel;
  score: number | null;
  isSufficientData: boolean;
  reasons: string[];
  structuredReasons: StructuredReason[];
  attendanceRate: number;
  marksAverage: number | null;
  missingAssignmentsCount: number;
  computedAt: string;
  configVersion: string;
}

export interface RecommendationItem {
  id: string;
  category: 'attendance' | 'marks' | 'advising';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export type RiskEvaluationTrigger = 'academic_update' | 'scheduled_job' | 'manual_review' | 'cross_client_sync';

export interface IRiskService {
  assessStudent(
    studentId: string,
    trigger?: RiskEvaluationTrigger,
    customConfig?: RiskConfigModel
  ): Promise<CurrentRiskStatus>;
  reevaluateRisk(
    studentId: string,
    triggerContext?: string
  ): Promise<CurrentRiskStatus>;
  getCurrentRisk(studentId: string): Promise<CurrentRiskStatus | null>;
  getRiskHistory(studentId: string): Promise<RiskAssessment[]>;
  getRecommendations(studentId: string): Promise<RecommendationItem[]>;
}

export class RiskService implements IRiskService {
  /**
   * Alias for assessStudent called by real-time sync and cross-session listeners
   */
  async reevaluateRisk(
    studentId: string,
    triggerContext: string = 'cross_client_sync'
  ): Promise<CurrentRiskStatus> {
    return this.assessStudent(studentId, 'cross_client_sync');
  }

  /**
   * Evaluates academic risk for a student, writes append-only assessment record,
   * and triggers alert delivery if criteria are met.
   */
  async assessStudent(
    studentId: string,
    trigger: RiskEvaluationTrigger = 'academic_update',
    customConfig?: RiskConfigModel
  ): Promise<CurrentRiskStatus> {
    const config = customConfig || DEFAULT_RISK_CONFIG;

    try {
      // 1. Fetch current semester
      let currentSemesterId = '2026-spring';
      try {
        const semSnap = await getDocs(collection(db, 'semesters'));
        semSnap.forEach((d) => {
          const sem = d.data();
          if (sem.isCurrent) currentSemesterId = d.id;
        });
      } catch (err) {
        console.warn('Using default semester fallback:', err);
      }

      // 2. Fetch student attendance records
      const attSnap = await getDocs(
        query(collection(db, 'attendanceRecords'), where('studentId', '==', studentId))
      );
      const attendanceRecords: any[] = [];
      attSnap.forEach((d) => attendanceRecords.push({ id: d.id, ...d.data() }));

      // 3. Fetch student marks
      const marksSnap = await getDocs(
        query(collection(db, 'marks'), where('studentId', '==', studentId))
      );
      const marks: any[] = [];
      marksSnap.forEach((d) => marks.push({ id: d.id, ...d.data() }));

      // 4. Fetch assessments
      const asmtSnap = await getDocs(collection(db, 'assessments'));
      const assessments: any[] = [];
      asmtSnap.forEach((d) => assessments.push({ id: d.id, ...d.data() }));

      // 5. Run Pure Deterministic Calculator
      const calcInput: RiskCalculationInput = {
        studentId,
        semesterId: currentSemesterId,
        attendanceRecords,
        marks,
        assessments,
      };

      const result: RiskCalculationResult = calculateRisk(calcInput, config);

      // 6. Write Append-Only Risk Assessment Document
      const now = getCurrentUtcIso();
      const assessmentDocId = `asmt_${studentId}_${Date.now()}`;

      const assessmentPayload: RiskAssessment & {
        structuredReasons: StructuredReason[];
        score: number | null;
        isSufficientData: boolean;
      } = {
        id: assessmentDocId,
        studentId,
        semesterId: currentSemesterId,
        riskLevel: result.riskLevel,
        score: result.score,
        attendancePercentage: result.metrics.attendancePercentage,
        marksAverage: result.metrics.marksAverage ?? 0,
        missingAssignmentsCount: result.metrics.missingAssignmentsCount,
        reasons: result.reasons,
        structuredReasons: result.structuredReasons,
        isSufficientData: result.isSufficientData,
        trigger,
        configVersion: config.version,
        computedAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system_risk_engine',
      };

      try {
        await setDoc(doc(db, 'riskAssessments', assessmentDocId), assessmentPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `riskAssessments/${assessmentDocId}`);
      }

      const status: CurrentRiskStatus = {
        studentId,
        semesterId: currentSemesterId,
        riskLevel: result.riskLevel,
        score: result.score,
        isSufficientData: result.isSufficientData,
        reasons: result.reasons,
        structuredReasons: result.structuredReasons,
        attendanceRate: result.metrics.attendancePercentage,
        marksAverage: result.metrics.marksAverage,
        missingAssignmentsCount: result.metrics.missingAssignmentsCount,
        computedAt: now,
        configVersion: config.version,
      };

      // 7. Trigger alert delivery if at risk
      if (result.riskLevel === 'Medium' || result.riskLevel === 'High') {
        await alertService.tryDeliverRiskAlert(studentId, status, assessmentDocId);
      }

      return status;
    } catch (err) {
      console.error(`RiskService.assessStudent error for ${studentId}:`, err);
      // Return safe fallback
      return {
        studentId,
        semesterId: '2026-spring',
        riskLevel: 'Low',
        score: null,
        isSufficientData: false,
        reasons: ['Assessment temporarily unavailable.'],
        structuredReasons: [],
        attendanceRate: 100,
        marksAverage: null,
        missingAssignmentsCount: 0,
        computedAt: getCurrentUtcIso(),
        configVersion: config.version,
      };
    }
  }

  /**
   * Fetches latest risk status for a student.
   * If none exists yet, triggers initial assessment.
   */
  async getCurrentRisk(studentId: string): Promise<CurrentRiskStatus | null> {
    try {
      const q = query(
        collection(db, 'riskAssessments'),
        where('studentId', '==', studentId)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        // Trigger initial assessment
        return await this.assessStudent(studentId, 'manual_review');
      }

      const docs: any[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      docs.sort((a, b) => b.computedAt.localeCompare(a.computedAt));

      const latest = docs[0];
      return {
        studentId: latest.studentId,
        semesterId: latest.semesterId || '2026-spring',
        riskLevel: latest.riskLevel || 'Low',
        score: latest.score ?? null,
        isSufficientData: latest.isSufficientData ?? true,
        reasons: latest.reasons || [],
        structuredReasons: latest.structuredReasons || [],
        attendanceRate: latest.attendancePercentage || 0,
        marksAverage: latest.marksAverage ?? null,
        missingAssignmentsCount: latest.missingAssignmentsCount || 0,
        computedAt: latest.computedAt || latest.createdAt,
        configVersion: latest.configVersion || '1.0.0',
      };
    } catch (err) {
      console.warn(`RiskService.getCurrentRisk error for ${studentId}:`, err);
      return null;
    }
  }

  /**
   * Fetches history of risk assessments for a student (audit trail)
   */
  async getRiskHistory(studentId: string): Promise<RiskAssessment[]> {
    try {
      const q = query(
        collection(db, 'riskAssessments'),
        where('studentId', '==', studentId)
      );
      const snap = await getDocs(q);
      const list: RiskAssessment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<RiskAssessment, 'id'>) }));
      return list.sort((a, b) => b.computedAt.localeCompare(a.computedAt));
    } catch (err) {
      console.warn(`RiskService.getRiskHistory error for ${studentId}:`, err);
      return [];
    }
  }

  /**
   * Generates actionable recommendations based on the student's risk profile
   */
  async getRecommendations(studentId: string): Promise<RecommendationItem[]> {
    const current = await this.getCurrentRisk(studentId);
    if (!current || !current.structuredReasons || current.structuredReasons.length === 0) {
      return generateRecommendations([]);
    }
    return generateRecommendations(current.structuredReasons);
  }
}

export const riskService = new RiskService();

// ==========================================
// Integration: Register Event Bus Listener
// Reassesses student on academic record changes with debouncing
// ==========================================
const debounceMap = new Map<string, NodeJS.Timeout>();

registerAcademicRecordListener(async (studentId, source) => {
  console.log(`[RiskEngineHook] Received academic change for ${studentId} from source: ${source}`);

  // Clear existing timer if burst updates occur
  const existingTimer = debounceMap.get(studentId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    debounceMap.delete(studentId);
    try {
      await riskService.assessStudent(studentId, 'academic_update');
      console.log(`[RiskEngineHook] Completed automatic reassessment for ${studentId}`);
    } catch (err) {
      console.error(`[RiskEngineHook] Error reassessing ${studentId}:`, err);
    }
  }, 1200); // 1.2 second debounce to bundle multiple grades/attendances

  debounceMap.set(studentId, timer);
});
