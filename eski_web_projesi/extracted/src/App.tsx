import React, { useEffect, useState, useRef, FormEvent, ChangeEvent, useMemo, useCallback } from 'react';
import { TURKEY_PROVINCES, TURKEY_DISTRICTS } from './data/turkey';
import { Capacitor } from '@capacitor/core';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User, db, deleteUser, reauthenticateWithPopup, OperationType, handleFirestoreError, signInAnonymously, setPersistence, browserSessionPersistence } from './firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  query, 
  where,
  or,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
  collectionGroup,
  increment,
  arrayUnion,
  deleteField,
  limit,
  updateDoc
} from 'firebase/firestore';
import { 
  LogIn, 
  User as UserIcon, 
  Home, 
  Users, 
  ChevronDown, 
  List, 
  Key,
  Plus, 
  Upload, 
  ArrowUpDown, 
  ArrowLeftRight,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Info,
  Shuffle,
  Hand,
  X, 
  Download, 
  FileUp,
  Search,
  Trash2,
  AlertTriangle,
  School,
  Edit3,
  PenTool,
  Calendar,
  Menu,
  LayoutGrid,
  Users2,
  Award,
  Star,
  ClipboardList,
  Timer,
  Settings,
  Clock,
  Utensils,
  LogOut,
  Mail,
  BookOpen,
  Library,
  FileText,
  Trophy,
  PlusCircle,
  ClipboardCheck,
  MoreVertical,
  UserPlus,
  Rocket,
  Quote,
  Smile,
  Book,
  ChevronRight,
  Instagram,
  Heart,
  MessageCircle,
  Cake,
  Gamepad2,
  Shield,
  Activity,
  Bell,
  BellDot,
  Mic,
  Megaphone,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { WelcomePopupViewer } from './components/WelcomePopupViewer';
import { ManualPlacementScreen } from './components/ManualPlacementScreen';
import { GroupGeneratorScreen } from './components/GroupGeneratorScreen';
import { LuckyStudentScreen } from './components/LuckyStudentScreen';
import { StarsBadgesScreen } from './components/StarsBadgesScreen';
import Announcements from './components/Announcements';
import { TimerScreen } from './components/TimerScreen';
import { LibraryManagementScreen } from './components/LibraryManagementScreen';
import { TournamentManagementScreen } from './components/TournamentManagementScreen';
import { TournamentFixtureScreen } from './components/TournamentFixtureScreen';
import { MemberDashboard } from './components/MemberDashboard';
import { ParentProfileSetup } from './components/ParentProfileSetup';
import { ParentDashboard } from './components/ParentDashboard';
import { ParentCompetitionPage } from './components/ParentCompetitionPage';
import { MyStudentsPage } from './components/MyStudentsPage';
import { LessonManagement } from './components/lesson-management/LessonManagement';
import { ActivityManagement, predefinedActivities } from './components/activity-management/ActivityManagement';
import { ExamManagement } from './components/exam-management/ExamManagement';
import { SiteManagement } from './components/admin/SiteManagement';
import { UserMessages } from './components/UserMessages';
import { ApiInfoModal } from './components/ApiInfoModal';
import { LESSONS, getLessonIdFromName } from './constants';

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  surname: string;
  gender: 'Erkek' | 'Kız';
  birthDate: string;
  parentEmail: string;
  parentEmail2?: string;
  teacherUid: string;
  stars?: number;
  starHistory?: { category: string; description?: string; amount?: number; timestamp: number }[];
}

export interface SeatingConfig {
  groupCount: number;
  peoplePerRow: number;
  rowsPerGroup: number[];
}

export interface ScheduleConfig {
  days: string[];
  lessonCount: number;
  startTime: string;
  recessDuration: number;
  customRecessDurations?: { [key: number]: number };
  lunchBreakDuration: number;
  lunchBreakAfterLesson: number;
  lessonDuration: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  teacherUid: string;
}

interface ScheduleData {
  slots: { [key: string]: string }; // day_lessonNumber -> subjectId
}

interface Book {
  id: string;
  registrationNo: number;
  name: string;
  author?: string;
  pageCount?: number;
  status?: string;
  currentStudentId?: string | null;
  currentStudentName?: string | null;
  assignmentDate?: any | null;
  isReadByAll?: boolean;
  teacherUid: string;
  createdAt: any;
  updatedAt: any;
}

export interface ReadingRecord {
  id: string;
  bookId: string;
  bookName: string;
  pageCount?: number;
  studentId: string;
  studentName: string;
  startDate: any;
  endDate: any;
  teacherUid: string;
  createdAt: any;
}

export interface ReadingEvaluation {
  id: string;
  bookId: string;
  studentId: string;
  readingScore?: number | null;
  tellingScore?: number | null;
  writingScore?: number | null;
  examScore?: number | null;
  teacherUid: string;
  updatedAt: any;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  player1Id: string; // studentId or "BYE" or "WINNER_OF_MATCH_X"
  player2Id: string;
  player1Name?: string;
  player2Name?: string;
  winnerId?: string;
  score1?: number;
  score2?: number;
  status: 'pending' | 'completed';
  nextMatchId?: string;
  matchCode?: string;
  isDoubleMatch?: boolean;
  pairCode?: string;
  isTieBreaker?: boolean;
  groupId?: string;
  groupName?: string;
  stage?: 'group' | 'knockout';
  createdAt: any;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  type: 'Eleme' | 'Lig' | 'Grup' | 'Grup+Eleme';
  matchType: 'Tek Maç' | 'Çift Maç';
  fixtureType: 'all' | 'round-by-round';
  winnerSelectionMethod: 'winner' | 'score';
  currentRound: number;
  participants: string[]; // student IDs
  extraParticipants?: string[];
  status: 'Devam Ediyor' | 'Tamamlandı';
  winnerName?: string;
  teacherUid: string;
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  groupCount?: number;
  groupNaming?: 'letters' | 'colors';
  advancingPerGroup?: number;
  currentStage?: 'group' | 'knockout';
  advancingPlayers?: string[];
  createdAt: any;
  updatedAt: any;
}

const DEFAULT_SUBJECTS = [
  { name: 'Matematik', color: '#3b82f6' },
  { name: 'Türkçe', color: '#ef4444' },
  { name: 'Hayat Bilgisi', color: '#10b981' },
  { name: 'Fen Bilimleri', color: '#f59e0b' },
  { name: 'Sosyal Bilgiler', color: '#8b5cf6' },
  { name: 'İngilizce', color: '#ec4899' },
  { name: 'Görsel Sanatlar', color: '#f97316' },
  { name: 'Müzik', color: '#06b6d4' },
  { name: 'Beden Eğitimi', color: '#6366f1' },
  { name: 'Serbest Etkinlikler', color: '#64748b' },
];

const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
  lessonCount: 6,
  startTime: '09:00',
  recessDuration: 10,
  customRecessDurations: {},
  lunchBreakDuration: 40,
  lunchBreakAfterLesson: 4,
  lessonDuration: 40
};

type SortConfig = {
  key: keyof Student;
  direction: 'asc' | 'desc';
} | null;

// Shuffle helper
const shuffle = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Title case helper
const toTitleCase = (str: string) => {
  return str.toLocaleLowerCase('tr-TR').split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
  }).join(' ');
};

export const generateElemeFixture = (tournamentId: string, participants: string[], fixtureType: 'all' | 'round-by-round', matchType: 'Tek Maç' | 'Çift Maç' = 'Tek Maç', startingRound: number = 1) => {
  // Ensure unique participants
  const uniqueParticipants = Array.from(new Set(participants));
  const shuffled = [...uniqueParticipants].sort(() => Math.random() - 0.5);
  const n = shuffled.length;
  
  let p = 1;
  while (p < n) p *= 2;
  
  const matchesInRound1 = n - (p / 2);
  const matches: any[] = [];
  
  // Round 1
  const round1Winners: string[] = [];
  for (let i = 0; i < matchesInRound1; i++) {
    const mCodeBase = `R${startingRound}-M${i+1}`;
    if (matchType === 'Çift Maç') {
      matches.push({
        tournamentId,
        round: startingRound,
        player1Id: shuffled[i * 2],
        player2Id: shuffled[i * 2 + 1],
        status: 'pending',
        matchCode: `${mCodeBase}-1`,
        isDoubleMatch: true,
        pairCode: mCodeBase,
        stage: 'knockout'
      });
      matches.push({
        tournamentId,
        round: startingRound,
        player1Id: shuffled[i * 2 + 1],
        player2Id: shuffled[i * 2],
        status: 'pending',
        matchCode: `${mCodeBase}-2`,
        isDoubleMatch: true,
        pairCode: mCodeBase,
        stage: 'knockout'
      });
    } else {
      matches.push({
        tournamentId,
        round: startingRound,
        player1Id: shuffled[i * 2],
        player2Id: shuffled[i * 2 + 1],
        status: 'pending',
        matchCode: mCodeBase,
        stage: 'knockout'
      });
    }
    round1Winners.push(`WINNER_OF_${mCodeBase}`);
  }
  
  const round2Participants = [
    ...round1Winners,
    ...shuffled.slice(matchesInRound1 * 2) // Byes
  ];
  
  if (fixtureType === 'all') {
    let currentRoundParticipants = round2Participants;
    let roundNum = startingRound + 1;
    while (currentRoundParticipants.length > 1) {
      const nextRoundWinners: string[] = [];
      for (let i = 0; i < currentRoundParticipants.length / 2; i++) {
        const mCodeBase = `R${roundNum}-M${i+1}`;
        if (matchType === 'Çift Maç') {
          matches.push({
            tournamentId,
            round: roundNum,
            player1Id: currentRoundParticipants[i * 2],
            player2Id: currentRoundParticipants[i * 2 + 1],
            status: 'pending',
            matchCode: `${mCodeBase}-1`,
            isDoubleMatch: true,
            pairCode: mCodeBase,
            stage: 'knockout'
          });
          matches.push({
            tournamentId,
            round: roundNum,
            player1Id: currentRoundParticipants[i * 2 + 1],
            player2Id: currentRoundParticipants[i * 2],
            status: 'pending',
            matchCode: `${mCodeBase}-2`,
            isDoubleMatch: true,
            pairCode: mCodeBase,
            stage: 'knockout'
          });
        } else {
          matches.push({
            tournamentId,
            round: roundNum,
            player1Id: currentRoundParticipants[i * 2],
            player2Id: currentRoundParticipants[i * 2 + 1],
            status: 'pending',
            matchCode: mCodeBase,
            stage: 'knockout'
          });
        }
        nextRoundWinners.push(`WINNER_OF_${mCodeBase}`);
      }
      currentRoundParticipants = nextRoundWinners;
      roundNum++;
    }
  }
  
  return matches;
};

const generateLigFixture = (tournamentId: string, participants: string[], matchType: 'Tek Maç' | 'Çift Maç' = 'Tek Maç') => {
  // Ensure unique participants
  const uniqueParticipants = Array.from(new Set(participants));
  const shuffled = [...uniqueParticipants].sort(() => Math.random() - 0.5);
  let n = shuffled.length;
  const hasBye = n % 2 !== 0;
  if (hasBye) {
    shuffled.push('BYE');
    n++;
  }

  const matches: any[] = [];
  const rounds = n - 1;
  const half = n / 2;

  const players = [...shuffled];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const p1 = players[i];
      const p2 = players[n - 1 - i];

      if (p1 !== 'BYE' && p2 !== 'BYE') {
        const mCodeBase = `W${r + 1}-M${i + 1}`;
        // Alternate home/away for the fixed player to be more fair
        const home = (r + i) % 2 === 0 ? p1 : p2;
        const away = (r + i) % 2 === 0 ? p2 : p1;

        matches.push({
          tournamentId,
          round: r + 1, // Week number
          player1Id: home,
          player2Id: away,
          status: 'pending',
          matchCode: mCodeBase
        });
      }
    }
    // Rotate players (Berger rotation)
    const last = players.pop()!;
    players.splice(1, 0, last);
  }

  if (matchType === 'Çift Maç') {
    const totalFirstHalfRounds = rounds;
    const firstHalfMatches = [...matches];
    for (let r = 0; r < rounds; r++) {
      const weekNum = totalFirstHalfRounds + r + 1;
      const weekMatches = firstHalfMatches.filter(m => m.round === r + 1);
      weekMatches.forEach((m, i) => {
        const mCodeBase = `W${weekNum}-M${i + 1}`;
        matches.push({
          tournamentId,
          round: weekNum,
          player1Id: m.player2Id,
          player2Id: m.player1Id,
          status: 'pending',
          matchCode: mCodeBase,
          isDoubleMatch: true,
          pairCode: m.matchCode
        });
        // Mark the first match as part of a pair
        m.isDoubleMatch = true;
        m.pairCode = m.matchCode;
      });
    }
  }

  return matches;
};

const generateGrupFixture = (tournamentId: string, participants: string[], matchType: 'Tek Maç' | 'Çift Maç' = 'Tek Maç', groupCount: number = 4, groupNaming: 'letters' | 'colors' = 'letters') => {
  // Ensure unique participants
  const uniqueParticipants = Array.from(new Set(participants));
  const shuffled = [...uniqueParticipants].sort(() => Math.random() - 0.5);
  const groups: { id: string, name: string, participants: string[] }[] = [];
  
  const colors = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Siyah', 'Beyaz'];
  
  for (let i = 0; i < groupCount; i++) {
    const name = groupNaming === 'letters' ? String.fromCharCode(65 + i) : (colors[i] || `Grup ${i + 1}`);
    groups.push({ id: `G${i + 1}`, name, participants: [] });
  }

  // Distribute participants
  shuffled.forEach((p, i) => {
    groups[i % groupCount].participants.push(p);
  });

  const allMatches: any[] = [];

  groups.forEach(group => {
    let n = group.participants.length;
    const hasBye = n % 2 !== 0;
    const groupParticipants = [...group.participants];
    if (hasBye) {
      groupParticipants.push('BYE');
      n++;
    }

    const rounds = n - 1;
    const half = n / 2;
    const players = [...groupParticipants];
    const groupMatches: any[] = [];

    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const p1 = players[i];
        const p2 = players[n - 1 - i];

        if (p1 !== 'BYE' && p2 !== 'BYE') {
          const mCodeBase = `${group.id}-W${r + 1}-M${i + 1}`;
          const home = (r + i) % 2 === 0 ? p1 : p2;
          const away = (r + i) % 2 === 0 ? p2 : p1;

          groupMatches.push({
            tournamentId,
            round: r + 1,
            player1Id: home,
            player2Id: away,
            status: 'pending',
            matchCode: mCodeBase,
            groupId: group.id,
            groupName: group.name
          });
        }
      }
      const last = players.pop()!;
      players.splice(1, 0, last);
    }

    if (matchType === 'Çift Maç') {
      const totalFirstHalfRounds = rounds;
      const firstHalfMatches = [...groupMatches];
      for (let r = 0; r < rounds; r++) {
        const weekNum = totalFirstHalfRounds + r + 1;
        const weekMatches = firstHalfMatches.filter(m => m.round === r + 1);
        weekMatches.forEach((m, i) => {
          const mCodeBase = `${group.id}-W${weekNum}-M${i + 1}`;
          groupMatches.push({
            tournamentId,
            round: weekNum,
            player1Id: m.player2Id,
            player2Id: m.player1Id,
            status: 'pending',
            matchCode: mCodeBase,
            isDoubleMatch: true,
            pairCode: m.matchCode,
            groupId: group.id,
            groupName: group.name
          });
          m.isDoubleMatch = true;
          m.pairCode = m.matchCode;
        });
      }
    }
    
    allMatches.push(...groupMatches);
  });

  return allMatches;
};

