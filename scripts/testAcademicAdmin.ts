/**
 * Academic Setup & Administration Verification Test Suite
 * Validates:
 * 1. Course model lifecycle (isActive, code, title, credits, department)
 * 2. Semester date validation (start < end, YYYY-MM-DD) & single current semester logic
 * 3. Enrollment creation & duplicate active enrollment prevention
 * 4. Assessment creation & maxMarks > 0 validation
 * 5. Marks boundary checks (rejection of < 0 and > maxMarks, preservation of null for unrecorded)
 * 6. Scoped deadline retrieval (filtered by active enrolled courses and active status)
 */

interface MockCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  department: string;
  isActive: boolean;
}

interface MockSemester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface MockEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  status: 'enrolled' | 'dropped' | 'completed';
}

interface MockAssessment {
  id: string;
  courseId: string;
  semesterId: string;
  title: string;
  type: string;
  maxMarks: number;
  weightage: number;
  dueDate: string;
}

interface MockDeadline {
  id: string;
  courseId: string;
  semesterId?: string;
  assessmentId?: string | null;
  studentId?: string;
  title: string;
  dueDate: string;
  isActive: boolean;
}

interface MockMark {
  id: string;
  assessmentId: string;
  studentId: string;
  obtainedMarks: number | null;
}

class MockAcademicRecordHarness {
  courses = new Map<string, MockCourse>();
  semesters = new Map<string, MockSemester>();
  enrollments = new Map<string, MockEnrollment>();
  assessments = new Map<string, MockAssessment>();
  deadlines = new Map<string, MockDeadline>();
  marks = new Map<string, MockMark>();

  // 1. Course validation & CRUD
  createCourse(course: Omit<MockCourse, 'id' | 'isActive'> & { isActive?: boolean }): string {
    if (!course.code?.trim() || !course.title?.trim()) {
      throw new Error('VALIDATION_ERROR: Course code and title are required.');
    }
    if (typeof course.credits !== 'number' || course.credits <= 0) {
      throw new Error('VALIDATION_ERROR: Credits must be a positive number greater than 0.');
    }
    const id = course.code.toLowerCase().trim();
    if (this.courses.has(id)) {
      throw new Error(`ALREADY_EXISTS: Course code "${course.code}" already exists.`);
    }
    this.courses.set(id, {
      ...course,
      id,
      isActive: course.isActive !== undefined ? course.isActive : true,
    });
    return id;
  }

  setCourseActive(courseId: string, isActive: boolean) {
    const course = this.courses.get(courseId);
    if (!course) throw new Error(`NOT_FOUND: Course "${courseId}" not found.`);
    course.isActive = isActive;
  }

  // 2. Semester validation & single current term logic
  createSemester(sem: Omit<MockSemester, 'id'>): string {
    if (!sem.name?.trim() || !sem.startDate || !sem.endDate) {
      throw new Error('VALIDATION_ERROR: Semester name, startDate, and endDate are required.');
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(sem.startDate) || !dateRegex.test(sem.endDate)) {
      throw new Error('VALIDATION_ERROR: Dates must be formatted as YYYY-MM-DD.');
    }
    if (sem.startDate >= sem.endDate) {
      throw new Error('VALIDATION_ERROR: Semester startDate must be strictly before endDate.');
    }

    if (sem.isCurrent) {
      // Unset any existing current semester
      for (const existing of this.semesters.values()) {
        if (existing.isCurrent) existing.isCurrent = false;
      }
    }

    const id = sem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    this.semesters.set(id, { ...sem, id });
    return id;
  }

  setCurrentSemester(semesterId: string) {
    const target = this.semesters.get(semesterId);
    if (!target) throw new Error(`NOT_FOUND: Semester "${semesterId}" not found.`);
    for (const sem of this.semesters.values()) {
      sem.isCurrent = sem.id === semesterId;
    }
  }

  // 3. Enrollment validation & duplicate prevention
  createEnrollment(enr: Omit<MockEnrollment, 'id'>): string {
    if (!enr.studentId || !enr.courseId || !enr.semesterId) {
      throw new Error('VALIDATION_ERROR: studentId, courseId, and semesterId are required.');
    }
    // Prevent duplicate active enrollments
    for (const existing of this.enrollments.values()) {
      if (
        existing.studentId === enr.studentId &&
        existing.courseId === enr.courseId &&
        existing.semesterId === enr.semesterId &&
        existing.status === 'enrolled'
      ) {
        throw new Error(`ALREADY_ENROLLED: Student is already actively enrolled in course "${enr.courseId}" for semester "${enr.semesterId}".`);
      }
    }
    const id = `enr_${enr.studentId}_${enr.courseId}_${enr.semesterId}`;
    this.enrollments.set(id, { ...enr, id });
    return id;
  }

