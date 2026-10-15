import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input } from '../../../shared/ui/Input';
import { Course } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, BookOpen } from 'lucide-react';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCourse?: Course | null;
  onSaved: () => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  isOpen,
  onClose,
  existingCourse,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [code, setCode] = useState(existingCourse?.code || '');
  const [title, setTitle] = useState(existingCourse?.title || '');
  const [credits, setCredits] = useState<string>(
    existingCourse ? String(existingCourse.credits) : '3'
  );
  const [department, setDepartment] = useState(existingCourse?.department || 'CSE');
  const [isActive, setIsActive] = useState<boolean>(
    existingCourse ? existingCourse.isActive !== false : true
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Course code is required (e.g., CSE311).');
      return;
    }
    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }
    const parsedCredits = Number(credits);
    if (isNaN(parsedCredits) || parsedCredits <= 0) {
      setError('Credits must be a positive number greater than 0.');
      return;
    }
    if (!department.trim()) {
      setError('Department is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingCourse) {
        await academicRecordService.updateCourse(
          existingCourse.id,
          {
            code: code.trim().toUpperCase(),
            title: title.trim(),
            credits: parsedCredits,
            department: department.trim(),
            isActive,
          },
          user ? { uid: user.id, role: user.role as 'teacher' | 'admin' } : undefined
        );
        showToast(`Course ${code.toUpperCase()} updated.`, 'success');
      } else {
        await academicRecordService.createCourse(
          {
            code: code.trim().toUpperCase(),
            title: title.trim(),
            credits: parsedCredits,
            department: department.trim(),
            isActive: true,
            createdBy: user?.id || 'admin',
          },
          user ? { uid: user.id, role: user.role as 'teacher' | 'admin' } : undefined
        );
        showToast(`Course ${code.toUpperCase()} created.`, 'success');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save course.';
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
      title={existingCourse ? 'Edit Academic Course' : 'Create Academic Course'}
      description="Manage institutional course catalog offerings and credit weight."
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
          <FormField label="Course Code" required hint="e.g., CSE311">
            <Input
              type="text"
              placeholder="e.g., CSE311"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={Boolean(existingCourse)}
              required
            />
          </FormField>

          <FormField label="Credits (> 0)" required hint="Usually 1.5, 3.0, 4.0">
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label="Course Title" required hint="Full official name">
          <Input
            type="text"
            placeholder="e.g., Database Management Systems"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Academic Department" required>
          <Input
            type="text"
            placeholder="e.g., CSE, EEE, ME"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
        </FormField>

        {existingCourse && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Course is Active (Uncheck to deactivate offering)</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {existingCourse ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
