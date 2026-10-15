# Academic Risk Alert System — Business Rules & Phased Implementation Plan

## Executive Summary
This document formalizes the complete business rules, domain architecture, access control policies, risk calculation mathematics, alert quota boundaries, and a phased, non-breaking implementation roadmap for the **Academic Risk Alert System (ARAS)**.

This specification builds upon the existing, fully operational system (which currently has 42 verified features and 221 passing automated assertions across 9 test suites) and establishes the target multi-role, departmental, and administrative pre-registration model without breaking existing workflows.

---

## 1. Comprehensive System Audit: Current State vs. Target State

| Dimension | Current Implementation (Existing Codebase) | Target Architecture (Finalized Business Rules) | Compatibility / Migration Strategy |
|---|---|---|---|
| **Role Model** | 3 roles: `student`, `teacher`, `admin` stored in `users/{uid}.role`. | 5 roles: `university_admin`, `dept_admin`, `teacher` (Course Teacher), `advisor`, `student`. | Backward-compatible union: Map `admin` $\to$ `university_admin`, allow `dept_admin`, preserve `teacher` and `advisor` flags, keep `student`. |
| **User Scope** | Global admin; Teacher restricted by `advisorAssignments`; Student restricted to own UID. | University Admin (global); Dept Admin (assigned department only); Teacher (assigned course offerings); Advisor (assigned advisees/sections); Student (own records). | Add `department` to admin users; add `teacherIds` and `section` to course offerings; maintain existing `advisorAssignments` for individual advising. |
| **Student Registration** | Open `/register` flow creates auth credentials, `users` doc, and `studentProfiles` doc directly. | Admin pre-provisions official student profile; system issues expiring activation invite; student links Firebase Auth UID. | Introduce `studentInvitations` collection and token activation endpoint. Existing student profiles remain valid. |
| **Student Identity Lock** | Profile edit UI prevents changing `studentId` and `department`. Security rules enforce non-mutation of `role`. | Strict separation of auth identity vs. academic record; student cannot alter ID, department, batch, or enrollments. | Enforce via Firestore Security Rules and server-side linking transaction. |
| **Academic Structure** | `semesters` $\to$ `courses` $\to$ `enrollments` + `assessments`. Implicit offering = `(courseId, semesterId)`. | `University` $\to$ `Departments` $\to$ `Semesters` $\to$ `Courses` $\to$ `Course Offerings` (section, teachers) $\to$ `Enrollments`. | Formalize `courseOfferings` collection; map legacy `(courseId, semesterId)` enrollments seamlessly via fallback adapter. |
| **Attendance Semantics** | `present` (1.0), `late` (0.5), `excused` (1.0), `absent` (0.0). Date in `Asia/Dhaka`. | Preserved exactly. Verified with 100% non-future date validation in Dhaka timezone. | Zero breaking changes. |
| **Marks Semantics** | `obtainedMarks: number \| null`. Null strictly = unrecorded/missing; 0 = graded zero. | Preserved exactly. Positive `maxMarks`, weights $0-100\%$, continuous average excludes nulls. | Zero breaking changes. |
| **Risk Engine** | Pure deterministic formula v1.0.0 (Weights: Att 35%, Marks 35%, Comp 15%, Trend 15%). 2-component minimum. | Preserved exactly. Low (<35), Medium (35-64.9), High ($\ge$65). Insufficient Data if <2 components. | Zero breaking changes. Fully verified in unit and E2E suites. |
| **Alert Quota** | Max 2 alerts/student/month in `Asia/Dhaka`. Server-side trusted boundary (`/api/alerts/deliver`, Cloud Function). | Preserved exactly. Strict atomic increment, duplicate suppression, deadline reminder isolation. | Zero breaking changes. |
| **Interventions** | `interventions`, append-only `followUps`, append-only `feedback`, before/after progress comparison engine. | Preserved exactly. Multi-faculty visibility with private faculty notes control (`isPrivateToFaculty`). | Zero breaking changes. |

---

## 2. Finalized Business Rules

### A. Roles and Access Control Hierarchy

The system defines five primary operational roles:

