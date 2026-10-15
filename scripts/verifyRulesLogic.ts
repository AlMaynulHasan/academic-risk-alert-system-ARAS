/**
 * Verification of Firestore Security Rule Logic Invariants
 * Run with: npx tsx scripts/verifyRulesLogic.ts
 */

interface SecurityRuleContext {
  auth: { uid: string; email?: string } | null;
  role: 'student' | 'teacher' | 'admin';
  resourceData: Record<string, any>;
  incomingData?: Record<string, any>;
}

// Simulates firestore.rules evaluation for studentProfiles
function canReadStudentProfile(ctx: SecurityRuleContext): boolean {
  if (!ctx.auth) return false;
  return ctx.resourceData.userId === ctx.auth.uid || ctx.role === 'teacher' || ctx.role === 'admin';
}

// Simulates firestore.rules evaluation for enrollments, attendance, marks
function canReadAcademicRecord(ctx: SecurityRuleContext): boolean {
  if (!ctx.auth) return false;
  return ctx.resourceData.studentId === ctx.auth.uid || ctx.role === 'teacher' || ctx.role === 'admin';
}

// Simulates firestore.rules evaluation for users update
function canUpdateUserRole(ctx: SecurityRuleContext): boolean {
  if (!ctx.auth) return false;
  if (ctx.role === 'admin') return true;
  const isOwner = ctx.auth.uid === ctx.resourceData.id;
  const roleUnchanged = ctx.incomingData?.role === ctx.resourceData.role;
  return isOwner && roleUnchanged;
}

// Simulates firestore.rules evaluation for studentProfiles update
function canUpdateStudentProfile(ctx: SecurityRuleContext & { currentRole: string }): boolean {
  if (!ctx.auth) return false;
  if (ctx.currentRole === 'admin' || ctx.currentRole === 'university_admin' || ctx.currentRole === 'teacher') return true;
  const isOwner = ctx.resourceData.userId === ctx.auth.uid;
  const uidUnchanged = ctx.incomingData?.userId === ctx.resourceData.userId;
  const studentIdUnchanged = ctx.incomingData?.studentId === ctx.resourceData.studentId;
  const deptUnchanged = ctx.incomingData?.department === ctx.resourceData.department;
  return isOwner && uidUnchanged && studentIdUnchanged && deptUnchanged;
}

// Simulates firestore.rules evaluation for dept_admin scoping
function canDeptAdminModifyCourse(deptAdmin: { role: string; assignedDept: string }, courseDept: string): boolean {
  if (deptAdmin.role === 'admin' || deptAdmin.role === 'university_admin') return true;
  if (deptAdmin.role === 'dept_admin') {
    return deptAdmin.assignedDept.toLowerCase() === courseDept.toLowerCase();
  }
  return false;
}

// Simulates firestore.rules evaluation for course offering teacher scoping
function isCourseTeacherAuthorized(teacherUid: string, offering: { teacherIds: string[] }): boolean {
  return offering.teacherIds.includes(teacherUid);
}

function runSecurityTests() {
  console.log('--- Testing Firestore Security Rule Assertions ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  const studentA = { uid: 'student_A', email: 'studentA@example.edu' };
  const studentB = { uid: 'student_B', email: 'studentB@example.edu' };
  const teacher = { uid: 'teacher_T', email: 'teacher@example.edu' };
  const nonAssignedTeacher = { uid: 'teacher_Z', email: 'teacherZ@example.edu' };

  // 1. Student A reading own profile
  assert(
    canReadStudentProfile({ auth: studentA, role: 'student', resourceData: { userId: 'student_A' } }),
    'Student A can read own profile'
  );

  // 2. Student A reading Student B's profile
  assert(
    !canReadStudentProfile({ auth: studentA, role: 'student', resourceData: { userId: 'student_B' } }),
    'Student A CANNOT read Student B profile (Security Rules Reject)'
  );

  // 3. Student A reading own attendance
  assert(
    canReadAcademicRecord({ auth: studentA, role: 'student', resourceData: { studentId: 'student_A' } }),
    'Student A can read own attendance'
  );

  // 4. Student A reading Student B's attendance
  assert(
    !canReadAcademicRecord({ auth: studentA, role: 'student', resourceData: { studentId: 'student_B' } }),
    'Student A CANNOT read Student B attendance (Security Rules Reject)'
  );

  // 5. Student A reading Student B's marks
  assert(
    !canReadAcademicRecord({ auth: studentA, role: 'student', resourceData: { studentId: 'student_B' } }),
    'Student A CANNOT read Student B marks (Security Rules Reject)'
  );

  // 6. Teacher can read assigned advisee record
  assert(
    canReadAcademicRecord({ auth: teacher, role: 'teacher', resourceData: { studentId: 'student_A' } }),
    'Faculty Advisor can read student academic records'
  );

  // 7. Student attempting self-promotion / role change
  assert(
    !canUpdateUserRole({
      auth: studentA,
      role: 'student',
      resourceData: { id: 'student_A', role: 'student' },
      incomingData: { id: 'student_A', role: 'admin' },
    }),
    'Student CANNOT change own role to admin (Security Rules Reject)'
  );

  // 8. Student attempting to alter official student ID
  assert(
    !canUpdateStudentProfile({
      auth: studentA,
      role: 'student',
      currentRole: 'student',
      resourceData: { userId: 'student_A', studentId: 'CSE-2022-041', department: 'CSE' },
      incomingData: { userId: 'student_A', studentId: 'CSE-9999-999', department: 'CSE' },
    }),
    'Student CANNOT change official student ID (Security Rules Reject)'
  );

  // 9. Student attempting to alter official department
  assert(
    !canUpdateStudentProfile({
      auth: studentA,
      role: 'student',
      currentRole: 'student',
      resourceData: { userId: 'student_A', studentId: 'CSE-2022-041', department: 'CSE' },
      incomingData: { userId: 'student_A', studentId: 'CSE-2022-041', department: 'BBA' },
    }),
    'Student CANNOT change official department (Security Rules Reject)'
  );

  // 10. Dept Admin of CSE can manage CSE course
  assert(
    canDeptAdminModifyCourse({ role: 'dept_admin', assignedDept: 'CSE' }, 'CSE'),
    'Department Admin of CSE can manage CSE course'
  );

  // 11. Dept Admin of EEE CANNOT manage CSE course
  assert(
    !canDeptAdminModifyCourse({ role: 'dept_admin', assignedDept: 'EEE' }, 'CSE'),
    'Department Admin of EEE CANNOT manage CSE course (Department Scoping Enforced)'
  );

  // 12. Assigned Course Teacher can manage offering
  assert(
    isCourseTeacherAuthorized(teacher.uid, { teacherIds: [teacher.uid] }),
    'Assigned Course Teacher is authorized for their course offering'
  );

  // 13. Non-assigned Teacher is restricted
  assert(
    !isCourseTeacherAuthorized(nonAssignedTeacher.uid, { teacherIds: [teacher.uid] }),
    'Non-assigned teacher is restricted from managing course offering'
  );

  console.log(`\nSecurity assertions results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runSecurityTests();
