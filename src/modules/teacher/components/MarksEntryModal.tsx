import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { Assessment, Mark } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { Award, AlertCircle, Info } from 'lucide-react';

interface MarksEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  assessments: Assessment[];
  existingMark?: Mark | null;
  onSaved: () => void;
}

export const MarksEntryModal: React.FC<MarksEntryModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  enrollmentId,
  assessments,
  existingMark,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [assessmentId, setAssessmentId] = useState(
    existingMark?.assessmentId || assessments[0]?.id || ''
  );
  const [isUnrecorded, setIsUnrecorded] = useState(
    existingMark ? existingMark.obtainedMarks === null : false
  );
  const [obtainedMarks, setObtainedMarks] = useState<string>(
    existingMark && existingMark.obtainedMarks !== null && existingMark.obtainedMarks !== undefined
      ? String(existingMark.obtainedMarks)
      : ''
  );
  const [feedback, setFeedback] = useState(existingMark?.feedback || '');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAssessment = assessments.find((a) => a.id === assessmentId);
  const maxMarks = selectedAssessment?.maxMarks || 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!assessmentId) {
      setError('Please select an assessment.');
      return;
    }

    let parsedScore: number | null = null;
    if (!isUnrecorded) {
      if (obtainedMarks.trim() === '') {
        setError('Please enter obtained marks or check "Unrecorded / Not submitted".');
        return;
      }
      const num = Number(obtainedMarks);
      if (isNaN(num)) {
        setError('Obtained marks must be a valid number.');
        return;
      }
      if (num < 0) {
        setError('Obtained marks cannot be negative.');
        return;
      }
      if (num > maxMarks) {
        setError(`Obtained marks (${num}) cannot exceed the maximum possible marks (${maxMarks}).`);
        return;
      }
      parsedScore = num;
    }

    // Require justification reason when modifying existing recorded marks
    if (existingMark && existingMark.obtainedMarks !== parsedScore && !correctionReason.trim()) {
      setError('Institutional Policy: Justification reason is required when modifying an existing mark.');
      return;
    }

    setIsSubmitting(true);
    try {
      await academicRecordService.upsertMark(
        {
          assessmentId,
          studentId,
          enrollmentId,
          obtainedMarks: parsedScore, // null if unrecorded; 0 if evaluated zero
          feedback: feedback.trim(),
          gradedBy: user?.displayName || user?.email || 'Faculty Advisor',
          submittedAt: null,
          gradedAt: null,
          createdBy: user?.id || 'teacher',
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      // Record audit correction record if existing mark was changed
      if (existingMark && existingMark.obtainedMarks !== parsedScore) {
        try {
          await academicRecordService.recordMarkCorrection({
            entityType: 'mark',
            recordId: existingMark.id,
            field: 'obtainedMarks',
            oldValue: existingMark.obtainedMarks,
            newValue: parsedScore,
            reason: correctionReason.trim(),
            actorUid: user?.id || 'teacher',
          });
        } catch (auditErr) {
          console.warn('Mark correction audit log note:', auditErr);
        }
      }

      showToast(
        existingMark
          ? 'Mark corrected and logged to institutional audit trail.'
          : parsedScore === null
          ? 'Mark updated as Unrecorded (null). Risk reassessment triggered.'
          : `Mark recorded: ${parsedScore}/${maxMarks}. Risk reassessment triggered.`,
        'success'
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record student evaluation mark.';
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
      title={existingMark ? 'Update Assessment Mark' : 'Enter Continuous Mark'}
      description={`Grading evaluation for ${studentName}. Unrecorded evaluations are preserved as null.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Assessment Item" required>
          <Select
            value={assessmentId}
            onChange={(e) => {
              setAssessmentId(e.target.value);
            }}
            disabled={Boolean(existingMark)}
          >
            {assessments.map((asmt) => (
              <option key={asmt.id} value={asmt.id}>
                {asmt.title} ({asmt.type.toUpperCase()}) — Max: {asmt.maxMarks} pts ({asmt.weightage}%)
              </option>
            ))}
          </Select>
        </FormField>

        {/* Missing mark vs evaluated score selector */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
            <input
              type="checkbox"
              checked={isUnrecorded}
              onChange={(e) => {
                setIsUnrecorded(e.target.checked);
                if (e.target.checked) setObtainedMarks('');
              }}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Mark as Unrecorded / Not Submitted (Missing)</span>
          </label>
          <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
            Per institutional policy, unrecorded submissions are stored as <code className="font-mono text-slate-700">null</code>, never as <code className="font-mono text-slate-700">0</code>. An entry of 0 denotes an evaluated zero score.
          </p>
        </div>

        {!isUnrecorded && (
          <FormField
            label={`Obtained Marks (out of ${maxMarks})`}
            required
            hint={`Numeric score between 0.0 and ${maxMarks}`}
          >
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                min="0"
                max={maxMarks}
                placeholder={`e.g., 17.5`}
                value={obtainedMarks}
                onChange={(e) => setObtainedMarks(e.target.value)}
                required={!isUnrecorded}
              />
              <Award className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
            </div>
          </FormField>
        )}

        <FormField label="Evaluation Feedback" hint="Constructive feedback visible to the student">
          <Input
            type="text"
            placeholder="e.g., Strong conceptual formulation, review query optimization section"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </FormField>

        {existingMark && (
          <FormField
            label="Correction Justification Reason"
            required
            hint="Institutional policy requires justification for published mark modifications"
          >
            <Input
              type="text"
              placeholder="e.g., Regrade requested by student; question 3 arithmetic recount verified"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              required
            />
          </FormField>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-[11px] text-blue-900 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-blue-700" />
          <span>
            Upon saving, the shared change event triggers the background risk calculation engine. Continuous marks averages exclude missing marks.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {existingMark ? 'Update Evaluation' : 'Submit Mark'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
