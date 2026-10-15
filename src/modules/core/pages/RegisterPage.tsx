import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { FormField } from '../../../shared/ui/FormField';
import { DEPARTMENTS, ACADEMIC_LEVELS } from '../../../shared/constants';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [level, setLevel] = useState<string>(ACADEMIC_LEVELS[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (displayName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!studentId.trim()) {
      setError('Student ID is required (e.g. CSE-2022-041).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        studentId: studentId.trim().toUpperCase(),
        department,
        level,
      });
      navigate('/student/dashboard');
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <School size={28} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Student Registration
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enroll in the Academic Risk Alert System. Role is strictly assigned as Student.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-lg shadow-xs">
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800">
            <div>
              <span className="font-semibold block text-blue-900">Official Student Pre-Registration</span>
              Received an invitation token from your department?
            </div>
            <Link
              to="/activate"
              className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-white border border-blue-300 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-2xs"
            >
              Activate Here &rarr;
            </Link>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Md. Tanvir Ahmed"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </FormField>

              <FormField label="Student ID" required hint="University roll / reg number">
                <Input
                  type="text"
                  required
                  placeholder="e.g. CSE-2022-041"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="University Email" required hint="e.g. student@university.edu">
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Department" required>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Password" required hint="At least 6 characters">
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>

              <FormField label="Confirm Password" required>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormField>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong>Role & Permission Notice:</strong> All self-registrations are strictly configured with the <code className="text-blue-700 font-semibold">student</code> role. Teacher and Administrator accounts cannot be self-selected.
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full mt-2">
              <UserPlus size={15} className="mr-2" />
              Complete Student Registration
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
