import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { CourseOffering, User } from '../../../shared/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { getCurrentUtcIso } from '../../../shared/utils/date';
import { AlertCircle, UserCheck, Users, BookOpen } from 'lucide-react';

interface AssignCourseTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: CourseOffering | null;
  teachers: User[];
  onSaved: () => void;
}

export const AssignCourseTeacherModal: React.FC<AssignCourseTeacherModalProps> = ({
  isOpen,
  onClose,
  offering,
  teachers,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    offering?.teacherIds?.[0] || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selected teacher whenever offering changes
  React.useEffect(() => {
    if (offering) {
      setSelectedTeacherId(offering.teacherIds?.[0] || '');
      setError(null);
    }
  }, [offering]);

  if (!offering) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    const now = getCurrentUtcIso();

    try {
      const teacherIds = selectedTeacherId ? [selectedTeacherId] : [];
      await updateDoc(doc(db, 'courseOfferings', offering.id), {
        teacherIds,
        updatedAt: now,
        updatedBy: user?.id || 'admin',
      });

      const assignedTeacher = teachers.find((t) => t.id === selectedTeacherId);
      showToast(
        assignedTeacher
          ? `Faculty member ${assignedTeacher.displayName} assigned to ${offering.courseCode} (Section ${offering.section})!`
          : `Teacher unassigned from ${offering.courseCode}.`,
        'success'
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error assigning course teacher:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update course offering teacher.';
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
      title="Assign Course Teacher to Offering"
      description="Authorize a faculty member to manage daily section attendance and record continuous assessment marks."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Offering Details Strip */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <BookOpen size={15} className="text-[#00a651]" />
              <span>{offering.courseCode}</span>
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-[#006834] font-bold rounded text-[11px]">
              Section {offering.section}
            </span>
          </div>
          <div className="text-slate-600 font-medium">{offering.courseTitle}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            Semester ID: {offering.semesterId} · Capacity: {offering.capacity || 50} seats
          </div>
        </div>

        <FormField label="Responsible Course Teacher" required hint="Faculty who takes attendance and enters marks">
          <div className="space-y-2">
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a651]/40"
            >
              <option value="">-- No Teacher Assigned (Unassigned) --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} ({t.email}) {t.designation ? `— ${t.designation}` : ''} {t.departmentId ? `[${t.departmentId}]` : ''}
                </option>
              ))}
            </select>
            {teachers.length === 0 && (
              <p className="text-[11px] text-amber-700">
                No faculty members registered yet. Create a teacher first in the Users & Roles tab!
              </p>
            )}
          </div>
        </FormField>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
          <UserCheck size={16} className="text-[#00a651] shrink-0 mt-0.5" />
          <span>
            Once assigned, this course offering will immediately appear on the teacher's <strong>Take Attendance</strong> and <strong>Record Marks</strong> pages.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="gap-1.5">
            <UserCheck size={14} />
            <span>Save Teacher Assignment</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
