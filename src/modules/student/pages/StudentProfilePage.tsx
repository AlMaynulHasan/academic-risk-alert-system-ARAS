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
import { Lock, Save, Shield, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, profile: authProfile, role, updateStudentProfile, changePassword } = useAuth();
  const { showToast } = useToast();

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(authProfile);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Profile Edit form state (permitted fields only)
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(authProfile?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(authProfile?.emergencyContact || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setDisplayName(user.displayName || '');
      setLoadingProfile(true);
      academicRecordService
        .getStudentProfile(user.id)
        .then((p) => {
          if (p) {
            setStudentProfile(p);
            setPhone(p.phone || '');
            setEmergencyContact(p.emergencyContact || '');
          } else if (authProfile) {
            setStudentProfile(authProfile);
            setPhone(authProfile.phone || '');
            setEmergencyContact(authProfile.emergencyContact || '');
          }
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [user?.id, authProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (displayName.trim().length < 2) {
      setProfileError('Display name must be at least 2 characters.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateStudentProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
      });
      setProfileSuccess('Profile updated successfully.');
      showToast('Profile changes saved successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      setPassSuccess('Password changed successfully.');
      showToast('Your account password has been updated.', 'success');
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

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Student Profile & Security"
        description="Review institutional records, update personal contact details, and manage authentication credentials."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Profile' }]}
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Section 1: Institutional Academic Records (Read-Only) */}
        <Card>
          <CardHeader
            title="Academic Identification"
            subtitle="Verified academic attributes governed by the university registrar (Immutable for students)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FormField label="University Student ID">
              <Input
                disabled
                value={studentProfile?.studentId || 'CSE-2022-041'}
                className="bg-slate-50 font-mono text-xs font-semibold text-slate-800"
              />
            </FormField>

            <FormField label="Department">
              <Input
                disabled
                value={studentProfile?.department || 'Computer Science and Engineering'}
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Academic Level">
              <Input
                disabled
                value={studentProfile?.level || 'Level 3, Term 1'}
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Batch / Year">
              <Input
                disabled
                value={studentProfile?.batch || '2022'}
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Current Semester">
              <Input
                disabled
                value="Spring 2026"
                className="bg-slate-50 text-xs text-slate-800"
              />
            </FormField>

            <FormField label="Cumulative GPA">
              <Input
                disabled
                value={studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined ? studentProfile.cgpa.toFixed(2) : '3.42'}
                className="bg-slate-50 font-mono text-xs text-slate-800 font-semibold"
              />
            </FormField>

            <FormField label="Account Role">
              <div className="pt-1.5 flex items-center gap-2">
                <StatusBadge status={role || 'student'} variant="info" />
                <span className="text-[11px] text-slate-500">Fixed student privileges</span>
              </div>
            </FormField>

            <FormField label="Email Address">
              <Input
                disabled
                value={user?.email || 'student01@example.edu'}
                className="bg-slate-50 text-xs text-slate-700"
              />
            </FormField>
          </div>
        </Card>

        {/* Section 2: Editable Student Contact Information (Permitted Fields) */}
        <Card>
          <CardHeader
            title="Personal & Contact Information"
            subtitle="Permitted profile fields editable by student (name, contact phone, emergency contact)"
          />

          {profileSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Full Name" required hint="Display name across student portal">
                <Input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                />
              </FormField>

              <FormField label="Phone Number" hint="Primary mobile contact">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700 000000"
                />
              </FormField>

              <FormField label="Emergency Contact" hint="Parent / guardian telephone">
                <Input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+880 1800 000000"
                />
              </FormField>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" isLoading={isSavingProfile} className="gap-1.5 text-xs">
                <Save size={14} /> Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Section 3: Change Password (Requires recent re-authentication) */}
        <Card>
          <CardHeader
            title="Authentication & Security"
            subtitle="Change account password (Mandatory re-authentication with current password)"
          />

          {passSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="Current Password"
                required
                hint="Required for re-authentication"
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

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Shield size={13} className="text-blue-600" />
                Firebase credential re-authentication protects against unauthorized password takeover.
              </span>

              <Button type="submit" variant="outline" size="sm" isLoading={isChangingPass} className="gap-1.5 text-xs">
                <Lock size={14} /> Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
