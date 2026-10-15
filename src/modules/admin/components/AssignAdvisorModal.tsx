import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Select } from '../../../shared/ui/Input';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../shared/firebase';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { getCurrentUtcIso, formatDhakaDateOnly } from '../../../shared/utils/date';
import { AlertCircle } from 'lucide-react';

interface AssignAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Array<{ id: string; displayName: string; email: string }>;
  students: Array<{ id: string; displayName: string; email: string }>;
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
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teacherId) {
      setError('Please select a faculty advisor.');
      return;
    }
    if (!studentId) {
      setError('Please select an advisee student.');
      return;
    }

    setIsSubmitting(true);
    const docId = `${teacherId}_${studentId}`;
    const now = getCurrentUtcIso();
    const todayDhaka = formatDhakaDateOnly(new Date());

    try {
      await setDoc(doc(db, 'advisorAssignments', docId), {
        id: docId,
        teacherId,
        studentId,
        assignedDate: todayDhaka,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: user?.id || 'admin',
      });

      showToast('Advisor assignment successfully created.', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
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
      title="Assign Faculty Advisor"
      description="Link a student advisee to an institutional faculty advisor for academic monitoring and interventions."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Select Faculty Member / Advisor" required>
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {teachers.length === 0 ? (
              <option value="">No faculty members found</option>
            ) : (
              teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} ({t.email})
                </option>
              ))
            )}
          </Select>
        </FormField>

        <FormField label="Select Advisee Student" required>
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

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!teacherId || !studentId}>
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
