# Data Model & Firestore Schema Specification

## 1. Global Document Conventions
All documents in Cloud Firestore adhere strictly to the following standard fields:
- `id`: string (Unique document identifier matching Firestore document key).
- `createdAt`: string (ISO 8601 UTC timestamp, e.g. `2026-10-13T18:15:00.000Z`).
- `updatedAt`: string (ISO 8601 UTC timestamp).
- `createdBy`: string (UID of user or `'system'` for automated jobs).

## 2. Key Data Integrity Rules
1. **Relationships by ID Only**: No nested full entity objects. References use exact IDs (e.g. `studentId`, `courseId`, `semesterId`, `teacherId`).
2. **Missing Marks Semantics**: Missing or ungraded marks MUST be stored as `null`, never `0`. A score of `0` denotes an assessed zero grade, whereas `null` denotes an unsubmitted or unentered evaluation.
3. **Attendance Uniqueness**: Attendance is partitioned per `enrollmentId` + `date` (YYYY-MM-DD format in Asia/Dhaka local calendar).
4. **Advisor Assignments Gatekeeper**: `advisorAssignments` explicitly links `teacherId` to `studentId`. Teachers can only query or inspect students for whom an active assignment exists.
5. **Append-Only Collections**:
   - `riskAssessments`: Always append-only. Must store `computedAt`, `configVersion`, `riskLevel` (`Low` | `Medium` | `High`), `reasons` (array of strings), and `trigger`.
   - `feedback`: Append-only advisor logs.
   - `followUps`: Append-only updates on interventions.
6. **Alert Quotas**: `alertCounters` tracks sent alerts per student per billing/calendar month with document ID format: `${studentId}_${YYYY-MM}`.

## 3. Firestore Collections

### `users`
- `id`: string (Firebase Auth UID)
- `email`: string
- `displayName`: string
- `role`: `'student' | 'teacher' | 'admin'` (Writable strictly by admin or seed script)
- `avatarUrl`: string (optional)
- `createdAt`: string
- `updatedAt`: string

### `studentProfiles`
- `id`: string (Matches user UID)
- `studentId`: string (Student university ID number, e.g. `CSE-2022-041`)
- `userId`: string (Auth UID)
- `department`: string
- `batch`: string
- `currentSemesterId`: string
- `cgpa`: number | null
- `phone`: string (optional)
- `emergencyContact`: string (optional)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `advisorAssignments`
- `id`: string
- `teacherId`: string (User UID of teacher)
- `studentId`: string (User UID of student)
- `assignedDate`: string
- `status`: `'active' | 'inactive'`
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `semesters`
- `id`: string (e.g. `2026-spring`)
- `name`: string (e.g. `Spring 2026`)
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)
- `isCurrent`: boolean
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `courses`
- `id`: string (e.g. `cse-311`)
- `code`: string (e.g. `CSE311`)
- `title`: string (e.g. `Database Management Systems`)
- `credits`: number
- `department`: string
- `isActive`: boolean (Lifecycle status: true = active, false = deactivated)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `enrollments`
- `id`: string
- `studentId`: string (User UID)
- `courseId`: string
- `semesterId`: string
- `status`: `'enrolled' | 'dropped' | 'completed'`
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `attendanceRecords`
- `id`: string
- `enrollmentId`: string
- `studentId`: string
- `courseId`: string
- `date`: string (YYYY-MM-DD in Asia/Dhaka)
- `status`: `'present' | 'absent' | 'late' | 'excused'`
- `notes`: string (optional)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `assessments`
- `id`: string
- `courseId`: string
- `semesterId`: string
- `title`: string (e.g. `Quiz 1`, `Midterm Exam`, `Assignment 2`)
- `type`: `'quiz' | 'assignment' | 'midterm' | 'final' | 'project'`
- `maxMarks`: number (strictly positive > 0)
- `weightage`: number (Percentage of course grade: 0 to 100)
- `dueDate`: string (UTC ISO)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `marks`
- `id`: string
- `assessmentId`: string
- `studentId`: string
- `enrollmentId`: string
- `obtainedMarks`: number | null (null indicates missing or unrecorded mark; 0 is an evaluated score; strictly validated >= 0 and <= maxMarks)
- `submittedAt`: string | null
- `gradedAt`: string | null
- `gradedBy`: string (User UID of teacher)
- `feedback`: string (optional)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `deadlines`
- `id`: string
- `courseId`: string
- `semesterId`: string (Linked academic semester)
- `assessmentId`: string | null (Optional linked assessment)
- `title`: string
- `description`: string
- `dueDate`: string (UTC ISO)
- `type`: `'assignment' | 'project' | 'quiz'`
- `isActive`: boolean (Lifecycle status: true = active, false = deactivated)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `riskConfig`
- `id`: string (e.g. `default` or `v1.0.0`)
- `version`: string (e.g. `1.0.0`)
- `attendanceThresholdMedium`: number (e.g. 75)
- `attendanceThresholdHigh`: number (e.g. 60)
- `marksThresholdMedium`: number (e.g. 50)
- `marksThresholdHigh`: number (e.g. 40)
- `missingSubmissionsLimit`: number (e.g. 2)
- `active`: boolean
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `riskAssessments` (Append-Only)
- `id`: string
- `studentId`: string
- `semesterId`: string
- `riskLevel`: `'Low' | 'Medium' | 'High'`
- `attendancePercentage`: number
- `marksAverage`: number
- `missingAssignmentsCount`: number
- `reasons`: string[] (Transparent textual reasons for the rule triggers)
- `trigger`: `'academic_update' | 'scheduled_job' | 'manual_review'`
- `configVersion`: string
- `computedAt`: string (UTC ISO)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `alertDeliveries`
- `id`: string
- `studentId`: string
- `riskAssessmentId`: string
- `riskLevel`: `'Medium' | 'High'`
- `channel`: `'in_app' | 'email'`
- `status`: `'pending' | 'delivered' | 'failed' | 'acknowledged'`
- `acknowledgedAt`: string | null
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `alertCounters`
- `id`: string (Format: `${studentId}_${YYYY-MM}`)
- `studentId`: string
- `period`: string (YYYY-MM)
- `inAppCount`: number
- `emailCount`: number
- `lastDispatchedAt`: string
- `createdAt`: string
- `updatedAt`: string

### `notifications`
- `id`: string
- `userId`: string
- `title`: string
- `message`: string
- `category`: `'risk_alert' | 'assignment' | 'attendance' | 'intervention' | 'general'`
- `isRead`: boolean
- `readAt`: string | null
- `link`: string | null
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `feedback` (Append-Only)
- `id`: string
- `studentId`: string
- `teacherId`: string
- `courseId`: string | null
- `category`: `'academic' | 'attendance' | 'behavioral' | 'general'`
- `comment`: string
- `isPrivateToFaculty`: boolean
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `interventions`
- `id`: string
- `studentId`: string
- `teacherId`: string
- `reason`: string
- `actionPlan`: string
- `targetDate`: string (YYYY-MM-DD)
- `status`: `'open' | 'in_progress' | 'resolved' | 'escalated'`
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string

### `followUps` (Append-Only)
- `id`: string
- `interventionId`: string
- `teacherId`: string
- `progressNotes`: string
- `statusUpdate`: `'in_progress' | 'resolved' | 'escalated'`
- `meetingDate`: string (YYYY-MM-DD)
- `createdAt`: string
- `updatedAt`: string
- `createdBy`: string
