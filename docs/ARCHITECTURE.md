# System Architecture: Academic Risk Alert System

## 1. Overview
The Academic Risk Alert System is a university software engineering system designed to identify students at academic risk using rule-based metrics across attendance, continuous assessments, assignments, and exam marks.
The platform enables:
- **Students**: track continuous academic progress, view attendance and mark summaries, understand transparent risk factors, and view advisor notifications.
- **Teachers / Advisors**: monitor assigned students, identify students flagged as Medium or High risk, log feedback, initiate structured academic interventions, and track follow-up progress.
- **Administrators**: manage user roles, semester terms, course definitions, and system configurations.

## 2. Team and Module Ownership
Three developers collaborate on this unified platform:
- **Developer 1 (Md. Al-Maynul Hasan)**: Core application shell, authentication & role management, student portal, academic management, and cross-module integration coordination.
- **Developer 2 (Md. Al Arafat abir)**: Rule-based risk engine, automated alert dispatch, notification center, reminder queues, and actionable recommendations.
- **Developer 3 (Abu Sayed)**: Teacher/advisor dashboard, student risk review, record updates, direct feedback, structured academic interventions, and follow-up tracking.

## 3. Technology Stack & Key Decisions
- **Frontend**: React 19 + TypeScript + Tailwind CSS (v4) + React Router v7.
- **Backend & Database**: Firebase Authentication (Email/Password) + Cloud Firestore (Single backend).
- **Theme**: Light mode strictly (`#F8FAFC` background, `#FFFFFF` surface, `#E2E8F0` borders). No dark mode.
- **Timezone**: `Asia/Dhaka` (UTC+6) for all calendar dates and scheduling display; timestamps stored strictly in UTC ISO / Firestore Timestamp.
- **Role Model**: Three roles: `student`, `teacher`, `admin`. Stored in the `users` collection. Registration defaults strictly to `student`. Roles are write-protected and can only be modified by administrators.
- **Risk Evaluation**: Strictly rule-based and deterministic (Low, Medium, High). No AI / Machine Learning terminology or black-box predictions.

## 4. Role-Aware Route Table
| Route Path | Allowed Roles | Description | Module Owner | Status |
|---|---|---|---|---|
| `/login` | Public (Unauthenticated) | User login via Firebase Auth | Dev 1 (Core) | Verified & Operational |
| `/register` | Public (Unauthenticated) | Registration (defaults to student) | Dev 1 (Core) | Verified & Operational |
| `/forgot-password` | Public (Unauthenticated) | Password reset request (anti-enumeration) | Dev 1 (Core) | Verified & Operational |
| `/reset-password` | Public (Unauthenticated) | Password reset confirmation flow | Dev 1 (Core) | Verified & Operational |
| `/student/dashboard` | `student` | Student overview & real-time risk level badge | Dev 1 (Student) | Verified & Operational |
| `/student/courses` | `student` | Enrolled courses list & syllabi credits | Dev 1 (Student) | Verified & Operational |
| `/student/attendance` | `student` | Detailed attendance records & percentage | Dev 1 (Student) | Verified & Operational |
| `/student/marks` | `student` | Continuous assessments and exam marks (strict nulls) | Dev 1 (Student) | Verified & Operational |
| `/student/performance` | `student` | Performance trends, grades & recommendations | Dev 1 (Student) | Verified & Operational |
| `/student/notifications`| `student` | Advising alerts, reminders & acknowledgment | Dev 2 (Risk) | Verified & Operational |
| `/student/profile` | `student` | Student profile, CGPA & contact info | Dev 1 (Core) | Verified & Operational |
| `/teacher/dashboard` | `teacher`, `admin` | Advisor dashboard & risk summary triage | Dev 3 (Teacher) | Verified & Operational |
| `/teacher/students` | `teacher`, `admin` | Assigned advisees list with risk badges | Dev 3 (Teacher) | Verified & Operational |
| `/teacher/students/:id` | `teacher`, `admin` | Student detailed academic & risk profile with entry | Dev 3 (Teacher) | Verified & Operational |
| `/teacher/interventions`| `teacher`, `admin` | Active academic intervention plans & progress | Dev 3 (Teacher) | Verified & Operational |
| `/admin/users` | `admin` | User accounts, roles & assignments | Dev 1 (Core) | Verified & Operational |

