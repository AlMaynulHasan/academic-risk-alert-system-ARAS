import React, { useState, useEffect } from 'react';
import { useAuth } from '../../core/AuthContext';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader } from '../../../shared/ui/Card';
import { FormField } from '../../../shared/ui/FormField';
import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useToast } from '../../../shared/ui/Toast';
import { StudentProfile } from '../../../shared/types';
import { Lock, Shield, AlertCircle, CheckCircle2, ShieldCheck, FileCheck2 } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, profile: authProfile, role, changePassword } = useAuth();
  const { showToast } = useToast();

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(authProfile);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password Change form state (Exclusive permitted self-service action)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setLoadingProfile(true);
      academicRecordService
        .getStudentProfile(user.id)
        .then((p) => {
          if (p) {
            setStudentProfile(p);
          } else if (authProfile) {
            setStudentProfile(authProfile);
          }
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [user?.id, authProfile]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword) {
      setPassError('Please enter your current password for security verification.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPassSuccess('Account password changed successfully.');
      showToast('Your account security password has been updated.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      console.error('Change password error:', err);
      const msg =
        err instanceof Error
          ? err.message.includes('wrong-password') || err.message.includes('invalid-credential')
            ? 'Current password is incorrect.'
            : err.message
          : 'Unable to change password.';
      setPassError(msg);
      showToast(msg, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Determine display values without hardcoding other student records
  const officialName = user?.displayName || studentProfile?.studentId || 'Enrolled Student';
  const officialId = studentProfile?.studentId || user?.displayName || 'Pending Official ID';
  const officialDept = studentProfile?.department || 'Computer Science & Engineering';
  const officialBatch = studentProfile?.batch || '2026';
  const officialLevel = studentProfile?.level || 'Level 1, Term 1';
  const officialEmail = user?.email || '';

  // CGPA: If null or undefined (new student), display N/A - NEVER hardcode to 3.42!
  const cgpaDisplay =
    studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined
      ? studentProfile.cgpa.toFixed(2)
      : 'N/A (Pending Semester Evaluation)';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Student Profile & Security"
        description="View officially verified university academic credentials and manage your account password."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Profile' }]}
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Section 1: Institutional Academic Identification (Read-Only) */}
        <Card>
          <CardHeader
            title="Official Academic Identification"
            subtitle="Verified credentials registered with the University Academic Council and Examination Controller"
            action={
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Verified Official Record</span>
              </div>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FormField label="Official Student Name">
              <Input
                disabled
                value={officialName}
                className="bg-slate-50 font-semibold text-xs text-slate-800"
              />
            </FormField>

            <FormField label="University Student ID / Roll">
              <Input
                disabled
                value={officialId}
                className="bg-slate-50 font-mono text-xs font-semibold text-slate-800"
              />
            </FormField>

            <FormField label="Academic Department">
              <Input
                disabled
                value={officialDept}
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Academic Level & Term">
              <Input
                disabled
                value={officialLevel}
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Admission Batch / Year">
              <Input
                disabled
                value={officialBatch}
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Current Semester Session">
              <Input
                disabled
                value="Spring 2026"
                className="bg-slate-50 text-xs text-slate-800 font-medium"
              />
            </FormField>

            <FormField label="Cumulative GPA (CGPA)">
              <Input
                disabled
                value={cgpaDisplay}
                className={`bg-slate-50 font-mono text-xs font-semibold ${
                  studentProfile?.cgpa === null || studentProfile?.cgpa === undefined
                    ? 'text-slate-500 italic'
                    : 'text-slate-900'
                }`}
              />
            </FormField>

            <FormField label="University Institutional Email">
              <Input
                disabled
                value={officialEmail}
                className="bg-slate-50 text-xs text-slate-700"
              />
            </FormField>

            <FormField label="Account Role & Privileges">
              <div className="pt-1.5 flex items-center gap-2">
                <StatusBadge status={role || 'student'} variant="info" />
                <span className="text-[11px] text-slate-500">Fixed Student Advisee</span>
              </div>
            </FormField>
          </div>

          {/* Institutional Integrity Notice */}
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <FileCheck2 size={15} className="text-blue-600" />
              <span>Transcript & Certificate Integrity Policy</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Official identity attributes (Student Name, Registration Roll ID, Department, Batch, and Cumulative GPA) are permanently locked against student self-modification. This institutional safeguard prevents discrepancies on official transcripts, semester grade sheets, and degree certificates. For official corrections, please contact the Office of the Controller of Examinations or your Department Coordinator.
            </p>
          </div>
        </Card>

        {/* Section 2: Account Security - Change Password (Permitted Self-Service) */}
        <Card>
          <CardHeader
            title="Account Security & Password Management"
            subtitle="Update your student portal login password with verification of your current password"
          />

          {passSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="Current Password"
                required
                hint="Required for verification"
              >
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </FormField>

              <FormField
                label="New Password"
                required
                hint="Minimum 6 characters"
              >
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                required
              >
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </FormField>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Shield size={14} className="text-blue-600 shrink-0" />
                <span>Password changes take effect immediately across all active portal sessions.</span>
              </span>

              <Button
                type="submit"
                size="sm"
                isLoading={isChangingPass}
                className="gap-1.5 text-xs px-4"
              >
                <Lock size={14} /> Update Account Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
