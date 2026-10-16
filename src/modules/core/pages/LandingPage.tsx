import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  LogIn,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Users,
  BarChart3,
  BellRing,
  Award,
  ChevronRight,
  School,
  Building2,
  FileCheck2,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, loginDemoUser } = useAuth();
  const [isLoadingRole, setIsLoadingRole] = useState<string | null>(null);

  const handleLaunchRole = async (demoEmail: string, targetPath: string) => {
    setIsLoadingRole(demoEmail);
    try {
      await loginDemoUser(demoEmail);
      navigate(targetPath);
    } catch (e) {
      console.error('Launch role failed:', e);
      navigate('/login');
    } finally {
      setIsLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* University Institutional Masthead */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0b1329] flex items-center justify-center text-white shadow-sm ring-2 ring-blue-500/20">
              <GraduationCap size={22} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">University Portal</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  ARAS
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Academic Information & Advising System
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#overview" className="hover:text-blue-600 transition-colors">Overview</a>
            <a href="#services" className="hover:text-blue-600 transition-colors">Portals & Services</a>
            <a href="#regulations" className="hover:text-blue-600 transition-colors">Academic Regulations</a>
            <a href="#advising" className="hover:text-blue-600 transition-colors">Advising & Support</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {user && role ? (
              <button
                onClick={() => {
                  if (role === 'student') navigate('/student/dashboard');
                  else if (role === 'teacher') navigate('/teacher/dashboard');
                  else navigate('/admin/users');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#0b1329] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Student Activation
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* ========================================================
            HERO SECTION
           ======================================================== */}
        <section id="overview" className="relative bg-[#080e22] text-white overflow-hidden py-16 sm:py-24 border-b border-slate-800">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
          <div className="absolute -top-32 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-6 shadow-sm">
                <Building2 size={14} className="text-blue-400" />
                <span>Spring 2026 Academic Term • University Advisory System</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Student Academic Success & Advising Portal
              </h1>

              <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                A centralized university platform providing students and faculty with real-time academic records, automated attendance tracking, continuous mark assessments, and proactive academic advising.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn size={16} />
                  <span>Sign In to Student/Faculty Portal</span>
                </Link>

                <a
                  href="#services"
                  className="px-6 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <BookOpen size={16} className="text-blue-400" />
                  <span>Explore Academic Services</span>
                </a>
              </div>

              {/* 4 University Pillars */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs">
                  <div className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>Attendance</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Live class attendance tracking with 75% final exam eligibility threshold.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs">
                  <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <BarChart3 size={14} />
                    <span>Continuous Marks</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Immediate grade recording for quizzes, assignments, and midterms.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs">
                  <div className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <BellRing size={14} />
                    <span>Advisory Alerts</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Early notification for students needing academic support before finals.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs">
                  <div className="text-purple-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <HeartHandshake size={14} />
                    <span>Faculty Advising</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    1-on-1 advisor consultations and structured milestone action plans.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            ROLE GATEWAYS & SERVICES
           ======================================================== */}
        <section id="services" className="py-14 bg-slate-100/90 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Institutional Portals
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Role-Based University Gateways
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Log in with your institutional credentials or launch an evaluation session below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student Hub */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-4">
                    <GraduationCap size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Student Portal</h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Access course syllabi, verify lecture attendance percentages, view assessment marks, and receive personalized recommendations for academic improvement.
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Class attendance & exam eligibility status</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Continuous marks breakdown by assessment</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Upcoming assignment and exam deadlines</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => handleLaunchRole('student01@example.edu', '/student/dashboard')}
                    disabled={isLoadingRole !== null}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Enter Student Portal</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => handleLaunchRole('student02@example.edu', '/student/dashboard')}
                    disabled={isLoadingRole !== null}
                    className="w-full py-1.5 px-3 text-[11px] text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    View At-Risk Student Example
                  </button>
                </div>
              </div>

              {/* Faculty & Advisor Portal */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Faculty & Advisor Portal</h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Designed for course instructors and appointed academic advisors to take attendance, record grades, monitor student cohorts, and create advising action plans.
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Daily section attendance recording</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Course marks entry & grade distribution</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>At-risk student advising interventions</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => handleLaunchRole('teacher01@example.edu', '/teacher/dashboard')}
                    disabled={isLoadingRole !== null}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Enter Faculty Portal</span>
                    <ChevronRight size={14} />
                  </button>
                  <div className="text-[11px] text-center text-slate-400 py-1">
                    Course Instructor & Advisor Dashboard
                  </div>
                </div>
              </div>

              {/* Administration */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mb-4">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Academic Administration</h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Governance tools for departmental heads, registrars, and university administrators to manage semesters, academic offerings, and institutional reporting.
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Institutional user & role management</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Course offerings & faculty allocations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Audit logging and academic term settings</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => handleLaunchRole('maynulhasan625@gmail.com', '/admin/users')}
                    disabled={isLoadingRole !== null}
                    className="w-full py-2.5 px-4 bg-[#0b1329] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Enter Administrator Portal</span>
                    <ChevronRight size={14} />
                  </button>
                  <div className="text-[11px] text-center text-slate-400 py-1">
                    Department & University Admin
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            ACADEMIC REGULATIONS & POLICIES
           ======================================================== */}
        <section id="regulations" className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Official Policies
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Academic Regulations & Evaluation Standards
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Standard academic guidelines maintained across all university departments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                  <FileCheck2 size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">75% Attendance Rule</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Students must maintain a minimum attendance rate of 75% in lecture and lab classes. Below 75% triggers an academic warning, and below 60% results in course debarment.
                </p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                  <BellRing size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Controlled Advisory Alerts</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To prevent notification fatigue, the advisory alert system enforces a strict maximum of two formal academic risk notifications per student per calendar month.
                </p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Award size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Continuous Assessment</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Course grades combine continuous assessments (quizzes, lab assignments, midterm exams) with the semester final. Missing assessments are promptly flagged.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            ADVISING & SUPPORT CALLOUT
           ======================================================== */}
        <section id="advising" className="py-16 bg-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#0b1329] text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl border border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                <GraduationCap size={28} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Ready to access your academic dashboard?
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                Log in with your institutional credentials to review your registered courses, view continuous attendance and marks, and check semester deadlines.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/login"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  Sign In to Academic Portal
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  New Student Registration
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* University Institutional Footer */}
      <footer className="bg-[#080e22] text-white border-t border-slate-800 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <GraduationCap size={20} className="text-blue-400" />
                <span>University Academic Portal</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Centralized academic monitoring, attendance tracking, and advising intervention system.
              </p>
            </div>

            <div>
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-3">
                Quick Access
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li><Link to="/login" className="hover:text-white transition-colors">Student Sign In</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Faculty Portal</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Account Activation</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-3">
                Campus Services
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Academic Calendar</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Office of the Registrar</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Student Advising Center</a></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-3">
                ICT Helpdesk
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-2">
                Experiencing technical difficulties? Contact the university computing center.
              </p>
              <div className="text-blue-400 font-medium text-xs">
                helpdesk@university.edu
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <div>© 2026 University Academic Management System. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms of Use</a>
              <span>•</span>
              <a href="#" className="hover:text-slate-400 transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
