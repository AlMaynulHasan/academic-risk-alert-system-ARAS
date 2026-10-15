import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select, TextArea } from '../../../shared/ui/Input';
import { InterventionStatus, AssignedAdvisee } from '../../../shared/types';
import { interventionService } from '../../../shared/services/interventionService';
import { formatDhakaDateOnly } from '../../../shared/utils/date';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { ShieldAlert, AlertCircle } from 'lucide-react';

interface CreateInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  defaultStudentName?: string;
  assignedAdvisees?: AssignedAdvisee[];
  onCreated: () => void;
}

export const CreateInterventionModal: React.FC<CreateInterventionModalProps> = ({
  isOpen,
  onClose,
  defaultStudentId,
  defaultStudentName,
  assignedAdvisees = [],
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState(defaultStudentId || assignedAdvisees[0]?.studentId || '');
  const [reason, setReason] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    // Default target date is 2 weeks from today
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDhakaDateOnly(d);
  });
  const [status, setStatus] = useState<InterventionStatus>('open');
  const [initialNotes, setInitialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError('Please select an assigned student.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide the intervention reason / risk trigger.');
      return;
    }
    if (!actionPlan.trim()) {
      setError('Please outline the structured action plan.');
      return;
    }
    if (!targetDate) {
      setError('Please select a target follow-up date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await interventionService.createIntervention(
        {
          studentId,
          teacherId: user?.id || 'teacher',
          teacherName: user?.displayName || user?.email || 'Faculty Advisor',
          reason: reason.trim(),
          actionPlan: actionPlan.trim(),
          targetDate,
          status,
          initialNotes: initialNotes.trim(),
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      showToast('Academic intervention plan initiated successfully.', 'success');
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create intervention plan.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudent = assignedAdvisees.find((a) => a.studentId === studentId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Academic Intervention Plan"
      description="Initiate a targeted advising recovery plan with scheduled follow-ups and performance tracking."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {defaultStudentId ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-medium">Advisee: </span>
              <strong className="text-slate-900">{defaultStudentName || defaultStudentId}</strong>
            </div>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-semibold rounded">
              Assigned Advisee
            </span>
          </div>
        ) : (
          <FormField label="Assigned Advisee" required hint="Select student linked via advisorAssignments">
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="">-- Choose Assigned Student --</option>
              {assignedAdvisees.map((adv) => (
                <option key={adv.studentId} value={adv.studentId}>
                  {adv.displayName} ({adv.rollNumber}) — Risk: {adv.currentRiskLevel} ({adv.attendancePercentage}% att)
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField
          label="Intervention Reason / Risk Trigger"
          required
          hint="e.g. Critical attendance drop (<60%), failed midterm, multiple missing assignments"
        >
          <Input
            type="text"
            placeholder="e.g., Attendance fell to 54% in CSE311 with 2 missing assignments"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </FormField>

        <FormField
          label="Structured Action Plan"
          required
          hint="Specific academic obligations, remedial tasks, or scheduled review milestones"
        >
          <TextArea
            rows={3}
            placeholder="e.g., 1. Mandatory attendance at twice-weekly lab hours. 2. Submit makeup assignment for Lab 2 by Friday. 3. Bi-weekly review with teaching assistant."
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Target Review Date"
            required
            hint="Milestone date for initial follow-up meeting"
          >
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Initial Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as InterventionStatus)}>
              <option value="open">Open (Plan pending initiation)</option>
              <option value="in_progress">In Progress (Active advising)</option>
              <option value="escalated">Escalated (Referred to Dept Head)</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Initial Advising Notes" hint="Optional advisor background notes for the audit trail">
          <Input
            type="text"
            placeholder="e.g., Discussed illness issues; student committed to recovery schedule"
            value={initialNotes}
            onChange={(e) => setInitialNotes(e.target.value)}
          />
        </FormField>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-700" />
          <span>
            This intervention plan creates an in-app notification for the student and initiates the chronological before/after progress monitoring window.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Create Intervention Plan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
