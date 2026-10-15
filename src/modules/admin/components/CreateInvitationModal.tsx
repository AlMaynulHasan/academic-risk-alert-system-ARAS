import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { StudentInvitation, Department } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, UserPlus, Copy, Check } from 'lucide-react';
import { ACADEMIC_LEVELS } from '../../../shared/constants';

interface CreateInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onCreated: (inv: StudentInvitation) => void;
}

export const CreateInvitationModal: React.FC<CreateInvitationModalProps> = ({
  isOpen,
  onClose,
  departments,
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState(departments[0]?.code || 'CSE');
  const [batch, setBatch] = useState('2026');
  const [section, setSection] = useState('A');
  const [level, setLevel] = useState<string>(ACADEMIC_LEVELS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [createdInvitation, setCreatedInvitation] = useState<StudentInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = () => {
    setStudentId('');
    setEmail('');
    setCreatedInvitation(null);
    setCopied(false);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentId.trim()) {
      setError('Official Student ID is required (e.g., CSE-2026-001).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid official email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const inv = await academicRecordService.createStudentInvitation(
        {
          officialStudentId: studentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          department,
          batch: batch.trim(),
          section: section.trim().toUpperCase(),
          level,
          createdBy: user?.id || 'admin',
        },
        { uid: user?.id || 'admin', role: user?.role || 'admin' }
      );

      setCreatedInvitation(inv);
      showToast('Official student pre-registered and invitation generated!', 'success');
      onCreated(inv);
    } catch (err: unknown) {
      console.error('Create student invitation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create student invitation.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyActivationLink = () => {
    if (!createdInvitation) return;
    const link = `${window.location.origin}/activate?token=${createdInvitation.token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Activation link copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInvitation ? 'Student Invitation Generated' : 'Pre-Register Official Student'}
    >
      {createdInvitation ? (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-emerald-800">
              Pre-Registration Complete
            </div>
            <p className="text-xs text-slate-700">
              Official record created for <strong className="text-slate-900">{createdInvitation.officialStudentId}</strong> ({createdInvitation.email}).
            </p>
            <div className="p-2.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-900 break-all select-all flex items-center justify-between gap-2">
              <span>{createdInvitation.token}</span>
              <button
                type="button"
                onClick={copyActivationLink}
                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-2xs font-sans transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <p className="text-2xs text-slate-500">
            This one-time activation token expires in 7 days. Send this link to the student so they can securely link their account.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Done
            </Button>
            <Button
              onClick={() => {
                handleReset();
              }}
            >
              Pre-Register Another
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Official Student ID" required hint="e.g. CSE-2026-001">
              <Input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="CSE-2026-001"
                className="uppercase"
                required
              />
            </FormField>

            <FormField label="Official Email" required hint="University institutional email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@baust.edu.bd"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Department" required>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
                {departments.length === 0 && (
                  <>
                    <option value="CSE">CSE - Computer Science</option>
                    <option value="EEE">EEE - Electrical Engineering</option>
                  </>
                )}
              </Select>
            </FormField>

            <FormField label="Academic Level" required>
              <Select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {ACADEMIC_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Batch" required hint="Admission year or batch">
              <Input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="2026"
                required
              />
            </FormField>

            <FormField label="Assigned Section" required hint="Section name">
              <Input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                className="uppercase"
                required
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Generate Invitation Token
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
