export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  accessCode?: string; 
  isBanned?: boolean; // Banned from platform entirely
  isForumBanned?: boolean; // Banned from posting in forum
  passedExamIds?: string[]; // Track IDs of passed exams/lessons
}

export interface Notification {
  id: string;
  message: string;
  type: 'FAILURE' | 'INFO';
  timestamp: number;
  isRead: boolean;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  imageUrl?: string; // Support for images
  timestamp: number;
  isLocked?: boolean;
}

export interface ExamQuestion {
  id: string;
  question: string;
  imageUrl?: string; // Support for question images
  options: string[];
  correctOptionIndex: number;
}

export interface Exam {
  id: string;
  title: string;
  questions: ExamQuestion[];
  timeLimitMinutes: number;
  creatorId: string;
}

export interface ExamResult {
  examId: string;
  studentId: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface CourseVideo {
  id: string;
  title: string;
  url: string; // Blob URL or external
  creatorId: string;
  timestamp: number;
}

export interface LiveSession {
  id: string;
  is_active: boolean;
  mode: 'VIDEO' | 'WHITEBOARD';
  teacher_id: string;
  started_at: number;
}

export interface LivePermissions {
  [studentId: string]: {
    canSpeak: boolean;
    canDraw: boolean;
  }
}

export interface SystemSettings {
  id: string; // usually 'global_config'
  app_title: string;
  login_bg_url: string;
}

export interface AppState {
  users: User[];
  currentUser: User | null;
  exams: Exam[];
  examResults: ExamResult[];
  forumPosts: ForumPost[];
  videos: CourseVideo[];
  notifications: Notification[];
  announcements: string[]; 
}