/**
 * Unit Test Suite for Intervention Progress Comparison Engine
 * Run with: npx tsx scripts/testProgressComparison.ts
 */

import {
  calculateProgressComparison,
  computeWindowAttendance,
  computeWindowMarks,
} from '../src/modules/teacher/progressComparison';
import {
  Intervention,
  AttendanceRecord,
  Mark,
  Assessment,
} from '../src/shared/types';

function runProgressComparisonTests() {
  console.log('--- Running Intervention Progress Comparison Tests ---');
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

  const sampleIntervention: Intervention = {
    id: 'int_001',
    studentId: 'student_001',
    teacherId: 'teacher_001',
    reason: 'High risk alert: attendance dropped to 50%',
    actionPlan: 'Weekly advising and attendance monitoring',
    targetDate: '2026-03-01',
    status: 'in_progress',
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-02-15T00:00:00.000Z',
    createdBy: 'teacher_001',
  };

  const assessments: Assessment[] = [
    {
      id: 'asmt_1',
      courseId: 'cse-311',
      semesterId: '2026-spring',
      title: 'Quiz 1',
      type: 'quiz',
      maxMarks: 20,
      weightage: 10,
      dueDate: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'teacher_001',
    },
    {
      id: 'asmt_2',
      courseId: 'cse-311',
      semesterId: '2026-spring',
      title: 'Quiz 2',
      type: 'quiz',
      maxMarks: 20,
      weightage: 10,
      dueDate: '2026-03-01T00:00:00.000Z',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'teacher_001',
    },
  ];

  // Test 1: Window Attendance Calculation
  const sampleAtt: AttendanceRecord[] = [
    { id: '1', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-10', status: 'present', createdAt: '', updatedAt: '', createdBy: '' },
    { id: '2', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-12', status: 'late', createdAt: '', updatedAt: '', createdBy: '' },
    { id: '3', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-14', status: 'absent', createdAt: '', updatedAt: '', createdBy: '' },
  ];
  const attRes = computeWindowAttendance(sampleAtt);
  assert(attRes.total === 3, 'computeWindowAttendance: 3 records');
  assert(attRes.attended === 1.5, 'computeWindowAttendance: 1.5 attended (present 1.0 + late 0.5)');
  assert(attRes.percentage === 50.0, 'computeWindowAttendance: percentage 50.0%');

  // Test 2: Window Marks Calculation - Null never coerced to 0
  const sampleMarks: Mark[] = [
    { id: 'm1', assessmentId: 'asmt_1', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 16, submittedAt: null, gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
    { id: 'm2', assessmentId: 'asmt_2', studentId: 's1', enrollmentId: 'e1', obtainedMarks: null, submittedAt: null, gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
  ];
  const asmtMap = new Map<string, Assessment>([['asmt_1', assessments[0]], ['asmt_2', assessments[1]]]);
  const marksRes = computeWindowMarks(sampleMarks, asmtMap);
  assert(marksRes.count === 1, 'computeWindowMarks: only 1 evaluated mark (null excluded)');
  assert(marksRes.average === 80.0, 'computeWindowMarks: 16/20 = 80.0% (not diluted by missing mark)');

  // Test 3: Insufficient Data (Pre window has attendance, post window has 0 attendance)
  const compInsuffAtt = calculateProgressComparison({
    intervention: sampleIntervention,
    attendanceRecords: [
      { id: '1', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-10', status: 'absent', createdAt: '', updatedAt: '', createdBy: '' },
    ],
    marks: [
      { id: 'm1', assessmentId: 'asmt_1', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 10, submittedAt: '2026-02-10', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
      { id: 'm2', assessmentId: 'asmt_2', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 18, submittedAt: '2026-03-01', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
    ],
    assessments,
  });
  assert(compInsuffAtt.hasSufficientData === false, 'Insufficient data detected when post-attendance is missing');
  assert(compInsuffAtt.verdict === 'Not enough data to compare', 'Verdict is strictly "Not enough data to compare"');
  assert(compInsuffAtt.message?.includes('Not enough data to compare') === true, 'Human-readable explanation provided');

  // Test 4: Missing Marks in Post Window (Never treated as improvement!)
  const compMissingPostMarks = calculateProgressComparison({
    intervention: sampleIntervention,
    attendanceRecords: [
      { id: '1', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-10', status: 'absent', createdAt: '', updatedAt: '', createdBy: '' },
      { id: '2', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-20', status: 'present', createdAt: '', updatedAt: '', createdBy: '' },
    ],
    marks: [
      { id: 'm1', assessmentId: 'asmt_1', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 8, submittedAt: '2026-02-10', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
      // Post-window mark is unrecorded (null):
      { id: 'm2', assessmentId: 'asmt_2', studentId: 's1', enrollmentId: 'e1', obtainedMarks: null, submittedAt: '2026-02-20', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
    ],
    assessments,
  });
  assert(compMissingPostMarks.hasSufficientData === false, 'Missing post-marks correctly flagged as insufficient data');
  assert(compMissingPostMarks.verdict === 'Not enough data to compare', 'Missing mark is NEVER presented as improvement');
  assert(compMissingPostMarks.marksDelta === null, 'marksDelta is null when evaluated marks are missing');

  // Test 5: Genuine Improvement
  const compImproved = calculateProgressComparison({
    intervention: sampleIntervention,
    attendanceRecords: [
      // Pre-window (before 2026-02-15): 1 absent out of 2 = 50%
      { id: '1', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-10', status: 'present', createdAt: '', updatedAt: '', createdBy: '' },
      { id: '2', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-12', status: 'absent', createdAt: '', updatedAt: '', createdBy: '' },
      // Post-window (on/after 2026-02-15): 2 present out of 2 = 100%
      { id: '3', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-16', status: 'present', createdAt: '', updatedAt: '', createdBy: '' },
      { id: '4', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-18', status: 'present', createdAt: '', updatedAt: '', createdBy: '' },
    ],
    marks: [
      // Pre-window: 10 / 20 = 50%
      { id: 'm1', assessmentId: 'asmt_1', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 10, submittedAt: '2026-02-10', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
      // Post-window: 18 / 20 = 90%
      { id: 'm2', assessmentId: 'asmt_2', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 18, submittedAt: '2026-02-20', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
    ],
    assessments,
  });
  assert(compImproved.hasSufficientData === true, 'Sufficient data present in both windows');
  assert(compImproved.preMetrics.attendancePercentage === 50.0, 'Pre-attendance is 50%');
  assert(compImproved.postMetrics.attendancePercentage === 100.0, 'Post-attendance is 100%');
  assert(compImproved.attendanceDelta === 50.0, 'Attendance delta is +50%');
  assert(compImproved.preMetrics.marksAverage === 50.0, 'Pre-marks average is 50%');
  assert(compImproved.postMetrics.marksAverage === 90.0, 'Post-marks average is 90%');
  assert(compImproved.marksDelta === 40.0, 'Marks delta is +40%');
  assert(compImproved.verdict === 'Improved', 'Verdict correctly determined as "Improved"');

  // Test 6: Genuine Decline
  const compDeclined = calculateProgressComparison({
    intervention: sampleIntervention,
    attendanceRecords: [
      // Pre: 100%
      { id: '1', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-10', status: 'present', createdAt: '', updatedAt: '', createdBy: '' },
      // Post: 0%
      { id: '2', enrollmentId: 'e1', studentId: 's1', courseId: 'c1', date: '2026-02-16', status: 'absent', createdAt: '', updatedAt: '', createdBy: '' },
    ],
    marks: [
      // Pre: 18/20 = 90%
      { id: 'm1', assessmentId: 'asmt_1', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 18, submittedAt: '2026-02-10', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
      // Post: 8/20 = 40%
      { id: 'm2', assessmentId: 'asmt_2', studentId: 's1', enrollmentId: 'e1', obtainedMarks: 8, submittedAt: '2026-02-20', gradedAt: null, createdAt: '', updatedAt: '', createdBy: '' },
    ],
    assessments,
  });
  assert(compDeclined.verdict === 'Declined', 'Verdict correctly determined as "Declined"');
  assert(compDeclined.attendanceDelta === -100.0, 'Attendance delta is -100%');
  assert(compDeclined.marksDelta === -50.0, 'Marks delta is -50%');

  // Test 7: Empty records array
  const compEmpty = calculateProgressComparison({
    intervention: sampleIntervention,
    attendanceRecords: [],
    marks: [],
    assessments: [],
  });
  assert(compEmpty.hasSufficientData === false, 'Empty data produces hasSufficientData: false');
  assert(compEmpty.verdict === 'Not enough data to compare', 'Empty data produces "Not enough data to compare"');
  assert(compEmpty.attendanceDelta === null, 'attendanceDelta is null');
  assert(compEmpty.marksDelta === null, 'marksDelta is null');

  console.log(`\nProgress comparison tests results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runProgressComparisonTests();