## 5. Security & Isolation Model
1. **Student Isolation**: Students may only read documents where `studentId == request.auth.uid` or `userId == request.auth.uid`.
2. **Advisor Scope**: Teachers may only read and intervene on students explicitly mapped via the `advisorAssignments` collection (`teacherId == request.auth.uid`).
3. **Role Elevation Shield**: Users cannot self-assign or mutate the `role` field in `users` documents.
4. **Append-Only Auditing**: `feedback`, `riskAssessments`, and `followUps` are append-only to preserve academic audit trails.
5. **Server Authority**: Risk calculation outputs, alert counter quotas, and alert deliveries are write-restricted to authorized server processes or admin transactions.

---

## 6. Canonical Entity-Relationship (ER) Model

All collections follow unified camelCase naming without legacy snake_case variants:

```mermaid
erDiagram
    users ||--o| studentProfiles : "has profile"
    users ||--o{ advisorAssignments : "assigned as advisor/advisee"
    semesters ||--o{ enrollments : "active in"
    courses ||--o{ enrollments : "enrolled in"
    courses ||--o{ assessments : "contains"
    semesters ||--o{ assessments : "evaluated in"
    assessments ||--o{ deadlines : "scheduled with"
    assessments ||--o{ marks : "graded by"
    enrollments ||--o{ attendance : "session attended"
    enrollments ||--o{ marks : "student mark"
    users ||--o{ riskAssessments : "evaluated risk"
    users ||--o{ alertCounters : "quota tracked"
    users ||--o{ alertDeliveries : "alerts received"
    users ||--o{ notifications : "receives in-app"
    users ||--o{ interventions : "subject of plan"
    interventions ||--o{ followUps : "progress updates"
    users ||--o{ feedback : "advising notes"
```

---

## 7. UML Architecture Models & Authorship

### 7.1 Class Diagram — Md. Al-Maynul Hasan (Developer 1)
```mermaid
classDiagram
    class User {
        +string id
        +string email
        +string displayName
        +UserRole role
        +string createdAt
    }
    class StudentProfile {
        +string id
        +string studentId
        +string department
        +string batch
        +number cgpa
    }
    class Course {
        +string id
        +string code
        +string title
        +number credits
        +boolean isActive
    }
    class Semester {
        +string id
        +string name
        +string startDate
        +string endDate
        +boolean isCurrent
    }
    class Enrollment {
        +string id
        +string studentId
        +string courseId
        +string semesterId
        +EnrollmentStatus status
    }
    class Assessment {
        +string id
        +string title
        +string type
        +number maxMarks
        +number weightage
    }
    class Mark {
        +string id
        +string assessmentId
        +string studentId
        +number obtainedMarks
    }
    class AttendanceRecord {
        +string id
        +string enrollmentId
        +string studentId
        +string date
        +AttendanceStatus status
    }
    class RiskAssessment {
        +string id
        +string studentId
        +string riskLevel
        +number score
        +string[] reasons
        +string trigger
    }
    class AlertCounter {
        +string id
        +string studentId
        +string period
        +number inAppCount
        +number emailCount
    }
    class AcademicIntervention {
        +string id
        +string studentId
        +string teacherId
        +string title
        +InterventionStatus status
        +string targetDate
    }

    User <|-- StudentProfile
    Course "1" *-- "many" Enrollment
    Semester "1" *-- "many" Enrollment
    Enrollment "1" *-- "many" AttendanceRecord
    Course "1" *-- "many" Assessment
    Assessment "1" *-- "many" Mark
    User "1" *-- "many" RiskAssessment
    User "1" *-- "many" AlertCounter
    User "1" *-- "many" AcademicIntervention
```

