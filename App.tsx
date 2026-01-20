import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Users, LogOut, Video, Edit3, Lock, 
  BarChart2, MessageSquare, Hand, Mic, MicOff, 
  PlayCircle, AlertTriangle, CheckCircle, X,
  Plus, Trash2, UserPlus, User as UserIcon,
  Image as ImageIcon, Film, Eye, Settings, Upload, Bell, Radio, Database, Save,
  Monitor, PenTool, Link as LinkIcon,
  Clock, Layout
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Whiteboard from './components/Whiteboard';
import { User, UserRole, Exam, ExamResult, ForumPost, ExamQuestion, LivePermissions, CourseVideo, Notification, SystemSettings, LiveSession } from './types';
import { ADMIN_MASTER_KEY, MOCK_USERS_INIT, INITIAL_ANNOUNCEMENT } from './constants';
import { dbService, isDbConnected } from './services/supabase';

// --- Types for App State ---
type View = 'LOGIN' | 'DASHBOARD' | 'LIVE_CLASS' | 'EXAM' | 'FORUM' | 'VIDEOS' | 'ANALYTICS';

// --- Mock Data (Fallbacks) ---
const initialExams: Exam[] = [
  {
    id: 'exam1',
    title: 'Lesson 1: Introduction',
    timeLimitMinutes: 45,
    creatorId: 'teacher1',
    questions: [
      { id: 'q1', question: 'What is the speed of light?', options: ['3x10^8 m/s', '300 km/h', 'Infinite', 'Zero'], correctOptionIndex: 0 }
    ]
  },
  {
    id: 'exam2',
    title: 'Lesson 2: Advanced Mechanics',
    timeLimitMinutes: 60,
    creatorId: 'teacher1',
    questions: [
        { id: 'q2', question: 'Force equals mass times...?', options: ['Velocity', 'Acceleration', 'Gravity', 'Time'], correctOptionIndex: 1 }
    ]
  }
];

const initialPosts: ForumPost[] = [
  { id: 'p1', authorId: 'teacher1', authorName: 'Mr. Anderson', content: 'Welcome to the semester! Please read the syllabus.', timestamp: Date.now() - 100000, isLocked: false },
  { id: 'p2', authorId: 'student1', authorName: 'Alice Smith', content: 'When is the first assignment due?', timestamp: Date.now(), isLocked: false }
];

// Default Constants
const DEFAULT_BG = 'https://yynmsriitnyvybpevwte.supabase.co/storage/v1/object/public/photo/IMG-20251209-WA0143.jpg';
const DEFAULT_TITLE = 'MR. KAMAL';

