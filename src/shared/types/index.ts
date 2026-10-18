/**
 * Academic Risk Alert System - Shared Types
 * Master types shared across all developer modules.
 */

export type UserRole = 'student' | 'teacher' | 'admin' | 'university_admin' | 'dept_admin' | 'advisor';

export interface User {
  id: string; // Auth UID
  email: string;
  displayName: string;
  role: UserRole;
  departmentId?: string;
  assignedDepartment?: string;
  designation?: string;
  employeeId?: string;
  phone?: string;
  officeRoom?: string;
  advisorSectionIds?: string[];
  avatarUrl?: string;
  createdAt: string; // UTC ISO 8601
  updatedAt: string; // UTC ISO 8601
}

export interface StudentProfile {
  id: string;
  studentId: string; // University roll / reg id, e.g., CSE-2022-041
  userId: string; // Auth UID
  department: string;
  batch: string;
  level?: string; // Academic level, e.g., 'Level 3, Term 1'
  currentSemesterId: string;
  cgpa: number | null;
  phone?: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdvisorAssignment {
  id: string;
  teacherId: string; // Teacher Auth UID
  studentId: string; // Student Auth UID
  assignedDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  isClosed?: boolean; // When true, ordinary new entries are locked
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  department: string;
  isActive?: boolean; // Lifecycle flag: active / deactivated
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Department {
  id: string;
  code: string; // e.g., 'CSE', 'EEE', 'ME'
  name: string; // e.g., 'Computer Science & Engineering'
  headOfDeptId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CourseOffering {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  semesterId: string;
  section: string; // e.g., 'A', 'B'
  teacherIds: string[]; // Assigned faculty UIDs
  advisorIds?: string[];
  capacity?: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface StudentInvitation {
  id: string; // Token ID / Document ID
  token: string; // Unique activation token
  officialStudentId: string; // University Roll/Reg ID, e.g. 'CSE-2022-041'
  displayName?: string; // Student Full Name pre-registered by Admin
  email: string;
  department: string;
  batch: string;
  section?: string;
  level?: string;
  phone?: string;
  advisorId?: string;
  status: 'pending' | 'claimed' | 'expired' | 'revoked';
  expiresAt: string; // ISO 8601
  claimedAt?: string;
  claimedByUid?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface AttendanceSession {
  id: string;
  courseOfferingId?: string;
  courseId: string;
  semesterId: string;
  section?: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  status: 'draft' | 'published' | 'cancelled';
  publishedAt?: string;
  auditTrail?: Array<{
    timestamp: string;
    actorUid: string;
    action: string;
    details?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditCorrectionRecord {
  id: string;
  entityType: 'attendance' | 'mark' | 'assessment';
  recordId: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  actorUid: string;
  timestamp: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseOfferingId?: string; // Links directly to specific CourseOffering
  semesterId: string;
  status: 'enrolled' | 'dropped' | 'completed';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EnrollmentSummary {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  courseOfferingId?: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  semesterId: string;
  status: Enrollment['status'];
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  courseOfferingId?: string;
  sessionId?: string; // Reference to AttendanceSession
  date: string; // YYYY-MM-DD in Asia/Dhaka
  status: AttendanceStatus;
  isPublished?: boolean; // Whether the record is published to official standing
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AssessmentType = 'quiz' | 'assignment' | 'midterm' | 'final' | 'project';

export interface Assessment {
  id: string;
  courseId: string;
  courseOfferingId?: string; // Associated CourseOffering
  semesterId: string;
  title: string;
  type: AssessmentType;
  maxMarks: number;
  weightage: number; // percentage
  dueDate: string; // UTC ISO
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Mark {
  id: string;
  assessmentId: string;
  studentId: string;
  enrollmentId: string;
  obtainedMarks: number | null; // null = missing/unentered; 0 = graded zero
  status?: 'draft' | 'published';
  isPublished?: boolean;
  submittedAt: string | null;
  gradedAt: string | null;
  gradedBy?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Deadline {
  id: string;
  courseId: string;
  semesterId?: string; // Linked academic semester
  assessmentId?: string | null; // Optional linked assessment
  title: string;
  description: string;
  dueDate: string; // UTC ISO
  type: 'assignment' | 'project' | 'quiz';
  isActive?: boolean; // Lifecycle flag: active / deactivated
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RiskConfig {
  id: string;
  version: string;
  attendanceThresholdMedium: number; // e.g. 75
  attendanceThresholdHigh: number; // e.g. 60
  marksThresholdMedium: number; // e.g. 50
  marksThresholdHigh: number; // e.g. 40
  missingSubmissionsLimit: number; // e.g. 2
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface RiskAssessment {
  id: string;
  studentId: string;
  semesterId: string;
  riskLevel: RiskLevel;
  score?: number | null;
  attendancePercentage: number;
  marksAverage: number;
  missingAssignmentsCount: number;
  reasons: string[]; // Transparent textual reasons
  structuredReasons?: any[];
  isSufficientData?: boolean;
  trigger: 'academic_update' | 'scheduled_job' | 'manual_review' | 'cross_client_sync';
  configVersion: string;
  computedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AlertDelivery {
  id: string;
  studentId: string;
  riskAssessmentId: string;
  riskLevel: 'Medium' | 'High';
  channel: 'in_app' | 'email';
  status: 'pending' | 'delivered' | 'failed' | 'acknowledged';
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AlertCounter {
  id: string; // Format: ${studentId}_${YYYY-MM}
  studentId: string;
  period: string; // YYYY-MM
  inAppCount: number;
  emailCount: number;
  lastDispatchedAt: string;
  lastRiskLevel?: RiskLevel;
  lastAssessmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationCategory = 'risk_alert' | 'assignment' | 'attendance' | 'intervention' | 'general';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  teacherId: string;
  teacherName?: string;
  courseId: string | null;
  category: 'academic' | 'attendance' | 'behavioral' | 'general';
  comment: string;
  isPrivateToFaculty: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type InterventionStatus = 'open' | 'in_progress' | 'resolved' | 'completed' | 'cancelled' | 'escalated';

export interface InterventionStatusHistoryEntry {
  status: InterventionStatus;
  changedAt: string;
  changedBy: string;
  notes?: string;
}

export interface Intervention {
  id: string;
  studentId: string;
  teacherId: string;
  teacherName?: string;
  courseId?: string | null;
  reason: string;
  actionPlan: string;
  targetDate: string; // YYYY-MM-DD
  status: InterventionStatus;
  statusHistory?: InterventionStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface FollowUp {
  id: string;
  interventionId: string;
  studentId?: string;
  teacherId: string;
  progressNotes: string;
  statusUpdate: InterventionStatus;
  meetingDate: string; // YYYY-MM-DD
  notes?: string;
  date?: string;
  status?: InterventionStatus;
  outcome?: string;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProgressWindowMetrics {
  windowLabel: string;
  totalAttendance: number;
  attendedAttendance: number;
  attendancePercentage: number | null;
  marksCount: number;
  marksAverage: number | null;
}

export interface StudentProgressComparison {
  studentId: string;
  interventionId: string;
  preInterventionRisk: RiskLevel | 'Insufficient data';
  currentRisk: RiskLevel | 'Insufficient data';
  attendanceDelta: number | null;
  marksDelta: number | null;
  hasSufficientData: boolean;
  message?: string;
  preMetrics: ProgressWindowMetrics;
  postMetrics: ProgressWindowMetrics;
  verdict: 'Improved' | 'Stable' | 'Declined' | 'Not enough data to compare';
}

export interface AssignedAdvisee {
  assignmentId: string;
  studentId: string; // User UID
  displayName: string;
  email: string;
  rollNumber: string; // e.g. CSE-2022-041
  department: string;
  batch: string;
  level?: string;
  cgpa: number | null;
  assignedDate: string;
  currentRiskLevel: RiskLevel | 'Insufficient data';
  riskScore: number | null;
  reasons: string[];
  riskComputedAt?: string;
  attendancePercentage: number;
  totalClasses: number;
  attendedClasses: number;
  marksAverage: number | null;
  activeInterventionsCount: number;
}

export interface AuthState {
  user: User | null;
  firebaseUser: import('firebase/auth').User | null;
  loading: boolean;
  role: UserRole | null;
}
