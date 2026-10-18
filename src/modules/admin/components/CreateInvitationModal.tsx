import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { StudentInvitation, Department, User } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, UserPlus, Copy, Check, CheckCircle2, ShieldCheck, UserCheck, FileText } from 'lucide-react';
import { ACADEMIC_LEVELS } from '../../../shared/constants';

interface CreateInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  advisors?: User[];
  onCreated: (inv: StudentInvitation) => void;
}

export const CreateInvitationModal: React.FC<CreateInvitationModalProps> = ({
  isOpen,
  onClose,
  departments,
  advisors = [],
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState(departments[0]?.code || 'CSE');
  const [batch, setBatch] = useState('2026');
  const [section, setSection] = useState('A');
  const [level, setLevel] = useState<string>(ACADEMIC_LEVELS[0]);
  const [phone, setPhone] = useState('');
  const [advisorId, setAdvisorId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [createdInvitation, setCreatedInvitation] = useState<StudentInvitation | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const handleReset = () => {
    setDisplayName('');
    setStudentId('');
    setEmail('');
    setPhone('');
    setAdvisorId('');
    setCreatedInvitation(null);
    setCopiedCode(false);
    setCopiedLink(false);
    setCopiedSlip(false);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Student Full Name is required.');
      return;
    }

    if (!studentId.trim()) {
      setError('Official Student ID / Roll is required (e.g. CSE-2026-001).');
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
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          department,
          batch: batch.trim(),
          section: section.trim().toUpperCase(),
          level,
          phone: phone.trim() || undefined,
          advisorId: advisorId || undefined,
          createdBy: user?.id || 'admin',
        },
        { uid: user?.id || 'admin', role: user?.role || 'admin' }
      );

      setCreatedInvitation(inv);
      showToast('Student registered successfully! Activation code generated.', 'success');
      onCreated(inv);
    } catch (err: unknown) {
      console.error('Create student registration error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to register student.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCodeOnly = () => {
    if (!createdInvitation) return;
    navigator.clipboard.writeText(createdInvitation.token);
    setCopiedCode(true);
    showToast('Activation code copied to clipboard!', 'info');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const copyActivationLink = () => {
    if (!createdInvitation) return;
    const link = `${window.location.origin}/activate?token=${createdInvitation.token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast('Direct activation link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyFullSlip = () => {
    if (!createdInvitation) return;
    const advisorName = advisors.find((a) => a.id === createdInvitation.advisorId)?.displayName || 'Unassigned';
    const slipText = `===========================================
UNIVERSITY ACADEMIC REGISTRATION SLIP
===========================================
Student Name:     ${createdInvitation.displayName || '—'}
Official ID:      ${createdInvitation.officialStudentId}
Email Address:    ${createdInvitation.email}
Department:       ${createdInvitation.department}
Batch & Section:  Batch ${createdInvitation.batch} (Sec ${createdInvitation.section || 'A'})
Academic Level:   ${createdInvitation.level || 'Level 1, Term 1'}
Academic Advisor: ${advisorName}

ACTIVATION CODE:  ${createdInvitation.token}
ACTIVATION LINK:  ${window.location.origin}/activate?token=${createdInvitation.token}

INSTRUCTIONS:
1. Open the Activation Link above.
2. Confirm your Student ID and set your account password.
3. Once completed, your student dashboard and courses will be accessible.
===========================================`;

    navigator.clipboard.writeText(slipText);
    setCopiedSlip(true);
    showToast('Full student registration slip copied to clipboard!', 'success');
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInvitation ? 'Student Registered & Activation Code Issued' : 'Register New Student (Institutional Form)'}
      description={
        createdInvitation
          ? 'The student has been officially registered in the university system. Share the activation credentials below.'
          : 'Complete the institutional student enrollment form. An official one-time activation token will be generated for password setup.'
      }
      maxWidth="lg"
    >
      {createdInvitation ? (
        <div className="space-y-4 py-1">
          {/* Success Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#006834]">
              <CheckCircle2 size={18} className="text-[#00a651]" />
              <span>Student Registration Complete & Enrolled</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-emerald-100">
              <div>
                <span className="text-slate-400 text-2xs block">Full Name:</span>
                <span className="font-semibold text-slate-900">{createdInvitation.displayName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Official Student ID:</span>
                <span className="font-semibold text-slate-900 font-mono">{createdInvitation.officialStudentId}</span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Official Email:</span>
                <span className="font-semibold text-slate-900 truncate block">{createdInvitation.email}</span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Department:</span>
                <span className="font-semibold text-slate-900">{createdInvitation.department}</span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Batch & Section:</span>
                <span className="font-semibold text-slate-900">
                  Batch {createdInvitation.batch} (Sec {createdInvitation.section || 'A'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Assigned Advisor:</span>
                <span className="font-semibold text-slate-900">
                  {advisors.find((a) => a.id === createdInvitation.advisorId)?.displayName || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Activation Code Highlight */}
            <div className="space-y-1.5 pt-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-900">
                Official Student Activation Code:
              </span>
              <div className="p-3 bg-white border-2 border-emerald-500 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                <span className="font-mono text-base font-extrabold text-[#006834] tracking-wide select-all">
                  {createdInvitation.token}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copyCodeOnly}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006834] rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyActivationLink}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-100/60 rounded-md text-[11px] text-[#006834] flex items-start gap-2">
              <ShieldCheck size={15} className="shrink-0 mt-0.5" />
              <span>
                Provide this activation code to the student. They will visit the <strong>Student Activation</strong> page, verify their ID, and set their password to complete registration.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={copyFullSlip}
              className="gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              {copiedSlip ? <Check size={14} className="text-emerald-600" /> : <FileText size={14} />}
              <span>{copiedSlip ? 'Slip Copied to Clipboard' : 'Copy Student Registration Slip'}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
              <Button
                onClick={() => {
                  handleReset();
                }}
              >
                Register Another Student
              </Button>
            </div>
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
            <FormField label="Student Full Name" required hint="e.g. Md. Tanvir Ahmed">
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full Legal Name"
                required
              />
            </FormField>

            <FormField label="Official Student ID / Roll" required hint="e.g. CSE-2026-001">
              <Input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="CSE-2026-001"
                className="uppercase font-mono"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Official / Institutional Email" required hint="Used for activation & notices">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
              />
            </FormField>

            <FormField label="Contact Phone Number" hint="Optional student phone">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1712-345678"
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
                    <option value="CSE">CSE - Computer Science & Engineering</option>
                    <option value="EEE">EEE - Electrical & Electronic Engineering</option>
                    <option value="ME">ME - Mechanical Engineering</option>
                  </>
                )}
              </Select>
            </FormField>

            <FormField label="Academic Level & Term" required>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Admission Batch" required hint="Year / Batch">
              <Input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="2026"
                required
              />
            </FormField>

            <FormField label="Assigned Section" required hint="e.g. A, B">
              <Input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                className="uppercase"
                required
              />
            </FormField>

            <FormField label="Academic Advisor" hint="Optional initial advisor">
              <Select
                value={advisorId}
                onChange={(e) => setAdvisorId(e.target.value)}
              >
                <option value="">-- Unassigned --</option>
                {advisors.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.displayName} ({adv.departmentId || adv.assignedDepartment || 'Faculty'})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
            <UserCheck size={16} className="shrink-0 mt-0.5 text-[#00a651]" />
            <span>
              <strong>Registration Policy:</strong> Submitting this form creates the student's official university record and issues a one-time activation token. The student will just set their password at <code>/activate</code> to complete account onboarding.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
              <UserPlus size={14} />
              <span>Complete Registration & Issue Code</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
