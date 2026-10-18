import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Button } from '../../../shared/ui/Button';
import { Input, Select } from '../../../shared/ui/Input';
import { AssignedAdvisee, Intervention, CourseOffering } from '../../../shared/types';
import { interventionService } from '../../../shared/services/interventionService';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { CreateInterventionModal } from '../components/CreateInterventionModal';
import {
  Users,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

export const TeacherDashboardPage: React.FC = () => {
  const { user, role } = useAuth();

  const [advisees, setAdvisees] = useState<AssignedAdvisee[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const isUserAdmin = role === 'admin' || role === 'university_admin';
      const [adviseeList, intList, allOfferings] = await Promise.all([
        interventionService.getAssignedAdvisees(user.id, isUserAdmin),
        interventionService.listInterventions(isUserAdmin ? undefined : user.id),
        academicRecordService.getCourseOfferings(),
      ]);
      setAdvisees(adviseeList);
      setInterventions(intList);
      const myOfferings = isUserAdmin
        ? allOfferings
        : allOfferings.filter(
            (o) =>
              (o.teacherIds && o.teacherIds.includes(user.id)) ||
              (o.advisorIds && o.advisorIds.includes(user.id))
          );
      setOfferings(myOfferings);
    } catch (err) {
      console.warn('TeacherDashboardPage load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, role]);

  // Metric counts
  const totalAdvisees = advisees.length;
  const highRiskCount = advisees.filter((a) => a.currentRiskLevel === 'High').length;
  const mediumRiskCount = advisees.filter((a) => a.currentRiskLevel === 'Medium').length;
  const activeInterventionsCount = interventions.filter(
    (i) => i.status === 'open' || i.status === 'in_progress' || i.status === 'escalated'
  ).length;

  // Filter advisees for triage table
  const filteredAdvisees = advisees.filter((a) => {
    const matchesSearch =
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'insufficient' && a.currentRiskLevel === 'Insufficient data') ||
      a.currentRiskLevel.toLowerCase() === riskFilter.toLowerCase();

    return matchesSearch && matchesRisk;
  });

  const renderRiskBadge = (level: AssignedAdvisee['currentRiskLevel']) => {
    switch (level) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-300">
            <AlertOctagon size={12} className="text-red-700" />
            <span>High Risk</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={12} className="text-amber-700" />
            <span>Medium Risk</span>
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle size={12} className="text-emerald-700" />
            <span>Low Risk</span>
          </span>
        );
      case 'Insufficient data':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle size={12} className="text-slate-500" />
            <span>Insufficient Data</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisor Overview Dashboard"
        description="Monitor assigned advisees, review automated early warnings, and initiate targeted interventions."
        breadcrumbs={[{ label: 'Teacher', href: '/teacher/dashboard' }, { label: 'Dashboard' }]}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsInterventionModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <ShieldAlert size={14} className="text-blue-600" />
              <span>Initiate Intervention</span>
            </Button>
            <Link to="/teacher/students">
              <Button size="sm" className="gap-1.5 text-xs">
                <span>View Advisees Roster</span>
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        }
      />

      {/* Institutional Faculty Portal Banner */}
      <div className="p-4 bg-gradient-to-r from-[#043321] via-[#06422b] to-[#085537] border border-[#095938] rounded-xl text-xs text-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="font-bold tracking-wider text-[10px] px-2 py-0.5 bg-[#00a651] text-white rounded shadow-xs">
            FACULTY PORTAL
          </span>
          <span className="text-emerald-100/90">
            Faculty Advisor: <strong className="text-white">{user?.displayName || user?.email}</strong> · Advisees scoped by <code className="font-mono text-emerald-200 bg-[#032517] px-1.5 py-0.5 rounded border border-emerald-700/60 text-[11px]">advisorAssignments</code>
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-300 text-[11px] shrink-0 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span>Asia/Dhaka</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assigned Advisees"
          value={String(totalAdvisees)}
          subtext="Explicitly mapped via advisorAssignments"
          icon={<Users size={18} className="text-blue-600" />}
        />
        <StatCard
          label="High Risk Advisees"
          value={String(highRiskCount)}
          subtext="Requires urgent advising intervention"
          icon={<AlertOctagon size={18} className="text-red-600" />}
        />
        <StatCard
          label="Medium Risk Advisees"
          value={String(mediumRiskCount)}
          subtext="Attendance / marks early warnings"
          icon={<AlertTriangle size={18} className="text-amber-600" />}
        />
        <StatCard
          label="Active Interventions"
          value={String(activeInterventionsCount)}
          subtext="Scheduled follow-ups in progress"
          icon={<ShieldAlert size={18} className="text-blue-600" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Advisee Risk Triage Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Advisee Risk Triage Roster"
              subtitle="Early warning monitoring scoped to your assigned advisees"
              action={
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredAdvisees.length} of {totalAdvisees} students
                </span>
              }
            />
            <CardContent className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by student name or roll ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs"
                  />
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>

                <div className="w-full sm:w-48">
                  <Select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="text-xs"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="high">High Risk Only</option>
                    <option value="medium">Medium Risk Only</option>
                    <option value="low">Low Risk Only</option>
                    <option value="insufficient">Insufficient Data</option>
                  </Select>
                </div>
              </div>

              {/* Triage Table */}
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                  Loading assigned advisees and calculating live risk profiles...
                </div>
              ) : filteredAdvisees.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  {totalAdvisees === 0
                    ? 'No advisees are currently assigned to your faculty account under advisorAssignments.'
                    : 'No advisees match the selected filter criteria.'}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Student Name & ID</th>
                        <th className="py-2.5 px-3">Risk Level</th>
                        <th className="py-2.5 px-3">Attendance</th>
                        <th className="py-2.5 px-3">Marks Avg</th>
                        <th className="py-2.5 px-3">Primary Warning / Trigger</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdvisees.map((adv) => (
                        <tr key={adv.studentId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{adv.displayName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {adv.rollNumber} • {adv.department}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {renderRiskBadge(adv.currentRiskLevel)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`font-semibold tabular-nums ${
                                adv.attendancePercentage < 75 ? 'text-red-600' : 'text-slate-800'
                              }`}
                            >
                              {adv.attendancePercentage}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({adv.attendedClasses}/{adv.totalClasses})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold tabular-nums text-slate-800">
                              {adv.marksAverage !== null ? `${adv.marksAverage}%` : 'Not recorded'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {adv.reasons && adv.reasons.length > 0 ? (
                              <div className="text-[11px] text-slate-600 line-clamp-2">
                                {adv.reasons[0]}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                No active risk triggers
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Link to={`/teacher/students/${adv.studentId}`}>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1">
                                <span>Inspect</span>
                                <ArrowRight size={12} />
                              </Button>
                            </Link>
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

        {/* Right Column: Interventions & Reminders (1 col) */}
        <div className="space-y-4">
          {/* Assigned Course Offerings & Sections */}
          <Card>
            <CardHeader
              title="Assigned Course Offerings"
              subtitle={`Classes assigned to teach (${offerings.length} total)`}
            />
            <CardContent>
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-500 animate-pulse">
                  Loading assigned course offerings...
                </div>
              ) : offerings.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No course offerings currently mapped to your faculty UID.
                </div>
              ) : (
                <div className="space-y-2">
                  {offerings.map((off) => (
                    <div
                      key={off.id}
                      className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {off.courseCode || off.courseId} — Section {off.section}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {off.courseTitle || 'Undergraduate Course'} • Term: {off.semesterId}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                        {off.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Active Interventions"
              subtitle={`Ongoing recovery plans (${interventions.length} total)`}
              action={
                <Link to="/teacher/interventions" className="text-xs text-blue-600 hover:underline">
                  View all
                </Link>
              }
            />
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading interventions...
                </div>
              ) : interventions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active interventions initiated yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {interventions.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 line-clamp-1">
                          {item.reason}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 uppercase">
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2">{item.actionPlan}</p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-200">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          <span>Target: {item.targetDate}</span>
                        </span>
                        <Link
                          to={`/teacher/students/${item.studentId}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Review Advisee →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Institutional Advisory Guidelines */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Sparkles size={14} className="text-blue-600" />
              <span>Advising Protocol Reminders</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed">
              <li>Attendance below 75% triggers an automated institutional risk alert.</li>
              <li>Students with Insufficient Data require at least 2 components before scoring.</li>
              <li>Missing evaluations must remain null and not be treated as zeros.</li>
              <li>Interventions are append-only to preserve academic auditability.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Intervention Modal */}
      <CreateInterventionModal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        assignedAdvisees={advisees}
        onCreated={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
};
