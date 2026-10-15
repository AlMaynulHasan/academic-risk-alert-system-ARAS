import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { Deadline, Course, Semester, Assessment } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, Calendar, Clock } from 'lucide-react';

interface CreateDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  semesters: Semester[];
  assessments?: Assessment[];
  defaultCourseId?: string;
  defaultSemesterId?: string;
  existingDeadline?: Deadline | null;
  onSaved: () => void;
}

export const CreateDeadlineModal: React.FC<CreateDeadlineModalProps> = ({
  isOpen,
  onClose,
  courses,
  semesters,
  assessments = [],
  defaultCourseId,
  defaultSemesterId,
  existingDeadline,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [courseId, setCourseId] = useState(
    existingDeadline?.courseId || defaultCourseId || courses[0]?.id || ''
  );
  const [semesterId, setSemesterId] = useState(
    existingDeadline?.semesterId || defaultSemesterId || semesters.find((s) => s.isCurrent)?.id || semesters[0]?.id || ''
  );
  const [assessmentId, setAssessmentId] = useState<string>(
    existingDeadline?.assessmentId || ''
  );
  const [title, setTitle] = useState(existingDeadline?.title || '');
  const [description, setDescription] = useState(existingDeadline?.description || '');
  const [type, setType] = useState<'assignment' | 'project' | 'quiz'>(
    existingDeadline?.type || 'assignment'
  );
  const [dueDate, setDueDate] = useState(
    existingDeadline?.dueDate
      ? existingDeadline.dueDate.slice(0, 16)
      : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [isActive, setIsActive] = useState<boolean>(
    existingDeadline ? existingDeadline.isActive !== false : true
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter assessments for selected course
  const relevantAssessments = assessments.filter((a) => a.courseId === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Please select a course.');
      return;
    }
    if (!title.trim()) {
      setError('Deadline title is required.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDueDate = new Date(dueDate).toISOString();

      if (existingDeadline) {
        await academicRecordService.updateDeadline(
          existingDeadline.id,
          {
            title: title.trim(),
            description: description.trim(),
            dueDate: formattedDueDate,
            type,
            isActive,
            semesterId,
            assessmentId: assessmentId || null,
          },
          user ? { uid: user.id, role: user.role as 'teacher' | 'admin' } : undefined
        );
        showToast('Deadline updated successfully.', 'success');
      } else {
        await academicRecordService.createDeadline(
          {
            courseId,
            semesterId,
            assessmentId: assessmentId || null,
            title: title.trim(),
            description: description.trim(),
            dueDate: formattedDueDate,
            type,
            isActive: true,
            createdBy: user?.id || 'teacher',
          },
          user ? { uid: user.id, role: user.role as 'teacher' | 'admin' } : undefined
        );
        showToast(`Deadline "${title}" scheduled.`, 'success');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save deadline.';
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
      title={existingDeadline ? 'Edit Academic Deadline' : 'Schedule Academic Deadline'}
      description="Create a milestone deadline scoped to students enrolled in this course and semester."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Course" required>
            <Select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={Boolean(existingDeadline)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Semester" required>
            <Select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Deadline Title" required hint="e.g., Milestone 1: ER Diagram Submission">
          <Input
            type="text"
            placeholder="e.g., Milestone 1: ER Diagram Submission"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="assignment">Assignment</option>
              <option value="project">Project / Milestone</option>
              <option value="quiz">Quiz / Exam Prep</option>
            </Select>
          </FormField>

          {relevantAssessments.length > 0 && (
            <FormField label="Linked Assessment (Optional)">
              <Select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
                <option value="">None (Independent Milestone)</option>
                {relevantAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type})
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        <FormField label="Description & Submission Instructions">
          <Input
            type="text"
            placeholder="e.g., Submit PDF report and schema SQL script via student portal."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <FormField label="Due Date & Time" required>
          <div className="relative">
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            <Clock className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
          </div>
        </FormField>

        {existingDeadline && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Active Milestone (Uncheck to deactivate / suppress student reminders)</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {existingDeadline ? 'Save Changes' : 'Schedule Deadline'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
