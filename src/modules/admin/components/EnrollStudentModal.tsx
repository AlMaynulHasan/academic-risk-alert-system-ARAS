import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Select } from '../../../shared/ui/Input';
import { Course, Semester, User } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, UserCheck } from 'lucide-react';

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Array<{ id: string; displayName: string; email: string }>;
  courses: Course[];
  semesters: Semester[];
  onSaved: () => void;
}

export const EnrollStudentModal: React.FC<EnrollStudentModalProps> = ({
  isOpen,
  onClose,
  students,
  courses,
  semesters,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [semesterId, setSemesterId] = useState(
    semesters.find((s) => s.isCurrent)?.id || semesters[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError('Please select a student.');
      return;
    }
    if (!courseId) {
      setError('Please select a course.');
      return;
    }
    if (!semesterId) {
      setError('Please select an academic semester.');
      return;
    }

    setIsSubmitting(true);
    try {
      await academicRecordService.createEnrollment(
        {
          studentId,
          courseId,
          semesterId,
          status: 'enrolled',
        },
        user ? { uid: user.id, role: 'admin' } : undefined
      );

      showToast('Student successfully enrolled in course.', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create enrollment.';
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
      title="Enroll Student in Course"
      description="Register a student into an academic course offering with duplicate enrollment guard."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Select Student" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.length === 0 ? (
              <option value="">No registered students found</option>
            ) : (
              students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.email})
                </option>
              ))
            )}
          </Select>
        </FormField>

        <FormField label="Select Course" required>
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.length === 0 ? (
              <option value="">No active courses found</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title} ({c.credits} Credits)
                </option>
              ))
            )}
          </Select>
        </FormField>

        <FormField label="Academic Term / Semester" required>
          <Select value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!studentId || !courseId || !semesterId}>
            Confirm Enrollment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
