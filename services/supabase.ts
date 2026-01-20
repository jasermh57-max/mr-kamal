import { createClient } from '@supabase/supabase-js';
import { User, Exam, ExamResult, ForumPost, CourseVideo, SystemSettings, LiveSession } from '../types';

// INSTRUCTIONS:
// 1. Go to https://supabase.com and create a new project.
// 2. Go to Project Settings -> API.
// 3. Replace the URL and KEY below with your own.
// 4. Create tables in Supabase using the SQL provided in the chat.

const SUPABASE_URL: string = 'https://yynmsriitnyvybpevwte.supabase.co';
const SUPABASE_KEY = 'sb_publishable_onoD-pzWkxQc9rwb8pOQkA_NHaJRYLf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to check if connected (simple check)
export const isDbConnected = () => {
    return SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co';
};

// --- DATA SERVICE WRAPPERS ---

export const dbService = {
    // SYSTEM SETTINGS (BRANDING)
    async getSettings(): Promise<SystemSettings | null> {
        if (!isDbConnected()) return null;
        const { data, error } = await supabase.from('settings').select('*').eq('id', 'global_config').single();
        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message.includes('Could not find the table')) {
                return null;
            } 
            console.error("Supabase DB Error (getSettings):", error.message || JSON.stringify(error));
            return null;
        }
        return data as SystemSettings;
    },

    async updateSettings(settings: SystemSettings): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('settings').upsert(settings);
        if (error) {
            console.error("Supabase DB Error (updateSettings):", error.message || JSON.stringify(error));
            return false;
        }
        return true;
    },

    // LIVE SESSIONS
    async getActiveLiveSession(): Promise<LiveSession | null> {
        if (!isDbConnected()) return null;
        const { data, error } = await supabase.from('live_sessions').select('*').eq('id', 'current_broadcast').single();
        if (error) {
             if (error.code === 'PGRST116') return null; // No active session
             return null;
        }
        return data as LiveSession;
    },

    async startLiveSession(session: LiveSession): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('live_sessions').upsert(session);
        if (error) console.error("Supabase DB Error (startLiveSession):", error.message);
        return !error;
    },

    async endLiveSession(): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('live_sessions').delete().eq('id', 'current_broadcast');
        if (error) console.error("Supabase DB Error (endLiveSession):", error.message);
        return !error;
    },

    // USERS
    async getUsers(): Promise<User[] | null> {
        if (!isDbConnected()) return null;
        const { data, error } = await supabase.from('users').select('*');
        if (error) {
             if (error.code === '42P01' || error.message.includes('Could not find the table')) return null;
            console.error("Supabase DB Error (getUsers):", error.message || JSON.stringify(error));
            return null;
        }
        return data as User[];
    },

    async addUser(user: User): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('users').insert(user);
        if (error) console.error("Supabase DB Error (addUser):", error.message || JSON.stringify(error));
        return !error;
    },

    async deleteUser(userId: string): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) console.error("Supabase DB Error (deleteUser):", error.message || JSON.stringify(error));
        return !error;
    },

    // EXAMS
    async getExams(): Promise<Exam[] | null> {
        if (!isDbConnected()) return null;
        const { data, error } = await supabase.from('exams').select('*');
        if (error) {
             if (error.code === '42P01' || error.message.includes('Could not find the table')) return null;
            console.error("Supabase DB Error (getExams):", error.message || JSON.stringify(error));
            return null;
        }
        return data as Exam[];
    },

    async addExam(exam: Exam): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('exams').insert(exam);
        if (error) console.error("Supabase DB Error (addExam):", error.message || JSON.stringify(error));
        return !error;
    },

    async updateExam(exam: Exam): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('exams').update(exam).eq('id', exam.id);
        if (error) console.error("Supabase DB Error (updateExam):", error.message || JSON.stringify(error));
        return !error;
    },

    async deleteExam(examId: string): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('exams').delete().eq('id', examId);
        if (error) console.error("Supabase DB Error (deleteExam):", error.message || JSON.stringify(error));
        return !error;
    },

    // RESULTS
    async saveResult(result: ExamResult): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('results').insert(result);
        if (error) console.error("Supabase DB Error (saveResult):", error.message || JSON.stringify(error));
        return !error;
    },

    // FORUM
    async getPosts(): Promise<ForumPost[] | null> {
        if (!isDbConnected()) return null;
        const { data, error } = await supabase.from('posts').select('*').order('timestamp', { ascending: false });
        if (error) {
             if (error.code === '42P01' || error.message.includes('Could not find the table')) return null;
            console.error("Supabase DB Error (getPosts):", error.message || JSON.stringify(error));
            return null;
        }
        return data as ForumPost[];
    },

    async addPost(post: ForumPost): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('posts').insert(post);
        if (error) console.error("Supabase DB Error (addPost):", error.message || JSON.stringify(error));
        return !error;
    },

    // VIDEOS
    async getVideos(): Promise<CourseVideo[] | null> {
        if (!isDbConnected()) return null;
        const { data, error } = await supabase.from('videos').select('*').order('timestamp', { ascending: false });
        if (error) {
             if (error.code === '42P01' || error.message.includes('Could not find the table')) return null;
            console.error("Supabase DB Error (getVideos):", error.message || JSON.stringify(error));
            return null;
        }
        return data as CourseVideo[];
    },

    async addVideo(video: CourseVideo): Promise<boolean> {
        if (!isDbConnected()) return false;
        const { error } = await supabase.from('videos').insert(video);
        if (error) console.error("Supabase DB Error (addVideo):", error.message || JSON.stringify(error));
        return !error;
    }
};