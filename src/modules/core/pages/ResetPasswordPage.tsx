import React from 'react';
import { Link } from 'react-router-dom';
import { School, ArrowLeft } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';

export const ResetPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <School size={28} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Password Reset Completion
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Academic Risk Alert System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-lg shadow-xs text-center space-y-4">
          <p className="text-xs text-slate-600 leading-normal">
            Password reset confirmation is handled directly via the secure link sent to your email inbox by Firebase Authentication.
          </p>

          <Link to="/login" className="inline-block pt-2">
            <Button variant="primary" size="sm" className="gap-2">
              <ArrowLeft size={14} /> Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
