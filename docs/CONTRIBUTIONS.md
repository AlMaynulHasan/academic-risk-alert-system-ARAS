# Team Contributions & Module Breakdown

## Developer 1: Md. Al-Maynul Hasan
**Responsibilities**: Core Foundation, Auth, Student Module, Integration Lead.
- Repository foundation & folder taxonomy.
- Firebase Client SDK & Auth flow (Login, Registration, Protected Routing).
- Role-based routing table and RBAC state.
- `src/shared/` directory: base UI design system, types, Firebase connection, and shared hook definition.
- Student portal pages: Dashboard, Courses, Attendance, Marks, Academic Performance, Student Profile.
- AcademicRecordService implementation and data schemas for courses, semesters, enrollments, attendance, and marks.
- Integration coordination between modules.

## Developer 2: Md. Al Arafat abir
**Responsibilities**: Risk Engine, Alerts, Notifications & Reminders.
- Rule-based risk engine logic (Low, Medium, High) driven by configurable thresholds.
- `riskAssessments` calculation engine triggered by academic updates.
- Transparent textual reasons generation for risk flags.
- Notification center & in-app risk alerts for students and advisors.
- Monthly alert counters to prevent notification spam.
- Deadline and reminder tracking services.
- Actionable academic recommendations service.

## Developer 3: Abu Sayed
**Responsibilities**: Faculty & Advisor Dashboard, Feedback, Interventions.
- Teacher/advisor dashboard and student list view.
- Advisee scoping via `advisorAssignments`.
- Detailed student academic inspection view.
- Feedback logging mechanism (append-only).
- Structured academic intervention planning (reasons, goals, target dates).
- Intervention progress monitoring and follow-up logging.
- Pre vs. post intervention academic progress comparison metrics.

---

## Sprint Log: 2026-10-13 - Developer 1 (Md. Al-Maynul Hasan)
Completed implementation and verification of Core Application, Authentication, Student Management, and Integration Contracts:
- **Group A (Auth & Profile)**: Complete student registration flow with validation (name, email, student ID, department, level), secure password reset with generic non-enumerating messaging, password update with mandatory re-authentication, profile viewer and editor for permitted fields (display name, phone, emergency contact) with immutable academic fields.
- **Group B (Academic Data Layer)**: Implemented `AcademicRecordService` with full read methods and write methods for Developer 3 (`upsertAttendance`, `upsertMark`). Enforced attendance status enums, non-future attendance dates in `Asia/Dhaka`, mark boundary checks ($0 \le \text{mark} \le \text{maxMarks}$), null missing marks preservation, and integration hook `onAcademicRecordChanged(studentId, source)`.
- **Group C (Student Pages)**: Built Student Dashboard, Courses & Term switcher, Attendance tracking with low-attendance warnings and multi-parameter filters, Continuous Marks with "Not recorded" null badges, and Performance history with pure SVG charts computed via unit-tested mathematical functions. Integrated placeholders for Developer 2's Risk and Notification services with explicit "Not available yet" empty states.
- **Group D (Integration Contracts)**: Formalized `docs/CONTRACTS.md`, documented `docs/modules/student.md`, and deployed hardened Firestore Security Rules guaranteeing cross-student record isolation.

---

## Sprint Log: 2026-10-14 - Developer 2 (Md. Al Arafat abir)
Completed implementation and verification of Academic Risk Monitoring, Risk Assessment, Alerts, Notifications, Reminders, and Recommendations:
- **Step 1 (Scoring Design & Docs)**: Authored `docs/modules/risk.md` specifying inputs, provisional scoring formula v1.0.0, dynamic weight renormalization, missing data policy, threshold categorization (Low < 35, Medium 35-64, High >= 65), structured reason generation, and monthly alert concurrency invariants.
- **Step 2 (Pure Engine & Persistence)**: Implemented `calculateRisk(input, config)` as a pure deterministic function with no database dependencies in `src/modules/risk/engine/calculator.ts`. Implemented `RiskService.assessStudent(studentId, trigger)` in `src/shared/services/riskService.ts` storing append-only `riskAssessments` records and evaluating current standing without coercing missing marks to 0.
- **Step 3 (Triggers & Event Bus Integration)**: Registered debounced listener on `onAcademicRecordChanged(studentId, source)` hook to execute automatic reassessment upon attendance and mark entries without thrashing the database on rapid bursts.
- **Step 4 (Alerts & Monthly Rate Limit Concurrency)**: Implemented `AlertService.tryDeliverRiskAlert` utilizing Cloud Firestore atomic transactions (`runTransaction`) against `alertCounters/${studentId}_${YYYY-MM}` in the `Asia/Dhaka` timezone. Strictly enforced the maximum limit of 2 risk alerts per month under concurrency, implemented duplicate-unchanged suppression, ensured failed deliveries do not count against quota, and provided a clean email delivery stub interface.
- **Step 5 (Reminders & Recommendations)**: Implemented `dispatchDeadlineReminders` for assessments due within 72h/24h (which do not consume risk alert quota). Built `generateRecommendations` pure function mapping structured risk reasons into actionable guidance items with explicit priorities.
- **Step 6 (UI Implementation)**: Built comprehensive `StudentNotificationsPage` in `src/modules/risk/pages` featuring monthly quota tracking, categorized alert/deadline/recommendation tabs, transparent reason breakdowns, manual re-evaluation triggers, and real-time alert acknowledgement.
- **Step 7 (Automated Test Suite)**: Authored and verified `scripts/testRiskEngine.ts` covering 25 test assertions across pure scoring, boundary cases (34.9 vs 35.0, 64.9 vs 65.0), missing data policies, arbitrary subset weight renormalization, 10-worker parallel concurrency simulation enforcing the monthly rate limit invariant, and idempotency suppression.

