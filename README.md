# Academic Risk Alert System (ARAS)

An institutional academic risk monitoring, early alert, and advising recovery platform designed for higher education institutions. The system continuously evaluates student academic performance (attendance, continuous assessment marks, assignment completions, and semester trends) under institutional policy rules, dispatches concurrency-safe early warning alerts with monthly rate limits, and provides faculty advisors with structured intervention management and before/after progress tracking.

---

## 1. Architecture & Module Ownership

The platform is engineered with a modular, federated architecture across three primary engineering domains:

| Module | Engineering Lead | Scope & Key Responsibilities |
| :--- | :--- | :--- |
| **Core & Student Module** | **Developer 1** (Md. Al-Maynul Hasan) | Firebase Auth, RBAC profiles, Academic Record Service (attendance, marks, assessments, course enrollments, semesters), Student Workspace (Dashboard, Courses, Attendance, Marks, Performance, Profile). |
| **Academic Risk & Alert Engine** | **Developer 2** (Md. Al Arafat abir) | Pure deterministic risk engine (`calculateRisk`), dynamic weight renormalization, missing data guards (missing marks strictly null, never 0), atomic Firestore transaction alert delivery (`tryDeliverRiskAlert`) with monthly quota limit (max 2/month in Asia/Dhaka), duplicate suppression, recommendation engine, student notification center. |
| **Teacher & Advising Dashboard** | **Developer 3** (Abu Sayed) | Faculty Advisor Workspace (`/teacher`), advisee triage directory, student detail analytics, attendance/marks entry modals with real-time risk re-evaluation hooks, append-only faculty feedback, structured intervention plans with chronological status history, and before/after progress comparison engine. |

---

## 2. Key Architectural Invariants

1. **Strict Missing Data Semantics:**
   - Missing marks are strictly represented as `null` and are **NEVER coerced to zero or penalized as failing**.
   - If an evaluation is missing in pre- or post-intervention windows, the progress comparison strictly yields `"Not enough data to compare"` rather than guessing an improvement.
2. **Monthly Alert Limit Under Concurrency:**
   - Capped at **strictly 2 risk alerts per student per calendar month in Asia/Dhaka**.
   - Delivery executes inside a single atomic Cloud Firestore transaction (`runTransaction`) reading and updating `alertCounters/{studentId}_{YYYY-MM}`.
   - Concurrent delivery bursts serialize safely; attempts 3+ are rejected with `MONTHLY_QUOTA_EXCEEDED`.
   - Failed deliveries do **not** increment quota.
   - Deadline reminders use category `assignment` and do **not** consume alert quota.
3. **Duplicate Alert Suppression:**
   - Re-evaluations with identical risk level and reasons are suppressed as `DUPLICATE_SUPPRESSED` unless risk escalates upward (e.g. Medium to High).
4. **Append-Only Audit Trails:**
   - `riskAssessments`, `feedback`, and `followUps` collections are strictly append-only in Firestore Security Rules (`allow update, delete: if false;`).
5. **Advisor-Only Access Control:**
   - Faculty members can only view and update academic records and interventions for students explicitly assigned to them via the `advisorAssignments` collection (`${teacherId}_${studentId}`).

---

## 3. Environment Variables & Setup

### Configuration
Copy `.env.example` if overriding local variables:
```bash
cp .env.example .env
```

| Variable | Description | Runtime Injected |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional Gemini AI API key for future generative advising aids. | Injected in AI Studio |
| `APP_URL` | Public application root URL. | Injected in AI Studio |

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run local development server (port 3000)
npm run dev

# 3. Build for production
npm run build

# 4. Type check / lint
npm run lint
```

---

## 4. Database Seeding & Demo Accounts

To populate Firestore with initial semesters, courses, faculty, students, enrollments, assessments, and advisor pairings:
```bash
npx tsx scripts/seed.ts
```

### Pre-Seeded Accounts for Testing:
- **Faculty Advisor:**
  - Email: `karim@university.edu.bd`
  - Password: `Password123!`
  - Role: `teacher`
- **At-Risk Student:**
  - Email: `student.karim@university.edu.bd`
  - Password: `Password123!`
  - Role: `student`
- **Good-Standing Student:**
  - Email: `student.fatima@university.edu.bd`
  - Password: `Password123!`
  - Role: `student`
- **System Administrator:**
  - Email: `admin@university.edu.bd`
  - Password: `Password123!`
  - Role: `admin`

---

## 5. Automated Test Suite Execution

All business logic, security assertions, risk calculations, and before/after comparisons are validated via independent, high-coverage automated test suites:

```bash
# 1. Validation tests (Dhaka date boundaries, mark boundaries, null semantics)
npx tsx scripts/testValidation.ts

# 2. Chart math unit tests (average calculations excluding nulls)
npx tsx scripts/testChartMath.ts

# 3. Firestore security rule assertions (role tampering, student data isolation)
npx tsx scripts/verifyRulesLogic.ts

# 4. Academic risk engine & alert concurrency simulation (10 concurrent requests, quota = 2)
npx tsx scripts/testRiskEngine.ts

# 5. Intervention progress comparison engine (window math, missing data guards)
npx tsx scripts/testProgressComparison.ts

# 6. Master End-to-End integration & security workflow verification
npx tsx scripts/testIntegrationE2E.ts
```

All 6 test suites execute with **119 passing assertions, 0 failures**.

---

## 6. Schema Migrations & Firestore Collections

| Collection | Document ID Format | Description & Security Policy |
| :--- | :--- | :--- |
| `users` | `{uid}` | User profile and system role (`student`, `teacher`, `admin`). Protected against self-role escalation. |
| `students` | `{studentId}` | Academic profile, department, batch, CGPA. Readable by self, assigned advisor, and admin. |
| `teachers` | `{teacherId}` | Faculty profile, department, designation. |
| `courses` | `{courseId}` | Academic course catalog (code, title, credits, department). |
| `semesters` | `{semesterId}` | Term timelines and `isCurrent` active flag. |
| `enrollments` | `{enrollmentId}` | Student term course registrations. |
| `assessments` | `{assessmentId}` | Continuous assessments with `maxMarks`, `weightage`, `dueDate`. |
| `attendanceRecords` | `att_{studentId}_{courseId}_{date}` | Class session attendance (`present`, `absent`, `late`, `excused`). |
| `marks` | `mrk_{studentId}_{assessmentId}` | Assessment score evaluations with strict `null` for unrecorded grades. |
| `deadlines` | `{deadlineId}` | Upcoming deliverable reminders. |
| `advisorAssignments` | `{teacherId}_{studentId}` | Definitive advisor-to-advisee pairing enforcing access control. |
| `riskConfig` | `default` | Risk scoring weights, threshold cutoffs, and component configuration versioning. |
| `riskAssessments` | `asmt_{studentId}_{timestamp}` | **Append-only** chronological history of student risk evaluations. |
| `alertDeliveries` | `alert_{studentId}_{timestamp}` | In-app alert dispatch records with student acknowledgment lifecycle. |
| `alertCounters` | `{studentId}_{YYYY-MM}` | Atomic monthly rate limit counter evaluated in **Asia/Dhaka**. Max 2/month. |
| `notifications` | `notif_{timestamp}_{id}` | In-app user notifications for alerts, reminders, and advising updates. |
| `feedback` | `fb_{studentId}_{timestamp}` | **Append-only** faculty feedback notes. |
| `interventions` | `int_{studentId}_{timestamp}` | Structured student recovery plans with chronological `statusHistory`. |
| `followUps` | `fup_{interventionId}_{timestamp}` | **Append-only** advising follow-up session notes and completion outcomes. |
