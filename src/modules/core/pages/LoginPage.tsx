import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  HelpCircle,
  Calendar,
  Database,
  Building2,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginDemoUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const routeByRole = (role: string) => {
    if (role === 'teacher') {
      navigate('/teacher/dashboard');
    } else if (role === 'admin' || role === 'university_admin' || role === 'dept_admin') {
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
      const cleanEmail = email.trim();
      const role = await login(cleanEmail, password);
      routeByRole(role);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential')
      ) {
        setError('Invalid university email or password. Please check your credentials or select a demo profile below.');
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

  const handleQuickDemo = async (demoEmail: string, defaultPass = 'Pass1234!') => {
    setEmail(demoEmail);
    setPassword(defaultPass);
    setIsLoading(true);
    setError(null);
    try {
      const role = await loginDemoUser(demoEmail);
      routeByRole(role);
    } catch (err: unknown) {
      console.error('Quick demo login error:', err);
      setError('Could not sign in: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
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
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-900 antialiased selection:bg-[#00a651] selection:text-white">
      {/* Top University Institutional Header */}
      <header className="bg-[#053321] text-white border-b border-[#08452c] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00a651] text-white flex items-center justify-center shadow-md ring-2 ring-emerald-400/30 group-hover:scale-105 transition-transform">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">University Portal</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ARAS
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/70 hidden sm:block">
                Academic Information & Advising System
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-2 text-emerald-100 bg-[#032517] px-3 py-1.5 rounded-lg border border-[#08452c]">
              <Calendar size={14} className="text-[#00a651]" />
              <span>Academic Year 2026 • Spring Semester</span>
            </div>
            <Link
              to="/"
              className="text-xs text-emerald-200 hover:text-white font-medium transition-colors"
            >
              Portal Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Centered Authentication Section */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center space-y-4 my-auto">
        {/* Gateway Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#006834] text-xs font-semibold shadow-2xs">
          <Building2 size={14} className="text-[#00a651]" />
          <span>Official Student & Faculty Gateway</span>
        </div>

        {/* Clean University Sign-In Card */}
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.08),0_2px_4px_-2px_rgba(15,23,42,0.06)]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your institutional credentials to continue
              </p>
            </div>

            {/* Success and Error Alerts */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <span className="font-semibold text-emerald-600">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="University Email or Student ID" required>
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
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-[#00a651] focus:ring-[#00a651] h-3.5 w-3.5" defaultChecked />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-[#008744] hover:text-[#006834] font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full mt-2">
                <LogIn size={15} className="mr-2" />
                Sign In to Portal
              </Button>
            </form>

            {/* Google Single Sign-On */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or institutional SSO</span>
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
              Sign in with Google Account
            </Button>

            {/* Quick Test Profiles for Evaluators */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Access Profiles
                </span>
                <button
                  type="button"
                  onClick={handleSeedDatabase}
                  disabled={isLoading}
                  className="text-[11px] text-[#008744] hover:text-[#006834] font-medium flex items-center gap-1 cursor-pointer"
                  title="Reload default sample records"
                >
                  <Database size={11} />
                  <span>Reset Sample Data</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('student01@example.edu')}
                  disabled={isLoading}
                  className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 text-[11px]">Student</div>
                  <div className="text-[10px] text-slate-500">Rahim Ahmed</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('student02@example.edu')}
                  disabled={isLoading}
                  className="p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-amber-800 text-[11px]">At-Risk Student</div>
                  <div className="text-[10px] text-slate-500">Fatima Khan</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('teacher01@example.edu')}
                  disabled={isLoading}
                  className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 text-[11px]">Faculty Advisor</div>
                  <div className="text-[10px] text-slate-500">Dr. Tariqul Islam</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('maynulhasan625@gmail.com')}
                  disabled={isLoading}
                  className="p-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 text-[11px]">Administrator</div>
                  <div className="text-[10px] text-slate-500">System Admin</div>
                </button>
              </div>
            </div>

            {/* Registration & Activation Link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
              New student pre-registered by Admin?{' '}
              <Link to="/activate" className="text-[#008744] hover:text-[#006834] font-semibold">
                Activate account with token &rarr;
              </Link>
            </div>
          </div>

          {/* Quick Help Strip */}
          <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs gap-1.5">
            <span className="flex items-center gap-1.5">
              <HelpCircle size={14} className="text-slate-400" />
              <span>Need login assistance? Contact ICT Helpdesk</span>
            </span>
            <span className="font-semibold text-[#008744]">helpdesk@university.edu</span>
          </div>
        </div>
      </main>

      {/* University Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">University Academic Information System</span>
            <span>•</span>
            <span>All rights reserved</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 transition-colors">IT Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
