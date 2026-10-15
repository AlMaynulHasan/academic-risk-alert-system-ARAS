import { computeCourseMarksTrend, computeAttendanceTrend } from '../src/shared/utils/chartMath';
import { Assessment, Mark, AttendanceRecord } from '../src/shared/types';

function runTests() {
  console.log('--- Running Chart Math Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Test 1: Empty assessments returns empty trend and null average
  const emptyRes = computeCourseMarksTrend([], []);
  assert(emptyRes.trend.length === 0, 'Empty assessments should produce empty trend array');
  assert(emptyRes.averageMarksPercentage === null, 'Empty assessments average should be null');
  assert(emptyRes.totalRecordedAssessments === 0, 'Empty assessments total recorded should be 0');

  // Test 2: Assessments with null (missing) marks preserves null and calculates average only from recorded marks
  const sampleAssessments: Assessment[] = [
    {
      id: 'a1',
      courseId: 'cse-311',
      semesterId: '2026-spring',
      title: 'Quiz 1',
      type: 'quiz',
      maxMarks: 20,
      weightage: 10,
      dueDate: '2026-02-01T00:00:00Z',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
    {
      id: 'a2',
      courseId: 'cse-311',
      semesterId: '2026-spring',
      title: 'Assignment 1',
      type: 'assignment',
      maxMarks: 50,
      weightage: 20,
      dueDate: '2026-02-15T00:00:00Z',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
    {
      id: 'a3',
      courseId: 'cse-311',
      semesterId: '2026-spring',
      title: 'Midterm',
      type: 'midterm',
      maxMarks: 100,
      weightage: 30,
      dueDate: '2026-03-01T00:00:00Z',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
  ];

  const sampleMarks: Mark[] = [
    {
      id: 'm1',
      assessmentId: 'a1',
      studentId: 's1',
      enrollmentId: 'e1',
      obtainedMarks: 16, // 16 / 20 = 80%
      submittedAt: null,
      gradedAt: null,
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
    {
      id: 'm2',
      assessmentId: 'a2',
      studentId: 's1',
      enrollmentId: 'e1',
      obtainedMarks: null, // Critical: Missing mark is null, NOT 0
      submittedAt: null,
      gradedAt: null,
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
    // a3 has no mark doc at all
  ];

  const res2 = computeCourseMarksTrend(sampleMarks, sampleAssessments);
  assert(res2.trend.length === 3, 'Should produce 3 trend points');
  assert(res2.trend[0].percentage === 80, 'First assessment score should be 80%');
  assert(res2.trend[1].obtainedMarks === null, 'Second assessment obtained mark should be null');
  assert(res2.trend[1].percentage === null, 'Second assessment percentage should be null (not 0)');
  assert(res2.trend[2].obtainedMarks === null, 'Third assessment obtained mark should be null');
  assert(res2.totalRecordedAssessments === 1, 'Total recorded assessments should be exactly 1');
  assert(res2.totalMissingAssessments === 2, 'Total missing assessments should be 2');
  assert(res2.averageMarksPercentage === 80, 'Average should be 80% (derived exclusively from recorded marks, not dragging down to 26%)');

  // Test 3: Grade of zero is an evaluated zero, distinguished from null
  const marksWithZero: Mark[] = [
    {
      id: 'mz',
      assessmentId: 'a1',
      studentId: 's1',
      enrollmentId: 'e1',
      obtainedMarks: 0, // Evaluated zero
      submittedAt: null,
      gradedAt: null,
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
  ];
  const resZero = computeCourseMarksTrend(marksWithZero, [sampleAssessments[0]]);
  assert(resZero.trend[0].obtainedMarks === 0, 'Evaluated zero is 0');
  assert(resZero.trend[0].percentage === 0, 'Evaluated zero percentage is 0');
  assert(resZero.averageMarksPercentage === 0, 'Average with evaluated zero is 0');

  // Test 4: Empty attendance returns empty array
  const emptyAtt = computeAttendanceTrend([]);
  assert(emptyAtt.length === 0, 'Empty attendance should return empty array');

  // Test 5: Attendance trend running calculation
  const sampleAtt: AttendanceRecord[] = [
    {
      id: 'att1',
      enrollmentId: 'e1',
      studentId: 's1',
      courseId: 'cse-311',
      date: '2026-02-01',
      status: 'present',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
    {
      id: 'att2',
      enrollmentId: 'e1',
      studentId: 's1',
      courseId: 'cse-311',
      date: '2026-02-03',
      status: 'absent',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
    {
      id: 'att3',
      enrollmentId: 'e1',
      studentId: 's1',
      courseId: 'cse-311',
      date: '2026-02-05',
      status: 'present',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
    },
  ];

  const attRes = computeAttendanceTrend(sampleAtt);
  assert(attRes.length === 3, 'Should return 3 trend points');
  assert(attRes[0].cumulativeRate === 100, 'Class 1: 1/1 = 100%');
  assert(attRes[1].cumulativeRate === 50, 'Class 2: 1/2 = 50%');
  assert(attRes[2].cumulativeRate === 66.7, 'Class 3: 2/3 = 66.7%');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
