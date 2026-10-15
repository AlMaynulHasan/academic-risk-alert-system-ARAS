import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { School, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { StudentInvitation } from '../../../shared/types';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';

export const ActivatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activateAccount } = useAuth();

  const [tokenInput, setTokenInput] = useState('');
  const [invitation, setInvitation] = useState<StudentInvitation | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize from search parameter if present
  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      setTokenInput(queryToken);
      verifyToken(queryToken);
    }
  }, [searchParams]);

  const verifyToken = async (tok: string) => {
    const cleanTok = tok.trim();
    if (!cleanTok) return;

    setIsVerifying(true);
    setVerificationError(null);
    setInvitation(null);

    try {
      const inv = await academicRecordService.verifyInvitationToken(cleanTok);
      setInvitation(inv);
      if (!displayName) {
        setDisplayName(inv.officialStudentId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired invitation token.';
      setVerificationError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      verifyToken(tokenInput.trim());
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!invitation) {
      setSubmitError('Please verify a valid invitation token first.');
      return;
    }

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await activateAccount({
        token: invitation.token,
        password,
        displayName: displayName.trim() || invitation.officialStudentId,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1500);
    } catch (err: unknown) {
      console.error('Activation submission error:', err);
      const msg = err instanceof Error ? err.message : 'Account activation failed.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <KeyRound size={26} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Official Student Activation
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Activate your pre-registered academic profile using your institution token.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-lg shadow-xs space-y-6">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Account Activated Successfully!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your credentials have been securely linked to student ID{' '}
                <span className="font-semibold text-slate-800">{invitation?.officialStudentId}</span>.
                Redirecting to your student workspace...
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Token Input & Verification */}
              {!invitation ? (
                <form onSubmit={handleManualVerify} className="space-y-4">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                    <ShieldCheck className="shrink-0 text-blue-600 mt-0.5" size={16} />
                    <span>
                      Students must be pre-registered by university administration. Enter the activation token provided in your official department invitation.
                    </span>
                  </div>

                  <FormField label="Activation Invitation Token" required>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="e.g. ACT-ABC123-XYZ"
                        className="font-mono text-sm uppercase"
                        disabled={isVerifying}
                        required
                      />
                      <Button type="submit" isLoading={isVerifying}>
                        Verify
                      </Button>
                    </div>
                  </FormField>

                  {verificationError && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="shrink-0 mt-0.5 text-red-500" size={16} />
                      <div>{verificationError}</div>
                    </div>
                  )}

                  <div className="pt-2 text-center text-xs text-slate-500">
                    Already activated your account?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign in here
                    </Link>
                  </div>
                </form>
              ) : (
                /* Step 2: Confirmation & Password Setup */
                <form onSubmit={handleActivateSubmit} className="space-y-5">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Verified Official Student Record</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                      <div>
                        <span className="text-slate-400 block">Student ID:</span>
                        <span className="font-semibold text-slate-900">{invitation.officialStudentId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Department:</span>
                        <span className="font-semibold text-slate-900">{invitation.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Official Email:</span>
                        <span className="font-semibold text-slate-900 truncate block">{invitation.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Batch / Level:</span>
                        <span className="font-semibold text-slate-900">
                          {invitation.batch} {invitation.level ? `(${invitation.level})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <FormField label="Full Name" required>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Rahim Ahmed"
                      required
                    />
                  </FormField>

                  <FormField label="Set Password" required hint="At least 6 characters">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </FormField>

                  <FormField label="Confirm Password" required>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </FormField>

                  {submitError && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="shrink-0 mt-0.5 text-red-500" size={16} />
                      <div>{submitError}</div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/3"
                      onClick={() => setInvitation(null)}
                      disabled={isSubmitting}
                    >
                      Change Token
                    </Button>
                    <Button type="submit" className="w-2/3" isLoading={isSubmitting}>
                      Complete Activation
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