```
                      ┌──────────────────────┐
                      │   University Admin   │  (Global institutional administration)
                      └──────────┬───────────┘
                                 │
                      ┌──────────▼───────────┐
                      │   Department Admin   │  (Scoped to single department)
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
┌────────▼──────────┐                         ┌──────────▼──────────┐
│  Course Teacher   │                         │   Faculty Advisor   │
│ (Course Offerings)│                         │(Advisees & Sections)│
└────────┬──────────┘                         └──────────┬──────────┘
         │                                               │
         └───────────────────────┬───────────────────────┘
                                 │
                      ┌──────────▼───────────┐
                      │       Student        │  (Own profile & records only)
                      └──────────────────────┘
```

#### 1. University Admin (`university_admin` / `admin`)
- **Scope**: Entire institution across all departments.
- **Capabilities**:
  - Manage all user accounts and assign/promote any role.
  - Create and configure departments, academic terms, and semesters.
  - Configure institutional risk configuration thresholds and alert policies.
  - View university-wide risk analytics and system audit trails.

#### 2. Department Admin (`dept_admin`)
- **Scope**: Strictly limited to their assigned department (e.g., `CSE`, `EEE`, `BBA`).
- **Capabilities**:
  - Pre-register official student records for their department.
  - Dispatch student account activation invitations.
  - Manage course catalog entries, course offerings, and semester schedules within their department.
  - Assign course teachers to course offerings and faculty advisors to student sections/cohorts.
  - View department-level risk dashboards and monitor unresolved interventions.
- **Restrictions**: Cannot read or modify records of other departments. Cannot alter system-wide risk configuration.

#### 3. Course Teacher (`course_teacher` / `teacher`)
- **Scope**: Assigned course offerings in active/past semesters.
- **Capabilities**:
  - Create assessments (quizzes, assignments, midterms, finals) for their assigned course offerings.
  - Record and update daily attendance for enrolled students.
  - Enter and adjust marks for assessments (strictly respecting null vs. zero semantics).
  - Post course deliverable deadlines and assignment reminders.
  - View continuous academic performance for students enrolled in their classes.
- **Restrictions**: Cannot enter marks or attendance for courses they are not assigned to teach. Cannot view students' full transcripts outside their courses unless also assigned as their advisor.

#### 4. Faculty Advisor (`advisor`)
- **Scope**: Assigned advisees (via `advisorAssignments`) or assigned academic sections (e.g., Section A, Batch 2022).
- **Capabilities**:
  - Access advisee risk profiles, composite scores, transparent warning reasons, and recommendations.
  - Initiate formal academic recovery interventions with target dates and action plans.
  - Schedule follow-up advising sessions and record chronological progress notes.
  - Log append-only faculty feedback (public to student or private to faculty).
  - Evaluate pre- vs. post-intervention academic progress comparisons.
- **Restrictions**: Cannot modify attendance or assessment marks directly unless they are also the course teacher. Cannot view advisees outside their assigned scope.

#### 5. Student (`student`)
- **Scope**: Strictly their own user profile and personal academic records.
- **Capabilities**:
  - View registered course offerings, schedule, and credit load.
  - Monitor subject-wise attendance percentages and low-attendance warnings (<75%).
  - Inspect continuous marks and feedback (with unrecorded marks displayed as `"Not recorded"`).
  - View academic performance curves, trend analytics, and personalized recommendations.
  - Receive and acknowledge academic risk alerts and deadline notifications.
  - Update non-academic profile fields (display name, phone, emergency contact).
- **Restrictions**: Read-only access to academic records. Cannot self-enroll without approval. Cannot alter student ID, department, batch, CGPA, or role. Cannot view other students' records.

---

### B. Student Registration & Account Activation Lifecycle

```
[Dept / Uni Admin]
       │
       │ 1. Pre-register Official Student Record
       ▼
[officialStudents Document]
- officialStudentId (e.g., "CSE-2022-041")
- officialEmail (e.g., "0802420205101025@baust.edu.bd")
- department ("CSE"), batch ("2022"), section ("A")
- status: "pending_activation"
       │
       │ 2. Generate Expiring Activation Invitation
       ▼
[studentInvitations Document]
- invitationToken (Cryptographically secure UUID / hash)
- expiresAt (7 days from issue)
- used: false
       │
       │ 3. Send Activation Link to Official Email
       ▼
[Student Receives Activation Email]
       │
       │ 4. Student clicks link, provides password, and completes Auth
       ▼
[Atomic Activation & Account Linking (Trusted Server / Callable)]
- Verify token is valid, unused, and not expired
- Link Firebase Auth UID to officialStudentId
- Create/Activate users/{uid} (role: 'student')
- Create studentProfiles/{uid} populated with official registrar data
- Mark invitation: { used: true, linkedUid: uid, usedAt: ISO }
- Mark official student: { status: "active", linkedUid: uid }
```

