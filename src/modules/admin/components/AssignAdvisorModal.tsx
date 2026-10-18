import React, { useState, useMemo } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { getCurrentUtcIso, formatDhakaDateOnly } from '../../../shared/utils/date';
import { AlertCircle, Users, CheckSquare, Square, Search, ShieldCheck } from 'lucide-react';
import { User } from '../../../shared/types';

interface AssignAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: User[];
  students: User[];
  onSaved: () => void;
}

export const AssignAdvisorModal: React.FC<AssignAdvisorModalProps> = ({
  isOpen,
  onClose,
  teachers,
  students,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Departments present in student list
  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const dept = s.departmentId || s.assignedDepartment;
      if (dept) set.add(dept);
    });
    return Array.from(set);
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        (s.displayName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(studentSearch.toLowerCase());
      const sDept = s.departmentId || s.assignedDepartment || '';
      const matchesDept = departmentFilter === 'all' || sDept.toLowerCase() === departmentFilter.toLowerCase();
      return matchesSearch && matchesDept;
    });
  }, [students, studentSearch, departmentFilter]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    const allSelected = filteredIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      // Deselect filtered
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teacherId) {
      setError('Please select a faculty advisor.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one advisee student.');
      return;
    }

    setIsSubmitting(true);
    const now = getCurrentUtcIso();
    const todayDhaka = formatDhakaDateOnly(new Date());

    try {
      // Batch save each advisor assignment in Firestore
      const savePromises = selectedStudentIds.map(async (stId) => {
        const docId = `${teacherId}_${stId}`;
        return setDoc(doc(db, 'advisorAssignments', docId), {
          id: docId,
          teacherId,
          studentId: stId,
          assignedDate: todayDhaka,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          createdBy: user?.id || 'admin',
        }, { merge: true });
      });

      await Promise.all(savePromises);

      const assignedAdvisor = teachers.find((t) => t.id === teacherId);
      showToast(
        `Successfully assigned ${selectedStudentIds.length} student(s) to advisor ${assignedAdvisor?.displayName || teacherId}!`,
        'success'
      );
      onSaved();
      onClose();
      setSelectedStudentIds([]);
    } catch (err: unknown) {
      console.error('Advisor assignment error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create advisor assignment.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Faculty Advisor to Students"
      description="Link students to a designated faculty advisor for academic monitoring, early risk alerts, and advising consultations."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Advisor Selection */}
        <FormField label="Designated Faculty Advisor" required hint="Faculty member who monitors advisee risk and schedules interventions">
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a651]/40"
          >
            {teachers.length === 0 ? (
              <option value="">No faculty members registered</option>
            ) : (
              teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} ({t.email}) {t.designation ? `— ${t.designation}` : ''} {t.departmentId ? `[${t.departmentId}]` : ''}
                </option>
              ))
            )}
          </select>
        </FormField>

        {/* 2. Student Selection with Filters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users size={14} className="text-[#00a651]" />
              <span>Select Advisee Students ({selectedStudentIds.length} Selected)</span>
            </label>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[11px] text-[#008744] hover:text-[#006834] font-semibold cursor-pointer flex items-center gap-1"
            >
              {filteredStudents.length > 0 &&
              filteredStudents.every((s) => selectedStudentIds.includes(s.id)) ? (
                <>
                  <CheckSquare size={13} />
                  <span>Deselect All Filtered</span>
                </>
              ) : (
                <>
                  <Square size={13} />
                  <span>Select All Filtered ({filteredStudents.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Search & Department Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Input
                placeholder="Search students by name or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 text-xs"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Departments ({students.length} students)</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d} Department
                </option>
              ))}
            </Select>
          </div>

          {/* Student Multi-Select List Box */}
          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No students found matching current filter.
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedStudentIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSelectStudent(s.id)}
                    className={`p-2.5 px-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-[#00a651]">
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{s.displayName || 'Unnamed Student'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{s.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {s.departmentId || s.assignedDepartment || 'CSE'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
          <ShieldCheck size={16} className="text-[#00a651] shrink-0 mt-0.5" />
          <span>
            Assigned advisees will instantly appear under this advisor's <strong>Advising Workspace</strong>, and ARAS academic risk alerts will be routed directly to them.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={!teacherId || selectedStudentIds.length === 0}
            className="gap-1.5"
          >
            <span>Assign {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length}) Students` : ''}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
