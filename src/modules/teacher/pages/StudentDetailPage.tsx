import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { StatCard } from '../../../shared/ui/StatCard';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { useToast } from '../../../shared/ui/Toast';
import {
  StudentProfile,
  Assessment,
  AttendanceRecord,
  Mark,
  Intervention,
  StudentProgressComparison,
  RiskAssessment,
  Course,
  Semester,
} from '../../../shared/types';
import {
  academicRecordService,
  EnrollmentSummary,
  AttendanceSummary,
  MarksSummary,
} from '../../../shared/services/academicRecordService';
import {
  riskService,
  CurrentRiskStatus,
  RecommendationItem,
} from '../../../shared/services/riskService';
import { interventionService } from '../../../shared/services/interventionService';
import { realtimeSyncManager } from '../../../shared/services/realtimeSync';
import { AttendanceEntryModal } from '../components/AttendanceEntryModal';
import { MarksEntryModal } from '../components/MarksEntryModal';
import { CreateInterventionModal } from '../components/CreateInterventionModal';
import { AddFollowUpModal } from '../components/AddFollowUpModal';
import { ProgressComparisonCard } from '../components/ProgressComparisonCard';
import { FeedbackSection } from '../components/FeedbackSection';
import { CreateAssessmentModal } from '../components/CreateAssessmentModal';
import { CreateDeadlineModal } from '../components/CreateDeadlineModal';
import { ExportReportModal } from '../../../shared/ui/ExportReportModal';
import { AcademicReportData } from '../../../shared/services/exportReportService';
import {
  ArrowLeft,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Calendar,
  Award,
  BookOpen,
  ShieldAlert,
  Clock,
  Sparkles,
  Lock,
  Edit2,
  CalendarCheck,
  TrendingUp,
  Download,
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const studentId = id || '';
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [studentUser, setStudentUser] = useState<{ displayName: string; email: string } | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [marks, setMarks] = useState<MarksSummary | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentRisk, setCurrentRisk] = useState<CurrentRiskStatus | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskAssessment[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'interventions' | 'feedback'>('overview');

  // Modals state
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [activeFollowUpIntervention, setActiveFollowUpIntervention] = useState<Intervention | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);

  // Comparison state map (interventionId -> comparison)
  const [comparisons, setComparisons] = useState<Record<string, StudentProgressComparison>>({});
  const [evaluatingRisk, setEvaluatingRisk] = useState(false);

  const loadAllStudentData = async () => {
    if (!user || !studentId) return;

    try {
      setLoading(true);

      // 1. Authorization check
      const isAdmin = role === 'admin';
      const isAssigned = isAdmin ? true : await interventionService.checkAdvisorAuthorization(user.id, studentId);
      setAuthorized(isAssigned);

      if (!isAssigned) {
        setLoading(false);
        return;
      }

      // 2. Load student profile, user info, courses & semesters
      const [prof, enrs, att, mrks, rStatus, rHist, recs, ints, crsList, semList] = await Promise.all([
        academicRecordService.getStudentProfile(studentId),
        academicRecordService.getEnrollments(studentId),
        academicRecordService.getAttendance(studentId),
        academicRecordService.getMarks(studentId),
        riskService.getCurrentRisk(studentId).catch(() => null),
        riskService.getRiskHistory(studentId).catch(() => []),
        riskService.getRecommendations(studentId).catch(() => []),
        interventionService.listInterventions(undefined, studentId).catch(() => []),
        academicRecordService.getCourses(true).catch(() => []),
        academicRecordService.getSemesters().catch(() => []),
      ]);

      setProfile(prof);
      setEnrollments(enrs);
      setAttendance(att);
      setMarks(mrks);
      setCurrentRisk(rStatus);
      setRiskHistory(rHist);
      setRecommendations(recs);
      setInterventions(ints);
      setAllCourses(crsList);
      setAllSemesters(semList);

      // Load all assessments for enrolled courses
      if (enrs.length > 0) {
        const asmtPromises = enrs.map((e) => academicRecordService.getAssessments(e.courseId));
        const asmtArrays = await Promise.all(asmtPromises);
        const combined = asmtArrays.flat();
        setAssessments(combined);
      }

      // Compute comparisons for all interventions
      const compMap: Record<string, StudentProgressComparison> = {};
      for (const intItem of ints) {
        try {
          const comp = await interventionService.getProgressComparison(studentId, intItem.id);
          compMap[intItem.id] = comp;
        } catch {
          // ignore
        }
      }
      setComparisons(compMap);
    } catch (err) {
      console.warn('StudentDetailPage load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStudentData();
    if (!studentId) return;

    const unwatch = realtimeSyncManager.watchStudent(studentId);
    const unsub = realtimeSyncManager.subscribe((changedStudentId) => {
      if (changedStudentId === studentId) {
        loadAllStudentData();
      }
    });

    return () => {
      unwatch();
      unsub();
    };
  }, [studentId, user, role]);

  const handleManualRiskEvaluation = async () => {
    if (!studentId) return;
    setEvaluatingRisk(true);
    try {
      const refreshed = await riskService.assessStudent(studentId, 'manual_review');
      setCurrentRisk(refreshed);
      const hist = await riskService.getRiskHistory(studentId);
      setRiskHistory(hist);
      const recs = await riskService.getRecommendations(studentId);
      setRecommendations(recs);
      showToast('Student risk profile evaluated and refreshed successfully.', 'success');
    } catch (err) {
      console.warn('Manual risk evaluation note:', err);
      showToast('Risk assessment update pending.', 'info');
    } finally {
      setEvaluatingRisk(false);
    }
  };

  const renderRiskBadge = (level?: string, isSufficient = true) => {
    if (!isSufficient || level === 'Insufficient data') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <HelpCircle size={14} className="text-slate-500" />
          <span>Insufficient Data</span>
        </span>
      );
    }
    switch (level) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <AlertOctagon size={14} className="text-red-700" />
            <span>High Risk Alert</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={14} className="text-amber-700" />
            <span>Medium Risk Warning</span>
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle size={14} className="text-emerald-700" />
            <span>Low Risk (Satisfactory)</span>
          </span>
        );
    }
  };

  // Compile full Academic Report Data for PDF/CSV documentation export
  const exportReportData: AcademicReportData = useMemo(() => {
    const totalClasses = attendance?.totalClasses || 0;
    const attended = attendance?.attendedClasses || 0;
    const records = attendance?.records || [];
    let absent = 0;
    let late = 0;
    let excused = 0;
    records.forEach((r) => {
      if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'excused') excused++;
    });

    const totalCredits = enrollments.reduce((sum, c) => sum + c.credits, 0);

    const markItems = marks?.items || [];
    const courseBreakdown = enrollments.map((enr) => {
      const cItems = markItems.filter((i) => i.assessment.courseId === enr.courseId);
      let obtained = 0;
      let max = 0;
      let gradedCount = 0;
      cItems.forEach((i) => {
        if (i.mark && i.mark.obtainedMarks !== null && i.mark.obtainedMarks !== undefined) {
          obtained += i.mark.obtainedMarks;
          max += i.assessment.maxMarks;
          gradedCount++;
        }
      });
      const pct = gradedCount > 0 && max > 0 ? Math.round(((obtained / max) * 100) * 10) / 10 : null;
      return {
        courseCode: enr.courseCode,
        courseTitle: enr.courseTitle,
        credits: enr.credits,
        percentage: pct,
        gradedCount,
        totalAssessments: cItems.length,
      };
    });

    const asmtRows = markItems.map((item) => {
      const course = enrollments.find((e) => e.courseId === item.assessment.courseId);
      const obtained = item.mark ? item.mark.obtainedMarks : null;
      const pct =
        obtained !== null && item.assessment.maxMarks > 0
          ? Math.round(((obtained / item.assessment.maxMarks) * 100) * 10) / 10
          : null;
      return {
        courseCode: course ? course.courseCode : undefined,
        title: item.assessment.title,
        type: item.assessment.type,
        dueDate: item.assessment.dueDate,
        maxMarks: item.assessment.maxMarks,
        obtainedMarks: obtained,
        percentage: pct,
      };
    });

    return {
      student: {
        id: studentId,
        officialStudentId: profile?.studentId || studentId,
        displayName: profile?.displayName || studentUser?.displayName || 'Student Profile',
        email: studentUser?.email || '',
        department: profile?.department || 'Computer Science & Engineering',
        batch: profile?.batch,
        section: profile?.section,
        level: profile?.level,
        advisorName: user?.displayName || 'Assigned Advisor',
      },
      semester: 'Spring 2026',
      generatedAt: new Date().toISOString(),
      kpis: {
        attendancePercentage: attendance?.percentage ?? 100,
        totalClasses,
        attendedClasses: attended,
        absentClasses: absent,
        lateClasses: late,
        excusedClasses: excused,
        marksAverage: marks?.percentage ?? null,
        missingAssessmentsCount: currentRisk?.missingAssignmentsCount ?? marks?.missingCount ?? 0,
        enrolledCoursesCount: enrollments.length,
        totalCredits,
      },
      riskStatus: currentRisk
        ? {
            level: currentRisk.riskLevel,
            score: currentRisk.score,
            reasons: currentRisk.reasons || [],
            isSufficientData: currentRisk.isSufficientData,
          }
        : null,
      courses: courseBreakdown,
      assessments: asmtRows,
      attendanceRecords: records.map((att) => ({
        date: att.date,
        courseCode: enrollments.find((e) => e.courseId === att.courseId)?.courseCode,
        status: att.status,
      })),
    };
  }, [studentId, profile, studentUser, attendance, marks, enrollments, currentRisk, user]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-500 animate-pulse">
        Verifying advisor authorization and retrieving academic records...
      </div>
    );
  }

  // Authorization Check Failed
  if (authorized === false) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Student Advising Profile"
          description="Institutional academic advising and risk management"
          breadcrumbs={[{ label: 'Teacher', href: '/teacher/dashboard' }, { label: 'Advisees' }]}
        />
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3 max-w-xl mx-auto">
          <Lock size={36} className="mx-auto text-red-600" />
          <h3 className="text-base font-semibold text-red-900">Access Denied: Advisee Scope Restriction</h3>
          <p className="text-xs text-red-700 leading-relaxed">
            Per institutional security policies, faculty members may only inspect records and manage interventions for students explicitly assigned to them in the <code className="font-mono font-semibold">advisorAssignments</code> collection.
          </p>
          <div className="pt-2">
            <Link to="/teacher/students">
              <Button size="sm" variant="outline">
                <ArrowLeft size={14} className="mr-1" />
                Return to Assigned Advisees Roster
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const studentDisplayName = profile?.studentId || 'Advisee Profile';
  const attendanceRate = attendance?.percentage ?? 100;
  const isLowAttendance = attendanceRate < 75;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${profile?.studentId || 'Advisee'} - Academic & Risk Review`}
        description={`Department of ${profile?.department || 'CSE'} • Batch ${profile?.batch || '2022'} • CGPA: ${profile?.cgpa?.toFixed(2) || 'N/A'}`}
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/dashboard' },
          { label: 'Advisees', href: '/teacher/students' },
          { label: profile?.studentId || studentId },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              className="gap-1.5 text-xs bg-white shadow-2xs border-slate-300 hover:border-slate-400"
            >
              <Download size={14} className="text-blue-600" />
              <span>Export Report</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsInterventionModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <ShieldAlert size={14} className="text-blue-600" />
              <span>Create Intervention</span>
            </Button>
            <Link to="/teacher/students">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <ArrowLeft size={14} />
                <span>Advisees List</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Live Risk Status Banner */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.06)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {renderRiskBadge(currentRisk?.riskLevel, currentRisk?.isSufficientData)}
            <div>
              <span className="text-xs text-slate-500">Live Risk Evaluation: </span>
              <strong className="text-xs text-slate-800">
                {currentRisk?.isSufficientData === false
                  ? 'Insufficient evaluation data (< 2 components)'
                  : currentRisk?.riskLevel
                  ? `${currentRisk.riskLevel} Risk Profile`
                  : 'Not evaluated yet'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              {currentRisk?.computedAt ? `Assessed: ${new Date(currentRisk.computedAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}` : ''}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRiskEvaluation}
              isLoading={evaluatingRisk}
              className="h-7 text-xs gap-1"
            >
              <RefreshCw size={12} className={evaluatingRisk ? 'animate-spin' : ''} />
              <span>Re-evaluate Risk Now</span>
            </Button>
          </div>
        </div>

        {/* Risk Reasons List */}
        {currentRisk?.reasons && currentRisk.reasons.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-700 block mb-1">
              Deterministic Warning Triggers:
            </span>
            <ul className="space-y-1">
              {currentRisk.reasons.map((r, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Low Attendance Alert Banner */}
      {isLowAttendance && (
        <div className="p-4 bg-red-50/90 border border-red-200/90 rounded-xl text-xs text-red-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertOctagon size={16} className="text-red-600 shrink-0" />
            <span>
              Attendance Warning: Current attendance is <strong>{attendanceRate}%</strong>, below the 75% institutional policy threshold.
            </span>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setIsInterventionModalOpen(true)}
            className="h-6 text-[11px] px-2"
          >
            Schedule Intervention
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview & Recommendations
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'records'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Academic Records Entry ({attendance?.records.length || 0} sessions, {marks?.items.length || 0} marks)
        </button>
        <button
          onClick={() => setActiveTab('interventions')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'interventions'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Interventions & Progress ({interventions.length})
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'feedback'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Advisor Feedback Notes
        </button>
      </div>

      {/* TAB 1: OVERVIEW & RECOMMENDATIONS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Overall Attendance"
              value={`${attendanceRate}%`}
              subtext={`${attendance?.attendedClasses || 0} attended of ${attendance?.totalClasses || 0} classes`}
              icon={<Calendar size={20} className={isLowAttendance ? 'text-red-600' : 'text-emerald-600'} />}
            />
            <StatCard
              label="Continuous Marks Average"
              value={marks?.percentage !== null && marks?.percentage !== undefined ? `${marks.percentage}%` : 'Not recorded'}
              subtext={`${marks?.missingCount || 0} missing / unrecorded assessments`}
              icon={<Award size={20} className="text-blue-600" />}
            />
            <StatCard
              label="Registered Course Load"
              value={`${enrollments.length} Courses`}
              subtext={`Current Term: Spring 2026`}
              icon={<BookOpen size={20} className="text-purple-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrolled Courses */}
            <Card className="border border-slate-200">
              <CardHeader
                title="Enrolled Courses"
                subtitle={`Spring 2026 Term (${enrollments.length} registered)`}
              />
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No active enrollments found for this student.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {enrollments.map((enr) => (
                      <div key={enr.enrollmentId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900">{enr.courseCode}</strong>
                          <span className="text-slate-600 ml-1.5">— {enr.courseTitle}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-medium">
                          {enr.credits} Credits
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actionable Recommendations */}
            <Card className="border border-slate-200">
              <CardHeader
                title="Automated Advising Recommendations"
                subtitle="Generated from rule-based risk triggers"
              />
              <CardContent>
                {recommendations.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No active intervention recommendations for this advisee.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className={`p-3 rounded-lg border text-xs space-y-1 ${
                          rec.priority === 'high'
                            ? 'bg-red-50/60 border-red-200 text-red-950'
                            : rec.priority === 'medium'
                            ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                            : 'bg-blue-50/60 border-blue-200 text-blue-950'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{rec.title}</span>
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/80 border">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-700">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historical Risk Evaluations Timeline */}
          <Card className="border border-slate-200">
            <CardHeader
              title="Risk Assessment History (Append-Only Audit Trail)"
              subtitle={`Recorded evaluations (${riskHistory.length} total)`}
            />
            <CardContent>
              {riskHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No previous risk assessment snapshots recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Evaluation Timestamp</th>
                        <th className="py-2.5 px-3">Risk Level</th>
                        <th className="py-2.5 px-3">Attendance %</th>
                        <th className="py-2.5 px-3">Marks Avg</th>
                        <th className="py-2.5 px-3">Evaluation Trigger</th>
                        <th className="py-2.5 px-3">Reasons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {riskHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {item.computedAt ? new Date(item.computedAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) : ''}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {renderRiskBadge(item.riskLevel)}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-800">
                            {item.attendancePercentage}%
                          </td>
                          <td className="py-2.5 px-3 tabular-nums text-slate-800">
                            {item.marksAverage !== undefined && item.marksAverage !== null ? `${item.marksAverage}%` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500 font-mono">
                            {item.trigger}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            {item.reasons && item.reasons.length > 0 ? item.reasons.join('; ') : 'No flags'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ACADEMIC RECORDS & ENTRY (Group B) */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Attendance Section */}
          <Card className="border border-slate-200">
            <CardHeader
              title="Attendance Records & Log Entry"
              subtitle={`Stored attendance records (${attendance?.records.length || 0} sessions)`}
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAttendanceRecord(null);
                    setIsAttendanceModalOpen(true);
                  }}
                  className="gap-1.5 text-xs h-7"
                >
                  <Plus size={13} />
                  <span>Record Attendance</span>
                </Button>
              }
            />
            <CardContent>
              {attendance?.records.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No attendance records logged for this student yet. Click "Record Attendance" above to enter a session.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Date (Asia/Dhaka)</th>
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Weight</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance?.records.map((r: AttendanceRecord) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-mono text-slate-700">{r.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{r.courseId.toUpperCase()}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                                r.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.status === 'excused'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 tabular-nums text-slate-600">
                            {r.status === 'present' || r.status === 'excused'
                              ? '1.0'
                              : r.status === 'late'
                              ? '0.5'
                              : '0.0'}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{r.notes || '—'}</td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAttendanceRecord(r);
                                setIsAttendanceModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] gap-1"
                            >
                              <Edit2 size={10} />
                              <span>Edit</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Continuous Marks Section */}
          <Card className="border border-slate-200">
            <CardHeader
              title="Continuous Marks & Evaluations"
              subtitle="Missing marks are strictly null and never coerced to 0"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAssessment(null);
                      setIsAssessmentModalOpen(true);
                    }}
                    className="gap-1.5 text-xs h-7"
                  >
                    <Plus size={13} />
                    <span>New Assessment</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsDeadlineModalOpen(true);
                    }}
                    className="gap-1.5 text-xs h-7"
                  >
                    <Calendar size={13} className="text-blue-600" />
                    <span>New Deadline</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingMark(null);
                      setIsMarksModalOpen(true);
                    }}
                    className="gap-1.5 text-xs h-7"
                  >
                    <Plus size={13} />
                    <span>Enter Mark</span>
                  </Button>
                </div>
              }
            />
            <CardContent>
              {assessments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No assessments configured for the student's enrolled courses. Click "New Assessment" to create one.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Assessment Title</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Max Pts</th>
                        <th className="py-2.5 px-3">Obtained Marks</th>
                        <th className="py-2.5 px-3">Percentage</th>
                        <th className="py-2.5 px-3">Graded By / Feedback</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assessments.map((asmt) => {
                        const item = marks?.items.find((m: { assessment: Assessment; mark: Mark | null }) => m.assessment.id === asmt.id);
                        const mark = item?.mark;
                        const isRecorded = mark && mark.obtainedMarks !== null && mark.obtainedMarks !== undefined;
                        const pct = isRecorded && asmt.maxMarks > 0
                          ? Math.round(((mark!.obtainedMarks! / asmt.maxMarks) * 100) * 10) / 10
                          : null;

                        return (
                          <tr key={asmt.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{asmt.title}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAssessment(asmt);
                                    setIsAssessmentModalOpen(true);
                                  }}
                                  title="Edit assessment definition"
                                  className="text-slate-400 hover:text-blue-600"
                                >
                                  <Edit2 size={11} />
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {asmt.courseId.toUpperCase()} • Weight: {asmt.weightage}% • Due: {new Date(asmt.dueDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500 font-mono">
                              {asmt.type}
                            </td>
                            <td className="py-2.5 px-3 tabular-nums text-slate-600 font-semibold">{asmt.maxMarks}</td>
                            <td className="py-2.5 px-3 tabular-nums font-semibold">
                              {isRecorded ? (
                                <span className="text-slate-900">{mark!.obtainedMarks}</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                                  Not recorded (null)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 tabular-nums">
                              {pct !== null ? `${pct}%` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              {mark?.feedback || mark?.gradedBy || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMark(mark || null);
                                  setIsMarksModalOpen(true);
                                }}
                                className="h-6 px-2 text-[10px] gap-1"
                              >
                                <Edit2 size={10} />
                                <span>{isRecorded ? 'Edit Mark' : 'Record'}</span>
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
        </div>
      )}

      {/* TAB 3: INTERVENTIONS & PROGRESS TRACKING (Group D & E) */}
      {activeTab === 'interventions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Academic Recovery Plans</h3>
              <p className="text-xs text-slate-500">
                Manage structured action plans and evaluate before/after progress metrics.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsInterventionModalOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus size={14} />
              <span>Initiate Intervention Plan</span>
            </Button>
          </div>

          {interventions.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="py-12 text-center text-xs text-slate-500 space-y-2">
                <ShieldAlert size={28} className="mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700">No Interventions Recorded</p>
                <p>Initiate an academic intervention plan to monitor advisee progress with scheduled follow-ups.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {interventions.map((intItem) => {
                const comp = comparisons[intItem.id];
                const intDate = intItem.createdAt ? intItem.createdAt.slice(0, 10) : intItem.targetDate;

                return (
                  <div key={intItem.id} className="space-y-4">
                    {/* Intervention Master Card */}
                    <Card className="border border-slate-200">
                      <CardHeader
                        title={intItem.reason}
                        subtitle={`Initiated on ${intDate} by ${intItem.teacherName || 'Faculty Advisor'} • Target: ${intItem.targetDate}`}
                        action={
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              {intItem.status.replace('_', ' ')}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveFollowUpIntervention(intItem)}
                              className="h-7 text-xs gap-1"
                            >
                              <CalendarCheck size={13} className="text-blue-600" />
                              <span>Log Follow-up</span>
                            </Button>
                          </div>
                        }
                      />
                      <CardContent className="space-y-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                          <strong className="text-slate-800 block">Structured Action Plan:</strong>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {intItem.actionPlan}
                          </p>
                        </div>

                        {/* Status History Audit Trail */}
                        {intItem.statusHistory && intItem.statusHistory.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              Status Transition Trail:
                            </span>
                            <div className="space-y-1">
                              {intItem.statusHistory.map((sh, idx) => (
                                <div key={idx} className="text-[11px] text-slate-600 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <Clock size={11} className="text-slate-400" />
                                    <strong className="capitalize text-slate-800">{sh.status.replace('_', ' ')}</strong>
                                    <span>— {sh.notes || 'Status updated'}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {sh.changedAt ? new Date(sh.changedAt).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' }) : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Before / After Progress Comparison Card (Group E) */}
                    {comp && (
                      <ProgressComparisonCard
                        comparison={comp}
                        interventionDate={intDate}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ADVISOR FEEDBACK (Group C) */}
      {activeTab === 'feedback' && (
        <FeedbackSection studentId={studentId} studentName={profile?.studentId} />
      )}

      {/* Attendance Modal */}
      {enrollments.length > 0 && (
        <AttendanceEntryModal
          isOpen={isAttendanceModalOpen}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setEditingAttendanceRecord(null);
          }}
          studentId={studentId}
          studentName={profile?.studentId || 'Advisee'}
          enrollments={enrollments}
          existingRecord={editingAttendanceRecord}
          onSaved={() => {
            loadAllStudentData();
          }}
        />
      )}

      {/* Marks Modal */}
      {enrollments.length > 0 && assessments.length > 0 && (
        <MarksEntryModal
          isOpen={isMarksModalOpen}
          onClose={() => {
            setIsMarksModalOpen(false);
            setEditingMark(null);
          }}
          studentId={studentId}
          studentName={profile?.studentId || 'Advisee'}
          enrollmentId={enrollments[0]?.enrollmentId}
          assessments={assessments}
          existingMark={editingMark}
          onSaved={() => {
            loadAllStudentData();
          }}
        />
      )}

      {/* Create Intervention Modal */}
      <CreateInterventionModal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        defaultStudentId={studentId}
        defaultStudentName={profile?.studentId}
        onCreated={() => {
          loadAllStudentData();
        }}
      />

      {/* Add Follow-Up Modal */}
      {activeFollowUpIntervention && (
        <AddFollowUpModal
          isOpen={Boolean(activeFollowUpIntervention)}
          onClose={() => setActiveFollowUpIntervention(null)}
          intervention={activeFollowUpIntervention}
          studentName={profile?.studentId}
          onSaved={() => {
            loadAllStudentData();
          }}
        />
      )}

      {/* Create / Edit Assessment Modal */}
      {isAssessmentModalOpen && (
        <CreateAssessmentModal
          isOpen={isAssessmentModalOpen}
          onClose={() => {
            setIsAssessmentModalOpen(false);
            setEditingAssessment(null);
          }}
          courses={allCourses.length > 0 ? allCourses : enrollments.map((e) => ({
            id: e.courseId,
            code: e.courseCode,
            title: e.courseTitle,
            credits: e.credits,
            department: 'CSE',
            createdAt: '',
            updatedAt: '',
            createdBy: '',
          }))}
          semesters={allSemesters}
          defaultCourseId={enrollments[0]?.courseId}
          existingAssessment={editingAssessment}
          onSaved={() => {
            loadAllStudentData();
          }}
        />
      )}

      {/* Create / Schedule Deadline Modal */}
      {isDeadlineModalOpen && (
        <CreateDeadlineModal
          isOpen={isDeadlineModalOpen}
          onClose={() => setIsDeadlineModalOpen(false)}
          courses={allCourses.length > 0 ? allCourses : enrollments.map((e) => ({
            id: e.courseId,
            code: e.courseCode,
            title: e.courseTitle,
            credits: e.credits,
            department: 'CSE',
            createdAt: '',
            updatedAt: '',
            createdBy: '',
          }))}
          semesters={allSemesters}
          assessments={assessments}
          defaultCourseId={enrollments[0]?.courseId}
          onSaved={() => {
            loadAllStudentData();
          }}
        />
      )}

      {/* Export Academic Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportData={exportReportData}
      />
    </div>
  );
};
