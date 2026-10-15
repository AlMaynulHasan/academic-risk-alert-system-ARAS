# Academic Risk Alert System — Phased Implementation Plan

## Proposed Changes & Phased Architecture

This plan establishes the implementation roadmap to upgrade the **Academic Risk Alert System** to support granular 5-tier role scoping, administrative pre-registration with tokenized activation, and formal course offerings, while maintaining 100% backward compatibility with all 42 existing operational features and 9 automated test suites.

---

### Phase 1: Academic Hierarchy & Role Foundations
- **Objective**: Extend existing types and schema without breaking existing database structures or components.
- **Tasks**:
  1. Add TypeScript definitions in `src/shared/types/index.ts`:
     - `Department` (`id`, `code`, `name`, `headOfDeptId`).
     - `CourseOffering` (`id`, `courseId`, `semesterId`, `section`, `teacherIds`, `status`).
     - `StudentInvitation` (`id`, `officialStudentId`, `email`, `department`, `batch`, `section`, `expiresAt`, `status`, `linkedUid`).
     - `UserRole` union extended: `'university_admin' | 'dept_admin' | 'teacher' | 'advisor' | 'student'`.
  2. Implement backward-compatible getters in `academicRecordService.ts` that synthesize offering contexts for legacy courses and enrollments.
  3. Validate with existing test suites (`testRiskEngine.ts`, `testIntegrationE2E.ts`).

### Phase 2: Administrative Pre-Registration & Tokenized Activation
- **Objective**: Replace open student self-registration with an admin-driven invitation and token activation workflow.
- **Tasks**:
  1. Implement Admin Student Pre-Registration interface in `/admin/users` allowing University/Dept Admins to register official student IDs and emails.
  2. Implement invitation token generation (7-day expiry) stored in `studentInvitations`.
  3. Create `/activate` page for students to link their Firebase Auth credentials to their pre-registered profile.
  4. Enforce one-time token redemption and immutable student IDs in Firestore Security Rules.

### Phase 3: Course Offerings & Multi-Faculty Scoping
- **Objective**: Distinguish reusable catalog courses from term-specific course offerings.
- **Tasks**:
  1. Build Course Offering creation and faculty assignment modal for Department Admins.
  2. Scope Course Teacher views so teachers only enter marks and attendance for sections they teach.
  3. Enhance Advisor section assignments alongside individual advisee assignments.

### Phase 4: Departmental Scoping & Firestore Rules Hardening
- **Objective**: Secure data access boundaries at the Firestore Rules layer.
- **Tasks**:
  1. Update `firestore.rules` to enforce department isolation for Department Admins.
  2. Enforce course offering faculty checks for attendance and mark updates.
  3. Maintain strict server-only authority on `alertCounters` (protecting the max-2-alerts-per-month Asia/Dhaka quota).

### Phase 5: Verification & Automated Regression Suite
- **Objective**: Validate complete multi-role end-to-end workflows.
- **Tasks**:
  1. Add `scripts/testMultiRoleE2E.ts` covering all 5 roles and tokenized activation.
  2. Run full 10-suite regression test matrix.
  3. Execute `npm run lint` and `npm run build` (`compile_applet`).

---

## Verification Plan

### Automated Test Suite Execution
- `npx tsx scripts/testIntegrationE2E.ts` (13-step workflow, 47 assertions)
- `npx tsx scripts/testHardenRiskAlerts.ts` (Trusted quota & Dhaka period, 17 assertions)
- `npx tsx scripts/testRiskEngine.ts` (Deterministic risk calculation & insufficient data, 40 assertions)
- `npx tsx scripts/testValidation.ts` (Input validation & zero/null marks, 33 assertions)
- `npx tsx scripts/testProgressComparison.ts` (Pre/post intervention metrics, 26 assertions)
- `npx tsx scripts/testChartMath.ts` (Analytics trend curves, 19 assertions)
- `npx tsx scripts/testAcademicAdmin.ts` (Admin course & semester operations, 15 assertions)
- `npx tsx scripts/verifyPerformanceHistory.ts` (Performance history integrity, 8 assertions)
- `npx tsx scripts/verifyRulesLogic.ts` (Security rules logic, 16 assertions)

### Manual / Browser Verification
- Verify Admin Pre-registration modal creates invitation records.
- Verify activation link `/activate?token=...` binds UID and redirects to `/student/dashboard`.
- Verify Dept Admin cannot access or modify records of another department.
- Verify Course Teacher can only submit attendance and marks for assigned course offerings.
- Verify Advisor can only initiate interventions and follow-ups for assigned advisees.