  // 4. Assessment validation & maxMarks > 0
  createAssessment(asmt: Omit<MockAssessment, 'id'>): string {
    if (!asmt.courseId || !asmt.title?.trim()) {
      throw new Error('VALIDATION_ERROR: courseId and title are required.');
    }
    if (typeof asmt.maxMarks !== 'number' || isNaN(asmt.maxMarks) || asmt.maxMarks <= 0) {
      throw new Error('VALIDATION_ERROR: maxMarks must be a positive number strictly greater than 0.');
    }
    if (typeof asmt.weightage !== 'number' || asmt.weightage < 0 || asmt.weightage > 100) {
      throw new Error('VALIDATION_ERROR: weightage must be between 0 and 100.');
    }
    const id = `asmt_${asmt.courseId}_${Date.now()}`;
    this.assessments.set(id, { ...asmt, id });
    return id;
  }

  // 5. Marks validation
  upsertMark(mark: MockMark): string {
    const asmt = this.assessments.get(mark.assessmentId);
    if (!asmt) throw new Error(`NOT_FOUND: Assessment "${mark.assessmentId}" not found.`);

    if (mark.obtainedMarks !== null && mark.obtainedMarks !== undefined) {
      if (typeof mark.obtainedMarks !== 'number' || isNaN(mark.obtainedMarks)) {
        throw new Error('VALIDATION_ERROR: obtainedMarks must be a valid number or null.');
      }
      if (mark.obtainedMarks < 0) {
        throw new Error('VALIDATION_ERROR: obtainedMarks cannot be negative.');
      }
      if (mark.obtainedMarks > asmt.maxMarks) {
        throw new Error(`VALIDATION_ERROR: obtainedMarks (${mark.obtainedMarks}) cannot exceed maximum marks (${asmt.maxMarks}).`);
      }
    }
    const docId = `mrk_${mark.studentId}_${mark.assessmentId}`;
    this.marks.set(docId, {
      ...mark,
      obtainedMarks: mark.obtainedMarks ?? null, // Strictly null if missing, never 0
    });
    return docId;
  }

  // 6. Scoped deadline retrieval
  getDeadlinesForStudent(studentId: string): MockDeadline[] {
    const activeEnrolledCourseIds = Array.from(this.enrollments.values())
      .filter((e) => e.studentId === studentId && e.status === 'enrolled')
      .map((e) => e.courseId);

    if (activeEnrolledCourseIds.length === 0) return [];

    return Array.from(this.deadlines.values()).filter((d) => {
      // Recipient check
      if (d.studentId && d.studentId !== studentId) return false;
      // Active check
      if (d.isActive === false) return false;
      // Enrolled course check
      return activeEnrolledCourseIds.includes(d.courseId);
    });
  }
}

