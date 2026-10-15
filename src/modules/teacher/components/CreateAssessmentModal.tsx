import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { Assessment, AssessmentType, Course, Semester } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { Award, AlertCircle, Calendar } from 'lucide-react';

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  semesters: Semester[];
  defaultCourseId?: string;
  defaultSemesterId?: string;
  existingAssessment?: Assessment | null;
  onSaved: () => void;
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  courses,
  semesters,
  defaultCourseId,
  defaultSemesterId,
  existingAssessment,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [courseId, setCourseId] = useState(
    existingAssessment?.courseId || defaultCourseId || courses[0]?.id || ''
  );
  const [semesterId, setSemesterId] = useState(
    existingAssessment?.semesterId || defaultSemesterId || semesters.find((s) => s.isCurrent)?.id || semesters[0]?.id || ''
  );
  const [title, setTitle] = useState(existingAssessment?.title || '');
  const [type, setType] = useState<AssessmentType>(existingAssessment?.type || 'quiz');
  const [maxMarks, setMaxMarks] = useState<string>(
    existingAssessment ? String(existingAssessment.maxMarks) : '20'
  );
  const [weightage, setWeightage] = useState<string>(
    existingAssessment ? String(existingAssessment.weightage) : '10'
  );
  const [dueDate, setDueDate] = useState(
    existingAssessment?.dueDate
      ? existingAssessment.dueDate.slice(0, 16)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Please select a course.');
      return;
    }
    if (!semesterId) {
      setError('Please select an academic semester.');
      return;
    }
    if (!title.trim()) {
      setError('Assessment title is required.');
      return;
    }

    const parsedMaxMarks = Number(maxMarks);
    if (isNaN(parsedMaxMarks) || parsedMaxMarks <= 0) {
      setError('Maximum marks must be a positive number strictly greater than 0.');
      return;
    }

    const parsedWeightage = Number(weightage);
    if (isNaN(parsedWeightage) || parsedWeightage < 0 || parsedWeightage > 100) {
      setError('Weightage must be a number between 0% and 100%.');
      return;
    }

    if (!dueDate) {
      setError('Due date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDueDate = new Date(dueDate).toISOString();

      if (existingAssessment) {
        await academicRecordService.updateAssessment(
          existingAssessment.id,
          {
            title: title.trim(),
            type,
            maxMarks: parsedMaxMarks,
            weightage: parsedWeightage,
            dueDate: formattedDueDate,
          },
          user ? { uid: user.id, role: user.role as 'teacher' | 'admin' } : undefined
        );
        showToast('Assessment updated successfully.', 'success');
      } else {
        await academicRecordService.createAssessment(
          {
            courseId,
            semesterId,
            title: title.trim(),
            type,
            maxMarks: parsedMaxMarks,
            weightage: parsedWeightage,
            dueDate: formattedDueDate,
            createdBy: user?.id || 'teacher',
          },
          user ? { uid: user.id, role: user.role as 'teacher' | 'admin' } : undefined
        );
        showToast(`Assessment "${title}" created (Max: ${parsedMaxMarks}).`, 'success');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save assessment.';
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
      title={existingAssessment ? 'Edit Assessment Item' : 'Create Course Assessment'}
      description="Define an assessment component with mandatory maximum-marks and evaluation weightage."
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
              disabled={Boolean(existingAssessment)}
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
              disabled={Boolean(existingAssessment)}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Assessment Title" required hint="e.g., Quiz 2: Normalization & BCNF">
          <Input
            type="text"
            placeholder="e.g., Quiz 2: Normalization & BCNF"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as AssessmentType)}>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
              <option value="midterm">Midterm Exam</option>
              <option value="final">Final Exam</option>
              <option value="project">Project</option>
            </Select>
          </FormField>

          <FormField label="Max Marks (> 0)" required hint="Points achievable">
            <div className="relative">
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                required
              />
              <Award className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
            </div>
          </FormField>

          <FormField label="Weightage (%)" required hint="0% to 100%">
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={weightage}
              onChange={(e) => setWeightage(e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label="Due / Submission Date" required>
          <div className="relative">
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            <Calendar className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
          </div>
        </FormField>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {existingAssessment ? 'Save Changes' : 'Create Assessment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
