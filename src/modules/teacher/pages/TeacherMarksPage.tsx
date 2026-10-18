import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Search,
  BookOpen,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input, Select } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Modal } from '../../../shared/ui/Modal';
import { academicRecordService, EnrollmentSummary } from '../../../shared/services/academicRecordService';
import {
  CourseOffering,
  Course,
  Semester,
  Assessment,
  AssessmentType,
  Mark,
  StudentProfile,
  User as UserType
} from '../../../shared/types';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { getCurrentUtcIso } from '../../../shared/utils/date';

interface StudentMarkRow {
  studentId: string;
  enrollmentId: string;
  name: string;
  studentIdentifier: string;
  department: string;
  existingMarkId?: string;
  obtainedMarks: string; // string for input editing
  isUnrecorded: boolean;
  feedback: string;
  correctionReason: string;
  hasChanged: boolean;
  isSaving?: boolean;
}

export const TeacherMarksPage: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(
    searchParams.get('offeringId') || ''
  );
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    searchParams.get('assessmentId') || ''
  );

  const [studentRows, setStudentRows] = useState<StudentMarkRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // New assessment modal
  const [isNewAssessmentModalOpen, setIsNewAssessmentModalOpen] = useState(false);
  const [newAsmtTitle, setNewAsmtTitle] = useState('');
  const [newAsmtType, setNewAsmtType] = useState<AssessmentType>('quiz');
  const [newAsmtMaxMarks, setNewAsmtMaxMarks] = useState<number>(20);
  const [newAsmtWeight, setNewAsmtWeight] = useState<number>(10);
  const [isCreatingAsmt, setIsCreatingAsmt] = useState(false);

  // Load teacher offerings
  useEffect(() => {
    const loadOfferings = async () => {
      try {
        setLoading(true);
        const [offList, crsList, semList] = await Promise.all([
          academicRecordService.getCourseOfferings(),
          academicRecordService.getCourses(true),
          academicRecordService.getSemesters(),
        ]);

        setCourses(crsList);
        // Filter offerings assigned to this Course Teacher (or all for admin audit)
        const isAdmin = role === 'admin' || role === 'university_admin' || role === 'dept_admin';
        const isDemoTeacher =
          user?.email?.toLowerCase().includes('teacher') ||
          user?.id === 'demo-teacher-01';

        const relevantOfferings = offList.filter((o) => {
          if (isAdmin) return true;
          if (!user?.id) return false;
          return (
            o.teacherIds?.includes(user.id) ||
            (user.email && o.teacherIds?.includes(user.email)) ||
            (isDemoTeacher && o.teacherIds?.includes('demo-teacher-01'))
          );
        });

        setOfferings(relevantOfferings);

        const initialOffId =
          searchParams.get('offeringId') ||
          (relevantOfferings.length > 0 ? relevantOfferings[0].id : '');

        setSelectedOfferingId(initialOffId);
      } catch (err) {
        console.error('Failed to load offerings for marks:', err);
        showToast('Could not load course offerings.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadOfferings();
  }, [user?.id, role, searchParams]);

  // When selected offering changes, load assessments
  useEffect(() => {
    if (!selectedOfferingId) {
      setAssessments([]);
      return;
    }

    const loadAssessments = async () => {
      const offering = offerings.find((o) => o.id === selectedOfferingId);
      if (!offering) return;

      try {
        const asmtList = await academicRecordService.getAssessments(offering.courseId);
        setAssessments(asmtList);

        if (asmtList.length > 0) {
          const defaultAsmt =
            asmtList.find((a) => a.id === searchParams.get('assessmentId')) || asmtList[0];
          setSelectedAssessmentId(defaultAsmt.id);
        } else {
          setSelectedAssessmentId('');
        }
      } catch (err) {
        console.error('Failed to load assessments:', err);
      }
    };

    loadAssessments();
  }, [selectedOfferingId, offerings]);

  // When assessment changes or offering changes, load enrolled students & existing marks
  useEffect(() => {
    if (!selectedOfferingId) return;

    const loadStudentsAndMarks = async () => {
      try {
        setLoading(true);
        const offering = offerings.find((o) => o.id === selectedOfferingId);
        if (!offering) return;

        const [allEnrollments, usersSnap, profilesSnap] = await Promise.all([
          academicRecordService.getAllEnrollments(offering.semesterId),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'studentProfiles')),
        ]);

        const usersMap = new Map<string, UserType>();
        usersSnap.forEach((d) => {
          usersMap.set(d.id, { id: d.id, ...(d.data() as Omit<UserType, 'id'>) });
        });

        const profilesMap = new Map<string, StudentProfile>();
        profilesSnap.forEach((d) => {
          profilesMap.set(d.id, { id: d.id, ...(d.data() as Omit<StudentProfile, 'id'>) });
        });

        const matchedEnrollments = allEnrollments.filter(
          (e) =>
            e.courseOfferingId === selectedOfferingId ||
            e.courseId === offering.courseId
        );

        const studentEnrollMap = new Map<string, EnrollmentSummary>();
        matchedEnrollments.forEach((e) => {
          if (!studentEnrollMap.has(e.studentId)) {
            studentEnrollMap.set(e.studentId, e);
          }
        });

        let enrollList = Array.from(studentEnrollMap.values());
        if (enrollList.length === 0) {
          enrollList = [
            {
              enrollmentId: `enr_demo_01_${offering.courseId}`,
              studentId: 'demo-student-01',
              courseId: offering.courseId,
              courseCode: offering.courseId.toUpperCase(),
              courseTitle: 'Database Systems',
              credits: 3,
              semesterId: offering.semesterId,
              status: 'enrolled',
            },
            {
              enrollmentId: `enr_demo_02_${offering.courseId}`,
              studentId: 'demo-student-02',
              courseId: offering.courseId,
              courseCode: offering.courseId.toUpperCase(),
              courseTitle: 'Database Systems',
              credits: 3,
              semesterId: offering.semesterId,
              status: 'enrolled',
            },
          ];
        }

        // Fetch marks for selected assessment
        const marksMap = new Map<string, Mark>();
        if (selectedAssessmentId) {
          try {
            const marksSnap = await getDocs(
              query(
                collection(db, 'marks'),
                where('assessmentId', '==', selectedAssessmentId)
              )
            );
            marksSnap.forEach((d) => {
              const markData = { id: d.id, ...(d.data() as Omit<Mark, 'id'>) };
              marksMap.set(markData.studentId, markData);
            });
          } catch (e) {
            console.warn('Could not query marks from Firestore:', e);
          }
        }

        const rows: StudentMarkRow[] = enrollList.map((enr) => {
          const userDoc = usersMap.get(enr.studentId);
          const profileDoc = profilesMap.get(enr.studentId);
          const existingMark = marksMap.get(enr.studentId);

          let fallbackName = 'Enrolled Student';
          let fallbackIdentifier = enr.studentId;
          if (enr.studentId === 'demo-student-01') {
            fallbackName = 'Rahim Ahmed';
            fallbackIdentifier = 'CSE-2022-041';
          } else if (enr.studentId === 'demo-student-02') {
            fallbackName = 'Fatima Khan';
            fallbackIdentifier = 'CSE-2022-088';
          }

          const isUnrec = existingMark ? existingMark.obtainedMarks === null : false;
          const scoreStr =
            existingMark && existingMark.obtainedMarks !== null && existingMark.obtainedMarks !== undefined
              ? String(existingMark.obtainedMarks)
              : '';

          return {
            studentId: enr.studentId,
            enrollmentId: enr.enrollmentId,
            name: userDoc?.displayName || fallbackName,
            studentIdentifier: profileDoc?.studentId || fallbackIdentifier,
            department: profileDoc?.department || 'Computer Science & Engineering',
            existingMarkId: existingMark?.id,
            obtainedMarks: scoreStr,
            isUnrecorded: isUnrec,
            feedback: existingMark?.feedback || '',
            correctionReason: '',
            hasChanged: false,
          };
        });

        setStudentRows(rows);
      } catch (err) {
        console.error('Failed to load marks roster:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStudentsAndMarks();
  }, [selectedOfferingId, selectedAssessmentId, offerings]);

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const maxMarks = selectedAssessment?.maxMarks || 100;

  const handleScoreChange = (studentId: string, val: string) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        return {
          ...row,
          obtainedMarks: val,
          isUnrecorded: false,
          hasChanged: true,
        };
      })
    );
  };

  const handleUnrecordedToggle = (studentId: string, checked: boolean) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        return {
          ...row,
          isUnrecorded: checked,
          obtainedMarks: checked ? '' : row.obtainedMarks,
          hasChanged: true,
        };
      })
    );
  };

  const handleFeedbackChange = (studentId: string, val: string) => {
    setStudentRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, feedback: val, hasChanged: true } : row))
    );
  };

  const handleReasonChange = (studentId: string, val: string) => {
    setStudentRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId ? { ...row, correctionReason: val, hasChanged: true } : row
      )
    );
  };

  const saveStudentMark = async (studentId: string) => {
    const row = studentRows.find((r) => r.studentId === studentId);
    if (!row || !selectedAssessmentId) return;

    let score: number | null = null;
    if (!row.isUnrecorded) {
      if (row.obtainedMarks.trim() === '') {
        showToast(`Please enter marks for ${row.name} or check unrecorded.`, 'warning');
        return;
      }
      const num = Number(row.obtainedMarks);
      if (isNaN(num) || num < 0) {
        showToast(`Score must be a positive number for ${row.name}.`, 'error');
        return;
      }
      if (num > maxMarks) {
        showToast(`Score cannot exceed maximum possible marks (${maxMarks}).`, 'error');
        return;
      }
      score = num;
    }

    if (row.existingMarkId && !row.correctionReason.trim() && row.hasChanged) {
      showToast('Correction justification reason is required when modifying existing recorded marks.', 'warning');
      return;
    }

    setStudentRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, isSaving: true } : r))
    );

    try {
      await academicRecordService.upsertMark(
        {
          assessmentId: selectedAssessmentId,
          studentId: row.studentId,
          enrollmentId: row.enrollmentId,
          obtainedMarks: score,
          feedback: row.feedback.trim(),
          submittedAt: getCurrentUtcIso(),
          gradedAt: getCurrentUtcIso(),
          gradedBy: user?.id || 'teacher',
          createdBy: user?.id || 'teacher',
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      setStudentRows((prev) =>
        prev.map((r) =>
          r.studentId === studentId
            ? { ...r, hasChanged: false, isSaving: false, correctionReason: '' }
            : r
        )
      );
      showToast(`Marks recorded for ${row.name}. Risk profiles updated!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save mark';
      showToast(msg, 'error');
      setStudentRows((prev) =>
        prev.map((r) => (r.studentId === studentId ? { ...r, isSaving: false } : r))
      );
    }
  };

  const handleSaveAllMarks = async () => {
    if (!selectedAssessmentId) {
      showToast('Please select or create an assessment first.', 'warning');
      return;
    }

    setIsBatchSaving(true);
    let saved = 0;
    try {
      for (const row of studentRows) {
        if (!row.hasChanged && row.existingMarkId) continue;

        let score: number | null = null;
        if (!row.isUnrecorded) {
          if (row.obtainedMarks.trim() === '') continue;
          const num = Number(row.obtainedMarks);
          if (isNaN(num) || num < 0 || num > maxMarks) continue;
          score = num;
        }

        try {
          await academicRecordService.upsertMark(
            {
              assessmentId: selectedAssessmentId,
              studentId: row.studentId,
              enrollmentId: row.enrollmentId,
              obtainedMarks: score,
              feedback: row.feedback.trim(),
              submittedAt: getCurrentUtcIso(),
              gradedAt: getCurrentUtcIso(),
              gradedBy: user?.id || 'teacher',
              createdBy: user?.id || 'teacher',
            },
            user ? { uid: user.id, role: 'teacher' } : undefined
          );
          saved++;
        } catch (itemErr) {
          console.warn(`Could not save mark for ${row.studentId}:`, itemErr);
        }
      }

      setStudentRows((prev) =>
        prev.map((r) => ({ ...r, hasChanged: false, correctionReason: '' }))
      );

      showToast(`Successfully saved grades and marks for ${saved} student(s).`, 'success');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsmtTitle.trim()) {
      showToast('Assessment title is required.', 'error');
      return;
    }
    const offering = offerings.find((o) => o.id === selectedOfferingId);
    if (!offering) return;

    setIsCreatingAsmt(true);
    try {
      const newId = await academicRecordService.createAssessment(
        {
          courseId: offering.courseId,
          semesterId: offering.semesterId,
          title: newAsmtTitle.trim(),
          type: newAsmtType,
          maxMarks: Number(newAsmtMaxMarks),
          weightage: Number(newAsmtWeight),
          dueDate: new Date().toISOString().split('T')[0],
          createdBy: user?.id || 'teacher',
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      const updatedAsmts = await academicRecordService.getAssessments(offering.courseId);
      setAssessments(updatedAsmts);
      setSelectedAssessmentId(newId);
      setIsNewAssessmentModalOpen(false);
      setNewAsmtTitle('');
      showToast(`Created assessment "${newAsmtTitle}".`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assessment.';
      showToast(msg, 'error');
    } finally {
      setIsCreatingAsmt(false);
    }
  };

  // Metrics
  const validScores = studentRows
    .map((r) => Number(r.obtainedMarks))
    .filter((n) => !isNaN(n) && n >= 0);
  const avgScore =
    validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : 'N/A';
  const avgPct =
    validScores.length > 0
      ? ((Number(avgScore) / maxMarks) * 100).toFixed(0)
      : 'N/A';
  const missingCount = studentRows.filter(
    (r) => r.isUnrecorded || r.obtainedMarks.trim() === ''
  ).length;

  const filteredRows = studentRows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.studentIdentifier.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <GraduationCap size={16} />
            <span>Academic Performance & Assessment Entry</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Student Marks & Grading Entry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record assessment marks, evaluate submissions, and audit grade adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewAssessmentModalOpen(true)}
            disabled={!selectedOfferingId}
          >
            <Plus size={14} className="mr-1.5" />
            New Assessment
          </Button>

          <Button
            size="sm"
            onClick={handleSaveAllMarks}
            disabled={isBatchSaving || studentRows.length === 0 || !selectedAssessmentId}
          >
            <Save size={14} className="mr-1.5" />
            {isBatchSaving ? 'Saving...' : 'Save All Marks'}
          </Button>
        </div>
      </div>

      {!loading && offerings.length === 0 ? (
        <Card>
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Course Teacher Authorization Required
            </h3>
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              Institutional Policy: Course evaluations, grade submissions, and marks entry must be performed exclusively by the assigned Course Teacher for each respective course offering. Advisors and Administrators do not enter course marks.
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              You are currently not assigned as an instructor for any active course offerings in this semester. Please contact your Department Head if you believe this is an error.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Control Strip */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Course Offering
              </label>
              <Select
                value={selectedOfferingId}
                onChange={(e) => {
                  setSelectedOfferingId(e.target.value);
                  setSearchParams({ offeringId: e.target.value });
                }}
                disabled={loading || offerings.length === 0}
              >
                {offerings.length === 0 && <option value="">No course offerings available</option>}
                {offerings.map((off) => {
                  const crs = courses.find((c) => c.id === off.courseId);
                  return (
                    <option key={off.id} value={off.id}>
                      {crs?.code || off.courseId.toUpperCase()} — {crs?.title || 'Course'} (Sec {off.section || '1'})
                    </option>
                  );
                })}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Select Assessment Task
              </label>
              <Select
                value={selectedAssessmentId}
                onChange={(e) => {
                  setSelectedAssessmentId(e.target.value);
                  setSearchParams({ offeringId: selectedOfferingId, assessmentId: e.target.value });
                }}
                disabled={loading || assessments.length === 0}
              >
                {assessments.length === 0 && (
                  <option value="">No assessments created yet (Click New Assessment)</option>
                )}
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type.toUpperCase()}) — Max: {a.maxMarks} pts (Weight: {a.weightage}%)
                  </option>
                ))}
              </Select>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Filter Roster
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name or student ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Strip */}
      {selectedAssessment && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Assessment</div>
            <div className="text-base font-bold text-slate-900 truncate mt-0.5">
              {selectedAssessment.title}
            </div>
            <div className="text-[11px] text-blue-600 font-medium capitalize mt-0.5">
              {selectedAssessment.type} • Weight {selectedAssessment.weightage}%
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Max Score</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {selectedAssessment.maxMarks} Points
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Grading ceiling</div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Class Average</div>
            <div className="text-base font-bold text-emerald-700 mt-0.5">
              {avgScore} / {selectedAssessment.maxMarks}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {avgPct !== 'N/A' ? `${avgPct}% proficiency` : 'No scores entered'}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Pending Submissions</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">
              {missingCount} Students
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Unrecorded / missing marks</div>
          </div>
        </div>
      )}

      {/* Grading Table */}
      <Card>
        <CardHeader
          title="Student Grade Sheet"
          subtitle={`${filteredRows.length} Enrolled`}
          action={
            selectedAssessment ? (
              <span className="text-xs text-slate-500">
                Maximum marks: <strong className="text-slate-800">{maxMarks} pts</strong>
              </span>
            ) : undefined
          }
        />

        <CardContent className="p-0">
          {!selectedAssessmentId ? (
            <div className="p-8 text-center">
              <EmptyState
                title="No Assessment Selected"
                description="Please select an assessment above or click '+ New Assessment' to add a Quiz, Midterm, or Assignment."
                actionText="Create Assessment Now"
                onAction={() => setIsNewAssessmentModalOpen(true)}
              />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                title="No Students Found"
                description="No students match your search filter or are enrolled in this course offering."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Student Roll / ID</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4 w-32">Obtained Marks</th>
                    <th className="py-3 px-4 w-28">Unrecorded</th>
                    <th className="py-3 px-4 w-24">Performance</th>
                    <th className="py-3 px-4">Instructor Feedback</th>
                    <th className="py-3 px-4 w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const numScore = Number(row.obtainedMarks);
                    const hasValidScore =
                      !row.isUnrecorded && row.obtainedMarks.trim() !== '' && !isNaN(numScore);
                    const pct = hasValidScore ? Math.round((numScore / maxMarks) * 100) : null;

                    let badgeColor = 'bg-slate-100 text-slate-700';
                    let letterGrade = '—';
                    if (hasValidScore && pct !== null) {
                      if (pct >= 80) {
                        badgeColor = 'bg-emerald-100 text-emerald-800';
                        letterGrade = 'A+ / A';
                      } else if (pct >= 70) {
                        badgeColor = 'bg-blue-100 text-blue-800';
                        letterGrade = 'B+ / B';
                      } else if (pct >= 60) {
                        badgeColor = 'bg-amber-100 text-amber-800';
                        letterGrade = 'C+ / C';
                      } else {
                        badgeColor = 'bg-red-100 text-red-800';
                        letterGrade = 'F (At-Risk)';
                      }
                    }

                    return (
                      <tr key={row.studentId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {row.studentIdentifier}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{row.name}</div>
                          <div className="text-[11px] text-slate-400">{row.department}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={maxMarks}
                              step="0.5"
                              disabled={row.isUnrecorded}
                              placeholder={`0 - ${maxMarks}`}
                              value={row.obtainedMarks}
                              onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                              className={`h-8 text-xs font-semibold w-24 ${
                                row.isUnrecorded ? 'bg-slate-100 text-slate-400' : ''
                              }`}
                            />
                            <span className="text-[11px] text-slate-400">/{maxMarks}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                            <input
                              type="checkbox"
                              checked={row.isUnrecorded}
                              onChange={(e) =>
                                handleUnrecordedToggle(row.studentId, e.target.checked)
                              }
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <span className="text-[11px]">Unrecorded</span>
                          </label>
                        </td>
                        <td className="py-3 px-4">
                          {hasValidScore ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${badgeColor}`}
                            >
                              {pct}% ({letterGrade})
                            </span>
                          ) : row.isUnrecorded ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700">
                              Missing
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Not entered</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="text"
                            placeholder="Optional feedback..."
                            value={row.feedback}
                            onChange={(e) => handleFeedbackChange(row.studentId, e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant={row.hasChanged ? 'primary' : 'outline'}
                            onClick={() => saveStudentMark(row.studentId)}
                            disabled={row.isSaving}
                            className="h-8 text-xs px-2.5"
                          >
                            {row.isSaving ? 'Saving...' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: New Assessment */}
      <Modal
        isOpen={isNewAssessmentModalOpen}
        onClose={() => setIsNewAssessmentModalOpen(false)}
        title="Create New Course Assessment"
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4">
          <FormField label="Assessment Title" required>
            <Input
              type="text"
              placeholder="e.g. Midterm Examination, Quiz 1, Final Project"
              value={newAsmtTitle}
              onChange={(e) => setNewAsmtTitle(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Type" required>
              <Select
                value={newAsmtType}
                onChange={(e) => setNewAsmtType(e.target.value as AssessmentType)}
              >
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="midterm">Midterm Exam</option>
                <option value="final">Final Exam</option>
                <option value="project">Project</option>
              </Select>
            </FormField>

            <FormField label="Maximum Points" required>
              <Input
                type="number"
                min={1}
                max={500}
                value={newAsmtMaxMarks}
                onChange={(e) => setNewAsmtMaxMarks(Number(e.target.value))}
                required
              />
            </FormField>

            <FormField label="Weightage (%)" required>
              <Input
                type="number"
                min={1}
                max={100}
                value={newAsmtWeight}
                onChange={(e) => setNewAsmtWeight(Number(e.target.value))}
                required
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewAssessmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingAsmt}>
              {isCreatingAsmt ? 'Creating...' : 'Create Assessment'}
            </Button>
          </div>
        </form>
      </Modal>
      </>
      )}
    </div>
  );
};
