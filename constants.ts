import { UserRole } from './types';

export const ADMIN_MASTER_KEY = "jasser@1#2$3_4";

export const MOCK_USERS_INIT = [
  { id: 'admin1', name: 'Super Admin', role: UserRole.ADMIN },
  { id: 'teacher1', name: 'Mr. Anderson', role: UserRole.TEACHER, accessCode: 'T123' },
  { id: 'student1', name: 'Alice Smith', role: UserRole.STUDENT, accessCode: 'S123' },
  { id: 'student2', name: 'Bob Jones', role: UserRole.STUDENT, accessCode: 'S456' },
] as const;

export const INITIAL_ANNOUNCEMENT = "Welcome to JLEARNING 2.0. System maintenance scheduled for Saturday.";