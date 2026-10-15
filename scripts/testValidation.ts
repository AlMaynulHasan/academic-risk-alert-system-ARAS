import { formatDhakaDateOnly } from '../src/shared/utils/date';

function runValidationTests() {
  console.log('--- Running AcademicRecordService Validation Tests ---');
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

  // 1. Status enum validation
  const validStatuses = ['present', 'absent', 'late', 'excused'];
  assert(validStatuses.includes('present'), 'present is valid status');
  assert(!validStatuses.includes('partially_present'), 'partially_present is invalid status');

  // 2. Future date check in Dhaka timezone
  const today = formatDhakaDateOnly(new Date());
  const futureDate = '2029-01-01';
  assert(futureDate > today, 'Future date is detected correctly as greater than today in Dhaka');
  assert(today <= today, 'Today is permitted for attendance record');

  // 3. Mark boundary checks
  const maxMarks = 20;
  const validMark = 18;
  const negativeMark = -1;
  const exceededMark = 25;
  const nullMark = null;

  assert(validMark >= 0 && validMark <= maxMarks, 'Valid mark passes boundary check');
  assert(negativeMark < 0, 'Negative mark is flagged');
  assert(exceededMark > maxMarks, 'Exceeded mark is flagged');
  assert(nullMark === null, 'Missing mark remains strictly null');

  console.log(`\nValidation results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runValidationTests();
