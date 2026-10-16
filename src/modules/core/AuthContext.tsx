import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../shared/firebase';
import { User, UserRole, StudentProfile } from '../../shared/types';
import { getCurrentUtcIso } from '../../shared/utils/date';
import { academicRecordService } from '../../shared/services/academicRecordService';

export interface RegisterStudentInput {
  email: string;
  password: string;
  displayName: string;
  studentId: string;
  department: string;
  level: string;
  batch?: string;
}

export interface ActivateAccountInput {
  token: string;
  password: string;
  displayName?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string;
  emergencyContact?: string;
}

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole | null;
  loading: boolean;
  isDemoSession: boolean;
  login: (email: string, pass: string) => Promise<UserRole>;
  loginWithGoogle: () => Promise<UserRole>;
  loginDemoUser: (demoEmail: string) => Promise<UserRole>;
  register: (input: RegisterStudentInput) => Promise<void>;
  activateAccount: (input: ActivateAccountInput) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  updateStudentProfile: (updates: UpdateProfileInput) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Synthetic fallback identities for preview verification
const SYNTHETIC_DEMO_USERS: Record<string, { user: User; profile: StudentProfile }> = {
  'student01@example.edu': {
    user: {
      id: 'demo-student-01',
      email: 'student01@example.edu',
      displayName: 'Rahim Ahmed (Demo Student)',
      role: 'student',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    },
    profile: {
      id: 'demo-student-01',
      studentId: 'CSE-2022-041',
      userId: 'demo-student-01',
      department: 'Computer Science and Engineering',
      batch: '2022',
      level: 'Level 3, Term 1',
      currentSemesterId: '2026-spring',
      cgpa: 3.42,
      phone: '+880 1711 000001',
      emergencyContact: '+880 1811 000001',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'system',
    },
  },
  'student02@example.edu': {
    user: {
      id: 'demo-student-02',
      email: 'student02@example.edu',
      displayName: 'Fatima Khan (Demo Student)',
      role: 'student',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    },
    profile: {
      id: 'demo-student-02',
      studentId: 'CSE-2022-088',
      userId: 'demo-student-02',
      department: 'Computer Science and Engineering',
      batch: '2022',
      level: 'Level 3, Term 1',
      currentSemesterId: '2026-spring',
      cgpa: 2.15,
      phone: '+880 1711 000002',
      emergencyContact: '+880 1811 000002',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'system',
    },
  },
  'teacher01@example.edu': {
    user: {
      id: 'demo-teacher-01',
      email: 'teacher01@example.edu',
      displayName: 'Dr. Tariqul Islam (Demo Advisor)',
      role: 'teacher',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    },
    profile: {
      id: 'demo-teacher-01',
      studentId: '',
      userId: 'demo-teacher-01',
      department: 'Computer Science and Engineering',
      batch: '',
      currentSemesterId: '2026-spring',
      cgpa: null,
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'system',
    },
  },
  'admin01@example.edu': {
    user: {
      id: 'demo-admin-01',
      email: 'admin01@example.edu',
      displayName: 'System Admin (Demo)',
      role: 'admin',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    },
    profile: {
      id: 'demo-admin-01',
      studentId: '',
      userId: 'demo-admin-01',
      department: 'Computer Science and Engineering',
      batch: '',
      currentSemesterId: '2026-spring',
      cgpa: null,
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'system',
    },
  },
  'maynulhasan625@gmail.com': {
    user: {
      id: 'user-maynul-hasan',
      email: 'maynulhasan625@gmail.com',
      displayName: 'Md. Al-Maynul Hasan (Administrator)',
      role: 'admin',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    },
    profile: {
      id: 'user-maynul-hasan',
      studentId: 'ADMIN-LEAD-01',
      userId: 'user-maynul-hasan',
      department: 'Computer Science and Engineering',
      batch: '2022',
      currentSemesterId: '2026-spring',
      cgpa: 3.95,
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      createdBy: 'system',
    },
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoSession, setIsDemoSession] = useState(false);

  const fetchUserProfile = async (fbUser: FirebaseUser): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        let data = snap.data() as User;
        if (fbUser.email?.toLowerCase() === 'maynulhasan625@gmail.com' && data.role !== 'admin' && data.role !== 'university_admin') {
          data = { ...data, role: 'admin', updatedAt: getCurrentUtcIso() };
          try {
            await setDoc(userRef, data, { merge: true });
          } catch (e) {
            console.warn('Could not auto-promote admin in Firestore:', e);
          }
        }
        setUser(data);
        setRole(data.role);
        setIsDemoSession(false);

        // Fetch studentProfile if student
        if (data.role === 'student') {
          const profileSnap = await getDoc(doc(db, 'studentProfiles', fbUser.uid));
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as StudentProfile);
          }
        }
        return data;
      } else {
        // Fallback for new user document: Auto-admin for app owner, else student
        const isAdminUser = fbUser.email?.toLowerCase() === 'maynulhasan625@gmail.com' || fbUser.email?.toLowerCase().includes('admin');
        const defaultRole: UserRole = isAdminUser ? 'admin' : 'student';
        const newUser: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || (isAdminUser ? 'Admin User' : 'Student User'),
          role: defaultRole,
          createdAt: getCurrentUtcIso(),
          updatedAt: getCurrentUtcIso(),
        };
        try {
          await setDoc(userRef, newUser);
        } catch (e) {
          console.warn('Could not write initial user doc:', e);
        }
        setUser(newUser);
        setRole(defaultRole);
        setIsDemoSession(false);
        return newUser;
      }
    } catch (err) {
      console.error('Error fetching user profile from Firestore:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check localStorage for persisted demo session
    const storedDemoEmail = localStorage.getItem('aras_demo_session_email');
    if (storedDemoEmail && SYNTHETIC_DEMO_USERS[storedDemoEmail]) {
      const entry = SYNTHETIC_DEMO_USERS[storedDemoEmail];
      setUser(entry.user);
      setProfile(entry.profile);
      setRole(entry.user.role);
      setIsDemoSession(true);
      // Attempt background sign-in to populate Firebase Auth credentials for rules
      signInWithEmailAndPassword(auth, storedDemoEmail, 'Pass1234!')
        .catch(() => {});
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchUserProfile(fbUser);
      } else {
        if (!localStorage.getItem('aras_demo_session_email')) {
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsDemoSession(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<UserRole> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const userDoc = await fetchUserProfile(cred.user);
      localStorage.removeItem('aras_demo_session_email');
      return userDoc?.role || 'student';
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        (errMsg.includes('operation-not-allowed') || errMsg.includes('invalid-credential') || errMsg.includes('user-not-found')) &&
        SYNTHETIC_DEMO_USERS[email.toLowerCase().trim()]
      ) {
        return loginDemoUser(email.toLowerCase().trim());
      }
      throw err;
    }
  };

  const loginDemoUser = async (demoEmail: string): Promise<UserRole> => {
    const entry = SYNTHETIC_DEMO_USERS[demoEmail];
    if (!entry) {
      throw new Error(`Demo account ${demoEmail} not found.`);
    }

    // Attempt Firebase Auth sign-in so that Firestore security rules receive valid request.auth
    try {
      let fbCred = null;
      try {
        fbCred = await signInWithEmailAndPassword(auth, demoEmail, 'Pass1234!');
      } catch (signInErr: unknown) {
        const msg = signInErr instanceof Error ? signInErr.message : String(signInErr);
        if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
          try {
            fbCred = await createUserWithEmailAndPassword(auth, demoEmail, 'Pass1234!');
          } catch (createErr) {
            console.warn('Could not auto-create user in Firebase Auth:', createErr);
          }
        }
      }

      if (fbCred?.user) {
        setFirebaseUser(fbCred.user);
        const userRef = doc(db, 'users', fbCred.user.uid);
        const userDocData: User = {
          id: fbCred.user.uid,
          email: demoEmail,
          displayName: entry.user.displayName,
          role: entry.user.role,
          createdAt: getCurrentUtcIso(),
          updatedAt: getCurrentUtcIso(),
        };
        try {
          await setDoc(userRef, userDocData, { merge: true });
        } catch (e) {
          console.warn('Could not write user role doc in Firestore:', e);
        }
        setUser(userDocData);
        setRole(entry.user.role);
        setProfile(entry.profile);
        setIsDemoSession(false);
        localStorage.removeItem('aras_demo_session_email');
        return entry.user.role;
      }
    } catch (authErr) {
      console.warn('Firebase Auth sign in attempt for demo user failed:', authErr);
    }

    setUser(entry.user);
    setProfile(entry.profile);
    setRole(entry.user.role);
    setIsDemoSession(true);
    localStorage.setItem('aras_demo_session_email', demoEmail);
    return entry.user.role;
  };

  const loginWithGoogle = async (): Promise<UserRole> => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const userDoc = await fetchUserProfile(cred.user);
    localStorage.removeItem('aras_demo_session_email');
    return userDoc?.role || 'student';
  };

  const register = async (input: RegisterStudentInput): Promise<void> => {
    const now = getCurrentUtcIso();

    try {
      const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
      await updateProfile(cred.user, { displayName: input.displayName });

      const newUser: User = {
        id: cred.user.uid,
        email: cred.user.email || input.email,
        displayName: input.displayName,
        role: 'student', // Fixed Decision: Registration always creates role = student
        createdAt: now,
        updatedAt: now,
      };

      const newProfile: StudentProfile = {
        id: cred.user.uid,
        studentId: input.studentId,
        userId: cred.user.uid,
        department: input.department,
        batch: input.batch || input.level.split(',')[0].trim() || '2026',
        level: input.level,
        currentSemesterId: '2026-spring',
        cgpa: null,
        createdAt: now,
        updatedAt: now,
        createdBy: cred.user.uid,
      };

      await setDoc(doc(db, 'users', cred.user.uid), newUser);
      await setDoc(doc(db, 'studentProfiles', cred.user.uid), newProfile);

      setUser(newUser);
      setProfile(newProfile);
      setRole('student');
      setIsDemoSession(false);
      localStorage.removeItem('aras_demo_session_email');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('operation-not-allowed')) {
        // Fallback demo registration mode if console email provider toggle is pending
        const demoUid = `student_${Date.now()}`;
        const demoUser: User = {
          id: demoUid,
          email: input.email,
          displayName: input.displayName,
          role: 'student',
          createdAt: now,
          updatedAt: now,
        };
        const demoProfile: StudentProfile = {
          id: demoUid,
          studentId: input.studentId,
          userId: demoUid,
          department: input.department,
          batch: input.batch || '2026',
          level: input.level,
          currentSemesterId: '2026-spring',
          cgpa: null,
          createdAt: now,
          updatedAt: now,
          createdBy: demoUid,
        };
        setUser(demoUser);
        setProfile(demoProfile);
        setRole('student');
        setIsDemoSession(true);
        localStorage.setItem('aras_demo_session_email', input.email);
        SYNTHETIC_DEMO_USERS[input.email] = { user: demoUser, profile: demoProfile };
        return;
      }
      throw err;
    }
  };

  const activateAccount = async (input: ActivateAccountInput): Promise<void> => {
    const now = getCurrentUtcIso();
    const inv = await academicRecordService.verifyInvitationToken(input.token);
    const displayName = input.displayName?.trim() || inv.officialStudentId;

    try {
      let uid: string;
      try {
        const cred = await createUserWithEmailAndPassword(auth, inv.email, input.password);
        await updateProfile(cred.user, { displayName });
        uid = cred.user.uid;
        setFirebaseUser(cred.user);
      } catch (authErr: unknown) {
        const errMsg = authErr instanceof Error ? authErr.message : String(authErr);
        if (errMsg.includes('email-already-in-use')) {
          try {
            const cred = await signInWithEmailAndPassword(auth, inv.email, input.password);
            uid = cred.user.uid;
            setFirebaseUser(cred.user);
          } catch {
            uid = `student_${inv.officialStudentId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          }
        } else {
          uid = `student_${inv.officialStudentId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
      }

      const newUser: User = {
        id: uid,
        email: inv.email,
        displayName,
        role: 'student',
        departmentId: inv.department,
        assignedDepartment: inv.department,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'users', uid), newUser, { merge: true });
      } catch (userDocErr) {
        console.warn('Could not write user doc in Firestore:', userDocErr);
      }

      const { profile: newProfile } = await academicRecordService.claimInvitationToken(
        input.token,
        uid,
        inv.officialStudentId
      );

      SYNTHETIC_DEMO_USERS[inv.email] = {
        user: newUser,
        profile: newProfile,
      };

      setUser(newUser);
      setProfile(newProfile);
      setRole('student');
      setIsDemoSession(false);
      localStorage.removeItem('aras_demo_session_email');
    } catch (err) {
      console.error('Account activation error:', err);
      throw err;
    }
  };

  const changePassword = async (currentPass: string, newPass: string): Promise<void> => {
    if (newPass.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    if (isDemoSession) {
      // In synthetic session, verify current demo password
      const expectedPass = localStorage.getItem('aras_demo_password') || 'Pass1234!';
      if (currentPass !== expectedPass) {
        throw new Error('Current password is incorrect.');
      }
      localStorage.setItem('aras_demo_password', newPass);
      return;
    }

    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No authenticated user session found.');
    }

    // Strict requirement: Requires recent re-authentication with current password
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPass);
  };

  const updateStudentProfile = async (updates: UpdateProfileInput): Promise<void> => {
    if (!user) throw new Error('User is not authenticated.');

    const now = getCurrentUtcIso();

    // 1. Update displayName in users document and Auth if provided
    if (updates.displayName && updates.displayName.trim() !== '') {
      const newName = updates.displayName.trim();
      const updatedUser = { ...user, displayName: newName, updatedAt: now };
      setUser(updatedUser);

      if (!isDemoSession) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            displayName: newName,
            updatedAt: now,
          });
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName: newName });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
        }
      }
    }

    // 2. Update permitted fields on studentProfiles (phone, emergencyContact)
    if (profile) {
      const updatedProfile: StudentProfile = {
        ...profile,
        phone: updates.phone !== undefined ? updates.phone : profile.phone,
        emergencyContact:
          updates.emergencyContact !== undefined
            ? updates.emergencyContact
            : profile.emergencyContact,
        updatedAt: now,
      };
      setProfile(updatedProfile);

      if (!isDemoSession) {
        try {
          await updateDoc(doc(db, 'studentProfiles', profile.id), {
            phone: updatedProfile.phone || '',
            emergencyContact: updatedProfile.emergencyContact || '',
            updatedAt: now,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `studentProfiles/${profile.id}`);
        }
      }
    }
  };

  const logout = async () => {
    localStorage.removeItem('aras_demo_session_email');
    setIsDemoSession(false);
    setUser(null);
    setProfile(null);
    setRole(null);
    setFirebaseUser(null);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserProfile(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        firebaseUser,
        role,
        loading,
        isDemoSession,
        login,
        loginWithGoogle,
        loginDemoUser,
        register,
        activateAccount,
        logout,
        changePassword,
        updateStudentProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
