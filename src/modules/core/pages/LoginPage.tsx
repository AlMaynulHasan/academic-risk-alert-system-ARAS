import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const routeByRole = (role: string) => {
    if (role === 'teacher') {
      navigate('/teacher/dashboard');
    } else if (role === 'admin') {
      navigate('/admin/users');
    } else {
      navigate('/student/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const role = await login(email, password);
      routeByRole(role);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Incorrect email address or password.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const role = await loginWithGoogle();
      routeByRole(role);
    } catch (err: unknown) {
      console.error('Google Sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Pass1234!');
    setIsLoading(true);
    setError(null);
    try {
      const role = await loginDemoUser(demoEmail);
      routeByRole(role);
    } catch (err: unknown) {
      console.error('Quick demo login error:', err);
      setError('Could not sign in demo user: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#0b1329] flex items-center justify-center text-blue-400 shadow-sm border border-slate-700/60 ring-2 ring-blue-500/20">
            <School size={26} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Academic Risk Alert System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Sign in to your university advising & monitoring portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200/90 rounded-2xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.08),0_2px_4px_-2px_rgba(15,23,42,0.06)]">
          {successMessage && (
            <div className="mb-5 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <span className="font-semibold">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address" required>
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="student01@example.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Role-aware automatic redirection</span>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full mt-2">
              <LogIn size={15} className="mr-2" />
              Sign In
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full text-xs"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google Account
            </Button>
          </form>

          {/* Synthetic Demo Accounts Box */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Demo Accounts (Pass1234!)
              </span>
              <button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { seedSyntheticDatabase } = await import('../../../shared/firebase/seed');
                    const res = await seedSyntheticDatabase();
                    setError(null);
                    setSuccessMessage(res.message);
                  } catch (e: unknown) {
                    setError('Seed note: ' + (e instanceof Error ? e.message : String(e)));
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
              >
                Seed/Reset Data
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('student01@example.edu')}
                className="px-2 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-center cursor-pointer transition-colors"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('teacher01@example.edu')}
                className="px-2 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-center cursor-pointer transition-colors"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin01@example.edu')}
                className="px-2 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-center cursor-pointer transition-colors"
              >
                Admin
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Labeled synthetic data only for SE project evaluation
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            New student?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