### 7.2 Activity Diagram: Academic Record Update to Risk Reevaluation — Md. Al Arafat Abir (Developer 2)
```mermaid
flowchart TD
    Start([Teacher Enters Mark or Attendance]) --> PersistRecord[Persist Validated Record to Firestore]
    PersistRecord --> TriggerReeval[Trigger Realtime Listener / Cloud Function onAcademicRecordChanged]
    TriggerReeval --> FetchPersisted[Fetch Persisted Attendance & Recorded Marks with Strict Null Handling]
    FetchPersisted --> CheckData{Sufficient Data? >= 2 Components}
    CheckData -- No --> SetInsufficient[Set Risk Status to Insufficient Data, Score null]
    CheckData -- Yes --> CalculateScore[Execute Deterministic Risk Scoring Formula]
    CalculateScore --> StoreHistory[Append Record to riskAssessments Collection]
    StoreHistory --> CheckLevel{Risk Level == Medium or High?}
    CheckLevel -- No --> Finish([End Process])
    CheckLevel -- Yes --> QuotaCheck{In-App Alerts < 2 in Asia/Dhaka YYYY-MM?}
    QuotaCheck -- No --> SuppressQuota[Suppress Alert: MONTHLY_QUOTA_EXCEEDED]
    QuotaCheck -- Yes --> CheckDuplicate{Identical Assessment Evaluated?}
    CheckDuplicate -- Yes --> SuppressDup[Suppress Alert: DUPLICATE_SUPPRESSED]
    CheckDuplicate -- No --> DeliverAlert[Deliver In-App Alert and Increment alertCounters Atomically]
    DeliverAlert --> CreateNotification[Publish to Student Notification Center]
    CreateNotification --> Finish
    SuppressQuota --> Finish
    SuppressDup --> Finish
```

### 7.3 Sequence Diagram: Advisor Academic Intervention & Progress Lifecycle — Abu Sayed (Developer 3)
```mermaid
sequenceDiagram
    autonumber
    actor Advisor as Teacher / Advisor
    participant UI as Teacher Portal (Web)
    participant Auth as Security Rules / AdvisorGate
    participant Svc as InterventionService
    participant DB as Cloud Firestore
    actor Student as Advisee Student

    Advisor->>UI: Select Advisee from Triage List
    UI->>Auth: Verify teacherId mapped in advisorAssignments
    Auth-->>UI: Authorization Granted
    UI-->>Advisor: Display Student Academic Profile & Risk Reasons
    Advisor->>UI: Create Structured Intervention (Title, Category, Target Date)
    UI->>Svc: createIntervention(payload)
    Svc->>DB: Append to interventions collection (status: 'open')
    Svc->>DB: Dispatch in-app notification to Student
    DB-->>Student: Alert: New Advising Intervention Created
    Note over Advisor, Student: Recovery Period & Academic Sessions
    Advisor->>UI: Log Follow-Up & Transition Status ('in_progress' -> 'resolved')
    UI->>Svc: addFollowUp(interventionId, notes)
    Svc->>DB: Append to followUps subcollection
    Advisor->>UI: View Progress Comparison Card
    UI->>Svc: calculateProgressComparison(preWindow, postWindow)
    Svc-->>UI: Return Attendance Delta, Marks Delta, and Objective Verdict
    UI-->>Advisor: Render Progress Comparison Visualization
```

---

## 8. Release Readiness & Deployment Classification

| Component | Architecture Tier | Local / In-Memory Test | Firebase Emulator Test | Live Deployed Cloud Status |
| :--- | :--- | :--- | :--- | :--- |
| **Deterministic Risk Engine** | Pure Domain Logic | Verified (`testRiskEngine.ts`) | Verified (`testIntegrationE2E.ts`) | Ready for production runtime |
| **Asia/Dhaka Monthly Quota** | Server Authority | Verified (`testHardenRiskAlerts.ts`) | Verified (`trustedQuotaEngine.ts`) | Deployed via `/api/alerts/deliver` proxy & Cloud Functions |
| **Academic Admin & Catalog** | Service / API Layer | Verified (`testAcademicAdmin.ts`) | Verified (`testIntegrationE2E.ts`) | Active in Firestore |
| **Cross-Client Reevaluation** | Event & Sync Layer | Verified (`testHardenRiskAlerts.ts`) | Verified (`realtimeSync.ts`) | Supported by Cloud Firestore realtime listeners (`onSnapshot`) + Cloud Function trigger |
| **Scheduled Risk Sweeper** | Background Runner | Verified (`scripts/runScheduledRiskJob.ts`) | Verified (batch simulation) | Cloud Scheduler command documented in `docs/CLOUD_FUNCTIONS.md` |