const InstagramEmbeds = () => {
  useEffect(() => {
    // Load Instagram embed script
    const script = document.createElement('script');
    script.src = "//www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
    
    // Process embeds if script is already loaded
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    }
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const embedHtml = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/reel/DRaxKbQjED2/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/reel/DRaxKbQjED2/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Bu gönderiyi Instagram&#39;da gör</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/reel/DRaxKbQjED2/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">Cihan ÖZEL (@cihan.ogretmen)&#39;in paylaştığı bir gönderi</a></p></div></blockquote>`;

  return (
    <div className="w-full max-w-md mx-auto lg:mx-0 flex justify-center lg:justify-end">
      <div className="w-full" dangerouslySetInnerHTML={{ __html: embedHtml }} />
    </div>
  );
};

declare global {
  interface Window {
    instgrm?: any;
  }
}

const tabToPath: Record<string, string> = {
  'home': '/',
  'class-list': '/sinif-listesi',
  'lesson-schedule': '/ders-programi',
  'seating-plan': '/oturma-plani',
  'group-creator': '/grup-olusturucu',
  'stars-badges': '/yildizlar-ve-rozetler',
  'lucky-student': '/sansli-ogrenci',
  'timer': '/zamanlayici',
  'announcements': '/duyurular',
  'library-list': '/kutuphane-listesi',
  'reading-records': '/okuma-kayitlari',
  'reading-evaluation': '/okuma-degerlendirme',
  'tournament-create': '/turnuva-olustur',
  'tournaments-list': '/turnuva-listesi',
  'site-management': '/site-yonetimi',
  'user-messages': '/mesajlar',
  'my-students': '/ogrencilerim',
  'class-competition': '/sinif-yarismasi',
  'parent-profile-setup': '/veli-profil-ayari',
  'teacher-profile-setup': '/ogretmen-profil-ayari',
  'add-book': '/kitap-ekle',
  'library': '/kutuphane',
  'exams': '/sinavlar',
  'exam-lesson-hayat-bilgisi': '/sinav/hayat-bilgisi',
  'exam-lesson-fen-bilimleri': '/sinav/fen-bilimleri',
  'exam-lesson-sosyal-bilgiler': '/sinav/sosyal-bilgiler',
  'exam-lesson-turkce': '/sinav/turkce',
  'exam-lesson-matematik': '/sinav/matematik',
  'exam-lesson-ingilizce': '/sinav/ingilizce',
  'lesson-hayat-bilgisi': '/ders/hayat-bilgisi',
  'lesson-fen-bilimleri': '/ders/fen-bilimleri',
  'lesson-sosyal-bilgiler': '/ders/sosyal-bilgiler',
  'lesson-turkce': '/ders/turkce',
  'lesson-matematik': '/ders/matematik',
  'lesson-ingilizce': '/ders/ingilizce',
  'activity-lesson-hayat-bilgisi': '/etkinlik/hayat-bilgisi',
  'activity-lesson-fen-bilimleri': '/etkinlik/fen-bilimleri',
  'activity-lesson-sosyal-bilgiler': '/etkinlik/sosyal-bilgiler',
  'activity-lesson-turkce': '/etkinlik/turkce',
  'activity-lesson-matematik': '/etkinlik/matematik',
  'activity-lesson-ingilizce': '/etkinlik/ingilizce',
};

const pathToTab = Object.fromEntries(Object.entries(tabToPath).map(([tab, path]) => [path, tab]));

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const isDeletingAccountRef = useRef(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '') || '/';
    const savedTab = localStorage.getItem('activeTab');
    
    if (hash === '/' && savedTab) return savedTab;
    return pathToTab[hash] || savedTab || 'home';
  });

  // Sync activeTab to localStorage and URL
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
    const targetPath = tabToPath[activeTab];
    // Only navigate if the current path is different from the target path
    if (targetPath && location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [activeTab, navigate, location.pathname]);

  // Sync URL to activeTab (handles back/forward buttons and initial load)
  useEffect(() => {
    const targetTab = pathToTab[location.pathname];
    // Only update activeTab if the URL has a known path and it's different from current activeTab
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [location.pathname]);
  const [selectedCompetitionSubject, setSelectedCompetitionSubject] = useState<string | null>(null);
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const [isParentMenuOpen, setIsParentMenuOpen] = useState(false);
  const [isCompetitionMenuOpen, setIsCompetitionMenuOpen] = useState(false);
  const [isLessonMenuOpen, setIsLessonMenuOpen] = useState(false);
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false);
  const [isLibraryMenuOpen, setIsLibraryMenuOpen] = useState(false);
  const [isExamMenuOpen, setIsExamMenuOpen] = useState(false);
  const [isTournamentMenuOpen, setIsTournamentMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeleteProfileConfirmOpen, setIsDeleteProfileConfirmOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFeatureGuide, setSelectedFeatureGuide] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'male' | 'female' | 'birthday'>('all');
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData>({ slots: {} });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isResetScheduleConfirmOpen, setIsResetScheduleConfirmOpen] = useState(false);
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
  const [isManualPlacementModalOpen, setIsManualPlacementModalOpen] = useState(false);
  const [isPlacementScreenOpen, setIsPlacementScreenOpen] = useState(false);
  const [isHorizontalShiftModalOpen, setIsHorizontalShiftModalOpen] = useState(false);
  const [isVerticalShiftModalOpen, setIsVerticalShiftModalOpen] = useState(false);
  const [isRandomPlacementModalOpen, setIsRandomPlacementModalOpen] = useState(false);
  const [randomPlacementStep, setRandomPlacementStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [referencePlan, setReferencePlan] = useState<{ config: SeatingConfig; plan: { [key: string]: string } } | null>(null);
  const [randomRules, setRandomRules] = useState({
    mixedGender: true,
    diffGroup: false,
    diffRow: false,
    diffPartner: false
  });
  const [fixedStudents, setFixedStudents] = useState<{ [studentId: string]: string }>({});
  const [fixedStudentForm, setFixedStudentForm] = useState({ studentId: '', group: 0, row: 0, seat: 0 });
  const [priorityStudents, setPriorityStudents] = useState<string[]>([]);
  const [horizontalShiftStep, setHorizontalShiftStep] = useState<1 | 2>(1);
  const [verticalShiftStep, setVerticalShiftStep] = useState<1 | 2>(1);
  const [tempShiftData, setTempShiftData] = useState<{ config: SeatingConfig; plan: { [key: string]: string } } | null>(null);
  const [shiftDirection, setShiftDirection] = useState<'left' | 'right'>('right');
  const [verticalShiftDirection, setVerticalShiftDirection] = useState<'forward' | 'backward'>('forward');
  const [shuffleWithinGroup, setShuffleWithinGroup] = useState(false);
  const [shuffleWithinRow, setShuffleWithinRow] = useState(false);
  const [seatingConfig, setSeatingConfig] = useState<SeatingConfig>({
    groupCount: 3,
    peoplePerRow: 2,
    rowsPerGroup: [5, 5, 5]
  });
  const [seatingPlan, setSeatingPlan] = useState<{ [key: string]: string }>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setGlobalError(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setGlobalError("İnternet bağlantınız kesildi. Uygulama kısıtlı modda çalışabilir.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Book Management States
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [isDeleteBookConfirmOpen, setIsDeleteBookConfirmOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState({ name: '', author: '', pageCount: '', assignToStudentId: '' });
  const [showBookSuggestions, setShowBookSuggestions] = useState(false);
  const [selectedExistingBook, setSelectedExistingBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const bookSuggestions = useMemo(() => {
    if (!bookForm.name || bookForm.name.length < 2) return [];
    return books.filter(b => 
      b.name.toLowerCase().includes(bookForm.name.toLowerCase())
    ).slice(0, 5);
  }, [books, bookForm.name]);
  const [readingRecords, setReadingRecords] = useState<ReadingRecord[]>([]);
  const [viewingTournament, setViewingTournament] = useState<Tournament | null>(null);
  const [isTournamentFixtureOpen, setIsTournamentFixtureOpen] = useState(false);
  const [readingEvaluations, setReadingEvaluations] = useState<ReadingEvaluation[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ active: 0, daily: 0, total: 0, trend: [] as any[] });
  const [luckyStudentConfig, setLuckyStudentConfig] = useState<{ isPersistent: boolean; selectedStudentIds: string[] } | null>(null);
  const [customAlert, setCustomAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'warning' | 'error' | 'success' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (message: string, title: string = 'Uyarı', type: 'warning' | 'error' | 'success' | 'info' = 'warning') => {
    setCustomAlert({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    let unsubscribeLucky: any;
    if (user) {
      unsubscribeLucky = onSnapshot(doc(db, `users/${user.uid}/settings`, 'luckyStudent'), (doc) => {
        if (doc.exists()) {
          setLuckyStudentConfig(doc.data() as any);
        } else {
          setLuckyStudentConfig({ isPersistent: false, selectedStudentIds: [] });
        }
      });
    }
    return () => unsubscribeLucky && unsubscribeLucky();
  }, [user]);

  const handleUpdateLuckyStudentConfig = async (config: { isPersistent: boolean; selectedStudentIds: string[] }) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/settings`, 'luckyStudent'), {
        ...config,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating lucky student config:', err);
    }
  };

  useEffect(() => {
    if (!user || books.length === 0) return;
    
    const needsCleanup = books.some(book => {
      const formattedTitle = toTitleCase(book.name);
      return book.name !== formattedTitle;
    });

    if (needsCleanup) {
      const cleanup = async () => {
        const batch = writeBatch(db);
        const booksRef = collection(db, `users/${user.uid}/books`);
        
        books.forEach(book => {
          const formattedTitle = toTitleCase(book.name);
          if (book.name !== formattedTitle) {
            const bookRef = doc(booksRef, book.id);
            batch.update(bookRef, { 
              name: formattedTitle, 
              updatedAt: serverTimestamp() 
            });
          }
        });
        
        try {
          await batch.commit();
          console.log('Book titles have been formatted');
        } catch (err) {
          console.error('Error cleaning up book titles:', err);
        }
      };
      
      cleanup();
    }
  }, [user, books.length]); // Only run when total count changes or on mount

  const handleSaveBook = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !bookForm.name) return;

    const formattedName = toTitleCase(bookForm.name);

    if (selectedExistingBook) {
      // Logic for existing book
      if (bookForm.assignToStudentId) {
        const student = students.find(s => s.id === bookForm.assignToStudentId);
        if (student) {
          if (selectedExistingBook.currentStudentId === student.id) {
            showAlert('Bu kitap zaten bu öğrenciye atanmış durumda.', 'Zaten Atanmış');
            return;
          }
          if (selectedExistingBook.currentStudentId) {
            showAlert(`Bu kitap zaten ${selectedExistingBook.currentStudentName} isimli öğrencide. Başka birine atamak için önce iade almalısınız.`, 'Kitap Kullanımda');
            return;
          }
          await handleAssignBook(selectedExistingBook, student.id, student.name);
        }
      }
      setIsAddBookModalOpen(false);
      setBookForm({ name: '', author: '', pageCount: '', assignToStudentId: '' });
      setSelectedExistingBook(null);
      setShowBookSuggestions(false);
      return;
    }

    // Check for unique name (case-insensitive)
    const isDuplicate = books.some(b => b.name.toLowerCase() === formattedName.toLowerCase());
    if (isDuplicate) {
      showAlert('Bu isimde bir kitap zaten kitaplığınızda mevcut. Her kitabın isminin benzersiz olması gerektiği için aynı isimle ikinci bir kayıt oluşturamazsınız. Lütfen kitap ismini kontrol edin veya farklı bir isim verin.', 'Mükerrer Kitap Kaydı');
      return;
    }

    // Find smallest available registration number
    const existingNos = books.map(b => b.registrationNo).sort((a, b) => a - b);
    let nextNo = 1;
    for (const no of existingNos) {
      if (no === nextNo) {
        nextNo++;
      } else if (no > nextNo) {
        break;
      }
    }

    const booksRef = collection(db, `users/${user.uid}/books`);
    try {
      const docRef = await addDoc(booksRef, {
        registrationNo: nextNo,
        name: formattedName,
        author: bookForm.author ? toTitleCase(bookForm.author) : '',
        pageCount: parseInt(bookForm.pageCount) || 0,
        teacherUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Handle optional student assignment
      if (bookForm.assignToStudentId) {
        const student = students.find(s => s.id === bookForm.assignToStudentId);
        if (student) {
          // Check if student already has a book
          const studentCurrentBook = books.find(b => b.currentStudentId === student.id);
          if (studentCurrentBook) {
            showAlert(`${student.name} zaten bir kitap okuyor. Kitap başarıyla eklendi ancak atama işlemi yapılamadı.`, 'Atama Atlandı');
          } else {
            const bookDoc = { id: docRef.id, name: formattedName, ...bookForm } as any;
            await handleAssignBook(bookDoc, student.id, student.name);
          }
        }
      }

      setIsAddBookModalOpen(false);
      setBookForm({ name: '', author: '', pageCount: '', assignToStudentId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/books`);
    }
  };

  const handleUpdateBook = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !editingBook || !bookForm.name) return;

    const formattedName = toTitleCase(bookForm.name);

    // Check for unique name (case-insensitive), excluding current book
    const isDuplicate = books.some(b => b.id !== editingBook.id && b.name.toLowerCase() === formattedName.toLowerCase());
    if (isDuplicate) {
      showAlert('Güncellemek istediğiniz bu kitap ismi zaten başka bir kitap için kullanılıyor. Kitaplık düzenini korumak için her kitabın ismi benzersiz olmalıdır. Lütfen farklı bir isim girin.', 'Mükerrer Kitap Kaydı');
      return;
    }

    const bookRef = doc(db, `users/${user.uid}/books`, editingBook.id);
    const { id, ...bookData } = editingBook;
    try {
      await setDoc(bookRef, {
        ...bookData,
        name: formattedName,
        author: bookForm.author ? toTitleCase(bookForm.author) : '',
        pageCount: parseInt(bookForm.pageCount) || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditBookModalOpen(false);
      setEditingBook(null);
      setBookForm({ name: '', author: '', pageCount: '', assignToStudentId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/books/${editingBook.id}`);
    }
  };

  const handleDeleteBook = async () => {
    if (!user || !editingBook) return;

    try {
      const batch = writeBatch(db);
      
      // Delete the book itself
      const bookRef = doc(db, `users/${user.uid}/books`, editingBook.id);
      batch.delete(bookRef);
      
      // Find and delete associated reading records
      const associatedRecords = readingRecords.filter(r => r.bookId === editingBook.id);
      associatedRecords.forEach(record => {
        const recordRef = doc(db, `users/${user.uid}/readingRecords`, record.id);
        batch.delete(recordRef);
      });
      
      // Find and delete associated reading evaluations
      const associatedEvaluations = readingEvaluations.filter(e => e.bookId === editingBook.id);
      associatedEvaluations.forEach(evaluation => {
        const evaluationRef = doc(db, `users/${user.uid}/readingEvaluations`, evaluation.id);
        batch.delete(evaluationRef);
      });
      
      await batch.commit();
      
      setIsDeleteBookConfirmOpen(false);
      setEditingBook(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/books/${editingBook.id}`);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user || !userProfile) return;
    
    try {
      const batch = writeBatch(db);
      const userDocRef = doc(db, 'users', user.uid);
      
      const updates: any = {};
      let nextTab = 'home';
      
      if (userProfile.profileType === 'ÖĞRETMEN') {
        updates.city = deleteField();
        updates.district = deleteField();
        updates.schoolName = deleteField();
        updates.gradeLevel = deleteField();
        updates.section = deleteField();
        
        if (userProfile.children && userProfile.children.length > 0) {
          updates.profileType = 'VELİ';
          updates.isProfileComplete = true;
          nextTab = 'my-students';
        } else {
          updates.profileType = 'ÜYE';
          updates.isProfileComplete = false;
          nextTab = 'home';
        }
      } else if (userProfile.profileType === 'VELİ') {
        updates.children = deleteField();
        
        if (userProfile.schoolName) {
          updates.profileType = 'ÖĞRETMEN';
          updates.isProfileComplete = true;
          nextTab = 'class-list';
        } else {
          updates.profileType = 'ÜYE';
          updates.isProfileComplete = false;
          nextTab = 'home';
        }
      } else {
        // Fallback for other cases
        updates.city = deleteField();
        updates.district = deleteField();
        updates.schoolName = deleteField();
        updates.gradeLevel = deleteField();
        updates.section = deleteField();
        updates.children = deleteField();
        updates.profileType = 'ÜYE';
        updates.isProfileComplete = false;
        nextTab = 'home';
      }
      
      batch.update(userDocRef, updates);
      await batch.commit();
      
      setIsDeleteProfileConfirmOpen(false);
      setIsProfileModalOpen(false);
      setActiveTab(nextTab);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSwitchProfile = async () => {
    if (!user || !userProfile) return;
    const newType = userProfile.profileType === 'ÖĞRETMEN' ? 'VELİ' : 'ÖĞRETMEN';
    
    if (newType === 'ÖĞRETMEN') {
      if (!userProfile.schoolName) {
        setActiveTab('teacher-profile-setup');
      } else {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          await setDoc(userDocRef, {
            profileType: newType,
            updatedAt: serverTimestamp()
          }, { merge: true });
          setActiveTab('home');
          setSelectedStudentId('all');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    } else if (newType === 'VELİ') {
      if (!userProfile.children || userProfile.children.length === 0) {
        setActiveTab('parent-profile-setup');
      } else {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          await setDoc(userDocRef, {
            profileType: newType,
            updatedAt: serverTimestamp()
          }, { merge: true });
          setActiveTab('my-students');
          setSelectedStudentId(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    }
    setIsProfileModalOpen(false);
  };

  const handleSetProfileType = async (type: 'ÖĞRETMEN' | 'VELİ') => {
    if (!user) return;
    if (type === 'VELİ') {
      setActiveTab('parent-profile-setup');
    } else {
      setActiveTab('teacher-profile-setup');
    }
  };

  const handleSaveParentProfile = async (children: any[]) => {
    if (!user) return;

    setIsSavingProfile(true);
    const userDocRef = doc(db, 'users', user.uid);
    const SCHOOL_SUFFIXES = ['İLKOKULU', 'ORTAOKULU', 'LİSESİ', 'KOLEJİ', 'ANAOKULU', 'AKADEMİSİ'];

    try {
      const processedChildren = [];
      const seenChildren = new Map();

      // Sort children to prioritize records with grade/section info
      const sortedChildren = [...children].sort((a, b) => {
        const aComplete = (a.gradeLevel || a.grade) && (a.section || a.sectionName);
        const bComplete = (b.gradeLevel || b.grade) && (b.section || b.sectionName);
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        return 0;
      });

      for (const child of sortedChildren) {
        if (seenChildren.has(`${child.studentNo}-${child.studentName}`)) continue;
        seenChildren.set(`${child.studentNo}-${child.studentName}`, true);

        let finalCity = child.city;
        let finalDistrict = child.district;
        let finalSchool = child.school;

        // Validation: The parent must have selected a student from the list
        if (!child.studentId) {
           setGlobalError("Lütfen listeden çocuğunuzu seçiniz.");
           setIsSavingProfile(false);
           return;
        }

        // Handle New School
        if (child.school === 'ADD_NEW' && child.newSchool) {
          let trimmedSchool = child.newSchool.trim().toLocaleUpperCase('tr-TR');
          
          // School Name Strict Validation
          const hasSuffix = SCHOOL_SUFFIXES.some(suffix => trimmedSchool.endsWith(suffix));
          
          if (!hasSuffix) {
            setGlobalError(`Karmaşıklığı ve mükerrer kayıtları önlemek için lütfen okul adını tam giriniz. "${trimmedSchool}" isminin sonuna türünü belirten bir ifade (İlkokulu, Ortaokulu, Lisesi, Koleji vb.) ekleyiniz.`);
            setIsSavingProfile(false);
            return;
          }

          const existingSchool = schools.find(s => 
            s.name.toLocaleUpperCase('tr-TR') === trimmedSchool && 
            s.cityName === finalCity &&
            s.districtName === finalDistrict
          );
          if (!existingSchool) {
            const safeCity = finalCity.replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeDist = finalDistrict.replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeSchool = trimmedSchool.replace(/[^a-zA-Z0-9_-]/g, '_');
            const schoolDocId = `${safeCity}-${safeDist}-${safeSchool}`;
            await setDoc(doc(db, 'schools', schoolDocId), { 
              name: trimmedSchool, 
              cityName: finalCity,
              districtName: finalDistrict
            }, { merge: true });
          }
          finalSchool = trimmedSchool;
        }

        const childToSave: any = {};
        for (const [key, value] of Object.entries(child)) {
          if (value !== undefined) {
            childToSave[key] = value;
          }
        }
        
        childToSave.city = finalCity || '';
        childToSave.district = finalDistrict || '';
        childToSave.school = finalSchool || '';
        
        delete childToSave.newSchool;

        // Skip records that don't have enough identifying information
        if (!childToSave.studentName || !childToSave.studentNo || !childToSave.school || childToSave.school === '-') {
          continue;
        }

        processedChildren.push(childToSave);
      }

      await setDoc(userDocRef, {
        isProfileComplete: true,
        profileType: 'VELİ',
        children: processedChildren
      }, { merge: true });

      // Link discovered students to this parent's email in Firestore
      for (const child of processedChildren) {
        if (child.teacherUid && child.studentId) {
          try {
            const studentRef = doc(db, `users/${child.teacherUid}/students/${child.studentId}`);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
              const currentData = studentSnap.data();
              const updateData: any = {};
              if (!currentData.parentEmail) {
                updateData.parentEmail = user.email;
              } else if (!currentData.parentEmail2 && currentData.parentEmail !== user.email) {
                updateData.parentEmail2 = user.email;
              }
              
              if (Object.keys(updateData).length > 0) {
                await setDoc(studentRef, { ...updateData, updatedAt: serverTimestamp() }, { merge: true });
              }
            }
          } catch (err) {
            console.warn("Could not automatically link student record:", err);
          }
        }
      }

      await fetchLinkedStudents();
      setIsProfileModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeletingAccount(true);
    isDeletingAccountRef.current = true;
    
    // Attempt re-authentication FIRST to ensure deleteUser will succeed
    try {
      await reauthenticateWithPopup(user, googleProvider);
    } catch (error: any) {
      console.error('Re-authentication failed:', error);
      alert('Hesabınızı silmek için kimliğinizi doğrulamanız gerekmektedir. İşlem iptal edildi.');
      setIsDeletingAccount(false);
      isDeletingAccountRef.current = false;
      return;
    }

    try {
      // 1. Delete all subcollections
      const subcollections = [
        'students',
        'subjects',
        'books',
        'readingRecords',
        'readingEvaluations',
        'tournaments',
        'config',
        'notifications',
        'activityInstances',
        'activityScores',
        'lessonQuestions',
        'lessonUnits',
        'lessonOutcomes'
      ];

      for (const sub of subcollections) {
        const subPath = `users/${user.uid}/${sub}`;
        let snapshot;
        try {
          const q = query(collection(db, subPath));
          snapshot = await getDocs(q);
        } catch (error: any) {
          console.error(`Error listing subcollection ${subPath}:`, error);
          alert(`Alt koleksiyon silinirken hata (${sub}): ${error.message || error}`);
          setIsDeletingAccount(false);
          isDeletingAccountRef.current = false;
          return;
        }
        
        // For tournaments, we also need to delete matches subcollection
        if (sub === 'tournaments') {
          for (const docSnap of snapshot.docs) {
            const matchesPath = `users/${user.uid}/tournaments/${docSnap.id}/matches`;
            try {
              const matchesQ = query(collection(db, matchesPath));
              const matchesSnap = await getDocs(matchesQ);
              const matchBatch = writeBatch(db);
              matchesSnap.docs.forEach(matchDoc => {
                matchBatch.delete(matchDoc.ref);
              });
              if (matchesSnap.docs.length > 0) {
                await matchBatch.commit();
              }
            } catch (error: any) {
              console.error(`Error deleting matches ${matchesPath}:`, error);
              alert(`Maçlar silinirken hata: ${error.message || error}`);
              setIsDeletingAccount(false);
              isDeletingAccountRef.current = false;
              return;
            }
          }
        }

        // For lessonUnits, we also need to delete leaderboard subcollection
        if (sub === 'lessonUnits') {
          for (const docSnap of snapshot.docs) {
            const leaderboardPath = `users/${user.uid}/lessonUnits/${docSnap.id}/leaderboard`;
            try {
              const leaderboardQ = query(collection(db, leaderboardPath));
              const leaderboardSnap = await getDocs(leaderboardQ);
              const lbBatch = writeBatch(db);
              leaderboardSnap.docs.forEach(lbDoc => {
                lbBatch.delete(lbDoc.ref);
              });
              if (leaderboardSnap.docs.length > 0) {
                await lbBatch.commit();
              }
            } catch (error: any) {
              console.error(`Error deleting leaderboard ${leaderboardPath}:`, error);
              alert(`Liderlik tablosu silinirken hata: ${error.message || error}`);
              setIsDeletingAccount(false);
              isDeletingAccountRef.current = false;
              return;
            }
          }
        }

        // Delete documents in batches of 500
        const batches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((docSnap) => {
          currentBatch.delete(docSnap.ref);
          count++;
          if (count === 500) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            count = 0;
          }
        });

        if (count > 0) {
          batches.push(currentBatch.commit());
        }

        try {
          await Promise.all(batches);
        } catch (error: any) {
          console.error(`Error committing batch delete for ${subPath}:`, error);
          alert(`Toplu silme işleminde hata (${subPath}): ${error.message || error}`);
          setIsDeletingAccount(false);
          isDeletingAccountRef.current = false;
          return;
        }
      }

      // 2. Delete user document, chat and presence
      const userDocPath = `users/${user.uid}`;
      const chatDocPath = `chats/${user.uid}`;
      const presenceDocPath = `presence/${user.uid}`;
      try {
        const userDocRef = doc(db, userDocPath);
        const chatDocRef = doc(db, chatDocPath);
        const presenceDocRef = doc(db, presenceDocPath);
        await deleteDoc(userDocRef);
        await deleteDoc(chatDocRef);
        await deleteDoc(presenceDocRef);
      } catch (error: any) {
        console.error('Error deleting user/chat/presence docs:', error);
        alert(`Kullanıcı belgesi silinirken hata: ${error.message || error}`);
      }

      // 3. Delete user from Firebase Auth
      try {
        await deleteUser(user);
        alert('Hesabınız başarıyla silindi.');
      } catch (authError: any) {
        console.error('Auth deletion error:', authError);
        alert(`Kimlik doğrulama silinirken hata: ${authError.message || authError}`);
        // Even if auth deletion fails, we sign them out since data is deleted
        await signOut(auth);
      }
      
      // Clear all browser remnants
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (error: any) {
      // General error fallback
      console.error('Account deletion failed:', error);
      alert(`Hesap silinirken genel bir hata oluştu: ${error.message || error}`);
      setIsDeletingAccount(false);
      isDeletingAccountRef.current = false;
    }
  };

  const handleRandomPlacement = () => {
    const studentsToPlace = [...students];
    const newPlan: { [key: string]: string } = {};
    const availableSeats: string[] = [];

    // 1. Generate all available seats
    for (let g = 0; g < seatingConfig.groupCount; g++) {
      for (let r = 0; r < seatingConfig.rowsPerGroup[g]; r++) {
        for (let s = 0; s < seatingConfig.peoplePerRow; s++) {
          availableSeats.push(`g${g}-r${r}-s${s}`);
        }
      }
    }

    // 2. Handle Fixed Students
    Object.entries(fixedStudents).forEach(([studentId, seatId]) => {
      const sId = studentId as string;
      const stId = seatId as string;
      
      // Validate if seat still exists in current config
      if (availableSeats.includes(stId)) {
        newPlan[stId] = sId;
        const seatIdx = availableSeats.indexOf(stId);
        if (seatIdx > -1) availableSeats.splice(seatIdx, 1);
        const studentIdx = studentsToPlace.findIndex(s => s.id === sId);
        if (studentIdx > -1) studentsToPlace.splice(studentIdx, 1);
      }
    });

    // 3. Handle Priority Students (Front rows first)
    const sortedSeats = [...availableSeats].sort((a, b) => {
      const matchA = a.match(/g(\d+)-r(\d+)-s(\d+)/);
      const matchB = b.match(/g(\d+)-r(\d+)-s(\d+)/);
      if (matchA && matchB) {
        const rA = parseInt(matchA[2]);
        const rB = parseInt(matchB[2]);
        if (rA !== rB) return rA - rB; // Row index first
        const gA = parseInt(matchA[1]);
        const gB = parseInt(matchB[1]);
        if (gA !== gB) return gA - gB; // Then group index
        return parseInt(matchA[3]) - parseInt(matchB[3]); // Then seat index
      }
      return 0;
    });

    const priorityList = shuffle(studentsToPlace.filter(s => priorityStudents.includes(s.id)));
    const remainingList = shuffle(studentsToPlace.filter(s => !priorityStudents.includes(s.id)));

    // Rule: Mixed Gender (if false, we group by gender)
    if (!randomRules.mixedGender) {
      priorityList.sort((a, b) => a.gender.localeCompare(b.gender));
      remainingList.sort((a, b) => a.gender.localeCompare(b.gender));
    }

    // Combine: Priority first, then others
    let finalStudentQueue = [...priorityList, ...remainingList];

    // 4. Implement Reference Plan Rules (Best Effort)
    if (referencePlan && (randomRules.diffGroup || randomRules.diffRow || randomRules.diffPartner)) {
      const refPlan = referencePlan.plan;
      
      // Helper to find student's previous seat info
      const getRefInfo = (studentId: string) => {
        const seatId = Object.keys(refPlan).find(k => refPlan[k] === studentId);
        if (!seatId) return null;
        const match = seatId.match(/g(\d+)-r(\d+)-s(\d+)/);
        if (!match) return null;
        return {
          g: parseInt(match[1]),
          r: parseInt(match[2]),
          s: parseInt(match[3]),
          seatId
        };
      };

      // Helper to get partner in a plan
      const getPartnerId = (plan: { [key: string]: string }, seatId: string) => {
        const match = seatId.match(/g(\d+)-r(\d+)-s(\d+)/);
        if (!match) return null;
        const g = parseInt(match[1]);
        const r = parseInt(match[2]);
        const s = parseInt(match[3]);
        const partnerS = s % 2 === 0 ? s + 1 : s - 1;
        const partnerSeatId = `g${g}-r${r}-s${partnerS}`;
        return plan[partnerSeatId] || null;
      };

      // Helper to check if a student violates rules in a specific seat
      const checkViolation = (s: Student, g: number, r: number, sIdx: number) => {
        const sRef = getRefInfo(s.id);
        if (!sRef) return false;
        
        if (randomRules.diffGroup && g === sRef.g) return true;
        if (randomRules.diffRow && r === sRef.r) return true;
        
        if (randomRules.diffPartner) {
          const oldPartnerId = getPartnerId(refPlan, sRef.seatId);
          if (oldPartnerId) {
            const partnerS = sIdx % 2 === 0 ? sIdx + 1 : sIdx - 1;
            const partnerSeatId = `g${g}-r${r}-s${partnerS}`;
            
            // In the current logic, we are swapping in finalStudentQueue
            // So we need to check the current state of the queue
            const partnerIdxInQueue = sortedSeats.indexOf(partnerSeatId);
            if (partnerIdxInQueue !== -1 && partnerIdxInQueue < finalStudentQueue.length) {
              const currentPartner = finalStudentQueue[partnerIdxInQueue];
              if (currentPartner.id === oldPartnerId) return true;
            }
          }
        }
        return false;
      };

    // 2. Fix violations by swapping
    let attempts = 0;
    let hasViolations = true;
    while (hasViolations && attempts < 200) {
      hasViolations = false;
      attempts++;
      let currentViolations = 0;

      for (let i = 0; i < sortedSeats.length && i < finalStudentQueue.length; i++) {
        const seatId = sortedSeats[i];
        const student = finalStudentQueue[i];
        
        const currentMatch = seatId.match(/g(\d+)-r(\d+)-s(\d+)/);
        if (!currentMatch) continue;
        
        const currentG = parseInt(currentMatch[1]);
        const currentR = parseInt(currentMatch[2]);
        const currentS = parseInt(currentMatch[3]);

        if (checkViolation(student, currentG, currentR, currentS)) {
          currentViolations++;
          hasViolations = true;
          // Try to find a student later in the queue to swap with
          for (let j = i + 1; j < finalStudentQueue.length; j++) {
            const otherStudent = finalStudentQueue[j];
            const otherSeatId = sortedSeats[j];
            const otherMatch = otherSeatId.match(/g(\d+)-r(\d+)-s(\d+)/);
            if (!otherMatch) continue;

            const otherG = parseInt(otherMatch[1]);
            const otherR = parseInt(otherMatch[2]);
            const otherS = parseInt(otherMatch[3]);

            // Check if other student would violate in CURRENT seat
            const otherViolatesInCurrent = checkViolation(otherStudent, currentG, currentR, currentS);
            // Check if CURRENT student would violate in OTHER seat
            const currentViolatesInOther = checkViolation(student, otherG, otherR, otherS);
            
            if (!otherViolatesInCurrent && !currentViolatesInOther) {
              // Swap
              [finalStudentQueue[i], finalStudentQueue[j]] = [finalStudentQueue[j], finalStudentQueue[i]];
              break;
            }
          }
        }
      }
      if (attempts % 20 === 0) {
        console.log(`Attempt ${attempts}: ${currentViolations} violations remaining`);
      }
    }

    console.log(`Random placement finished in ${attempts} attempts. Final violations: ${hasViolations}`);
    }

    // 5. Place students into sorted seats
    sortedSeats.forEach((seatId, idx) => {
      if (idx < finalStudentQueue.length) {
        newPlan[seatId] = finalStudentQueue[idx].id;
      }
    });

    setSeatingPlan(newPlan);
    setIsRandomPlacementModalOpen(false);
    setIsPlacementScreenOpen(true);
  };

  const handleHorizontalShift = () => {
    if (!tempShiftData) return;
    
    const { config: loadedConfig, plan: loadedPlan } = tempShiftData;
    const newPlan: { [key: string]: string } = {};
    const groupCount = loadedConfig.groupCount;
    
    // 1. Group Shift
    Object.entries(loadedPlan).forEach(([seatId, studentId]) => {
      const match = seatId.match(/g(\d+)-r(\d+)-s(\d+)/);
      if (match) {
        const g = parseInt(match[1]);
        const r = parseInt(match[2]);
        const s = parseInt(match[3]);
        
        let nextG;
        if (shiftDirection === 'right') {
          nextG = (g + 1) % groupCount;
        } else {
          nextG = (g - 1 + groupCount) % groupCount;
        }

        // Check if the target row exists in the next group
        const targetR = r % loadedConfig.rowsPerGroup[nextG];
        const newSeatId = `g${nextG}-r${targetR}-s${s}`;
        newPlan[newSeatId] = studentId as string;
      }
    });

    // 2. Shuffle within group if requested
    if (shuffleWithinGroup) {
      const finalPlan: { [key: string]: string } = {};
      for (let g = 0; g < groupCount; g++) {
        // Collect students in this group
        const groupStudents: string[] = [];
        const groupSeats: string[] = [];
        
        Object.entries(newPlan).forEach(([seatId, studentId]) => {
          if (seatId.startsWith(`g${g}-`)) {
            groupStudents.push(studentId);
            groupSeats.push(seatId);
          }
        });

        // Shuffle students
        const shuffled = shuffle(groupStudents);
        groupSeats.forEach((seatId, idx) => {
          if (idx < shuffled.length) {
            finalPlan[seatId] = shuffled[idx];
          }
        });
      }
      setSeatingPlan(finalPlan);
    } else {
      setSeatingPlan(newPlan);
    }

    setSeatingConfig(loadedConfig);
    setIsHorizontalShiftModalOpen(false);
    setIsPlacementScreenOpen(true);
  };

  const handleShiftFileLoad = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.config && data.plan) {
          setTempShiftData(data);
        } else {
          showAlert('Geçersiz dosya formatı. Lütfen geçerli bir oturma planı dosyası seçin.', 'Hata', 'error');
        }
      } catch (error) {
        showAlert('Dosya okunurken bir hata oluştu.', 'Hata', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleReferencePlanLoad = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.config && data.plan) {
          setReferencePlan(data);
          setSeatingConfig(data.config); // Auto-populate seating configuration
          setRandomPlacementStep(2); // Auto advance if plan loaded
        }
      } catch (error) {
        console.error('Error parsing reference plan:', error);
      }
    };
    reader.readAsText(file);
  };

  const togglePriorityStudent = (studentId: string) => {
    setPriorityStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handleVerticalShift = () => {
    if (!tempShiftData) return;
    
    const { config: loadedConfig, plan: loadedPlan } = tempShiftData;
    const newPlan: { [key: string]: string } = {};
    
    // 1. Row Shift
    Object.entries(loadedPlan).forEach(([seatId, studentId]) => {
      const match = seatId.match(/g(\d+)-r(\d+)-s(\d+)/);
      if (match) {
        const g = parseInt(match[1]);
        const r = parseInt(match[2]);
        const s = parseInt(match[3]);
        
        const rowCount = loadedConfig.rowsPerGroup[g];
        let nextR;
        if (verticalShiftDirection === 'forward') {
          nextR = (r - 1 + rowCount) % rowCount;
        } else {
          nextR = (r + 1) % rowCount;
        }

        const newSeatId = `g${g}-r${nextR}-s${s}`;
        newPlan[newSeatId] = studentId as string;
      }
    });

    // 2. Shuffle within row across all groups if requested
    if (shuffleWithinRow) {
      const finalPlan: { [key: string]: string } = {};
      const maxRows = Math.max(...loadedConfig.rowsPerGroup);
      
      for (let r = 0; r < maxRows; r++) {
        // Collect all students and their current seats for row index 'r' across ALL groups
        const rowStudents: string[] = [];
        const rowSeats: string[] = [];
        
        Object.entries(newPlan).forEach(([seatId, studentId]) => {
          const match = seatId.match(/g\d+-r(\d+)-s\d+/);
          if (match && parseInt(match[1]) === r) {
            rowStudents.push(studentId);
            rowSeats.push(seatId);
          }
        });

        // Shuffle the students collected from this row index
        const shuffled = shuffle(rowStudents);
        
        // Redistribute them back to the seats of the same row index
        rowSeats.forEach((seatId, idx) => {
          if (idx < shuffled.length) {
            finalPlan[seatId] = shuffled[idx];
          }
        });
      }
      setSeatingPlan(finalPlan);
    } else {
      setSeatingPlan(newPlan);
    }

    setSeatingConfig(loadedConfig);
    setIsVerticalShiftModalOpen(false);
    setIsPlacementScreenOpen(true);
  };
  const [isSubjectSelectModalOpen, setIsSubjectSelectModalOpen] = useState(false);
  const [isSubjectEditModalOpen, setIsSubjectEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', color: '#3b82f6' });
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; lessonNumber: number } | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleConfig>(DEFAULT_SCHEDULE_CONFIG);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const isInitializingSubjects = useRef(false);
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  // Lazy fetching functions to save costs
  const loadCities = async () => {
    if (cities.length > 0) return;
    setIsLoadingCities(true);
    console.log("Loading cities from local data...");
    
    // Use fixed Turkey provinces array
    const mappedCities = TURKEY_PROVINCES.map(city => ({
      id: city,
      name: city
    })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    
    setCities(mappedCities);
    setIsLoadingCities(false);
  };

  const loadDistricts = async (cityName: string) => {
    if (!cityName || cityName === 'ADD_NEW') return;
    setIsLoadingDistricts(true);
    console.log("Loading districts for:", cityName);
    
    // Use fixed Turkey districts object
    const cityDistricts = TURKEY_DISTRICTS[cityName] || [];
    const mappedDistricts = cityDistricts.map(dist => ({
      id: `${cityName}-${dist}`,
      name: dist,
      cityName: cityName
    })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    
    setDistricts(prev => {
      const filteredPrev = prev.filter(d => d.cityName !== cityName);
      return [...filteredPrev, ...mappedDistricts];
    });
    
    setIsLoadingDistricts(false);
  };

  const loadSchools = async (cityName: string, districtName: string) => {
    if (!cityName || !districtName || districtName === 'ADD_NEW') return;
    setIsLoadingSchools(true);
    console.log("Loading schools for:", cityName, districtName);
    try {
      const q = query(collection(db, 'schools'), 
        where('cityName', '==', cityName),
        where('districtName', '==', districtName)
      );
      const snapshot = await getDocs(q);
      const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Raw schools inside loadSchools:", rawData);
      // Ensure unique school names within district (case-insensitive)
      const uniqueSchools = rawData.filter((school: any, index: number, self: any[]) =>
        index === self.findIndex((t) => t.name.toLocaleUpperCase('tr-TR') === school.name.toLocaleUpperCase('tr-TR'))
      );
      setSchools(prev => {
        const filteredPrev = prev.filter(s => !(s.cityName === cityName && s.districtName === districtName));
        return [...filteredPrev, ...uniqueSchools];
      });
      console.log("Filtered schools inside loadSchools:", uniqueSchools);
    } catch (err) {
      console.error("Error loading schools:", err);
      handleFirestoreError(err, OperationType.LIST, 'schools');
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const searchStudentsInSchool = async (schoolName: string, gradeLevel: string, section: string) => {
    if (!schoolName || !gradeLevel || !section || !user?.email) return [];
    try {
      // Security first: ALWAYS fetch only students directly linked to this parent's email.
      // We use collectionGroup without combining other where clauses to avoid complex index requirements.
      const qLinked = query(
        collectionGroup(db, 'students'), 
        or(
          where('parentEmail', '==', user.email),
          where('parentEmail2', '==', user.email)
        )
      );
      
      const snapshot = await getDocs(qLinked);
      
      const allStudents = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          teacherUid: docSnap.ref.parent.parent?.id
        };
      });

      // Now filter in memory by the selected school, grade, and section
      const filteredStudents = allStudents.filter((s: any) => 
        s.schoolName === schoolName &&
        s.gradeLevel === gradeLevel &&
        s.section === section
      );

      return filteredStudents;
    } catch (error: any) {
      console.error("Search students error:", error);
      if (error?.message?.includes("index")) {
         setGlobalError("Sistem araması optimize ediliyor. Lütfen biraz sonra tekrar deneyiniz.");
      }
      return [];
    }
  };

  const hasAttemptedUpgradeRef = useRef(false);

  const fetchLinkedStudents = useCallback(async (forcedProfile?: any) => {
    // Only proceed if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;
    
    try {
      const parentEmailLower = currentUser.email.toLowerCase();
      const qLinked = query(
        collectionGroup(db, 'students'), 
        or(
          where('parentEmail', '==', parentEmailLower),
          where('parentEmail2', '==', parentEmailLower)
        )
      );
      
      const snapshot = await getDocs(qLinked);
      const linkedData: any[] = [];
      
      for (const docSnap of snapshot.docs) {
        const student = { id: docSnap.id, ...docSnap.data() } as any;
        if (!student.teacherUid) {
          student.teacherUid = docSnap.ref.parent.parent?.id;
        }
        
        if (student.teacherUid) {
          try {
            const teacherDocRef = doc(db, 'users', student.teacherUid);
            const teacherSnap = await getDoc(teacherDocRef);
            if (teacherSnap.exists()) {
              student.teacherProfile = teacherSnap.data();
            }
          } catch (err) {
            console.warn("Could not fetch teacher profile for student", student.id, err);
          }
        }
        linkedData.push(student);
      }
      setLinkedStudents(linkedData);

      // AUTO-UPGRADE LOGIC:
      // Use the provided profile or the current one (passed to function)
      // Check if we should upgrade and haven't attempted it yet in this cycle
      const profile = forcedProfile || userProfile;
      if (linkedData.length > 0 && 
          (!profile || profile.profileType === 'ÜYE' || !profile.isProfileComplete) && 
          !hasAttemptedUpgradeRef.current) {
        
        hasAttemptedUpgradeRef.current = true;
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Sort linkedData to put complete records first
        const sortedLinkedData = [...linkedData].sort((a, b) => {
          const aComplete = (a.gradeLevel || a.grade) && (a.section || a.sectionName);
          const bComplete = (b.gradeLevel || b.grade) && (b.section || b.sectionName);
          if (aComplete && !bComplete) return -1;
          if (!aComplete && bComplete) return 1;
          return 0;
        });
        
        // Remove duplicates in childrenToLink based on studentNo
        const uniqueMap = new Map();
        sortedLinkedData.forEach(s => {
          if (!uniqueMap.has(s.studentNo)) {
            uniqueMap.set(s.studentNo, {
              studentNo: s.studentNo || '',
              studentName: s.name || '',
              school: s.teacherProfile?.schoolName || s.schoolName || '',
              grade: s.gradeLevel || s.grade || '',
              section: s.section || ''
            });
          }
        });
        const uniqueChildren = Array.from(uniqueMap.values());

        await updateDoc(userDocRef, {
          profileType: 'VELİ',
          isProfileComplete: true,
          children: uniqueChildren,
          updatedAt: serverTimestamp()
        });
        
        console.log("Profile automatically upgraded to VELİ based on email match.");
      }

      return linkedData;
    } catch (error) {
      console.error("Linked students fetch error:", error);
      return [];
    }
  }, [user?.uid]); // Only depend on uid, not the full profile object
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'studentNo', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const confirmedStudents = useMemo(() => {
    // If we have linked students by email, they are implicitly confirmed if the teacher provided the email
    const emailMatchedStudents = linkedStudents.map(student => {
      // Find if this student was matched by email
      const isEmailMatch = student.parentEmail?.toLowerCase() === user?.email?.toLowerCase() || 
                          student.parentEmail2?.toLowerCase() === user?.email?.toLowerCase();
      
      // Also check if manually added to profile
      const matchingChild = userProfile?.children?.find((child: any) => 
        child.studentNo === student.studentNo && 
        child.studentName === student.name &&
        child.school === (student.teacherProfile?.schoolName || student.schoolName)
      );

      if (isEmailMatch || matchingChild) {
        return { 
          ...student, 
          parentGrade: matchingChild?.grade || student.gradeLevel, 
          parentSection: matchingChild?.section || student.section 
        };
      }
      return null;
    }).filter(Boolean);

    return emailMatchedStudents;
  }, [linkedStudents, userProfile?.children, user?.email]);

  const [parentTeacherSubjects, setParentTeacherSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (userProfile?.profileType === 'VELİ' && confirmedStudents.length > 0) {
      const teacherUids = Array.from(new Set(confirmedStudents.map(s => s?.teacherUid).filter(Boolean)));
      
      const fetchSubjects = async () => {
        const allSubjects: any[] = [];
        for (const uid of teacherUids) {
          try {
            const providerDoc = await getDoc(doc(db, 'users', uid as string));
            const passiveLessons = providerDoc.exists() ? (providerDoc.data().passiveLessons || []) : [];

            const snapshot = await getDocs(collection(db, `users/${uid}/subjects`));
            const subjects = snapshot.docs.map(document => ({ id: document.id, ...document.data(), teacherUid: uid }));
            
            const activeSubjects = subjects.filter((subject: any) => !passiveLessons.includes(getLessonIdFromName(subject.name)));
            allSubjects.push(...activeSubjects);
          } catch (err) {
            console.error("Error fetching parent teacher subjects:", err);
          }
        }
        setParentTeacherSubjects(allSubjects);
      };
      
      fetchSubjects();

    } else {
      setParentTeacherSubjects([]);
    }
  }, [userProfile?.profileType, confirmedStudents]);

  useEffect(() => {
    if (userProfile?.profileType === 'VELİ' && confirmedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(confirmedStudents[0].id);
    } else if (userProfile?.profileType === 'ÖĞRETMEN' && activeTab === 'class-list' && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [confirmedStudents, students, selectedStudentId, userProfile, activeTab]);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const togglePassiveLesson = async (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation();
    if (!user) return;
    const currentPassive = userProfile?.passiveLessons || [];
    const newPassive = currentPassive.includes(lessonId) 
      ? currentPassive.filter((id: string) => id !== lessonId)
      : [...currentPassive, lessonId];
      
    try {
      await setDoc(doc(db, 'users', user.uid), { passiveLessons: newPassive }, { merge: true });
    } catch(error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const navLessons = useMemo(() => {
    const list = userProfile?.profileType === 'ÖĞRETMEN' ? subjects : parentTeacherSubjects;
    
    // Yalnızca ismine göre benzersiz olanları gösterelim (Aynı isimde birden fazla ders tanımlanmışsa birleştir)
    const uniqueLessonsMap = new Map<string, any>();
    
    const excludedLessons = ['müzik', 'beden eğitimi ve oyun', 'beden eğitimi', 'görsel sanatlar', 'serbest etkinlikler'];

    list.forEach(subject => {
      const normalizedName = subject.name.trim().toLowerCase();
      if (excludedLessons.includes(normalizedName)) return;

      const legacyLessonId = getLessonIdFromName(subject.name);
      const rawId = legacyLessonId.replace('lesson-', '');
      if (!uniqueLessonsMap.has(legacyLessonId)) {
        uniqueLessonsMap.set(legacyLessonId, {
          keyId: subject.id,
          id: legacyLessonId,
          label: subject.name,
          rawId: rawId,
          allIds: [subject.id, legacyLessonId, rawId]
        });
      } else {
        const existing = uniqueLessonsMap.get(legacyLessonId);
        if (!existing.allIds.includes(subject.id)) {
          existing.allIds.push(subject.id);
        }
        // Ensure legacy variants are always present for historical data retrieval
        if (!existing.allIds.includes(legacyLessonId)) existing.allIds.push(legacyLessonId);
        if (!existing.allIds.includes(rawId)) existing.allIds.push(rawId);
      }
    });
    
    return Array.from(uniqueLessonsMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'tr-TR'));
  }, [userProfile?.profileType, subjects, parentTeacherSubjects]);

  const activeNavLessons = useMemo(() => {
    const passiveLessons = userProfile?.passiveLessons || [];
    return navLessons.filter(lesson => !passiveLessons.includes(lesson.id));
  }, [navLessons, userProfile?.passiveLessons]);

  const uniqueParentSubjects = useMemo(() => {
    return activeNavLessons;
  }, [activeNavLessons]);

  const handleConfigImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.config && data.plan) {
          setSeatingConfig(data.config);
          setSeatingPlan(data.plan);
        } else {
          setSeatingPlan(data);
        }
      } catch (error) {
        showAlert('Geçersiz dosya formatı.', 'Hata', 'error');
      }
    };
    reader.readAsText(file);
  };
  
  const [profileForm, setProfileForm] = useState({
    city: '',
    district: '',
    schoolName: '',
    gradeLevel: '1. Sınıf',
    section: 'A Şubesi',
    newCity: '',
    newDistrict: '',
    newSchool: ''
  });

  const [newStudent, setNewStudent] = useState({
    studentNo: '',
    name: '',
    surname: '',
    gender: 'Erkek' as 'Erkek' | 'Kız',
    birthDate: '',
    parentEmail: '',
    parentEmail2: ''
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const lessonMenuRef = useRef<HTMLDivElement>(null);
  const activityMenuRef = useRef<HTMLDivElement>(null);
  const libraryMenuRef = useRef<HTMLDivElement>(null);
  const examMenuRef = useRef<HTMLDivElement>(null);
  const tournamentMenuRef = useRef<HTMLDivElement>(null);
  const competitionMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const hasUpdatedLoginRef = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        hasUpdatedLoginRef.current = false;
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsClassMenuOpen(false);
      }
      if (lessonMenuRef.current && !lessonMenuRef.current.contains(event.target as Node)) {
        setIsLessonMenuOpen(false);
      }
      if (activityMenuRef.current && !activityMenuRef.current.contains(event.target as Node)) {
        setIsActivityMenuOpen(false);
      }
      if (libraryMenuRef.current && !libraryMenuRef.current.contains(event.target as Node)) {
        setIsLibraryMenuOpen(false);
      }
      if (examMenuRef.current && !examMenuRef.current.contains(event.target as Node)) {
        setIsExamMenuOpen(false);
      }
      if (tournamentMenuRef.current && !tournamentMenuRef.current.contains(event.target as Node)) {
        setIsTournamentMenuOpen(false);
      }
      if (competitionMenuRef.current && !competitionMenuRef.current.contains(event.target as Node)) {
        setIsCompetitionMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribeAuth();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setTeacherProfile(null);
      setIsDeletingAccount(false);
      return;
    }

    let unsubscribeRemote = () => {};

    // Use a reference to track the last processed timestamp to avoid clock-skew issues
    const lastProcessedRemoteUpdateRef = { current: 0 };

    const handleRemoteData = (data: any) => {
      if (data && data.activeTab) {
        const remoteTime = data.updatedAt || 0;
        if (remoteTime !== lastProcessedRemoteUpdateRef.current) {
          lastProcessedRemoteUpdateRef.current = remoteTime;
          setActiveTab(data.activeTab);
        }
      }
    };

    // Subscriptions array to unsubscribe all listeners
    const unsubRemote1 = onSnapshot(doc(db, 'users', user.uid, 'remote_control', 'state'), (docSnap) => {
      if (docSnap.exists()) {
        handleRemoteData(docSnap.data());
      }
    });

    let unsubRemote2 = () => {};
    const lowerEmail = (user.email || '').toLowerCase();
    if (lowerEmail === 'cihan.ozel10@gmail.com' || lowerEmail === 'cihanogretmen10@gmail.com') {
      unsubRemote2 = onSnapshot(doc(db, 'users', 'cihan_ozel_web_uid', 'remote_control', 'state'), (docSnap) => {
        if (docSnap.exists()) {
          handleRemoteData(docSnap.data());
        }
      });
    }

    unsubscribeRemote = () => {
      unsubRemote1();
      unsubRemote2();
    };

    // Fetch Teacher Profile
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        setTeacherProfile(data);
        const turkishToUpper = (text: string) => {
          if (!text) return '';
          return text.toLocaleUpperCase('tr-TR');
        };
        
        setProfileForm({
          city: turkishToUpper(data.city),
          district: turkishToUpper(data.district),
          schoolName: turkishToUpper(data.schoolName),
          gradeLevel: data.gradeLevel || '3. Sınıf',
          section: data.section || 'A Şubesi'
        });

        // Update last login even if user already exists
        if (!hasUpdatedLoginRef.current) {
          hasUpdatedLoginRef.current = true;
          updateDoc(userDocRef, { lastLogin: serverTimestamp() }).catch(err => {
            console.error("Error updating last login:", err);
          });
        }
      } else if (!isDeletingAccountRef.current && !isDeletingAccount && !user.isAnonymous) {
        // Create user doc if it doesn't exist
        const newUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isProfileComplete: false,
          profileType: 'ÜYE'
        };
        hasUpdatedLoginRef.current = true;
        setDoc(userDocRef, newUser).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      setGlobalError("Profil bilgileri yüklenirken bir hata oluştu.");
    });

    let path = `users/${user.uid}/students`;
    
    // If parent and viewing class list, fetch from teacher's collection
    if (userProfile?.profileType === 'VELİ' && linkedStudents.length > 0) {
      const targetTeacherUid = linkedStudents[0].teacherUid;
      if (targetTeacherUid) {
        path = `users/${targetTeacherUid}/students`;
      }
    }

    const q = query(collection(db, path));
    
    let unsubscribeStudents = () => {};
    
    if (userProfile?.profileType === 'VELİ') {
      getDocs(q).then(snapshot => {
        const studentData: Student[] = [];
        snapshot.forEach((doc) => {
          studentData.push({ id: doc.id, ...doc.data() } as Student);
        });
        studentData.sort((a, b) => (parseInt(a.studentNo) || 0) - (parseInt(b.studentNo) || 0));
        setStudents(studentData);
      }).catch(error => {
        handleFirestoreError(error, OperationType.LIST, path);
        setGlobalError("Öğrenci listesi yüklenirken bir hata oluştu.");
      });
    } else {
      unsubscribeStudents = onSnapshot(q, (snapshot) => {
        const studentData: Student[] = [];
        snapshot.forEach((doc) => {
          studentData.push({ id: doc.id, ...doc.data() } as Student);
        });
        
        // Sort students by studentNo (numeric)
        studentData.sort((a, b) => {
          const numA = parseInt(a.studentNo) || 0;
          const numB = parseInt(b.studentNo) || 0;
          return numA - numB;
        });
        
        setStudents(studentData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setGlobalError("Öğrenci listesi yüklenirken bir hata oluştu. Lütfen kotanızı kontrol edin.");
      });
    }

    if (userProfile?.profileType === 'VELİ' || userProfile?.profileType === 'ÜYE') {
      fetchLinkedStudents();
    }

    // Fetch Schedule Config (One-time)
    const fetchScheduleConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, `users/${user.uid}/config/schedule`));
        if (docSnap.exists()) {
          const data = docSnap.data() as ScheduleConfig;
          setScheduleConfig(data);
          setScheduleForm(data);
        } else {
          setScheduleConfig(null);
          setScheduleForm(DEFAULT_SCHEDULE_CONFIG);
        }
      } catch (err) {
        console.warn("Schedule config fetch error:", err);
      }
    };
    fetchScheduleConfig();

    // Fetch Subjects (Real-time)
    let unsubscribeSubjects = () => {};
    if (userProfile?.profileType === 'ÖĞRETMEN') {
      unsubscribeSubjects = onSnapshot(collection(db, `users/${user.uid}/subjects`), async (snapshot) => {
        const subList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        setSubjects(subList);

        if (snapshot.empty && !isInitializingSubjects.current) {
          isInitializingSubjects.current = true;
          const batch = writeBatch(db);
          for (const sub of DEFAULT_SUBJECTS) {
            const newDocRef = doc(collection(db, `users/${user.uid}/subjects`));
            batch.set(newDocRef, { 
              ...sub, 
              teacherUid: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          await batch.commit();
          isInitializingSubjects.current = false;
        }
      }, (err) => {
        console.warn("Subjects fetch error:", err);
      });
    }

    // Fetch Schedule Data (One-time)
    const fetchScheduleData = async () => {
      if (userProfile?.profileType !== 'ÖĞRETMEN') return;
      try {
        const docSnap = await getDoc(doc(db, `users/${user.uid}/config/scheduleData`));
        if (docSnap.exists()) {
          setScheduleData(docSnap.data() as ScheduleData);
        } else {
          setScheduleData({ slots: {} });
        }
      } catch (err) {
        console.warn("Schedule data fetch error:", err);
      }
    };
    fetchScheduleData();

    // Fetch Seating Config (One-time)
    const fetchSeatingConfig = async () => {
      if (userProfile?.profileType !== 'ÖĞRETMEN') return;
      try {
        const docSnap = await getDoc(doc(db, `users/${user.uid}/config/seating`));
        if (docSnap.exists()) {
          setSeatingConfig(docSnap.data() as SeatingConfig);
        }
      } catch (err) {
        console.warn("Seating config fetch error:", err);
      }
    };
    fetchSeatingConfig();

    // Fetch Seating Plan (One-time)
    const fetchSeatingPlan = async () => {
      if (userProfile?.profileType !== 'ÖĞRETMEN') return;
      try {
        const docSnap = await getDoc(doc(db, `users/${user.uid}/config/seatingPlan`));
        if (docSnap.exists()) {
          setSeatingPlan(docSnap.data().plan || {});
        }
      } catch (err) {
        console.warn("Seating plan fetch error:", err);
      }
    };
    fetchSeatingPlan();

    // Fetch Books (Real-time)
    let unsubscribeBooks = () => {};
    if (userProfile?.profileType === 'ÖĞRETMEN') {
      unsubscribeBooks = onSnapshot(collection(db, `users/${user.uid}/books`), (snapshot) => {
        setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
      }, (err) => {
        console.warn("Books fetch error:", err);
      });
    }

    // Fetch Reading Records (Keep real-time as it's active, but limit to save costs)
    let unsubscribeRecords = () => {};
    if (userProfile?.profileType === 'ÖĞRETMEN') {
      const qReading = query(
        collection(db, `users/${user.uid}/readingRecords`),
        orderBy('createdAt', 'desc')
      );
      unsubscribeRecords = onSnapshot(qReading, (snapshot) => {
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingRecord));
        setReadingRecords(records);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/readingRecords`);
      });
    }

    // Fetch Reading Evaluations (Real-time)
    let unsubscribeEvaluations = () => {};
    if (userProfile?.profileType === 'ÖĞRETMEN') {
      unsubscribeEvaluations = onSnapshot(collection(db, `users/${user.uid}/readingEvaluations`), (snapshot) => {
        setReadingEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingEvaluation)));
      }, (err) => {
        console.warn("Evaluations fetch error:", err);
      });
    }

    // Fetch Tournaments (Real-time)
    let unsubscribeTournaments = () => {};
    if (userProfile?.profileType === 'ÖĞRETMEN') {
      unsubscribeTournaments = onSnapshot(collection(db, `users/${user.uid}/tournaments`), (snapshot) => {
        setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)));
      }, (err) => {
        console.warn("Tournaments fetch error:", err);
      });
    }

    return () => {
      unsubscribeStudents();
      unsubscribeProfile();
      unsubscribeRecords();
      unsubscribeBooks();
      unsubscribeEvaluations();
      unsubscribeSubjects();
      unsubscribeTournaments();
      unsubscribeRemote();
    };
  }, [user, userProfile?.profileType, fetchLinkedStudents]);

  // Presence tracking logic continues below...
  useEffect(() => {
    // Presence tracking (Logged in + Anonymous)
    let presenceId = '';
    let isAnonymous = false;

    if (user) {
      presenceId = user.uid;
    } else {
      isAnonymous = true;
      let anonId = sessionStorage.getItem('anon_presence_id');
      if (!anonId) {
        anonId = 'anon_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('anon_presence_id', anonId);
      }
      presenceId = anonId;
    }

    const presenceRef = doc(db, `presence/${presenceId}`);
    const updatePresence = async () => {
      try {
        const data: any = {
          lastActive: serverTimestamp(),
          isAnonymous
        };
        if (user) {
          data.email = user.email;
          data.displayName = user.displayName;
          
          // Clean up anonymous presence if they just logged in
          const anonId = sessionStorage.getItem('anon_presence_id');
          if (anonId) {
            try {
              await deleteDoc(doc(db, `presence/${anonId}`));
              sessionStorage.removeItem('anon_presence_id');
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
        await setDoc(presenceRef, data, { merge: true });
      } catch (err) {
        console.error('Presence error:', err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 300000); // Every 5 minutes instead of 1

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (userProfile?.profileType !== 'VELİ' || !selectedStudentId) {
      setUnreadAnnouncementsCount(0);
      return;
    }

    const teacherUid = linkedStudents.find(s => s.id === selectedStudentId)?.teacherUid;
    if (!teacherUid) {
      setUnreadAnnouncementsCount(0);
      return;
    }

    const announcementsRef = collection(db, `users/${teacherUid}/announcements`);
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const isTargeted = data.targetAudience === 'ALL' || (data.targetStudentIds && data.targetStudentIds.includes(selectedStudentId));
        if (isTargeted) {
          const isAlreadyRead = data.readBy && data.readBy[selectedStudentId];
          if (!isAlreadyRead) {
            count++;
          }
        }
      });
      setUnreadAnnouncementsCount(count);
    }, (err) => {
      console.error("Okunmamış duyurular getirilemedi:", err);
    });

    return () => unsubscribe();
  }, [userProfile?.profileType, selectedStudentId, linkedStudents]);

  useEffect(() => {
    if (!user) return;
    let unsubscribe = () => {};
    if (userProfile?.profileType === 'ÖĞRETMEN') {
      const q = query(collection(db, 'chats'), where('teacherId', '==', user.uid));
      unsubscribe = onSnapshot(q, (snap) => {
        let count = 0;
        snap.forEach(doc => { count += doc.data().unreadCountTeacher || 0; });
        setUnreadMessagesCount(count);
      });
    } else if (userProfile?.profileType === 'VELİ' && selectedStudentId) {
      const student = linkedStudents.find(s => s.id === selectedStudentId);
      if (student?.teacherUid) {
        const q = query(collection(db, 'chats'), where('parentId', '==', user.uid), where('teacherId', '==', student.teacherUid));
        unsubscribe = onSnapshot(q, (snap) => {
          let count = 0;
          snap.forEach(doc => { count += doc.data().unreadCountParent || 0; });
          setUnreadMessagesCount(count);
        });
      }
    }
    return () => unsubscribe();
  }, [user, userProfile?.profileType, selectedStudentId, linkedStudents]);

  useEffect(() => {
    if (!user) return;
    
    // Notifications listener
    const notificationsRef = collection(db, `users/${user.uid}/notifications`);
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeNotifications();
    };
  }, [user]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const dailyRef = doc(db, 'daily_stats', today);
    
    const sessionKey = `visited_${today}`;
    if (!sessionStorage.getItem(sessionKey)) {
      setDoc(dailyRef, { count: increment(1) }, { merge: true }).catch(err => {
        console.warn("Failed to increment daily stats (offline?):", err.message);
      });
      sessionStorage.setItem(sessionKey, 'true');
    }

    // Only admins need to see live daily stats and trend to save on read costs
    const isAdmin = user?.email === 'cihan.ozel10@gmail.com';
    if (!isAdmin) return;

    const fetchDaily = async () => {
      try {
        const docSnap = await getDoc(dailyRef);
        if (docSnap.exists()) {
          setLiveStats(prev => ({ ...prev, daily: docSnap.data().count || 0 }));
        } else {
          setLiveStats(prev => ({ ...prev, daily: 0 }));
        }
      } catch (err) {
        console.warn("Daily stats fetch failed (expected if offline):", err);
        // Optionally handle with handleFirestoreError if we want strict reporting
        // handleFirestoreError(err, OperationType.GET, 'daily_stats/' + today);
      }
    };
    fetchDaily();

    // Fetch last 14 days for trend
    const fetchTrend = async () => {
      const statsPath = 'daily_stats';
      try {
        const statsRef = collection(db, statsPath);
        const q = query(statsRef, orderBy('__name__', 'desc'), limit(14));
        const snapshot = await getDocs(q);
        const trendData = snapshot.docs.map(d => ({
          date: d.id,
          visits: d.data().count || 0
        })).reverse();
        setLiveStats(prev => ({ ...prev, trend: trendData }));
      } catch (err) {
        console.warn("Trend fetch failed:", err);
      }
    };
    fetchTrend();

    return () => {};
  }, [user]);

  useEffect(() => {
    // Global stats listener - Optimized to reduce reads
    const presencePath = 'presence';
    const presenceRef = collection(db, presencePath);
    
    // Only admins should see global active user count to save on read costs
    const isAdmin = user?.email === 'cihan.ozel10@gmail.com';
    if (!isAdmin) return;

    const setupActiveListener = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
      const activeQuery = query(presenceRef, where('lastActive', '>=', fiveMinutesAgo));
      try {
        const snapshot = await getDocs(activeQuery);
        setLiveStats(prev => ({ ...prev, active: snapshot.size }));
      } catch (err) {
        console.warn("Active stats fetch failed:", err);
      }
    };

    setupActiveListener();

    return () => {};
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    const ref = doc(db, `users/${user.uid}/notifications`, notificationId);
    await setDoc(ref, { isRead: true }, { merge: true });
  };

  const handleNotificationClick = async (n: any) => {
    await handleMarkAsRead(n.id);
    setIsNotificationCenterOpen(false);
    
    if (n.type === 'message') {
      if (user?.email === 'cihan.ozel10@gmail.com') {
        setActiveTab('site-management');
        // We need a way to pass the selected chat ID to SiteManagement -> AdminMessages
        // For now, just opening the tab is a good start.
        // We can dispatch a custom event to select the chat.
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-admin-chat', { detail: { userId: n.senderId } }));
        }, 300);
      } else {
        setActiveTab('user-messages');
      }
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;
    const ref = doc(db, `users/${user.uid}/notifications`, notificationId);
    await deleteDoc(ref);
  };

  const handleDeleteAllNotifications = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      const ref = doc(db, `users/${user.uid}/notifications`, n.id);
      batch.delete(ref);
    });
    await batch.commit();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      if (Capacitor.isNativePlatform()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login Error Details:", {
          code: error.code,
          message: error.message,
          customData: error.customData
        });
        setGlobalError(`Giriş hatası: ${error.message} (Hata kodu: ${error.code})`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      
      // Auto-populate demo data if it doesn't exist
      const userRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        const batch = writeBatch(db);

        // 1. Create Teacher Profile
        batch.set(userRef, {
           uid: uid,
           email: 'demo_' + uid + '@demo.cihanogretmen.com',
           profileType: 'ÖĞRETMEN',
           firstName: 'Cihan',
           lastName: 'Öğretmen (Demo)',
           city: 'Sivas',
           district: 'Merkez',
           schoolName: 'Sivas Merkez SSK İlkokulu',
           gradeLevel: '3',
           section: 'A',
           theme: 'blue',
           createdAt: serverTimestamp(),
           lastLogin: serverTimestamp(),
           studentId: null,
           isDemo: true,
           isProfileComplete: true
        });

        // 2. Add Random Students
        const demoStudents = [
          'Ayşe Yılmaz', 'Ali Kaya', 'Fatma Demir', 'Mehmet Çelik', 'Zeynep Şahin',
          'Ahmet Yıldız', 'Elif Öztürk', 'Mustafa Arslan', 'Defne Doğan', 'Caner Tekin',
          'Ela Koç', 'Burak Kurt', 'Zehra Özkan', 'Emre Çetin', 'Ceren Şen',
          'Kaan Polat', 'Derya Bulut', 'Ege Akyüz', 'Melis Gürbüz', 'Ozan Çelik'
        ];

        demoStudents.forEach((name, i) => {
          const studentRef = doc(collection(db, `users/${uid}/students`));
          const gender = [
            'Ayşe Yılmaz', 'Fatma Demir', 'Zeynep Şahin', 'Elif Öztürk', 'Defne Doğan',
            'Ela Koç', 'Zehra Özkan', 'Ceren Şen', 'Derya Bulut', 'Melis Gürbüz'
          ].includes(name) ? 'Kız' : 'Erkek';
          
          batch.set(studentRef, {
             name,
             studentNo: (101 + i).toString(),
             number: 101 + i,
             gender,
             teacherUid: uid,
             school: 'Sivas Merkez SSK İlkokulu',
             grade: '3',
             section: 'A',
             active: true,
             avatar: gender === 'Kız' ? `avatar-${i % 5 + 1}` : `avatar-${(i % 5) + 6}`,
             createdAt: serverTimestamp()
          });
        });

        // 3. Add Demo Schedule Config
        const scheduleConfigRef = doc(db, `users/${uid}/config/schedule`);
        batch.set(scheduleConfigRef, {
           days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
           lessonCount: 6,
           startTime: '09:00',
           recessDuration: 15,
           lunchBreakDuration: 40,
           lessonDuration: 40,
           lunchBreakAfterLesson: 4,
           updatedAt: serverTimestamp()
        });

        // 4. Add Demo Schedule Data (3. Sınıf Haftalık Ders Programı)
        const scheduleDataRef = doc(db, `users/${uid}/config/scheduleData`);
        const slots: Record<string, any> = {};
        const demoSchedule = [
            ['lesson-turkce', 'lesson-turkce', 'lesson-matematik', 'lesson-hayat-bilgisi', 'lesson-beden-egitimi', 'lesson-serbest-etkinlikler'], // Pazartesi
            ['lesson-turkce', 'lesson-turkce', 'lesson-matematik', 'lesson-fen-bilimleri', 'lesson-ingilizce', 'lesson-gorsel-sanatlar'], // Salı
            ['lesson-turkce', 'lesson-turkce', 'lesson-matematik', 'lesson-hayat-bilgisi', 'lesson-beden-egitimi', 'lesson-muzik'], // Çarşamba
            ['lesson-turkce', 'lesson-turkce', 'lesson-matematik', 'lesson-fen-bilimleri', 'lesson-ingilizce', 'lesson-serbest-etkinlikler'], // Perşembe
            ['lesson-turkce', 'lesson-turkce', 'lesson-matematik', 'lesson-hayat-bilgisi', 'lesson-fen-bilimleri', 'lesson-beden-egitimi'] // Cuma
        ];

        for (let i = 0; i < 5; i++) {
           for (let j = 0; j < 6; j++) {
               slots[`${i}-${j}`] = {
                   lessonId: demoSchedule[i][j],
                   unitId: '',
                   outcomeId: ''
               };
           }
        }
        batch.set(scheduleDataRef, { slots });

        // 5. Add Demo Subjects
        const subjects = [
          { id: 'lesson-turkce', name: 'Türkçe', color: 'indigo' },
          { id: 'lesson-matematik', name: 'Matematik', color: 'rose' },
          { id: 'lesson-hayat-bilgisi', name: 'Hayat Bilgisi', color: 'amber' },
          { id: 'lesson-fen-bilimleri', name: 'Fen Bilimleri', color: 'emerald' },
          { id: 'lesson-ingilizce', name: 'İngilizce', color: 'blue' },
          { id: 'lesson-gorsel-sanatlar', name: 'Görsel Sanatlar', color: 'purple' },
          { id: 'lesson-muzik', name: 'Müzik', color: 'pink' },
          { id: 'lesson-beden-egitimi', name: 'Beden Eğitimi', color: 'teal' },
          { id: 'lesson-serbest-etkinlikler', name: 'Serbest Etkinlikler', color: 'slate' }
        ];

        subjects.forEach(sub => {
          const subRef = doc(db, `users/${uid}/subjects`, sub.id);
          batch.set(subRef, {
            id: sub.id,
            name: sub.name,
            color: sub.color,
            teacherUid: uid,
            createdAt: serverTimestamp()
          });
        });

        await batch.commit();
      }
      setSelectedStudentId('all');
      setActiveTab('home');
    } catch (error: any) {
      console.error("Demo Login Error:", error);
      setGlobalError(`Demo modu hatası: ${error.message}. Lütfen Firebase konsolundan 'Anonymous' giriş yönteminin açık olduğundan emin olun.`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear all browser remnants to prevent issues with stale data
      localStorage.clear();
      sessionStorage.clear();
      
      await signOut(auth);
      
      // Force reload to current page to ensure everything is reset
      window.location.reload();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleSlotClick = (day: string, lessonNumber: number) => {
    setSelectedSlot({ day, lessonNumber });
    setIsSubjectSelectModalOpen(true);
  };

  const handleSubjectSelect = async (subjectId: string) => {
    if (!user || !selectedSlot) return;

    const newSlots = { ...scheduleData.slots };
    const slotKey = `${selectedSlot.day}_${selectedSlot.lessonNumber}`;
    
    if (subjectId === 'clear') {
      delete newSlots[slotKey];
    } else {
      newSlots[slotKey] = subjectId;
    }

    const scheduleDataRef = doc(db, `users/${user.uid}/config/scheduleData`);
    try {
      await setDoc(scheduleDataRef, { slots: newSlots, updatedAt: serverTimestamp() });
      setIsSubjectSelectModalOpen(false);
      setSelectedSlot(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/config/scheduleData`);
    }
  };

  const handleSaveSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const subjectsRef = collection(db, `users/${user.uid}/subjects`);
    try {
      if (editingSubject) {
        const subjectDocRef = doc(db, `users/${user.uid}/subjects`, editingSubject.id);
        await setDoc(subjectDocRef, { 
          ...subjectForm, 
          teacherUid: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        const newDocRef = doc(subjectsRef);
        await setDoc(newDocRef, { 
          ...subjectForm, 
          teacherUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsSubjectEditModalOpen(false);
      setEditingSubject(null);
      setSubjectForm({ name: '', color: '#3b82f6' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/subjects`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!user) return;
    const subjectDocRef = doc(db, `users/${user.uid}/subjects`, id);
    try {
      await deleteDoc(subjectDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/subjects/${id}`);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    // Handle DD.MM.YYYY
    if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    // Handle YYYY-MM-DD (fallback)
    return s;
  };

  const handleResetSchedule = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'config', 'schedule'));
      await deleteDoc(doc(db, 'users', user.uid, 'schedule', 'data'));
      setIsResetScheduleConfirmOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/config/schedule`);
    }
  };

  const handleDownloadPDF = async () => {
    if (!scheduleRef.current) return;
    
    setIsDownloadingPDF(true);
    try {
      // Hide buttons during capture
      const buttons = scheduleRef.current.querySelectorAll('.no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      // Wait for any animations or layout shifts
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = scheduleRef.current;
      
      // Use toCanvas first to ensure better rendering before conversion
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1.0,
        pixelRatio: 3, // Even higher quality
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0',
          transform: 'scale(1)',
        }
      });
      
      // Restore buttons
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'flex');

      // Create PDF in A4 Landscape format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const margin = 10;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      
      let finalWidth = availableWidth;
      let finalHeight = (imgProps.height * finalWidth) / imgProps.width;
      
      if (finalHeight > availableHeight) {
        finalHeight = availableHeight;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }
      
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
      pdf.save(`ders-programi-${teacherProfile?.schoolName || 'program'}.pdf`);
    } catch (error) {
      console.error("PDF download error:", error);
      showAlert(`PDF oluşturulurken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.\nDetay: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'Hata', 'error');
      
      if (scheduleRef.current) {
        const buttons = scheduleRef.current.querySelectorAll('.no-print');
        buttons.forEach(btn => (btn as HTMLElement).style.display = 'flex');
      }
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleSaveScheduleConfig = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error("Save Schedule Config: No user logged in");
      return;
    }

    setIsSavingSchedule(true);
    setScheduleError(null);
    console.log("Saving Schedule Config...", scheduleForm);

    // Ensure days are unique and sorted if needed
    const uniqueDays = Array.from(new Set(scheduleForm.days));

    // Ensure customRecessDurations keys are strings for Firestore
    const customRecessDurationsStr: { [key: string]: number } = {};
    if (scheduleForm.customRecessDurations) {
      Object.entries(scheduleForm.customRecessDurations).forEach(([key, value]) => {
        customRecessDurationsStr[key] = value as number;
      });
    }

    const path = `users/${user.uid}/config/schedule`;
    try {
      const dataToSave = {
        ...scheduleForm,
        days: uniqueDays,
        customRecessDurations: customRecessDurationsStr,
        updatedAt: serverTimestamp()
      };
      console.log("Data to save to Firestore:", dataToSave);
      await setDoc(doc(db, path), dataToSave);
      
      setScheduleConfig({
        ...scheduleForm,
        days: uniqueDays,
        customRecessDurations: scheduleForm.customRecessDurations
      } as ScheduleConfig);
      
      console.log("Schedule Config saved successfully!");
      setIsScheduleModalOpen(false);
    } catch (err) {
      console.error("Error saving schedule config:", err);
      setScheduleError("Ayarlar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const generateTimeSlots = (config: ScheduleConfig) => {
    if (!config || !config.startTime) return [];
    
    const slots = [];
    let currentTime = config.startTime;

    const addMinutes = (time: string, minutes: number | string) => {
      if (!time || !time.includes(':')) return '00:00';
      const [h, m] = time.split(':').map(Number);
      const minsToAdd = Number(minutes) || 0;
      const MathH = isNaN(h) ? 0 : h;
      const MathM = isNaN(m) ? 0 : m;
      const totalMinutes = MathH * 60 + MathM + minsToAdd;
      const newH = Math.floor(totalMinutes / 60) % 24;
      const newM = totalMinutes % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    };

    const lessonCount = Number(config.lessonCount) || 1;
    const lessonDuration = Number(config.lessonDuration) || 40;
    const lunchBreakAfterLesson = Number(config.lunchBreakAfterLesson) || 0;
    const lunchBreakDuration = Number(config.lunchBreakDuration) || 0;
    const recessDuration = Number(config.recessDuration) || 0;

    for (let i = 1; i <= lessonCount; i++) {
      const lessonEnd = addMinutes(currentTime, lessonDuration);
      slots.push({
        type: 'lesson',
        number: i,
        start: currentTime,
        end: lessonEnd
      });

      if (i < lessonCount) {
        if (i === lunchBreakAfterLesson) {
          const lunchEnd = addMinutes(lessonEnd, lunchBreakDuration);
          slots.push({
            type: 'lunch',
            start: lessonEnd,
            end: lunchEnd
          });
          currentTime = lunchEnd;
        } else {
          const customRecess = config.customRecessDurations?.[i];
          const actualRecess = customRecess !== undefined ? Number(customRecess) : recessDuration;
          const recessEnd = addMinutes(lessonEnd, actualRecess);
          slots.push({
            type: 'recess',
            start: lessonEnd,
            end: recessEnd
          });
          currentTime = recessEnd;
        }
      }
    }
    return slots;
  };

  const turkishToUpper = (text: string) => {
    return text.toLocaleUpperCase('tr-TR');
  };

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!teacherProfile?.isProfileComplete) {
      showAlert("Lütfen önce okul bilgilerinizi tamamlayın.", "Eksik Bilgi");
      return;
    }

    const path = `users/${user.uid}/students`;
    
    // Check for duplicate student number
    const isDuplicate = students.some(s => s.studentNo === newStudent.studentNo);
    if (isDuplicate) {
      showAlert(`${newStudent.studentNo} numaralı öğrenci zaten kayıtlı.`, "Mükerrer Öğrenci");
      return;
    }

    try {
      await addDoc(collection(db, path), {
        ...newStudent,
        teacherUid: user.uid,
        teacherName: teacherProfile.displayName || user.displayName || '',
        schoolName: teacherProfile.schoolName || '',
        gradeLevel: teacherProfile.gradeLevel || '',
        section: teacherProfile.section || '',
        createdAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewStudent({
        studentNo: '',
        name: '',
        surname: '',
        gender: 'Erkek',
        birthDate: '',
        parentEmail: '',
        parentEmail2: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUpdateStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent) return;

    const path = `users/${user.uid}/students/${selectedStudent.id}`;
    
    // Check for duplicate student number (excluding current student)
    const isDuplicate = students.some(s => s.studentNo === selectedStudent.studentNo && s.id !== selectedStudent.id);
    if (isDuplicate) {
      showAlert(`${selectedStudent.studentNo} numaralı öğrenci zaten başka bir kayıt için kullanılıyor.`, "Mükerrer Öğrenci");
      return;
    }

    try {
      const { id, ...updateData } = selectedStudent;
      await setDoc(doc(db, `users/${user.uid}/students`, id), {
        ...updateData,
        teacherName: teacherProfile.displayName || user.displayName || '',
        schoolName: teacherProfile.schoolName || '',
        gradeLevel: teacherProfile.gradeLevel || '',
        section: teacherProfile.section || ''
      }, { merge: true });
      setIsEditModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!user) return;
    
    const path = `users/${user.uid}/students/${studentId}`;
    try {
      await deleteDoc(doc(db, path));
      setIsDeleteConfirmOpen(false);
      setIsEditModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!user) return;

    try {
      const batch = writeBatch(db);
      students.forEach((student) => {
        const studentRef = doc(db, `users/${user.uid}/students`, student.id);
        batch.delete(studentRef);
      });
      await batch.commit();
      setIsDeleteAllConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/students`);
    }
  };

  const handleDownloadList = () => {
    if (students.length === 0) return;
    
    const exportData = students.map(s => ({
      'No': s.studentNo,
      'Ad Soyad': s.name,
      'Cinsiyet': s.gender,
      'Doğum Tarihi': formatDate(s.birthDate),
      'Veli E-posta': s.parentEmail,
      'Veli E-posta 2': s.parentEmail2 || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sınıf Listesi");
    XLSX.writeFile(wb, `${teacherProfile?.schoolName || 'Sinif'}_Listesi.xlsx`);
  };

  const handleAssignBook = async (book: Book, studentId: string, studentName: string) => {
    if (!user) return;

    // Check if the student already has a book assigned
    const alreadyWatching = books.find(b => b.currentStudentId === studentId);
    if (alreadyWatching) {
      showAlert(
        `${studentName} adlı öğrencide şu anda "${alreadyWatching.name}" kitabı bulunuyor. Yeni bir kitap vermeden önce mevcut kitabı iade almalısınız.`, 
        'Öğrenci Zaten Kitap Okuyor', 
        'warning'
      );
      return;
    }

    // Check if the student has read this exact book before
    const hasReadBefore = readingRecords.find(r => r.studentId === studentId && r.bookId === book.id);
    if (hasReadBefore) {
      showAlert(
        `${studentName} bu kitabı daha önce okumuş. Lütfen başka bir kitap seçiniz.`,
        'Kitap Zaten Okunmuş',
        'warning'
      );
      return;
    }

    try {
      const bookRef = doc(db, `users/${user.uid}/books`, book.id);
      await setDoc(bookRef, {
        currentStudentId: studentId,
        currentStudentName: studentName,
        assignmentDate: serverTimestamp(),
        status: 'Okunuyor',
        updatedAt: serverTimestamp()
      }, { merge: true });
      showAlert(`${book.name} kitabı ${studentName} adlı öğrenciye atandı.`, 'Başarılı', 'success');
    } catch (error) {
      console.error('Error assigning book:', error);
      showAlert('Kitap atanırken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleReturnBook = async (book: Book) => {
    if (!user || !book.currentStudentId) return;
    try {
      const batch = writeBatch(db);
      const bookRef = doc(db, `users/${user.uid}/books`, book.id);
      const recordRef = doc(collection(db, `users/${user.uid}/readingRecords`));
      const studentRef = doc(db, `users/${user.uid}/students/${book.currentStudentId}`);

      const pageCount = book.pageCount || 0;
      const starsToAward = Math.ceil(pageCount / 10);

      batch.set(recordRef, {
        bookId: book.id,
        bookName: book.name,
        pageCount: pageCount || null,
        studentId: book.currentStudentId,
        studentName: book.currentStudentName,
        startDate: book.assignmentDate,
        endDate: serverTimestamp(),
        teacherUid: user.uid,
        createdAt: serverTimestamp()
      });

      batch.set(bookRef, {
        currentStudentId: null,
        currentStudentName: null,
        assignmentDate: null,
        status: 'Rafta',
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (starsToAward > 0) {
        batch.update(studentRef, {
          stars: increment(starsToAward),
          starHistory: arrayUnion({
            category: 'Kitap Kurdu Yıldızı',
            description: `${book.name} (${pageCount} Sayfa)`,
            amount: starsToAward,
            timestamp: Date.now()
          })
        });
      }

      await batch.commit();
      showAlert(`${book.name} kitabı iade alındı ve ${starsToAward} yıldız eklendi.`, 'Başarılı', 'success');
    } catch (error) {
      console.error('Error returning book:', error);
      showAlert('Kitap iade alınırken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleMarkAsReadByAll = async (book: Book) => {
    if (!user) return;
    if (students.length === 0) {
      showAlert('Sınıfınızda kayıtlı öğrenci bulunmuyor.', 'Öğrenci Yok', 'warning');
      return;
    }

    try {
      let batch = writeBatch(db);
      let operationCount = 0;
      let addedCount = 0;

      const pageCount = book.pageCount || 0;
      const starsToAward = Math.ceil(pageCount / 10);

      for (const student of students) {
        // Prevent duplicate records for the same book and student
        const alreadyRead = readingRecords.some(r => r.studentId === student.id && r.bookId === book.id);
        if (alreadyRead) continue;

        const recordRef = doc(collection(db, `users/${user.uid}/readingRecords`));
        const studentRef = doc(db, `users/${user.uid}/students/${student.id}`);

        batch.set(recordRef, {
          bookId: book.id,
          bookName: book.name,
          pageCount: pageCount || null,
          studentId: student.id,
          studentName: student.name,
          startDate: serverTimestamp(),
          endDate: serverTimestamp(),
          teacherUid: user.uid,
          createdAt: serverTimestamp()
        });

        if (starsToAward > 0) {
          batch.update(studentRef, {
            stars: increment(starsToAward),
            starHistory: arrayUnion({
              category: 'Kitap Kurdu Yıldızı',
              description: `${book.name} (${pageCount} Sayfa)`,
              amount: starsToAward,
              timestamp: Date.now()
            })
          });
          operationCount++;
        }

        operationCount++;
        addedCount++;

        // Firestore batches support up to 500 operations.
        if (operationCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }

      // Update the book to mark it as read by all and clear any current individual assignment
      const bookRef = doc(db, `users/${user.uid}/books`, book.id);
      await setDoc(bookRef, {
        isReadByAll: true,
        currentStudentId: null,
        currentStudentName: null,
        assignmentDate: null,
        status: 'Rafta',
        updatedAt: serverTimestamp()
      }, { merge: true });

      showAlert(`"${book.name}" kitabı tüm sınıf tarafından okundu olarak kaydedildi ve herkese ${starsToAward} yıldız eklendi.`, 'Başarılı', 'success');
    } catch (error) {
      console.error('Error marking book as read by all:', error);
      showAlert('Toplu okuma kaydı oluşturulurken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleDeleteReadingRecord = async (recordId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/readingRecords`, recordId));
      showAlert('Okuma kaydı başarıyla silindi.', 'Başarılı', 'success');
    } catch (error) {
      console.error('Error deleting reading record:', error);
      showAlert('Kayıt silinirken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleDeleteAllReadingRecords = async () => {
    if (!user) return;
    try {
      let batch = writeBatch(db);
      let operationCount = 0;

      for (const record of readingRecords) {
        batch.delete(doc(db, `users/${user.uid}/readingRecords`, record.id));
        operationCount++;

        if (operationCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }

      showAlert('Tüm okuma kayıtları başarıyla silindi.', 'Başarılı', 'success');
    } catch (error) {
      console.error('Error deleting all reading records:', error);
      showAlert('Kayıtlar silinirken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleCancelAssignment = async (book: Book) => {
    if (!user || !book.currentStudentId) return;
    try {
      const bookRef = doc(db, `users/${user.uid}/books`, book.id);
      await updateDoc(bookRef, {
        currentStudentId: null,
        currentStudentName: null,
        assignmentDate: null,
        status: 'Rafta',
        updatedAt: serverTimestamp()
      });
      showAlert(`${book.name} kitabı ataması iptal edildi.`, 'Başarılı', 'success');
    } catch (error) {
      console.error('Error cancelling assignment:', error);
      showAlert('Atama iptal edilirken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleSaveTournament = async (tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const tournamentsRef = collection(db, `users/${user.uid}/tournaments`);
    try {
      const docRef = await addDoc(tournamentsRef, {
        ...tournament,
        teacherUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const tournamentId = docRef.id;
      
      // If Eleme mode, generate initial matches
      if (tournament.type === 'Eleme') {
        const matches = generateElemeFixture(tournamentId, tournament.participants, tournament.fixtureType, tournament.matchType);
        const batch = writeBatch(db);
        matches.forEach(m => {
          const matchRef = doc(collection(db, `users/${user.uid}/tournaments/${tournamentId}/matches`));
          batch.set(matchRef, {
            ...m,
            id: matchRef.id,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      } else if (tournament.type === 'Lig') {
        const matches = generateLigFixture(tournamentId, tournament.participants, tournament.matchType);
        const batch = writeBatch(db);
        matches.forEach(m => {
          const matchRef = doc(collection(db, `users/${user.uid}/tournaments/${tournamentId}/matches`));
          batch.set(matchRef, {
            ...m,
            id: matchRef.id,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      } else if (tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') {
        const matches = generateGrupFixture(tournamentId, tournament.participants, tournament.matchType, tournament.groupCount, tournament.groupNaming);
        const batch = writeBatch(db);
        matches.forEach(m => {
          const matchRef = doc(collection(db, `users/${user.uid}/tournaments/${tournamentId}/matches`));
          batch.set(matchRef, {
            ...m,
            id: matchRef.id,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
      
      showAlert('Turnuva başarıyla oluşturuldu.', 'Başarılı', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/tournaments`);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!user) return;
    const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournamentId);
    try {
      await deleteDoc(tournamentRef);
      showAlert('Turnuva başarıyla silindi.', 'Başarılı', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/tournaments/${tournamentId}`);
      showAlert('Turnuva silinirken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleManageTournament = (tournament: Tournament) => {
    setViewingTournament(tournament);
    setIsTournamentFixtureOpen(true);
  };

  const handleViewFixture = (tournament: Tournament) => {
    setViewingTournament(tournament);
    setIsTournamentFixtureOpen(true);
  };

  const handleSaveEvaluation = async (evaluation: Partial<ReadingEvaluation>) => {
    if (!user) return;
    try {
      const { id, ...data } = evaluation;
      
      // If updating an existing evaluation
      if (id) {
        const existingRef = doc(db, `users/${user.uid}/readingEvaluations`, id);
        await setDoc(existingRef, {
          ...data,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Creating a new evaluation
        const evalRef = doc(collection(db, `users/${user.uid}/readingEvaluations`));
        await setDoc(evalRef, {
          ...data,
          teacherUid: user.uid,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      showAlert('Değerlendirme kaydedilirken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleSaveAllEvaluations = async (bookId: string, field: keyof ReadingEvaluation, value: number | null) => {
    if (!user) return;
    try {
      let batch = writeBatch(db);
      let operationCount = 0;

      for (const student of students) {
        const existingEval = readingEvaluations.find(e => e.bookId === bookId && e.studentId === student.id);
        
        if (existingEval) {
          const evalRef = doc(db, `users/${user.uid}/readingEvaluations`, existingEval.id);
          batch.set(evalRef, {
            [field]: value,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } else {
          const newEvalRef = doc(collection(db, `users/${user.uid}/readingEvaluations`));
          batch.set(newEvalRef, {
            bookId,
            studentId: student.id,
            [field]: value,
            teacherUid: user.uid,
            updatedAt: serverTimestamp()
          });
        }

        operationCount++;
        if (operationCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }
      showAlert('Tüm sınıf değerlendirildi.', 'Başarılı', 'success');
    } catch (error) {
      console.error('Error saving all evaluations:', error);
      showAlert('Toplu değerlendirme kaydedilirken bir hata oluştu.', 'Hata', 'error');
    }
  };

  const handleExcelUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!teacherProfile?.isProfileComplete) {
      showAlert("Lütfen önce okul bilgilerinizi tamamlayın.", "Eksik Bilgi");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const path = `users/${user.uid}/students`;
        let addedCount = 0;
        let skippedCount = 0;
        
        // Use a local set to track student numbers within the upload batch
        const existingNos = new Set(students.map(s => s.studentNo));
        
        // Firestore batch has a limit of 500 operations
        let batch = writeBatch(db);
        let operationCount = 0;
        
        for (const row of data) {
          // Expected columns: No, Ad Soyad, Cinsiyet, Doğum Tarihi, Veli E-posta
          const studentNo = String(row['No'] || row['Öğrenci No'] || '').trim();
          const name = String(row['Ad Soyad'] || row['İsim'] || '').trim();

          if (!studentNo || !name) continue;

          if (existingNos.has(studentNo)) {
            skippedCount++;
            continue;
          }

          const studentDocRef = doc(collection(db, path));
          batch.set(studentDocRef, {
            studentNo,
            name,
            gender: (row['Cinsiyet'] === 'Kız' || row['Cinsiyet'] === 'K' ? 'Kız' : 'Erkek') as 'Erkek' | 'Kız',
            birthDate: parseDate(row['Doğum Tarihi'] || ''),
            parentEmail: String(row['Veli E-posta'] || row['Email'] || '').trim(),
            parentEmail2: String(row['Veli E-posta 2'] || row['Email 2'] || '').trim(),
            teacherUid: user.uid,
            createdAt: serverTimestamp(),
            stars: 0,
            badges: []
          });

          operationCount++;
          addedCount++;
          existingNos.add(studentNo);

          if (operationCount >= 500) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }

        if (operationCount > 0) {
          await batch.commit();
        }
        
        setIsUploadModalOpen(false);
        if (skippedCount > 0) {
          showAlert(`${addedCount} öğrenci eklendi. ${skippedCount} öğrenci (mükerrer numara nedeniyle) atlandı.`, "İçe Aktarma Tamamlandı", "info");
        } else {
          showAlert(`${addedCount} öğrenci başarıyla eklendi.`, "Başarılı", "success");
        }
      } catch (error) {
        console.error("Excel Upload Error:", error);
        showAlert("Dosya işlenirken bir hata oluştu. Lütfen formatı kontrol edin.", "Hata", "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleLibraryExcelUpload = async (file: File) => {
    if (!user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // 1. Kitap Listesi
        const bookSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('kitap listesi')) || wb.SheetNames[0];
        const bookSheet = wb.Sheets[bookSheetName];
        const bookData = XLSX.utils.sheet_to_json(bookSheet) as any[];

        let batch = writeBatch(db);
        let operationCount = 0;
        let addedBooks = 0;

        const commitBatch = async () => {
          if (operationCount > 0) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        };

        // Get existing book names for duplicate check
        const existingBookNames = new Set(books.map(b => b.name.toLowerCase()));
        const addedInThisBatch = new Set<string>();
        let skippedDuplicates = 0;

        // Get max registration number
        let maxRegNo = books.reduce((max, b) => Math.max(max, b.registrationNo || 0), 0);
        
        for (const row of bookData) {
          const name = String(row['Kitap Adı'] || '').trim();
          const nameLower = name.toLowerCase();
          const author = String(row['Yazar'] || '').trim();
          const pageCount = Number(row['Sayfa Sayısı']) || 0;

          if (!name) continue;

          // Check for duplicates
          if (existingBookNames.has(nameLower) || addedInThisBatch.has(nameLower)) {
            skippedDuplicates++;
            continue;
          }

          addedInThisBatch.add(nameLower);
          const bookRef = doc(collection(db, `users/${user.uid}/books`));
          maxRegNo++;

          batch.set(bookRef, {
            registrationNo: maxRegNo,
            name,
            author,
            pageCount,
            status: 'Rafta',
            currentStudentId: null,
            currentStudentName: null,
            assignmentDate: null,
            teacherUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          operationCount++;
          addedBooks++;
          if (operationCount >= 450) await commitBatch();
        }

        await commitBatch();

        let message = `${addedBooks} kitap başarıyla aktarıldı.`;
        if (skippedDuplicates > 0) {
          message += ` ${skippedDuplicates} adet mükerrer kitap ismi atlandı.`;
        }
        showAlert(message, "İçe Aktarma Tamamlandı", "success");

      } catch (error) {
        console.error("Library Excel Upload Error:", error);
        showAlert("Dosya işlenirken bir hata oluştu. Lütfen formatı kontrol edin.", "Hata", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'No': '101', 'Ad Soyad': 'Ahmet Yılmaz', 'Cinsiyet': 'Erkek', 'Doğum Tarihi': '15.05.2012', 'Veli E-posta': 'veli@example.com', 'Veli E-posta 2': 'veli_ikinci@example.com' },
      { 'No': '102', 'Ad Soyad': 'Ayşe Demir', 'Cinsiyet': 'Kız', 'Doğum Tarihi': '22.08.2012', 'Veli E-posta': 'veli2@example.com', 'Veli E-posta 2': '' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Öğrenciler");
    XLSX.writeFile(wb, "ogrenci_listesi_sablon.xlsx");
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    const userDocRef = doc(db, 'users', user.uid);
    const SCHOOL_SUFFIXES = ['İLKOKULU', 'ORTAOKULU', 'LİSESİ', 'KOLEJİ', 'ANAOKULU', 'AKADEMİSİ'];

    try {
      let finalCity = profileForm.city;
      let finalDistrict = profileForm.district;
      let finalSchool = profileForm.schoolName;

      // Handle New School
      if (profileForm.schoolName === 'ADD_NEW' && profileForm.newSchool) {
        let trimmedSchool = profileForm.newSchool.trim().toLocaleUpperCase('tr-TR');
        
        // School Name Strict Validation
        const hasSuffix = SCHOOL_SUFFIXES.some(suffix => trimmedSchool.endsWith(suffix));
        
        if (!hasSuffix) {
          setGlobalError(`Karmaşıklığı ve mükerrer kayıtları önlemek için lütfen okul adını tam giriniz. "${trimmedSchool}" isminin sonuna türünü belirten bir ifade (İlkokulu, Ortaokulu, Lisesi, Koleji vb.) ekleyiniz.`);
          setIsSavingProfile(false);
          return;
        }

        const existingSchool = schools.find(s => 
          s.name.toLocaleUpperCase('tr-TR') === trimmedSchool && 
          s.cityName === finalCity &&
          s.districtName === finalDistrict
        );
        if (!existingSchool) {
          // Uniqueness enforced natively by Firestore ID
          const safeCity = finalCity.replace(/[^a-zA-Z0-9_-]/g, '_');
          const safeDist = finalDistrict.replace(/[^a-zA-Z0-9_-]/g, '_');
          const safeSchool = trimmedSchool.replace(/[^a-zA-Z0-9_-]/g, '_');
          const schoolDocId = `${safeCity}-${safeDist}-${safeSchool}`;
          await setDoc(doc(db, 'schools', schoolDocId), { 
            name: trimmedSchool, 
            cityName: finalCity,
            districtName: finalDistrict
          }, { merge: true });
        }
        finalSchool = trimmedSchool;
      }

      await setDoc(userDocRef, {
        city: finalCity,
        district: finalDistrict,
        schoolName: finalSchool,
        gradeLevel: profileForm.gradeLevel,
        section: profileForm.section,
        isProfileComplete: true,
        profileType: 'ÖĞRETMEN'
      }, { merge: true });
      setIsProfileModalOpen(false);
      setActiveTab('home');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isProfileIncomplete = user && (
    userProfile?.profileType === 'ÖĞRETMEN' 
      ? (!userProfile.schoolName || !userProfile.isProfileComplete)
      : (!userProfile?.isProfileComplete)
  );

  const handleSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = [...students]
    .filter(s => {
      if (filterType === 'male') return s.gender === 'Erkek';
      if (filterType === 'female') return s.gender === 'Kız';
      if (filterType === 'birthday') {
        if (!s.birthDate) return false;
        const date = new Date(s.birthDate);
        const currentMonth = new Date().getMonth();
        return !isNaN(date.getTime()) && date.getMonth() === currentMonth;
      }
      return true;
    })
    .sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    const valA = a[key] || '';
    const valB = b[key] || '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      return direction === 'asc' 
        ? valA.localeCompare(valB, undefined, { numeric: true })
        : valB.localeCompare(valA, undefined, { numeric: true });
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  }).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentNo.includes(searchTerm)
  );

  const totalStudents = students.length;
  const maleCount = students.filter(s => s.gender === 'Erkek').length;
  const femaleCount = students.filter(s => s.gender === 'Kız').length;
  const birthdayCount = students.filter(s => {
    if (!s.birthDate) return false;
    const date = new Date(s.birthDate);
    return !isNaN(date.getTime()) && date.getMonth() === new Date().getMonth();
  }).length;

  const gradeLevels = Array.from({ length: 12 }, (_, i) => `${i + 1}. Sınıf`);
  const sections = Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)} Şubesi`);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors duration-300">
      <Toaster position="top-center" />
      
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white p-3 shadow-xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"
          >
            <AlertCircle size={18} />
            İnternet bağlantınız yok. Veriler sunucuya kaydedilemeyebilir.
          </motion.div>
        )}
      </AnimatePresence>
      {/* Welcome Popup for current user */}
      {user && <WelcomePopupViewer user={user} activeTab={activeTab} />}

      {/* Global Error Banner */}
      <AnimatePresence>
        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl shadow-xl flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-400">Sistem Hatası</h3>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{globalError}</p>
                {globalError.toLowerCase().includes('quota') && (
                  <p className="text-[10px] text-red-500 dark:text-red-400 mt-2 font-bold uppercase tracking-tight">
                    Spark Plan Limiti: Günlük 50.000 okuma sınırına ulaşılmış olabilir. Yarın sıfırlanacaktır.
                  </p>
                )}
              </div>
              <button 
                onClick={() => setGlobalError(null)}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 glass-panel border-b border-slate-200/80 dark:border-neutral-800 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px]">
            <div className="flex items-center gap-2 sm:gap-8">
              <div 
                className="flex items-center cursor-pointer group"
                onClick={() => setActiveTab('home')}
              >
                <img 
                  src="/Logom.svg" 
                  alt="Cihan Öğretmen Logo" 
                  className="h-10 sm:h-12 w-auto transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Desktop Menu - Desktop view routing */}
              {user && (
                <div className="hidden md:flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setIsClassMenuOpen(false);
                      setIsLibraryMenuOpen(false);
                      setIsExamMenuOpen(false);
                      setIsTournamentMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'home'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    <Home size={18} />
                    Anasayfa
                  </button>
                  
                  {userProfile?.profileType === 'VELİ' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveTab('my-students');
                          setIsParentMenuOpen(false);
                          setIsClassMenuOpen(false);
                          setIsLessonMenuOpen(false);
                          setIsLibraryMenuOpen(false);
                          setIsExamMenuOpen(false);
                          setIsTournamentMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          activeTab === 'my-students'
                            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                      >
                        <Users size={18} />
                        Öğrencilerim
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('announcements');
                          setIsParentMenuOpen(false);
                          setIsClassMenuOpen(false);
                          setIsLessonMenuOpen(false);
                          setIsLibraryMenuOpen(false);
                          setIsExamMenuOpen(false);
                          setIsTournamentMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                          activeTab === 'announcements'
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                      >
                        <Megaphone size={18} />
                        Duyurular
                        {(unreadAnnouncementsCount + unreadMessagesCount) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                            {unreadAnnouncementsCount + unreadMessagesCount}
                          </span>
                        )}
                      </button>
                      
                      {/* Sınıf Yarışmaları Dropdown */}
                      <div className="relative" ref={competitionMenuRef}>
                        <button
                          onClick={() => {
                            setIsCompetitionMenuOpen(!isCompetitionMenuOpen);
                            setIsParentMenuOpen(false);
                            setIsClassMenuOpen(false);
                            setIsLessonMenuOpen(false);
                            setIsLibraryMenuOpen(false);
                            setIsExamMenuOpen(false);
                            setIsTournamentMenuOpen(false);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            activeTab === 'class-competition'
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                          }`}
                        >
                          <Gamepad2 size={18} />
                          Sınıf Yarışmaları
                          <ChevronDown size={14} className={`transition-transform duration-200 ${isCompetitionMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isCompetitionMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                            >
                              {uniqueParentSubjects.length > 0 ? uniqueParentSubjects.map(subject => (
                                <button
                                  key={subject.id}
                                  onClick={() => {
                                    setSelectedCompetitionSubject(subject.label);
                                    setActiveTab('class-competition');
                                    setIsCompetitionMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                    activeTab === 'class-competition' && selectedCompetitionSubject === subject.label
                                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                  }`}
                                >
                                  <BookOpen size={16} />
                                  {subject.label}
                                </button>
                              )) : (
                                <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                                  Henüz ders bulunmuyor
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                  
                  {userProfile?.profileType === 'ÖĞRETMEN' && (
                    <>
                      {/* Sınıf Yönetimi Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => {
                            setIsClassMenuOpen(!isClassMenuOpen);
                            setIsLessonMenuOpen(false);
                            setIsActivityMenuOpen(false);
                            setIsLibraryMenuOpen(false);
                            setIsExamMenuOpen(false);
                            setIsTournamentMenuOpen(false);
                          }}
                          className={`group flex flex-col items-center justify-center px-3 xl:px-4 py-2 hover:bg-neutral-50 rounded-xl transition-all ${
                            (activeTab === 'class-list' && selectedStudentId === 'all') || activeTab === 'seating-plan' || activeTab === 'group-creator' || activeTab === 'lucky-student' || activeTab === 'stars-badges' || activeTab === 'lesson-schedule' || activeTab === 'digital-board' || activeTab === 'timer'
                              ? 'text-indigo-600 bg-indigo-50'
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-sm xl:text-[15px] font-bold">
                            <Users size={18} />
                            Sınıf Yönetimi
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isClassMenuOpen ? 'rotate-180' : 'opacity-50'}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isClassMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setSelectedStudentId('all');
                                  setActiveTab('class-list');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'class-list' && selectedStudentId === 'all'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <List size={16} />
                                Sınıf Listesi
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('lesson-schedule');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'lesson-schedule'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Calendar size={16} />
                                Ders Programı
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('seating-plan');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'seating-plan'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <LayoutGrid size={16} />
                                Oturma Planı
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('group-creator');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'group-creator'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Users2 size={16} />
                                Grup Oluşturucu
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('stars-badges');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'stars-badges'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Star size={16} />
                                Yıldızlar Sınıfı
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('lucky-student');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'lucky-student'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Star size={16} />
                                Şanslı Öğrenci
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('timer');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'timer'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Timer size={16} />
                                Zamanlayıcı
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('announcements');
                                  setIsClassMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors relative ${
                                  activeTab === 'announcements'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Megaphone size={16} />
                                Duyurular
                                {(unreadAnnouncementsCount + unreadMessagesCount) > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
                                    {unreadAnnouncementsCount + unreadMessagesCount}
                                  </span>
                                )}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Ders Yönetimi Dropdown */}
                      <div className="relative" ref={lessonMenuRef}>
                        <button
                          onClick={() => {
                            setIsLessonMenuOpen(!isLessonMenuOpen);
                            setIsActivityMenuOpen(false);
                            setIsClassMenuOpen(false);
                            setIsLibraryMenuOpen(false);
                            setIsExamMenuOpen(false);
                            setIsTournamentMenuOpen(false);
                          }}
                          className={`group flex flex-col items-center justify-center px-3 xl:px-4 py-2 hover:bg-neutral-50 rounded-xl transition-all ${
                            activeTab.startsWith('lesson-') && activeTab !== 'lesson-schedule'
                              ? 'text-indigo-600 bg-indigo-50'
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-sm xl:text-[15px] font-bold">
                            <BookOpen size={18} />
                            Ders Yönetimi
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isLessonMenuOpen ? 'rotate-180' : 'opacity-50'}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isLessonMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 mt-2 w-56 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                            >
                              {navLessons.length === 0 ? (
                                <p className="text-xs text-neutral-500 text-center px-4 py-3">Ders programınızı oluşturduğunuzda dersleriniz burada görünecektir.</p>
                              ) : navLessons.map(lesson => {
                                const isPassive = userProfile?.passiveLessons?.includes(lesson.id);
                                return (
                                <div key={`sidebar-lesson-${lesson.id}`} className={`flex items-center w-full px-2 py-1`}>
                                  <button
                                    onClick={() => {
                                      setActiveTab(lesson.id);
                                      setIsLessonMenuOpen(false);
                                    }}
                                    className={`flex-1 flex items-center gap-3 px-2 py-1 object-contain text-left text-sm transition-colors rounded-xl ${
                                      activeTab === lesson.id
                                        ? 'bg-indigo-50 text-indigo-600 font-medium'
                                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                    } ${isPassive ? 'opacity-50' : ''}`}
                                  >
                                    <BookOpen size={16} className="shrink-0" />
                                    <span className="truncate">{lesson.label}</span>
                                  </button>
                                  {userProfile?.profileType === 'ÖĞRETMEN' && (
                                    <button
                                      onClick={(e) => togglePassiveLesson(e, lesson.id)}
                                      title={isPassive ? "Aktifleştir" : "Pasifleştir"}
                                      className={`p-2 rounded-lg transition-colors ${
                                        isPassive 
                                          ? 'text-neutral-400 hover:bg-indigo-50 hover:text-indigo-600' 
                                          : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                                      }`}
                                    >
                                      {isPassive ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  )}
                                </div>
                              )})}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Kitaplık Yönetimi Dropdown */}
                      <div className="relative" ref={libraryMenuRef}>
                        <button
                          onClick={() => {
                            setIsLibraryMenuOpen(!isLibraryMenuOpen);
                            setIsLessonMenuOpen(false);
                            setIsActivityMenuOpen(false);
                            setIsClassMenuOpen(false);
                            setIsExamMenuOpen(false);
                            setIsTournamentMenuOpen(false);
                          }}
                          className={`group flex flex-col items-center justify-center px-3 xl:px-4 py-2 hover:bg-neutral-50 rounded-xl transition-all ${
                            activeTab === 'library'
                              ? 'text-indigo-600 bg-indigo-50'
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-sm xl:text-[15px] font-bold">
                            <Library size={18} />
                            Kitaplık Yönetimi
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isLibraryMenuOpen ? 'rotate-180' : 'opacity-50'}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isLibraryMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 mt-2 w-56 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setIsAddBookModalOpen(true);
                                  setIsLibraryMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'add-book'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <PlusCircle size={16} />
                                Yeni Kitap Ekle
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('library-list');
                                  setIsLibraryMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'library-list'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <Library size={16} />
                                Kitaplık Listesi
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('reading-records');
                                  setIsLibraryMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'reading-records'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <BookOpen size={16} />
                                Okuma Kayıtları
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('reading-evaluation');
                                  setIsLibraryMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  activeTab === 'reading-evaluation'
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                <ClipboardCheck size={16} />
                                Okuma Değerlendirme
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                        {/* Turnuva Yönetimi Dropdown */}
                      <div className="relative" ref={tournamentMenuRef}>
                        <button
                          onClick={() => {
                            setIsTournamentMenuOpen(!isTournamentMenuOpen);
                            setIsLessonMenuOpen(false);
                            setIsClassMenuOpen(false);
                            setIsLibraryMenuOpen(false);
                          }}
                          className={`group flex flex-col items-center justify-center px-3 xl:px-4 py-2 hover:bg-neutral-50 rounded-xl transition-all ${
                            activeTab === 'tournament-create' || activeTab === 'tournaments-list'
                              ? 'text-indigo-600 bg-indigo-50'
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-sm xl:text-[15px] font-bold">
                            <Trophy size={18} />
                            Turnuva Yönetimi
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isTournamentMenuOpen ? 'rotate-180' : 'opacity-50'}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isTournamentMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 mt-2 w-56 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setActiveTab('tournament-create');
                                  setIsTournamentMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-indigo-600 transition-all"
                              >
                                <PlusCircle size={18} />
                                Yeni Turnuva Oluştur
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('tournaments-list');
                                  setIsTournamentMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-indigo-600 transition-all"
                              >
                                <Trophy size={18} />
                                Turnuvalarım
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  if (!isMobileMenuOpen) setExpandedSection(null);
                }}
                className="md:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <AnimatePresence mode="wait">
                {user ? (
                  <div className="flex items-center gap-2">
                    {/* Notification Center */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                        className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all relative"
                      >
                        {unreadCount > 0 ? (
                          <>
                            <BellDot size={22} className="text-indigo-600 animate-pulse" />
                            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900">
                              {unreadCount}
                            </span>
                          </>
                        ) : (
                          <Bell size={22} />
                        )}
                      </button>

                      <AnimatePresence>
                        {isNotificationCenterOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden z-[150]"
                          >
                            <div className="p-4 border-b border-neutral-50 dark:border-neutral-800 flex items-center justify-between">
                              <h3 className="text-sm font-black text-neutral-900 dark:text-white">Bildirimler</h3>
                              {notifications.length > 0 && (
                                <button 
                                  onClick={handleDeleteAllNotifications}
                                  className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline"
                                >
                                  Tümünü Sil
                                </button>
                              )}
                            </div>
                            <div className="max-h-96 overflow-y-auto p-2">
                              {notifications.length === 0 ? (
                                <div className="py-8 text-center">
                                  <p className="text-xs font-bold text-neutral-400">Henüz bildiriminiz yok.</p>
                                </div>
                              ) : (
                                notifications.map(n => (
                                  <div 
                                    key={n.id} 
                                    className={`p-3 rounded-2xl mb-1 transition-all group relative cursor-pointer ${n.isRead ? 'opacity-60' : 'bg-indigo-50/50 dark:bg-indigo-900/10'}`}
                                    onClick={() => handleNotificationClick(n)}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1">
                                        <p className="text-xs font-black text-neutral-900 dark:text-white mb-1">{n.title}</p>
                                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{n.content || n.message}</p>
                                        <p className="text-[9px] text-neutral-400 mt-2 font-bold">
                                          {n.createdAt?.toDate?.().toLocaleString('tr-TR')}
                                        </p>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteNotification(n.id);
                                        }}
                                        className="p-1 text-neutral-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative" ref={userMenuRef}>
                      <motion.button
                        key="user-profile"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 p-1 rounded-full transition-all"
                      >
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">{user.displayName}</p>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none">
                            {userProfile?.profileType === 'ÖĞRETMEN' ? 'Öğretmen' : userProfile?.profileType === 'VELİ' ? 'Veli' : 'Üye'}
                          </p>
                        </div>
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Profil'}
                          className="w-10 h-10 rounded-full border-2 border-indigo-100 dark:border-neutral-800 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-neutral-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <UserIcon size={20} />
                        </div>
                      )}
                    </motion.button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden z-[120]"
                        >
                          <div className="p-4 border-b border-neutral-50 dark:border-neutral-800">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-black text-neutral-900 dark:text-white truncate">{user.displayName}</p>
                            </div>
                            <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                          </div>
                          <div className="p-2">
                            {(userProfile?.profileType === 'ÖĞRETMEN' || userProfile?.profileType === 'VELİ') && (
                              <button
                                onClick={() => {
                                  handleSwitchProfile();
                                  setIsUserMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all mb-1 bg-neutral-50 dark:bg-neutral-800/50"
                              >
                                <div className="flex items-center gap-3">
                                  <ArrowLeftRight size={18} />
                                  <span>{userProfile?.profileType === 'ÖĞRETMEN' ? 'Veli Profiline Geç' : 'Öğretmen Profiline Geç'}</span>
                                </div>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setIsApiModalOpen(true);
                                setIsUserMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                            >
                              <Key size={18} />
                              API Ayarları
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileModalOpen(true);
                                setIsUserMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                            >
                              <UserIcon size={18} />
                              Profil Bilgileri
                            </button>
                            {user.email === 'cihan.ozel10@gmail.com' && (
                              <button
                                onClick={() => {
                                  setActiveTab('site-management');
                                  setIsUserMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl transition-all ${
                                  activeTab === 'site-management'
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                              >
                                <Shield size={18} />
                                Site Yönetimi
                              </button>
                            )}
                            <button
                              onClick={() => {
                                handleLogout();
                                setIsUserMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                            >
                              <LogOut size={18} />
                              Çıkış Yap
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                  <motion.button
                    key="login-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className={`flex items-center gap-1 sm:gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all shadow-md active:scale-95 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 hover:shadow-lg'}`}
                  >
                    {isLoggingIn ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <LogIn size={18} />
                    )}
                    <span>{isLoggingIn ? 'Giriş Yapılıyor...' : 'Gmail ile Giriş'}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Menu Content */}
        <AnimatePresence>
          {isMobileMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 mb-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Profil'}
                        className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                        <UserIcon size={16} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-black text-neutral-900 dark:text-white truncate max-w-[120px]">{user.displayName}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                        {userProfile?.profileType === 'ÖĞRETMEN' ? 'Öğretmen' : userProfile?.profileType === 'VELİ' ? 'Veli' : 'Üye'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'home'
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Home size={18} />
                  Anasayfa
                </button>

                {user.email === 'cihan.ozel10@gmail.com' && (
                  <button
                    onClick={() => {
                      setActiveTab('site-management');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                      activeTab === 'site-management'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Shield size={18} />
                    Site Yönetimi
                  </button>
                )}

                {/* Teacher Specific Sections */}
                {userProfile?.profileType === 'ÖĞRETMEN' && (
                  <>
                    {/* Sınıf Yönetimi Section */}
                    <button
                      onClick={() => toggleSection('Sınıf Yönetimi')}
                      className="w-full flex items-center justify-between pt-4 pb-2 px-4 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Sınıf Yönetimi
                      <ChevronDown size={12} className={`transition-transform ${expandedSection === 'Sınıf Yönetimi' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSection === 'Sınıf Yönetimi' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden space-y-1"
                      >
                        <button
                          onClick={() => {
                            setSelectedStudentId('all');
                            setActiveTab('class-list');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'class-list'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <List size={18} />
                          Sınıf Listesi
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('lesson-schedule');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'lesson-schedule'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Calendar size={18} />
                          Ders Programı
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('seating-plan');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'seating-plan'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <LayoutGrid size={18} />
                          Oturma Planı
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('group-creator');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'group-creator'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Users2 size={18} />
                          Grup Oluşturucu
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('stars-badges');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'stars-badges'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Star size={18} />
                          Yıldızlar Sınıfı
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('lucky-student');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'lucky-student'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Star size={18} />
                          Şanslı Öğrenci
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('timer');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'timer'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Timer size={18} />
                          Zamanlayıcı
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('announcements');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'announcements'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Megaphone size={18} />
                          Duyurular
                          {(unreadAnnouncementsCount + unreadMessagesCount) > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
                              {unreadAnnouncementsCount + unreadMessagesCount}
                            </span>
                          )}
                        </button>
                      </motion.div>
                    )}

                    {/* Ders Yönetimi Section */}
                    <button
                      onClick={() => toggleSection('Ders Yönetimi')}
                      className="w-full flex items-center justify-between pt-4 pb-2 px-4 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Ders Yönetimi
                      <ChevronDown size={12} className={`transition-transform ${expandedSection === 'Ders Yönetimi' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSection === 'Ders Yönetimi' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden space-y-1"
                      >
                        {navLessons.length === 0 ? (
                          <p className="text-xs text-neutral-500 text-center py-2">Ders programınızı oluşturduğunuzda dersleriniz burada görünecektir.</p>
                        ) : navLessons.map(lesson => {
                          const isPassive = userProfile?.passiveLessons?.includes(lesson.id);
                          return (
                          <div key={`mobile-lesson-${lesson.id}`} className="flex items-center w-full px-2 py-1">
                            <button
                              onClick={() => {
                                setActiveTab(lesson.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                                activeTab === lesson.id
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                              } ${isPassive ? 'opacity-50' : ''}`}
                            >
                              <BookOpen size={18} className="shrink-0" />
                              <span className="truncate">{lesson.label}</span>
                            </button>
                            {userProfile?.profileType === 'ÖĞRETMEN' && (
                              <button
                                onClick={(e) => togglePassiveLesson(e, lesson.id)}
                                title={isPassive ? "Aktifleştir" : "Pasifleştir"}
                                className={`p-3 rounded-lg transition-colors ${
                                  isPassive 
                                    ? 'text-neutral-400 hover:bg-indigo-50 hover:text-indigo-600' 
                                    : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                              >
                                {isPassive ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            )}
                          </div>
                        )})}
                      </motion.div>
                    )}

                    {/* Kitaplık Yönetimi Section */}
                    <button
                      onClick={() => toggleSection('Kitaplık Yönetimi')}
                      className="w-full flex items-center justify-between pt-4 pb-2 px-4 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Kitaplık Yönetimi
                      <ChevronDown size={12} className={`transition-transform ${expandedSection === 'Kitaplık Yönetimi' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSection === 'Kitaplık Yönetimi' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden space-y-1"
                      >
                        <button
                          onClick={() => {
                            setIsAddBookModalOpen(true);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'add-book'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <PlusCircle size={18} />
                          Yeni Kitap Ekle
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('library-list');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'library-list'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Library size={18} />
                          Kitaplık Listesi
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('reading-records');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'reading-records'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <BookOpen size={18} />
                          Okuma Kayıtları
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('reading-evaluation');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'reading-evaluation'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <ClipboardCheck size={18} />
                          Okuma Değerlendirme
                        </button>
                      </motion.div>
                    )}

                    {/* Turnuva Yönetimi Section */}
                    <button
                      onClick={() => toggleSection('Turnuva Yönetimi')}
                      className="w-full flex items-center justify-between pt-4 pb-2 px-4 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Turnuva Yönetimi
                      <ChevronDown size={12} className={`transition-transform ${expandedSection === 'Turnuva Yönetimi' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSection === 'Turnuva Yönetimi' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden space-y-1"
                      >
                        <button
                          onClick={() => {
                            setActiveTab('tournament-create');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'tournament-create'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <PlusCircle size={18} />
                          Yeni Turnuva Oluştur
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('tournaments-list');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                            activeTab === 'tournaments-list'
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Trophy size={18} />
                          Turnuvalarım
                        </button>
                      </motion.div>
                    )}
                  </>
                )}

                {/* Parent Specific Sections */}
                {userProfile?.profileType === 'VELİ' && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab('my-students');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all mt-4 ${
                        activeTab === 'my-students'
                          ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        activeTab === 'my-students'
                          ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                      }`}>
                        <UserIcon size={16} />
                      </div>
                      <span className="truncate">Öğrencilerim</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('announcements');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                        activeTab === 'announcements'
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold'
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs relative ${
                        activeTab === 'announcements'
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        <Megaphone size={16} />
                        {(unreadAnnouncementsCount + unreadMessagesCount) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900">
                            {unreadAnnouncementsCount + unreadMessagesCount}
                          </span>
                        )}
                      </div>
                      <span className="truncate">Duyurular</span>
                    </button>

                    {/* Sınıf Yarışmaları Section */}
                    <button
                      onClick={() => toggleSection('Sınıf Yarışmaları')}
                      className="w-full flex items-center justify-between pt-4 pb-2 px-4 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Sınıf Yarışmaları
                      <ChevronDown size={12} className={`transition-transform ${expandedSection === 'Sınıf Yarışmaları' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSection === 'Sınıf Yarışmaları' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden space-y-1"
                      >
                        {uniqueParentSubjects.length > 0 ? uniqueParentSubjects.map(subject => (
                          <button
                            key={subject.id}
                            onClick={() => {
                              setSelectedCompetitionSubject(subject.label);
                              setActiveTab('class-competition');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                              activeTab === 'class-competition' && selectedCompetitionSubject === subject.label
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <Gamepad2 size={18} />
                            {subject.label}
                          </button>
                        )) : (
                          <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                            Henüz ders bulunmuyor
                          </div>
                        )}
                      </motion.div>
                    )}

                  </>
                )}

                <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      setIsApiModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all font-bold"
                  >
                    <Key size={18} />
                    API Ayarları
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all font-bold"
                  >
                    <LogOut size={18} />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className={user ? "pt-28 pb-12 px-4 sm:px-6 lg:px-8" : "pt-24"}>
        <div className={user ? "max-w-7xl mx-auto space-y-8" : ""}>
          <AnimatePresence mode="wait">
            {!user && (
              <motion.div
                key="landing-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-950">
                  {/* Animated Background Elements */}
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, 30, 0]
                      }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-100/30 dark:bg-indigo-900/10 rounded-full blur-[120px]" 
                    />
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.1, 1],
                        x: [0, -40, 0],
                        y: [0, 50, 0]
                      }}
                      transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 2 }}
                      className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-amber-100/30 dark:bg-amber-900/10 rounded-full blur-[100px]" 
                    />
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, 45, 0]
                      }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-rose-100/20 dark:bg-rose-900/10 rounded-full blur-[80px]" 
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.05] dark:opacity-[0.02]" 
                         style={{ backgroundImage: 'radial-gradient(#4f46e5 1.5px, transparent 1.5px)', backgroundSize: '60px 60px' }} />
                  </div>

                  <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-12 text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                          delay: 0.2 
                        }}
                        className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] sm:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.3em] mb-6 sm:mb-10 border-2 border-indigo-50 dark:border-neutral-800 shadow-xl shadow-indigo-100/50 dark:shadow-none"
                      >
                        <div className="relative">
                          <Sparkles size={18} className="text-amber-500" />
                          <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-amber-400 blur-md -z-10"
                          />
                        </div>
                        Geleceğin Sınıf Yönetimi
                      </motion.div>
                      
                      <h1 className="text-[2.5rem] leading-[1] sm:text-6xl md:text-8xl lg:text-9xl font-display font-extrabold text-neutral-900 dark:text-white tracking-tight mb-8 sm:mb-12">
                        Sınıfınızı <br />
                        <span className="relative inline-block mt-2">
                          <span className="relative z-10 text-brand-600 dark:text-brand-400">Dijitalleştirin.</span>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ delay: 1, duration: 1.5 }}
                            className="absolute -bottom-2 sm:-bottom-4 left-0 h-4 sm:h-8 bg-brand-100 dark:bg-brand-900/30 -z-10 rounded-full" 
                          />
                        </span>
                      </h1>
                      
                      <p className="text-lg sm:text-xl md:text-2xl text-neutral-500 dark:text-neutral-400 max-w-3xl mx-auto font-medium mb-12 sm:mb-16 leading-relaxed px-4 sm:px-0">
                        Öğretmenler için tasarlanmış en modern, en eğlenceli ve en kapsamlı 
                        sınıf yönetim asistanı ile derslerinizi bir şölene dönüştürün.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 flex-wrap">
                        <motion.button
                          whileHover={isLoggingIn ? {} : { 
                            scale: 1.02, 
                            boxShadow: '0 20px 40px -12px rgba(20, 184, 166, 0.4)',
                            y: -2
                          }}
                          whileTap={isLoggingIn ? {} : { scale: 0.98 }}
                          onClick={handleLogin}
                          disabled={isLoggingIn}
                          className={`group px-8 sm:px-10 py-5 sm:py-6 bg-slate-900 dark:bg-brand-600 text-white rounded-[2rem] font-bold text-lg transition-all relative overflow-hidden ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                          />
                          <div className="flex items-center gap-3 relative z-10">
                            {isLoggingIn ? (
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <LogIn size={24} className="group-hover:translate-y-[-2px] transition-transform" />
                            )}
                            <span>{isLoggingIn ? 'Giriş Yapılıyor...' : 'Google İle Başla'}</span>
                          </div>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleDemoLogin}
                          disabled={isLoggingIn}
                          className={`group px-8 sm:px-10 py-5 sm:py-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 rounded-[2rem] font-bold text-lg transition-all flex items-center gap-3 shadow-sm hover:shadow-md ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Users size={24} className="text-brand-600 dark:text-brand-400" />
                          Öğretmen Modu (Demo)
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const featuresSection = document.getElementById('features');
                            featuresSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-8 sm:px-10 py-5 sm:py-6 bg-transparent text-slate-600 dark:text-slate-400 font-bold text-lg hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 group"
                        >
                          Daha Fazla Bilgi
                          <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      </div>
                    </motion.div>

                    {/* App Preview Mockup */}
                    <motion.div
                      initial={{ opacity: 0, y: 150 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-32 relative max-w-7xl mx-auto"
                    >
                      <div className="relative group perspective-1000">
                        <motion.div 
                          animate={{ 
                            rotateX: [0, 2, 0],
                            rotateY: [0, -2, 0]
                          }}
                          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                          className="relative bg-white p-4 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-2 border-neutral-100 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-rose-500/5 pointer-events-none" />
                          <img 
                            src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1600&h=900" 
                            alt="Sınıf Etkinliği" 
                            className="rounded-[3.5rem] w-full h-auto shadow-inner object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </motion.div>
                      </div>
                      
                      {/* Floating UI Elements - More dynamic and colorful */}
                      <motion.div 
                        animate={{ 
                          y: [0, -30, 0], 
                          rotate: [12, 18, 12],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-16 -right-12 w-48 h-48 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[3rem] flex flex-col items-center justify-center text-white shadow-[0_20px_50px_rgba(245,158,11,0.4)] hidden lg:flex border-8 border-white z-20"
                      >
                        <Star size={64} fill="currentColor" className="drop-shadow-lg" />
                        <span className="font-black text-base mt-3 uppercase tracking-tighter">Ödül</span>
                      </motion.div>
                      
                      <motion.div 
                        animate={{ 
                          y: [0, 30, 0], 
                          rotate: [-8, -15, -8],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute -bottom-16 -left-12 w-56 h-56 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3.5rem] flex flex-col items-center justify-center text-white shadow-[0_20px_50px_rgba(79,70,229,0.4)] hidden lg:flex border-8 border-white z-20"
                      >
                        <Users size={72} className="drop-shadow-lg" />
                        <span className="font-black text-base mt-3 uppercase tracking-tighter">Yönetim</span>
                      </motion.div>

                      <motion.div 
                        animate={{ 
                          scale: [1, 1.2, 1], 
                          rotate: [0, 20, 0],
                          x: [0, -20, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 -left-24 w-32 h-32 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white shadow-[0_15px_40px_rgba(244,63,94,0.4)] hidden xl:flex border-8 border-white z-20"
                      >
                        <Hand size={48} fill="currentColor" className="drop-shadow-lg" />
                      </motion.div>

                      <motion.div 
                        animate={{ 
                          y: [0, -25, 0], 
                          x: [0, 20, 0],
                          rotate: [12, 0, 12]
                        }}
                        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute bottom-1/3 -right-20 w-36 h-36 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_15px_40px_rgba(16,185,129,0.4)] hidden xl:flex border-8 border-white rotate-12 z-20"
                      >
                        <Award size={56} className="drop-shadow-lg" />
                      </motion.div>

                      <motion.div 
                        animate={{ 
                          y: [0, 35, 0], 
                          rotate: [0, -25, 0],
                          scale: [1, 0.9, 1]
                        }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 -right-32 w-28 h-28 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-3xl flex items-center justify-center text-white shadow-[0_15px_40px_rgba(168,85,247,0.4)] hidden 2xl:flex border-8 border-white z-20"
                      >
                        <Smile size={48} className="drop-shadow-lg" />
                      </motion.div>

                      <motion.div 
                        animate={{ 
                          x: [0, -30, 0], 
                          y: [0, 20, 0],
                          rotate: [0, 15, 0]
                        }}
                        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                        className="absolute top-10 left-1/4 w-24 h-24 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(56,189,248,0.4)] hidden lg:flex border-8 border-white z-20"
                      >
                        <Book size={36} className="drop-shadow-lg" />
                      </motion.div>
                    </motion.div>
                  </div>
                </section>

                {/* Roles and Capabilities Section */}
                <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full opacity-[0.02] dark:opacity-[0.01] pointer-events-none" 
                       style={{ backgroundImage: 'linear-gradient(45deg, #000 12.5%, transparent 12.5%, transparent 50%, #000 50%, #000 62.5%, transparent 62.5%, transparent 100%)', backgroundSize: '10px 10px' }} />
                  
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-20">
                      <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest mb-4 block">Platform Deneyimi</span>
                      <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-6 uppercase">Kim Neler Yapabilir?</h2>
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium text-xl max-w-2xl mx-auto">
                        Cihan Öğretmen, öğretmen ve veli arasında şeffaf ve güçlü bir iletişim köprüsü kurar.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                      
                      {/* Teacher Capabilities */}
                      <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-white dark:bg-neutral-950 p-8 sm:p-12 rounded-[3rem] shadow-xl shadow-indigo-100/50 dark:shadow-none border-2 border-neutral-100 dark:border-neutral-800 flex flex-col relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-full -mr-8 -mt-8 -z-10" />
                        
                        <div className="flex items-center gap-6 mb-10">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-none">
                            <UserIcon size={40} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Öğretmenler</h3>
                            <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-1 text-lg">Sınıfın Orkestra Şefi</p>
                          </div>
                        </div>
                        
                        <ul className="space-y-6 flex-1">
                          {[
                            'Sınıf listenizi Excel ile saniyeler içinde içe aktarabilir, öğrenci profilleri oluşturabilirsiniz.',
                            'Öğrencilere yıldız, rozet verip rekabetçi ve motive edici bir sınıf ortamı yaratabilirsiniz.',
                            'Ders programını, oturma planını ve sınıf kitaplığını tek bir sistemden yönetebilirsiniz.',
                            'Velilere genel duyurular geçebilir veya birebir anlık özel mesajlaşabilirsiniz.',
                            'Öğrenci Seçim Çarkı, Rastgele Kutu, Zarla Seçim gibi eğlenceli modlarla şanslı öğrenciyi belirlerken dersi bir şölene çevirebilirsiniz.',
                            'Şanslı öğrenci platformu, eğlenceli ikili turnuvalar ve rastgele grup etkinlikleri ile öğrencileri kaynaştırabilirsiniz.'
                          ].map((text, i) => (
                            <li key={`teacher-cap-${i}`} className="flex gap-5">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex flex-shrink-0 items-center justify-center mt-0.5 border border-indigo-100 dark:border-indigo-800">
                                <CheckCircle2 size={24} className="text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <span className="text-lg text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed">{text}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <div className="mt-10 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-neutral-500 dark:text-neutral-400 font-medium">
                          <span>Sınıfınızı dijitalleştirin</span>
                          <Star size={20} className="text-amber-400" fill="currentColor" />
                        </div>
                      </motion.div>

                      {/* Parent Capabilities */}
                      <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-white dark:bg-neutral-950 p-8 sm:p-12 rounded-[3rem] shadow-xl shadow-amber-100/50 dark:shadow-none border-2 border-neutral-100 dark:border-neutral-800 flex flex-col relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 dark:bg-amber-900/10 rounded-bl-full -mr-8 -mt-8 -z-10" />
                        
                        <div className="flex items-center gap-6 mb-10">
                          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-200 dark:shadow-none">
                            <Users2 size={40} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Veliler</h3>
                            <p className="text-amber-600 dark:text-amber-400 font-bold mt-1 text-lg">Eğitimin En Büyük Destekçisi</p>
                          </div>
                        </div>
                        
                        <ul className="space-y-6 flex-1">
                          {[
                            'Öğretmeninizin sınıf liste bilgilerine Gmail adresinizi eklemesi ile öğrencinizin dijital profiline saniyeler içinde bağlanabilirsiniz.',
                            'Çocuğunuzun okulda aldığı ödülleri, yıldızları ve rozetleri canlı olarak takip edebilirsiniz.',
                            'Öğretmenin gönderdiği sınıf duyurularından anında bildirim ile haberdar olursunuz.',
                            'Öğretmeninizle güvenli bir şekilde, okul dışı saatlerde dahi iletişimde kalabilirsiniz.',
                            'Çocuğunuzun okuduğu kitapları, sınav sonuçlarını ve ders katılımlarını izleyebilirsiniz.'
                          ].map((text, i) => (
                            <li key={`parent-cap-${i}`} className="flex gap-5">
                              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex flex-shrink-0 items-center justify-center mt-0.5 border border-amber-100 dark:border-amber-800">
                                <CheckCircle2 size={24} className="text-amber-600 dark:text-amber-400" />
                              </div>
                              <span className="text-lg text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed">{text}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <div className="mt-10 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-neutral-500 dark:text-neutral-400 font-medium">
                          <span>Gelişimi anlık takip edin</span>
                          <Star size={20} className="text-amber-400" fill="currentColor" />
                        </div>
                      </motion.div>
                      
                    </div>
                  </div>
                </section>

                {/* How it Works Section */}
                <section className="py-32 bg-white dark:bg-neutral-950 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-50 dark:bg-amber-900/10 rounded-full blur-[100px] opacity-50 -mr-48 -mt-48" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-50 dark:bg-rose-900/10 rounded-full blur-[100px] opacity-50 -ml-48 -mb-48" />
                  
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-20">
                      <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest mb-4 block">Basit ve Hızlı</span>
                      <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">Nasıl Çalışır?</h2>
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium text-xl max-w-2xl mx-auto">Sadece 3 adımda dijital sınıfınızı kurun ve yönetmeye başlayın.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                      {/* Connecting Line */}
                      <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-neutral-100 dark:bg-neutral-800 -z-10" />
                      
                      {[
                        { step: '01', title: 'Giriş Yap', desc: 'Google hesabınızla saniyeler içinde güvenli bir şekilde giriş yapın.', icon: LogIn, color: 'bg-indigo-600' },
                        { step: '02', title: 'Sınıfını Kur', desc: 'Öğrenci listenizi Excel\'den aktarın veya manuel olarak ekleyin.', icon: UserPlus, color: 'bg-amber-500' },
                        { step: '03', title: 'Yönetmeye Başla', desc: 'Ders programı, oturma planı ve oyunlarla sınıfınızı canlandırın.', icon: Rocket, color: 'bg-rose-500' },
                      ].map((item) => (
                        <div key={`how-it-works-${item.step}`} className="text-center group">
                          <div className="w-20 h-20 bg-white dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:border-indigo-600 dark:group-hover:border-indigo-500 group-hover:shadow-xl group-hover:shadow-indigo-50 dark:group-hover:shadow-none transition-all relative">
                            <span className={`absolute -top-4 -right-4 w-10 h-10 ${item.color} text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white dark:border-neutral-900`}>
                              {item.step}
                            </span>
                            <item.icon size={32} className="text-neutral-400 dark:text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-4 uppercase tracking-tight">{item.title}</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-32 bg-neutral-50 dark:bg-neutral-900/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full opacity-[0.02] dark:opacity-[0.01] pointer-events-none" 
                       style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                  
                  {/* Floating Elements for Features */}
                  <motion.div 
                    animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-20 -left-10 w-32 h-32 bg-amber-100 dark:bg-amber-900/10 rounded-full blur-2xl opacity-60"
                  />
                  <motion.div 
                    animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-20 -right-10 w-40 h-40 bg-indigo-100 dark:bg-indigo-900/10 rounded-full blur-2xl opacity-60"
                  />

                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
                      <div className="max-w-2xl">
                        <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest mb-4 block">Özellikler</span>
                        <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-6 uppercase">Her Şey Tek Bir <br /> Çatı Altında</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 font-medium text-xl leading-relaxed">
                          Eğitim sürecini kolaylaştıran, öğretmenlerin ihtiyaç duyduğu tüm araçları tek bir platformda topladık.
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <div className="flex gap-2">
                          <div className="w-12 h-1.5 bg-indigo-600 dark:bg-indigo-500 rounded-full" />
                          <div className="w-4 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                          <div className="w-4 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {[
                        { 
                          title: 'Sınıf Listesi', 
                          desc: 'Öğrenci bilgilerini kolayca yönetin, Excel\'den saniyeler içinde aktarın.', 
                          icon: List, 
                          color: 'bg-emerald-500', 
                          shadow: 'shadow-emerald-100',
                          steps: [
                            'Google hesabınızla güvenli bir şekilde giriş yapın.',
                            'Mevcut Excel listenizi tek tıkla sisteme yükleyin.',
                            'Öğrenci bilgilerini düzenleyin ve fotoğraflarını ekleyin.',
                            'Tüm listeyi PDF veya Excel olarak istediğiniz zaman indirin.'
                          ]
                        },
                        { 
                          title: 'Ders Programı', 
                          desc: 'Haftalık ders planınızı dijital ortamda takip edin, PDF olarak çıktı alın.', 
                          icon: Calendar, 
                          color: 'bg-rose-500', 
                          shadow: 'shadow-rose-100',
                          steps: [
                            'Derslerinizi ve her ders için özel renkleri belirleyin.',
                            'Haftalık plana dersleri sürükleyerek yerleştirin.',
                            'Teneffüs ve öğle arası sürelerini okulunuza göre ayarlayın.',
                            'Programı akıllı tahtada yansıtın veya PDF olarak çıktı alın.'
                          ]
                        },
                        { 
                          title: 'Oturma Planı', 
                          desc: 'Sürükle-bırak özelliği ile sınıf düzenini saniyeler içinde oluşturun.', 
                          icon: LayoutGrid, 
                          color: 'bg-sky-500', 
                          shadow: 'shadow-sky-100',
                          steps: [
                            'Sınıfınızdaki sıra ve grup düzenini sisteme tanımlayın.',
                            'Öğrencileri sürükle-bırak yöntemiyle yerlerine yerleştirin.',
                            'Tek tıkla rastgele veya cinsiyet dengeli oturma planı oluşturun.',
                            'Planı kaydedin ve her ders için güncel tutun.'
                          ]
                        },
                        { 
                          title: 'Şanslı Öğrenci (8 Farklı Oyun)', 
                          desc: 'Çarkıfelek, Sihirli Çiçek Bahçesi, Hazine Sandığı, Uzay Yolculuğu ve daha fazlası ile rastgele öğrenci seçimini bir şölene dönüştürün.', 
                          icon: Sparkles, 
                          color: 'bg-amber-500', 
                          shadow: 'shadow-amber-100',
                          steps: [
                            'Derste söz hakkı vermek veya görevlendirme yapmak için modülü açın.',
                            '8 farklı ve etkileşimli oyundan (Yarış Pisti, Balon Patlatma, Hazine Avı vb.) birini seçin.',
                            'Sistem görsel efektler ve harika animasyonlarla rastgele bir öğrenciyi seçsin.',
                            'Hem sınıfınızın tüm dikkatini toplayın hem de eğlenceli bir atmosfer yaratın.'
                          ]
                        },
                        { 
                          title: 'Grup Oluşturucu', 
                          desc: 'Öğrencilerinizi rastgele veya dengeli şekilde gruplara ayırın.', 
                          icon: Users2, 
                          color: 'bg-indigo-500', 
                          shadow: 'shadow-indigo-100',
                          steps: [
                            'Etkinlik için kaç grup oluşturmak istediğinizi seçin.',
                            'Öğrencileri rastgele veya cinsiyet dengeli dağıtın.',
                            'Oluşturulan grupları akıllı tahtada öğrencilere gösterin.',
                            'Grup isimlerini özelleştirerek etkinliği daha eğlenceli kılın.'
                          ]
                        },
                        { 
                          title: 'Yıldızlar Sınıfı', 
                          desc: 'Öğrencilerinizi motive edin ve başarılarını yıldızlarla ödüllendirin.', 
                          icon: Star, 
                          color: 'bg-amber-500', 
                          shadow: 'shadow-amber-100',
                          steps: [
                            'Örnek davranışlar için özel yıldız kategorileri oluşturun.',
                            'Öğrencilere anlık olarak yıldız ve rozetler verin.',
                            'Yıldız geçmişi ile öğrenci gelişimini detaylı takip edin.',
                            'Sınıf içi tatlı bir rekabet ve yüksek motivasyon sağlayın.'
                          ]
                        },
                        { 
                          title: 'Kütüphane', 
                          desc: 'Kitap kayıt ve ödünç verme sistemi ile sınıf kütüphanenizi yönetin.', 
                          icon: Library, 
                          color: 'bg-orange-500', 
                          shadow: 'shadow-orange-100',
                          steps: [
                            'Sınıf kitaplığındaki tüm kitapları sisteme kaydedin.',
                            'Ödünç verilen kitapları ve iade tarihlerini takip edin.',
                            'Öğrencilerin hangi kitapları okuduğunu anlık görün.',
                            'Okuma alışkanlığını ödüllerle teşvik edin.'
                          ]
                        },
                        { 
                          title: 'Sınıf Yarışması', 
                          desc: 'Hem sınıf içinde canlı hem de veli katılımlı heyecan verici rekabetçi oyunlar ve yarışmalar düzenleyin.', 
                          icon: Gamepad2, 
                          color: 'bg-teal-500', 
                          shadow: 'shadow-teal-100',
                          steps: [
                            'Öğrencilerinizin bilgilerini ölçecek eğlenceli bir sınıf yarışması ve etkinliği başlatın.',
                            'Liderlik tablolarını anında oluşturup akıllı tahtaya canlı olarak yansıtın.',
                            'İsterseniz velileri bile sürece katarak eve uzanan bir eğitim motivasyonu yaratın.',
                            'Şampiyonları kutlayın ve başarılarını anında dijital rozet veya yıldızlarla tescillendirin.'
                          ]
                        },
                        { 
                          title: 'Sınıf Etkinlikleri', 
                          desc: 'Tüm derslere özel (Matematik, Türkçe vb.) önceden hazırlanmış dijital, interaktif sınıf içi etkinlikler uygulayın.', 
                          icon: Activity, 
                          color: 'bg-fuchsia-500', 
                          shadow: 'shadow-fuchsia-100',
                          steps: [
                            'Müfredatınızla tam uyumlu dijital akıllı tahta uygulamalarına anında erişin.',
                            'Dikkati hızlıca toplayan görsel materyaller ve eğlenceli sorularla çocukları derse katın.',
                            'Klasik tahta uygulamaları yerine öğrencilerin zevk alacağı görevleri saniyeler içinde açın.',
                            'Eğitimi tekdüzelikten çıkarıp görsel bir serüvene kavuşturun.'
                          ]
                        },
                        { 
                          title: 'Turnuva Sistemi', 
                          desc: 'Eleme ve lig usulü turnuvalar ile sınıf içi rekabeti canlandırın.', 
                          icon: Trophy, 
                          color: 'bg-yellow-500', 
                          shadow: 'shadow-yellow-100',
                          steps: [
                            'Turnuva türünü (Eleme, Lig veya Grup) belirleyin.',
                            'Katılacak öğrencileri seçin ve fikstürü otomatik oluşturun.',
                            'Maç skorlarını girin, puan durumu anlık güncellensin.',
                            'Şampiyonu ilan edin ve başarıyı kutlayın.'
                          ]
                        },
                        { 
                          title: 'Veli Paneli', 
                          desc: 'Velilere özel giriş ile öğrenci gelişimini anlık olarak paylaşın.', 
                          icon: Users, 
                          color: 'bg-blue-500', 
                          shadow: 'shadow-blue-100',
                          steps: [
                            'Öğrenci kartına velinin e-posta adresini ekleyin.',
                            'Veli, kendi Google hesabıyla sisteme güvenli giriş yapsın.',
                            'Çocuğunun yıldızlarını, rozetlerini ve okuma durumunu görsün.',
                            'Okul-aile işbirliğini en üst seviyeye taşıyın.'
                          ]
                        },
                        { 
                          title: 'Ders Etkinlikleri', 
                          desc: 'Türkçe, Matematik ve İngilizce dersleri için interaktif dijital etkinlikler ve yarışmalar.', 
                          icon: BookOpen, 
                          color: 'bg-purple-500', 
                          shadow: 'shadow-purple-100',
                          steps: [
                            'İlgili ders kategorisini (Türkçe, Matematik vb.) seçin.',
                            'Müfredata uygun interaktif etkinlikleri veya yarışmaları başlatın.',
                            'Akıllı tahtada öğrencilerle birlikte uygulamalar yapın.',
                            'Öğrenmeyi oyunlaştırarak kalıcılığı artırın.'
                          ]
                        },
                        { 
                          title: 'Güzel Okuma Yarışması', 
                          desc: 'Öğrencilerinizin okuma becerilerini jüri sistemiyle değerlendirin ve ödüllendirin.', 
                          icon: Mic, 
                          color: 'bg-rose-600', 
                          shadow: 'shadow-rose-100',
                          steps: [
                            'Etkinlik türünü (Şiir veya Metin) ve kriterleri belirleyin.',
                            'Öğretmen ve öğrenci jürileri ile adil değerlendirme yapın.',
                            'Puanları anlık olarak girin ve sıralamayı otomatik görün.',
                            'Sonuçları PDF olarak kaydedin ve başarıyı kutlayın.'
                          ]
                        },
                        { 
                          title: 'Güzel Yazma Yarışması', 
                          desc: 'Öğrencilerinizin yazı estetiğini ve kurallara uygunluğunu ödüllendirin.', 
                          icon: PenTool, 
                          color: 'bg-indigo-600', 
                          shadow: 'shadow-indigo-100',
                          steps: [
                            'Yazı türünü belirleyin ve kriterleri (estetik, düzen vb.) seçin.',
                            'Jüri sistemiyle tarafsız ve çok yönlü değerlendirme yapın.',
                            'Öğrencilerin gelişimini yıldız ödülleriyle teşvik edin.',
                            'Sınıf içi tatlı bir rekabet ve estetik bilinci oluşturun.'
                          ]
                        },
                      ].map((feature, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ y: -12, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}
                          onClick={() => setSelectedFeatureGuide(feature)}
                          className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] shadow-sm border border-neutral-100 dark:border-neutral-800 transition-all group cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl">
                              <Plus size={16} />
                            </div>
                          </div>
                          <div className={`w-16 h-16 ${feature.color} text-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl ${feature.shadow} dark:shadow-none group-hover:scale-110 group-hover:rotate-6 transition-transform`}>
                            <feature.icon size={32} />
                          </div>
                          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-3 uppercase tracking-tight">{feature.title}</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed text-sm">{feature.desc}</p>
                          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Nasıl Kullanılır? <ArrowRight size={12} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>

              {/* Instagram Section */}
              <section className="py-16 bg-white dark:bg-neutral-950 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="text-center lg:text-left">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white mb-4 shadow-lg">
                        <Instagram size={28} />
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4 leading-tight">Instagram'da Neler Oluyor?</h2>
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium text-lg max-w-xl mx-auto lg:mx-0 mb-6">
                        Sınıf içi etkinliklerimiz, duyurularımız ve eğitim materyallerimiz için @cihan.ogretmen hesabını takip edin.
                      </p>
                      <a 
                        href="https://www.instagram.com/cihan.ogretmen/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-full font-bold hover:scale-105 transition-transform shadow-xl shadow-rose-100 dark:shadow-none"
                      >
                        <Instagram size={18} />
                        @cihan.ogretmen'i Takip Et
                      </a>
                    </div>

                    <InstagramEmbeds />
                  </div>
                </div>
              </section>

              {/* CTA Section */}
              <section className="py-20 bg-indigo-600 relative overflow-hidden mx-4 md:mx-8 mb-8 rounded-[3rem]">
                <div className="absolute inset-0 z-0">
                  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white opacity-[0.05] rounded-full -mr-72 -mt-72 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-400 opacity-[0.1] rounded-full -ml-48 -mb-48 blur-3xl" />
                </div>
                
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                  >
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-8 uppercase">
                      Geleceğin Sınıfını <br /> Bugün Yönetin.
                    </h2>
                    <p className="text-indigo-100 text-lg md:text-xl font-medium mb-10 leading-relaxed">
                      Sınıfınızı daha verimli yönetmeye başlayın. 
                      Tamamen ücretsiz ve her zaman yanınızda.
                    </p>
                    <button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className={`group px-12 py-6 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-neutral-50 transition-all active:scale-95 flex items-center gap-4 mx-auto ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      {isLoggingIn ? (
                        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                      ) : (
                        <LogIn size={28} className="group-hover:translate-x-1 transition-transform" />
                      )}
                      <span>{isLoggingIn ? 'Giriş Yapılıyor...' : 'Ücretsiz Giriş Yap'}</span>
                    </button>
                  </motion.div>
                </div>
              </section>

                {/* Footer */}
                <footer className="py-8 bg-white border-t border-neutral-100">
                  <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                      <img src="/Logom.svg" alt="Logo" className="h-8 w-auto" />
                      <span className="font-black text-neutral-900 tracking-tighter text-lg">Cihan Öğretmen</span>
                    </div>
                    <div className="text-neutral-400 font-medium text-[10px] md:text-sm">
                      &copy; {new Date().getFullYear()} Cihan Öğretmen. Tüm hakları saklıdır.
                    </div>
                    <div className="flex gap-4 items-center">
                      <a href="https://www.instagram.com/cihan.ogretmen/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Instagram size={16} />
                      </a>
                      <a href="#" className="text-neutral-500 hover:text-indigo-600 font-bold text-xs">Kullanım Şartları</a>
                      <a href="#" className="text-neutral-500 hover:text-indigo-600 font-bold text-xs">Gizlilik Politikası</a>
                    </div>
                  </div>
                </footer>

                {/* Feature Guide Modal */}
                <AnimatePresence>
                  {selectedFeatureGuide && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedFeatureGuide(null)}
                        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                      >
                        <div className={`h-32 ${selectedFeatureGuide.color} relative overflow-hidden shrink-0`}>
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <selectedFeatureGuide.icon size={64} className="text-white drop-shadow-lg" />
                          </div>
                          <button 
                            onClick={() => setSelectedFeatureGuide(null)}
                            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                          <div className="mb-8">
                            <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight mb-2">
                              {selectedFeatureGuide.title}
                            </h3>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                              Bu özelliği nasıl kullanacağınızı adım adım öğrenin.
                            </p>
                          </div>

                          <div className="space-y-6 mb-10">
                            {selectedFeatureGuide.steps.map((step: string, idx: number) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={idx} 
                                className="flex gap-4"
                              >
                                <div className={`flex-shrink-0 w-8 h-8 ${selectedFeatureGuide.color} text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-neutral-100 dark:shadow-none`}>
                                  {idx + 1}
                                </div>
                                <p className="text-neutral-700 dark:text-neutral-300 font-bold leading-relaxed">
                                  {step}
                                </p>
                              </motion.div>
                            ))}

                            {selectedFeatureGuide.instructions && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-6 p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem] border border-neutral-100 dark:border-neutral-800"
                              >
                                <h4 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Info size={14} /> NASIL YAPILIR?
                                </h4>
                                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                                  {selectedFeatureGuide.instructions}
                                </p>
                              </motion.div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setSelectedFeatureGuide(null);
                              if (!user) {
                                handleLogin();
                              }
                            }}
                            className={`w-full py-5 ${selectedFeatureGuide.color} text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3`}
                          >
                            {!user ? (
                              <>
                                <Rocket size={20} />
                                Hemen Deneyin
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={20} />
                                Tamam, Anladım
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {user && activeTab === 'home' && (
              (userProfile?.profileType === 'ÜYE' || !userProfile?.isProfileComplete) ? (
                <MemberDashboard setActiveTab={setActiveTab} onSetProfileType={handleSetProfileType} />
              ) : userProfile?.profileType === 'VELİ' ? (
                <MyStudentsPage 
                  linkedStudents={confirmedStudents}
                  allStudents={students}
                  seatingPlan={seatingPlan}
                  teacherProfile={teacherProfile}
                  readingRecords={readingRecords}
                  tournaments={tournaments}
                  scheduleConfig={scheduleConfig}
                  scheduleData={scheduleData}
                  subjects={subjects}
                  cities={cities}
                  districts={districts}
                  schools={schools}
                  onSaveProfile={handleSaveParentProfile}
                  unreadAnnouncementsCount={unreadAnnouncementsCount}
                  onTabChange={setActiveTab}
                />
              ) : (
                <motion.div
                  key="home-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                {/* Welcome Header */}
                <div className="dashboard-card overflow-hidden relative">
                  <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="text-center lg:text-left flex-1">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3"
                      >
                        <Sparkles size={12} />
                        Genel Bakış
                      </motion.div>
                      <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        Merhaba, <span className="text-brand-600 dark:text-brand-400">{user?.displayName?.split(' ')[0] || 'Öğretmenim'}</span> 👋
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 text-lg">
                        Bugün <span className="text-slate-800 dark:text-white font-medium">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>.
                      </p>
                      
                      <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-6">
                        <div className="px-4 py-2 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-neutral-800">
                          <div className="w-8 h-8 bg-white dark:bg-neutral-800 shadow-sm rounded-xl flex items-center justify-center text-brand-600">
                            <School size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider leading-none">Okulunuz</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{teacherProfile?.schoolName || 'Ayarlanmamış'}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-neutral-800">
                          <div className="w-8 h-8 bg-white dark:bg-neutral-800 shadow-sm rounded-xl flex items-center justify-center text-amber-500">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider leading-none">Sınıfınız</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{teacherProfile?.gradeLevel || '-'} / {teacherProfile?.section || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-4 lg:mr-4">
                      <motion.div 
                        animate={{ rotate: [3, -3, 3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-brand-200 dark:shadow-none border-4 border-white dark:border-neutral-800"
                      >
                        <Calendar size={40} />
                      </motion.div>
                      <motion.div 
                        animate={{ rotate: [-6, 6, -6] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-20 h-20 bg-amber-400 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-amber-100 dark:shadow-none border-4 border-white dark:border-neutral-800 -mt-8"
                      >
                        <Star size={32} fill="currentColor" />
                      </motion.div>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50/50 dark:bg-brand-900/10 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-50/50 dark:bg-amber-900/10 rounded-full -ml-36 -mb-36 blur-3xl pointer-events-none" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'all', label: 'Toplam Öğrenci', value: totalStudents, icon: Users, color: 'text-brand-600 dark:text-brand-400', bgColor: 'bg-brand-50 dark:bg-brand-900/30', shadow: 'shadow-brand-100 dark:shadow-none' },
                    { id: 'male', label: 'Erkek', value: maleCount, icon: UserIcon, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30', shadow: 'shadow-blue-100 dark:shadow-none' },
                    { id: 'female', label: 'Kız', value: femaleCount, icon: UserIcon, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-900/30', shadow: 'shadow-pink-100 dark:shadow-none' },
                    { id: 'birthday', label: 'Doğum Günü', value: birthdayCount, icon: Cake, color: 'text-amber-500 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', shadow: 'shadow-amber-100 dark:shadow-none' },
                  ].map((stat, i) => (
                    <motion.button
                      key={`stat-${stat.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => {
                        setFilterType(stat.id as any);
                        setSortConfig({ key: 'studentNo', direction: 'asc' });
                        setSelectedStudentId('all');
                        setActiveTab('class-list');
                      }}
                      className="dashboard-card interactive-hover p-5 flex flex-col items-center justify-center text-center group w-full"
                    >
                      <div className={`w-12 h-12 ${stat.bgColor} ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                        <stat.icon size={24} />
                      </div>
                      <span className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-2">{stat.label}</span>
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Quick Actions */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-lg font-black text-neutral-900 uppercase tracking-tight">Hızlı İşlemler</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'lucky-student', title: 'Şanslı Öğrenci', desc: 'Seçim oyunları', icon: Star, color: 'bg-amber-500', shadow: 'shadow-amber-100' },
                        { id: 'group-creator', title: 'Grup Oluştur', desc: 'Hızlı gruplama', icon: Users2, color: 'bg-indigo-500', shadow: 'shadow-indigo-100' },
                        { id: 'class-list', title: 'Sınıf Listesi', desc: 'Verileri yönet', icon: List, color: 'bg-emerald-500', shadow: 'shadow-emerald-100' },
                        { id: 'lesson-schedule', title: 'Ders Programı', desc: 'Haftalık plan', icon: Calendar, color: 'bg-rose-500', shadow: 'shadow-rose-100' },
                      ].map((action) => (
                        <motion.button
                          key={`action-${action.id}`}
                          whileHover={{ y: -4, boxShadow: '0 15px 20px -5px rgba(0, 0, 0, 0.05)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (action.id === 'class-list') setSelectedStudentId('all');
                            setActiveTab(action.id as any);
                          }}
                          className="bg-white p-4 rounded-[1.75rem] border border-neutral-100 shadow-sm transition-all text-left flex items-center gap-3 group"
                        >
                          <div className={`w-12 h-12 ${action.color} text-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl ${action.shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                            <action.icon size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-neutral-900 uppercase tracking-tight text-sm leading-tight">{action.title}</h3>
                            <p className="text-neutral-400 font-medium mt-0.5 leading-tight text-xs">{action.desc}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Feature Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'seating-plan', title: 'Oturma Planı', icon: LayoutGrid, color: 'text-sky-500', bgColor: 'bg-sky-50' },
                        { id: 'stars-badges', title: 'Yıldızlar & Rozetler', icon: Award, color: 'text-purple-500', bgColor: 'bg-purple-50' },
                        { id: 'announcements', title: 'Duyurular', icon: Megaphone, color: 'text-orange-500', bgColor: 'bg-orange-50' },
                      ].map((feature) => (
                        <button
                          key={`feature-${feature.id}`}
                          onClick={() => setActiveTab(feature.id as any)}
                          className="bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center gap-2 group relative"
                        >
                          <div className={`relative w-8 h-8 ${feature.bgColor} ${feature.color} rounded-lg flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform`}>
                            <feature.icon size={16} />
                            {feature.id === 'announcements' && (unreadAnnouncementsCount + unreadMessagesCount) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                {unreadAnnouncementsCount + unreadMessagesCount}
                              </span>
                            )}
                          </div>
                          <span className="font-black text-neutral-700 text-[10px] tracking-tight uppercase">{feature.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Today's Schedule Widget */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-lg font-black text-neutral-900 uppercase tracking-tight">Bugün</h2>
                      <button 
                        onClick={() => setActiveTab('lesson-schedule')}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.25rem] shadow-sm border border-neutral-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-full -mr-12 -mt-12 blur-2xl" />
                      
                      {(scheduleConfig && scheduleData) ? (
                        <div className="space-y-3 relative z-10">
                          {(() => {
                            const daysTurkish = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                            const today = daysTurkish[new Date().getDay()];
                            
                            const todayLessons = Array.from({ length: scheduleConfig.lessonCount }).map((_, i) => {
                              const lessonNum = i + 1;
                              const slotKey = `${today}_${lessonNum}`;
                              const subjectId = scheduleData.slots[slotKey];
                              const subject = subjects.find(s => s.id === subjectId);
                              
                              if (!subject) return null;

                              return (
                                <motion.div 
                                  key={i} 
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="flex items-center gap-3 group"
                                >
                                  <div className="flex flex-col items-center shrink-0 min-w-[36px]">
                                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">{lessonNum}</span>
                                    <div className="w-0.5 h-6 bg-neutral-100 rounded-full my-0.5 group-last:hidden" />
                                  </div>
                                  <div 
                                    className="flex-1 p-2.5 rounded-xl border-l-4 shadow-sm transition-all hover:translate-x-1"
                                    style={{ backgroundColor: `${subject.color}08`, borderLeftColor: subject.color }}
                                  >
                                    <h4 className="font-black text-neutral-900 uppercase tracking-tight text-[11px] leading-tight" style={{ color: subject.color }}>
                                      {subject.name}
                                    </h4>
                                  </div>
                                </motion.div>
                              );
                            }).filter(Boolean);

                            if (todayLessons.length > 0) return todayLessons;

                            return (
                              <div className="text-center py-6">
                                <div className="w-16 h-16 bg-neutral-50 text-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                  <Calendar size={32} />
                                </div>
                                <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Bugün Dersiniz Yok</p>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8 relative z-10">
                          <div className="w-16 h-16 bg-neutral-50 text-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} />
                          </div>
                          <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Program Ayarlanmamış</p>
                          <button 
                            onClick={() => setActiveTab('lesson-schedule')}
                            className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                          >
                            Ayarlar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              )
            )}

            {user && activeTab === 'my-students' && userProfile?.profileType === 'VELİ' && (
              <MyStudentsPage 
                linkedStudents={confirmedStudents}
                allStudents={students}
                seatingPlan={seatingPlan}
                teacherProfile={teacherProfile}
                readingRecords={readingRecords}
                tournaments={tournaments}
                scheduleConfig={scheduleConfig}
                scheduleData={scheduleData}
                subjects={subjects}
                cities={cities}
                districts={districts}
                schools={schools}
                onLoadCities={loadCities}
                onLoadDistricts={loadDistricts}
                onLoadSchools={loadSchools}
                onSearchStudents={searchStudentsInSchool}
                isLoadingCities={isLoadingCities}
                isLoadingDistricts={isLoadingDistricts}
                isLoadingSchools={isLoadingSchools}
                savedChildren={userProfile?.children}
                onSaveProfile={handleSaveParentProfile}
                onDeleteProfile={() => setIsDeleteProfileConfirmOpen(true)}
              />
            )}

            {user && activeTab === 'class-competition' && userProfile?.profileType === 'VELİ' && (
              <ParentCompetitionPage 
                linkedStudents={confirmedStudents} 
                selectedSubject={selectedCompetitionSubject}
                onSubjectChange={setSelectedCompetitionSubject}
              />
            )}

            {user && activeTab === 'parent-profile-setup' && (
              <div className="p-8 max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-neutral-100">
                  <ParentProfileSetup 
                    cities={cities}
                    districts={districts}
                    schools={schools}
                    onLoadCities={loadCities}
                    onLoadDistricts={loadDistricts}
                    onLoadSchools={loadSchools}
                    onSearchStudents={searchStudentsInSchool}
                    isLoadingCities={isLoadingCities}
                    isLoadingDistricts={isLoadingDistricts}
                    isLoadingSchools={isLoadingSchools}
                    linkedStudents={[]}
                    savedChildren={userProfile?.children}
                    onSave={async (children: any[]) => {
                      await handleSaveParentProfile(children);
                      setActiveTab('my-students');
                    }}
                  />
                </div>
              </div>
            )}

            {user && activeTab === 'teacher-profile-setup' && (
              <div className="p-8 max-w-2xl mx-auto">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-neutral-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <School size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">
                        {userProfile?.profileType === 'VELİ' ? 'Veli' : 'Öğretmen'} Profili Kurulumu
                      </h2>
                      <p className="text-neutral-500 font-medium">Lütfen okul ve sınıf bilgilerinizi girerek devam edin.</p>
                    </div>
                  </div>

                  <form onSubmit={async (e) => {
                    await handleSaveProfile(e);
                    setActiveTab('home');
                  }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-widest">İl</label>
                        <select 
                          required
                          value={profileForm.city}
                          onFocus={loadCities}
                          onChange={(e) => {
                            setProfileForm({...profileForm, city: e.target.value, district: '', schoolName: ''});
                            if (e.target.value) loadDistricts(e.target.value);
                          }}
                          className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                        >
                          <option value="">{isLoadingCities ? 'Yükleniyor...' : 'Seçiniz'}</option>
                          {cities.sort((a, b) => a.name.localeCompare(b.name, 'tr')).map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-widest">İlçe</label>
                        <select 
                          required
                          disabled={!profileForm.city}
                          value={profileForm.district}
                          onFocus={() => loadDistricts(profileForm.city)}
                          onChange={(e) => {
                            setProfileForm({...profileForm, district: e.target.value, schoolName: ''});
                            if (e.target.value) loadSchools(profileForm.city, e.target.value);
                          }}
                          className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 font-medium"
                        >
                          <option value="">{isLoadingDistricts ? 'Yükleniyor...' : 'Seçiniz'}</option>
                          {districts.filter(d => d.cityName === profileForm.city).sort((a, b) => a.name.localeCompare(b.name, 'tr')).map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-widest">Okul Adı</label>
                      <select 
                        required
                        disabled={!profileForm.district}
                        value={profileForm.schoolName}
                        onFocus={() => loadSchools(profileForm.city, profileForm.district)}
                        onChange={(e) => setProfileForm({...profileForm, schoolName: e.target.value})}
                        className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 font-medium"
                      >
                        <option value="">{isLoadingSchools ? 'Yükleniyor...' : 'Seçiniz'}</option>
                        <option value="ADD_NEW" className="font-bold text-indigo-600">+ Yeni Okul Ekle</option>
                        {schools.filter(s => s.cityName === profileForm.city && s.districtName === profileForm.district).sort((a, b) => a.name.localeCompare(b.name, 'tr')).map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      {profileForm.schoolName === 'ADD_NEW' && (
                        <input 
                          required
                          type="text"
                          placeholder="Okul adını girin"
                          value={profileForm.newSchool}
                          onChange={(e) => setProfileForm({...profileForm, newSchool: e.target.value.toLocaleUpperCase('tr-TR')})}
                          className="mt-2 w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-widest">Sınıf</label>
                        <select 
                          required
                          value={profileForm.gradeLevel}
                          onChange={(e) => setProfileForm({...profileForm, gradeLevel: e.target.value})}
                          className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                        >
                          {gradeLevels.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-widest">Şube</label>
                        <select 
                          required
                          value={profileForm.section}
                          onChange={(e) => setProfileForm({...profileForm, section: e.target.value})}
                          className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                        >
                          {sections.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="submit"
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                      >
                        Kurulumu Tamamla
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {user && activeTab === 'lesson-schedule' && (
              <motion.div
                key="lesson-schedule-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {!scheduleConfig ? (
                  <div className="bg-white p-12 rounded-3xl shadow-xl border border-neutral-100 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl mb-6">
                      <Calendar size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-4 tracking-tight">
                      Ders Programı
                    </h1>
                    <p className="text-neutral-500 text-lg mb-8">
                      {userProfile?.profileType === 'VELİ' 
                        ? 'Öğretmeniniz henüz ders programı ayarlamamış.' 
                        : 'Ders programınızı oluşturmak için önce temel ayarları yapmalısınız.'}
                    </p>
                    {userProfile?.profileType === 'ÖĞRETMEN' && (
                      <button 
                        onClick={() => {
                          setScheduleError(null);
                          setIsScheduleModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        <Settings size={20} />
                        Ayarları Yap ve Başla
                      </button>
                    )}
                  </div>
                ) : (
                  <div ref={scheduleRef} className="space-y-6 p-6 bg-white rounded-[2rem]">
                    {/* Schedule Header with Teacher Info */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                          <School size={32} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold uppercase tracking-tight">
                            {teacherProfile?.schoolName || 'Okul Belirtilmemiş'}
                          </h2>
                          <p className="text-neutral-500 font-medium flex items-center gap-2 mt-1">
                            <span>{teacherProfile?.gradeLevel || '-'} / {teacherProfile?.section?.toUpperCase().includes('ŞUBESİ') ? teacherProfile.section : `${teacherProfile?.section || '-'} Şubesi`}</span>
                            <span className="text-neutral-300">•</span>
                            <span>2025-2026 EĞİTİM ÖĞRETİM YILI</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 no-print">
                        {userProfile?.profileType === 'ÖĞRETMEN' && (
                          <>
                            <button 
                              onClick={() => {
                                setScheduleError(null);
                                setIsScheduleModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-2xl font-medium hover:bg-neutral-100 transition-all"
                            >
                              <Settings size={18} />
                              Ayarları Düzenle
                            </button>
                            <button 
                              onClick={() => setIsResetScheduleConfirmOpen(true)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl font-medium hover:bg-rose-100 transition-all"
                            >
                              <Trash2 size={18} />
                              Programı Sıfırla
                            </button>
                          </>
                        )}
                        <button 
                          onClick={handleDownloadPDF}
                          disabled={isDownloadingPDF}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDownloadingPDF ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          ) : (
                            <Download size={18} />
                          )}
                          PDF İndir
                        </button>
                      </div>
                    </div>

                    {/* Schedule Grid */}
                    <div className="bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden">
                      <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-center">
                        <h3 className="text-xl font-bold text-neutral-900 tracking-widest uppercase">DERS PROGRAMI</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse table-fixed min-w-[950px]">
                          <thead>
                            <tr className="bg-neutral-50/50 border-b border-neutral-100">
                              <th className="px-6 py-5 text-center text-[12px] font-black text-neutral-600 uppercase tracking-[0.2em] w-[160px]">
                                SAAT / GÜN
                              </th>
                              {scheduleConfig.days.map(day => (
                                <th key={day} className="px-6 py-5 text-center text-[12px] font-black text-neutral-600 uppercase tracking-[0.2em] border-l border-neutral-100">
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {generateTimeSlots(scheduleConfig).map((slot, idx) => (
                              <tr key={idx} className={slot.type !== 'lesson' ? 'bg-neutral-50/40' : 'bg-white'}>
                                <td className={`px-3 ${slot.type === 'lesson' ? 'py-2' : 'py-1.5'} w-[160px] border-r border-neutral-100 bg-neutral-50/30`}>
                                  <div className="flex flex-col items-center justify-center text-center h-full">
                                    <div className="flex items-center justify-center gap-2 mb-0.5">
                                      {slot.type === 'lesson' ? (
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                                      ) : (
                                        <Clock size={10} className="text-neutral-500" />
                                      )}
                                      <span className={`font-black uppercase tracking-widest ${slot.type === 'lesson' ? 'text-indigo-600 text-[9px]' : 'text-neutral-600 text-[8px]'}`}>
                                        {slot.type === 'lesson' ? `${slot.number}. DERS` : slot.type === 'lunch' ? 'ÖĞLE ARASI' : 'TENEFFÜS'}
                                      </span>
                                    </div>
                                    <div className={`font-mono font-black text-neutral-900 tracking-tight ${slot.type === 'lesson' ? 'text-sm' : 'text-xs'}`}>
                                      {slot.start} <span className="text-neutral-300 font-light mx-0.5">-</span> {slot.end}
                                    </div>
                                  </div>
                                </td>
                                
                                {slot.type === 'lesson' ? (
                                  scheduleConfig.days.map(day => {
                                    const slotKey = `${day}_${slot.number}`;
                                    const subjectId = scheduleData.slots[slotKey];
                                    const subject = subjects.find(s => s.id === subjectId);

                                    return (
                                      <td key={day} className="px-1 py-1 border-l border-neutral-100">
                                        <div 
                                          onClick={() => handleSlotClick(day, slot.number!)}
                                          className={`relative h-[85px] flex items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer group p-2 ${
                                            subject 
                                              ? 'border-transparent shadow-md' 
                                              : 'border-neutral-100 text-neutral-300 hover:border-indigo-200 hover:bg-indigo-50/30'
                                          }`}
                                          style={subject ? { backgroundColor: `${subject.color}12`, borderColor: subject.color } : {}}
                                        >
                                          {subject ? (
                                            <>
                                              <span className="text-[13px] font-black uppercase tracking-tight text-center leading-[1.1] break-words overflow-hidden max-h-full" style={{ color: subject.color }}>
                                                {subject.name}
                                              </span>
                                              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                                <Edit3 size={10} style={{ color: subject.color }} />
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex flex-col items-center">
                                              <Plus size={14} className="mb-0.5 group-hover:text-indigo-400" />
                                              <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-indigo-400">EKLE</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })
                                ) : (
                                  <td colSpan={scheduleConfig.days.length} className="px-2 py-1 border-l border-neutral-100">
                                    <div className="flex items-center justify-center text-neutral-600 text-[11px] font-black tracking-[0.5em] uppercase py-1 h-[28px] bg-neutral-100/50 rounded-lg">
                                      {slot.type === 'lunch' ? (
                                        <div className="flex items-center gap-4">
                                          <div className="h-px w-16 bg-neutral-300" />
                                          <Utensils size={12} className="text-indigo-500" />
                                          ÖĞLE ARASI
                                          <div className="h-px w-16 bg-neutral-300" />
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-4">
                                          <div className="h-px w-16 bg-neutral-300" />
                                          <Timer size={12} className="text-indigo-500" />
                                          TENEFFÜS
                                          <div className="h-px w-16 bg-neutral-300" />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {user && activeTab === 'seating-plan' && (
              <motion.div
                key="seating-plan-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Seating Plan Header with Teacher Info & Stats */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold uppercase tracking-tight text-sky-600">
                        {teacherProfile?.schoolName || 'Okul Belirtilmemiş'}
                      </h2>
                      <p className="text-neutral-400 font-medium text-lg">
                        {teacherProfile?.gradeLevel || '-'} / {teacherProfile?.section?.toUpperCase().includes('ŞUBESİ') ? teacherProfile.section : `${teacherProfile?.section || '-'} Şubesi`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 no-print">
                      <button 
                        onClick={() => setIsSeatingModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                      >
                        <LayoutGrid size={20} />
                        Oturma Planı Oluştur
                      </button>
                    </div>
                  </div>

                  {/* Class Stats */}
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-neutral-900">{students.length}</span>
                      <span className="text-neutral-400 font-medium">Toplam Öğrenci</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                        {students.filter(s => s.gender === 'Erkek').length}
                      </div>
                      <span className="text-neutral-400 font-medium">Erkek</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                        {students.filter(s => s.gender === 'Kız').length}
                      </div>
                      <span className="text-neutral-400 font-medium">Kız</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Student Source List */}
                  <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-5 border-b border-neutral-50 bg-neutral-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                        <Users size={18} className="text-indigo-600" />
                        Sınıf Listesi
                      </h3>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                        {students.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {students.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-neutral-400 text-sm italic">Öğrenci bulunamadı.</p>
                        </div>
                      ) : (
                        students.map((student) => (
                          <div 
                            key={student.id}
                            className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center gap-3 hover:border-indigo-200 hover:bg-white transition-all cursor-move group"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              student.gender === 'Erkek' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                              {student.studentNo}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">
                                {student.name}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Seating Plan Area */}
                  <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 overflow-auto custom-scrollbar min-h-[600px]">
                    {Object.keys(seatingPlan).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl mb-8">
                          <LayoutGrid size={40} />
                        </div>
                        <h1 className="text-3xl font-black mb-4 tracking-tight text-neutral-900">
                          Henüz Plan Oluşturulmadı
                        </h1>
                        <p className="text-neutral-500 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                          Sınıfınız için bir oturma düzeni oluşturmak için yukarıdaki butonu kullanın veya manuel olarak yerleştirin.
                        </p>
                        <button 
                          onClick={() => setIsSeatingModalOpen(true)}
                          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
                        >
                          <Plus size={24} />
                          Hemen Oluştur
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        {/* Teacher's Desk */}
                        <div className="w-60 h-12 bg-neutral-100 border-2 border-neutral-200 rounded-2xl mb-12 flex items-center justify-center shadow-sm relative">
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-neutral-200 rounded-full text-[10px] font-black text-neutral-500 uppercase tracking-widest border border-neutral-300">
                            Öğretmen Masası
                          </div>
                          <div className="w-12 h-1 bg-neutral-200 rounded-full" />
                        </div>

                        {/* Grid */}
                        <div className="flex gap-8 justify-center flex-wrap">
                          {Array.from({ length: seatingConfig.groupCount }).map((_, groupIdx) => (
                            <div key={groupIdx} className="flex flex-col gap-3">
                              <div className="text-center mb-1">
                                <span className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.3em]">{groupIdx + 1}. GRUP</span>
                              </div>
                              {Array.from({ length: seatingConfig.rowsPerGroup[groupIdx] }).map((_, rowIdx) => (
                                <div key={rowIdx} className="flex gap-2">
                                  {Array.from({ length: seatingConfig.peoplePerRow }).map((_, seatIdx) => {
                                    const seatId = `g${groupIdx}-r${rowIdx}-s${seatIdx}`;
                                    const studentId = seatingPlan[seatId];
                                    const student = students.find(s => s.id === studentId);

                                    return (
                                      <div
                                        key={seatIdx}
                                        onClick={() => {
                                          if (student) {
                                            setSelectedStudentId(student.id);
                                            setActiveTab('class-list');
                                          }
                                        }}
                                        className={`w-28 h-28 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 relative group ${
                                          student 
                                            ? 'bg-white border-neutral-100 shadow-lg shadow-neutral-200/50 cursor-pointer hover:border-indigo-400 hover:shadow-indigo-200' 
                                            : 'bg-neutral-50 border-neutral-100 border-dashed cursor-default'
                                        }`}
                                      >
                                        {student ? (
                                          <>
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg mb-2 ${
                                              student.gender === 'Kız' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                              {student.studentNo}
                                            </div>
                                            <p className="text-[11px] font-black text-neutral-900 text-center px-1 line-clamp-2 uppercase tracking-tight leading-none">
                                              {student.name}
                                            </p>
                                          </>
                                        ) : (
                                          <div className="text-neutral-200 flex flex-col items-center gap-2">
                                            <UserIcon size={24} className="opacity-30" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-30">BOŞ</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        <div className="mt-12 pt-8 border-t border-neutral-100 w-full flex justify-center gap-4 no-print">
                          <button 
                            onClick={() => setIsSeatingModalOpen(true)}
                            className="px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all flex items-center gap-2"
                          >
                            <Settings size={18} />
                            Düzeni Değiştir
                          </button>
                          <button 
                            onClick={() => {
                              setIsManualPlacementModalOpen(false);
                              setIsPlacementScreenOpen(true);
                            }}
                            className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                          >
                            <Edit3 size={18} />
                            Öğrencileri Düzenle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {user && activeTab === 'group-creator' && (
              <GroupGeneratorScreen 
                students={students}
                onBack={() => setActiveTab('home')}
              />
            )}

            {user && activeTab === 'stars-badges' && (
              <StarsBadgesScreen 
                students={students}
                user={user}
                onBack={() => setActiveTab('home')}
              />
            )}

            {user && activeTab === 'lucky-student' && (
              luckyStudentConfig === null ? (
                <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center pt-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <LuckyStudentScreen 
                  students={students}
                  onBack={() => setActiveTab('home')}
                  persistentConfig={luckyStudentConfig}
                  onUpdateConfig={handleUpdateLuckyStudentConfig}
                />
              )
            )}

            {user && activeTab === 'announcements' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Announcements 
                  user={user}
                  teacherUid={userProfile?.profileType === 'ÖĞRETMEN' ? user.uid : linkedStudents.find(s => s.id === selectedStudentId)?.teacherUid}
                  students={userProfile?.profileType === 'ÖĞRETMEN' ? students : linkedStudents}
                  selectedStudentId={selectedStudentId}
                  isTeacher={userProfile?.profileType === 'ÖĞRETMEN'}
                  unreadAnnouncementsCount={unreadAnnouncementsCount}
                  unreadMessagesCount={unreadMessagesCount}
                />
              </motion.div>
            )}

            {user && activeTab === 'timer' && (
              <TimerScreen 
                onBack={() => setActiveTab('home')}
              />
            )}

            {user && (activeTab === 'tournament-create' || activeTab === 'tournaments-list') && (
              <TournamentManagementScreen
                students={students}
                tournaments={tournaments}
                onSaveTournament={handleSaveTournament}
                onDeleteTournament={handleDeleteTournament}
                onManageTournament={handleManageTournament}
                onViewFixture={handleViewFixture}
                activeSubTab={activeTab === 'tournament-create' ? 'create' : 'list'}
                setActiveSubTab={(tab) => setActiveTab(tab === 'create' ? 'tournament-create' : 'tournaments-list')}
              />
            )}

            {user && (activeTab === 'library-list' || activeTab === 'reading-records' || activeTab === 'reading-evaluation') && (
              <motion.div
                key="library-management-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <LibraryManagementScreen 
                  activeSubTab={
                    activeTab === 'library-list' ? 'list' : 
                    activeTab === 'reading-records' ? 'records' : 
                    'evaluation'
                  }
                  onSubTabChange={(tab) => {
                    if (tab === 'list') setActiveTab('library-list');
                    else if (tab === 'records') setActiveTab('reading-records');
                    else setActiveTab('reading-evaluation');
                  }}
                  onAddBook={() => setIsAddBookModalOpen(true)}
                  onEditBook={(book) => {
                    setEditingBook(book);
                    setBookForm({
                      name: book.name,
                      author: book.author || '',
                      pageCount: book.pageCount?.toString() || ''
                    });
                    setIsEditBookModalOpen(true);
                  }}
                  onDeleteBook={(book) => {
                    setEditingBook(book);
                    setIsDeleteBookConfirmOpen(true);
                  }}
                  books={books}
                  students={students}
                  userProfile={userProfile}
                  readingRecords={readingRecords}
                  readingEvaluations={readingEvaluations}
                  onAssignBook={handleAssignBook}
                  onReturnBook={handleReturnBook}
                  onCancelAssignment={handleCancelAssignment}
                  onMarkAsReadByAll={handleMarkAsReadByAll}
                  onDeleteReadingRecord={handleDeleteReadingRecord}
                  onDeleteAllReadingRecords={handleDeleteAllReadingRecords}
                  onSaveEvaluation={handleSaveEvaluation}
                  onSaveAllEvaluations={handleSaveAllEvaluations}
                  onImportExcel={handleLibraryExcelUpload}
                />
              </motion.div>
            )}

            {user && activeTab.startsWith('lesson-') && activeTab !== 'lesson-schedule' && (
              <motion.div
                key="lesson-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {(() => {
                  const lesson = navLessons.find(l => l.id === activeTab);
                  return (
                    <LessonManagement
                      lessonId={activeTab}
                      lessonLabel={lesson?.label || 'Ders İçeriği'}
                      user={user}
                      userProfile={userProfile}
                      lessonIds={lesson?.allIds}
                      students={students}
                    />
                  );
                })()}
              </motion.div>
            )}

            {user && (activeTab.startsWith('activity-') || predefinedActivities.some(a => a.id === activeTab)) && (
               <motion.div
                key="activity-management-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {(() => {
                   const lessonId = activeTab.startsWith('activity-') ? activeTab.replace('activity-', '') : null;
                   const lesson = lessonId ? navLessons.find(l => l.id === lessonId) : null;
                   return (
                     <ActivityManagement
                       activityId={activeTab}
                       students={students}
                       user={user}
                       subject={lesson?.label}
                       onBack={() => setActiveTab('home')}
                       onSelectActivity={(id) => setActiveTab(id)}
                     />
                   );
                })()}
              </motion.div>
            )}

            {user && (activeTab === 'exams' || activeTab.startsWith('exam-')) && (
               <motion.div
                key="exam-management-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {(() => {
                   const lessonId = activeTab === 'exams' ? 'exams' : activeTab.replace('exam-', '');
                   const lesson = lessonId !== 'exams' ? navLessons.find(l => l.id === lessonId) : null;
                   return (
                     <ExamManagement
                       lessonId={lessonId}
                       lessonLabel={lesson?.label || 'Tüm Sınavlar'}
                       students={students}
                       user={user}
                       userProfile={userProfile}
                       lessonIds={lesson?.allIds}
                     />
                   );
                })()}
              </motion.div>
            )}

            {user && activeTab === 'site-management' && user.email === 'cihan.ozel10@gmail.com' && (
              <motion.div
                key="site-management-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <SiteManagement user={user} liveActiveCount={liveStats.active} dailyVisits={liveStats.daily} visitTrend={liveStats.trend} />
              </motion.div>
            )}

            {activeTab === 'user-messages' && user?.email !== 'cihan.ozel10@gmail.com' && (
              <motion.div
                key="user-messages-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <UserMessages user={user} userProfile={userProfile} onLoginRequest={handleLogin} />
              </motion.div>
            )}

            {user && activeTab === 'class-list' && (
              <motion.div
                key="class-list-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {selectedStudentId === 'all' ? (
                  <>
                    {/* Profile Alert */}
                    {isProfileIncomplete && userProfile?.profileType === 'ÖĞRETMEN' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm"
                  >
                    <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-red-800 font-bold">
                        {userProfile?.profileType === 'VELİ' ? 'Veli' : 'Öğretmen'} Profili Eksik!
                      </h3>
                      <p className="text-red-700 text-sm mt-0.5">
                        Veli portalının doğru çalışması ve öğrencilerinize konum bilgisi atanabilmesi için lütfen okul bilgilerinizi girin.
                        <button 
                          onClick={() => setActiveTab('teacher-profile-setup')}
                          className="ml-2 text-indigo-600 font-bold hover:underline"
                        >
                          Profili Şimdi Tamamla
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Teacher Profile Info Card */}
                {!isProfileIncomplete && teacherProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <School size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold uppercase text-neutral-800">
                          {teacherProfile.schoolName}
                        </h2>
                        <p className="text-neutral-500 text-sm flex items-center gap-2 mt-0.5">
                          <span>{teacherProfile.gradeLevel} / {teacherProfile.section?.toUpperCase().includes('ŞUBESİ') ? teacherProfile.section : `${teacherProfile.section} Şubesi`}</span>
                          <span className="text-neutral-300">•</span>
                          <span className="uppercase">{teacherProfile.district} / {teacherProfile.city}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <button 
                        onClick={() => setActiveTab('teacher-profile-setup')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit3 size={16} />
                        Değiştir
                      </button>
                      <button 
                        onClick={() => setIsDeleteProfileConfirmOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                        Sil
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <List size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">Sınıf Listesi</h1>
                      <p className="text-neutral-500 text-sm">Öğrenci listesini buradan yönetebilirsiniz.</p>
                    </div>
                  </div>
                  
                  {userProfile?.profileType === 'ÖĞRETMEN' && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isProfileIncomplete}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all shadow-sm active:scale-95 ${
                          isProfileIncomplete 
                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        <Plus size={18} />
                        Öğrenci Ekle
                      </button>
                      <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        disabled={isProfileIncomplete}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all shadow-sm active:scale-95 ${
                          isProfileIncomplete
                            ? 'bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed'
                            : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <Upload size={18} />
                        Liste Yükle
                      </button>
                      <button 
                        onClick={handleDownloadList}
                        disabled={students.length === 0}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all shadow-sm active:scale-95 ${
                          students.length === 0
                            ? 'bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed'
                            : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <Download size={18} />
                        İndir
                      </button>
                      <button 
                        onClick={() => setIsDeleteAllConfirmOpen(true)}
                        disabled={students.length === 0}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all shadow-sm active:scale-95 ${
                          students.length === 0
                            ? 'bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed'
                            : 'bg-red-50 text-red-500 border border-red-100 hover:bg-red-100'
                        }`}
                      >
                        <Trash2 size={18} />
                        Tümünü Sil
                      </button>
                    </div>
                  )}
                </div>

                {/* Student Stats Summary */}
                {students.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center gap-8 px-2 py-2"
                  >
                    <button 
                      onClick={() => setFilterType('all')}
                      className={`flex items-center gap-3 transition-all group ${filterType === 'all' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <span className={`text-3xl font-bold transition-colors ${filterType === 'all' ? 'text-indigo-600' : 'text-neutral-900'}`}>{totalStudents}</span>
                      <span className="text-neutral-400 font-medium text-lg group-hover:text-neutral-600">Toplam Öğrenci</span>
                    </button>
                    <button 
                      onClick={() => setFilterType('male')}
                      className={`flex items-center gap-3 transition-all group ${filterType === 'male' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <span className={`bg-indigo-50/50 px-4 py-1.5 rounded-2xl text-base font-bold transition-colors ${filterType === 'male' ? 'bg-indigo-100 text-indigo-700' : 'text-neutral-900'}`}>{maleCount}</span>
                      <span className="text-neutral-400 font-medium text-lg group-hover:text-neutral-600">Erkek</span>
                    </button>
                    <button 
                      onClick={() => setFilterType('female')}
                      className={`flex items-center gap-3 transition-all group ${filterType === 'female' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <span className={`bg-indigo-50/50 px-4 py-1.5 rounded-2xl text-base font-bold transition-colors ${filterType === 'female' ? 'bg-pink-100 text-pink-700' : 'text-neutral-900'}`}>{femaleCount}</span>
                      <span className="text-neutral-400 font-medium text-lg group-hover:text-neutral-600">Kız</span>
                    </button>
                    <button 
                      onClick={() => setFilterType('birthday')}
                      className={`flex items-center gap-3 transition-all group ${filterType === 'birthday' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <span className={`bg-indigo-50/50 px-4 py-1.5 rounded-2xl text-base font-bold transition-colors ${filterType === 'birthday' ? 'bg-amber-100 text-amber-700' : 'text-neutral-900'}`}>{birthdayCount}</span>
                      <span className="text-neutral-400 font-medium text-lg group-hover:text-neutral-600">Bu Ay Doğanlar</span>
                    </button>
                  </motion.div>
                )}

                {/* Search and Table */}
                <div className="bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden">
                  <div className="p-6 border-b border-neutral-100">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Öğrenci ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/50 text-neutral-500 text-xs uppercase tracking-wider">
                          <th 
                            className="px-4 py-2 font-semibold cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => handleSort('studentNo')}
                          >
                            <div className="flex items-center gap-2">
                              No
                              <ArrowUpDown size={14} />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-2 font-semibold cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center gap-2">
                              Adı Soyadı
                              <ArrowUpDown size={14} />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-2 font-semibold cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => handleSort('gender')}
                          >
                            <div className="flex items-center gap-2">
                              Cinsiyeti
                              <ArrowUpDown size={14} />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-2 font-semibold cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => handleSort('birthDate')}
                          >
                            <div className="flex items-center gap-2">
                              Doğum Tarihi
                              <ArrowUpDown size={14} />
                            </div>
                          </th>
                          <th className="px-4 py-2 font-semibold text-xs">Veli E-postası</th>
                          <th className="px-4 py-2 font-semibold text-xs">Veli E-postası 2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {sortedStudents.length > 0 ? (
                          sortedStudents.map((student) => (
                            <tr 
                              key={student.id} 
                              onClick={() => {
                                if (userProfile?.profileType === 'ÖĞRETMEN') {
                                  setSelectedStudent(student);
                                  setIsEditModalOpen(true);
                                }
                              }}
                              className={`hover:bg-indigo-50/30 transition-colors ${userProfile?.profileType === 'ÖĞRETMEN' ? 'cursor-pointer' : 'cursor-default'} group`}
                            >
                              <td className="px-4 py-1.5 font-mono text-xs text-neutral-600">{student.studentNo}</td>
                              <td className="px-4 py-1.5">
                                <div className="font-medium text-sm text-neutral-900 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                              </td>
                              <td className="px-4 py-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  student.gender === 'Erkek' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                                }`}>
                                  {student.gender}
                                </span>
                              </td>
                              <td className="px-4 py-1.5 text-xs text-neutral-500">{formatDate(student.birthDate)}</td>
                              <td className="px-4 py-1.5 text-xs text-neutral-500">{student.parentEmail}</td>
                              <td className="px-4 py-1.5 text-xs text-neutral-500">{student.parentEmail2 || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-neutral-400 italic">
                              Öğrenci bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <ParentDashboard 
                linkedStudents={userProfile?.profileType === 'VELİ' ? confirmedStudents : students}
                selectedStudentId={selectedStudentId}
                allStudents={students}
                seatingPlan={seatingPlan}
                teacherProfile={teacherProfile}
                readingRecords={readingRecords}
                tournaments={tournaments}
                scheduleConfig={scheduleConfig}
                scheduleData={scheduleData}
                subjects={subjects}
                unreadAnnouncementsCount={unreadAnnouncementsCount}
                onTabChange={setActiveTab}
                isTeacher={userProfile?.profileType === 'ÖĞRETMEN'}
              />
            )}
          </motion.div>
        )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {/* Reset Schedule Confirmation Modal */}
      <AnimatePresence>
        {isResetScheduleConfirmOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetScheduleConfirmOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 mb-2">Programı Sıfırla</h3>
                <p className="text-neutral-500 mb-8">
                  Ders programını ve tüm ayarları tamamen sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => setIsResetScheduleConfirmOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-semibold hover:bg-neutral-200 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleResetSchedule}
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl font-semibold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                  >
                    Evet, Sıfırla
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {isDeleteAllConfirmOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteAllConfirmOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Tümünü Silmek İstiyor musunuz?</h2>
                <p className="text-neutral-500 mb-8">
                  TÜM sınıf listesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setIsDeleteAllConfirmOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-semibold hover:bg-neutral-200 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleDeleteAllStudents}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Evet, Hepsini Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Profile Confirmation Modal */}
      <AnimatePresence>
        {isDeleteProfileConfirmOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteProfileConfirmOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                  <Trash2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Profil Bilgilerini Sil?</h2>
                <p className="text-neutral-500 mb-8">
                  Mevcut profil bilgilerinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setIsDeleteProfileConfirmOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-semibold hover:bg-neutral-200 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleDeleteProfile}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirm Modal */}
      <AnimatePresence>
        {isDeleteAccountModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingAccount && setIsDeleteAccountModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6">
                  {isDeletingAccount ? (
                    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 size={32} />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  {isDeletingAccount ? 'Hesap Siliniyor...' : 'Hesabınızı Silmek İstediğinize Emin Misiniz?'}
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                  {isDeletingAccount 
                    ? 'Lütfen bekleyiniz, bu işlem biraz zaman alabilir...' 
                    : 'Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinir.'}
                </p>
                {!isDeletingAccount && (
                  <div className="flex w-full gap-3">
                    <button 
                      onClick={() => setIsDeleteAccountModalOpen(false)}
                      className="flex-1 px-6 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 dark:shadow-none"
                    >
                      Evet, Sil
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Student Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && selectedStudent && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6">
                  <Trash2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Öğrenciyi Sil?</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                  <span className="font-semibold text-neutral-900 dark:text-white">{selectedStudent.name}</span> isimli öğrenciyi silmek istediğinizden emin misiniz?
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={() => handleDeleteStudent(selectedStudent.id)}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl">
                      <UserIcon size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                        {userProfile?.profileType === 'VELİ' ? 'Veli Profili' : 'Öğretmen Profili'}
                      </h2>
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium">Hesap bilgileriniz</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      <X size={20} className="text-neutral-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Mevcut Profiliniz</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            userProfile?.profileType === 'ÖĞRETMEN' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            {userProfile?.profileType === 'ÖĞRETMEN' ? 'Öğretmen' : 'Veli'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <img 
                        src={user?.photoURL || ''} 
                        alt={user?.displayName || ''} 
                        className="w-16 h-16 rounded-2xl border-4 border-white dark:border-neutral-800 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Profil Adı</p>
                        <p className="text-lg font-black text-neutral-900 dark:text-white">{user?.displayName}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                        <Mail size={18} className="text-indigo-500 dark:text-indigo-400" />
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-0.5">E-posta Adresi</p>
                          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {userProfile?.profileType === 'VELİ' ? (
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/30">
                      <div className="flex gap-4">
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm h-fit">
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight mb-1">Öğrenci Yönetimi</h4>
                          <p className="text-sm text-amber-700/80 dark:text-amber-400/80 font-medium leading-relaxed">
                            Öğrencilerinizi eklemek veya mevcut bilgileri düzenlemek için ana sayfadaki <strong>"Öğrencilerim"</strong> menüsünü kullanabilirsiniz.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex gap-4">
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm h-fit">
                          <School size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tight mb-1">Okul Bilgileri</h4>
                          <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80 font-medium leading-relaxed">
                            Okul ve sınıf bilgilerinizi <strong>"Okul Bilgileri"</strong> kartından güncelleyebilirsiniz.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setIsDeleteAccountModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <Trash2 size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase tracking-widest">Hesabımı Sil</p>
                        <p className="text-[10px] font-bold opacity-70">Tüm verileriniz kalıcı olarak silinir</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="opacity-40" />
                  </button>
                </div>
              </div>

              <div className="p-8 pt-0 mt-auto border-t border-neutral-50 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end">
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-8 py-3 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-200 dark:shadow-none"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleUpdateStudent} className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Öğrenci Bilgilerini Güncelle</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Öğrenci bilgilerini buradan düzenleyebilirsiniz.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Öğrenci No</label>
                      <input 
                        required
                        type="text" 
                        value={selectedStudent.studentNo}
                        onChange={(e) => setSelectedStudent({...selectedStudent, studentNo: e.target.value})}
                        placeholder="Örn: 101"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Cinsiyet</label>
                      <select 
                        value={selectedStudent.gender}
                        onChange={(e) => setSelectedStudent({...selectedStudent, gender: e.target.value as 'Erkek' | 'Kız'})}
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      >
                        <option value="Erkek">Erkek</option>
                        <option value="Kız">Kız</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Adı</label>
                      <input 
                        required
                        type="text" 
                        value={selectedStudent.name}
                        onChange={(e) => setSelectedStudent({...selectedStudent, name: turkishToUpper(e.target.value)})}
                        placeholder="Örn: Ahmet"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Soyadı</label>
                      <input 
                        required
                        type="text" 
                        value={selectedStudent.surname}
                        onChange={(e) => setSelectedStudent({...selectedStudent, surname: turkishToUpper(e.target.value)})}
                        placeholder="Örn: Yılmaz"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1 flex items-center justify-between">
                      <span>Doğum Tarihi</span>
                      <span className="text-[10px] text-indigo-500 lowercase font-medium italic">Türkçe karakterlere (İ, ı, Ğ, Ü, Ş, Ö, Ç) dikkat ediniz.</span>
                    </label>
                    <input 
                      type="date" 
                      value={selectedStudent.birthDate}
                      onChange={(e) => setSelectedStudent({...selectedStudent, birthDate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Veli E-postası</label>
                    <input 
                      type="email" 
                      value={selectedStudent.parentEmail}
                      onChange={(e) => setSelectedStudent({...selectedStudent, parentEmail: e.target.value})}
                      placeholder="Örn: veli@example.com"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Veli E-postası 2 (İsteğe Bağlı)</label>
                    <input 
                      type="email" 
                      value={selectedStudent.parentEmail2 || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, parentEmail2: e.target.value})}
                      placeholder="Örn: veli2@example.com"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Öğrenciyi Sil
                  </button>
                  <div className="flex-1 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                    >
                      İptal
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      Güncelle
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleAddStudent} className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Yeni Öğrenci Ekle</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Öğrenci bilgilerini manuel olarak girin.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Öğrenci No</label>
                      <input 
                        required
                        type="text" 
                        value={newStudent.studentNo}
                        onChange={(e) => setNewStudent({...newStudent, studentNo: e.target.value})}
                        placeholder="Örn: 101"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Cinsiyet</label>
                      <select 
                        value={newStudent.gender}
                        onChange={(e) => setNewStudent({...newStudent, gender: e.target.value as 'Erkek' | 'Kız'})}
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      >
                        <option value="Erkek">Erkek</option>
                        <option value="Kız">Kız</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Adı</label>
                      <input 
                        required
                        type="text" 
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({...newStudent, name: turkishToUpper(e.target.value)})}
                        placeholder="Örn: Ahmet"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Soyadı</label>
                      <input 
                        required
                        type="text" 
                        value={newStudent.surname}
                        onChange={(e) => setNewStudent({...newStudent, surname: turkishToUpper(e.target.value)})}
                        placeholder="Örn: Yılmaz"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1 flex items-center justify-between">
                      <span>Doğum Tarihi</span>
                      <span className="text-[10px] text-indigo-500 lowercase font-medium italic">Türkçe karakterlere (İ, ı, Ğ, Ü, Ş, Ö, Ç) dikkat ediniz.</span>
                    </label>
                    <input 
                      type="date" 
                      value={newStudent.birthDate}
                      onChange={(e) => setNewStudent({...newStudent, birthDate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Veli E-postası</label>
                    <input 
                      type="email" 
                      value={newStudent.parentEmail}
                      onChange={(e) => setNewStudent({...newStudent, parentEmail: e.target.value})}
                      placeholder="Örn: veli@example.com"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Veli E-postası 2 (İsteğe Bağlı)</label>
                    <input 
                      type="email" 
                      value={newStudent.parentEmail2}
                      onChange={(e) => setNewStudent({...newStudent, parentEmail2: e.target.value})}
                      placeholder="Örn: veli2@example.com"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        <ApiInfoModal 
          isOpen={isApiModalOpen} 
          onClose={() => setIsApiModalOpen(false)} 
        />
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Listeyi Excel'den Yükle</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Öğrenci listenizi .xlsx veya .xls formatında toplu olarak yükleyin.</p>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <button 
                    onClick={downloadTemplate}
                    className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Download size={18} className="text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-neutral-700">Örnek Şablonu İndir</span>
                    </div>
                    <p className="text-xs text-neutral-400">Doğru format için şablonu kullanın.</p>
                  </button>

                  <div className="group relative border-2 border-dashed border-neutral-200 rounded-[24px] p-12 transition-all hover:border-indigo-400 hover:bg-indigo-50/30">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept=".xlsx, .xls" 
                      onChange={handleExcelUpload}
                      disabled={isUploading}
                    />
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {isUploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                        ) : (
                          <FileUp size={32} />
                        )}
                      </div>
                      <p className="text-neutral-600 font-medium">
                        {isUploading ? 'Dosya işleniyor...' : 'Dosyayı buraya sürükleyin'}
                      </p>
                      <p className="text-neutral-400 text-sm mt-1">veya seçmek için tıklayın</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-semibold hover:bg-neutral-200 transition-all"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Configuration Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSaveScheduleConfig} className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">Ders Programı Ayarları</h2>
                    <p className="text-neutral-500 mt-1">Program yapısını buradan belirleyebilirsiniz.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  {scheduleError && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                      {scheduleError}
                    </div>
                  )}
                  {/* Days Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-wider">Ders Olan Günler</label>
                    <div className="flex flex-wrap gap-2">
                      {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const newDays = scheduleForm.days.includes(day)
                              ? scheduleForm.days.filter(d => d !== day)
                              : [...scheduleForm.days, day];
                            setScheduleForm({...scheduleForm, days: newDays});
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            scheduleForm.days.includes(day)
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                              : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 ml-1">Günlük Ders Sayısı</label>
                      <input 
                        required
                        type="number" 
                        min="1"
                        max="12"
                        value={scheduleForm.lessonCount}
                        onChange={(e) => setScheduleForm({...scheduleForm, lessonCount: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 ml-1">Ders Başlangıç Saati</label>
                      <input 
                        required
                        type="time" 
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 ml-1">Ders Süresi (Dakika)</label>
                      <input 
                        required
                        type="number" 
                        min="10"
                        max="90"
                        value={scheduleForm.lessonDuration}
                        onChange={(e) => setScheduleForm({...scheduleForm, lessonDuration: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 ml-1">Teneffüs Süresi (Dakika)</label>
                      <input 
                        required
                        type="number" 
                        min="5"
                        max="30"
                        value={scheduleForm.recessDuration}
                        onChange={(e) => setScheduleForm({...scheduleForm, recessDuration: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 ml-1">Öğle Arası Süresi (Dakika)</label>
                      <input 
                        required
                        type="number" 
                        min="0"
                        max="120"
                        value={scheduleForm.lunchBreakDuration}
                        onChange={(e) => setScheduleForm({...scheduleForm, lunchBreakDuration: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 ml-1">Öğle Arası Kaçıncı Dersten Sonra?</label>
                      <input 
                        required
                        type="number" 
                        min="0"
                        max={scheduleForm.lessonCount}
                        value={scheduleForm.lunchBreakAfterLesson}
                        onChange={(e) => setScheduleForm({...scheduleForm, lunchBreakAfterLesson: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Custom Recess Durations */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-neutral-700 ml-1 uppercase tracking-wider">Özel Teneffüs Süreleri (Opsiyonel)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Array.from({ length: Math.max(0, scheduleForm.lessonCount - 1) }, (_, i) => i + 1).map(lessonNum => {
                        if (lessonNum === scheduleForm.lunchBreakAfterLesson) return null;
                        return (
                          <div key={lessonNum} className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">
                              {lessonNum}. Teneffüs
                            </label>
                            <input 
                              type="number" 
                              placeholder={`${scheduleForm.recessDuration} dk`}
                              value={scheduleForm.customRecessDurations?.[lessonNum] || ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : undefined;
                                const newCustom = { ...(scheduleForm.customRecessDurations || {}) };
                                if (val === undefined || isNaN(val)) {
                                  delete newCustom[lessonNum];
                                } else {
                                  newCustom[lessonNum] = val;
                                }
                                setScheduleForm({...scheduleForm, customRecessDurations: newCustom});
                              }}
                              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-neutral-400 italic ml-1">
                      * Boş bırakılan teneffüsler için varsayılan süre ({scheduleForm.recessDuration} dk) kullanılacaktır.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-semibold hover:bg-neutral-200 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingSchedule}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSavingSchedule ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      'Ayarları Kaydet'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subject Selection Modal */}
      <AnimatePresence>
        {isSubjectSelectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubjectSelectModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">Ders Seç</h2>
                    <p className="text-neutral-500 mt-1">
                      {selectedSlot?.day} - {selectedSlot?.lessonNumber}. Ders için bir branş seçin.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsSubjectSelectModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {subjects.map(subject => (
                    <div key={subject.id} className="relative group">
                      <button
                        onClick={() => handleSubjectSelect(subject.id)}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-indigo-200 transition-all text-left"
                        style={{ backgroundColor: `${subject.color}10` }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }} />
                        <span className="font-bold text-neutral-700 group-hover:text-indigo-600 transition-colors uppercase text-sm tracking-tight">
                          {subject.name}
                        </span>
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSubject(subject);
                            setSubjectForm({ name: subject.name, color: subject.color });
                            setIsSubjectEditModalOpen(true);
                          }}
                          className="p-2 hover:bg-white rounded-full text-neutral-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubject(subject.id);
                          }}
                          className="p-2 hover:bg-white rounded-full text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleSubjectSelect('clear')}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-50 border-2 border-transparent hover:border-red-200 transition-all text-left group"
                  >
                    <div className="w-4 h-4 rounded-full bg-neutral-300" />
                    <span className="font-bold text-neutral-500 group-hover:text-red-600 transition-colors uppercase text-sm tracking-tight">
                      Dersi Sil
                    </span>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100 flex justify-between items-center">
                  <button 
                    onClick={() => {
                      setEditingSubject(null);
                      setSubjectForm({ name: '', color: '#3b82f6' });
                      setIsSubjectEditModalOpen(true);
                    }}
                    className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-700 transition-colors"
                  >
                    <Plus size={18} />
                    Yeni Ders Tanımla
                  </button>
                  <button 
                    onClick={() => setIsSubjectSelectModalOpen(false)}
                    className="px-6 py-2 text-neutral-500 font-bold text-sm hover:text-neutral-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subject Edit Modal */}
      <AnimatePresence>
        {isSubjectEditModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubjectEditModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSaveSubject} className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900">
                    {editingSubject ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}
                  </h2>
                  <button 
                    type="button"
                    onClick={() => setIsSubjectEditModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 ml-1">Ders Adı</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Örn: Matematik"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-700 ml-1">Renk Seçimi</label>
                    <div className="flex flex-wrap gap-3">
                      {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#6366f1', '#64748b'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSubjectForm({...subjectForm, color})}
                          className={`w-10 h-10 rounded-full border-4 transition-all ${
                            subjectForm.color === color ? 'border-neutral-900 scale-110' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsSubjectEditModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-semibold hover:bg-neutral-200 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    {editingSubject ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* Seating Plan Options Modal */}
        {isSeatingModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSeatingModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#f8fafc] rounded-[32px] shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                      Oturma Planı Seçenekleri
                    </h2>
                    <p className="text-neutral-500 mt-1 font-medium">
                      Sınıfınız için oturma planını nasıl düzenlemek istediğinizi seçin.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsSeatingModalOpen(false)}
                    className="p-2 bg-white hover:bg-neutral-100 rounded-full transition-all shadow-sm border border-neutral-100 group"
                  >
                    <X size={20} className="text-neutral-400 group-hover:text-indigo-600 transition-colors" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <button 
                    onClick={() => {
                      setIsSeatingModalOpen(false);
                      setIsManualPlacementModalOpen(true);
                    }}
                    className="group p-8 bg-white border border-neutral-200/60 rounded-[2rem] hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left flex items-center gap-6"
                  >
                    <div className="p-4 bg-neutral-50 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all shadow-sm">
                      <Hand size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-neutral-900 group-hover:text-indigo-600 transition-colors tracking-tight">Elle Yerleştirme</h3>
                      <p className="text-sm text-neutral-500 mt-1 leading-relaxed font-medium">
                        Öğrencileri sürükle-bırak ile manuel olarak yerleştirin.
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setIsSeatingModalOpen(false);
                      setIsRandomPlacementModalOpen(true);
                      setRandomPlacementStep(1);
                      setReferencePlan(null);
                      setPriorityStudents([]);
                      setFixedStudents({});
                    }}
                    className="group p-8 bg-white border border-neutral-200/60 rounded-[2rem] hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left flex items-center gap-6"
                  >
                    <div className="p-4 bg-neutral-50 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all shadow-sm">
                      <Shuffle size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-neutral-900 group-hover:text-indigo-600 transition-colors tracking-tight">Rastgele Yerleştirme</h3>
                      <p className="text-sm text-neutral-500 mt-1 leading-relaxed font-medium">
                        Öğrencileri belirli kurallara göre otomatik yerleştirin.
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setIsSeatingModalOpen(false);
                      setIsHorizontalShiftModalOpen(true);
                      setHorizontalShiftStep(1);
                      setTempShiftData(null);
                    }}
                    className="group p-8 bg-white border border-neutral-200/60 rounded-[2rem] hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left flex items-center gap-6"
                  >
                    <div className="p-4 bg-neutral-50 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all shadow-sm">
                      <ArrowLeftRight size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-neutral-900 group-hover:text-indigo-600 transition-colors tracking-tight">Yatay (Grup) Kaydırma</h3>
                      <p className="text-sm text-neutral-500 mt-1 leading-relaxed font-medium">
                        Öğrenci gruplarının yerini değiştirin.
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setIsSeatingModalOpen(false);
                      setIsVerticalShiftModalOpen(true);
                      setVerticalShiftStep(1);
                      setTempShiftData(null);
                    }}
                    className="group p-8 bg-white border border-neutral-200/60 rounded-[2rem] hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left flex items-center gap-6"
                  >
                    <div className="p-4 bg-neutral-50 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all shadow-sm">
                      <ArrowUpDown size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-neutral-900 group-hover:text-indigo-600 transition-colors tracking-tight">Dikey (Sıra) Kaydırma</h3>
                      <p className="text-sm text-neutral-500 mt-1 leading-relaxed font-medium">
                        Sıraların kendi içindeki yerlerini değiştirin.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Horizontal Shift Modal */}
        {isHorizontalShiftModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHorizontalShiftModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                      {horizontalShiftStep === 1 ? 'Yatay Kaydırma' : `Yatay Kaydırma - ${tempShiftData?.config.groupCount} Gruplu Plan`}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                      {horizontalShiftStep === 1 
                        ? 'Mevcut bir planı yükleyerek gruplar arasında öğrenci rotasyonu yapın.' 
                        : 'Kaydırma seçeneklerini belirleyerek yeni planınızı oluşturun.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsHorizontalShiftModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                {horizontalShiftStep === 1 ? (
                  <div className="space-y-8 py-4">
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-neutral-800">Temel Plan Yükleme</h3>
                      <p className="text-sm text-neutral-400 max-w-md mx-auto">
                        Yatay kaydırma işlemi uygulamak için lütfen önce bir oturma planı (`.json`) dosyası yükleyin.
                      </p>
                    </div>

                    <div className={`p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${
                      tempShiftData ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-100'
                    }`}>
                      <div className={`p-4 rounded-2xl ${tempShiftData ? 'bg-emerald-500 text-white' : 'bg-red-50 text-red-400'}`}>
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className={`font-bold ${tempShiftData ? 'text-emerald-700' : 'text-red-500'}`}>
                          {tempShiftData ? 'Plan Yüklendi' : 'Plan Bekleniyor'}
                        </p>
                        <p className={`text-xs mt-1 ${tempShiftData ? 'text-emerald-600' : 'text-red-400'}`}>
                          {tempShiftData ? 'Devam etmek için "İleri" butonuna tıklayın.' : 'Devam etmek için bir plan dosyası yükleyin.'}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => document.getElementById('shift-file-input')?.click()}
                      className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-3"
                    >
                      <Upload size={20} />
                      Dosya Seç
                    </button>
                    <input 
                      type="file" 
                      id="shift-file-input" 
                      accept=".json" 
                      onChange={handleShiftFileLoad} 
                      className="hidden" 
                    />

                    <div className="flex justify-end gap-4 pt-4">
                      <button 
                        onClick={() => setIsHorizontalShiftModalOpen(false)}
                        className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-700 transition-colors"
                      >
                        İptal
                      </button>
                      <button 
                        disabled={!tempShiftData}
                        onClick={() => setHorizontalShiftStep(2)}
                        className={`px-10 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${
                          !tempShiftData 
                            ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                            : 'bg-sky-400 text-white hover:bg-sky-500 shadow-lg shadow-sky-100'
                        }`}
                      >
                        İleri
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 py-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-neutral-800">Kaydırma Yönü</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setShiftDirection('left')}
                          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                            shiftDirection === 'left' 
                              ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-100' 
                              : 'bg-white border-neutral-100 text-neutral-600 hover:border-sky-200'
                          }`}
                        >
                          <ArrowLeft size={24} />
                          <span className="font-bold">Sola Kaydır</span>
                        </button>
                        <button 
                          onClick={() => setShiftDirection('right')}
                          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                            shiftDirection === 'right' 
                              ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-100' 
                              : 'bg-white border-neutral-100 text-neutral-600 hover:border-sky-200'
                          }`}
                        >
                          <ArrowRight size={24} />
                          <span className="font-bold">Sağa Kaydır</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-white border border-neutral-100 rounded-3xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-800">Grup İçinde Karıştır?</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Gruplar kaydırıldıktan sonra öğrenciler grup içinde yeniden karıştırılsın mı?</p>
                      </div>
                      <button 
                        onClick={() => setShuffleWithinGroup(!shuffleWithinGroup)}
                        className={`w-14 h-8 rounded-full transition-all relative ${
                          shuffleWithinGroup ? 'bg-sky-500' : 'bg-neutral-200'
                        }`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                          shuffleWithinGroup ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <button 
                        onClick={() => setHorizontalShiftStep(1)}
                        className="px-8 py-3 bg-neutral-50 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-100 transition-all flex items-center gap-2"
                      >
                        <ArrowLeft size={18} />
                        Geri
                      </button>
                      <button 
                        onClick={handleHorizontalShift}
                        className="px-10 py-3 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 flex items-center gap-2"
                      >
                        Planı Oluştur
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Vertical Shift Modal */}
        {isVerticalShiftModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVerticalShiftModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                      {verticalShiftStep === 1 ? 'Dikey Kaydırma' : `Dikey Kaydırma - ${tempShiftData?.config.groupCount} Gruplu Plan`}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                      {verticalShiftStep === 1 
                        ? 'Mevcut bir planı yükleyerek sıralar arasında öğrenci rotasyonu yapın.' 
                        : 'Kaydırma seçeneklerini belirleyerek yeni planınızı oluşturun.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsVerticalShiftModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                {verticalShiftStep === 1 ? (
                  <div className="space-y-8 py-4">
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-neutral-800">Temel Plan Yükleme</h3>
                      <p className="text-sm text-neutral-400 max-w-md mx-auto">
                        Dikey kaydırma işlemi uygulamak için lütfen önce bir oturma planı (`.json`) dosyası yükleyin.
                      </p>
                    </div>

                    <div className={`p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${
                      tempShiftData ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-100'
                    }`}>
                      <div className={`p-4 rounded-2xl ${tempShiftData ? 'bg-emerald-500 text-white' : 'bg-red-50 text-red-400'}`}>
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className={`font-bold ${tempShiftData ? 'text-emerald-700' : 'text-red-500'}`}>
                          {tempShiftData ? 'Plan Yüklendi' : 'Plan Bekleniyor'}
                        </p>
                        <p className={`text-xs mt-1 ${tempShiftData ? 'text-emerald-600' : 'text-red-400'}`}>
                          {tempShiftData ? 'Devam etmek için "İleri" butonuna tıklayın.' : 'Devam etmek için bir plan dosyası yükleyin.'}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => document.getElementById('vertical-shift-file-input')?.click()}
                      className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-3"
                    >
                      <Upload size={20} />
                      Dosya Seç
                    </button>
                    <input 
                      type="file" 
                      id="vertical-shift-file-input" 
                      accept=".json" 
                      onChange={handleShiftFileLoad} 
                      className="hidden" 
                    />

                    <div className="flex justify-end gap-4 pt-4">
                      <button 
                        onClick={() => setIsVerticalShiftModalOpen(false)}
                        className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-700 transition-colors"
                      >
                        İptal
                      </button>
                      <button 
                        disabled={!tempShiftData}
                        onClick={() => setVerticalShiftStep(2)}
                        className={`px-10 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${
                          !tempShiftData 
                            ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                            : 'bg-sky-400 text-white hover:bg-sky-500 shadow-lg shadow-sky-100'
                        }`}
                      >
                        İleri
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 py-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-neutral-800">Kaydırma Yönü</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setVerticalShiftDirection('forward')}
                          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                            verticalShiftDirection === 'forward' 
                              ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-100' 
                              : 'bg-white border-neutral-100 text-neutral-600 hover:border-sky-200'
                          }`}
                        >
                          <ArrowUp size={24} />
                          <span className="font-bold">İleri Kaydır</span>
                        </button>
                        <button 
                          onClick={() => setVerticalShiftDirection('backward')}
                          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                            verticalShiftDirection === 'backward' 
                              ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-100' 
                              : 'bg-white border-neutral-100 text-neutral-600 hover:border-sky-200'
                          }`}
                        >
                          <ArrowDown size={24} />
                          <span className="font-bold">Geri Kaydır</span>
                        </button>
                      </div>
                      <p className="text-xs text-neutral-400 text-center italic">
                        İleri: Arka sıra öne gelir. Geri: Ön sıra arkaya gider.
                      </p>
                    </div>

                    <div className="p-6 bg-white border border-neutral-100 rounded-3xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-800">Sıra İçinde Karıştır?</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Sıralar kaydırıldıktan sonra öğrenciler sıra içinde yeniden karıştırılsın mı?</p>
                      </div>
                      <button 
                        onClick={() => setShuffleWithinRow(!shuffleWithinRow)}
                        className={`w-14 h-8 rounded-full transition-all relative ${
                          shuffleWithinRow ? 'bg-sky-500' : 'bg-neutral-200'
                        }`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                          shuffleWithinRow ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <button 
                        onClick={() => setVerticalShiftStep(1)}
                        className="px-8 py-3 bg-neutral-50 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-100 transition-all flex items-center gap-2"
                      >
                        <ArrowLeft size={18} />
                        Geri
                      </button>
                      <button 
                        onClick={handleVerticalShift}
                        className="px-10 py-3 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 flex items-center gap-2"
                      >
                        Planı Oluştur
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Random Placement Rules Modal */}
        {isRandomPlacementModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRandomPlacementModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-8 border-b border-neutral-100 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                      Rastgele Yerleştirme Kuralları - Adım {randomPlacementStep}/5
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                      {randomPlacementStep === 1 && 'Daha önce bir plana göre kurallar uygulamak için bir .json dosyası yükleyin veya bu adımı atlayın.'}
                      {randomPlacementStep === 2 && 'Oturma planınızın temel düzenini belirleyin.'}
                      {randomPlacementStep === 3 && 'Yerleştirme için genel ve özel kuralları seçin.'}
                      {randomPlacementStep === 4 && 'Öncelikli olarak yerleştirilecek öğrencileri belirleyin.'}
                      {randomPlacementStep === 5 && 'Kuralları gözden geçirin ve yerleştirmeyi başlatın.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsRandomPlacementModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {randomPlacementStep === 1 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-neutral-800">Referans Plan Yükleme (İsteğe Bağlı)</h3>
                      <p className="text-sm text-neutral-400 max-w-md mx-auto">
                        "Farklı sırada otursun" gibi kuralları kullanmak için bir önceki oturma planınızı yükleyebilirsiniz.
                      </p>
                    </div>

                    <div className={`p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${
                      referencePlan ? 'bg-emerald-50 border-emerald-200' : 'bg-neutral-50 border-neutral-100'
                    }`}>
                      <div className={`p-4 rounded-2xl ${referencePlan ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className={`font-bold ${referencePlan ? 'text-emerald-700' : 'text-neutral-500'}`}>
                          {referencePlan ? 'Referans Plan Yüklendi' : 'Referans Plan Yüklü Değil'}
                        </p>
                        <p className={`text-xs mt-1 ${referencePlan ? 'text-emerald-600' : 'text-neutral-400'}`}>
                          {referencePlan ? 'Kurallar bu plana göre uygulanacaktır.' : 'Devam edebilirsiniz, ancak "önceki plana göre" kuralları devre dışı kalacaktır.'}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => document.getElementById('ref-file-input')?.click()}
                      className="w-full py-4 bg-white border-2 border-neutral-100 text-neutral-600 rounded-2xl font-bold hover:border-sky-200 hover:bg-sky-50 transition-all flex items-center justify-center gap-3"
                    >
                      <Upload size={20} />
                      Referans Plan Yükle
                    </button>
                    <input 
                      type="file" 
                      id="ref-file-input" 
                      accept=".json" 
                      onChange={handleReferencePlanLoad} 
                      className="hidden" 
                    />
                  </div>
                )}

                {randomPlacementStep === 2 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 ml-1">Grup Sayısı</label>
                        <input 
                          type="number"
                          value={seatingConfig.groupCount}
                          onChange={(e) => {
                            const newCount = parseInt(e.target.value) || 1;
                            const newRows = [...seatingConfig.rowsPerGroup];
                            while (newRows.length < newCount) newRows.push(5);
                            setSeatingConfig({...seatingConfig, groupCount: newCount, rowsPerGroup: newRows.slice(0, newCount)});
                          }}
                          className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-center text-lg font-bold"
                        />
                        <p className="text-xs text-neutral-400 ml-1">Sıra gruplarının sayısı.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 ml-1">Sıradaki Kişi Sayısı</label>
                        <input 
                          type="number"
                          value={seatingConfig.peoplePerRow}
                          onChange={(e) => setSeatingConfig({...seatingConfig, peoplePerRow: parseInt(e.target.value) || 1})}
                          className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-center text-lg font-bold"
                        />
                        <p className="text-xs text-neutral-400 ml-1">Her sıraya kaç kişi oturacak?</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-neutral-700 ml-1">Gruptaki Sıra Sayısı</label>
                      <p className="text-xs text-neutral-400 ml-1">Her gruptaki sıra adedini belirtin.</p>
                      <div className="flex flex-wrap gap-4">
                        {Array.from({ length: seatingConfig.groupCount }).map((_, i) => (
                          <div key={i} className="flex-1 min-w-[120px] space-y-2">
                            <label className="text-xs font-bold text-neutral-500 ml-1">Grup {i + 1}</label>
                            <input 
                              type="number"
                              value={seatingConfig.rowsPerGroup[i] || 5}
                              onChange={(e) => {
                                const newRows = [...seatingConfig.rowsPerGroup];
                                newRows[i] = parseInt(e.target.value) || 1;
                                setSeatingConfig({...seatingConfig, rowsPerGroup: newRows});
                              }}
                              className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-center font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`p-6 rounded-3xl border flex items-start gap-4 ${
                      seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length 
                        ? 'bg-red-50 border-red-100 text-red-600' 
                        : 'bg-sky-50 border-sky-100 text-sky-700'
                    }`}>
                      <AlertTriangle size={24} className="mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold">Kapasite Durumu</h4>
                        <p className="text-sm mt-1">
                          Oluşturulan toplam sıra kapasitesi <span className="font-black">{seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow}</span> kişidir. 
                          Sınıf listenizdeki <span className="font-black">{students.length}</span> öğrenciden {Math.min(students.length, seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow)} tanesi yerleştirilecek.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {randomPlacementStep === 3 && (
                  <div className="space-y-8">
                    <div className="p-6 bg-white border border-neutral-100 rounded-3xl space-y-6">
                      <h3 className="font-bold text-neutral-800">Genel Kurallar</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-neutral-700">Kız-Erkek Karışık Otursun</h4>
                          <p className="text-xs text-neutral-400">Etkinse, farklı cinsiyetler yan yana oturabilir.</p>
                        </div>
                        <button 
                          onClick={() => setRandomRules({...randomRules, mixedGender: !randomRules.mixedGender})}
                          className={`w-14 h-8 rounded-full transition-all relative ${
                            randomRules.mixedGender ? 'bg-sky-500' : 'bg-neutral-200'
                          }`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                            randomRules.mixedGender ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    </div>

                    <div className={`p-6 bg-white border border-neutral-100 rounded-3xl space-y-6 ${!referencePlan ? 'opacity-50' : ''}`}>
                      <h3 className="font-bold text-neutral-800">Önceki Yerleştirmeye Göre Kurallar</h3>
                      {!referencePlan && (
                        <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center gap-3 text-neutral-500 text-sm">
                          <AlertTriangle size={18} />
                          Bu kurallar sadece bir önceki oturma planı yüklendiyse uygulanır.
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {[
                          { key: 'diffGroup', label: 'Her öğrenci farklı gruba yerleştirilsin.' },
                          { key: 'diffRow', label: 'Her öğrenci farklı sırada otursun.' },
                          { key: 'diffPartner', label: 'Her öğrenci farklı kişi ile otursun.' }
                        ].map((rule) => (
                          <div key={rule.key} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-600">{rule.label}</span>
                            <button 
                              disabled={!referencePlan}
                              onClick={() => setRandomRules({...randomRules, [rule.key]: !randomRules[rule.key as keyof typeof randomRules]})}
                              className={`w-12 h-6 rounded-full transition-all relative ${
                                randomRules[rule.key as keyof typeof randomRules] ? 'bg-sky-500' : 'bg-neutral-200'
                              } ${!referencePlan ? 'cursor-not-allowed' : ''}`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                                randomRules[rule.key as keyof typeof randomRules] ? 'left-6.5' : 'left-0.5'
                              }`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-white border border-neutral-100 rounded-3xl space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-neutral-800">Sabit Öğrenciler</h3>
                          <p className="text-xs text-neutral-400">Yeri değişmeyecek öğrencileri belirleyin.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">Öğrenci Seçin</label>
                            <select 
                              value={fixedStudentForm.studentId}
                              onChange={(e) => setFixedStudentForm({...fixedStudentForm, studentId: e.target.value})}
                              className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-sky-500/20 outline-none"
                            >
                              <option value="">Öğrenci Seçin...</option>
                              {students
                                .filter(s => !Object.keys(fixedStudents).includes(s.id))
                                .map(s => (
                                  <option key={s.id} value={s.id}>({s.studentNo}) {s.name}</option>
                                ))
                              }
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">Grup</label>
                              <select 
                                value={fixedStudentForm.group}
                                onChange={(e) => setFixedStudentForm({...fixedStudentForm, group: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-sky-500/20 outline-none"
                              >
                                {Array.from({ length: seatingConfig.groupCount }).map((_, i) => (
                                  <option key={i} value={i}>{i + 1}. Grup</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">Sıra</label>
                              <select 
                                value={fixedStudentForm.row}
                                onChange={(e) => setFixedStudentForm({...fixedStudentForm, row: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-sky-500/20 outline-none"
                              >
                                {Array.from({ length: seatingConfig.rowsPerGroup[fixedStudentForm.group] || 0 }).map((_, i) => (
                                  <option key={i} value={i}>{i + 1}. Sıra</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">Koltuk</label>
                              <select 
                                value={fixedStudentForm.seat}
                                onChange={(e) => setFixedStudentForm({...fixedStudentForm, seat: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-sky-500/20 outline-none"
                              >
                                {Array.from({ length: seatingConfig.peoplePerRow }).map((_, i) => (
                                  <option key={i} value={i}>{i + 1}. Koltuk</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (!fixedStudentForm.studentId) return;
                            const seatId = `g${fixedStudentForm.group}-r${fixedStudentForm.row}-s${fixedStudentForm.seat}`;
                            // Check if seat is already taken
                            if (Object.values(fixedStudents).includes(seatId)) {
                              showAlert('Bu koltuk zaten başka bir öğrenciye ayrılmış!', 'Koltuk Dolu');
                              return;
                            }
                            setFixedStudents({...fixedStudents, [fixedStudentForm.studentId]: seatId});
                            setFixedStudentForm({...fixedStudentForm, studentId: ''});
                          }}
                          disabled={!fixedStudentForm.studentId}
                          className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          Öğrenciyi Sabitle
                        </button>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">Sabitlenmiş Öğrenciler ({Object.keys(fixedStudents).length})</h4>
                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {Object.entries(fixedStudents).map(([studentId, seatId]) => {
                            const sId = studentId as string;
                            const stId = seatId as string;
                            const student = students.find(s => s.id === sId);
                            if (!student) return null;
                            const match = stId.match(/g(\d+)-r(\d+)-s(\d+)/);
                            const group = match ? parseInt(match[1]) + 1 : '?';
                            const row = match ? parseInt(match[2]) + 1 : '?';
                            const seat = match ? parseInt(match[3]) + 1 : '?';

                            return (
                              <div key={studentId} className="flex items-center justify-between p-3 bg-white border border-neutral-100 rounded-2xl group hover:border-sky-200 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    student.gender === 'Kız' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'
                                  }`}>
                                    {student.studentNo}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-neutral-800">{student.name}</p>
                                    <p className="text-[10px] text-neutral-400 font-medium">
                                      {group}. Grup, {row}. Sıra, {seat}. Koltuk
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    const newFixed = {...fixedStudents};
                                    delete newFixed[studentId];
                                    setFixedStudents(newFixed);
                                  }}
                                  className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })}
                          {Object.keys(fixedStudents).length === 0 && (
                            <div className="py-8 text-center text-neutral-400 text-sm italic border-2 border-dashed border-neutral-100 rounded-2xl">
                              Henüz sabitlenmiş öğrenci yok.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {randomPlacementStep === 4 && (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-neutral-800">Öncelikli Öğrenciler</h3>
                      <p className="text-sm text-neutral-400">
                        Ön sıralara yerleştirilmesini istediğiniz öğrencileri seçin. Bu öğrenciler 1. sıralardan başlayarak yatay olarak yerleştirilecektir.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {students.map((student) => (
                        <button 
                          key={student.id}
                          onClick={() => togglePriorityStudent(student.id)}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${
                            priorityStudents.includes(student.id)
                              ? 'bg-sky-50 border-sky-500 text-sky-700'
                              : 'bg-white border-neutral-50 text-neutral-600 hover:border-neutral-200'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            priorityStudents.includes(student.id)
                              ? 'bg-sky-500 border-sky-500 text-white'
                              : 'border-neutral-200'
                          }`}>
                            {priorityStudents.includes(student.id) && <CheckCircle2 size={14} />}
                          </div>
                          <span className="font-bold">({student.studentNo}) {student.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {randomPlacementStep === 5 && (
                  <div className="space-y-8 text-center py-12">
                    <div className="w-24 h-24 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Shuffle size={48} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-neutral-900">Hazır mısınız?</h3>
                      <p className="text-neutral-500 max-w-md mx-auto">
                        Tüm kurallar belirlendi. <span className="font-bold">{priorityStudents.length}</span> öncelikli öğrenci ve <span className="font-bold">{Object.keys(fixedStudents).length}</span> sabit öğrenci ile rastgele yerleştirme başlatılacak.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
                <button 
                  onClick={() => setIsRandomPlacementModalOpen(false)}
                  className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-700 transition-colors"
                >
                  İptal
                </button>
                
                <div className="flex gap-4">
                  {randomPlacementStep > 1 && (
                    <button 
                      onClick={() => setRandomPlacementStep(prev => (prev - 1) as any)}
                      className="px-8 py-3 bg-white border border-neutral-200 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-50 transition-all flex items-center gap-2"
                    >
                      <ArrowLeft size={18} />
                      Geri
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (randomPlacementStep < 5) {
                        setRandomPlacementStep(prev => (prev + 1) as any);
                      } else {
                        handleRandomPlacement();
                      }
                    }}
                    disabled={
                      randomPlacementStep === 2 && 
                      seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                    }
                    className={`px-10 py-3 rounded-2xl font-black transition-all shadow-lg flex items-center gap-2 ${
                      randomPlacementStep === 2 && 
                      seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-100'
                    }`}
                  >
                    {randomPlacementStep === 1 && !referencePlan ? 'Bu Adımı Atla' : 
                     randomPlacementStep === 5 ? 'Planı Oluştur' : 'İleri'}
                    {randomPlacementStep === 5 ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Manual Placement Configuration Modal */}
        {isManualPlacementModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManualPlacementModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar focus:outline-none"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">
                      Elle Yerleştirme İçin Sınıf Düzeni
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                      Yeni bir sınıf düzeni oluşturun veya düzenlemek için mevcut bir planı yükleyin.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsManualPlacementModalOpen(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700 ml-1">Grup Sayısı</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          min="1"
                          max="6"
                          value={seatingConfig.groupCount}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 1;
                            const newRows = [...seatingConfig.rowsPerGroup];
                            if (count > newRows.length) {
                              for (let i = newRows.length; i < count; i++) newRows.push(5);
                            } else {
                              newRows.splice(count);
                            }
                            setSeatingConfig({...seatingConfig, groupCount: count, rowsPerGroup: newRows});
                          }}
                          className="w-full px-5 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-lg text-sky-600"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col text-neutral-400">
                          <button onClick={() => {
                            const count = Math.min(6, seatingConfig.groupCount + 1);
                            const newRows = [...seatingConfig.rowsPerGroup];
                            if (count > newRows.length) {
                              for (let i = newRows.length; i < count; i++) newRows.push(5);
                            }
                            setSeatingConfig({...seatingConfig, groupCount: count, rowsPerGroup: newRows});
                          }}><ChevronDown className="rotate-180" size={16} /></button>
                          <button onClick={() => {
                            const count = Math.max(1, seatingConfig.groupCount - 1);
                            const newRows = seatingConfig.rowsPerGroup.slice(0, count);
                            setSeatingConfig({...seatingConfig, groupCount: count, rowsPerGroup: newRows});
                          }}><ChevronDown size={16} /></button>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400 ml-1">Sıra gruplarının sayısı.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700 ml-1">Sıradaki Kişi Sayısı</label>
                      <input 
                        type="number" 
                        min="1"
                        max="4"
                        value={seatingConfig.peoplePerRow}
                        onChange={(e) => setSeatingConfig({...seatingConfig, peoplePerRow: parseInt(e.target.value) || 1})}
                        className="w-full px-5 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-lg text-center"
                      />
                      <p className="text-[10px] text-neutral-400 ml-1 text-center">Her sıraya kaç kişi oturacak?</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-700 ml-1">Gruptaki Sıra Sayısı</h3>
                      <p className="text-[10px] text-neutral-400 ml-1 mt-0.5">Her gruptaki sıra adedini belirtin.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {seatingConfig.rowsPerGroup.map((rows, idx) => (
                        <div key={idx} className="space-y-1.5 flex-1 min-w-[100px]">
                          <label className="text-[10px] font-bold text-neutral-500 ml-1">Grup {idx + 1}</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              min="1"
                              max="10"
                              value={rows}
                              onChange={(e) => {
                                const newRows = [...seatingConfig.rowsPerGroup];
                                newRows[idx] = parseInt(e.target.value) || 1;
                                setSeatingConfig({...seatingConfig, rowsPerGroup: newRows});
                              }}
                              className="w-full px-3 py-2.5 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-sky-500 outline-none transition-all font-bold text-center text-sm"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col text-neutral-400">
                              <button onClick={() => {
                                const newRows = [...seatingConfig.rowsPerGroup];
                                newRows[idx] = Math.min(10, newRows[idx] + 1);
                                setSeatingConfig({...seatingConfig, rowsPerGroup: newRows});
                              }}><ChevronDown className="rotate-180" size={10} /></button>
                              <button onClick={() => {
                                const newRows = [...seatingConfig.rowsPerGroup];
                                newRows[idx] = Math.max(1, newRows[idx] - 1);
                                setSeatingConfig({...seatingConfig, rowsPerGroup: newRows});
                              }}><ChevronDown size={10} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl flex items-start gap-4 transition-colors ${
                    seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                      ? 'bg-red-50 border border-red-100'
                      : 'bg-neutral-50 border border-neutral-100'
                  }`}>
                    <div className={`p-2 rounded-lg border shrink-0 transition-colors ${
                      seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                        ? 'bg-white text-red-500 border-red-100'
                        : 'bg-white text-neutral-400 border-neutral-100'
                    }`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold transition-colors ${
                        seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                          ? 'text-red-900'
                          : 'text-neutral-900'
                      }`}>Kapasite Durumu</h4>
                      <p className={`text-[11px] mt-0.5 leading-relaxed transition-colors ${
                        seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                          ? 'text-red-600'
                          : 'text-neutral-600'
                      }`}>
                        Oluşturulan toplam sıra kapasitesi <span className={`font-bold ${
                          seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                            ? 'text-red-900'
                            : 'text-neutral-900'
                        }`}>{seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow}</span> kişidir. 
                        Sınıf listenizdeki <span className={`font-bold ${
                          seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                            ? 'text-red-900'
                            : 'text-neutral-900'
                        }`}>{students.length}</span> öğrenciden <span className={`font-bold ${
                          seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                            ? 'text-red-900'
                            : 'text-neutral-900'
                        }`}>{Math.min(students.length, seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow)}</span> tanesi yerleştirilecek.
                        {seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length && (
                          <span className="block mt-1 font-bold text-red-700">⚠️ Kapasite yetersiz! Lütfen sıra sayısını artırın.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 flex flex-col items-center gap-4">
                    <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">veya</span>
                    
                    <div className="w-full">
                      <p className="text-center text-sm font-bold text-neutral-700 mb-3">Mevcut Planı Düzenle</p>
                      <button 
                        onClick={() => document.getElementById('config-import-input')?.click()}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all text-sm"
                      >
                        <Upload size={18} />
                        Plan Yükle (.json)
                      </button>
                      <input 
                        type="file"
                        id="config-import-input"
                        accept=".json"
                        onChange={handleConfigImport}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                  <div className="flex justify-end gap-4 mt-6">
                    <button 
                      onClick={() => setIsManualPlacementModalOpen(false)}
                      className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-700 transition-colors text-sm"
                    >
                      İptal
                    </button>
                    <button 
                      disabled={seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length}
                      onClick={async () => {
                        setIsManualPlacementModalOpen(false);
                        setIsPlacementScreenOpen(true);
                        if (user) {
                          const seatingConfigRef = doc(db, `users/${user.uid}/config/seating`);
                          await setDoc(seatingConfigRef, { ...seatingConfig, updatedAt: serverTimestamp() })
                            .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/config/seating`));
                        }
                      }}
                      className={`px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 text-sm ${
                        seatingConfig.rowsPerGroup.reduce((a, b) => a + b, 0) * seatingConfig.peoplePerRow < students.length
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                          : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-100'
                      }`}
                    >
                      Yerleştirme Ekranını Aç
                    </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Yeni Kitap Ekle Modalı */}
        <AnimatePresence>
          {isAddBookModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Yeni Kitap Ekle</h2>
                      <p className="text-sm text-neutral-400 font-medium mt-1">Kitaplığınıza yeni bir kitap ekleyin.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddBookModalOpen(false)}
                      className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400"
                    >
                      <X size={24} />
                    </button>
                  </div>

                    <form onSubmit={handleSaveBook} className="space-y-6">
                      <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-neutral-700 ml-1">Kitap Adı</label>
                        <div className="relative">
                          <input
                            required
                            type="text"
                            value={bookForm.name}
                            onChange={(e) => {
                              setBookForm({ ...bookForm, name: e.target.value });
                              setSelectedExistingBook(null);
                              setShowBookSuggestions(true);
                            }}
                            onFocus={() => setShowBookSuggestions(true)}
                            placeholder="Örn: Küçük Prens"
                            className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-neutral-900 placeholder:text-neutral-300"
                          />
                          
                          <AnimatePresence>
                            {showBookSuggestions && bookSuggestions.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-[210] overflow-hidden"
                              >
                                <div className="p-1.5">
                                  {bookSuggestions.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        setBookForm({
                                          ...bookForm,
                                          name: b.name,
                                          author: b.author || '',
                                          pageCount: b.pageCount?.toString() || ''
                                        });
                                        setSelectedExistingBook(b);
                                        setShowBookSuggestions(false);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-neutral-50 rounded-xl transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="font-bold text-neutral-900 text-sm">{b.name}</div>
                                          <div className="text-xs text-neutral-400">{b.author || 'Yazar Belirtilmemiş'}</div>
                                        </div>
                                        <div className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                          b.currentStudentId ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                          {b.currentStudentId ? 'Öğrencide' : 'Rafta'}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {selectedExistingBook && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 mt-2"
                          >
                            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-amber-800">Bu kitap zaten kitaplığınızda kayıtlı.</p>
                              <p className="text-[10px] text-amber-600 font-medium">
                                {selectedExistingBook.currentStudentId 
                                  ? `Şu an ${selectedExistingBook.currentStudentName} isimli öğrencide bulunuyor.` 
                                  : "Şu an rafta bulunuyor. Seçtiğiniz öğrenciye atayabilirsiniz."}
                              </p>
                            </div>
                          </motion.div>
                        )}
                        
                        {showBookSuggestions && (
                          <div 
                            className="fixed inset-0 z-[205]" 
                            onClick={() => setShowBookSuggestions(false)}
                          />
                        )}
                      </div>
  
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 ml-1">Yazar (İsteğe Bağlı)</label>
                        <input
                          type="text"
                          value={bookForm.author}
                          onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                          placeholder="Örn: Antoine de Saint-Exupéry"
                          className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-neutral-900 placeholder:text-neutral-300"
                        />
                      </div>
  
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 ml-1">Sayfa Sayısı (İsteğe Bağlı)</label>
                        <input
                          type="number"
                          value={bookForm.pageCount}
                          onChange={(e) => setBookForm({ ...bookForm, pageCount: e.target.value })}
                          placeholder="Örn: 96"
                          className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-neutral-900 placeholder:text-neutral-300"
                        />
                      </div>
  
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 ml-1">Öğrenciye Ata (İsteğe Bağlı)</label>
                        <select
                          value={bookForm.assignToStudentId}
                          onChange={(e) => setBookForm({ ...bookForm, assignToStudentId: e.target.value })}
                          className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-bold text-neutral-600 text-sm"
                        >
                          <option value="">Seçim Yapılmadı</option>
                          {students.map(student => (
                            <option key={student.id} value={student.id}>
                              ({student.studentNo}) {student.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-neutral-400 font-medium ml-1 italic">* Eğer öğrenci seçerseniz, kitap eklendikten sonra otomatik olarak o öğrenciye atanacaktır.</p>
                      </div>
  
                      <div className="flex gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddBookModalOpen(false);
                            setSelectedExistingBook(null);
                            setShowBookSuggestions(false);
                          }}
                          className="flex-1 px-6 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all active:scale-95"
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
                            selectedExistingBook 
                              ? 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600' 
                              : 'bg-sky-600 text-white shadow-sky-100 hover:bg-sky-700'
                          }`}
                        >
                          {selectedExistingBook ? 'Giriş Yap / Ata' : 'Ekle'}
                        </button>
                      </div>
                    </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Kitap Düzenle Modalı */}
        <AnimatePresence>
          {isEditBookModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Kitabı Düzenle</h2>
                      <p className="text-sm text-neutral-400 font-medium mt-1">Kitap bilgilerini güncelleyin.</p>
                    </div>
                    <button 
                      onClick={() => setIsEditBookModalOpen(false)}
                      className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateBook} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700 ml-1">Kitap Adı</label>
                      <input
                        required
                        type="text"
                        value={bookForm.name}
                        onChange={(e) => setBookForm({ ...bookForm, name: e.target.value })}
                        placeholder="Örn: Küçük Prens"
                        className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-neutral-900 placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700 ml-1">Yazar (İsteğe Bağlı)</label>
                      <input
                        type="text"
                        value={bookForm.author}
                        onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                        placeholder="Örn: Antoine de Saint-Exupéry"
                        className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-neutral-900 placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700 ml-1">Sayfa Sayısı (İsteğe Bağlı)</label>
                      <input
                        type="number"
                        value={bookForm.pageCount}
                        onChange={(e) => setBookForm({ ...bookForm, pageCount: e.target.value })}
                        placeholder="Örn: 96"
                        className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-neutral-900 placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditBookModalOpen(false)}
                        className="flex-1 px-6 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all active:scale-95"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-4 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95"
                      >
                        Güncelle
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Kitap Silme Onay Modalı */}
        <AnimatePresence>
          {isDeleteBookConfirmOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
                      <Trash2 size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Kitabı Sil</h2>
                      <p className="text-neutral-500 font-medium mt-2">
                        <span className="font-bold text-neutral-900">"{editingBook?.name}"</span> kitabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={() => setIsDeleteBookConfirmOpen(false)}
                      className="flex-1 px-6 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all active:scale-95"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleDeleteBook}
                      className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95"
                    >
                      Evet, Sil
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ManualPlacementScreen
          isOpen={isPlacementScreenOpen}
          onClose={() => setIsPlacementScreenOpen(false)}
          students={students}
          config={seatingConfig}
          seatingPlan={seatingPlan}
          teacherProfile={teacherProfile}
          onSave={async (plan) => {
            setSeatingPlan(plan);
            setIsPlacementScreenOpen(false);
            if (user) {
              const seatingPlanRef = doc(db, `users/${user.uid}/config/seatingPlan`);
              await setDoc(seatingPlanRef, { plan, updatedAt: serverTimestamp() })
                .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/config/seatingPlan`));
            }
          }}
        />

        <AnimatePresence>
          {isTournamentFixtureOpen && viewingTournament && (
            <TournamentFixtureScreen
              tournament={tournaments.find(t => t.id === viewingTournament.id) || viewingTournament}
              students={students}
              onClose={() => {
                setIsTournamentFixtureOpen(false);
                setViewingTournament(null);
              }}
              user={user}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {customAlert.isOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4 text-neutral-900 dark:text-white">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="p-8">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className={`p-4 rounded-full ${
                      customAlert.type === 'error' ? 'bg-rose-50 text-rose-600' :
                      customAlert.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                      customAlert.type === 'info' ? 'bg-sky-50 text-sky-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {customAlert.type === 'error' ? <AlertCircle size={32} /> :
                       customAlert.type === 'success' ? <CheckCircle2 size={32} /> :
                       customAlert.type === 'info' ? <Info size={32} /> :
                       <AlertTriangle size={32} />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{customAlert.title}</h2>
                      <p className="text-neutral-500 font-medium mt-2 leading-relaxed">
                        {customAlert.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={() => setCustomAlert({ ...customAlert, isOpen: false })}
                      className={`w-full px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${
                        customAlert.type === 'error' ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100' :
                        customAlert.type === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' :
                        customAlert.type === 'info' ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-100' :
                        'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100'
                      }`}
                    >
                      Tamam
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 mt-12 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          
          {/* Copyright */}
          <div className="flex-1 flex justify-center md:justify-start text-neutral-400 text-xs font-bold text-center md:text-left">
            &copy; {new Date().getFullYear()} Cihan Öğretmen.<br className="hidden md:block" />Tüm hakları saklıdır.
          </div>

          {/* Social */}
          <div className="flex-1 flex justify-center">
            <a href="https://www.instagram.com/cihan.ogretmen/" target="_blank" rel="noopener noreferrer" className="p-4 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:scale-110 transition-all rounded-2xl shadow-sm">
              <Instagram size={24} />
            </a>
          </div>

          {/* Contact Column */}
          <div className="flex-1 flex justify-center md:justify-end">
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setActiveTab('user-messages');
              }}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95 uppercase tracking-widest"
            >
              <MessageCircle size={24} />
              <span>İletişim</span>
            </button>
          </div>
          
        </div>
      </footer>
    </div>
  );
}
