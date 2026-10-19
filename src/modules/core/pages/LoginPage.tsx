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
  KeyRound,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginDemoUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
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

            {/* Registration & Activation Link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
              New student pre-registered by Admin?{' '}
              <Link to="/activate" className="text-[#008744] hover:text-[#006834] font-semibold underline decoration-emerald-300">
                Activate account with token &rarr;
              </Link>
            </div>

            {/* Collapsible Demo / Test Credentials Panel */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/90 rounded-lg border border-slate-200 text-xs text-slate-700 transition-colors font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <KeyRound size={13} className="text-[#00a651]" />
                  <span>Test Accounts & Login Credentials</span>
                </span>
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <span>{showDemoCredentials ? 'Hide' : 'View Passwords'}</span>
                  {showDemoCredentials ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </span>
              </button>

              {showDemoCredentials && (
                <div className="mt-2.5 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Universal Test Password:</span>
                      <code className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 select-all">
                        Pass1234!
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleSeedDatabase}
                      disabled={isLoading}
                      className="text-[#008744] hover:text-[#006834] font-semibold flex items-center gap-1 cursor-pointer text-2xs"
                      title="Reset database records to factory sample"
                    >
                      <Database size={11} />
                      <span>Reset Data</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {/* Administrator */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>Administrator</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">Admin</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600">maynulhasan625@gmail.com</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickDemo('maynulhasan625@gmail.com')}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
                      >
                        Auto-fill & Log In
                      </button>
                    </div>

                    {/* Teacher / Advisor */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>Faculty / Course Teacher</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-[#006834] font-bold">Teacher</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600">teacher01@example.edu</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickDemo('teacher01@example.edu')}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#006834] rounded text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Auto-fill & Log In
                      </button>
                    </div>

                    {/* Student */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>Regular Student (Rahim Ahmed)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">Student</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600">student01@example.edu</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickDemo('student01@example.edu')}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                      >
                        Auto-fill & Log In
                      </button>
                    </div>

                    {/* At-Risk Student */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>At-Risk Student (Fatima Khan)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">At-Risk</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600">student02@example.edu</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickDemo('student02@example.edu')}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-xs font-semibold border border-amber-200 transition-colors cursor-pointer"
                      >
                        Auto-fill & Log In
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
