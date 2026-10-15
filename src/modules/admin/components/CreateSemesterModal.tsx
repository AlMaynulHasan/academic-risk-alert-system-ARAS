import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input } from '../../../shared/ui/Input';
import { Semester } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, Calendar } from 'lucide-react';

interface CreateSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSemester?: Semester | null;
  onSaved: () => void;
}

export const CreateSemesterModal: React.FC<CreateSemesterModalProps> = ({
  isOpen,
  onClose,
  existingSemester,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(existingSemester?.name || '');
  const [startDate, setStartDate] = useState(existingSemester?.startDate || '');
  const [endDate, setEndDate] = useState(existingSemester?.endDate || '');
  const [isCurrent, setIsCurrent] = useState<boolean>(
    existingSemester ? existingSemester.isCurrent : false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Semester name is required (e.g., Summer 2026).');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (startDate >= endDate) {
      setError('Semester start date must be strictly before end date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingSemester) {
        await academicRecordService.updateSemester(
          existingSemester.id,
          {
            name: name.trim(),
            startDate,
            endDate,
            isCurrent,
          },
          user ? { uid: user.id, role: 'admin' } : undefined
        );
        showToast(`Semester "${name}" updated.`, 'success');
      } else {
        await academicRecordService.createSemester(
          {
            name: name.trim(),
            startDate,
            endDate,
            isCurrent,
            createdBy: user?.id || 'admin',
          },
          user ? { uid: user.id, role: 'admin' } : undefined
        );
        showToast(`Semester "${name}" created.`, 'success');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save semester.';
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
      title={existingSemester ? 'Edit Academic Term' : 'Create Academic Term'}
      description="Define an academic semester with term calendar boundaries and current-term flag."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Semester Name" required hint="e.g., Summer 2026, Fall 2026">
          <Input
            type="text"
            placeholder="e.g., Summer 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Start Date" required>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="End Date" required>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Set as Current Active Semester</span>
          </label>
          <p className="text-[11px] text-slate-500 pl-6 mt-1">
            Setting this semester as current will automatically unset the current flag on all other semesters.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {existingSemester ? 'Save Changes' : 'Create Semester'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