#### Invariants:
1. **No Self-Invented Identities**: Registration is invite-only for official academic profiles. Public self-registration without a valid token cannot bind to an official university roll number.
2. **One-Time Token**: Activation tokens are invalidated immediately upon first use.
3. **Expiration Guard**: Invitations expire after 7 calendar days. Expired or revoked invitations return `INVITATION_EXPIRED`.
4. **Duplicate Roll Prevention**: `officialStudentId` is enforced as unique across the institution. No two user accounts can be linked to the same official student ID.
5. **Profile Immutability**: The fields `studentId`, `department`, `batch`, `section`, `currentSemesterId`, and `cgpa` are strictly read-only for students in security rules.

---

### C. Academic Domain Hierarchy & Schema Evolution

The academic architecture models higher education institutions with clean relational boundaries:

```
University
  └── Department (e.g., CSE)
        └── Semester (e.g., Spring 2026)
              ├── Course Catalog (e.g., CSE311 - Database Systems, 3.0 credits)
              │     └── Course Offering (CSE311, Spring 2026, Section A)
              │           ├── Assigned Teachers (Dr. X, Engr. Y)
              │           ├── Enrolled Students (Enrollments)
              │           ├── Assessments & Weights (Quiz 1, Midterm)
              │           │     └── Student Marks (obtainedMarks: number | null)
              │           └── Attendance Records (Session Dates in Asia/Dhaka)
              └── Cohort Section (Batch 2022, Section A)
                    └── Assigned Advisor (Faculty Z)
```

#### Canonical Firestore Collections

1. `departments`:
   - `id`: string (e.g., `cse`, `eee`, `bba`)
   - `code`: string (e.g., `"CSE"`)
   - `name`: string (e.g., `"Computer Science and Engineering"`)
   - `headOfDeptId`: string (User UID)
   - `createdAt`, `updatedAt`, `createdBy`

2. `courses` (Reusable Catalog):
   - `id`: string (e.g., `cse-311`)
   - `code`: string (e.g., `"CSE311"`)
   - `title`: string (e.g., `"Database Management Systems"`)
   - `credits`: number (e.g., `3.0`)
   - `department`: string (e.g., `"CSE"`)
   - `isActive`: boolean
   - `createdAt`, `updatedAt`, `createdBy`

3. `courseOfferings` (Term Offering & Faculty Scoping):
   - `id`: string (e.g., `offering_cse311_2026spring_a`)
   - `courseId`: string (`cse-311`)
   - `semesterId`: string (`2026-spring`)
   - `section`: string (`"A"`)
   - `teacherIds`: string[] (Array of faculty UIDs assigned to teach and grade)
   - `status`: `'active' | 'archived'`
   - `createdAt`, `updatedAt`, `createdBy`

4. `enrollments`:
   - `id`: string
   - `studentId`: string (Student Auth UID)
   - `courseId`: string
   - `offeringId`: string (Links directly to `courseOfferings`)
   - `semesterId`: string
   - `status`: `'enrolled' | 'dropped' | 'completed'`
   - `createdAt`, `updatedAt`, `createdBy`

5. `studentInvitations`:
   - `id`: string (token)
   - `officialStudentId`: string
   - `email`: string
   - `department`: string
   - `batch`: string
   - `section`: string
   - `expiresAt`: string (UTC ISO)
   - `status`: `'pending' | 'accepted' | 'expired' | 'revoked'`
   - `linkedUid`: string | null
   - `createdAt`, `createdBy`

---

### D. Attendance, Assessments, and Marks Specification

#### 1. Attendance Model
- **Statuses & Weights**:
  - `present`: Weighted as $1.0$.
  - `late`: Weighted as $0.5$.
  - `excused`: Weighted as $1.0$ (authorized absence does not penalize academic attendance rate).
  - `absent`: Weighted as $0.0$.
- **Formula**:
  $$\text{Attendance Rate } A = \frac{1.0 \times N_{\text{present}} + 0.5 \times N_{\text{late}} + 1.0 \times N_{\text{excused}}}{N_{\text{total}}} \times 100\%$$
