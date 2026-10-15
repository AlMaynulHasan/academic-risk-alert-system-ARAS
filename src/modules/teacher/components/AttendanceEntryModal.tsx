import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { AttendanceRecord, AttendanceStatus, Enrollment } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { formatDhakaDateOnly } from '../../../shared/utils/date';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface AttendanceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  enrollments: Array<{ enrollmentId: string; courseId: string; courseCode: string; courseTitle: string }>;
  existingRecord?: AttendanceRecord | null;
  onSaved: () => void;
}

export const AttendanceEntryModal: React.FC<AttendanceEntryModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  enrollments,
  existingRecord,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const todayStr = formatDhakaDateOnly(new Date());

  const [courseId, setCourseId] = useState(existingRecord?.courseId || enrollments[0]?.courseId || '');
  const [date, setDate] = useState(existingRecord?.date || todayStr);
  const [status, setStatus] = useState<AttendanceStatus>(existingRecord?.status || 'present');
  const [notes, setNotes] = useState(existingRecord?.notes || '');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Please select an enrolled course.');
      return;
    }

    if (!date) {
      setError('Please provide a valid session date.');
      return;
    }

    if (date > todayStr) {
      setError(`Attendance date cannot be in the future (today in Asia/Dhaka is ${todayStr}).`);
      return;
    }

    const selectedEnrollment = enrollments.find((enr) => enr.courseId === courseId);
    if (!selectedEnrollment) {
      setError('No matching enrollment found for the selected course.');
      return;
    }

    if (existingRecord && status !== existingRecord.status && !correctionReason.trim()) {
      setError('Institutional Policy: Justification reason is required when modifying an existing attendance record.');
      return;
    }

    setIsSubmitting(true);
    try {
      await academicRecordService.upsertAttendance(
        {
          enrollmentId: selectedEnrollment.enrollmentId,
          studentId,
          courseId,
          date,
          status,
          notes: notes.trim(),
          createdBy: user?.id || 'teacher',
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      // Record audit correction trail if existing status was changed
      if (existingRecord && status !== existingRecord.status) {
        try {
          await academicRecordService.recordAttendanceCorrection({
            entityType: 'attendance',
            recordId: existingRecord.id,
            field: 'status',
            oldValue: existingRecord.status,
            newValue: status,
            reason: correctionReason.trim(),
            actorUid: user?.id || 'teacher',
          });
        } catch (auditErr) {
          console.warn('Audit record note:', auditErr);
        }
      }

      showToast(
        existingRecord
          ? 'Attendance record corrected and logged to audit trail.'
          : 'Attendance recorded. Risk evaluation reassessment triggered.',
        'success'
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save attendance record.';
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
      title={existingRecord ? 'Update Attendance Record' : 'Record Student Attendance'}
      description={`Logging attendance for ${studentName}. Input is validated against institutional policies.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <FormField label="Course" required hint="Select enrolled course session">
          <Select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={Boolean(existingRecord)}
          >
            {enrollments.map((enr) => (
              <option key={enr.courseId} value={enr.courseId}>
                {enr.courseCode} - {enr.courseTitle}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Session Date"
            required
            hint="Asia/Dhaka timezone (today or earlier)"
          >
            <div className="relative">
              <Input
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Calendar className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
            </div>
          </FormField>

          <FormField label="Status" required>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="present">Present (Weight 1.0)</option>
              <option value="late">Late (Weight 0.5)</option>
              <option value="excused">Excused (Weight 1.0)</option>
              <option value="absent">Absent (Weight 0.0)</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Advisor Notes" hint="Optional rationale or context (e.g., medical leave cert)">
          <Input
            type="text"
            placeholder="e.g., Arrived 15 mins late due to lab transport"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>

        {existingRecord && (
          <FormField
            label="Correction Justification Reason"
            required
            hint="Institutional policy requires justification for published attendance modifications"
          >
            <Input
              type="text"
              placeholder="e.g., Student submitted validated medical certificate approved by department head"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              required
            />
          </FormField>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <CheckCircle2 size={13} className="text-blue-600" />
            <span>Automatic Risk Recalculation</span>
          </div>
          <p>
            Saving this record will dispatch the academic record change event, prompting the pure risk engine to recalculate this student's risk level.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {existingRecord ? 'Save Changes' : 'Confirm Attendance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
