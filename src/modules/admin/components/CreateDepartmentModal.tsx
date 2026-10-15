import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input } from '../../../shared/ui/Input';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, Building2 } from 'lucide-react';

interface CreateDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateDepartmentModal: React.FC<CreateDepartmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Department code is required (e.g., CSE).');
      return;
    }
    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      await academicRecordService.createDepartment(
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          createdBy: user?.id || 'admin',
        },
        { uid: user?.id || 'admin', role: user?.role || 'admin' }
      );

      showToast('Department created successfully!', 'success');
      onCreated();
      setCode('');
      setName('');
      onClose();
    } catch (err: unknown) {
      console.error('Create department error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create department.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Academic Department">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Department Code" required hint="e.g. CSE, EEE, ME, BBA">
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CSE"
            className="uppercase font-mono"
            required
          />
        </FormField>

        <FormField label="Department Name" required hint="Full academic department name">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Computer Science and Engineering"
            required
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Department
          </Button>
        </div>
      </form>
    </Modal>
  );
};