---

## Sprint Log: 2026-10-14 - Developer 3 (Abu Sayed)
Completed implementation and verification of Teacher/Advisor Dashboard, Feedback, Academic Interventions, Follow-Up Tracking, and Progress Comparison:
- **Group A (Teacher Dashboard & Advisee Triage)**:
  - Built `TeacherDashboardPage` (`/teacher/dashboard`) featuring advisee summary stat cards, active interventions count, and an interactive Advisee Risk Triage table scoped strictly to `advisorAssignments`.
  - Implemented `TeacherStudentsPage` (`/teacher/students`) advisee directory with search, risk level filtering (`All`, `High`, `Medium`, `Low`, `Insufficient data`), and sorting (Risk priority, Lowest attendance, Student name, Latest assessment).
  - Built `StudentDetailPage` (`/teacher/students/:id`) with advisor authorization gatekeeper, live risk profile banner, transparent risk reason breakdowns, manual risk re-evaluation trigger, and 4 dedicated sub-tabs (Overview, Records, Interventions, Feedback).
  - **Critical Invariant Enforced**: Students with Insufficient Data (< 2 components evaluated) are strictly displayed as `"Insufficient Data"` with neutral badge, never as `"Low"`.
- **Group B (Academic Record Updates)**:
  - Built `AttendanceEntryModal` and `MarksEntryModal` calling `academicRecordService.upsertAttendance` and `academicRecordService.upsertMark`.
  - Validated attendance status enums, date formatting, and strictly prohibited future attendance dates in `Asia/Dhaka`.
  - Enforced mark boundary checks ($0 \le \text{mark} \le \text{maxMarks}$) and preserved missing marks strictly as `null` (never coerced to `0`).
  - Recorded acting faculty UID in `createdBy` / `updatedBy`.
  - Dispatched `onAcademicRecordChanged(studentId, source)` hook triggering automated background risk reassessment with live UI feedback.
- **Group C (Advising Feedback)**:
  - Built `FeedbackSection` providing append-only faculty advising notes with timestamp, category, and acting teacher identity.
  - Implemented `isPrivateToFaculty` privacy toggle to distinguish internal faculty discussions from student-visible advising notes.
  - Guaranteed audit trail preservation by enforcing `allow update, delete: if false` in Firestore rules.
- **Group D (Academic Interventions)**:
  - Implemented `CreateInterventionModal` and `InterventionService.createIntervention` to schedule structured academic recovery plans with target review dates.
  - Built status transition tracking (`statusHistory`) recording the actor UID, timestamp, and notes for every status change (`open`, `in_progress`, `resolved`, `completed`, `escalated`, `cancelled`).
  - Automatically dispatched in-app advising notifications to students upon plan initiation.
- **Group E (Follow-ups & Progress Comparison)**:
  - Built `AddFollowUpModal` and `InterventionService.addFollowUp` logging meeting notes, outcomes, and completion status.
  - Built pure progress comparison engine `calculateProgressComparison` in `src/modules/teacher/progressComparison.ts` partitioning attendance and marks into pre-intervention and post-intervention windows.
  - **Strict Missing Data Invariant**: If either observation window has fewer than 1 attendance record or 0 evaluated marks, verdict is strictly `"Not enough data to compare"`. Missing marks are NEVER presented as improvement.
  - Implemented `ProgressComparisonCard` component visualizing pre vs. post metrics, attendance delta, marks delta, and deterministic verdicts.
- **Group F (Authorization & Security Rules)**:
  - Enforced server/service authorization via `InterventionService.checkAdvisorAuthorization` ensuring faculty may only inspect and intervene on advisees mapped in `advisorAssignments`.
  - Verified that students are completely blocked from executing any teacher write operations.
  - Deployed route guard protection via `ProtectedRoute allowedRoles={['teacher', 'admin']}`.
- **Automated Verification**:
  - Authored and executed `scripts/testProgressComparison.ts` with 26 passing assertions.
  - Verified all existing suites: `testRiskEngine.ts` (25/25), `verifyRulesLogic.ts` (7/7), `testValidation.ts` (8/8), `testChartMath.ts` (19/19).
  - Verified 0 compile errors and 0 lint warnings across the entire codebase.


