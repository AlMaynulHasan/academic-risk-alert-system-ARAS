# Teacher & Advisor Dashboard, Interventions & Progress Tracking Module
**Author & Owner**: Developer 3: Abu Sayed  
**Status**: Implemented & Verified (Groups A, B, C, D, E, F)  
**Design Philosophy**: Authorization as a backend problem; strict missing-data integrity; append-only audit preservation; transparent advising workflows.

---

## 1. Overview & Architectural Scope
The Teacher and Advisor module (`src/modules/teacher/` and `src/shared/services/interventionService.ts`) provides faculty advisors with high-confidence tools to monitor assigned advisees, evaluate risk alerts, update continuous academic records, log advising feedback notes, initiate targeted intervention plans, and measure before/after recovery metrics.

---

## 2. Implemented Groups & Specifications

### Group A: Teacher & Advisor Dashboard
- **Advisee Overview Dashboard (`/teacher/dashboard`)**:
  - Summarizes key cohort metrics: Total Assigned Advisees, High Risk Advisees, Medium Risk Advisees, and Active Interventions.
  - **Advisee Risk Triage Table**:
    - Scoped strictly to advisees linked through the `advisorAssignments` collection.
    - Live risk level badges: High (Red AlertOctagon), Medium (Amber AlertTriangle), Low (Green CheckCircle), and Insufficient Data (Slate HelpCircle).
    - **Invariant Enforced**: Students with Insufficient Data (< 2 components evaluated) are strictly displayed as `"Insufficient Data"`, never as `"Low"`.
    - Real-time search by student name or roll ID (e.g. `CSE-2022-041`).
    - Filter by risk severity (`All`, `High`, `Medium`, `Low`, `Insufficient data`).
    - Displays overall attendance % (< 75% highlighted in red), continuous marks average, and primary risk warning triggers.
    - Direct drill-down to deep-dive review.
- **Assigned Advisees Roster (`/teacher/students`)**:
  - Filterable, sortable cohort table with compact rows and tabular figures.
  - Sorting support: Risk Priority (High first), Attendance Rate (Lowest first), Student Name (A-Z), and Latest Assessment Timestamp.
- **Advisee Detail Page (`/teacher/students/:id`)**:
  - **Access Gatekeeper**: Verifies active assignment in `advisorAssignments`. Unauthorized faculty are rejected with an explicit Access Denied state.
  - **Live Risk Banner**: Displays current risk level, numeric score, assessment timestamp, transparent reasons, and a manual "Re-evaluate Risk Now" trigger.
  - Tabbed interface:
    1. *Overview & Recommendations*: Attendance and marks KPIs, low-attendance alert banner (<75%), registered courses load, actionable recommendations, and risk assessment history timeline.
    2. *Academic Records Entry*: Full attendance logs and marks evaluations with interactive entry and editing modals.
    3. *Interventions & Progress*: Recovery plans, status history, follow-up logs, and before/after comparison cards.
    4. *Advisor Feedback*: Append-only faculty advising notes.

### Group B: Academic Record Updates
- **Attendance Entry & Editing (`AttendanceEntryModal`)**:
  - Direct calls to `academicRecordService.upsertAttendance(...)`.
  - Input validation: status enum (`present`, `absent`, `late`, `excused`), date format in `Asia/Dhaka`, strictly forbids future dates.
  - Automatically records acting faculty UID in `createdBy` / `updatedBy`.
  - Dispatches `onAcademicRecordChanged(studentId, 'attendance')` to trigger background risk recalculation.
- **Marks Evaluation Entry (`MarksEntryModal`)**:
  - Direct calls to `academicRecordService.upsertMark(...)`.
  - Input validation: verifies assessment existence, ensures $0 \le \text{obtainedMarks} \le \text{maxMarks}$.
  - **Missing Marks Semantics**: Checkbox for "Unrecorded / Not Submitted (Missing)" stores `obtainedMarks` strictly as `null`. A score of `0` denotes an evaluated zero, whereas `null` is omitted from continuous averages.
  - Dispatches `onAcademicRecordChanged(studentId, 'mark')` to trigger background risk recalculation.

