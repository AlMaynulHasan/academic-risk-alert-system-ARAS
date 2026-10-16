/**
 * Shared System Constants
 */

export const TIMEZONE = 'Asia/Dhaka';

export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const;

export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

export const PROVISIONAL_ATTENDANCE_THRESHOLD = 75; // 75% provisional minimum

export const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Software Engineering',
  'Electrical and Electronic Engineering',
  'Civil Engineering',
  'Business Administration',
] as const;

export const ACADEMIC_LEVELS = [
  'Level 1, Term 1',
  'Level 1, Term 2',
  'Level 2, Term 1',
  'Level 2, Term 2',
  'Level 3, Term 1',
  'Level 3, Term 2',
  'Level 4, Term 1',
  'Level 4, Term 2',
] as const;

export interface NavItem {
  label: string;
  path: string;
  iconName: string;
}

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', iconName: 'LayoutDashboard' },
  { label: 'Courses', path: '/student/courses', iconName: 'BookOpen' },
  { label: 'Attendance', path: '/student/attendance', iconName: 'CalendarCheck' },
  { label: 'Marks', path: '/student/marks', iconName: 'GraduationCap' },
  { label: 'Performance', path: '/student/performance', iconName: 'TrendingUp' },
  { label: 'Notifications', path: '/student/notifications', iconName: 'Bell' },
  { label: 'Profile', path: '/student/profile', iconName: 'User' },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/teacher/dashboard', iconName: 'LayoutDashboard' },
  { label: 'My Students', path: '/teacher/students', iconName: 'Users' },
  { label: 'Interventions', path: '/teacher/interventions', iconName: 'ShieldAlert' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'User Directory', path: '/admin/users', iconName: 'ShieldCheck' },
];
