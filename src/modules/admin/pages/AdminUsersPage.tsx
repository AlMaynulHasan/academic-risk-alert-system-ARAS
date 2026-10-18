import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input, Select } from '../../../shared/ui/Input';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import {
  User,
  UserRole,
  Course,
  Semester,
  AdvisorAssignment,
  Department,
  CourseOffering,
  StudentInvitation,
} from '../../../shared/types';
import {
  academicRecordService,
  EnrollmentSummary,
} from '../../../shared/services/academicRecordService';
import { db, handleFirestoreError, OperationType } from '../../../shared/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { CreateCourseModal } from '../components/CreateCourseModal';
import { CreateSemesterModal } from '../components/CreateSemesterModal';
import { EnrollStudentModal } from '../components/EnrollStudentModal';
import { AssignAdvisorModal } from '../components/AssignAdvisorModal';
import { CreateInvitationModal } from '../components/CreateInvitationModal';
import { CreateCourseOfferingModal } from '../components/CreateCourseOfferingModal';
import { CreateDepartmentModal } from '../components/CreateDepartmentModal';
import { CreateTeacherModal } from '../components/CreateTeacherModal';
import { AssignCourseTeacherModal } from '../components/AssignCourseTeacherModal';
import { seedSyntheticDatabase } from '../../../shared/firebase/seed';
import {
  Users,
  BookOpen,
  Calendar,
  GraduationCap,
  Shield,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Edit2,
  RefreshCw,
  Database,
  ExternalLink,
  KeyRound,
  Layers,
  Building2,
  Copy,
  Check,
  Clock,
  XCircle,
  UserPlus,
  UserCheck,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    | 'users'
    | 'invitations'
    | 'offerings'
    | 'departments'
    | 'courses'
    | 'semesters'
    | 'enrollments'
    | 'advisors'
    | 'operations'
  >('users');

  // Loading states
  const [loading, setLoading] = useState(true);

  // Entities
  const [usersList, setUsersList] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([]);
  const [invitations, setInvitations] = useState<StudentInvitation[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals for new modules
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isOfferingModalOpen, setIsOfferingModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);
  const [selectedOfferingForTeacher, setSelectedOfferingForTeacher] = useState<CourseOffering | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Filters & search
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pending' | 'claimed' | 'revoked'>('all');

  // Modals
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);

  // User role modification
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Seeding
  const [isSeeding, setIsSeeding] = useState(false);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      const uList: User[] = [];
      usersSnap.forEach((d) => {
        uList.push({ id: d.id, ...(d.data() as Omit<User, 'id'>) });
      });
      setUsersList(uList);

      // Fetch courses (include inactive)
      const crsList = await academicRecordService.getCourses(true);
      setCourses(crsList);

      // Fetch semesters
      const semList = await academicRecordService.getSemesters();
      setSemesters(semList);
      if (semList.length > 0 && !selectedSemesterFilter) {
        const cur = semList.find((s) => s.isCurrent) || semList[0];
        setSelectedSemesterFilter(cur.id);
      }

      // Fetch all enrollments
      const enrList = await academicRecordService.getAllEnrollments();
      setEnrollments(enrList);

      // Fetch advisor assignments
      const advSnap = await getDocs(collection(db, 'advisorAssignments'));
      const aList: AdvisorAssignment[] = [];
      advSnap.forEach((d) => {
        aList.push({ id: d.id, ...(d.data() as Omit<AdvisorAssignment, 'id'>) });
      });
      setAssignments(aList);

      // Fetch student invitations
      const invList = await academicRecordService.getStudentInvitations();
      setInvitations(invList);

      // Fetch course offerings
      const offList = await academicRecordService.getCourseOfferings();
      setOfferings(offList);

      // Fetch departments
      const depList = await academicRecordService.getDepartments();
      setDepartments(depList);
    } catch (err) {
      console.warn('AdminUsersPage.loadAllAdminData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (inv: StudentInvitation) => {
    const link = `${window.location.origin}/activate?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedTokenId(inv.id);
    showToast(`Activation link copied for ${inv.officialStudentId}!`, 'info');
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const handleCopyCode = (inv: StudentInvitation) => {
    navigator.clipboard.writeText(inv.token);
    setCopiedCodeId(inv.id);
    showToast(`Activation code "${inv.token}" copied for ${inv.officialStudentId}!`, 'info');
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation token? The student will no longer be able to activate with it.')) {
      return;
    }
    try {
      await academicRecordService.revokeInvitation(invitationId, {
        uid: user?.id || 'admin',
        role: user?.role || 'admin',
      });
      showToast('Invitation token revoked.', 'success');
      loadAllAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invitation.';
      showToast(msg, 'error');
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Role modification handler
  const handleUpdateUserRole = async (userId: string, targetRole: UserRole) => {
    setIsUpdatingRole(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: targetRole,
        updatedAt: new Date().toISOString(),
      });
      showToast(`User role updated to ${targetRole}.`, 'success');
      setSelectedUserToEdit(null);
      loadAllAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role.';
      showToast(msg, 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Toggle course active
  const handleToggleCourseActive = async (course: Course) => {
    const nextState = course.isActive === false ? true : false;
    try {
      await academicRecordService.setCourseActive(
        course.id,
        nextState,
        user ? { uid: user.id, role: 'admin' } : undefined
      );
      showToast(`Course ${course.code} marked ${nextState ? 'Active' : 'Inactive'}.`, 'success');
      loadAllAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update course status.';
      showToast(msg, 'error');
    }
  };

  // Set semester as current
  const handleSetCurrentSemester = async (semesterId: string) => {
    try {
      await academicRecordService.setCurrentSemester(
        semesterId,
        user ? { uid: user.id, role: 'admin' } : undefined
      );
      showToast('Academic term updated as Current Semester.', 'success');
      loadAllAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update active term.';
      showToast(msg, 'error');
    }
  };

  // Update enrollment status
  const handleUpdateEnrollmentStatus = async (
    enrollmentId: string,
    status: 'enrolled' | 'dropped' | 'completed'
  ) => {
    try {
      await academicRecordService.updateEnrollmentStatus(
        enrollmentId,
        status,
        user ? { uid: user.id, role: 'admin' } : undefined
      );
      showToast(`Enrollment marked as ${status}.`, 'success');
      loadAllAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update enrollment.';
      showToast(msg, 'error');
    }
  };

  // Deactivate advisor assignment
  const handleToggleAdvisorAssignment = async (assignment: AdvisorAssignment) => {
    const nextStatus = assignment.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'advisorAssignments', assignment.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Advisor assignment marked as ${nextStatus}.`, 'success');
      loadAllAdminData();
    } catch (err: unknown) {
      showToast('Failed to update advisor assignment status.', 'error');
    }
  };

  // Web-based Seeding
  const handleRunSeeder = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSyntheticDatabase();
      showToast(res.message, 'success');
      loadAllAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Seeding encountered error: ${msg}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtered lists
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const studentsList = usersList.filter((u) => u.role === 'student');
  const teachersList = usersList.filter(
    (u) =>
      u.role === 'teacher' ||
      u.role === 'admin' ||
      u.role === 'university_admin' ||
      u.role === 'dept_admin' ||
      u.role === 'advisor'
  );

  const isDeptAdmin = user?.role === 'dept_admin';
  const assignedDept = user?.assignedDepartment || user?.departmentId || '';

  const scopedCourses = courses.filter((c) => {
    if (isDeptAdmin && assignedDept) {
      return (c.department || '').toLowerCase() === assignedDept.toLowerCase();
    }
    return true;
  });

  const scopedInvitations = invitations.filter((inv) => {
    if (isDeptAdmin && assignedDept) {
      return (inv.department || '').toLowerCase() === assignedDept.toLowerCase();
    }
    return true;
  });

  const scopedOfferings = offerings.filter((off) => {
    if (isDeptAdmin && assignedDept) {
      return (
        (off.courseCode || '').toLowerCase().startsWith(assignedDept.toLowerCase()) ||
        scopedCourses.some((c) => c.id === off.courseId)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDeptAdmin && assignedDept ? `Department Administration (${assignedDept})` : "Institutional Academic Administration"}
        description={
          isDeptAdmin && assignedDept
            ? `Scoped administrative workspace for the ${assignedDept} department: student pre-registration, course offerings, and faculty allocation.`
            : "Comprehensive console for managing user roles, academic terms, courses, student enrollments, and faculty advisor allocations."
        }
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: isDeptAdmin ? `Dept Admin (${assignedDept})` : 'Console' }]}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadAllAdminData}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Workspace</span>
            </Button>
          </div>
        }
      />

      {isDeptAdmin && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2">
          <Building2 size={16} className="text-purple-700 shrink-0" />
          <span>
            <strong>Department Scope:</strong> You are managing records strictly for the{' '}
            <strong className="underline font-mono">{assignedDept || 'Assigned'}</strong> department.
          </span>
        </div>
      )}

      {/* Quick Institutional Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Active Term</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {semesters.find((s) => s.isCurrent)?.name || 'Spring 2026'}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">In Session</div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Departments</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {departments.length} Units
          </div>
          <div className="text-[11px] text-slate-500">{courses.length} Approved Courses</div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Course Offerings</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {offerings.length} Sections
          </div>
          <div className="text-[11px] text-blue-600 font-medium">{enrollments.length} Active Enrollments</div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Student Admissions</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {invitations.length} Enrolled
          </div>
          <div className="text-[11px] text-[#008744] font-medium">Activation Management</div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium shadow-2xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Users size={14} className={activeTab === 'users' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Users & Roles ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invitations')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'invitations'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <UserPlus size={14} className={activeTab === 'invitations' ? 'text-[#008744]' : 'text-slate-400'} />
          <span>Student Registration ({invitations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('offerings')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'offerings'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers size={14} className={activeTab === 'offerings' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Course Offerings ({offerings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'departments'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Building2 size={14} className={activeTab === 'departments' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'courses'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BookOpen size={14} className={activeTab === 'courses' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Course Catalog ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('semesters')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'semesters'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calendar size={14} className={activeTab === 'semesters' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Semesters ({semesters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('enrollments')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'enrollments'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <GraduationCap size={14} className={activeTab === 'enrollments' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Enrollments ({enrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('advisors')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'advisors'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Shield size={14} className={activeTab === 'advisors' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Advisors ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('operations')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'operations'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Database size={14} className={activeTab === 'operations' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Session Operations</span>
        </button>
      </div>

      {/* TAB 1: USERS & ROLES */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader
            title="User Account Directory & Role-Based Access Control"
            subtitle="Manage university faculty, advisors, administrators, and students. Admins can create new teachers and assign roles."
            action={
              <Button
                size="sm"
                onClick={() => setIsTeacherModalOpen(true)}
                className="gap-1.5 text-xs h-8 bg-[#00a651] hover:bg-[#009247] text-white font-semibold"
              >
                <UserPlus size={14} />
                <span>Add Faculty / Teacher</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  placeholder="Search users by name, email, or department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 text-xs"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">Filter Role:</span>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs"
                >
                  <option value="all">All Roles ({usersList.length})</option>
                  <option value="teacher">Teachers & Faculty ({usersList.filter((u) => u.role === 'teacher' || u.role === 'advisor').length})</option>
                  <option value="student">Students ({usersList.filter((u) => u.role === 'student').length})</option>
                  <option value="admin">Administrators ({usersList.filter((u) => u.role === 'admin' || u.role === 'dept_admin').length})</option>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                Loading user directory...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No users found matching the search or role filter.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Name & Academic Profile</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Registered At</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{u.displayName || 'Unnamed User'}</span>
                            {u.id === user?.id && (
                              <span className="text-[10px] text-[#008744] font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">(You)</span>
                            )}
                          </div>
                          {u.designation && (
                            <div className="text-[11px] text-[#008744] font-medium">
                              {u.designation} {u.employeeId ? `· Code: ${u.employeeId}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {u.departmentId || u.assignedDepartment ? (
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-2xs font-semibold text-slate-700">
                              {u.departmentId || u.assignedDepartment}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-2xs italic">General</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              u.role === 'admin' || u.role === 'dept_admin' || u.role === 'university_admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : u.role === 'teacher' || u.role === 'advisor'
                                ? 'bg-emerald-100 text-[#006834] border border-emerald-300 font-bold'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(u.role === 'teacher' || u.role === 'advisor') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveTab('advisors');
                                  setIsAdvisorModalOpen(true);
                                }}
                                className="h-6 px-2 text-[10px] gap-1 text-[#008744] hover:bg-emerald-50 border-emerald-200"
                                title="Assign advisee students to this faculty member"
                              >
                                <Users size={10} />
                                <span>Assign Advisees</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUserToEdit(u);
                                setNewRole(u.role);
                              }}
                              className="h-6 px-2 text-[10px] gap-1"
                            >
                              <Edit2 size={10} />
                              <span>Modify Role</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: STUDENT REGISTRATION & INVITATIONS */}
      {activeTab === 'invitations' && (
        <Card>
          <CardHeader
            title="Official Student Registration & Activation Management"
            subtitle="Central institutional student registration with secure one-time activation codes for student password onboarding."
            action={
              <Button
                size="sm"
                onClick={() => setIsInvitationModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <UserPlus size={13} />
                <span>Register New Student</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search registered students by Name, Student ID, Email, Department..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              <div className="w-full sm:w-56">
                <Select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                  className="text-xs h-9"
                >
                  <option value="all">All Registration Statuses</option>
                  <option value="pending">Pending Password Setup</option>
                  <option value="claimed">Active / Activated</option>
                  <option value="revoked">Revoked Tokens</option>
                </Select>
              </div>
            </div>

            {(() => {
              const filteredList = scopedInvitations.filter((inv) => {
                const q = studentSearch.toLowerCase().trim();
                const matchesSearch =
                  !q ||
                  inv.officialStudentId.toLowerCase().includes(q) ||
                  (inv.displayName || '').toLowerCase().includes(q) ||
                  inv.email.toLowerCase().includes(q) ||
                  inv.department.toLowerCase().includes(q);

                const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
                const displayStatus = inv.status === 'pending' && isExpired ? 'expired' : inv.status;
                const matchesStatus =
                  studentStatusFilter === 'all'
                    ? true
                    : studentStatusFilter === 'pending'
                    ? displayStatus === 'pending'
                    : displayStatus === studentStatusFilter;

                return matchesSearch && matchesStatus;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    {studentSearch || studentStatusFilter !== 'all'
                      ? 'No registered students match your filter criteria.'
                      : 'No student registrations recorded yet. Click "Register New Student" above to enroll a student and issue their activation code.'}
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Student Name & ID</th>
                        <th className="py-2.5 px-3">Official Email</th>
                        <th className="py-2.5 px-3">Department & Level</th>
                        <th className="py-2.5 px-3">Batch & Sec</th>
                        <th className="py-2.5 px-3">Assigned Advisor</th>
                        <th className="py-2.5 px-3">Activation Code</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredList.map((inv) => {
                        const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
                        const displayStatus = inv.status === 'pending' && isExpired ? 'expired' : inv.status;
                        const advisor = teachersList.find((t) => t.id === inv.advisorId);

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">
                                {inv.displayName || inv.officialStudentId}
                              </div>
                              <div className="text-[11px] font-mono text-[#006834] font-medium">
                                {inv.officialStudentId}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{inv.email}</td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <div className="font-medium text-slate-800">{inv.department}</div>
                              <div className="text-[10px] text-slate-400">{inv.level || 'Level 1, Term 1'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Batch {inv.batch} (Sec {inv.section || 'A'})
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {advisor ? (
                                <span className="text-[11px] text-emerald-800 font-medium">
                                  {advisor.displayName}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-2xs italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-2xs font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-800">
                                  {inv.token}
                                </span>
                                {inv.status === 'pending' && !isExpired && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(inv)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-700 transition-colors"
                                    title="Copy activation code only"
                                  >
                                    {copiedCodeId === inv.id ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold ${
                                  displayStatus === 'claimed'
                                    ? 'bg-emerald-100 text-[#006834]'
                                    : displayStatus === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : displayStatus === 'revoked'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {displayStatus === 'claimed' && <CheckCircle size={10} />}
                                {displayStatus === 'pending' && <Clock size={10} />}
                                {displayStatus === 'revoked' && <XCircle size={10} />}
                                {displayStatus === 'claimed' ? 'ACTIVATED' : displayStatus.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {inv.status === 'pending' && !isExpired && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(inv)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-2xs border border-emerald-200 bg-emerald-50/60 rounded hover:bg-emerald-100 text-[#006834] font-medium transition-colors cursor-pointer"
                                    title="Copy full activation link for student"
                                  >
                                    {copiedTokenId === inv.id ? (
                                      <Check size={11} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                    <span>{copiedTokenId === inv.id ? 'Copied' : 'Link'}</span>
                                  </button>
                                )}
                                {inv.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvitation(inv.id)}
                                    className="px-2 py-1 text-2xs border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  >
                                    Revoke
                                  </button>
                                )}
                                {inv.status === 'claimed' && (
                                  <span className="text-[10px] text-emerald-700 font-medium">
                                    Enrolled & Active
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* TAB: COURSE OFFERINGS */}
      {activeTab === 'offerings' && (
        <Card>
          <CardHeader
            title="Term-Specific Course Offerings & Faculty Scoping"
            subtitle="Map catalog courses to academic terms, sections, and assigned course teachers."
            action={
              <Button
                size="sm"
                onClick={() => setIsOfferingModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Plus size={13} />
                <span>Create Offering</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {scopedOfferings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                {isDeptAdmin && assignedDept
                  ? `No course offerings for department ${assignedDept} yet. Click "Create Offering" to assign courses and sections to faculty.`
                  : 'No course offerings created yet. Click "Create Offering" to assign courses and sections to faculty.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2.5 px-3">Offering Code / Title</th>
                      <th className="py-2.5 px-3">Academic Term</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Assigned Faculty</th>
                      <th className="py-2.5 px-3">Capacity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedOfferings.map((off) => {
                      const sem = semesters.find((s) => s.id === off.semesterId);
                      const crs = courses.find((c) => c.id === off.courseId);
                      const assignedTeachers = usersList.filter((u) => off.teacherIds?.includes(u.id));
                      return (
                        <tr key={off.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">
                              {off.courseCode || crs?.code || off.courseId}
                            </span>
                            <span className="text-2xs text-slate-500 block truncate max-w-xs">
                              {off.courseTitle || crs?.title || 'Academic Course'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {sem ? sem.name : off.semesterId}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-2xs font-semibold text-slate-800">
                              Section {off.section}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {assignedTeachers.length > 0 ? (
                              <div className="space-y-0.5">
                                {assignedTeachers.map((t) => (
                                  <div key={t.id} className="text-2xs font-semibold text-slate-900 flex items-center gap-1">
                                    <UserCheck size={11} className="text-[#00a651]" />
                                    <span>{t.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOfferingForTeacher(off);
                                  setIsAssignTeacherModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-2xs font-semibold hover:bg-amber-100 cursor-pointer"
                              >
                                <UserPlus size={10} />
                                <span>Assign Teacher</span>
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{off.capacity || 50} seats</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold ${
                                off.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {(off.status || 'active').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOfferingForTeacher(off);
                                setIsAssignTeacherModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] gap-1 text-[#008744] hover:bg-emerald-50 border-emerald-200"
                              title="Assign or change course teacher"
                            >
                              <UserCheck size={11} />
                              <span>{assignedTeachers.length > 0 ? 'Change Faculty' : 'Assign Faculty'}</span>
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
      )}

      {/* TAB: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <Card>
          <CardHeader
            title="University Academic Departments"
            subtitle="Manage organizational departments and institutional structures."
            action={
              <Button
                size="sm"
                onClick={() => setIsDepartmentModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Plus size={13} />
                <span>Add Department</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Department Code</th>
                    <th className="py-2.5 px-3">Full Academic Name</th>
                    <th className="py-2.5 px-3">Associated Courses</th>
                    <th className="py-2.5 px-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => {
                    const deptCourses = courses.filter((c) => c.department === dept.code);
                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                          {dept.code}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{dept.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {deptCourses.length} catalog course(s)
                        </td>
                        <td className="py-2.5 px-3 text-2xs text-slate-500">
                          {new Date(dept.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: COURSE CATALOG */}
      {activeTab === 'courses' && (
        <Card>
          <CardHeader
            title="Institutional Course Catalog"
            subtitle="Manage course offerings, credit weights, and offering lifecycles (Active / Inactive)."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditingCourse(null);
                  setIsCourseModalOpen(true);
                }}
                className="gap-1.5 text-xs h-8"
              >
                <Plus size={14} />
                <span>Add New Course</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {scopedCourses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                {isDeptAdmin && assignedDept
                  ? `No courses for department ${assignedDept} yet. Click "Add New Course" above.`
                  : 'No courses configured in catalog yet. Click "Add New Course" above.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Course Code</th>
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Credits</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">{c.code}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{c.title}</td>
                        <td className="py-2.5 px-3 text-slate-600">{c.department}</td>
                        <td className="py-2.5 px-3 tabular-nums font-semibold">{c.credits}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.isActive !== false
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {c.isActive !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCourse(c);
                                setIsCourseModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px]"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={c.isActive !== false ? 'outline' : 'primary'}
                              onClick={() => handleToggleCourseActive(c)}
                              className="h-6 px-2 text-[10px]"
                            >
                              {c.isActive !== false ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: ACADEMIC SEMESTERS */}
      {activeTab === 'semesters' && (
        <Card>
          <CardHeader
            title="Academic Semesters & Term Boundaries"
            subtitle="Define academic terms. The system guarantees only one semester is designated as current at any time."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditingSemester(null);
                  setIsSemesterModalOpen(true);
                }}
                className="gap-1.5 text-xs h-8"
              >
                <Plus size={14} />
                <span>Add Semester</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {semesters.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No academic semesters defined. Click "Add Semester" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Semester Name</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">End Date</th>
                      <th className="py-2.5 px-3">Current Term Flag</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {semesters.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{s.startDate}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{s.endDate}</td>
                        <td className="py-2.5 px-3">
                          {s.isCurrent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <CheckCircle size={10} />
                              Current Active Term
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Past / Upcoming</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSemester(s);
                                setIsSemesterModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px]"
                            >
                              Edit
                            </Button>
                            {!s.isCurrent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetCurrentSemester(s.id)}
                                className="h-6 px-2 text-[10px] text-blue-700 hover:bg-blue-50"
                              >
                                Set as Current
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: STUDENT ENROLLMENTS */}
      {activeTab === 'enrollments' && (
        <Card>
          <CardHeader
            title="Course Enrollments Registry"
            subtitle="Student course registrations. Duplicate active enrollments per student, course, and semester are strictly rejected."
            action={
              <Button
                size="sm"
                onClick={() => setIsEnrollModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Plus size={14} />
                <span>Enroll Student</span>
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {enrollments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active course enrollments recorded. Click "Enroll Student" above.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Student Name & ID</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Semester</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrollments.map((enr) => {
                      const st = usersList.find((u) => u.id === enr.studentId);
                      return (
                        <tr key={enr.enrollmentId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {st?.displayName || enr.studentId}
                            <div className="text-[10px] text-slate-400 font-mono">{st?.email}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 mr-1.5 font-mono">{enr.courseCode}</span>
                            <span className="text-slate-600">{enr.courseTitle}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{enr.semesterId}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                enr.status === 'enrolled'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : enr.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {enr.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {enr.status === 'enrolled' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateEnrollmentStatus(enr.enrollmentId, 'completed')}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleUpdateEnrollmentStatus(enr.enrollmentId, 'dropped')}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    Drop
                                  </Button>
                                </>
                              )}
                              {enr.status === 'dropped' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateEnrollmentStatus(enr.enrollmentId, 'enrolled')}
                                  className="h-6 px-2 text-[10px]"
                                >
                                  Re-enroll
                                </Button>
                              )}
                            </div>
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
      )}

      {/* TAB 5: ADVISOR ALLOCATIONS */}
      {activeTab === 'advisors' && (
        <Card>
          <CardHeader
            title="Faculty Advisor Allocations & Advisee Scope"
            subtitle="Link students to appointed faculty advisors. Advisors receive academic risk alerts and manage advising interventions."
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTeacherModalOpen(true)}
                  className="gap-1.5 text-xs h-8 text-[#008744] hover:bg-emerald-50 border-emerald-200"
                >
                  <UserPlus size={13} />
                  <span>New Faculty</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAdvisorModalOpen(true)}
                  className="gap-1.5 text-xs h-8 bg-[#00a651] hover:bg-[#009247] text-white"
                >
                  <Plus size={14} />
                  <span>Assign Advisees</span>
                </Button>
              </div>
            }
          />
          <CardContent className="space-y-4">
            {assignments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No advisor assignments found. Click "Assign Advisor" to link faculty to advisees.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Faculty Advisor</th>
                      <th className="py-2.5 px-3">Advisee Student</th>
                      <th className="py-2.5 px-3">Assigned Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => {
                      const teacher = usersList.find((u) => u.id === a.teacherId);
                      const student = usersList.find((u) => u.id === a.studentId);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {teacher?.displayName || a.teacherId}
                            <div className="text-[10px] text-slate-400 font-mono">{teacher?.email}</div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {student?.displayName || a.studentId}
                            <div className="text-[10px] text-slate-400 font-mono">{student?.email}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{a.assignedDate}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                a.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant={a.status === 'active' ? 'danger' : 'outline'}
                              onClick={() => handleToggleAdvisorAssignment(a)}
                              className="h-6 px-2 text-[10px]"
                            >
                              {a.status === 'active' ? 'Deactivate' : 'Reactivate'}
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
      )}

      {/* TAB: ACADEMIC SESSION OPERATIONS */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Academic Session Governance & Institutional Data Health"
              subtitle="Overview of academic record integrity, session lifecycle, and catalog synchronization"
            />
            <CardContent className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Current Term
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {semesters.find((s) => s.isCurrent)?.name || 'Spring 2026'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>Active Academic Session</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Curriculum Scope
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {courses.length} Approved Courses
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Across {departments.length} Academic Departments
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Active Offerings
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {offerings.length} Scheduled Sections
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {enrollments.length} Active Course Registrations
                  </div>
                </div>
              </div>

              {/* Institutional Synchronization & Reset Card */}
              <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-blue-950 flex items-center gap-1.5 text-sm">
                    <Database size={16} className="text-blue-700" />
                    <span>Institutional Catalog & Sample Data Synchronization</span>
                  </h4>
                  <p className="text-xs text-blue-800/80 mt-1 leading-relaxed max-w-xl">
                    Populate or refresh the official university catalog, academic departments (CSE, EEE, CE, ME), active term schedules, sample student records, and faculty mentor allocations.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRunSeeder}
                  isLoading={isSeeding}
                  className="shrink-0 text-xs"
                >
                  <RefreshCw size={13} className={isSeeding ? 'animate-spin' : ''} />
                  <span>Synchronize Catalog Records</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Modification Modal */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Modify User Role</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Updating role for <strong>{selectedUserToEdit.displayName}</strong> ({selectedUserToEdit.email}).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Assign Institutional Role:</label>
              <Select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                <option value="student">Student (Advisee)</option>
                <option value="teacher">Teacher (Faculty Advisor)</option>
                <option value="admin">System Administrator</option>
              </Select>
              <p className="text-[10px] text-slate-400">
                Granting Administrator role provides full access to user management, course catalog, and semesters.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedUserToEdit(null)}
                disabled={isUpdatingRole}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleUpdateUserRole(selectedUserToEdit.id, newRole)}
                isLoading={isUpdatingRole}
              >
                Save Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {isCourseModalOpen && (
        <CreateCourseModal
          isOpen={isCourseModalOpen}
          onClose={() => {
            setIsCourseModalOpen(false);
            setEditingCourse(null);
          }}
          existingCourse={editingCourse}
          onSaved={loadAllAdminData}
        />
      )}

      {/* Create / Edit Semester Modal */}
      {isSemesterModalOpen && (
        <CreateSemesterModal
          isOpen={isSemesterModalOpen}
          onClose={() => {
            setIsSemesterModalOpen(false);
            setEditingSemester(null);
          }}
          existingSemester={editingSemester}
          onSaved={loadAllAdminData}
        />
      )}

      {/* Enroll Student Modal */}
      {isEnrollModalOpen && (
        <EnrollStudentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          students={studentsList}
          courses={courses.filter((c) => c.isActive !== false)}
          semesters={semesters}
          onSaved={loadAllAdminData}
        />
      )}

      {/* Assign Advisor Modal */}
      {isAdvisorModalOpen && (
        <AssignAdvisorModal
          isOpen={isAdvisorModalOpen}
          onClose={() => setIsAdvisorModalOpen(false)}
          teachers={teachersList}
          students={studentsList}
          onSaved={loadAllAdminData}
        />
      )}

      {/* Pre-Register Student / Create Invitation Modal */}
      {isInvitationModalOpen && (
        <CreateInvitationModal
          isOpen={isInvitationModalOpen}
          onClose={() => setIsInvitationModalOpen(false)}
          departments={departments}
          advisors={teachersList}
          onCreated={() => loadAllAdminData()}
        />
      )}

      {/* Create Course Offering Modal */}
      {isOfferingModalOpen && (
        <CreateCourseOfferingModal
          isOpen={isOfferingModalOpen}
          onClose={() => setIsOfferingModalOpen(false)}
          courses={courses.filter((c) => c.isActive !== false)}
          semesters={semesters}
          teachers={teachersList}
          onCreated={() => loadAllAdminData()}
        />
      )}

      {/* Add Department Modal */}
      {isDepartmentModalOpen && (
        <CreateDepartmentModal
          isOpen={isDepartmentModalOpen}
          onClose={() => setIsDepartmentModalOpen(false)}
          onCreated={() => loadAllAdminData()}
        />
      )}

      {/* Add Teacher / Faculty Member Modal */}
      {isTeacherModalOpen && (
        <CreateTeacherModal
          isOpen={isTeacherModalOpen}
          onClose={() => setIsTeacherModalOpen(false)}
          departments={departments}
          onCreated={() => loadAllAdminData()}
        />
      )}

      {/* Assign Course Teacher Modal */}
      {isAssignTeacherModalOpen && selectedOfferingForTeacher && (
        <AssignCourseTeacherModal
          isOpen={isAssignTeacherModalOpen}
          onClose={() => {
            setIsAssignTeacherModalOpen(false);
            setSelectedOfferingForTeacher(null);
          }}
          offering={selectedOfferingForTeacher}
          teachers={teachersList}
          onSaved={() => loadAllAdminData()}
        />
      )}
    </div>
  );
};
