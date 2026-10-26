import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  Enrollment,
  AttendanceRecord,
  AttendanceStatus,
  Assessment,
  AssessmentType,
  Mark,
  Deadline,
  Semester,
  Course,
  StudentProfile,
  Department,
  CourseOffering,
  StudentInvitation,
  AttendanceSession,
  AuditCorrectionRecord,
} from '../types';
import { getCurrentUtcIso, formatDhakaDateOnly } from '../utils/date';
import { onAcademicRecordChanged } from './hooks';

export interface EnrollmentSummary {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  courseOfferingId?: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  semesterId: string;
  status: Enrollment['status'];
}

export interface AttendanceSummary {
  studentId: string;
  courseId?: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  records: AttendanceRecord[];
}

export interface MarksSummary {
  studentId: string;
  courseId: string;
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number | null; // null if no recorded marks
  missingCount: number;
  items: Array<{
    assessment: Assessment;
    mark: Mark | null;
  }>;
}

export interface IAcademicRecordService {
  // Department Management
  getDepartments(): Promise<Department[]>;
  createDepartment(
    dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: string }
  ): Promise<string>;
  updateDepartment(
    deptId: string,
    updates: Partial<Omit<Department, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: string }
  ): Promise<void>;

  // Course Offering Scoping
  getCourseOfferings(semesterId?: string, departmentId?: string): Promise<CourseOffering[]>;
  createCourseOffering(
    offering: Omit<CourseOffering, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: string }
  ): Promise<string>;
  updateCourseOffering(
    offeringId: string,
    updates: Partial<Omit<CourseOffering, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: string }
  ): Promise<void>;

  // Student Pre-registration & Invitations
  getStudentInvitations(status?: string): Promise<StudentInvitation[]>;
  createStudentInvitation(
    invitation: Omit<StudentInvitation, 'id' | 'token' | 'status' | 'createdAt' | 'expiresAt'>,
    actor?: { uid: string; role: string }
  ): Promise<StudentInvitation>;
  verifyInvitationToken(token: string): Promise<StudentInvitation>;
  claimInvitationToken(
    token: string,
    studentUid: string,
    officialStudentId?: string
  ): Promise<{ invitation: StudentInvitation; profile: StudentProfile }>;
  revokeInvitation(invitationId: string, actor?: { uid: string; role: string }): Promise<void>;

  // Attendance Sessions & Audit Corrections
  getAttendanceSessions(courseId?: string, semesterId?: string): Promise<AttendanceSession[]>;
  createAttendanceSession(
    session: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: string }
  ): Promise<string>;
  publishAttendanceSession(sessionId: string, actor?: { uid: string; role: string }): Promise<void>;
  recordAttendanceCorrection(correction: Omit<AuditCorrectionRecord, 'id' | 'timestamp'>): Promise<string>;
  recordMarkCorrection(correction: Omit<AuditCorrectionRecord, 'id' | 'timestamp'>): Promise<string>;
  getAuditCorrections(recordId?: string): Promise<AuditCorrectionRecord[]>;

  // Courses CRUD
  getCourses(includeInactive?: boolean): Promise<Course[]>;
  createCourse(
    course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  updateCourse(
    courseId: string,
    updates: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;
  setCourseActive(
    courseId: string,
    isActive: boolean,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;

  // Semesters CRUD
  getSemesters(): Promise<Semester[]>;
  createSemester(
    semester: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'admin' }
  ): Promise<string>;
  updateSemester(
    semesterId: string,
    updates: Partial<Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'admin' }
  ): Promise<void>;
  setCurrentSemester(
    semesterId: string,
    actor?: { uid: string; role: 'admin' }
  ): Promise<void>;

  // Enrollments CRUD
  getEnrollments(studentId: string, semesterId?: string): Promise<EnrollmentSummary[]>;
  getAllEnrollments(semesterId?: string): Promise<EnrollmentSummary[]>;
  createEnrollment(
    enrollment: {
      studentId: string;
      courseId: string;
      courseOfferingId?: string;
      semesterId: string;
      status?: Enrollment['status'];
    },
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  updateEnrollmentStatus(
    enrollmentId: string,
    status: Enrollment['status'],
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;

  // Assessments CRUD
  getAssessments(courseId: string): Promise<Assessment[]>;
  createAssessment(
    assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  updateAssessment(
    assessmentId: string,
    updates: Partial<Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;
  deleteAssessment(
    assessmentId: string,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;

  // Deadlines CRUD
  getDeadlines(studentId: string): Promise<Deadline[]>;
  getAllDeadlines(courseId?: string, semesterId?: string): Promise<Deadline[]>;
  createDeadline(
    deadline: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  updateDeadline(
    deadlineId: string,
    updates: Partial<Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;
  setDeadlineActive(
    deadlineId: string,
    isActive: boolean,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void>;

  // Academic Records
  getAttendance(studentId: string, courseId?: string): Promise<AttendanceSummary>;
  getMarks(studentId: string, courseId?: string): Promise<MarksSummary>;
  getStudentProfile(studentId: string): Promise<StudentProfile | null>;
  upsertAttendance(
    record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
  upsertMark(
    record: Omit<Mark, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string>;
}

export class AcademicRecordService implements IAcademicRecordService {
  private getLocalSemesters(): Semester[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem('aras_custom_semesters');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalSemester(sem: Semester): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const list = this.getLocalSemesters();
      const idx = list.findIndex((s) => s.id === sem.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...sem };
      } else {
        list.push(sem);
      }
      if (sem.isCurrent) {
        list.forEach((s) => {
          if (s.id !== sem.id) s.isCurrent = false;
        });
      }
      localStorage.setItem('aras_custom_semesters', JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save local semester:', e);
    }
  }

  /**
   * Fetches all academic semesters
   */
  async getSemesters(): Promise<Semester[]> {
    const localList = this.getLocalSemesters();
    try {
      const snap = await getDocs(collection(db, 'semesters'));
      const listMap = new Map<string, Semester>();
      snap.forEach((d) => {
        listMap.set(d.id, { id: d.id, ...(d.data() as Omit<Semester, 'id'>) });
      });
      // Merge local semesters
      localList.forEach((s) => {
        listMap.set(s.id, s);
      });
      const list = Array.from(listMap.values());
      // Sort with current semester first, then by startDate descending
      return list.sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return (b.startDate || '').localeCompare(a.startDate || '');
      });
    } catch (err) {
      console.warn('AcademicRecordService.getSemesters Firestore error:', err);
      // Fallback synthetic semesters merged with local list
      const defaults: Semester[] = [
        {
          id: '2026-spring',
          name: 'Spring 2026',
          startDate: '2026-01-15',
          endDate: '2026-05-30',
          isCurrent: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'system',
        },
        {
          id: '2025-fall',
          name: 'Fall 2025',
          startDate: '2025-08-15',
          endDate: '2025-12-20',
          isCurrent: false,
          createdAt: '2025-08-01T00:00:00.000Z',
          updatedAt: '2025-08-01T00:00:00.000Z',
          createdBy: 'system',
        },
      ];
      const mergedMap = new Map<string, Semester>();
      defaults.forEach((s) => mergedMap.set(s.id, s));
      localList.forEach((s) => mergedMap.set(s.id, s));
      return Array.from(mergedMap.values());
    }
  }

  /**
   * Fetches student profile
   */
  async getStudentProfile(studentId: string): Promise<StudentProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'studentProfiles', studentId));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as Omit<StudentProfile, 'id'>) };
      }
      return null;
    } catch (err) {
      console.warn(`AcademicRecordService.getStudentProfile error for ${studentId}:`, err);
      return null;
    }
  }

  /**
   * Fetches student enrollments for an optional semester
   */
  async getEnrollments(studentId: string, semesterId?: string): Promise<EnrollmentSummary[]> {
    try {
      const enrollmentsRef = collection(db, 'enrollments');
      const q = query(enrollmentsRef, where('studentId', '==', studentId));
      const snap = await getDocs(q);

      const enrollments: Enrollment[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<Enrollment, 'id'>) };
        if (!semesterId || item.semesterId === semesterId) {
          enrollments.push(item);
        }
      });

      // Fetch course details for these enrollments
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const courseMap = new Map<string, Course>();
      coursesSnap.forEach((c) => {
        courseMap.set(c.id, { id: c.id, ...(c.data() as Omit<Course, 'id'>) });
      });

      return enrollments.map((enr) => {
        const course = courseMap.get(enr.courseId);
        return {
          enrollmentId: enr.id,
          studentId: enr.studentId,
          courseId: enr.courseId,
          courseCode: course?.code || enr.courseId.toUpperCase(),
          courseTitle: course?.title || 'Academic Course',
          credits: course?.credits || 3,
          semesterId: enr.semesterId,
          status: enr.status,
        };
      });
    } catch (err) {
      console.warn(`AcademicRecordService.getEnrollments error for ${studentId}:`, err);
      return [];
    }
  }

  /**
   * Fetches attendance summary and records for a student
   */
  async getAttendance(studentId: string, courseId?: string): Promise<AttendanceSummary> {
    try {
      const attRef = collection(db, 'attendanceRecords');
      const q = query(attRef, where('studentId', '==', studentId));
      const snap = await getDocs(q);

      const records: AttendanceRecord[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) };
        if (!courseId || item.courseId === courseId) {
          records.push(item);
        }
      });

      // Sort by date descending for scannable history
      records.sort((a, b) => b.date.localeCompare(a.date));

      const totalClasses = records.length;
      let attendedClasses = 0;
      records.forEach((r) => {
        if (r.status === 'present') attendedClasses += 1;
        else if (r.status === 'late') attendedClasses += 0.5;
        else if (r.status === 'excused') attendedClasses += 1;
      });

      const percentage =
        totalClasses > 0 ? Math.round(((attendedClasses / totalClasses) * 100) * 10) / 10 : 100;

      return {
        studentId,
        courseId,
        totalClasses,
        attendedClasses,
        percentage,
        records,
      };
    } catch (err) {
      console.warn(`AcademicRecordService.getAttendance error for ${studentId}:`, err);
      return {
        studentId,
        courseId,
        totalClasses: 0,
        attendedClasses: 0,
        percentage: 100,
        records: [],
      };
    }
  }

  /**
   * Fetches assessments for a given course
   */
  async getAssessments(courseId: string): Promise<Assessment[]> {
    try {
      const asmRef = collection(db, 'assessments');
      const q = query(asmRef, where('courseId', '==', courseId));
      const snap = await getDocs(q);

      const list: Assessment[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Assessment, 'id'>) });
      });

      // Sort chronologically by dueDate
      return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (err) {
      console.warn(`AcademicRecordService.getAssessments error for ${courseId}:`, err);
      return [];
    }
  }

  /**
   * Fetches student marks for an optional course.
   * Missing marks stay null and never coerce to 0.
   */
  async getMarks(studentId: string, courseId?: string): Promise<MarksSummary> {
    try {
      // 1. Fetch assessments for course (or all courses if not specified)
      let assessments: Assessment[] = [];
      if (courseId) {
        assessments = await this.getAssessments(courseId);
      } else {
        const snap = await getDocs(collection(db, 'assessments'));
        snap.forEach((d) => assessments.push({ id: d.id, ...(d.data() as Omit<Assessment, 'id'>) }));
      }

      // 2. Fetch marks by student
      const marksRef = collection(db, 'marks');
      const q = query(marksRef, where('studentId', '==', studentId));
      const snap = await getDocs(q);

      const marksMap = new Map<string, Mark>();
      snap.forEach((d) => {
        const m = { id: d.id, ...(d.data() as Omit<Mark, 'id'>) };
        marksMap.set(m.assessmentId, m);
      });

      let totalObtained = 0;
      let totalMaxMarks = 0;
      let recordedCount = 0;
      let missingCount = 0;

      const items = assessments.map((asmt) => {
        const mark = marksMap.get(asmt.id) || null;
        if (mark && mark.obtainedMarks !== null && mark.obtainedMarks !== undefined) {
          totalObtained += mark.obtainedMarks;
          totalMaxMarks += asmt.maxMarks;
          recordedCount++;
        } else {
          missingCount++;
        }
        return { assessment: asmt, mark };
      });

      const percentage =
        totalMaxMarks > 0 ? Math.round(((totalObtained / totalMaxMarks) * 100) * 10) / 10 : null;

      return {
        studentId,
        courseId: courseId || '',
        totalObtained,
        totalMaxMarks,
        percentage,
        missingCount,
        items,
      };
    } catch (err) {
      console.warn(`AcademicRecordService.getMarks error for ${studentId}:`, err);
      return {
        studentId,
        courseId: courseId || '',
        totalObtained: 0,
        totalMaxMarks: 0,
        percentage: null,
        missingCount: 0,
        items: [],
      };
    }
  }

  // =========================================================================
  // COURSES CRUD
  // =========================================================================

  /**
   * Fetches all courses, optionally filtering by active state
   */
  async getCourses(includeInactive = false): Promise<Course[]> {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list: Course[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<Course, 'id'>) };
        if (includeInactive || item.isActive !== false) {
          list.push(item);
        }
      });
      return list.sort((a, b) => a.code.localeCompare(b.code));
    } catch (err) {
      console.warn('AcademicRecordService.getCourses error:', err);
      return [];
    }
  }

  /**
   * Creates a new academic course offering
   */
  async createCourse(
    course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!course.code?.trim() || !course.title?.trim() || !course.department?.trim()) {
      throw new Error('VALIDATION_ERROR: Course code, title, and department are required.');
    }
    if (typeof course.credits !== 'number' || isNaN(course.credits) || course.credits <= 0) {
      throw new Error('VALIDATION_ERROR: Course credits must be a positive number greater than 0.');
    }

    const cleanCode = course.code.trim().toUpperCase();
    const docId = cleanCode.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = getCurrentUtcIso();

    const payload: Course = {
      ...course,
      id: docId,
      code: cleanCode,
      title: course.title.trim(),
      credits: course.credits,
      department: course.department.trim(),
      isActive: course.isActive !== undefined ? course.isActive : true,
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || 'admin',
    };

    try {
      await setDoc(doc(db, 'courses', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${docId}`);
      throw err;
    }
  }

  /**
   * Updates an existing course offering
   */
  async updateCourse(
    courseId: string,
    updates: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    if (updates.credits !== undefined && (typeof updates.credits !== 'number' || updates.credits <= 0)) {
      throw new Error('VALIDATION_ERROR: Course credits must be greater than 0.');
    }

    const courseRef = doc(db, 'courses', courseId);
    const snap = await getDoc(courseRef);
    if (!snap.exists()) {
      throw new Error(`NOT_FOUND: Course "${courseId}" does not exist.`);
    }

    const now = getCurrentUtcIso();
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.code) payload.code = updates.code.trim().toUpperCase();
    if (updates.title) payload.title = updates.title.trim();
    if (updates.department) payload.department = updates.department.trim();

    try {
      await updateDoc(courseRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${courseId}`);
      throw err;
    }
  }

  /**
   * Toggles course active/inactive status
   */
  async setCourseActive(
    courseId: string,
    isActive: boolean,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    return this.updateCourse(courseId, { isActive }, actor);
  }

  // =========================================================================
  // SEMESTERS CRUD
  // =========================================================================

  /**
   * Creates an academic semester with single current semester enforcement
   */
  async createSemester(
    semester: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'admin' }
  ): Promise<string> {
    if (!semester.name?.trim() || !semester.startDate || !semester.endDate) {
      throw new Error('VALIDATION_ERROR: Semester name, startDate, and endDate are required.');
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(semester.startDate) || !dateRegex.test(semester.endDate)) {
      throw new Error('VALIDATION_ERROR: Dates must be formatted as YYYY-MM-DD.');
    }
    if (semester.startDate >= semester.endDate) {
      throw new Error('VALIDATION_ERROR: Semester startDate must be strictly before endDate.');
    }

    const safeSlug = semester.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `sem_${Date.now()}`;
    const docId = safeSlug;
    const now = getCurrentUtcIso();

    // If marked current, unset current flag on any other semester
    if (semester.isCurrent) {
      try {
        const snap = await getDocs(collection(db, 'semesters'));
        const batch = writeBatch(db);
        snap.forEach((d) => {
          if (d.data().isCurrent) {
            batch.update(d.ref, { isCurrent: false, updatedAt: now });
          }
        });
        await batch.commit();
      } catch (err) {
        console.warn('Note updating existing current semesters:', err);
      }
    }

    const payload: Semester = {
      ...semester,
      id: docId,
      name: semester.name.trim(),
      startDate: semester.startDate,
      endDate: semester.endDate,
      isCurrent: Boolean(semester.isCurrent),
      isClosed: Boolean(semester.isClosed || false),
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || 'admin',
    };

    try {
      await setDoc(doc(db, 'semesters', docId), payload);
      this.saveLocalSemester(payload);
      return docId;
    } catch (err) {
      console.warn('Firestore setDoc failed for semester:', err);
      const isPermDenied = err instanceof Error && (err.message.includes('permission') || err.message.includes('Missing or insufficient') || (err as { code?: string })?.code === 'permission-denied');
      const isDemo = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('aras_demo_session_email'));
      if (isPermDenied || isDemo || !auth.currentUser) {
        return docId;
      }
      handleFirestoreError(err, OperationType.WRITE, `semesters/${docId}`);
      throw err;
    }
  }

  /**
   * Updates semester metadata and enforces single current semester
   */
  async updateSemester(
    semesterId: string,
    updates: Partial<Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'admin' }
  ): Promise<void> {
    const semRef = doc(db, 'semesters', semesterId);
    let snap;
    try {
      snap = await getDoc(semRef);
    } catch {
      // Ignore read failure if local
    }
    const local = this.getLocalSemesters().find((s) => s.id === semesterId);
    if (!snap?.exists() && !local) {
      throw new Error(`NOT_FOUND: Semester "${semesterId}" does not exist.`);
    }

    const currentData = (snap?.exists() ? snap.data() : local) as Semester;
    const effectiveStart = updates.startDate || currentData.startDate;
    const effectiveEnd = updates.endDate || currentData.endDate;

    if (effectiveStart >= effectiveEnd) {
      throw new Error('VALIDATION_ERROR: Semester startDate must be strictly before endDate.');
    }

    const now = getCurrentUtcIso();

    // If isCurrent is being turned on, unset current on other semesters
    if (updates.isCurrent === true) {
      try {
        const allSemSnap = await getDocs(collection(db, 'semesters'));
        const batch = writeBatch(db);
        allSemSnap.forEach((d) => {
          if (d.id !== semesterId && d.data().isCurrent) {
            batch.update(d.ref, { isCurrent: false, updatedAt: now });
          }
        });
        await batch.commit();
      } catch (e) {
        console.warn('Could not unset other current semesters in Firestore:', e);
      }
    }

    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.name) payload.name = updates.name.trim();
    if (updates.isClosed !== undefined) payload.isClosed = Boolean(updates.isClosed);

    try {
      await updateDoc(semRef, payload);
      if (local) {
        this.saveLocalSemester({ ...local, ...payload } as Semester);
      }
    } catch (err) {
      console.warn('Firestore updateDoc failed for semester:', err);
      if (local) {
        this.saveLocalSemester({ ...local, ...payload } as Semester);
      }
      const isPermDenied = err instanceof Error && (err.message.includes('permission') || err.message.includes('Missing or insufficient') || (err as { code?: string })?.code === 'permission-denied');
      const isDemo = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('aras_demo_session_email'));
      if (isPermDenied || isDemo || !auth.currentUser) {
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, `semesters/${semesterId}`);
      throw err;
    }
  }

  /**
   * Sets a specific semester as the sole current academic term
   */
  async setCurrentSemester(
    semesterId: string,
    actor?: { uid: string; role: 'admin' }
  ): Promise<void> {
    return this.updateSemester(semesterId, { isCurrent: true }, actor);
  }

  // =========================================================================
  // ENROLLMENTS CRUD
  // =========================================================================

  /**
   * Fetches all enrollments across students, optionally filtered by semester
   */
  async getAllEnrollments(semesterId?: string): Promise<EnrollmentSummary[]> {
    try {
      const snap = await getDocs(collection(db, 'enrollments'));
      const enrollments: Enrollment[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<Enrollment, 'id'>) };
        if (!semesterId || item.semesterId === semesterId) {
          enrollments.push(item);
        }
      });

      const courses = await this.getCourses(true);
      const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]));

      return enrollments.map((enr) => {
        const course = courseMap.get(enr.courseId);
        return {
          enrollmentId: enr.id,
          studentId: enr.studentId,
          courseId: enr.courseId,
          courseCode: course?.code || enr.courseId.toUpperCase(),
          courseTitle: course?.title || 'Academic Course',
          credits: course?.credits || 3,
          semesterId: enr.semesterId,
          status: enr.status,
        };
      });
    } catch (err) {
      console.warn('AcademicRecordService.getAllEnrollments error:', err);
      return [];
    }
  }

  /**
   * Enrolls a student in a course for a semester with duplicate active enrollment guard
   */
  async createEnrollment(
    enrollment: {
      studentId: string;
      courseId: string;
      courseOfferingId?: string;
      semesterId: string;
      status?: Enrollment['status'];
    },
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!enrollment.studentId || !enrollment.courseId || !enrollment.semesterId) {
      throw new Error('VALIDATION_ERROR: studentId, courseId, and semesterId are required.');
    }

    // Duplicate check: query existing enrollments for this student, course, semester
    const enrRef = collection(db, 'enrollments');
    const q = query(
      enrRef,
      where('studentId', '==', enrollment.studentId),
      where('courseId', '==', enrollment.courseId),
      where('semesterId', '==', enrollment.semesterId)
    );
    const existingSnap = await getDocs(q);
    const hasActive = existingSnap.docs.some((d) => {
      const data = d.data() as Enrollment;
      return data.status !== 'dropped';
    });

    if (hasActive) {
      throw new Error(`DUPLICATE_ENROLLMENT: Student is already actively enrolled in course "${enrollment.courseId}" for semester "${enrollment.semesterId}".`);
    }

    const docId = `enr_${enrollment.studentId}_${enrollment.courseId}_${enrollment.semesterId}`;
    const now = getCurrentUtcIso();
    const payload: Enrollment = {
      id: docId,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      courseOfferingId: enrollment.courseOfferingId || '',
      semesterId: enrollment.semesterId,
      status: enrollment.status || 'enrolled',
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || 'admin',
    };

    try {
      await setDoc(doc(db, 'enrollments', docId), payload);
      await onAcademicRecordChanged(enrollment.studentId, 'enrollment');
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `enrollments/${docId}`);
      throw err;
    }
  }

  /**
   * Updates enrollment status (enrolled, dropped, completed)
   */
  async updateEnrollmentStatus(
    enrollmentId: string,
    status: Enrollment['status'],
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    const validStatuses: Enrollment['status'][] = ['enrolled', 'dropped', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`VALIDATION_ERROR: Invalid enrollment status "${status}".`);
    }

    const docRef = doc(db, 'enrollments', enrollmentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`NOT_FOUND: Enrollment "${enrollmentId}" does not exist.`);
    }

    const studentId = (snap.data() as Enrollment).studentId;
    const now = getCurrentUtcIso();

    try {
      await updateDoc(docRef, { status, updatedAt: now });
      if (studentId) {
        await onAcademicRecordChanged(studentId, 'enrollment');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `enrollments/${enrollmentId}`);
      throw err;
    }
  }

  // =========================================================================
  // ASSESSMENTS CRUD
  // =========================================================================

  /**
   * Creates a new assessment item with strict maxMarks > 0 validation
   */
  async createAssessment(
    assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!assessment.courseId || !assessment.semesterId || !assessment.title?.trim()) {
      throw new Error('VALIDATION_ERROR: courseId, semesterId, and assessment title are required.');
    }
    const validTypes: AssessmentType[] = ['quiz', 'assignment', 'midterm', 'final', 'project'];
    if (!validTypes.includes(assessment.type)) {
      throw new Error(`VALIDATION_ERROR: Invalid assessment type "${assessment.type}". Must be quiz, assignment, midterm, final, or project.`);
    }
    if (typeof assessment.maxMarks !== 'number' || isNaN(assessment.maxMarks) || assessment.maxMarks <= 0) {
      throw new Error('VALIDATION_ERROR: maxMarks must be a positive number strictly greater than 0.');
    }
    if (typeof assessment.weightage !== 'number' || isNaN(assessment.weightage) || assessment.weightage < 0 || assessment.weightage > 100) {
      throw new Error('VALIDATION_ERROR: weightage must be between 0 and 100 percent.');
    }
    if (!assessment.dueDate) {
      throw new Error('VALIDATION_ERROR: dueDate is required.');
    }

    const docId = `asmt_${assessment.courseId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentUtcIso();

    const payload: Assessment = {
      ...assessment,
      id: docId,
      title: assessment.title.trim(),
      maxMarks: assessment.maxMarks,
      weightage: assessment.weightage,
      dueDate: assessment.dueDate,
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || 'teacher',
    };

    try {
      await setDoc(doc(db, 'assessments', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `assessments/${docId}`);
      throw err;
    }
  }

  /**
   * Updates an existing assessment with validation
   */
  async updateAssessment(
    assessmentId: string,
    updates: Partial<Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    if (updates.maxMarks !== undefined && (typeof updates.maxMarks !== 'number' || isNaN(updates.maxMarks) || updates.maxMarks <= 0)) {
      throw new Error('VALIDATION_ERROR: maxMarks must be a positive number strictly greater than 0.');
    }
    if (updates.weightage !== undefined && (typeof updates.weightage !== 'number' || updates.weightage < 0 || updates.weightage > 100)) {
      throw new Error('VALIDATION_ERROR: weightage must be between 0 and 100 percent.');
    }

    const asmtRef = doc(db, 'assessments', assessmentId);
    const snap = await getDoc(asmtRef);
    if (!snap.exists()) {
      throw new Error(`NOT_FOUND: Assessment "${assessmentId}" does not exist.`);
    }

    const now = getCurrentUtcIso();
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.title) payload.title = updates.title.trim();

    try {
      await updateDoc(asmtRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `assessments/${assessmentId}`);
      throw err;
    }
  }

  /**
   * Deletes an assessment definition
   */
  async deleteAssessment(
    assessmentId: string,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    try {
      await deleteDoc(doc(db, 'assessments', assessmentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assessments/${assessmentId}`);
      throw err;
    }
  }

  // =========================================================================
  // DEADLINES CRUD
  // =========================================================================

  /**
   * Fetches deadlines scoped exclusively to a student's active enrolled courses
   */
  async getDeadlines(studentId: string): Promise<Deadline[]> {
    try {
      // 1. Fetch student's enrollments to determine eligible course IDs
      const enrollments = await this.getEnrollments(studentId);
      const activeEnrolledCourseIds = enrollments
        .filter((e) => e.status === 'enrolled')
        .map((e) => e.courseId);

      if (activeEnrolledCourseIds.length === 0) {
        return [];
      }

      // 2. Fetch deadlines and filter strictly by active enrollments and active status
      const snap = await getDocs(collection(db, 'deadlines'));
      const list: Deadline[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<Deadline, 'id'>) };
        const raw = item as Record<string, unknown>;
        // Recipient filters if specified
        if (raw.studentId && raw.studentId !== studentId) return;
        if (raw.targetStudentId && raw.targetStudentId !== studentId) return;
        if (Array.isArray(raw.intendedStudentIds) && !raw.intendedStudentIds.includes(studentId)) return;

        if (activeEnrolledCourseIds.includes(item.courseId) && item.isActive !== false) {
          list.push(item);
        }
      });

      // Sort by dueDate ascending
      return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (err) {
      console.warn(`AcademicRecordService.getDeadlines error for ${studentId}:`, err);
      return [];
    }
  }

  /**
   * Fetches all deadlines across courses, optionally filtered by course or semester
   */
  async getAllDeadlines(courseId?: string, semesterId?: string): Promise<Deadline[]> {
    try {
      const snap = await getDocs(collection(db, 'deadlines'));
      const list: Deadline[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<Deadline, 'id'>) };
        if (courseId && item.courseId !== courseId) return;
        if (semesterId && item.semesterId && item.semesterId !== semesterId) return;
        list.push(item);
      });
      return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (err) {
      console.warn('AcademicRecordService.getAllDeadlines error:', err);
      return [];
    }
  }

  /**
   * Creates a new academic deadline
   */
  async createDeadline(
    deadline: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!deadline.courseId || !deadline.title?.trim() || !deadline.dueDate) {
      throw new Error('VALIDATION_ERROR: courseId, title, and dueDate are required.');
    }
    const validTypes = ['assignment', 'project', 'quiz'];
    if (!validTypes.includes(deadline.type)) {
      throw new Error(`VALIDATION_ERROR: Invalid deadline type "${deadline.type}". Must be assignment, project, or quiz.`);
    }

    const docId = `ddl_${deadline.courseId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentUtcIso();

    const payload: Deadline = {
      ...deadline,
      id: docId,
      title: deadline.title.trim(),
      description: deadline.description || '',
      isActive: deadline.isActive !== undefined ? deadline.isActive : true,
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || 'teacher',
    };

    try {
      await setDoc(doc(db, 'deadlines', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `deadlines/${docId}`);
      throw err;
    }
  }

  /**
   * Updates an existing deadline
   */
  async updateDeadline(
    deadlineId: string,
    updates: Partial<Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    const ddlRef = doc(db, 'deadlines', deadlineId);
    const snap = await getDoc(ddlRef);
    if (!snap.exists()) {
      throw new Error(`NOT_FOUND: Deadline "${deadlineId}" does not exist.`);
    }

    const now = getCurrentUtcIso();
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.title) payload.title = updates.title.trim();

    try {
      await updateDoc(ddlRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `deadlines/${deadlineId}`);
      throw err;
    }
  }

  /**
   * Toggles deadline active/inactive status
   */
  async setDeadlineActive(
    deadlineId: string,
    isActive: boolean,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<void> {
    return this.updateDeadline(deadlineId, { isActive }, actor);
  }

  /**
   * Upserts an attendance record with strict validation.
   * Must be called by Developer 3 (Teacher / Admin).
   * Throws on invalid input, no future attendance dates allowed.
   */
  async upsertAttendance(
    record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    // 1. Validation: required foreign keys
    if (!record.studentId || !record.courseId || !record.enrollmentId) {
      throw new Error('VALIDATION_ERROR: studentId, courseId, and enrollmentId are required.');
    }

    // 2. Validation: status enum check
    const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(record.status)) {
      throw new Error(`VALIDATION_ERROR: Invalid attendance status "${record.status}". Must be present, absent, late, or excused.`);
    }

    // 3. Validation: date format and no future dates allowed (Asia/Dhaka)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.date)) {
      throw new Error('VALIDATION_ERROR: Attendance date must be formatted as YYYY-MM-DD in Asia/Dhaka timezone.');
    }

    const todayInDhaka = formatDhakaDateOnly(new Date());
    if (record.date > todayInDhaka) {
      throw new Error(`VALIDATION_ERROR: Attendance date (${record.date}) cannot be in the future (today in Asia/Dhaka is ${todayInDhaka}).`);
    }

    // 4. Persistence
    const docId = `att_${record.studentId}_${record.courseId}_${record.date}`;
    const now = getCurrentUtcIso();

    const payload: AttendanceRecord = {
      id: docId,
      enrollmentId: record.enrollmentId,
      studentId: record.studentId,
      courseId: record.courseId,
      date: record.date,
      status: record.status,
      notes: record.notes || '',
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || record.createdBy || 'system',
    };

    try {
      await setDoc(doc(db, 'attendanceRecords', docId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendanceRecords/${docId}`);
    }

    // 5. Shared change hook invocation
    await onAcademicRecordChanged(record.studentId, 'attendance');

    return docId;
  }

  /**
   * Upserts an assessment mark with strict validation.
   * Missing marks are passed as null, never 0.
   * Throws if obtainedMarks < 0 or > maxMarks.
   */
  async upsertMark(
    record: Omit<Mark, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: 'teacher' | 'admin' }
  ): Promise<string> {
    if (!record.studentId || !record.assessmentId || !record.enrollmentId) {
      throw new Error('VALIDATION_ERROR: studentId, assessmentId, and enrollmentId are required.');
    }

    // Fetch assessment to validate against maxMarks
    const asmtSnap = await getDoc(doc(db, 'assessments', record.assessmentId));
    if (!asmtSnap.exists()) {
      throw new Error(`NOT_FOUND: Assessment with ID "${record.assessmentId}" does not exist.`);
    }
    const asmt = asmtSnap.data() as Assessment;

    if (record.obtainedMarks !== null && record.obtainedMarks !== undefined) {
      if (typeof record.obtainedMarks !== 'number' || isNaN(record.obtainedMarks)) {
        throw new Error('VALIDATION_ERROR: obtainedMarks must be a valid number or null.');
      }
      if (record.obtainedMarks < 0) {
        throw new Error('VALIDATION_ERROR: obtainedMarks cannot be negative.');
      }
      if (record.obtainedMarks > asmt.maxMarks) {
        throw new Error(`VALIDATION_ERROR: obtainedMarks (${record.obtainedMarks}) cannot exceed maximum marks (${asmt.maxMarks}).`);
      }
    }

    const docId = `mrk_${record.studentId}_${record.assessmentId}`;
    const now = getCurrentUtcIso();

    const payload: Mark = {
      id: docId,
      assessmentId: record.assessmentId,
      studentId: record.studentId,
      enrollmentId: record.enrollmentId,
      obtainedMarks: record.obtainedMarks ?? null, // Strictly null if missing, never 0
      submittedAt: record.submittedAt || null,
      gradedAt: record.gradedAt || (record.obtainedMarks !== null ? now : null),
      gradedBy: actor?.uid || record.gradedBy || 'teacher',
      feedback: record.feedback || '',
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || record.createdBy || 'system',
    };

    try {
      await setDoc(doc(db, 'marks', docId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `marks/${docId}`);
    }

    // Shared change hook invocation
    await onAcademicRecordChanged(record.studentId, 'mark');

    return docId;
  }

  // --- Department Management ---
  async getDepartments(): Promise<Department[]> {
    try {
      const snap = await getDocs(collection(db, 'departments'));
      const list: Department[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Department, 'id'>) });
      });
      if (list.length > 0) return list;
    } catch (err) {
      console.warn('AcademicRecordService.getDepartments warning:', err);
    }
    return [
      {
        id: 'dept-cse',
        code: 'CSE',
        name: 'Computer Science and Engineering',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'dept-eee',
        code: 'EEE',
        name: 'Electrical and Electronic Engineering',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'dept-ce',
        code: 'CE',
        name: 'Civil Engineering',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'dept-me',
        code: 'ME',
        name: 'Mechanical Engineering',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
  }

  async createDepartment(
    dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: string }
  ): Promise<string> {
    if (!dept.code || !dept.code.trim()) {
      throw new Error('VALIDATION_ERROR: Department code is required.');
    }
    if (!dept.name || !dept.name.trim()) {
      throw new Error('VALIDATION_ERROR: Department name is required.');
    }
    const cleanCode = dept.code.trim().toUpperCase();
    const docId = `dept_${cleanCode.toLowerCase()}`;
    const now = getCurrentUtcIso();

    const payload: Department = {
      id: docId,
      code: cleanCode,
      name: dept.name.trim(),
      headOfDeptId: dept.headOfDeptId || '',
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || dept.createdBy || 'system',
    };

    try {
      await setDoc(doc(db, 'departments', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `departments/${docId}`);
      return docId;
    }
  }

  async updateDepartment(
    deptId: string,
    updates: Partial<Omit<Department, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: string }
  ): Promise<void> {
    const now = getCurrentUtcIso();
    try {
      await updateDoc(doc(db, 'departments', deptId), {
        ...updates,
        updatedAt: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `departments/${deptId}`);
    }
  }

  // --- Course Offerings Management ---
  async getCourseOfferings(semesterId?: string, departmentId?: string): Promise<CourseOffering[]> {
    try {
      const snap = await getDocs(collection(db, 'courseOfferings'));
      const list: CourseOffering[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<CourseOffering, 'id'>) });
      });

      let filtered = list;
      if (semesterId) {
        filtered = filtered.filter((o) => o.semesterId === semesterId);
      }
      if (filtered.length > 0) return filtered;
    } catch (err) {
      console.warn('AcademicRecordService.getCourseOfferings warning:', err);
    }

    // Backward-compatibility: Synthesize course offerings from active courses and current semester
    const courses = await this.getCourses(false);
    const semesters = await this.getSemesters();
    const curSem = semesters.find((s) => s.isCurrent) || semesters[0];
    const targetSemId = semesterId || (curSem ? curSem.id : '2026-spring');

    return courses.map((c) => ({
      id: `off_${targetSemId}_${c.id}_A`,
      courseId: c.id,
      courseCode: c.code,
      courseTitle: c.title,
      semesterId: targetSemId,
      section: 'A',
      teacherIds: [c.createdBy || 'demo-teacher-01'],
      status: 'active' as const,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdBy: c.createdBy,
    }));
  }

  async createCourseOffering(
    offering: Omit<CourseOffering, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: string }
  ): Promise<string> {
    if (!offering.courseId) throw new Error('VALIDATION_ERROR: courseId is required.');
    if (!offering.semesterId) throw new Error('VALIDATION_ERROR: semesterId is required.');
    if (!offering.section) throw new Error('VALIDATION_ERROR: section is required.');

    const docId = `off_${offering.semesterId}_${offering.courseId}_${offering.section.toUpperCase()}`;
    const now = getCurrentUtcIso();

    const payload: CourseOffering = {
      id: docId,
      courseId: offering.courseId,
      courseCode: offering.courseCode || '',
      courseTitle: offering.courseTitle || '',
      semesterId: offering.semesterId,
      section: offering.section.toUpperCase(),
      teacherIds: offering.teacherIds || [],
      advisorIds: offering.advisorIds || [],
      capacity: offering.capacity || 50,
      status: offering.status || 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: actor?.uid || offering.createdBy || 'system',
    };

    try {
      await setDoc(doc(db, 'courseOfferings', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courseOfferings/${docId}`);
      return docId;
    }
  }

  async updateCourseOffering(
    offeringId: string,
    updates: Partial<Omit<CourseOffering, 'id' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; role: string }
  ): Promise<void> {
    const now = getCurrentUtcIso();
    try {
      await setDoc(
        doc(db, 'courseOfferings', offeringId),
        {
          ...updates,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courseOfferings/${offeringId}`);
    }
  }

  // --- Student Pre-Registration & Invitations ---
  async getStudentInvitations(status?: string): Promise<StudentInvitation[]> {
    let list: StudentInvitation[] = [];
    try {
      const snap = await getDocs(collection(db, 'studentInvitations'));
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<StudentInvitation, 'id'>) });
      });
    } catch (err) {
      console.warn('AcademicRecordService.getStudentInvitations warning:', err);
    }

    try {
      const demoList: StudentInvitation[] = JSON.parse(localStorage.getItem('aras_demo_invitations') || '[]');
      for (const d of demoList) {
        if (!list.some((existing) => existing.id === d.id || existing.token === d.token)) {
          list.push(d);
        }
      }
    } catch (e) {
      // Ignore
    }

    if (status) {
      list = list.filter((inv) => inv.status === status);
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async createStudentInvitation(
    invitation: Omit<StudentInvitation, 'id' | 'token' | 'status' | 'createdAt' | 'expiresAt'>,
    actor?: { uid: string; role: string }
  ): Promise<StudentInvitation> {
    if (!invitation.officialStudentId || !invitation.officialStudentId.trim()) {
      throw new Error('VALIDATION_ERROR: officialStudentId is required.');
    }
    if (!invitation.email || !invitation.email.trim()) {
      throw new Error('VALIDATION_ERROR: email is required.');
    }
    if (!invitation.department || !invitation.department.trim()) {
      throw new Error('VALIDATION_ERROR: department is required.');
    }

    const cleanStudentId = invitation.officialStudentId.trim();
    const cleanEmail = invitation.email.trim().toLowerCase();

    // Check if duplicate studentId is already pending
    const existing = await this.getStudentInvitations('pending');
    const dup = existing.find((i) => i.officialStudentId.toUpperCase() === cleanStudentId.toUpperCase());
    if (dup) {
      throw new Error(`VALIDATION_ERROR: An active pending invitation already exists for student ID "${cleanStudentId}".`);
    }

    const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timePart = Date.now().toString(36).toUpperCase();
    const token = `ACT-${randPart}-${timePart}`;
    const docId = `inv_${token}`;
    const now = getCurrentUtcIso();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload: StudentInvitation = {
      id: docId,
      token,
      officialStudentId: cleanStudentId,
      displayName: invitation.displayName?.trim() || cleanStudentId,
      email: cleanEmail,
      department: invitation.department.trim(),
      batch: invitation.batch?.trim() || '2026',
      section: invitation.section?.trim() || 'A',
      level: invitation.level?.trim() || 'Level 1, Term 1',
      phone: invitation.phone?.trim() || undefined,
      advisorId: invitation.advisorId || undefined,
      status: 'pending',
      expiresAt,
      createdAt: now,
      createdBy: actor?.uid || invitation.createdBy || 'admin',
    };

    const isDemo = Boolean(localStorage.getItem('aras_demo_session_email')) || !auth.currentUser;

    if (!isDemo && auth.currentUser) {
      try {
        await setDoc(doc(db, 'studentInvitations', docId), payload);
        return payload;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `studentInvitations/${docId}`);
        return payload;
      }
    } else {
      // In preview demo mode or unauthenticated fallback, save to demo storage
      try {
        const stored: StudentInvitation[] = JSON.parse(localStorage.getItem('aras_demo_invitations') || '[]');
        stored.unshift(payload);
        localStorage.setItem('aras_demo_invitations', JSON.stringify(stored));
      } catch (e) {
        console.warn('Could not store demo invitation:', e);
      }
      return payload;
    }
  }

  async verifyInvitationToken(token: string): Promise<StudentInvitation> {
    const cleanToken = token.trim();
    const docId = cleanToken.startsWith('inv_') ? cleanToken : `inv_${cleanToken}`;

    let inv: StudentInvitation | null = null;

    try {
      const snap = await getDoc(doc(db, 'studentInvitations', docId));
      if (snap.exists()) {
        inv = { id: snap.id, ...(snap.data() as Omit<StudentInvitation, 'id'>) };
      } else {
        const q = query(collection(db, 'studentInvitations'), where('token', '==', cleanToken));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const d = qSnap.docs[0];
          inv = { id: d.id, ...(d.data() as Omit<StudentInvitation, 'id'>) };
        }
      }
    } catch (err) {
      console.warn('Firestore verify token note:', err);
    }

    if (!inv) {
      try {
        const demoList: StudentInvitation[] = JSON.parse(localStorage.getItem('aras_demo_invitations') || '[]');
        inv = demoList.find((i) => i.token === cleanToken || i.id === docId) || null;
      } catch (e) {
        // Ignore
      }
    }

    if (!inv) {
      throw new Error('NOT_FOUND: Invalid or unrecognized activation invitation token.');
    }

    if (inv.status === 'claimed') {
      throw new Error('INVALID_STATE: This invitation token has already been claimed and activated.');
    }
    if (inv.status === 'revoked') {
      throw new Error('INVALID_STATE: This invitation token has been revoked by administration.');
    }
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      throw new Error('EXPIRED: This invitation token has expired. Please request a new activation token.');
    }

    return inv;
  }

  async claimInvitationToken(
    token: string,
    studentUid: string,
    officialStudentId?: string
  ): Promise<{ invitation: StudentInvitation; profile: StudentProfile }> {
    const inv = await this.verifyInvitationToken(token);
    const now = getCurrentUtcIso();

    // Mark invitation claimed in Firestore if possible
    try {
      await updateDoc(doc(db, 'studentInvitations', inv.id), {
        status: 'claimed',
        claimedAt: now,
        claimedByUid: studentUid,
      });
    } catch (err) {
      console.warn('Could not update Firestore invitation doc:', err);
    }

    // Also update demo cache if present
    try {
      const demoList: StudentInvitation[] = JSON.parse(localStorage.getItem('aras_demo_invitations') || '[]');
      const idx = demoList.findIndex((i) => i.id === inv.id || i.token === token);
      if (idx !== -1) {
        demoList[idx].status = 'claimed';
        demoList[idx].claimedAt = now;
        demoList[idx].claimedByUid = studentUid;
        localStorage.setItem('aras_demo_invitations', JSON.stringify(demoList));
      }
    } catch (e) {
      // Ignore
    }

    const semesters = await this.getSemesters();
    const curSem = semesters.find((s) => s.isCurrent) || semesters[0];
    const curSemId = curSem ? curSem.id : '2026-spring';

    // Link official academic profile
    const profilePayload: StudentProfile = {
      id: studentUid,
      studentId: inv.officialStudentId,
      userId: studentUid,
      department: inv.department,
      batch: inv.batch,
      level: inv.level || 'Level 1, Term 1',
      currentSemesterId: curSemId,
      cgpa: null,
      createdAt: now,
      updatedAt: now,
      createdBy: studentUid,
    };

    try {
      await setDoc(doc(db, 'studentProfiles', studentUid), profilePayload, { merge: true });
    } catch (err) {
      console.warn('Profile write in demo mode note:', err);
    }

    if (inv.advisorId) {
      const assignId = `${inv.advisorId}_${studentUid}`;
      const advisorPayload = {
        id: assignId,
        teacherId: inv.advisorId,
        studentId: studentUid,
        assignedDate: now.split('T')[0],
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
        createdBy: 'admin_registration',
      };
      try {
        await setDoc(doc(db, 'advisorAssignments', assignId), advisorPayload, { merge: true });
      } catch (err) {
        console.warn('Could not auto-create advisor assignment doc:', err);
      }
    }

    // Auto-enroll newly activated student into active courses for their department in the current semester
    try {
      const allCourses = await this.getCourses(false);
      const invDept = (inv.department || '').trim().toLowerCase();
      const matchedCourses = allCourses.filter((c) => {
        const cDept = (c.department || '').trim().toLowerCase();
        return (
          cDept === invDept ||
          cDept.includes(invDept) ||
          invDept.includes(cDept) ||
          c.code.toLowerCase().startsWith(invDept)
        );
      });
      const coursesToEnroll = matchedCourses.length > 0 ? matchedCourses : allCourses.slice(0, 3);
      for (const crs of coursesToEnroll) {
        try {
          await this.createEnrollment(
            {
              studentId: studentUid,
              courseId: crs.id,
              semesterId: curSemId,
              status: 'enrolled',
            },
            { uid: 'system', role: 'admin' }
          );
        } catch (enrErr) {
          // Ignore duplicate enrollment error
        }
      }
    } catch (autoEnrErr) {
      console.warn('Auto enrollment on claim token note:', autoEnrErr);
    }

    return {
      invitation: { ...inv, status: 'claimed', claimedAt: now, claimedByUid: studentUid },
      profile: profilePayload,
    };
  }

  async revokeInvitation(invitationId: string, actor?: { uid: string; role: string }): Promise<void> {
    try {
      await updateDoc(doc(db, 'studentInvitations', invitationId), {
        status: 'revoked',
        updatedAt: getCurrentUtcIso(),
      });
    } catch (err) {
      console.warn('Could not revoke in Firestore:', err);
    }
    try {
      const demoList: StudentInvitation[] = JSON.parse(localStorage.getItem('aras_demo_invitations') || '[]');
      const idx = demoList.findIndex((i) => i.id === invitationId);
      if (idx !== -1) {
        demoList[idx].status = 'revoked';
        demoList[idx].updatedAt = getCurrentUtcIso();
        localStorage.setItem('aras_demo_invitations', JSON.stringify(demoList));
      }
    } catch (e) {
      // Ignore
    }
  }

  // --- Attendance Sessions & Audit Corrections ---
  async getAttendanceSessions(courseId?: string, semesterId?: string): Promise<AttendanceSession[]> {
    try {
      const snap = await getDocs(collection(db, 'attendanceSessions'));
      const list: AttendanceSession[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<AttendanceSession, 'id'>) });
      });
      let res = list;
      if (courseId) res = res.filter((s) => s.courseId === courseId);
      if (semesterId) res = res.filter((s) => s.semesterId === semesterId);
      return res.sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
      console.warn('AcademicRecordService.getAttendanceSessions warning:', err);
      return [];
    }
  }

  async createAttendanceSession(
    session: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { uid: string; role: string }
  ): Promise<string> {
    const docId = `att_sess_${session.courseId}_${session.date}_${session.section || 'A'}`;
    const now = getCurrentUtcIso();

    const payload: AttendanceSession = {
      id: docId,
      courseOfferingId: session.courseOfferingId || '',
      courseId: session.courseId,
      semesterId: session.semesterId,
      section: session.section || 'A',
      date: session.date,
      teacherId: actor?.uid || session.teacherId,
      status: session.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'attendanceSessions', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendanceSessions/${docId}`);
      return docId;
    }
  }

  async publishAttendanceSession(sessionId: string, actor?: { uid: string; role: string }): Promise<void> {
    const now = getCurrentUtcIso();
    try {
      await updateDoc(doc(db, 'attendanceSessions', sessionId), {
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendanceSessions/${sessionId}`);
    }
  }

  async recordAttendanceCorrection(correction: Omit<AuditCorrectionRecord, 'id' | 'timestamp'>): Promise<string> {
    if (!correction.reason || !correction.reason.trim()) {
      throw new Error('VALIDATION_ERROR: Justification reason is required for attendance corrections.');
    }
    if (!correction.recordId || !correction.actorUid) {
      throw new Error('VALIDATION_ERROR: recordId and actorUid are required for audit corrections.');
    }
    const now = getCurrentUtcIso();
    const docId = `aud_att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: AuditCorrectionRecord = {
      id: docId,
      ...correction,
      reason: correction.reason.trim(),
      timestamp: now,
    };
    try {
      await setDoc(doc(db, 'auditCorrections', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `auditCorrections/${docId}`);
      return docId;
    }
  }

  async recordMarkCorrection(correction: Omit<AuditCorrectionRecord, 'id' | 'timestamp'>): Promise<string> {
    if (!correction.reason || !correction.reason.trim()) {
      throw new Error('VALIDATION_ERROR: Justification reason is required for mark corrections.');
    }
    if (!correction.recordId || !correction.actorUid) {
      throw new Error('VALIDATION_ERROR: recordId and actorUid are required for audit corrections.');
    }
    const now = getCurrentUtcIso();
    const docId = `aud_mrk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: AuditCorrectionRecord = {
      id: docId,
      ...correction,
      reason: correction.reason.trim(),
      timestamp: now,
    };
    try {
      await setDoc(doc(db, 'auditCorrections', docId), payload);
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `auditCorrections/${docId}`);
      return docId;
    }
  }

  async getAuditCorrections(recordId?: string): Promise<AuditCorrectionRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'auditCorrections'));
      const list: AuditCorrectionRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<AuditCorrectionRecord, 'id'>) });
      });
      if (recordId) {
        return list.filter((r) => r.recordId === recordId);
      }
      return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (err) {
      console.warn('AcademicRecordService.getAuditCorrections warning:', err);
      return [];
    }
  }
}

export const academicRecordService = new AcademicRecordService();
