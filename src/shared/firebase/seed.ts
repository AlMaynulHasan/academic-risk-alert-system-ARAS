import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './index';
import { getCurrentUtcIso } from '../utils/date';

export interface SeedResult {
  success: boolean;
  message: string;
  usersCreated: string[];
}

export async function seedSyntheticDatabase(): Promise<SeedResult> {
  const usersCreated: string[] = [];
  const now = getCurrentUtcIso();

  const demoUsers = [
    {
      email: 'student01@example.edu',
      password: 'Pass1234!',
      displayName: 'Rahim Ahmed (Demo Student)',
      role: 'student' as const,
    },
    {
      email: 'student02@example.edu',
      password: 'Pass1234!',
      displayName: 'Fatima Khan (Demo Student)',
      role: 'student' as const,
    },
    {
      email: 'teacher01@example.edu',
      password: 'Pass1234!',
      displayName: 'Dr. Tariqul Islam (Demo Advisor)',
      role: 'teacher' as const,
    },
    {
      email: 'admin01@example.edu',
      password: 'Pass1234!',
      displayName: 'System Admin (Demo)',
      role: 'admin' as const,
    },
    {
      email: 'maynulhasan625@gmail.com',
      password: 'Pass1234!',
      displayName: 'Md. Al-Maynul Hasan (Administrator)',
      role: 'admin' as const,
    },
  ];

  const uidMap: Record<string, string> = {};

  // 1. Create or sign-in users in Firebase Auth and populate users collection
  for (const u of demoUsers) {
    let uid = '';
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
      uid = cred.user.uid;
      usersCreated.push(u.email);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('email-already-in-use')) {
        // Sign in to get UID
        try {
          const cred = await signInWithEmailAndPassword(auth, u.email, u.password);
          uid = cred.user.uid;
        } catch {
          console.warn(`Could not sign in existing user ${u.email}`);
        }
      } else {
        console.warn(`User creation note for ${u.email}:`, errMsg);
      }
    }

    const fallbackId = u.email.includes('student01')
      ? 'demo-student-01'
      : u.email.includes('student02')
      ? 'demo-student-02'
      : u.email.includes('teacher')
      ? 'demo-teacher-01'
      : u.email.includes('maynul')
      ? 'demo-admin-maynul'
      : 'demo-admin-01';

    const effectiveUid = uid || fallbackId;
    uidMap[u.email] = effectiveUid;

    try {
      await setDoc(doc(db, 'users', effectiveUid), {
        id: effectiveUid,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    } catch (writeErr) {
      console.warn(`Could not save user ${u.email} to Firestore:`, writeErr);
    }
  }

  const s1Uid = uidMap['student01@example.edu'] || 'demo-student-01';
  const s2Uid = uidMap['student02@example.edu'] || 'demo-student-02';
  const t1Uid = uidMap['teacher01@example.edu'] || 'demo-teacher-01';

  // 2. studentProfiles
  await setDoc(doc(db, 'studentProfiles', s1Uid), {
    id: s1Uid,
    studentId: 'CSE-2022-041',
    userId: s1Uid,
    department: 'Computer Science and Engineering',
    batch: '2022',
    currentSemesterId: '2026-spring',
    cgpa: 3.42,
    phone: '+880 1711 000001',
    emergencyContact: '+880 1811 000001',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  await setDoc(doc(db, 'studentProfiles', s2Uid), {
    id: s2Uid,
    studentId: 'CSE-2022-088',
    userId: s2Uid,
    department: 'Computer Science and Engineering',
    batch: '2022',
    currentSemesterId: '2026-spring',
    cgpa: 2.15,
    phone: '+880 1711 000002',
    emergencyContact: '+880 1811 000002',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  // 3. advisorAssignments
  await setDoc(doc(db, 'advisorAssignments', `${t1Uid}_${s1Uid}`), {
    id: `${t1Uid}_${s1Uid}`,
    teacherId: t1Uid,
    studentId: s1Uid,
    assignedDate: '2026-01-10',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  await setDoc(doc(db, 'advisorAssignments', `${t1Uid}_${s2Uid}`), {
    id: `${t1Uid}_${s2Uid}`,
    teacherId: t1Uid,
    studentId: s2Uid,
    assignedDate: '2026-01-10',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  // 4. departments
  const depts = [
    { id: 'dept_cse', code: 'CSE', name: 'Computer Science and Engineering', headOfDeptId: t1Uid },
    { id: 'dept_eee', code: 'EEE', name: 'Electrical and Electronic Engineering', headOfDeptId: '' },
    { id: 'dept_ce', code: 'CE', name: 'Civil Engineering', headOfDeptId: '' },
    { id: 'dept_me', code: 'ME', name: 'Mechanical Engineering', headOfDeptId: '' },
  ];
  for (const dept of depts) {
    await setDoc(doc(db, 'departments', dept.id), {
      ...dept,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    }, { merge: true });
  }

  // 5. semesters
  await setDoc(doc(db, 'semesters', '2026-spring'), {
    id: '2026-spring',
    name: 'Spring 2026',
    startDate: '2026-01-15',
    endDate: '2026-05-30',
    isCurrent: true,
    isClosed: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  }, { merge: true });

  await setDoc(doc(db, 'semesters', '2026-summer'), {
    id: '2026-summer',
    name: 'Summer 2026',
    startDate: '2026-06-01',
    endDate: '2026-09-30',
    isCurrent: false,
    isClosed: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  }, { merge: true });

  // 6. courses
  const courseList = [
    { id: 'cse-101', code: 'CSE101', title: 'Structured Programming Language', credits: 3, department: 'CSE' },
    { id: 'cse-211', code: 'CSE211', title: 'Data Structures & Algorithms', credits: 3, department: 'CSE' },
    { id: 'cse-311', code: 'CSE311', title: 'Database Management Systems', credits: 3, department: 'CSE' },
    { id: 'cse-321', code: 'CSE321', title: 'Operating Systems', credits: 3, department: 'CSE' },
    { id: 'cse-331', code: 'CSE331', title: 'Software Engineering', credits: 3, department: 'CSE' },
  ];
  for (const c of courseList) {
    await setDoc(doc(db, 'courses', c.id), {
      ...c,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    }, { merge: true });
  }

  // 7. courseOfferings
  const offeringsData = [
    {
      id: 'off_2026-spring_cse311_1',
      courseId: 'cse-311',
      courseCode: 'CSE311',
      semesterId: '2026-spring',
      section: '01',
      teacherIds: [t1Uid],
      capacity: 40,
      enrolledCount: 2,
    },
    {
      id: 'off_2026-spring_cse331_1',
      courseId: 'cse-331',
      courseCode: 'CSE331',
      semesterId: '2026-spring',
      section: '01',
      teacherIds: [t1Uid],
      capacity: 40,
      enrolledCount: 1,
    },
    {
      id: 'off_2026-spring_cse101_1',
      courseId: 'cse-101',
      courseCode: 'CSE101',
      semesterId: '2026-spring',
      section: '01',
      teacherIds: [t1Uid],
      capacity: 45,
      enrolledCount: 0,
    },
  ];
  for (const off of offeringsData) {
    await setDoc(doc(db, 'courseOfferings', off.id), {
      ...off,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    }, { merge: true });
  }

  // 8. studentInvitations (Pre-registration)
  const invitationsData = [
    {
      id: 'inv_cse_2022_045',
      token: 'INV-CSE-2022-045-88A1',
      officialStudentId: 'CSE-2022-045',
      email: 'student03@example.edu',
      department: 'CSE',
      batch: '2022',
      level: 'Level 3, Term 1',
      status: 'pending' as const,
      expiresAt: '2026-12-31T23:59:59.000Z',
    },
    {
      id: 'inv_cse_2022_092',
      token: 'INV-CSE-2022-092-99B2',
      officialStudentId: 'CSE-2022-092',
      email: 'student04@example.edu',
      department: 'CSE',
      batch: '2022',
      level: 'Level 3, Term 1',
      status: 'pending' as const,
      expiresAt: '2026-12-31T23:59:59.000Z',
    },
  ];
  for (const inv of invitationsData) {
    await setDoc(doc(db, 'studentInvitations', inv.id), {
      ...inv,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    }, { merge: true });
  }

  // 9. enrollments
  await setDoc(doc(db, 'enrollments', `enr_${s1Uid}_cse311`), {
    id: `enr_${s1Uid}_cse311`,
    studentId: s1Uid,
    courseId: 'cse-311',
    courseOfferingId: 'off_2026-spring_cse311_1',
    semesterId: '2026-spring',
    status: 'enrolled',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  }, { merge: true });

  await setDoc(doc(db, 'enrollments', `enr_${s1Uid}_cse331`), {
    id: `enr_${s1Uid}_cse331`,
    studentId: s1Uid,
    courseId: 'cse-331',
    courseOfferingId: 'off_2026-spring_cse331_1',
    semesterId: '2026-spring',
    status: 'enrolled',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  }, { merge: true });

  await setDoc(doc(db, 'enrollments', `enr_${s2Uid}_cse311`), {
    id: `enr_${s2Uid}_cse311`,
    studentId: s2Uid,
    courseId: 'cse-311',
    courseOfferingId: 'off_2026-spring_cse311_1',
    semesterId: '2026-spring',
    status: 'enrolled',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  }, { merge: true });

  // 7. attendanceRecords
  await setDoc(doc(db, 'attendanceRecords', `att_${s1Uid}_2026-03-01`), {
    id: `att_${s1Uid}_2026-03-01`,
    enrollmentId: `enr_${s1Uid}_cse311`,
    studentId: s1Uid,
    courseId: 'cse-311',
    date: '2026-03-01',
    status: 'present',
    notes: 'Regular attendance',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  await setDoc(doc(db, 'attendanceRecords', `att_${s2Uid}_2026-03-01`), {
    id: `att_${s2Uid}_2026-03-01`,
    enrollmentId: `enr_${s2Uid}_cse311`,
    studentId: s2Uid,
    courseId: 'cse-311',
    date: '2026-03-01',
    status: 'absent',
    notes: 'Unexcused absence',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 8. assessments
  await setDoc(doc(db, 'assessments', 'asmt-cse311-quiz1'), {
    id: 'asmt-cse311-quiz1',
    courseId: 'cse-311',
    semesterId: '2026-spring',
    title: 'Quiz 1: Relational Algebra',
    type: 'quiz',
    maxMarks: 20,
    weightage: 10,
    dueDate: '2026-02-15T18:00:00.000Z',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 9. marks (Note: missing marks stored as null, never 0)
  await setDoc(doc(db, 'marks', `mrk_${s1Uid}_quiz1`), {
    id: `mrk_${s1Uid}_quiz1`,
    assessmentId: 'asmt-cse311-quiz1',
    studentId: s1Uid,
    enrollmentId: `enr_${s1Uid}_cse311`,
    obtainedMarks: 17,
    submittedAt: '2026-02-15T17:30:00.000Z',
    gradedAt: '2026-02-17T12:00:00.000Z',
    gradedBy: t1Uid,
    feedback: 'Good work on query syntax',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  await setDoc(doc(db, 'marks', `mrk_${s2Uid}_quiz1`), {
    id: `mrk_${s2Uid}_quiz1`,
    assessmentId: 'asmt-cse311-quiz1',
    studentId: s2Uid,
    enrollmentId: `enr_${s2Uid}_cse311`,
    obtainedMarks: null, // Critical: missing marks stored as null, not 0
    submittedAt: null,
    gradedAt: null,
    gradedBy: t1Uid,
    feedback: 'Missed assessment submission deadline',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 10. deadlines
  await setDoc(doc(db, 'deadlines', 'ddl-cse331-srs'), {
    id: 'ddl-cse331-srs',
    courseId: 'cse-331',
    title: 'SRS Document Milestone 1',
    description: 'Submit software requirements specification PDF to portal',
    dueDate: '2026-03-25T17:59:00.000Z',
    type: 'project',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 11. riskConfig
  await setDoc(doc(db, 'riskConfig', 'v1.0.0'), {
    id: 'v1.0.0',
    version: '1.0.0',
    attendanceThresholdMedium: 75,
    attendanceThresholdHigh: 60,
    marksThresholdMedium: 50,
    marksThresholdHigh: 40,
    missingSubmissionsLimit: 2,
    active: true,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  // 12. riskAssessments (Append-only)
  await setDoc(doc(db, 'riskAssessments', `risk_${s1Uid}_init`), {
    id: `risk_${s1Uid}_init`,
    studentId: s1Uid,
    semesterId: '2026-spring',
    riskLevel: 'Low',
    attendancePercentage: 92,
    marksAverage: 85,
    missingAssignmentsCount: 0,
    reasons: ['Attendance consistently above 75%', 'Assessment averages meet satisfactory standards'],
    trigger: 'scheduled_job',
    configVersion: '1.0.0',
    computedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  await setDoc(doc(db, 'riskAssessments', `risk_${s2Uid}_init`), {
    id: `risk_${s2Uid}_init`,
    studentId: s2Uid,
    semesterId: '2026-spring',
    riskLevel: 'High',
    attendancePercentage: 54,
    marksAverage: 38,
    missingAssignmentsCount: 3,
    reasons: [
      'Attendance (54%) below critical threshold of 60%',
      'Average assessment score (38%) below 40%',
      'Multiple missed deadlines recorded',
    ],
    trigger: 'academic_update',
    configVersion: '1.0.0',
    computedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  });

  // 13. notifications
  await setDoc(doc(db, 'notifications', `notif_${s1Uid}_1`), {
    id: `notif_${s1Uid}_1`,
    userId: s1Uid,
    title: 'Spring 2026 Advising Period Open',
    message: 'Please review your course registration and advisor allocation.',
    category: 'general',
    isRead: false,
    readAt: null,
    link: '/student/courses',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 14. feedback (Append-only)
  await setDoc(doc(db, 'feedback', `fb_${s2Uid}_1`), {
    id: `fb_${s2Uid}_1`,
    studentId: s2Uid,
    teacherId: t1Uid,
    courseId: 'cse-311',
    category: 'attendance',
    comment: 'Student missed consecutive lectures and Quiz 1. Initial outreach sent.',
    isPrivateToFaculty: false,
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 15. interventions
  await setDoc(doc(db, 'interventions', `int_${s2Uid}_1`), {
    id: `int_${s2Uid}_1`,
    studentId: s2Uid,
    teacherId: t1Uid,
    reason: 'Consecutive unexcused absences and unsubmitted evaluations in Database Systems',
    actionPlan: 'Weekly advising check-in on Mondays, tutorial remedial session attendance',
    targetDate: '2026-04-15',
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  // 16. followUps
  await setDoc(doc(db, 'followUps', `flw_${s2Uid}_1`), {
    id: `flw_${s2Uid}_1`,
    interventionId: `int_${s2Uid}_1`,
    teacherId: t1Uid,
    progressNotes: 'First meeting conducted. Student reported transport difficulty and agreed to remedial schedule.',
    statusUpdate: 'in_progress',
    meetingDate: '2026-03-05',
    createdAt: now,
    updatedAt: now,
    createdBy: t1Uid,
  });

  return {
    success: true,
    message: 'Synthetic database successfully seeded with demo accounts and academic records.',
    usersCreated,
  };
}
