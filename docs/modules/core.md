# Core Module Specification
**Owner**: Developer 1 (Md. Al-Maynul Hasan)
**Scope**: Authentication, user management, profile routing, navigation shell.

### Components & Pages
- Public Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Admin Management: `/admin/users`
- Profile: `/student/profile`
- Global Shell: `AppShell`, role navigation bars, status header.

### Security Guarantees
- Default registration creates `role = 'student'` only.
- Roles are strictly verified from the `users` Firestore document upon auth state change.
- Unauthenticated requests are redirected to `/login`.
- Role mismatches are redirected to the user's role-appropriate home (`/student/dashboard`, `/teacher/dashboard`, or `/admin/users`).
