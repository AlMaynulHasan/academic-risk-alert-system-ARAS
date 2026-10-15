import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input, Select } from '../../../shared/ui/Input';
import { AssignedAdvisee } from '../../../shared/types';
import { interventionService } from '../../../shared/services/interventionService';
import {
  Users,
  Search,
  Filter,
  ArrowRight,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';

export const TeacherStudentsPage: React.FC = () => {
  const { user, role } = useAuth();

  const [advisees, setAdvisees] = useState<AssignedAdvisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'risk' | 'attendance' | 'name' | 'update'>('risk');

  const loadAdvisees = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await interventionService.getAssignedAdvisees(user.id, role === 'admin');
      setAdvisees(list);
    } catch (err) {
      console.warn('TeacherStudentsPage load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisees();
  }, [user, role]);

  // Filter
  const filtered = advisees.filter((adv) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      adv.displayName.toLowerCase().includes(query) ||
      adv.rollNumber.toLowerCase().includes(query) ||
      adv.department.toLowerCase().includes(query);

    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'insufficient' && adv.currentRiskLevel === 'Insufficient data') ||
      adv.currentRiskLevel.toLowerCase() === riskFilter.toLowerCase();

    return matchesSearch && matchesRisk;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'risk') {
      const rank: Record<string, number> = {
        High: 1,
        Medium: 2,
        'Insufficient data': 3,
        Low: 4,
      };
      return (rank[a.currentRiskLevel] || 5) - (rank[b.currentRiskLevel] || 5);
    } else if (sortBy === 'attendance') {
      return a.attendancePercentage - b.attendancePercentage;
    } else if (sortBy === 'name') {
      return a.displayName.localeCompare(b.displayName);
    } else if (sortBy === 'update') {
      return (b.riskComputedAt || '').localeCompare(a.riskComputedAt || '');
    }
    return 0;
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
        title="Assigned Advisees Roster"
        description="Comprehensive directory of students linked to your faculty advising account via institutional assignments."
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/dashboard' },
          { label: 'Advisees Roster' },
        ]}
      />

      {/* Advisee Roster Card */}
      <Card className="border border-slate-200">
        <CardHeader
          title="Advisee Cohort Overview"
          subtitle={`Scoped by advisorAssignments collection (${sorted.length} students displayed)`}
        />
        <CardContent className="space-y-4">
          {/* Search, Filter & Sort Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                placeholder="Search by student name or roll ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Risk:</span>
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

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Sort:</span>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs"
              >
                <option value="risk">Risk Priority (High First)</option>
                <option value="attendance">Lowest Attendance First</option>
                <option value="name">Student Name (A-Z)</option>
                <option value="update">Latest Assessment</option>
              </Select>
            </div>
          </div>

          {/* Directory Table */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
              Loading advisees directory...
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              {advisees.length === 0
                ? 'No students are assigned to you in the advisorAssignments collection.'
                : 'No advisees match the current search and filter criteria.'}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Roll ID</th>
                    <th className="py-3 px-3">Department & Batch</th>
                    <th className="py-3 px-3">Risk Level</th>
                    <th className="py-3 px-3">Attendance %</th>
                    <th className="py-3 px-3">Marks Avg</th>
                    <th className="py-3 px-3">Active Interventions</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((adv) => (
                    <tr key={adv.studentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {adv.displayName}
                        <div className="text-[11px] text-slate-400 font-normal">{adv.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{adv.rollNumber}</td>
                      <td className="py-3 px-3 text-slate-600">
                        <div>{adv.department}</div>
                        <div className="text-[10px] text-slate-400">{adv.batch} • {adv.level || 'Enrolled'}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderRiskBadge(adv.currentRiskLevel)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
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
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold tabular-nums text-slate-800">
                          {adv.marksAverage !== null ? `${adv.marksAverage}%` : 'Not recorded'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {adv.activeInterventionsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                            {adv.activeInterventionsCount} Active
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Link to={`/teacher/students/${adv.studentId}`}>
                          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1">
                            <span>Deep Dive</span>
                            <ArrowRight size={13} />
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
  );
};
