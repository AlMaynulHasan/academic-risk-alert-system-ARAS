import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { Department, User, UserRole } from '../../../shared/types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { getCurrentUtcIso } from '../../../shared/utils/date';
import { AlertCircle, UserPlus, Key, RefreshCw, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onCreated: (createdUser: User) => void;
}

export const CreateTeacherModal: React.FC<CreateTeacherModalProps> = ({
  isOpen,
  onClose,
  departments,
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.code || 'CSE');
  const [designation, setDesignation] = useState('Lecturer');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [password, setPassword] = useState('FacultyPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [officeRoom, setOfficeRoom] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Full Name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('A valid institutional email address is required.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const now = getCurrentUtcIso();
    const cleanEmail = email.trim().toLowerCase();
    const sanitizedId = `faculty_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    const newTeacher: User = {
      id: sanitizedId,
      email: cleanEmail,
      displayName: displayName.trim(),
      role: role,
      departmentId: departmentId,
      assignedDepartment: departmentId,
      designation: designation,
      employeeId: employeeId.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      phone: phone.trim() || undefined,
      officeRoom: officeRoom.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      // 1. Persist to Firestore users collection
      await setDoc(doc(db, 'users', sanitizedId), {
        ...newTeacher,
        passwordHash: password, // For evaluation and credential lookup
        createdBy: user?.id || 'admin',
      }, { merge: true });

      // 2. Register into local demo users registry so immediate login works seamlessly
      try {
        const storedDemoUsers = JSON.parse(localStorage.getItem('aras_demo_registered_users') || '{}');
        storedDemoUsers[cleanEmail] = {
          user: newTeacher,
          password: password,
        };
        localStorage.setItem('aras_demo_registered_users', JSON.stringify(storedDemoUsers));
      } catch (localErr) {
        console.warn('Could not cache demo credentials:', localErr);
      }

      showToast(`Faculty member "${displayName}" created successfully as ${role.toUpperCase()}!`, 'success');
      onCreated(newTeacher);
      onClose();

      // Reset form fields
      setDisplayName('');
      setEmail('');
      setEmployeeId('');
      setPhone('');
      setOfficeRoom('');
    } catch (err: unknown) {
      console.error('Error creating teacher:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create teacher account.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Faculty Member / Teacher"
      description="Register an institutional course instructor or academic advisor with assigned department and role credentials."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Full Name & Academic Title" required hint="e.g. Dr. Tariqul Islam">
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Engr. Tanvir Ahmed"
              required
            />
          </FormField>

          <FormField label="Institutional Email" required hint="e.g. tanvir.cse@university.edu">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="faculty@university.edu"
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Department" required>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.length === 0 ? (
                <>
                  <option value="CSE">Computer Science & Engineering (CSE)</option>
                  <option value="EEE">Electrical & Electronic Engineering (EEE)</option>
                  <option value="CE">Civil Engineering (CE)</option>
                  <option value="BBA">Business Administration (BBA)</option>
                  <option value="ME">Mechanical Engineering (ME)</option>
                </>
              ) : (
                departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))
              )}
            </Select>
          </FormField>

          <FormField label="Academic Designation" required>
            <Select value={designation} onChange={(e) => setDesignation(e.target.value)}>
              <option value="Lecturer">Lecturer</option>
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Professor">Professor</option>
              <option value="Head of Department">Head of Department</option>
              <option value="Adjunct Faculty">Adjunct Faculty</option>
            </Select>
          </FormField>

          <FormField label="System Role" required hint="Permissions scope">
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="teacher">Course Teacher (Attendance & Marks)</option>
              <option value="advisor">Faculty Advisor (Advising & Risk)</option>
              <option value="dept_admin">Department Administrator</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Faculty / Employee Code" hint="Optional, auto-generated if blank">
            <Input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. FAC-CSE-26"
            />
          </FormField>

          <FormField label="Contact Phone" hint="Optional">
            <Input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1700 000000"
            />
          </FormField>

          <FormField label="Office Room / Desk" hint="Optional">
            <Input
              type="text"
              value={officeRoom}
              onChange={(e) => setOfficeRoom(e.target.value)}
              placeholder="Room 402, Academic Bldg"
            />
          </FormField>
        </div>

        {/* Initial Credentials Setup */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Key size={14} className="text-[#00a651]" />
              <span>Initial Login Password</span>
            </span>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="text-[11px] text-[#008744] hover:text-[#006834] font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} />
              <span>Generate Secure Key</span>
            </button>
          </div>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter minimum 6 characters password"
              className="pr-10 font-mono text-xs"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            The faculty member can change this password after logging into their portal.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
            <UserPlus size={15} />
            <span>Create Faculty Account</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