- **Timezone**: All session dates are recorded in `Asia/Dhaka` calendar format (`YYYY-MM-DD`). Future dates are strictly prohibited by client and server validators.
- **Uniqueness**: Composite key / constraint: `enrollmentId + date` ensures no student has multiple attendance entries for the same course on the same date.

#### 2. Assessments and Continuous Marks
- **Positive Maximum Marks**: `maxMarks` must be strictly $> 0$.
- **Weightage**: Total course assessment weightage sums to $100\%$.
- **Explicit Missing-Mark Semantics**:
  - `obtainedMarks === null`: Denotes an unrecorded, not-yet-graded, or unsubmitted assessment. Excluded from the continuous grade average to avoid artificially deflating performance before grades are finalized. Counted in the completion component if past due.
  - `obtainedMarks === 0`: Denotes an evaluated zero score (e.g., student took the test and scored 0). Included in continuous averages.
- **Continuous Marks Average**:
  $$M = \frac{\sum_{i \in \text{Graded}} \frac{\text{obtainedMarks}_i}{\text{maxMarks}_i} \times \text{weightage}_i}{\sum_{i \in \text{Graded}} \text{weightage}_i} \times 100\%$$

---

### E. Risk Engine Specification (Preserved Formula v1.0.0)

The risk engine is pure, rule-based, and deterministic. No black-box machine learning models are used.

#### Nominal Weights
- Attendance ($W_{att}$): $0.35$ (35%)
- Marks ($W_{marks}$): $0.35$ (35%)
- Assignment Completion ($W_{comp}$): $0.15$ (15%)
- Grade Trend ($R_{trend}$): $0.15$ (15%)

#### Sub-Component Risk Functions ($[0, 100]$ scale where $100$ is maximum risk)

1. **Attendance Risk ($R_{att}$)**:
   - $A \ge 85\% \implies R_{att} = 0$
   - $75\% \le A < 85\% \implies R_{att} = 35 \times \frac{85 - A}{10}$
   - $60\% \le A < 75\% \implies R_{att} = 35 + 30 \times \frac{75 - A}{15}$
   - $A < 60\% \implies R_{att} = 65 + 35 \times \min\left(1, \frac{60 - A}{60}\right)$

2. **Marks Risk ($R_{marks}$)**:
   - $M \ge 70\% \implies R_{marks} = 0$
   - $50\% \le M < 70\% \implies R_{marks} = 35 \times \frac{70 - M}{20}$
   - $40\% \le M < 50\% \implies R_{marks} = 35 + 30 \times \frac{50 - M}{10}$
   - $M < 40\% \implies R_{marks} = 65 + 35 \times \min\left(1, \frac{40 - M}{40}\right)$
   - *If no assessments are graded, $R_{marks}$ has no data.*

3. **Assignment Completion Risk ($R_{comp}$)**:
   Let $U$ be the number of past-due unsubmitted/unrecorded assessments:
   - $U = 0 \implies R_{comp} = 0$
   - $U = 1 \implies R_{comp} = 30$
   - $U = 2 \implies R_{comp} = 55$
   - $U \ge 3 \implies R_{comp} = \min(100, 65 + 15 \times (U - 2))$

4. **Grade Trend Risk ($R_{trend}$)**:
   Let $\Delta = M_{\text{early}} - M_{\text{recent}}$ (score drop between first and second half):
   - $\Delta \le 0 \implies R_{trend} = 0$
   - $0 < \Delta \le 15 \implies R_{trend} = 35 \times \frac{\Delta}{15}$
   - $15 < \Delta \le 30 \implies R_{trend} = 35 + 30 \times \frac{\Delta - 15}{15}$
   - $\Delta > 30 \implies R_{trend} = \min(100, 65 + 35 \times \frac{\Delta - 30}{30})$
   - *Requires at least 2 graded assessments; otherwise no data.*

#### Insufficient Data & Dynamic Renormalization
- **Threshold**: At least **2 components** must possess valid data.
- If $<2$ components have data:
  - `isSufficientData = false`
  - `riskLevel = 'Low'` (displayed in faculty dashboards as `"Insufficient data"`)
  - `score = null`
- If $\ge 2$ components have data:
  Let $\mathcal{A}$ be the available component set and $S_W = \sum_{k \in \mathcal{A}} W_k$.
  The composite score is:
  $$\text{Score} = \sum_{k \in \mathcal{A}} \frac{W_k}{S_W} \times R_k \quad (\text{rounded to 1 decimal place})$$

