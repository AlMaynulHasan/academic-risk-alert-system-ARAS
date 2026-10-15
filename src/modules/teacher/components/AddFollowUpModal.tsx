import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select, TextArea } from '../../../shared/ui/Input';
import { Intervention, InterventionStatus } from '../../../shared/types';
import { interventionService } from '../../../shared/services/interventionService';
import { formatDhakaDateOnly } from '../../../shared/utils/date';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { CalendarCheck, AlertCircle } from 'lucide-react';

interface AddFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: Intervention;
  studentName?: string;
  onSaved: () => void;
}

export const AddFollowUpModal: React.FC<AddFollowUpModalProps> = ({
  isOpen,
  onClose,
  intervention,
  studentName,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const todayStr = formatDhakaDateOnly(new Date());

  const [meetingDate, setMeetingDate] = useState(todayStr);
  const [statusUpdate, setStatusUpdate] = useState<InterventionStatus>(
    intervention.status === 'open' ? 'in_progress' : intervention.status
  );
  const [progressNotes, setProgressNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [completed, setCompleted] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!meetingDate) {
      setError('Please provide a meeting date.');
      return;
    }
    if (!progressNotes.trim()) {
      setError('Please provide advising progress notes.');
      return;
    }

    setIsSubmitting(true);
    try {
      await interventionService.addFollowUp(
        {
          interventionId: intervention.id,
          teacherId: user?.id || 'teacher',
          meetingDate,
          statusUpdate,
          progressNotes: progressNotes.trim(),
          outcome: outcome.trim(),
          completed,
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      showToast('Follow-up record logged and status updated.', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record follow-up.';
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
      title="Log Follow-Up Advising Session"
      description={`Document follow-up meeting notes for intervention: "${intervention.reason}". Advisee: ${studentName || intervention.studentId}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Meeting Date" required hint="Asia/Dhaka date">
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Intervention Status Update" required>
            <Select
              value={statusUpdate}
              onChange={(e) => setStatusUpdate(e.target.value as InterventionStatus)}
            >
              <option value="in_progress">In Progress (Ongoing Advising)</option>
              <option value="resolved">Resolved (Recovery Achieved)</option>
              <option value="completed">Completed (Plan Finished)</option>
              <option value="escalated">Escalated (Referred to Chair)</option>
              <option value="cancelled">Cancelled (Term Withdrawn)</option>
            </Select>
          </FormField>
        </div>

        <FormField
          label="Progress Notes"
          required
          hint="Observations regarding attendance compliance, assignments, and student engagement"
        >
          <TextArea
            rows={3}
            placeholder="e.g., Student attended both lab sessions this week; submitted missed Lab 2 assignment with good effort. Attendance is stabilizing."
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Agreed Outcome / Next Steps" hint="Next check-in date or action items">
          <Input
            type="text"
            placeholder="e.g., Next check-in on March 5; student to attend tutoring for Midterm 2 prep"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        </FormField>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="followUpCompleted"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="followUpCompleted" className="text-xs text-slate-700 cursor-pointer font-medium">
            Meeting completed as scheduled
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Follow-up Record
          </Button>
        </div>
      </form>
    </Modal>
  );
};
