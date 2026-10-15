# Student & Academic Management Module
**Author & Owner**: Developer 1: Md. Al-Maynul Hasan  
**Status**: Implemented & Verified (Groups A, B, C, D)

## 1. Overview
The Student and Academic Management module serves as the primary operational surface for students enrolled in the Academic Risk Alert System. It provides complete identity management, secure credential handling, academic term navigation, attendance monitoring, and continuous mark breakdowns.

## 2. Implemented Pages & Features

### Authentication & Profile (Group A)
- **Student Registration** (`/register`):
  - Validates full name (>= 2 chars), university email format, student ID (e.g. `CSE-2022-041`), academic department dropdown, academic level dropdown, and password matching.
  - Automatically provisions `users` collection with `role = 'student'` and `studentProfiles` collection with institutional academic metadata.
  - Role escalation is strictly prohibited by Security Rules.
- **Login & Session Persistence** (`/login`):
  - Full session persistence across browser refreshes via Firebase Auth `onAuthStateChanged`.
  - Quick demo accounts with pre-seeded synthetic data for testing.
  - Google Account sign-in with popup.
- **Password Reset Flow** (`/forgot-password`):
  - Dispatches reset link through Firebase Authentication.
  - Generic non-enumerating confirmation response preventing account harvesting.
- **Change Password** (`/student/profile`):
  - Requires mandatory recent re-authentication with current password before updating credentials.
- **Profile View & Permitted Edit** (`/student/profile`):
  - Displays read-only institutional data: Student ID, Department, Level, Batch, Semester, CGPA, and Role.
  - Allows student edit for permitted fields only: Display Name, Phone Number, Emergency Contact.

### Academic Data Layer (Group B)
- **Service Implementation**: `AcademicRecordService` in `src/shared/services/academicRecordService.ts`.
- **Read Methods**: `getSemesters`, `getEnrollments`, `getAttendance`, `getMarks`, `getAssessments`, `getDeadlines`, `getStudentProfile`.
- **Write Methods for Developer 3**:
  - `upsertAttendance`: validates status enum, date format in Asia/Dhaka, forbids future dates, records `updatedBy`, calls `onAcademicRecordChanged(studentId, 'attendance')`.
  - `upsertMark`: validates assessment existence, ensures `0 <= obtainedMarks <= maxMarks`, keeps missing marks strictly as `null` (never `0`), records `gradedBy`, calls `onAcademicRecordChanged(studentId, 'mark')`.

### Student Portal Pages (Group C)
- **Dashboard** (`/student/dashboard`):
  - Summary KPI cards: current semester, overall attendance percentage, continuous marks average, upcoming deadlines.
  - Low-attendance warning banner when attendance falls below `PROVISIONAL_ATTENDANCE_THRESHOLD` (75%).
  - Registered courses quick list.
  - Integration panels for Risk Engine and Advising Notifications with clean "Not available yet" empty states attributing Developer 2.
- **Courses & Semester Overview** (`/student/courses`):
  - Interactive semester switcher dropdown.
  - Registered courses cards with course code, title, credits, department, enrollment status, and total credit load.
- **Attendance Tracking** (`/student/attendance`):
  - Policy threshold indicator (≥75% provisional minimum).
  - Subject-by-subject attendance cards with classes held, attended, absent, and percentage.
  - Searchable and filterable session history table (filters by course, attendance status, date/notes).
- **Continuous Marks** (`/student/marks`):
  - Course-wise and global evaluation breakdown.
  - Quizzes, assignments, midterms, projects with weights and feedback.
  - **Missing Marks Semantics**: Unrecorded evaluations display as `"Not recorded"`, never coerced to 0 or 0.0.
- **Performance Analytics & Trend Curves** (`/student/performance`):
  - Marks trend computed using pure, unit-tested function `computeCourseMarksTrend`.
  - Cumulative attendance progression computed using pure function `computeAttendanceTrend`.
  - Unit tests in `scripts/testChartMath.ts` verify null-handling, empty arrays, and running ratios (19/19 passing).
  - Academic recommendations and deadline reminders sections.
