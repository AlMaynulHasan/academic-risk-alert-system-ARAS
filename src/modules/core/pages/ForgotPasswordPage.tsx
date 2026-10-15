import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { School, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../shared/firebase';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      // Security Requirement:
      // Generic response that does NOT reveal whether an email exists.
      // Log internally for debugging, but always show the identical generic outcome to prevent email enumeration.
      console.warn('Password reset flow executed for target email:', err);
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <School size={28} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Reset Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Academic Risk Alert System recovery service
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-lg shadow-xs">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Request Processed</h3>
              <p className="text-xs text-slate-600 leading-normal">
                If an account exists for <span className="font-semibold text-slate-800">{email}</span>, a secure password reset link has been dispatched to that inbox. Please check your spam folder if it does not appear within a few minutes.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <ArrowLeft size={14} /> Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Registered University Email"
                required
                hint="Enter your registered academic email address"
              >
                <Input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <Button type="submit" isLoading={isLoading} className="w-full mt-2">
                <KeyRound size={15} className="mr-2" />
                Send Password Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Return to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