#### Risk Classifications
- **Low Risk**: $\text{Score} < 35.0$
- **Medium Risk**: $35.0 \le \text{Score} < 65.0$
- **High Risk**: $\text{Score} \ge 65.0$

#### Idempotency & Deduplication
- Multiple evaluations yielding identical risk level and reasons within the same period do not generate duplicate alert dispatches.
- Evaluations are saved to append-only `riskAssessments` collection with transparent textual and structured reasons.

---

### F. Alert Quota & Notification Workflow

```
[Risk Evaluation Triggered] (Academic write / Scheduled job / Manual review)
                    │
                    ▼
          [Risk Level Computed]
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
   Low Risk                Medium / High Risk
   (No Alert)                    │
                                 ▼
                 [Call Trusted Server Boundary]
                     (/api/alerts/deliver)
                                 │
                 [Read alertCounters in Asia/Dhaka]
                    ${studentId}_${YYYY-MM}
                                 │
             ┌───────────────────┴───────────────────┐
             ▼                                       ▼
    Count >= 2 (Quota Exceeded)             Count < 2 (Quota Available)
             │                                       │
    [Suppress Alert]                                 ▼
    Reason: MONTHLY_QUOTA_EXCEEDED          [Check Duplicate]
                                            Unchanged risk level & assessment?
                                                     │
                                        ┌────────────┴────────────┐
                                        ▼                         ▼
                                   Duplicate                New / Escalated
                                (Suppress Alert)                  │
                                                                  ▼
                                                      [Atomic Firestore Write]
                                                      1. alertDeliveries (status: delivered)
                                                      2. notifications (in-app message)
                                                      3. alertCounters (increment count)
```

#### Key Rules:
1. **Timezone**: The monthly period is computed strictly in `Asia/Dhaka` (UTC+6) using `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })`.
2. **Quota Invariant**: Maximum 2 academic risk alerts per student per calendar month.
3. **Deadline Reminder Isolation**: Reminders for upcoming exams and assignments do NOT touch `alertCounters` and do NOT consume risk alert quota.
4. **Student Acknowledgment**: Students can view active alerts and click "Acknowledge Alert" (updating `alertDeliveries/{id}.status = 'acknowledged'`).

---

### G. Academic Intervention & Progress Lifecycle

```
[High / Medium Risk Advisee]
             │
             ▼
[Advisor Initiates Intervention]
- Status: 'open'
- Reason & Action Plan (e.g., remedial tutoring, attendance contract)
- Target Date
- Status History initialized: [{ status: 'open', changedAt: ISO, changedBy: uid }]
             │
             ├──► [Student receives in-app intervention notification]
             │
             ▼
[Follow-Up Advising Sessions]
- Add follow-up note (append-only followUps collection)
- Status update: 'in_progress' | 'escalated'
             │
             ▼
[Outcome & Resolution]
- Status update: 'resolved' | 'completed' | 'cancelled'
             │
             ▼
[Automated Before / After Progress Comparison]
- Compares pre-intervention window vs. post-intervention window
- Requires >= 1 attendance record and >= 1 mark in each window
- Anti-coercion rule: null marks NEVER treated as improvement
- Verdict: 'Improved' | 'Stable' | 'Declined' | 'Not enough data to compare'
```

#### Faculty Collaboration vs. Privacy:
- **Public Advising Notes**: Viewable by both student and faculty. Dispatches student notification.
- **Private Faculty Notes (`isPrivateToFaculty: true`)**: Visible only to advisors, teachers, and administrators. Hidden from the student portal.

---