export default function App() {
  // Global State
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'CONNECTED' | 'OFFLINE'>('CONNECTING');
  const [users, setUsers] = useState<User[]>(MOCK_USERS_INIT.map(u => ({...u, passedExamIds: []})));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('LOGIN');
  const [announcement, setAnnouncement] = useState<string | null>(INITIAL_ANNOUNCEMENT);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Feature State
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(initialPosts);
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  
  // System Settings State (Branding)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
      id: 'global_config',
      app_title: DEFAULT_TITLE,
      login_bg_url: DEFAULT_BG
  });

  // Live Class State
  const [isLiveActive, setIsLiveActive] = useState(false); 
  const [broadcastMode, setBroadcastMode] = useState<'VIDEO' | 'WHITEBOARD'>('WHITEBOARD');
  const [handRaisedUsers, setHandRaisedUsers] = useState<string[]>([]);
  const [livePermissions, setLivePermissions] = useState<LivePermissions>({});
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Login Inputs
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Video Creator State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  // --- Initial Data Load ---
  useEffect(() => {
    // Update Document Title based on settings
    document.title = `${systemSettings.app_title} - الفيزياء لعبتك`;
  }, [systemSettings.app_title]);

  useEffect(() => {
    const initData = async () => {
        if (isDbConnected()) {
            try {
                // Fetch Branding Settings
                const settings = await dbService.getSettings();
                if (settings) setSystemSettings(settings);

                const dbUsers = await dbService.getUsers();
                if (dbUsers && dbUsers.length > 0) setUsers(dbUsers);
                
                const dbExams = await dbService.getExams();
                if (dbExams && dbExams.length > 0) setExams(dbExams);

                const dbPosts = await dbService.getPosts();
                if (dbPosts && dbPosts.length > 0) setForumPosts(dbPosts);

                const dbVideos = await dbService.getVideos();
                if (dbVideos && dbVideos.length > 0) setVideos(dbVideos);

                // Initial Live Session Check
                const session = await dbService.getActiveLiveSession();
                if (session && session.is_active) {
                    setIsLiveActive(true);
                    setBroadcastMode(session.mode);
                }

                setDbStatus('CONNECTED');
            } catch (e) {
                console.error("Failed to load DB data", e);
                setDbStatus('OFFLINE');
            }
        } else {
            setDbStatus('OFFLINE');
        }
    };
    initData();
  }, []);

  // --- Live Polling Effect ---
  useEffect(() => {
      if (dbStatus !== 'CONNECTED') return;
      
      const pollInterval = setInterval(async () => {
          const session = await dbService.getActiveLiveSession();
          if (session && session.is_active) {
              if (!isLiveActive) {
                  setIsLiveActive(true);
                  setBroadcastMode(session.mode);
              }
          } else {
              if (isLiveActive) {
                  // Only auto-end for students or if teacher is not the owner
                  if (currentUser?.role === UserRole.STUDENT) {
                    setIsLiveActive(false);
                    if(localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
                  }
              }
          }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
  }, [dbStatus, isLiveActive, currentUser]);

  // --- Branding Logic ---
  const saveSystemSettings = async () => {
    // Save to DB
    if(isDbConnected()) {
        await dbService.updateSettings(systemSettings);
        alert("System branding updated successfully!");
    } else {
        alert("Cannot save settings while offline.");
    }
  };

  // --- Auth Handlers ---
  const handleLogin = () => {
    // Admin Check
    if (loginPass === ADMIN_MASTER_KEY) {
      const adminUser = users.find(u => u.role === UserRole.ADMIN && u.name === loginId) || 
                        { id: 'admin-temp', name: 'Super Admin', role: UserRole.ADMIN, passedExamIds: [] };
      setCurrentUser(adminUser as User);
      setCurrentView('DASHBOARD');
      return;
    }

    // Standard User Check
    const user = users.find(u => u.name === loginId && u.accessCode === loginPass);
    if (user) {
      if (user.isBanned) {
        alert("Access Denied: Your account has been suspended.");
        return;
      }
      setCurrentUser(user as User);
      // Determine initial view based on role
      if (user.role === UserRole.STUDENT) {
          setCurrentView('EXAM'); // Students go straight to lessons/exams
      } else {
          setCurrentView('DASHBOARD');
      }
    } else {
      alert("Invalid Credentials");
    }
  };

  const handleLogout = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCurrentUser(null);
    setCurrentView('LOGIN');
    setLoginId('');
    setLoginPass('');
    setIsMicOn(false);
    setIsCamOn(false);
    setIsLiveActive(false);
  };

  // --- Live Class Media Handlers ---
  const startLiveSession = async (mode: 'VIDEO' | 'WHITEBOARD') => {
    try {
        setBroadcastMode(mode);
        setIsLiveActive(true);
        setIsMicOn(true); // Always start with Mic
        
        // Sync to DB so students can "reach" the broadcast
        if (isDbConnected() && currentUser) {
            await dbService.startLiveSession({
                id: 'current_broadcast',
                is_active: true,
                mode: mode,
                teacher_id: currentUser.id,
                started_at: Date.now()
            });
        }

        // Setup Media
        const constraints = {
            audio: true,
            video: mode === 'VIDEO' // Only request video if mode is VIDEO
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        
        if (mode === 'VIDEO') {
            setIsCamOn(true);
            // We need to wait for render to attach ref, handled by useEffect
        } else {
            setIsCamOn(false);
        }

    } catch (e) {
        console.error("Media Error:", e);
        alert("Could not access media devices. Please check permissions.");
        setIsLiveActive(false);
        await dbService.endLiveSession(); // Cleanup DB if failed
    }
  };

  // Effect to attach video stream when state changes
  useEffect(() => {
    if (isLiveActive && videoRef.current && localStreamRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
    }
  }, [isLiveActive, isCamOn, broadcastMode]);

  const toggleMedia = async (type: 'mic' | 'cam') => {
    if (type === 'mic') {
       if (localStreamRef.current) {
           const audioTracks = localStreamRef.current.getAudioTracks();
           audioTracks.forEach(track => track.enabled = !isMicOn);
       }
       setIsMicOn(!isMicOn);
    } else {
       if (!isCamOn) {
         try {
           // Request video track
           const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
           
           // Stop old tracks if any
           if (localStreamRef.current) {
               localStreamRef.current.getTracks().forEach(t => t.stop());
           }
           
           localStreamRef.current = stream;
           if (videoRef.current) {
             videoRef.current.srcObject = stream;
           }
           setIsCamOn(true);
           setIsMicOn(true); // Usually getting user media gets both
         } catch (e) {
           console.error(e);
           alert("Could not access camera.");
         }
       } else {
         // Turn off camera
         if (localStreamRef.current) {
             const videoTracks = localStreamRef.current.getVideoTracks();
             videoTracks.forEach(t => t.stop());
             // We might lose audio if we stop the whole stream, so usually we just disable track or request audio only
             // For simplicity in this mock, we'll just set state
         }
         setIsCamOn(false);
       }
    }
  };

  // --- Admin/Teacher Logic ---
  const addUser = async (name: string, role: UserRole, code: string) => {
    const newUser: User = { id: `u-${Date.now()}`, name, role, accessCode: code, passedExamIds: [] };
    // Optimistic UI Update
    setUsers([...users, newUser]);
    // DB Update
    if (dbStatus === 'CONNECTED') {
        await dbService.addUser(newUser);
    }
  };

  const removeUser = async (id: string) => {
    if(!window.confirm("Are you sure you want to remove this user? This action cannot be undone.")) return;
    
    setUsers(users.filter(u => u.id !== id));
    
    if (dbStatus === 'CONNECTED') {
        await dbService.deleteUser(id);
    }
    
    if (currentUser?.id === id) handleLogout();
  };

  const toggleStudentBan = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u));
    if (currentUser?.id === id) handleLogout();
  };
  
  const toggleForumBan = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isForumBanned: !u.isForumBanned } : u));
  };

  // --- Live Permission Logic ---
  const grantPermission = (studentId: string, type: 'mic' | 'board') => {
    setLivePermissions(prev => ({
      ...prev,
      [studentId]: {
        canSpeak: type === 'mic' ? true : prev[studentId]?.canSpeak || false,
        canDraw: type === 'board' ? true : prev[studentId]?.canDraw || false
      }
    }));
    if (type === 'mic') {
        setHandRaisedUsers(prev => prev.filter(id => id !== studentId));
    }
  };

  // --- Exam Logic ---
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const submitExam = async (answers: Record<string, number>) => {
    if (!activeExam || !currentUser) return;
    
    let score = 0;
    activeExam.questions.forEach((q) => {
        if (answers[q.id] === q.correctOptionIndex) {
            score++;
        }
    });

    const percentage = (score / activeExam.questions.length) * 100;
    const isPass = percentage >= 50; 

    const result: ExamResult = {
        examId: activeExam.id,
        studentId: currentUser.id,
        score: percentage,
        maxScore: 100,
        date: new Date().toISOString()
    };
    setExamResults([...examResults, result]);

    // Save to DB
    if (dbStatus === 'CONNECTED') {
        await dbService.saveResult(result);
    }

    if (isPass) {
        alert(`Congratulations! You passed with ${percentage.toFixed(0)}%. The next lesson is now unlocked.`);
        const updatedUser = { 
            ...currentUser, 
            passedExamIds: [...(currentUser.passedExamIds || []), activeExam.id] 
        };
        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    } else {
        alert(`You scored ${percentage.toFixed(0)}%. You must retake this exam.`);
        const notification: Notification = {
            id: `notif-${Date.now()}`,
            message: `Student ${currentUser.name} FAILED exam "${activeExam.title}" with score ${percentage.toFixed(0)}%.`,
            type: 'FAILURE',
            timestamp: Date.now(),
            isRead: false
        };
        setNotifications([...notifications, notification]);
    }
    setActiveExam(null);
  };

  const deleteExam = async (id: string) => {
      if(!window.confirm("Are you sure you want to delete this exam?")) return;
      setExams(exams.filter(e => e.id !== id));
      if (dbStatus === 'CONNECTED') {
          await dbService.deleteExam(id);
      }
  };

  // Helper for file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Component: Exam Creator Modal ---
  const [showExamCreator, setShowExamCreator] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamTimeLimit, setNewExamTimeLimit] = useState(30); // Default 30 mins
  
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImg, setNewQuestionImg] = useState<string | undefined>(undefined);
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState<ExamQuestion[]>([]);

  const openExamCreator = (examToEdit?: Exam) => {
      if (examToEdit) {
          setEditingExamId(examToEdit.id);
          setNewExamTitle(examToEdit.title);
          setNewExamTimeLimit(examToEdit.timeLimitMinutes);
          setPendingQuestions(examToEdit.questions);
      } else {
          setEditingExamId(null);
          setNewExamTitle('');
          setNewExamTimeLimit(30);
          setPendingQuestions([]);
      }
      // Reset question inputs
      setNewQuestionText('');
      setNewQuestionImg(undefined);
      setNewOptions(['', '', '', '']);
      setCorrectIdx(0);
      setShowExamCreator(true);
  };

  const addQuestionToExam = () => {
    if(!newQuestionText) return;
    setPendingQuestions([...pendingQuestions, {
      id: `q-${Date.now()}`,
      question: newQuestionText,
      imageUrl: newQuestionImg,
      options: [...newOptions],
      correctOptionIndex: correctIdx
    }]);
    setNewQuestionText('');
    setNewQuestionImg(undefined);
    setNewOptions(['', '', '', '']);
    setCorrectIdx(0);
  };

  const saveExam = async () => {
    if(!newExamTitle || pendingQuestions.length === 0) return;
    
    // IMPORTANT: Matching DB Structure exactly (Zero Errors)
    const examData: Exam = {
        id: editingExamId || crypto.randomUUID(), // UUID text
        title: newExamTitle,
        questions: pendingQuestions, // JSON array
        timeLimitMinutes: parseInt(String(newExamTimeLimit)), // Case Sensitive & Number
        creatorId: currentUser?.id || '' // Case Sensitive
    };

    if (editingExamId) {
        // Update existing
        setExams(exams.map(e => e.id === editingExamId ? examData : e));
        if (dbStatus === 'CONNECTED') {
            await dbService.updateExam(examData);
        }
    } else {
        // Create new
        setExams([...exams, examData]);
        if (dbStatus === 'CONNECTED') {
            await dbService.addExam(examData);
        }
    }

    setShowExamCreator(false);
    setPendingQuestions([]);
    setNewExamTitle('');
    setEditingExamId(null);
  };

  // --- Component: Video Creator Logic ---
  const saveNewVideo = async () => {
      if(!newVideoTitle || !newVideoUrl) return;
      
      const newVideo: CourseVideo = {
          id: crypto.randomUUID(), // UUID text
          title: newVideoTitle,
          url: newVideoUrl,
          creatorId: currentUser?.id || '',
          timestamp: Date.now() // BigInt compatible number
      };

      setVideos([newVideo, ...videos]);
      if(isDbConnected()) {
          await dbService.addVideo(newVideo);
      }

      setNewVideoTitle('');
      setNewVideoUrl('');
      setShowVideoModal(false);
  };

  // --- Render Helpers ---

  if (currentView === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative">
        <div 
            className="absolute inset-0 opacity-40 bg-cover bg-center transition-all duration-1000"
            style={{ backgroundImage: `url('${systemSettings.login_bg_url}')` }}
        ></div>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight uppercase shadow-sm">{systemSettings.app_title}</h1>
            <p className="text-indigo-300 mt-2 font-bold text-lg">الفيزياء لعبتك</p>
            {dbStatus === 'OFFLINE' && (
                <div className="mt-4 flex items-center justify-center text-xs text-orange-300 bg-orange-900/30 p-2 rounded border border-orange-500/30">
                    <Database size={14} className="mr-2"/> Database Offline (Local Mode)
                </div>
            )}
            {dbStatus === 'CONNECTED' && (
                <div className="mt-4 flex items-center justify-center text-xs text-green-300 bg-green-900/30 p-2 rounded border border-green-500/30">
                    <Database size={14} className="mr-2"/> Database Connected (Cloud)
                </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-indigo-200 text-sm font-medium mb-1">Username / ID</label>
              <input 
                type="text" 
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500 transition"
                placeholder="Enter Username"
              />
            </div>
            <div>
              <label className="block text-indigo-200 text-sm font-medium mb-1">Access Code / Key</label>
              <input 
                type="password" 
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500 transition"
                placeholder="••••••••"
              />
            </div>
            <button 
              onClick={handleLogin}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg transform transition active:scale-95"
            >
              Secure Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      {announcement && (
        <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center text-sm font-medium shadow-md z-50 sticky top-0">
          <span className="flex items-center gap-2">
            <Shield size={18} className="text-indigo-300" /> 
            <span className="font-bold opacity-75">ADMIN BULLETIN:</span> 
            {announcement}
          </span>
          <button onClick={() => setAnnouncement(null)} className="hover:bg-indigo-700 p-1 rounded transition"><X size={18} /></button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-40">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-2xl font-bold text-white tracking-wider">{systemSettings.app_title}</h2>
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {currentUser?.name[0]}
              </div>
              <div>
                <p className="text-white font-medium truncate w-32">{currentUser?.name}</p>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">{currentUser?.role}</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {currentUser?.role === UserRole.STUDENT ? (
              // Simplified Student Navigation
              <>
                 <NavButton active={currentView === 'EXAM'} onClick={() => setCurrentView('EXAM')} icon={<Edit3 />} label="My Lessons" />
                 <NavButton active={currentView === 'LIVE_CLASS'} onClick={() => setCurrentView('LIVE_CLASS')} icon={<Video />} label="Live Class" />
              </>
            ) : (
              // Full Navigation for Admin/Teacher
              <>
                <NavButton active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} icon={<Users />} label="Dashboard" />
                <NavButton active={currentView === 'LIVE_CLASS'} onClick={() => setCurrentView('LIVE_CLASS')} icon={<Video />} label="Live Classroom" />
                <NavButton active={currentView === 'VIDEOS'} onClick={() => setCurrentView('VIDEOS')} icon={<Film />} label="Course Videos" />
                <NavButton active={currentView === 'FORUM'} onClick={() => setCurrentView('FORUM')} icon={<MessageSquare />} label="Forum" />
                <NavButton active={currentView === 'EXAM'} onClick={() => setCurrentView('EXAM')} icon={<Edit3 />} label="Exams" />
                <NavButton active={currentView === 'ANALYTICS'} onClick={() => setCurrentView('ANALYTICS')} icon={<BarChart2 />} label="Analytics" />
              </>
            )}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center space-x-2 text-red-400 hover:text-red-300 w-full px-4 py-2 rounded-lg hover:bg-slate-800 transition">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative bg-slate-50/50">
          
          {/* VIEW: DASHBOARD (ADMIN) */}
          {currentView === 'DASHBOARD' && currentUser?.role === UserRole.ADMIN && (
            <div className="space-y-8 animate-fade-in">
               <h2 className="text-3xl font-bold text-slate-800">System Administration</h2>
               
               {/* --- BRANDING SETTINGS --- */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                    <h3 className="text-xl font-bold mb-4 flex items-center text-slate-700"><Layout className="mr-2" /> Platform Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Application Name</label>
                            <input 
                                type="text" 
                                value={systemSettings.app_title}
                                onChange={(e) => setSystemSettings({...systemSettings, app_title: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Login Background URL</label>
                            <input 
                                type="text" 
                                value={systemSettings.login_bg_url}
                                onChange={(e) => setSystemSettings({...systemSettings, login_bg_url: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            />
                             <p className="text-xs text-slate-400 mt-1">Paste a direct image link from Supabase Storage.</p>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={saveSystemSettings}
                            className="bg-indigo-600 text-white px-6 py-2 rounded font-medium hover:bg-indigo-700 transition flex items-center"
                        >
                            <Save size={16} className="mr-2"/> Save Branding
                        </button>
                    </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <DashboardCard title="Teachers" value={users.filter(u => u.role === UserRole.TEACHER).length} color="blue" />
                 <DashboardCard title="Students" value={users.filter(u => u.role === UserRole.STUDENT).length} color="green" />
                 <DashboardCard title="System Load" value="Optimal" color="indigo" />
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="text-xl font-bold mb-4 flex items-center text-slate-700"><UserPlus className="mr-2" /> Teacher Management</h3>
                 <div className="flex gap-4 mb-6">
                   <input type="text" id="newTeacherName" placeholder="Teacher Name" className="border p-2 rounded flex-1 focus:ring-2 focus:ring-indigo-500 outline-none" />
                   <input type="text" id="newTeacherCode" placeholder="Access Code" className="border p-2 rounded w-48 focus:ring-2 focus:ring-indigo-500 outline-none" />
                   <button 
                     onClick={() => {
                        const nameEl = document.getElementById('newTeacherName') as HTMLInputElement;
                        const codeEl = document.getElementById('newTeacherCode') as HTMLInputElement;
                        if(nameEl.value && codeEl.value) {
                            addUser(nameEl.value, UserRole.TEACHER, codeEl.value);
                            nameEl.value = '';
                            codeEl.value = '';
                        }
                     }}
                     className="bg-indigo-600 text-white px-6 py-2 rounded font-medium hover:bg-indigo-700 transition"
                   >Add Teacher</button>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm text-slate-600">
                     <thead className="bg-slate-50 text-slate-900 uppercase">
                       <tr><th className="p-3">Name</th><th className="p-3">Code</th><th className="p-3 text-right">Action</th></tr>
                     </thead>
                     <tbody>
                       {users.filter(u => u.role === UserRole.TEACHER).map(u => (
                         <tr key={u.id} className="border-t hover:bg-slate-50 transition">
                           <td className="p-3 font-medium text-slate-900">{u.name}</td>
                           <td className="p-3 font-mono">****</td>
                           <td className="p-3 text-right">
                             <button onClick={() => removeUser(u.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded transition text-xs font-bold border border-red-200">REMOVE & LOGOUT</button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          )}

          {/* VIEW: DASHBOARD (TEACHER) */}
          {currentView === 'DASHBOARD' && currentUser?.role === UserRole.TEACHER && (
             <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Teacher's Lounge</h2>
                <div className="flex items-center space-x-3">
                    <div className="relative group cursor-pointer">
                        <Bell className="text-slate-600" />
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                {notifications.filter(n => !n.isRead).length}
                            </span>
                        )}
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 hidden group-hover:block z-50">
                            <h4 className="font-bold mb-2">Notifications</h4>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications.</p>}
                                {notifications.map(n => (
                                    <div key={n.id} className="text-sm p-2 bg-red-50 rounded text-red-700 border border-red-100">
                                        {n.message}
                                        <div className="text-[10px] text-red-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col justify-center">
                    <h3 className="text-3xl font-bold mb-2">Welcome back, {currentUser?.name}!</h3>
                    <p className="text-blue-100 text-lg">Manage your classroom, track student progress, and organize lessons from your command center.</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                         <button onClick={() => openExamCreator()} className="w-full text-left px-4 py-2 rounded bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-medium transition flex items-center"><Plus size={16} className="mr-2"/> Create New Exam</button>
                         <button onClick={() => setAnnouncement("Class starts in 10 mins!")} className="w-full text-left px-4 py-2 rounded bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-medium transition flex items-center"><MessageSquare size={16} className="mr-2"/> Post Announcement</button>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold mb-4 text-slate-800">Student Management</h3>
                <div className="flex gap-4 mb-4 bg-slate-50 p-4 rounded-lg">
                   <input type="text" id="newStudentName" placeholder="Student Name" className="border p-2 rounded flex-1" />
                   <input type="text" id="newStudentCode" placeholder="Access Code" className="border p-2 rounded w-48" />
                   <button 
                     onClick={() => {
                        const nameEl = document.getElementById('newStudentName') as HTMLInputElement;
                        const codeEl = document.getElementById('newStudentCode') as HTMLInputElement;
                        if(nameEl.value && codeEl.value) {
                            addUser(nameEl.value, UserRole.STUDENT, codeEl.value);
                            nameEl.value = '';
                            codeEl.value = '';
                        }
                     }}
                     className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700 transition"
                   >Enroll Student</button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm text-slate-600">
                     <thead className="bg-slate-100 text-slate-700 font-bold">
                       <tr><th className="p-3 rounded-l-lg">Name</th><th className="p-3">Status</th><th className="p-3">Forum Access</th><th className="p-3 rounded-r-lg">Actions</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {users.filter(u => u.role === UserRole.STUDENT).map(u => (
                         <tr key={u.id}>
                           <td className="p-3 font-medium text-slate-900">{u.name}</td>
                           <td className="p-3">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${u.isBanned ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                               {u.isBanned ? 'SUSPENDED' : 'ACTIVE'}
                             </span>
                           </td>
                           <td className="p-3">
                               <button onClick={() => toggleForumBan(u.id)} className={`text-xs px-2 py-1 rounded border ${u.isForumBanned ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                   {u.isForumBanned ? 'Restricted' : 'Allowed'}
                               </button>
                           </td>
                           <td className="p-3 flex space-x-2">
                             <button onClick={() => toggleStudentBan(u.id)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                               {u.isBanned ? 'Activate' : 'Suspend'}
                             </button>
                             <button onClick={() => removeUser(u.id)} className="text-red-600 hover:text-red-800 font-medium text-xs">Expel</button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
             </div>
          )}

          {/* VIEW: LIVE CLASSROOM */}
          {currentView === 'LIVE_CLASS' && (
            <div className="h-[calc(100vh-6rem)] grid grid-cols-12 gap-4">
              <div className="col-span-9 flex flex-col gap-4 h-full">
                {!isLiveActive && currentUser?.role === UserRole.TEACHER && (
                  <div className="flex-1 bg-slate-900 rounded-xl flex flex-col items-center justify-center shadow-lg border border-slate-800 relative overflow-hidden p-10">
                     <div className="absolute inset-0 bg-[url('https://picsum.photos/1200/800?blur=5')] opacity-20 bg-cover"></div>
                     <div className="z-10 text-center max-w-2xl w-full">
                        <Radio size={64} className="text-indigo-500 mx-auto mb-6 animate-pulse"/>
                        <h2 className="text-3xl font-bold text-white mb-2">Classroom Ready</h2>
                        <p className="text-slate-400 mb-10">Select a broadcast mode to begin the session.</p>
                        <div className="grid grid-cols-2 gap-6">
                            <button 
                                onClick={() => startLiveSession('VIDEO')}
                                className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/50 hover:border-indigo-500 p-6 rounded-2xl transition group flex flex-col items-center"
                            >
                                <Monitor size={48} className="text-indigo-400 group-hover:text-white mb-4"/>
                                <h3 className="text-xl font-bold text-white">Camera Mode</h3>
                                <p className="text-indigo-200 text-sm mt-2">Full-screen video & audio.</p>
                            </button>
                            <button 
                                onClick={() => startLiveSession('WHITEBOARD')}
                                className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-500 p-6 rounded-2xl transition group flex flex-col items-center"
                            >
                                <PenTool size={48} className="text-emerald-400 group-hover:text-white mb-4"/>
                                <h3 className="text-xl font-bold text-white">Whiteboard Mode</h3>
                                <p className="text-emerald-200 text-sm mt-2">Interactive board & audio.</p>
                            </button>
                        </div>
                     </div>
                  </div>
                )}

                {!isLiveActive && currentUser?.role === UserRole.STUDENT && (
                   <div className="flex-1 bg-slate-900 rounded-xl flex flex-col items-center justify-center shadow-lg border border-slate-800">
                     <div className="text-center p-8">
                        <div className="w-20 h-20 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Waiting for Teacher...</h2>
                        <p className="text-slate-400">The live broadcast has not started yet.</p>
                     </div>
                   </div>
                )}

                {isLiveActive && (
                  <div className="flex-1 bg-white rounded-xl shadow-lg relative overflow-hidden border border-slate-200 flex flex-col h-full animate-fade-in">
                    {broadcastMode === 'WHITEBOARD' ? (
                        <Whiteboard 
                            readOnly={
                                currentUser?.role === UserRole.STUDENT && 
                                !livePermissions[currentUser?.id || '']?.canDraw
                            } 
                        />
                    ) : (
                        <div className="relative w-full h-full bg-black flex items-center justify-center">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                muted={currentUser?.role === UserRole.TEACHER}
                                playsInline 
                                className="w-full h-full object-contain" 
                            />
                            {!isCamOn && (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col">
                                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4"><UserIcon size={48}/></div>
                                    <p className="text-xl font-medium">Camera Paused</p>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse flex items-center">
                                <div className="w-2 h-2 bg-white rounded-full mr-2"></div> LIVE VIDEO
                            </div>
                        </div>
                    )}
                    
                    {currentUser?.role === UserRole.TEACHER && handRaisedUsers.length > 0 && (
                      <div className="absolute top-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl shadow-lg flex flex-col space-y-2 min-w-[200px] animate-slide-in z-20">
                        <p className="font-bold flex items-center text-sm"><Hand className="mr-2" size={16} /> Hands Raised ({handRaisedUsers.length})</p>
                        {handRaisedUsers.map(uid => {
                            const student = users.find(u => u.id === uid);
                            return (
                                <div key={uid} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-yellow-100">
                                    <span>{student?.name}</span>
                                    <div className="flex space-x-1">
                                        <button onClick={() => grantPermission(uid, 'mic')} className="p-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"><Mic size={12}/></button>
                                        <button onClick={() => grantPermission(uid, 'board')} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><Edit3 size={12}/></button>
                                    </div>
                                </div>
                            )
                        })}
                      </div>
                    )}
                  </div>
                )}
                
                {isLiveActive && currentUser?.role === UserRole.TEACHER && (
                    <div className="h-20 bg-slate-900 rounded-xl flex items-center justify-between px-8 shadow-2xl">
                    <div className="flex items-center space-x-6">
                        <button 
                            onClick={() => toggleMedia('mic')} 
                            className={`p-4 rounded-full transition-all duration-300 ${isMicOn ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        >
                            {isMicOn ? <Mic size={24}/> : <MicOff size={24}/>}
                        </button>
                        <button 
                            onClick={() => toggleMedia('cam')} 
                            className={`p-4 rounded-full transition-all duration-300 ${isCamOn ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        >
                            <Video size={24}/>
                        </button>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        setIsLiveActive(false);
                        setIsCamOn(false);
                        setIsMicOn(false);
                        if(localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
                        // End in DB
                        await dbService.endLiveSession();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition"
                    >
                      END STREAM
                    </button>
                    </div>
                )}

                {isLiveActive && currentUser?.role === UserRole.STUDENT && (
                    <div className="h-16 bg-slate-900 rounded-xl flex items-center justify-center px-8 shadow-2xl text-white">
                        <span className="flex items-center"><Eye className="mr-2" /> You are watching the live session</span>
                    </div>
                )}
              </div>

              <div className="col-span-3 flex flex-col gap-4 h-full">
                {broadcastMode === 'WHITEBOARD' && (
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg">
                    {isLiveActive ? (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover transform scale-x-[-1]" 
                            />
                            {!isCamOn && (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                    <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto mb-2 flex items-center justify-center"><UserIcon size={32}/></div>
                                    <p className="text-sm font-medium">Camera Off</p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                            <p className="text-xs uppercase tracking-widest">Offline</p>
                        </div>
                    )}
                    </div>
                )}

                <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${broadcastMode === 'VIDEO' ? 'h-full' : ''}`}>
                  <div className="p-3 border-b bg-slate-50 font-semibold text-slate-700 text-sm flex justify-between items-center">
                      <span>Live Chat</span>
                      <span className="text-xs text-slate-400 flex items-center"><Users size={12} className="mr-1"/> {users.length}</span>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/30">
                    <div className="text-sm"><span className="font-bold text-indigo-600">Admin:</span> Welcome class!</div>
                  </div>
                  <div className="p-3 border-t bg-white">
                    <input type="text" placeholder="Type a message..." className="w-full text-sm p-2 bg-slate-100 rounded border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 transition outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: VIDEOS */}
          {currentView === 'VIDEOS' && (
              <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center">
                      <h2 className="text-3xl font-bold text-slate-800">Course Videos</h2>
                      {currentUser?.role === UserRole.TEACHER && (
                          <button 
                            onClick={() => setShowVideoModal(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-indigo-700 transition flex items-center"
                          >
                              <Plus size={18} className="mr-2"/> Add New Video
                          </button>
                      )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videos.length === 0 && (
                          <div className="col-span-full text-center py-20 text-slate-400">
                              <Film size={48} className="mx-auto mb-4 opacity-50"/>
                              <p>No videos available yet.</p>
                          </div>
                      )}
                      {videos.map(video => (
                          <div key={video.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 group">
                              <div className="aspect-video bg-black relative">
                                  <video src={video.url} controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-cover"/>
                                  <div className="absolute top-2 right-2 opacity-30 pointer-events-none select-none text-white text-[10px] font-mono">PROTECTED</div>
                              </div>
                              <div className="p-4">
                                  <h3 className="font-bold text-slate-800 truncate">{video.title}</h3>
                                  <p className="text-xs text-slate-500 mt-1">Uploaded {new Date(video.timestamp).toLocaleDateString()}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* VIEW: EXAMS */}
          {currentView === 'EXAM' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <h2 className="text-3xl font-bold text-slate-800">Lessons & Exams</h2>
                {activeExam ? (
                     <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                        <h2 className="text-xl font-bold">{activeExam.title}</h2>
                        </div>
                        <div className="p-8">
                            <form id="examForm" onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const answers: Record<string, number> = {};
                                activeExam.questions.forEach(q => {
                                    const val = formData.get(q.id);
                                    if(val) answers[q.id] = parseInt(val as string);
                                });
                                submitExam(answers);
                            }}>
                                {activeExam.questions.map((q, idx) => (
                                    <div key={q.id} className="mb-10 p-6 bg-slate-50 rounded-xl border border-slate-100">
                                        <h3 className="text-lg font-bold mb-4 text-slate-800">{idx + 1}. {q.question}</h3>
                                        {q.imageUrl && <img src={q.imageUrl} className="max-h-60 rounded-lg mb-6 border border-slate-200" />}
                                        <div className="space-y-3">
                                            {q.options.map((opt, optIdx) => (
                                            <label key={optIdx} className="flex items-center p-4 border bg-white rounded-lg cursor-pointer hover:border-indigo-300 transition">
                                                <input type="radio" name={q.id} value={optIdx} required className="w-5 h-5 text-indigo-600 focus:ring-indigo-500" />
                                                <span className="ml-3 text-slate-700">{opt}</span>
                                            </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-end pt-6 border-t">
                                    <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg transform active:scale-95 transition">Submit Exam</button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {exams.map((exam, index) => {
                            const isFirst = index === 0;
                            const prevExam = exams[index - 1];
                            const isUnlocked = isFirst || (prevExam && currentUser?.passedExamIds?.includes(prevExam.id));
                            const isPassed = currentUser?.passedExamIds?.includes(exam.id);
                            const hasAccess = currentUser?.role === UserRole.TEACHER || currentUser?.role === UserRole.ADMIN || isUnlocked;
                            return (
                                <div key={exam.id} className={`p-6 rounded-xl border flex justify-between items-center ${hasAccess ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-75'}`}>
                                    <div className="flex items-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${isPassed ? 'bg-green-100 text-green-600' : hasAccess ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                            {isPassed ? <CheckCircle size={24}/> : hasAccess ? <Edit3 size={24}/> : <Lock size={24}/>}
                                        </div>
                                        <div><h3 className={`font-bold text-lg ${hasAccess ? 'text-slate-800' : 'text-slate-500'}`}>{exam.title}</h3></div>
                                    </div>
                                    <div className="flex space-x-2">
                                        {currentUser?.role === UserRole.STUDENT && (
                                            isPassed ? <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-sm">Completed</span> :
                                            isUnlocked ? <button onClick={() => setActiveExam(exam)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">Start Lesson</button> :
                                            <span className="flex items-center text-slate-500 bg-slate-200 px-4 py-2 rounded-lg text-sm font-medium"><Lock size={14} className="mr-2"/> Locked</span>
                                        )}
                                        {(currentUser?.role === UserRole.TEACHER || currentUser?.role === UserRole.ADMIN) && (
                                            <>
                                                <button onClick={() => openExamCreator(exam)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm">Edit</button>
                                                <button onClick={() => deleteExam(exam.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-sm">Delete</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
             </div>
          )}

          {/* VIEW: FORUM */}
          {currentView === 'FORUM' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800">Forum</h2>
              {!currentUser?.isForumBanned && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <textarea id="postContent" placeholder="Post to forum..." className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 resize-none h-24 focus:outline-none"></textarea>
                    <div className="flex justify-end mt-3">
                        <button 
                            onClick={async () => {
                                const el = document.getElementById('postContent') as HTMLTextAreaElement;
                                if(!el.value) return;
                                const newPost: ForumPost = { id: `post-${Date.now()}`, authorId: currentUser!.id, authorName: currentUser!.name, content: el.value, timestamp: Date.now() };
                                setForumPosts([newPost, ...forumPosts]);
                                if (dbStatus === 'CONNECTED') await dbService.addPost(newPost);
                                el.value = '';
                            }}
                            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-indigo-700"
                        >Post</button>
                    </div>
                </div>
              )}
              <div className="space-y-4">
                 {forumPosts.map(post => (
                   <div key={post.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <p className="text-sm font-bold text-slate-900">{post.authorName}</p>
                     <p className="text-slate-700 mt-2">{post.content}</p>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* VIEW: ANALYTICS */}
          {currentView === 'ANALYTICS' && (
              <div className="space-y-8 animate-fade-in">
                  <h2 className="text-3xl font-bold text-slate-800">Analytics</h2>
                  <DashboardCard title="Total Students" value={users.filter(u => u.role === UserRole.STUDENT).length} color="blue" />
              </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      {showExamCreator && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                      <h3 className="text-xl font-bold">{editingExamId ? 'Edit Exam' : 'New Exam'}</h3>
                      <button onClick={() => setShowExamCreator(false)}><X/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <input type="text" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="w-full border p-2 rounded" placeholder="Title" />
                      <div className="bg-indigo-50 p-4 rounded-xl">
                          <textarea value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)} className="w-full p-2 border rounded" placeholder="Question"></textarea>
                          <div className="mt-2 space-y-1">
                              {newOptions.map((opt, idx) => (
                                  <input key={idx} type="text" value={opt} onChange={e => {
                                      const n = [...newOptions]; n[idx] = e.target.value; setNewOptions(n);
                                  }} className="w-full border p-1 rounded text-sm" placeholder={`Option ${idx+1}`}/>
                              ))}
                          </div>
                          <button onClick={addQuestionToExam} className="w-full bg-indigo-600 text-white py-2 rounded mt-3">Add Question</button>
                      </div>
                      <button onClick={saveExam} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Exam</button>
                  </div>
              </div>
          </div>
      )}

      {showVideoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                 <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold">Add Video</h3><button onClick={() => setShowVideoModal(false)}><X/></button></div>
                 <div className="p-6 space-y-4">
                    <input type="text" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} className="w-full border p-2 rounded" placeholder="Title"/>
                    <input type="text" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} className="w-full border p-2 rounded" placeholder="URL"/>
                    <button onClick={saveNewVideo} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Save Video</button>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
      active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
    }`}
  >
    {React.cloneElement(icon, { size: 20 })}
    <span className="font-medium">{label}</span>
  </button>
);

const DashboardCard = ({ title, value, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase">{title}</p>
      <p className="text-3xl font-extrabold text-slate-800 mt-1">{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`}><BarChart2 size={24} /></div>
  </div>
);