import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input, Select } from '../../../shared/ui/Input';
import { Intervention, AssignedAdvisee, StudentProgressComparison } from '../../../shared/types';
import { interventionService } from '../../../shared/services/interventionService';
import { CreateInterventionModal } from '../components/CreateInterventionModal';
import { AddFollowUpModal } from '../components/AddFollowUpModal';
import { ProgressComparisonCard } from '../components/ProgressComparisonCard';
import {
  ShieldAlert,
  Search,
  Filter,
  Plus,
  CalendarCheck,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  HelpCircle,
} from 'lucide-react';

export const TeacherInterventionsPage: React.FC = () => {
  const { user, role } = useAuth();

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [advisees, setAdvisees] = useState<AssignedAdvisee[]>([]);
  const [comparisons, setComparisons] = useState<Record<string, StudentProgressComparison>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFollowUpIntervention, setActiveFollowUpIntervention] = useState<Intervention | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const isUserAdmin = role === 'admin';
      const [intList, advList] = await Promise.all([
        interventionService.listInterventions(isUserAdmin ? undefined : user.id),
        interventionService.getAssignedAdvisees(user.id, isUserAdmin),
      ]);

      setInterventions(intList);
      setAdvisees(advList);

      // Load progress comparisons
      const compMap: Record<string, StudentProgressComparison> = {};
      for (const item of intList) {
        try {
          const comp = await interventionService.getProgressComparison(item.studentId, item.id);
          compMap[item.id] = comp;
        } catch {
          // ignore
        }
      }
      setComparisons(compMap);
    } catch (err) {
      console.warn('TeacherInterventionsPage load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, role]);

  const adviseeMap = new Map<string, AssignedAdvisee>();
  advisees.forEach((a) => adviseeMap.set(a.studentId, a));

  const filteredInterventions = interventions.filter((item) => {
    const adv = adviseeMap.get(item.studentId);
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      item.reason.toLowerCase().includes(query) ||
      item.actionPlan.toLowerCase().includes(query) ||
      (adv && adv.displayName.toLowerCase().includes(query)) ||
      (adv && adv.rollNumber.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    if (s === 'open') colorClass = 'bg-blue-100 text-blue-800 border-blue-200';
    else if (s === 'in_progress') colorClass = 'bg-amber-100 text-amber-800 border-amber-200';
    else if (s === 'resolved' || s === 'completed') colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    else if (s === 'escalated') colorClass = 'bg-red-100 text-red-800 border-red-200';

    return (
      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${colorClass}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Interventions Management"
        description="Structured recovery plans, scheduled advising milestones, and chronological progress tracking."
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/dashboard' },
          { label: 'Interventions' },
        ]}
        action={
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Plus size={14} />
            <span>Create New Intervention</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by student, roll ID, or action plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Intervention Statuses</option>
            <option value="open">Open Plans</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="completed">Completed</option>
            <option value="escalated">Escalated</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Interventions List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
          Loading academic interventions and progress comparison metrics...
        </div>
      ) : filteredInterventions.length === 0 ? (
        <Card className="border border-slate-200">
          <CardContent className="py-16 text-center text-xs text-slate-500 space-y-2">
            <ShieldAlert size={32} className="mx-auto text-slate-400" />
            <p className="font-semibold text-slate-700">No Interventions Found</p>
            <p>
              {interventions.length === 0
                ? 'No advising recovery plans have been created yet. Click "Create New Intervention" to initiate one.'
                : 'No interventions match the selected search or status filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredInterventions.map((item) => {
            const adv = adviseeMap.get(item.studentId);
            const comp = comparisons[item.id];
            const intDate = item.createdAt ? item.createdAt.slice(0, 10) : item.targetDate;

            return (
              <div key={item.id} className="space-y-4">
                <Card className="border border-slate-200 shadow-2xs">
                  <CardHeader
                    title={item.reason}
                    subtitle={`Advisee: ${adv ? `${adv.displayName} (${adv.rollNumber})` : item.studentId} • Initiated ${intDate} by ${item.teacherName || 'Faculty Advisor'} • Target: ${item.targetDate}`}
                    action={
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(item.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveFollowUpIntervention(item)}
                          className="h-7 text-xs gap-1"
                        >
                          <CalendarCheck size={13} className="text-blue-600" />
                          <span>Log Follow-up</span>
                        </Button>
                        <Link to={`/teacher/students/${item.studentId}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <span>Advisee Details</span>
                            <ArrowRight size={12} />
                          </Button>
                        </Link>
                      </div>
                    }
                  />
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <strong className="text-slate-800 block">Structured Action Plan:</strong>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                        {item.actionPlan}
                      </p>
                    </div>

                    {/* Status History Trail */}
                    {item.statusHistory && item.statusHistory.length > 0 && (
                      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400" />
                          <span>Latest Update: <strong className="capitalize text-slate-700">{item.statusHistory[item.statusHistory.length - 1].status.replace('_', ' ')}</strong></span>
                          <span>— {item.statusHistory[item.statusHistory.length - 1].notes}</span>
                        </span>
                        <span className="font-mono text-[10px]">
                          {item.statusHistory[item.statusHistory.length - 1].changedAt
                            ? new Date(item.statusHistory[item.statusHistory.length - 1].changedAt).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })
                            : ''}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Progress Comparison Card (Group E) */}
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

      {/* Modals */}
      <CreateInterventionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        assignedAdvisees={advisees}
        onCreated={() => {
          loadData();
        }}
      />

      {activeFollowUpIntervention && (
        <AddFollowUpModal
          isOpen={Boolean(activeFollowUpIntervention)}
          onClose={() => setActiveFollowUpIntervention(null)}
          intervention={activeFollowUpIntervention}
          studentName={adviseeMap.get(activeFollowUpIntervention.studentId)?.displayName}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