export function runAcademicAdminTests() {
  console.log('=== RUNNING ACADEMIC SETUP & ADMIN VERIFICATION SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  function assertThrows(fn: () => void, expectedSubstr: string, testName: string) {
    try {
      fn();
      console.error(`[FAIL] ${testName} - Expected error containing "${expectedSubstr}" was not thrown`);
      failed++;
    } catch (err: any) {
      if (err.message && err.message.includes(expectedSubstr)) {
        console.log(`[PASS] ${testName}`);
        passed++;
      } else {
        console.error(`[FAIL] ${testName} - Got wrong error: "${err.message}" (expected "${expectedSubstr}")`);
        failed++;
      }
    }
  }

  const harness = new MockAcademicRecordHarness();

  // Test Group 1: Course Lifecycle & Validation
  console.log('--- Test Group 1: Course Lifecycle & Validation ---');
  const cse101 = harness.createCourse({
    code: 'CSE101',
    title: 'Introduction to Computer Science',
    credits: 3,
    department: 'CSE',
  });
  assert(harness.courses.get(cse101)?.isActive === true, 'New course defaults to active (isActive: true)');

  harness.setCourseActive(cse101, false);
  assert(harness.courses.get(cse101)?.isActive === false, 'Course can be deactivated (isActive: false)');

  harness.setCourseActive(cse101, true);
  assert(harness.courses.get(cse101)?.isActive === true, 'Course can be reactivated (isActive: true)');

  assertThrows(
    () => harness.createCourse({ code: 'CSE101', title: 'Duplicate', credits: 3, department: 'CSE' }),
    'ALREADY_EXISTS',
    'Duplicate course code is rejected'
  );

  assertThrows(
    () => harness.createCourse({ code: '', title: 'Missing Code', credits: 3, department: 'CSE' }),
    'VALIDATION_ERROR',
    'Course missing code is rejected'
  );

  assertThrows(
    () => harness.createCourse({ code: 'CSE999', title: 'Zero Credits', credits: 0, department: 'CSE' }),
    'VALIDATION_ERROR',
    'Course with non-positive credits is rejected'
  );

  // Test Group 2: Semester Date Validation & Current Semester Logic
  console.log('\n--- Test Group 2: Semester Date Boundaries & Current Selection ---');
  const sem1 = harness.createSemester({
    name: 'Spring 2026',
    startDate: '2026-01-15',
    endDate: '2026-05-30',
    isCurrent: true,
  });
  assert(harness.semesters.get(sem1)?.isCurrent === true, 'Spring 2026 is initial current semester');

  const sem2 = harness.createSemester({
    name: 'Summer 2026',
    startDate: '2026-06-01',
    endDate: '2026-09-15',
    isCurrent: true, // Marked current upon creation
  });
  assert(harness.semesters.get(sem2)?.isCurrent === true, 'Summer 2026 is now current semester');
  assert(harness.semesters.get(sem1)?.isCurrent === false, 'Spring 2026 automatically lost current semester flag');

  assertThrows(
    () => harness.createSemester({ name: 'Inverted', startDate: '2026-10-01', endDate: '2026-05-01', isCurrent: false }),
    'VALIDATION_ERROR: Semester startDate must be strictly before endDate',
    'Inverted semester dates (start > end) are rejected'
  );

  assertThrows(
    () => harness.createSemester({ name: 'Equal Dates', startDate: '2026-05-01', endDate: '2026-05-01', isCurrent: false }),
    'VALIDATION_ERROR: Semester startDate must be strictly before endDate',
    'Identical start and end dates are rejected'
  );

  assertThrows(
    () => harness.createSemester({ name: 'Bad Format', startDate: '01/15/2026', endDate: '2026-05-30', isCurrent: false }),
    'VALIDATION_ERROR: Dates must be formatted as YYYY-MM-DD',
    'Invalid date formats are rejected'
  );

  // Test Group 3: Enrollment Lifecycle & Duplicate Prevention
  console.log('\n--- Test Group 3: Enrollment Invariants ---');
  const enr1 = harness.createEnrollment({
    studentId: 'student_alice',
    courseId: 'cse101',
    semesterId: 'summer-2026',
    status: 'enrolled',
  });
  assert(Boolean(enr1), 'Active enrollment created successfully');

  assertThrows(
    () => harness.createEnrollment({
      studentId: 'student_alice',
      courseId: 'cse101',
      semesterId: 'summer-2026',
      status: 'enrolled',
    }),
    'ALREADY_ENROLLED',
    'Duplicate active enrollment for same student, course, and semester is rejected'
  );

  // Test Group 4: Assessment Creation & maxMarks > 0 Validation
  console.log('\n--- Test Group 4: Assessment maxMarks > 0 & Weightage Invariants ---');
  const asmt1 = harness.createAssessment({
    courseId: 'cse101',
    semesterId: 'summer-2026',
    title: 'Midterm Exam',
    type: 'midterm',
    maxMarks: 50,
    weightage: 25,
    dueDate: '2026-07-15T10:00:00Z',
  });
  assert(Boolean(asmt1), 'Midterm assessment created with maxMarks=50');

  assertThrows(
    () => harness.createAssessment({
      courseId: 'cse101',
      semesterId: 'summer-2026',
      title: 'Invalid Zero Max',
      type: 'quiz',
      maxMarks: 0,
      weightage: 10,
      dueDate: '2026-07-20T10:00:00Z',
    }),
    'VALIDATION_ERROR: maxMarks must be a positive number strictly greater than 0',
    'maxMarks = 0 is rejected'
  );

  assertThrows(
    () => harness.createAssessment({
      courseId: 'cse101',
      semesterId: 'summer-2026',
      title: 'Negative Max',
      type: 'quiz',
      maxMarks: -10,
      weightage: 10,
      dueDate: '2026-07-20T10:00:00Z',
    }),
    'VALIDATION_ERROR: maxMarks must be a positive number strictly greater than 0',
    'maxMarks < 0 is rejected'
  );

  assertThrows(
    () => harness.createAssessment({
      courseId: 'cse101',
      semesterId: 'summer-2026',
      title: 'Excess Weight',
      type: 'final',
      maxMarks: 100,
      weightage: 110,
      dueDate: '2026-08-20T10:00:00Z',
    }),
    'VALIDATION_ERROR: weightage must be between 0 and 100',
    'Weightage > 100% is rejected'
  );

  // Test Group 5: Marks Entry Validation & Null Missing Invariant
  console.log('\n--- Test Group 5: Marks Entry Upper/Lower Boundaries & Null Semantics ---');
  const validMarkId = harness.upsertMark({
    id: '',
    assessmentId: asmt1,
    studentId: 'student_alice',
    obtainedMarks: 42,
  });
  assert(harness.marks.get(validMarkId)?.obtainedMarks === 42, 'Valid mark (42/50) persisted correctly');

  assertThrows(
    () => harness.upsertMark({
      id: '',
      assessmentId: asmt1,
      studentId: 'student_alice',
      obtainedMarks: -5,
    }),
    'VALIDATION_ERROR: obtainedMarks cannot be negative',
    'Negative mark (-5) is rejected'
  );

  assertThrows(
    () => harness.upsertMark({
      id: '',
      assessmentId: asmt1,
      studentId: 'student_alice',
      obtainedMarks: 55, // exceeds 50
    }),
    'VALIDATION_ERROR: obtainedMarks (55) cannot exceed maximum marks (50)',
    'Marks exceeding maxMarks are rejected'
  );

  const unrecordedMarkId = harness.upsertMark({
    id: '',
    assessmentId: asmt1,
    studentId: 'student_bob',
    obtainedMarks: null,
  });
  assert(harness.marks.get(unrecordedMarkId)?.obtainedMarks === null, 'Unrecorded mark remains strictly null and is never coerced to 0');

  // Test Group 6: Scoped Deadline Visibility by Active Enrollments
  console.log('\n--- Test Group 6: Deadline Scoping by Student Active Enrollments ---');
  // Create second course and enroll bob only
  const cse202 = harness.createCourse({
    code: 'CSE202',
    title: 'Data Structures',
    credits: 3,
    department: 'CSE',
  });
  harness.createEnrollment({
    studentId: 'student_bob',
    courseId: 'cse202',
    semesterId: 'summer-2026',
    status: 'enrolled',
  });

  // Deadlines:
  // d1: for cse101, active
  harness.deadlines.set('d1', {
    id: 'd1',
    courseId: 'cse101',
    title: 'CSE101 Assignment 1',
    dueDate: '2026-07-10T12:00:00Z',
    isActive: true,
  });
  // d2: for cse101, but DEACTIVATED
  harness.deadlines.set('d2', {
    id: 'd2',
    courseId: 'cse101',
    title: 'CSE101 Cancelled Project',
    dueDate: '2026-07-20T12:00:00Z',
    isActive: false,
  });
  // d3: for cse202, active
  harness.deadlines.set('d3', {
    id: 'd3',
    courseId: 'cse202',
    title: 'CSE202 Lab Report',
    dueDate: '2026-07-15T12:00:00Z',
    isActive: true,
  });
  // d4: for cse101, targeted specifically to student_charlie (not alice)
  harness.deadlines.set('d4', {
    id: 'd4',
    courseId: 'cse101',
    studentId: 'student_charlie',
    title: 'CSE101 Remedial Work for Charlie',
    dueDate: '2026-07-22T12:00:00Z',
    isActive: true,
  });

  const aliceDeadlines = harness.getDeadlinesForStudent('student_alice');
  const bobDeadlines = harness.getDeadlinesForStudent('student_bob');

  assert(
    aliceDeadlines.some((d) => d.id === 'd1'),
    'Alice sees active deadline d1 for her enrolled course CSE101'
  );
  assert(
    !aliceDeadlines.some((d) => d.id === 'd2'),
    'Alice does NOT see deactivated deadline d2'
  );
  assert(
    !aliceDeadlines.some((d) => d.id === 'd3'),
    'Alice does NOT see deadline d3 from CSE202 which she is NOT enrolled in'
  );
  assert(
    !aliceDeadlines.some((d) => d.id === 'd4'),
    'Alice does NOT see deadline d4 targeted to another student'
  );

  assert(
    bobDeadlines.some((d) => d.id === 'd3'),
    'Bob sees active deadline d3 for his enrolled course CSE202'
  );
  assert(
    !bobDeadlines.some((d) => d.id === 'd1'),
    'Bob does NOT see deadline d1 for CSE101 which he is NOT enrolled in'
  );

  console.log(`\n======================================================`);
  console.log(`FINAL RESULT: ${passed} passed, ${failed} failed.`);
  console.log(`======================================================`);

  if (failed > 0) process.exit(1);
}

runAcademicAdminTests();
