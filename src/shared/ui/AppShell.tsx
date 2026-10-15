import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  TrendingUp,
  Bell,
  User as UserIcon,
  Users,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  School,
} from 'lucide-react';
import { useAuth } from '../../modules/core/AuthContext';
import { STUDENT_NAV, TEACHER_NAV, ADMIN_NAV } from '../constants';
import { Button } from './Button';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  BookOpen: <BookOpen size={18} />,
  CalendarCheck: <CalendarCheck size={18} />,
  GraduationCap: <GraduationCap size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  Bell: <Bell size={18} />,
  User: <UserIcon size={18} />,
  Users: <Users size={18} />,
  ShieldAlert: <ShieldAlert size={18} />,
  ShieldCheck: <ShieldCheck size={18} />,
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems =
    role === 'student'
      ? STUDENT_NAV
      : role === 'teacher'
      ? TEACHER_NAV
      : role === 'admin'
      ? ADMIN_NAV
      : [];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const roleLabel =
    role === 'student'
      ? 'Student'
      : role === 'teacher'
      ? 'Faculty Advisor'
      : role === 'admin'
      ? 'Administrator'
      : '';

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col font-sans text-slate-900 antialiased">
      {/* Top Header */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs ring-1 ring-blue-500/50">
              <School size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                ARAS
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Academic Risk Alert System</span>
            </div>
          </div>
        </div>

        {/* User Account & Actions */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.displayName || user.email}
                </span>
                <span className="text-[11px] text-blue-700 font-semibold leading-tight">
                  {roleLabel}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#0b1329] text-white border border-slate-700/80 flex items-center justify-center text-xs font-semibold shadow-xs">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1.5 p-2 h-8"
                title="Sign out of system"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar with Deep Navy University Palette */}
        <aside className="hidden md:flex flex-col w-64 bg-[#0b1329] border-r border-slate-800 p-4 shrink-0 shadow-sm text-slate-200">
          <div className="mb-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {role === 'student' ? 'Student Workspace' : role === 'teacher' ? 'Advisor Workspace' : 'System Administration'}
          </div>

          <nav className="space-y-1.5" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-500/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {iconMap[item.iconName] || <LayoutDashboard size={18} />}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 text-[11px] text-slate-300 space-y-1 shadow-xs">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span>Institutional Timezone</span>
              </div>
              <div className="text-slate-300 font-mono text-[11px]">Asia/Dhaka (UTC+6)</div>
              <div className="text-[10px] text-slate-400">Evaluation quota anchored</div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-64 bg-[#0b1329] text-white h-full p-4 flex flex-col border-r border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                    <School size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">ARAS Portal</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-500/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>
                        {iconMap[item.iconName] || <LayoutDashboard size={18} />}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-center text-xs text-red-300 border-slate-700 bg-slate-900/80 hover:bg-red-950/40 hover:text-red-200"
                >
                  <LogOut size={14} className="mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
