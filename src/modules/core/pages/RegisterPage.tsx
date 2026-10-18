import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, KeyRound, ShieldAlert, ArrowRight, CheckCircle2, Building2, LogIn } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { FormField } from '../../../shared/ui/FormField';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (clean) {
      navigate(`/activate?token=${encodeURIComponent(clean)}`);
    } else {
      navigate('/activate');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#00a651] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#00a651] flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-500/50">
            <School size={28} />
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Student Registration Notice
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Centralized Academic Onboarding & Official Student Account Activation
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0 space-y-4">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-xl shadow-xs space-y-6">
          {/* Institutional Policy Notice */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 text-[#006834] font-bold text-xs">
              <Building2 size={16} className="text-[#00a651]" />
              <span>Admin-Driven Institutional Enrollment</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              In accordance with university academic regulations, <strong>student registration is conducted centrally by the Academic Administration Office</strong>. Open self-registration has been disabled to preserve academic record integrity.
            </p>
            <p className="leading-relaxed text-slate-600">
              When your department registers your student record, you will be issued your official <strong>Student ID</strong> and a secure <strong>Activation Code</strong>.
            </p>
          </div>

          {/* Quick Token Entry to Set Password */}
          <form onSubmit={handleTokenSubmit} className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-900">
                Have your Activation Code from the Admin / Department?
              </label>
              <p className="text-2xs text-slate-500">
                Enter your code below to verify your student record and set your account password.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. ACT-ABC123-XYZ"
                className="font-mono text-sm uppercase"
              />
              <Button type="submit" className="gap-1.5 shrink-0">
                <span>Set Password</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>

          {/* 3-Step Process Guide */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              How Student Registration Works
            </div>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006834] font-bold text-2xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Admin Registration:</strong> Academic administrator or department registers your academic record in the Admin Portal.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006834] font-bold text-2xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Receive Activation Code:</strong> You receive your official Student ID and one-time Activation Code.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006834] font-bold text-2xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Set Password:</strong> You enter the code on the activation page, set your password, and instantly log in to your dashboard.
                </span>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <Link
              to="/activate"
              className="text-[#008744] hover:text-[#006834] font-semibold flex items-center gap-1"
            >
              <KeyRound size={14} />
              <span>Go to Account Activation</span>
            </Link>

            <Link
              to="/login"
              className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <LogIn size={14} />
              <span>Already activated? Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
