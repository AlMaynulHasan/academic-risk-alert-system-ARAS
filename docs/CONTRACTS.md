# Cross-Module Service Contracts

This document formalizes the software interfaces and shared hooks between Developer 1 (Core & Student), Developer 2 (Risk & Alerts), and Developer 3 (Teacher & Interventions). Each developer's module interacts exclusively through these defined contracts.

---

## 1. Global Change Hooks
**Location**: `src/shared/services/hooks.ts`

When any academic record is inserted or updated by Developer 1 (or by Developer 3 through AcademicRecordService), the shared hook is triggered:

```typescript
export type AcademicRecordSource = 'attendance' | 'mark' | 'assessment' | 'enrollment';

export interface AcademicRecordChangeHook {
  (studentId: string, source: AcademicRecordSource): Promise<void>;
}

// Function to register background recalculation listeners:
export function registerAcademicRecordListener(
  listener: (studentId: string, source: AcademicRecordSource) => Promise<void>
): () => void;

// Function invoked on successful database write:
export function onAcademicRecordChanged(studentId: string, source: AcademicRecordSource): Promise<void>;
```

**Developer 2 Obligation**:
Developer 2 MUST register the risk evaluation runner using `registerAcademicRecordListener` so that attendance or grade updates recalculate the student's risk profile automatically.

---

## 2. AcademicRecordService Contract (IMPLEMENTED by Developer 1)
**Owner**: Developer 1 (Md. Al-Maynul Hasan)  
**Location**: `src/shared/services/academicRecordService.ts`

```typescript
export interface EnrollmentSummary {
  enrollmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  semesterId: string;
  status: 'enrolled' | 'dropped' | 'completed';
}

export interface AttendanceSummary {
  studentId: string;
  courseId?: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  records: AttendanceRecord[];
}

export interface MarksSummary {
  studentId: string;
  courseId: string;
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number | null; // Strictly null if no marks recorded; never coerced to 0
  missingCount: number;
  items: Array<{
    assessment: Assessment;
    mark: Mark | null;
  }>;
}

export interface IAcademicRecordService {
  // Semesters CRUD
  getSemesters(): Promise<Semester[]>;
  createSemester(semester: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'admin' }): Promise<string>;
  updateSemester(semesterId: string, updates: Partial<Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>>, actor?: { uid: string; role: 'admin' }): Promise<void>;
  setCurrentSemester(semesterId: string, actor?: { uid: string; role: 'admin' }): Promise<void>;

  // Courses CRUD
  getCourses(includeInactive?: boolean): Promise<Course[]>;
  getCourse(courseId: string): Promise<Course | null>;
  createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<string>;
  updateCourse(courseId: string, updates: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<void>;
  setCourseActive(courseId: string, isActive: boolean, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<void>;

  // Enrollments CRUD
  getEnrollments(studentId: string, semesterId?: string): Promise<EnrollmentSummary[]>;
  getAllEnrollments(semesterId?: string, courseId?: string): Promise<EnrollmentSummary[]>;
  createEnrollment(enrollment: Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'admin' }): Promise<string>;
  updateEnrollmentStatus(enrollmentId: string, status: 'enrolled' | 'dropped' | 'completed', actor?: { uid: string; role: 'admin' }): Promise<void>;

  // Assessments CRUD
  getAssessments(courseId?: string, semesterId?: string): Promise<Assessment[]>;
  createAssessment(assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<string>;
  updateAssessment(assessmentId: string, updates: Partial<Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<void>;
  deleteAssessment(assessmentId: string, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<void>;

  // Deadlines CRUD
  getDeadlines(studentId: string): Promise<Deadline[]>; // Scoped to student's active enrollments
  getAllDeadlines(courseId?: string, semesterId?: string): Promise<Deadline[]>;
  createDeadline(deadline: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<string>;
  updateDeadline(deadlineId: string, updates: Partial<Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<void>;
  setDeadlineActive(deadlineId: string, isActive: boolean, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<void>;

  // Academic Records
  getAttendance(studentId: string, courseId?: string): Promise<AttendanceSummary>;
  getMarks(studentId: string, courseId?: string): Promise<MarksSummary>;
  getStudentProfile(studentId: string): Promise<StudentProfile | null>;
  upsertAttendance(record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<string>;
  upsertMark(record: Omit<Mark, 'id' | 'createdAt' | 'updatedAt'>, actor?: { uid: string; role: 'teacher' | 'admin' }): Promise<string>;
}
```

### Detailed Method Specifications for Developer 3:

