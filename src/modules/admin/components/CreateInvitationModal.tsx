import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { StudentInvitation, Department, User } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { getCurrentUtcIso } from '../../../shared/utils/date';
import {
  AlertCircle,
  UserPlus,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  FileText,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from 'lucide-react';
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

  // Immediate Activation & Password
  const [instantActivate, setInstantActivate] = useState(true);
  const [password, setPassword] = useState('StudentPass2026!');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [createdInvitation, setCreatedInvitation] = useState<StudentInvitation | null>(null);
  const [wasInstantActivated, setWasInstantActivated] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const handleReset = () => {
    setDisplayName('');
    setStudentId('');
    setEmail('');
    setPhone('');
    setAdvisorId('');
    setPassword('StudentPass2026!');
    setCreatedInvitation(null);
    setWasInstantActivated(false);
    setSavedPassword('');
    setCopiedCode(false);
    setCopiedLink(false);
    setCopiedSlip(false);
    setCopiedCredentials(false);
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

    if (instantActivate && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanStudentId = studentId.trim().toUpperCase();
    const sanitizedUid = `student_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
    const now = getCurrentUtcIso();

    try {
      // 1. Create student invitation record
      let inv = await academicRecordService.createStudentInvitation(
        {
          officialStudentId: cleanStudentId,
          displayName: displayName.trim(),
          email: cleanEmail,
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

      if (instantActivate) {
        // 2. Claim token immediately & auto-enroll
        const claimResult = await academicRecordService.claimInvitationToken(
          inv.token,
          sanitizedUid,
          cleanStudentId
        );
        inv = claimResult.invitation;

        // 3. Create active Student User doc
        const newStudentUser: User = {
          id: sanitizedUid,
          email: cleanEmail,
          displayName: displayName.trim(),
          role: 'student',
          departmentId: department,
          assignedDepartment: department,
          phone: phone.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };

        // Cache in local storage for instant login
        try {
          const storedDemoUsers = JSON.parse(localStorage.getItem('aras_demo_registered_users') || '{}');
          storedDemoUsers[cleanEmail] = {
            user: newStudentUser,
            password: password,
            profile: claimResult.profile,
          };
          localStorage.setItem('aras_demo_registered_users', JSON.stringify(storedDemoUsers));
        } catch (localErr) {
          console.warn('Could not cache student demo credentials:', localErr);
        }

        // Persist to Firestore
        try {
          await setDoc(doc(db, 'users', sanitizedUid), {
            ...newStudentUser,
            passwordHash: password,
            createdBy: user?.id || 'admin',
          }, { merge: true });
        } catch (fsErr) {
          console.warn('Firestore setDoc student note:', fsErr);
        }

        setWasInstantActivated(true);
        setSavedPassword(password);
        showToast(`Student "${displayName}" registered, activated, and enrolled in courses!`, 'success');
      } else {
        setWasInstantActivated(false);
        showToast('Student registered successfully! Activation code generated.', 'success');
      }

      setCreatedInvitation(inv);
      onCreated(inv);
    } catch (err: unknown) {
      console.error('Create student registration error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to register student.';
      setError(msg);
      showToast(msg, 'error');
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

  const copyCredentials = () => {
    if (!createdInvitation) return;
    const creds = `Email: ${createdInvitation.email}\nPassword: ${savedPassword}\nStudent ID: ${createdInvitation.officialStudentId}`;
    navigator.clipboard.writeText(creds);
    setCopiedCredentials(true);
    showToast('Login credentials copied to clipboard!', 'success');
    setTimeout(() => setCopiedCredentials(false), 2500);
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

${wasInstantActivated ? `ACCOUNT STATUS:   ACTIVE & READY TO LOGIN
LOGIN PASSWORD:   ${savedPassword}
LOGIN URL:        ${window.location.origin}/login` : `ACTIVATION CODE:  ${createdInvitation.token}
ACTIVATION LINK:  ${window.location.origin}/activate?token=${createdInvitation.token}`}

INSTRUCTIONS:
1. Log in at the student portal with your institutional email and password.
2. View enrolled courses, daily attendance rate, and continuous assessment marks.
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
      title={createdInvitation ? (wasInstantActivated ? 'Student Enrolled & Activated Successfully' : 'Student Registered & Code Issued') : 'Register New Student (Institutional Form)'}
      description={
        createdInvitation
          ? 'The student has been officially registered in the university system and courses have been linked.'
          : 'Complete the institutional student enrollment form with auto-course enrollment and optional instant activation.'
      }
      maxWidth="lg"
    >
      {createdInvitation ? (
        <div className="space-y-4 py-1">
          {/* Success Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#006834]">
              <CheckCircle2 size={18} className="text-[#00a651]" />
              <span>{wasInstantActivated ? 'Student Account Active & Ready to Login' : 'Registration Complete & Activation Token Issued'}</span>
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

            {/* Instant Login Credentials Strip */}
            {wasInstantActivated && savedPassword && (
              <div className="p-3 bg-white border-2 border-emerald-500 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Key size={14} className="text-[#00a651]" />
                    <span>Instant Login Credentials</span>
                  </span>
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#006834] rounded text-xs font-semibold cursor-pointer"
                  >
                    {copiedCredentials ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedCredentials ? 'Copied' : 'Copy Credentials'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-2xs block font-sans">Login Email:</span>
                    <span className="font-semibold text-slate-900">{createdInvitation.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs block font-sans">Password:</span>
                    <span className="font-semibold text-[#006834]">{savedPassword}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Activation Code Highlight */}
            {!wasInstantActivated && (
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
            )}

            <div className="p-2.5 bg-emerald-100/60 rounded-md text-[11px] text-[#006834] flex items-start gap-2">
              <ShieldCheck size={15} className="shrink-0 mt-0.5" />
              <span>
                {wasInstantActivated
                  ? 'Courses for the current semester have been automatically enrolled. The student can log in directly at the Student Portal!'
                  : 'Provide this activation code to the student. They will visit the Student Activation page, verify their ID, and set their password to complete registration.'}
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
            <FormField label="Official / Institutional Email" required hint="Used for student login & notices">
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
                    <option value="CE">CE - Civil Engineering</option>
                    <option value="BBA">BBA - Business Administration</option>
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

            <FormField label="Academic Advisor" hint="Optional advisor">
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

          {/* Instant Activation with Password Checkbox & Field */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={instantActivate}
                onChange={(e) => setInstantActivate(e.target.checked)}
                className="h-4 w-4 rounded text-[#00a651] focus:ring-[#00a651]"
              />
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#00a651]" />
                <span>Activate Immediately with Initial Password (Recommended)</span>
              </span>
            </label>

            {instantActivate && (
              <div className="space-y-2 pt-1 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key size={13} className="text-[#00a651]" />
                    <span>Student Initial Password</span>
                  </span>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-[#008744] hover:text-[#006834] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Generate Secure Key</span>
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter minimum 6 characters password"
                    className="pr-10 font-mono text-xs"
                    required={instantActivate}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Direct activation creates the student account immediately and auto-enrolls them in their department's term courses.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
              <UserPlus size={14} />
              <span>{instantActivate ? 'Register & Activate Student' : 'Generate Activation Token'}</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