### Group C: Faculty Feedback Log (`FeedbackSection`)
- **Append-Only Advising Notes**:
  - Direct calls to `interventionService.addFeedback(...)`.
  - Stored in the `feedback` collection with `studentId`, `teacherId`, `teacherName`, `category`, `comment`, `isPrivateToFaculty`, `createdAt`, `updatedAt`, and `createdBy`.
  - Silent overwrite and deletion are strictly prohibited by Security Rules (`allow update, delete: if false`).
  - **Privacy Control**: `isPrivateToFaculty` flag hides sensitive faculty observations from the student portal while displaying them to advisors and administrators.
  - Non-private notes automatically generate student advising notifications.

### Group D: Academic Interventions (`CreateInterventionModal`)
- **Structured Recovery Plans**:
  - Direct calls to `interventionService.createIntervention(...)`.
  - Schema: `studentId`, `teacherId`, `reason`, `actionPlan`, `targetDate`, `status`, `statusHistory`, `createdAt`, `updatedAt`, `createdBy`.
  - Permitted statuses: `'open' | 'in_progress' | 'resolved' | 'completed' | 'cancelled' | 'escalated'`.
  - **Status History Audit Trail**: Appends chronological status transition records (`status`, `changedAt`, `changedBy`, `notes`) whenever an intervention is updated or a follow-up is logged.
  - Dispatches student in-app notification alerting the advisee of the scheduled recovery plan.

### Group E: Follow-ups & Before/After Progress Comparison
- **Follow-Up Advising Sessions (`AddFollowUpModal`)**:
  - Direct calls to `interventionService.addFollowUp(...)`.
  - Appends to `followUps` collection with meeting date, progress notes, status update, outcome, and completion status.
  - Automatically updates parent intervention status and appends to `statusHistory`.
- **Pure Progress Comparison Engine (`src/modules/teacher/progressComparison.ts`)**:
  - Computes chronological pre-intervention and post-intervention metric deltas around the intervention date.
  - **Strict Missing Data Invariant**: If either window has fewer than 1 attendance record or 0 evaluated marks, verdict is strictly `"Not enough data to compare"`.
  - **Anti-Coercion Guard**: Missing marks (`null`) are NEVER coerced to 0 and NEVER presented as improvement.
  - Evaluates deterministic verdicts:
    - `"Improved"`: Attendance delta $> 0$ and marks delta $\ge 0$ (or vice versa).
    - `"Declined"`: Attendance delta $< -3\%$ or marks delta $< -3\%$.
    - `"Stable"`: Metric variations within neutral thresholds.
    - `"Not enough data to compare"`: Data missing in either observation window.

### Group F: Authorization & Security
- **Advisor Scope Enforcement**:
  - Server/Service layer check: `interventionService.checkAdvisorAuthorization(teacherId, studentId)` validates existence of an active document in `advisorAssignments`.
  - Unauthorized faculty attempts throw `AUTHORIZATION_ERROR` and render the Access Denied UI.
- **Firestore Security Rules**:
  - `interventions`, `feedback`, `followUps`, `attendanceRecords`, `marks`:
    - Students are denied write permissions (`allow write: if isTeacher() || isAdmin()`).
    - Faculty write permissions require `isTeacher()` role verification from the `users` collection.
  - `feedback` and `followUps` enforce `allow update, delete: if false` (append-only).
- **Route Guard**:
  - Client-side convenience route protection via `ProtectedRoute allowedRoles={['teacher', 'admin']}` in `src/App.tsx`.

---

## 3. Automated Test Verification Results
- `scripts/testProgressComparison.ts`: **26/26 tests passed (0 failures)**.
  - Pre/post window chronological partitioning.
  - Window attendance and marks calculation.
  - Missing marks exclusion (null not treated as 0).
  - Insufficient post-window attendance -> "Not enough data to compare".
  - Missing post-window marks -> "Not enough data to compare" (never presented as improvement).
  - Genuine improvement delta calculation (+50% att, +40% marks).
  - Genuine decline delta calculation (-100% att, -50% marks).
  - Empty arrays edge cases.
- `scripts/testRiskEngine.ts`: **25/25 tests passed (0 failures)**.
- `scripts/verifyRulesLogic.ts`: **7/7 tests passed (0 failures)**.
- `scripts/testValidation.ts`: **8/8 tests passed (0 failures)**.
- `scripts/testChartMath.ts`: **19/19 tests passed (0 failures)**.
- `compile_applet` & `lint_applet`: **0 errors, clean build**.