#### `upsertAttendance`
```typescript
upsertAttendance(
  record: {
    enrollmentId: string;
    studentId: string;
    courseId: string;
    date: string; // YYYY-MM-DD in Asia/Dhaka local calendar
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
    createdBy?: string;
  },
  actor?: { uid: string; role: 'teacher' | 'admin' }
): Promise<string> // Returns document ID
```
- **Validation Rules**:
  - `status` MUST be one of: `'present'`, `'absent'`, `'late'`, `'excused'`. Throws `VALIDATION_ERROR` otherwise.
  - `date` MUST match `^\d{4}-\d{2}-\d{2}$` in `Asia/Dhaka` timezone.
  - `date` CANNOT be in the future (relative to current date in `Asia/Dhaka`). Throws `VALIDATION_ERROR` otherwise.
- **Side Effects**:
  - Automatically writes or merges doc with ID `att_${studentId}_${courseId}_${date}` in `attendanceRecords`.
  - Invokes `await onAcademicRecordChanged(studentId, 'attendance')`.

#### `upsertMark`
```typescript
upsertMark(
  record: {
    assessmentId: string;
    studentId: string;
    enrollmentId: string;
    obtainedMarks: number | null; // Pass null for unrecorded/missing mark; 0 is an evaluated zero
    submittedAt?: string | null;
    gradedAt?: string | null;
    gradedBy?: string;
    feedback?: string;
  },
  actor?: { uid: string; role: 'teacher' | 'admin' }
): Promise<string> // Returns document ID
```
- **Validation Rules**:
  - `assessmentId`, `studentId`, `enrollmentId` are required. Throws `VALIDATION_ERROR` otherwise.
  - Looks up assessment; throws `NOT_FOUND` if `assessmentId` does not exist in `assessments`.
  - If `obtainedMarks` is a number: MUST be $\ge 0$ and $\le assessment.maxMarks$. Throws `VALIDATION_ERROR` otherwise.
  - If mark is unrecorded or unsubmitted: MUST be passed as `null`. NEVER coerce missing marks to `0`.
- **Side Effects**:
  - Automatically writes or merges doc with ID `mrk_${studentId}_${assessmentId}` in `marks`.
  - Invokes `await onAcademicRecordChanged(studentId, 'mark')`.

---

## 3. RiskService Contract (To be implemented by Developer 2)
**Owner**: Developer 2 (Md. Al Arafat abir)  
**Location**: `src/shared/services/riskService.ts`

```typescript
export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface CurrentRiskStatus {
  studentId: string;
  riskLevel: RiskLevel;
  reasons: string[]; // Transparent rule-based explanations (e.g. "Attendance < 60%")
  attendanceRate: number;
  marksAverage: number;
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

export interface IRiskService {
  assessStudent(studentId: string, trigger: 'academic_update' | 'scheduled_job' | 'manual_review'): Promise<CurrentRiskStatus>;
  getCurrentRisk(studentId: string): Promise<CurrentRiskStatus | null>;
  getRiskHistory(studentId: string): Promise<RiskAssessment[]>;
  getRecommendations(studentId: string): Promise<RecommendationItem[]>;
}
```

---

## 4. AlertService & NotificationService Contract (To be implemented by Developer 2)
**Owner**: Developer 2 (Md. Al Arafat abir)  
**Location**: `src/shared/services/alertService.ts`

```typescript
export interface IAlertService {
  tryDeliverRiskAlert(studentId: string, riskStatus: CurrentRiskStatus): Promise<{ delivered: boolean; reason?: string }>;
  listAlerts(studentId: string): Promise<AlertDelivery[]>;
  acknowledgeAlert(alertId: string, studentId: string): Promise<void>;
}

export interface INotificationService {
  listNotifications(userId: string): Promise<Notification[]>;
  markRead(notificationId: string, userId: string): Promise<void>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
}
```

---

## 5. InterventionService Contract (IMPLEMENTED by Developer 3)
**Owner**: Developer 3 (Abu Sayed)  
**Location**: `src/shared/services/interventionService.ts`

```typescript
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
```

### Pure Comparison Engine:
- **Location**: `src/modules/teacher/progressComparison.ts`
- **Signature**: `calculateProgressComparison(input: ProgressComparisonInput): StudentProgressComparison`
- **Unit Tests**: `scripts/testProgressComparison.ts` (26 passing assertions).
- **Invariants**:
  - Requires $\ge 1$ attendance record and $\ge 1$ evaluated mark in BOTH pre-intervention and post-intervention windows.
  - If either window lacks data, verdict is strictly `'Not enough data to compare'`.
  - Missing marks (`null`) are NEVER coerced to `0` and NEVER presented as improvement.

---

## 6. Pure Calculation Functions (Developer 1)
**Location**: `src/shared/utils/chartMath.ts`

```typescript
export function computeCourseMarksTrend(
  marks: Mark[],
  assessments: Assessment[]
): CoursePerformanceSummary;

export function computeAttendanceTrend(
  records: AttendanceRecord[]
): AttendanceTrendPoint[];
```
- Fully unit-tested in `scripts/testChartMath.ts` (19 passing assertions).
- Handles empty arrays, preserves null missing marks, excludes null from average calculations.