## 3. Phased Implementation Plan

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Academic Hierarchy & Role Foundations                         │
│ - Add 'departments' and 'courseOfferings' schema models.               │
│ - Extend UserRole to support 'university_admin' and 'dept_admin'.       │
│ - Backward-compatibility shim for existing courses & enrollments.      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2: Administrative Pre-Registration & Token Activation            │
│ - Create 'officialStudents' and 'studentInvitations' models.           │
│ - Build Admin Student Pre-Registration UI in Admin Dashboard.          │
│ - Implement secure Tokenized Account Activation Page (/activate).      │
│ - Lock down student identity mutation in Firestore Rules.              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 3: Course Offerings & Multi-Faculty Assignment UI                │
│ - Course Offering Management UI for Dept Admins.                       │
│ - Assign teachers to offerings; assign advisors to cohorts/sections.   │
│ - Scope Course Teacher attendance/marks entry to assigned offerings.   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 4: Departmental Scoping & Firestore Rules Hardening              │
│ - Enforce department boundary in Dept Admin queries.                   │
│ - Update firestore.rules to authorize course teachers and advisors.   │
│ - Preserve trusted server quota boundary (/api/alerts/deliver).        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 5: Verification, Integration Testing & Rollout                   │
│ - Multi-role E2E test script (Admin, Dept Admin, Teacher, Advisor, Std)│
│ - Regression test run across all existing 9 test suites.               │
│ - Production compile and verification.                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Phase Specifications

#### Phase 1: Academic Hierarchy & Role Foundations
- **Deliverables**:
  1. Add TypeScript definitions in `src/shared/types/index.ts` for `Department`, `CourseOffering`, `StudentInvitation`, and extended `UserRole` (`'university_admin' | 'dept_admin' | 'teacher' | 'advisor' | 'student'`).
  2. Implement `DepartmentService` and `CourseOfferingService` in `src/shared/services/`.
  3. Create backward-compatible adapter ensuring existing `courses` and `enrollments` continue to resolve seamlessly in all current pages.
- **Safety Gate**: Existing unit and integration tests (`scripts/testIntegrationE2E.ts`, `scripts/testRiskEngine.ts`) pass without modification.

#### Phase 2: Administrative Pre-Registration & Token Activation
- **Deliverables**:
  1. Database schema for `officialStudents` and `studentInvitations`.
  2. Cloud Function / API endpoint `/api/admin/invite-student` generating cryptographically random tokens with 7-day expiration.
  3. Endpoint `/api/auth/activate-student` to atomically link Firebase Auth UID to pre-registered profile.
  4. New `/activate` page for students to complete activation.
  5. Harden Firestore security rules to prevent direct creation of unauthorized student profiles.
- **Safety Gate**: Verified with synthetic test script asserting invitation expiration, token one-time use, and roll duplicate prevention.

#### Phase 3: Course Offerings & Multi-Faculty Assignment
- **Deliverables**:
  1. UI in Admin module (`/admin/offerings`) for creating course offerings with term, section, and assigned faculty UIDs.
  2. Filter `TeacherDashboard` and `AttendanceEntryModal` so teachers only see offerings where `teacherIds.includes(auth.uid)` (while admins retain global oversight).
  3. Support section-wide advisor assignment as well as 1-on-1 assignments.
- **Safety Gate**: Course teachers can only grade and enter attendance for their assigned offerings.

#### Phase 4: Departmental Scoping & Firestore Rules Hardening
- **Deliverables**:
  1. Update `firestore.rules` with helper functions:
     - `isUniversityAdmin()`
     - `isDeptAdmin(dept)`
     - `isCourseTeacherOf(offeringId)`
     - `isAdvisorOf(studentUid)`
  2. Department Admin UI tabs restricted to `user.department`.
  3. Retain trusted server quota boundary for alerts (`/api/alerts/deliver`) with zero client write access to `alertCounters`.
- **Safety Gate**: Firestore rules test verifies Department Admin cannot modify courses or students of another department.

#### Phase 5: Verification, Regression Testing & Rollout
- **Deliverables**:
  1. Dedicated comprehensive multi-role E2E test script (`scripts/testMultiRoleE2E.ts`).
  2. Execution of the complete 10-suite automated test matrix.
  3. Production build verification (`compile_applet` and `lint_applet`).
- **Safety Gate**: 100% test pass rate across all suites with 0 regressions.

---

## 4. Verification Checkpoint & Sign-Off Criteria

Before initiating code migration, the plan requires alignment on:
1. **Role Terminology**: Confirmation of role identifiers (`university_admin`, `dept_admin`, `teacher`, `advisor`, `student`).
2. **Invitation Expiration Policy**: Standard 7-day expiration window with admin re-invite capability.
3. **Preservation Guarantee**: Strict commitment to keeping the current deterministic risk formula (Weights: 35% attendance, 35% marks, 15% completion, 15% trend; thresholds 35/65; null marks excluded) without deviation.
4. **Quota Guarantee**: Preserving the institutional quota of maximum 2 academic risk alerts per student per calendar month in `Asia/Dhaka`.
