import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  ChevronDown, 
  Star, 
  BookOpen, 
  Trophy, 
  Calendar,
  ChevronRight,
  Medal,
  Target,
  History,
  BookMarked,
  ArrowRight,
  Award,
  Clock,
  School,
  Sparkles,
  X,
  Bell,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, where, getDoc, getDocs } from 'firebase/firestore';
import { ParentProfileSetup } from './ParentProfileSetup';
import { LESSONS } from '../constants';
import { auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface MyStudentsPageProps {
  linkedStudents: any[];
  allStudents: any[];
  seatingPlan: { [key: string]: string };
  teacherProfile: any;
  readingRecords: any[];
  tournaments: any[];
  scheduleConfig: any;
  scheduleData: any;
  subjects: any[];
  cities: any[];
  districts: any[];
  schools: any[];
  onLoadCities: () => void;
  onLoadDistricts: (cityName: string) => void;
  onLoadSchools: (cityName: string, districtName: string) => void;
  isLoadingCities: boolean;
  isLoadingDistricts: boolean;
  isLoadingSchools: boolean;
  savedChildren?: any[];
  onSaveProfile: (children: any[]) => void;
  onDeleteProfile?: () => void;
  unreadAnnouncementsCount?: number;
  onTabChange?: (tab: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Hayat Bilgisi Yıldızı': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Hayat Bilgisi': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Sosyal Bilgiler Yıldızı': 'bg-orange-50 text-orange-600 border-orange-100',
  'Sosyal Bilgiler': 'bg-orange-50 text-orange-600 border-orange-100',
  'Fen Bilimleri Yıldızı': 'bg-sky-50 text-sky-600 border-sky-100',
  'Fen Bilimleri': 'bg-sky-50 text-sky-600 border-sky-100',
  'Fen': 'bg-sky-50 text-sky-600 border-sky-100',
  'Matematik Yıldızı': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Matematik': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Türkçe Yıldızı': 'bg-rose-50 text-rose-600 border-rose-100',
  'Türkçe': 'bg-rose-50 text-rose-600 border-rose-100',
  'İngilizce Yıldızı': 'bg-pink-50 text-pink-600 border-pink-100',
  'İngilizce': 'bg-pink-50 text-pink-600 border-pink-100',
  'Görsel Sanatlar Yıldızı': 'bg-pink-50 text-pink-600 border-pink-100',
  'Müzik Yıldızı': 'bg-purple-50 text-purple-600 border-purple-100',
  'Beden Eğitimi Yıldızı': 'bg-teal-50 text-teal-600 border-teal-100',
  'Kitap Kurdu Yıldızı': 'bg-amber-50 text-amber-600 border-amber-100',
  'Sorumluluk Sahibi Öğrenci Yıldızı': 'bg-blue-50 text-blue-600 border-blue-100',
  'Yardımsever Öğrenci Yıldızı': 'bg-green-50 text-green-600 border-green-100',
  'Temiz ve Düzenli Öğrenci Yıldızı': 'bg-cyan-50 text-cyan-600 border-cyan-100',
  'Nazik Öğrenci Yıldızı': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
  'Azimli Öğrenci Yıldızı': 'bg-violet-50 text-violet-600 border-violet-100',
  'İşbirlikçi Öğrenci Yıldızı': 'bg-lime-50 text-lime-600 border-lime-100',
  'Öğretmen Özel Ödülü Yıldızı': 'bg-red-50 text-red-600 border-red-100',
  'Özel Ödül': 'bg-red-50 text-red-600 border-red-100'
};

const StudentAccordion: React.FC<{
  student: any;
  isOpen: boolean;
  onToggle: () => void;
  allStudents: any[];
}> = ({ 
  student, 
  isOpen, 
  onToggle,
  allStudents
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Local state for real-time updates for this specific student
  const [localStudent, setLocalStudent] = useState(student);
  const [localReadingRecords, setLocalReadingRecords] = useState<any[]>([]);
  const [localTournaments, setLocalTournaments] = useState<any[]>([]);
  const [localScheduleConfig, setLocalScheduleConfig] = useState<any>(null);
  const [localScheduleData, setLocalScheduleData] = useState<any>({ slots: {} });
  const [localSubjects, setLocalSubjects] = useState<any[]>([]);
  const [localSeatingPlan, setLocalSeatingPlan] = useState<any>({});
  const [localSeatingConfig, setLocalSeatingConfig] = useState<any>(null);
  const [localAllStudents, setLocalAllStudents] = useState<any[]>([]);

  const [localExams, setLocalExams] = useState<any[]>([]);
  const [localExamResults, setLocalExamResults] = useState<any[]>([]);
  const [classExamResults, setClassExamResults] = useState<Record<string, any[]>>({});


  const [localTeacherProfile, setLocalTeacherProfile] = useState<any>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(student.teacherUid || null);
  const [tournamentMatches, setTournamentMatches] = useState<Record<string, any[]>>({});

  const getSeatingPositionText = (studentId: string) => {
    const entry = Object.entries(localSeatingPlan).find(([_, id]) => id === studentId);
    if (!entry) return 'Belirlenmemiş';

    const match = entry[0].match(/g(\d+)-r(\d+)-s(\d+)/);
    if (!match) return 'Belirlenmemiş';

    const groupIdx = parseInt(match[1], 10);
    const rowIdx = parseInt(match[2], 10);
    const colIdx = parseInt(match[3], 10);

    const groupText = `${groupIdx + 1}. Grup`;
    const rowText = `${rowIdx + 1}. Sıra`;

    let colText = '';
    const peoplePerRow = localSeatingConfig?.peoplePerRow || 2;
    if (peoplePerRow === 2) {
      colText = colIdx === 0 ? 'Sol' : 'Sağ';
    } else if (peoplePerRow === 3) {
      if (colIdx === 0) colText = 'Sol';
      else if (colIdx === 1) colText = 'Orta';
      else colText = 'Sağ';
    } else {
      colText = `Soldan ${colIdx + 1}.`;
    }

    return `${groupText} / ${rowText} / ${colText}`;
  };

  useEffect(() => {
    if (teacherUid) return;

    // Fallback: Find teacher by school, grade, and section
    const fetchTeacherFallback = async () => {
      if (!student.school || !student.grade || !student.section) return;
      try {
        const q = query(
          collection(db, 'users'),
          where('profileType', '==', 'ÖĞRETMEN'),
          where('schoolName', '==', student.school),
          where('gradeLevel', '==', student.grade),
          where('section', '==', student.section)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const teacherDoc = snapshot.docs[0];
          setTeacherUid(teacherDoc.id);
          setLocalTeacherProfile({ id: teacherDoc.id, ...teacherDoc.data() });
        }
      } catch (err) {
        console.warn("Could not find teacher by school/grade/section", err);
      }
    };

    fetchTeacherFallback();
  }, [student.school, student.grade, student.section, teacherUid]);

  const getCorrectedAmount = (star: any) => {
    if (star.amount !== undefined) return Number(star.amount);
    if (star.category === 'Kitap Kurdu Yıldızı' && star.description) {
      const match = star.description.match(/\((\d+)\s*Sayfa\)/i);
      if (match) {
        return Math.ceil(parseInt(match[1]) / 10);
      }
    }
    return 1;
  };

  const starSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    const categoryMap: Record<string, string> = {
      'Matematik': 'Matematik Yıldızı',
      'Fen Bilimleri': 'Fen Bilimleri Yıldızı',
      'Fen': 'Fen Bilimleri Yıldızı',
      'Hayat Bilgisi': 'Hayat Bilgisi Yıldızı',
      'Türkçe': 'Türkçe Yıldızı',
      'Sosyal Bilgiler': 'Sosyal Bilgiler Yıldızı',
      'İngilizce': 'İngilizce Yıldızı',
      'Özel Ödül': 'Öğretmen Özel Ödülü Yıldızı'
    };

    localStudent.starHistory?.forEach((star: any) => {
      let cat = star.category;
      if (categoryMap[cat]) cat = categoryMap[cat];
      else if (cat && !cat.endsWith(' Yıldızı') && CATEGORY_COLORS[`${cat} Yıldızı`]) {
        cat = `${cat} Yıldızı`;
      }
      summary[cat] = (summary[cat] || 0) + getCorrectedAmount(star);
    });
    return summary;
  }, [localStudent.starHistory]);

  const totalPages = useMemo(() => {
    return localReadingRecords.reduce((sum, record) => sum + (Number(record.pageCount) || 0), 0);
  }, [localReadingRecords]);

  const studentTournaments = useMemo(() => {
    return localTournaments
      .filter(t => t.participants?.includes(student.id))
      .map(t => {
        const matches = tournamentMatches[t.id] || [];
        let status = 'Bekleniyor';
        
        if (t.type === 'Eleme' || (t.type === 'Grup+Eleme' && t.currentStage === 'knockout')) {
          const studentMatches = matches.filter(m => m.player1Id === student.id || m.player2Id === student.id);
          if (studentMatches.length > 0) {
            const lastMatch = [...studentMatches].sort((a, b) => b.round - a.round)[0];
            if (lastMatch.status === 'completed') {
              if (lastMatch.winnerId === student.id) {
                const nextRound = lastMatch.round + 1;
                status = `${nextRound}. Tur'a Yükseldi`;
                // Check if it was the final
                const roundMatches = matches.filter(m => m.round === lastMatch.round);
                if (roundMatches.length === 1) status = 'Şampiyon!';
              } else {
                status = `${lastMatch.round}. Tur'da Elendi`;
              }
            } else {
              status = `${lastMatch.round}. Tur'da Yarışıyor`;
            }
          }
        } else if (t.type === 'Lig' || t.type === 'Grup' || (t.type === 'Grup+Eleme' && t.currentStage !== 'knockout')) {
          // Simplified rank calculation
          const stats: Record<string, any> = {};
          const relevantMatches = matches.filter(m => m.status === 'completed');
          
          relevantMatches.forEach(m => {
            [m.player1Id, m.player2Id].forEach(id => {
              if (!stats[id]) stats[id] = { id, points: 0, wins: 0 };
            });
            
            if (m.winnerId) {
              stats[m.winnerId].points += (t.pointsWin || 3);
              stats[m.winnerId].wins += 1;
              const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
              stats[loserId].points += (t.pointsLoss || 0);
            } else {
              stats[m.player1Id].points += (t.pointsDraw || 1);
              stats[m.player2Id].points += (t.pointsDraw || 1);
            }
          });
          
          const sorted = Object.values(stats).sort((a, b) => b.points - a.points || b.wins - a.wins);
          const rank = sorted.findIndex(s => s.id === student.id) + 1;
          if (rank > 0) status = `${rank}. Sırada`;
        }
        
        return { ...t, studentStatus: status };
      });
  }, [localTournaments, student.id, tournamentMatches]);

  const generateTimeSlots = (config: any) => {
    const slots = [];
    if (!config) return slots;
    let currentTime = config.startTime;

    const addMinutes = (time: string, minutes: number) => {
      const [h, m] = time.split(':').map(Number);
      const totalMinutes = h * 60 + m + minutes;
      const newH = Math.floor(totalMinutes / 60) % 24;
      const newM = totalMinutes % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    };

    for (let i = 1; i <= config.lessonCount; i++) {
      const lessonEnd = addMinutes(currentTime, config.lessonDuration);
      slots.push({
        type: 'lesson',
        number: i,
        start: currentTime,
        end: lessonEnd
      });

      if (i < config.lessonCount) {
        const isLunchBreak = i === config.lunchBreakAfterLesson;
        const breakDuration = isLunchBreak ? config.lunchBreakDuration : (config.customRecessDurations?.[i] || config.recessDuration);
        const breakEnd = addMinutes(lessonEnd, breakDuration);
        slots.push({
          type: isLunchBreak ? 'lunch' : 'recess',
          number: i,
          start: lessonEnd,
          end: breakEnd
        });
        currentTime = breakEnd;
      }
    }
    return slots;
  };

  // Calculate accurate total stars from history
  const totalStars = useMemo(() => {
    const student = localStudent;
    if (!student || !student.starHistory) return 0;
    
    return student.starHistory.reduce((sum: number, star: any) => {
      return sum + getCorrectedAmount(star);
    }, 0);
  }, [localStudent.starHistory]);

  const totalFinishedBooks = useMemo(() => {
    return localReadingRecords.filter(r => r.endDate).length;
  }, [localReadingRecords]);

  // Fetch class averages
  const [classTotalBooks, setClassTotalBooks] = useState(0);

  const classAverages = useMemo(() => {
    if (localAllStudents.length === 0) return { stars: '0.0', books: '0.0' };
    const classStars = localAllStudents.reduce((sum, s) => {
      const studentStars = (s.starHistory || []).reduce((sSum: number, star: any) => sSum + getCorrectedAmount(star), 0);
      return sum + studentStars;
    }, 0);
    return {
      stars: (classStars / localAllStudents.length).toFixed(1),
      books: (classTotalBooks / localAllStudents.length).toFixed(1)
    };
  }, [localAllStudents, classTotalBooks]);

  const timeSlots = useMemo(() => {
    if (!localScheduleConfig) return [];
    return generateTimeSlots(localScheduleConfig);
  }, [localScheduleConfig]);

  // Activity Log logic
  const activityLog = useMemo(() => {
    const activities: any[] = [];

    // Star activities
    localStudent.starHistory?.forEach((star: any) => {
      activities.push({
        type: 'star',
        title: 'Yıldız Kazanıldı',
        description: `${star.category}: ${star.description || ''}`,
        amount: star.amount || 1,
        timestamp: star.timestamp,
        icon: <Star className="text-amber-500" size={16} fill="currentColor" />
      });
    });

    // Reading activities
    localReadingRecords?.forEach((record: any) => {
      if (record.endDate) {
        activities.push({
          type: 'reading',
          title: 'Kitap Bitirildi',
          description: record.bookName,
          amount: record.pageCount,
          timestamp: record.endDate.seconds * 1000,
          icon: <BookOpen className="text-emerald-500" size={16} />
        });
      } else if (record.startDate) {
        activities.push({
          type: 'reading_start',
          title: 'Kitaba Başlandı',
          description: record.bookName,
          timestamp: record.startDate.seconds * 1000,
          icon: <BookMarked className="text-blue-500" size={16} />
        });
      }
    });

    // Tournament activities
    Object.values(tournamentMatches).flat().forEach((match: any) => {
      if (match.status === 'completed' && (match.player1Id === student.id || match.player2Id === student.id)) {
        const isWinner = match.winnerId === student.id;
        const tournament = localTournaments.find(t => t.id === match.tournamentId);
        activities.push({
          type: 'tournament',
          title: isWinner ? 'Turnuva Maçı Kazanıldı' : 'Turnuva Maçı Yapıldı',
          description: `${tournament?.name || 'Turnuva'} - ${match.round}. Tur`,
          timestamp: match.updatedAt?.seconds * 1000 || Date.now(),
          icon: <Trophy className={isWinner ? "text-rose-500" : "text-neutral-400"} size={16} />
        });
      }
    });

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [localStudent.starHistory, localReadingRecords, tournamentMatches, localTournaments, student.id]);

  const formatExamDate = (exam: any) => {
    if (exam?.date) return exam.date;
    
    // Try to extract date from title (e.g., "15.05.2024 Sınav" or "Sınav 15 Mayıs")
    const title = exam?.title || '';
    const dateRegex = /(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})|(\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık))/i;
    const match = title.match(dateRegex);
    if (match) return match[0];

    if (exam?.createdAt) {
      try {
        return new Date(exam.createdAt.toDate()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      } catch (e) {
        return 'Belirtilmemiş';
      }
    }
    return 'Belirtilmemiş';
  };

  // Group exam results by subject using localExams
  const subjectExams = useMemo<Record<string, { subject: any, exams: any[], results: any[], avg: number }>>(() => {
    const grouped: Record<string, { subject: any, exams: any[], results: any[], avg: number }> = {};
    
    // Find unique lessonIds in localExams
    const uniqueLessonIds = Array.from(new Set(localExams.map(e => e.lessonId).filter(Boolean)));
    
    uniqueLessonIds.forEach((lessonId) => {
      const lessonIdStr = lessonId as string;
      let subject = localSubjects.find(s => s.id === lessonIdStr);
      if (!subject) {
        // Fallback to LESSONS constant
        const genericLesson = LESSONS.find(l => l.id === lessonIdStr);
        if (genericLesson) {
          subject = { id: genericLesson.id, name: genericLesson.label };
        } else {
          // If still not found, create a fallback
          subject = { id: lessonIdStr, name: lessonIdStr.replace('lesson-', '').replace(/-/g, ' ').toUpperCase() };
        }
      }

      const subjectExamsList = localExams.filter(e => e.lessonId === lessonIdStr && (e.hasResults === true || e.status === 'graded'));
      const subjectResults = localExamResults.filter(r => subjectExamsList.some(e => e.id === r.examId));
      
      const validResults = subjectResults.filter(r => !r.isAbsent && typeof r.score === 'number');
      const avg = validResults.length > 0 
        ? Math.round(validResults.reduce((acc, r) => acc + r.score, 0) / validResults.length) 
        : 0;
        
      grouped[lessonIdStr] = {
        subject,
        exams: subjectExamsList,
        results: subjectResults,
        avg
      };
    });

    return grouped;
  }, [localSubjects, localExams, localExamResults]);

  useEffect(() => {
    if (!activeModal?.startsWith('exam-') || !teacherUid) return;
    
    const subjectId = activeModal.replace('exam-', '');
    const examsObj = subjectExams[subjectId];
    if (!examsObj || examsObj.exams.length === 0) return;
    
    const unsubs: any[] = [];

    // Fetch all results for these exams
    examsObj.exams.forEach((exam) => {
      // If already fetched and listening, we could skip, but simple approach is re-subscribe and clean up
      const q = query(collection(db, `users/${teacherUid}/exams/${exam.id}/results`));
      const unsub = onSnapshot(q, (snap) => {
        const resList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClassExamResults(prev => ({ ...prev, [exam.id]: resList }));
      }, (err) => {
        console.error("Class results fetch err", err);
      });
      unsubs.push(unsub);
    });
    
    return () => unsubs.forEach(u => u());
  }, [activeModal, teacherUid, subjectExams]);

  useEffect(() => {
    if (!teacherUid || !isOpen || !student?.id) return;

    // Fetch all reading records for the class to get average (only count finished ones)
    const unsubClassRecords = onSnapshot(collection(db, `users/${teacherUid}/readingRecords`), (snapshot) => {
      const finishedInClassCount = snapshot.docs.filter(d => d.data().endDate).length;
      setClassTotalBooks(finishedInClassCount);
    });

    // Fetch Teacher Profile (One-time)
    const fetchTeacher = async () => {
      try {
        const docSnap = await getDoc(doc(db, `users/${teacherUid}`));
        if (docSnap.exists()) {
          setLocalTeacherProfile({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.warn("Teacher fetch error:", err);
      }
    };
    fetchTeacher();

    // Fetch Student data (Real-time)
    const unsubStudent = onSnapshot(doc(db, `users/${teacherUid}/students/${student.id}`), (docSnap) => {
      if (docSnap.exists()) {
        setLocalStudent({ id: docSnap.id, ...docSnap.data() });
      }
    }, (err) => {
      console.warn("Student fetch error:", err);
    });

    // Fetch Reading Records (Real-time)
    const qReading = query(
      collection(db, `users/${teacherUid}/readingRecords`),
      where('studentId', '==', student.id)
    );
    const unsubReading = onSnapshot(qReading, (snapshot) => {
      setLocalReadingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Reading records fetch error:", err);
    });

    // Fetch Tournaments (Real-time)
    let matchUnsubs: any[] = [];
    const unsubTournaments = onSnapshot(collection(db, `users/${teacherUid}/tournaments`), (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setLocalTournaments(tournamentsData);
      
      // Clear old match listeners
      matchUnsubs.forEach(unsub => unsub());
      matchUnsubs = [];

      // Listen for matches for active tournaments
      for (const t of tournamentsData) {
        if (t.status === 'active' || t.participants?.includes(student.id)) {
          const unsubMatch = onSnapshot(collection(db, `users/${teacherUid}/tournaments/${t.id}/matches`), (matchSnap) => {
            setTournamentMatches(prev => ({
              ...prev,
              [t.id]: matchSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            }));
          });
          matchUnsubs.push(unsubMatch);
        }
      }
    }, (err) => {
      console.warn("Tournaments fetch error:", err);
    });

    // Fetch Schedule (Real-time)
    const unsubScheduleConfig = onSnapshot(doc(db, `users/${teacherUid}/config/schedule`), (snap) => {
      if (snap.exists()) setLocalScheduleConfig(snap.data());
    });
    
    const unsubScheduleData = onSnapshot(doc(db, `users/${teacherUid}/config/scheduleData`), (snap) => {
      if (snap.exists()) setLocalScheduleData(snap.data());
    });

    // Fetch Subjects (Real-time)
    const unsubSubjects = onSnapshot(collection(db, `users/${teacherUid}/subjects`), (snapshot) => {
      setLocalSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Seating (Real-time)
    const unsubSeatingPlan = onSnapshot(doc(db, `users/${teacherUid}/config/seatingPlan`), (snap) => {
      if (snap.exists()) setLocalSeatingPlan(snap.data().plan || {});
    });
    
    const unsubSeatingConfig = onSnapshot(doc(db, `users/${teacherUid}/config/seating`), (snap) => {
      if (snap.exists()) setLocalSeatingConfig(snap.data());
    });

    // Fetch All Students (Real-time for class count)
    const unsubAllStudents = onSnapshot(collection(db, `users/${teacherUid}/students`), (snapshot) => {
      setLocalAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let resultsUnsubs: any[] = [];
    
    const unsubExamsOuter = onSnapshot(collection(db, `users/${teacherUid}/exams`), (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocalExams(exams);
        
        // Clear previous listeners
        resultsUnsubs.forEach(unsub => unsub());
        resultsUnsubs = [];
        
        // Setup new listeners
        exams.forEach(exam => {
            const qRes = query(collection(db, `users/${teacherUid}/exams/${exam.id}/results`), where('studentId', '==', student.id));
            const unsub = onSnapshot(qRes, (resSnap) => {
                const results = resSnap.docs.map(d => ({ id: d.id, examId: exam.id, ...d.data() }));
                setLocalExamResults(prev => {
                    const filtered = prev.filter(r => r.examId !== exam.id);
                    return [...filtered, ...results];
                });
            });
            resultsUnsubs.push(unsub);
        });
    });

    return () => {
      unsubClassRecords();
      unsubStudent();
      unsubReading();
      unsubTournaments();
      unsubScheduleConfig();
      unsubScheduleData();
      unsubSubjects();
      unsubSeatingPlan();
      unsubSeatingConfig();
      unsubAllStudents();
      unsubExamsOuter();
      resultsUnsubs.forEach(unsub => unsub());
      matchUnsubs.forEach(unsub => unsub());
    };
  }, [student.id, teacherUid, isOpen]);

  return (
    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <button 
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
            student.gender === 'Erkek' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
          }`}>
            {student.name.charAt(0)}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">{student.name}</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              No: {student.studentNo} • {student.gradeLevel}-{student.section}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
              <Star size={14} className="text-amber-500" fill="currentColor" />
              <span className="text-sm font-black text-amber-700">{totalStars}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <BookOpen size={14} className="text-emerald-500" />
              <span className="text-sm font-black text-emerald-700">{localReadingRecords.length}</span>
            </div>
          </div>
          <ChevronDown size={20} className={`text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-50"
          >
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => setActiveModal('stars')}
                  className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] text-left group transition-all hover:shadow-lg hover:shadow-amber-100/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
                      <Star size={24} fill="currentColor" />
                    </div>
                    <ChevronRight size={20} className="text-amber-300" />
                  </div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Toplam Yıldız</p>
                  <p className="text-3xl font-black text-amber-700">{totalStars}</p>
                  <p className="text-[10px] font-bold text-amber-600/60 mt-1 uppercase tracking-wider">
                    Sınıf Ortalaması: <span className="font-black text-amber-700">{classAverages.stars}</span>
                  </p>
                </button>

                <button 
                  onClick={() => setActiveModal('reading')}
                  className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-left group transition-all hover:shadow-lg hover:shadow-emerald-100/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                      <BookOpen size={24} />
                    </div>
                    <ChevronRight size={20} className="text-emerald-300" />
                  </div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Kitap Okuma</p>
                  <p className="text-3xl font-black text-emerald-700">{totalFinishedBooks} <span className="text-sm">Kitap</span></p>
                  <p className="text-[10px] font-bold text-emerald-600/60 mt-1 uppercase tracking-wider">
                    Sınıf Ortalaması: <span className="font-black text-emerald-700">{classAverages.books}</span>
                  </p>
                </button>

                <button 
                  onClick={() => setActiveModal('tournaments')}
                  className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-left group transition-all hover:shadow-lg hover:shadow-rose-100/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 transition-transform">
                      <Trophy size={24} />
                    </div>
                    <ChevronRight size={20} className="text-rose-300" />
                  </div>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Turnuvalar</p>
                  <p className="text-3xl font-black text-rose-700">{studentTournaments.length} <span className="text-sm">Katılım</span></p>
                </button>

                <button 
                  onClick={() => setActiveModal('schedule')}
                  className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] text-left group transition-all hover:shadow-lg hover:shadow-indigo-100/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                      <Calendar size={24} />
                    </div>
                    <ChevronRight size={20} className="text-indigo-300" />
                  </div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Ders Programı</p>
                  <p className="text-xl font-black text-indigo-700">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </button>
              </div>

              {/* Sınav Başarıları Section */}
              {(Object.values(subjectExams) as any[]).some(s => s.exams.length > 0) && (
                <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Award size={24} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Sınav Başarıları</h4>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ders Bazlı Performans</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(Object.values(subjectExams) as any[]).filter(s => s.exams.length > 0).map((subjGroup) => (
                      <button
                        key={subjGroup.subject.id}
                        onClick={() => setActiveModal(`exam-${subjGroup.subject.id}`)}
                        className="bg-white p-6 rounded-[2rem] border border-blue-100/50 hover:border-blue-300 transition-all text-left group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                               {/* Using Target icon for exams */}
                               <Target size={20} />
                             </div>
                             <h5 className="font-black text-neutral-800">{subjGroup.subject.name}</h5>
                          </div>
                          <ChevronRight size={20} className="text-blue-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                        
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-50">
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Katılım</p>
                            <p className="font-bold text-neutral-800">{subjGroup.results.length} Sınav</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ortalama</p>
                            <p className={`text-xl font-black ${
                              subjGroup.avg >= 85 ? 'text-emerald-500' :
                              subjGroup.avg >= 50 ? 'text-amber-500' : 'text-rose-500'
                            }`}>
                              {subjGroup.avg}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Activity Log Card */}
              <div className="bg-neutral-50 rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <History size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Öğrenci Hareketliliği</h4>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">En Güncel 10 Hareketlilik</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {activityLog.length > 0 ? (
                    activityLog.map((activity, idx) => (
                      <div 
                        key={idx}
                        className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between group hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            {activity.icon}
                          </div>
                          <div>
                            <p className="text-xs font-black text-neutral-900">{activity.title}</p>
                            <p className="text-[11px] font-bold text-neutral-500 italic mt-0.5">{activity.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                            {new Date(activity.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                            {new Date(activity.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-neutral-200 mx-auto mb-4">
                        <History size={32} />
                      </div>
                      <p className="text-neutral-400 font-bold italic text-sm text-center">Henüz bir hareketlilik bulunmuyor.</p>
                    </div>
                  )}
                </div>

                {/* Sub-info Grid */}
                <div className="mt-8 pt-8 border-t border-neutral-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Okul</p>
                    <p className="text-sm font-bold text-neutral-900 truncate">{student.schoolName || student.school}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Öğretmen</p>
                    <p className="text-sm font-bold text-neutral-900">
                      {localTeacherProfile?.name || localTeacherProfile?.displayName || student.teacherName || '...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Mevcut</p>
                    <p className="text-sm font-bold text-neutral-900">{localAllStudents.length} Öğrenci</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Yerim</p>
                    <p className="text-sm font-bold text-neutral-900">{getSeatingPositionText(student.id)}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    activeModal === 'stars' ? 'bg-amber-50 text-amber-500' :
                    activeModal === 'reading' ? 'bg-emerald-50 text-emerald-500' :
                    activeModal === 'tournaments' ? 'bg-rose-50 text-rose-500' :
                    activeModal?.startsWith('exam-') ? 'bg-blue-50 text-blue-500' :
                    'bg-indigo-50 text-indigo-500'
                  }`}>
                    {activeModal === 'stars' ? <Star size={24} fill="currentColor" /> :
                     activeModal === 'reading' ? <BookOpen size={24} /> :
                     activeModal === 'tournaments' ? <Trophy size={24} /> :
                     activeModal?.startsWith('exam-') ? <Target size={24} /> :
                     <Calendar size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
                      {activeModal === 'stars' ? 'Yıldız Detayları' :
                       activeModal === 'reading' ? 'Okuma Kayıtları' :
                       activeModal === 'tournaments' ? 'Turnuva Geçmişi' :
                       activeModal?.startsWith('exam-') ? `${subjectExams[activeModal.replace('exam-', '')]?.subject?.name || ''} Sınavları` :
                       'Ders Programı'}
                    </h3>
                    <p className="text-neutral-500 font-medium">{student.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-3 hover:bg-neutral-50 rounded-2xl transition-colors text-neutral-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                {activeModal === 'schedule' && (
                  <div className="space-y-6">
                    {localScheduleConfig ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="p-4 text-left bg-neutral-50 rounded-tl-3xl border-b border-neutral-100">
                                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                  <Clock size={14} />
                                  Saat
                                </div>
                              </th>
                              {localScheduleConfig.days.map((day: string, idx: number) => (
                                <th key={day} className={`p-4 text-center bg-neutral-50 border-b border-neutral-100 ${idx === localScheduleConfig.days.length - 1 ? 'rounded-tr-3xl' : ''}`}>
                                  <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">{day}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-50">
                            {timeSlots.map((slot, idx) => (
                              <tr key={idx} className="group hover:bg-neutral-50/50 transition-colors">
                                <td className="p-4 border-r border-neutral-50">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-black text-neutral-900">{slot.start}</p>
                                    <p className="text-[10px] font-bold text-neutral-400">{slot.end}</p>
                                  </div>
                                </td>
                                {slot.type === 'lesson' ? (
                                  localScheduleConfig.days.map((day: string) => {
                                    const slotKey = `${day}_${slot.number}`;
                                    const subjectId = localScheduleData.slots?.[slotKey];
                                    const subject = localSubjects.find(s => s.id === subjectId);
                                    
                                    return (
                                      <td key={day} className="p-2">
                                        {subject ? (
                                          <div 
                                            className="p-3 rounded-2xl border-l-4 shadow-sm transition-all hover:scale-[1.02]"
                                            style={{ 
                                              backgroundColor: `${subject.color}08`,
                                              borderLeftColor: subject.color,
                                              color: subject.color
                                            }}
                                          >
                                            <p className="text-[10px] font-black uppercase tracking-tight truncate">{subject.name}</p>
                                            <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest mt-1">
                                              {localTeacherProfile?.name || localTeacherProfile?.displayName || student.teacherName || 'Öğretmen'}
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="h-12 bg-neutral-50/50 rounded-2xl border-2 border-dashed border-neutral-100" />
                                        )}
                                      </td>
                                    );
                                  })
                                ) : (
                                  <td colSpan={localScheduleConfig.days.length} className="p-2 text-center">
                                    <div className="py-1 px-4 bg-neutral-100/50 rounded-xl inline-block">
                                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                                        {slot.type === 'lunch' ? '🍔 Öğle Yemeği Molası' : '☕ Dinlenme Arası'}
                                      </span>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-neutral-200" />
                        <p className="text-neutral-400 font-bold">Ders programı ayarlanmamış.</p>
                      </div>
                    )}
                  </div>
                )}
                
                {activeModal?.startsWith('exam-') && (
                  <div className="space-y-6">
                    {(() => {
                      const subjectId = activeModal.replace('exam-', '');
                      const subjGroup = subjectExams[subjectId];
                      if (!subjGroup || subjGroup.exams.length === 0) {
                        return (
                          <div className="text-center py-20">
                            <Target className="w-16 h-16 mx-auto mb-4 text-neutral-200" />
                            <p className="text-neutral-400 font-bold">Bu derse ait henüz girilmiş bir sınav sonucu bulunmuyor.</p>
                          </div>
                        );
                      }
                      
                      // Sort exams by creation date
                      const sortedExams = [...subjGroup.exams].sort((a, b) => {
                         return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                      });

                      return (
                        <div className="space-y-4">
                          {sortedExams.map((exam) => {
                            const result = subjGroup.results.find(r => r.examId === exam.id);
                            
                            // If user explicitly marked as absent or no result exists, show absent state
                            const isAbsent = !result || result.isAbsent;

                            if (isAbsent) {
                              return (
                                <div key={exam.id} className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden shadow-sm flex items-center justify-between p-6 opacity-60">
                                  <div className="flex items-center gap-4">
                                     <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 bg-neutral-100 text-neutral-400">
                                       -
                                     </div>
                                     <div>
                                        <h4 className="font-black text-neutral-900 line-through uppercase tracking-tight text-left">{exam.title || 'İsimsiz Sınav'}</h4>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap opacity-70">
                                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-100/50 px-2.5 py-1 rounded-lg">
                                            <Calendar size={12} />
                                            {formatExamDate(exam)}
                                          </span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 uppercase tracking-widest">Sınava Girmedi</span>
                                  </div>
                                </div>
                              );
                            }

                            const correctCount = Object.values(result.answers || {}).filter((a: any) => a.isCorrect).length;
                            const emptyCount = Object.values(result.answers || {}).filter((a: any) => !a.isCorrect && a.givenAnswer === 'Boş/Geçersiz').length;
                            const wrongCount = Object.keys(result.answers || {}).length - correctCount - emptyCount;
                            
                            const wrongAnswers = Object.entries(result.answers || {})
                                .filter(([_, ans]: [string, any]) => !ans.isCorrect)
                                .map(([idx, ans]: [string, any]) => {
                                    const qIndex = parseInt(idx);
                                    const question = exam?.questions?.[qIndex] || {};
                                    
                                    // Try to find outcome name from examConfig
                                    const outcomeFromConfig = exam?.examConfig?.find((c: any) => c.id === question.outcomeId);
                                    const outcomeText = outcomeFromConfig?.name || question.label || `Soru ${qIndex + 1}`;
                                    
                                    // Extract correct letter from correctAnswer if correctLetter is missing
                                    let correctLetter = question.correctLetter;
                                    if (!correctLetter && question.correctAnswer) {
                                      correctLetter = question.correctAnswer.charAt(0).toUpperCase();
                                    }

                                    return {
                                       qIndex,
                                       given: ans.givenAnswer,
                                       correctLetter: correctLetter || '?',
                                       label: outcomeText
                                    };
                                });

                            return (
                              <div key={exam.id} className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden shadow-sm group hover:border-blue-200 hover:shadow-md transition-all">
                                <details className="group/details">
                                  <summary className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 cursor-pointer list-none gap-4 outline-none">
                                    <div className="flex items-center gap-4 cursor-pointer">
                                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
                                        result.score >= 85 ? 'bg-emerald-50 text-emerald-500' :
                                        result.score >= 50 ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'
                                      }`}>
                                        {result.score}
                                      </div>
                                      <div>
                                        <h4 className="font-black text-neutral-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight text-left">{exam?.title || 'İsimsiz Sınav'}</h4>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-100/50 px-2.5 py-1 rounded-lg">
                                            <Calendar size={12} />
                                            {formatExamDate(exam)}
                                          </span>
                                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-100/50 px-2.5 py-1 rounded-lg">
                                            <Target size={12} />
                                            {exam?.questions?.length || 0} Soru
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 justify-between md:justify-end md:ml-0 mt-4 md:mt-0">
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center gap-1 group/stat">
                                           <div className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-sm shadow-sm group-hover/stat:scale-105 transition-transform">
                                              {correctCount}
                                           </div>
                                           <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Doğru</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1 group/stat">
                                           <div className="w-10 h-10 flex items-center justify-center text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-black text-sm shadow-sm group-hover/stat:scale-105 transition-transform">
                                              {wrongCount}
                                           </div>
                                           <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">Yanlış</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1 group/stat">
                                           <div className="w-10 h-10 flex items-center justify-center text-neutral-600 bg-neutral-50 border border-neutral-100 rounded-xl font-black text-sm shadow-sm group-hover/stat:scale-105 transition-transform">
                                              {emptyCount}
                                           </div>
                                           <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest leading-none">Boş</span>
                                        </div>
                                      </div>
                                      <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-details-open:-rotate-180 transition-transform ml-2">
                                        <ChevronDown size={20} />
                                      </div>
                                    </div>
                                  </summary>
                                  
                                  <div className="px-6 pb-6 pt-2 border-t border-neutral-100 bg-neutral-50/30">
                                     <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                       <Target size={12} className="text-rose-400" /> Yanlış ve Boş Cevaplar Detayı
                                     </h5>
                                     
                                     {wrongAnswers.length > 0 ? (
                                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                          {wrongAnswers.map(wa => {
                                             const allClassRes = classExamResults[exam.id] || [];
                                             let successRate: number | null = null;
                                             if (allClassRes.length > 0) {
                                                const correctInClass = allClassRes.filter(cr => cr.answers?.[wa.qIndex]?.isCorrect).length;
                                                successRate = Math.round((correctInClass / allClassRes.length) * 100);
                                             }

                                             return (
                                              <div key={wa.qIndex} className="bg-white p-5 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group/card hover:border-indigo-200 transition-all">
                                                 <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3 mb-2">
                                                    {/* Question Number Badge */}
                                                    <div className="bg-neutral-900 text-white px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-sm -ml-5 -mt-5 rounded-tr-none rounded-bl-none z-10 transition-transform group-hover/card:scale-105 group-hover/card:bg-indigo-600 duration-500">
                                                       Soru {wa.qIndex + 1}
                                                     </div>
                                                     {successRate !== null && (
                                                       <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border shadow-sm ${
                                                         successRate >= 70 ? 'text-emerald-600 border-emerald-100 bg-emerald-50' :
                                                         successRate >= 40 ? 'text-amber-600 border-amber-100 bg-amber-50' : 'text-rose-600 border-rose-100 bg-rose-50'
                                                       }`}>
                                                         %{successRate} Sınıf Başarısı
                                                       </span>
                                                     )}
                                                  </div>

                                                 <div className="grid grid-cols-2 gap-3 mb-3">
                                                   <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50 flex flex-col items-center justify-center">
                                                     <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">Senin Cevabın</span>
                                                     <span className="text-lg font-black text-rose-600">{wa.given || '-'}</span>
                                                   </div>
                                                   <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50 flex flex-col items-center justify-center">
                                                     <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Doğru Cevap</span>
                                                     <span className="text-lg font-black text-emerald-600">{wa.correctLetter || '?'}</span>
                                                   </div>
                                                 </div>

                                                 <div className="text-left mt-auto">
                                                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1 ml-1">Öğrenme İçeriği</p>
                                                    <p className="text-[13px] font-bold text-neutral-800 leading-snug">
                                                       {wa.label}
                                                    </p>
                                                 </div>


                                              </div>
                                            );
                                          })}
                                       </div>
                                     ) : (
                                       <div className="flex flex-col items-center justify-center py-6 text-center">
                                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                                            <Target size={24} />
                                          </div>
                                          <p className="text-sm font-bold text-emerald-600">Tebrikler! Testte sıfır hata.</p>
                                       </div>
                                     )}
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeModal === 'stars' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(starSummary).map(([category, count]) => (
                        <div key={category} className={`p-4 rounded-2xl border shadow-sm text-center ${CATEGORY_COLORS[category] || 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 truncate opacity-80">{category}</p>
                          <p className="text-2xl font-black">{count}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-neutral-50 bg-neutral-50/50">
                        <h4 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                          <History size={16} className="text-indigo-500" />
                          Yıldız Geçmişi
                        </h4>
                      </div>
                      <div className="divide-y divide-neutral-50">
                        {localStudent.starHistory?.length > 0 ? (
                          [...localStudent.starHistory].sort((a, b) => b.timestamp - a.timestamp).map((star, idx) => (
                            <div key={idx} className="px-6 py-2 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                  <Star size={16} />
                                </div>
                                <div>
                                  <p className="text-[13px] font-black text-neutral-900">{star.category}</p>
                                  <p className="text-[11px] text-neutral-500 font-medium">{star.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-black text-amber-600">+{star.amount || 1}</p>
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                                  {new Date(star.timestamp).toLocaleString('tr-TR')}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center text-neutral-400 italic">Henüz yıldız kazanılmamış.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'reading' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <BookMarked size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Toplam Kitap</p>
                          <p className="text-2xl font-black text-neutral-900">{localReadingRecords.length}</p>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                          <Target size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Toplam Sayfa</p>
                          <p className="text-2xl font-black text-neutral-900">{totalPages}</p>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                          <Medal size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Kitap Kurdu Yıldızı</p>
                          <p className="text-2xl font-black text-neutral-900">{starSummary['Kitap Kurdu Yıldızı'] || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-neutral-50 bg-neutral-50/50">
                        <h4 className="text-sm font-black text-neutral-900 uppercase tracking-widest">Okunan Kitaplar</h4>
                      </div>
                      <div className="divide-y divide-neutral-50">
                        {localReadingRecords.length > 0 ? (
                          localReadingRecords.map((record, idx) => (
                            <div key={idx} className="px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                  <BookOpen size={16} />
                                </div>
                                <div>
                                  <p className="text-[13px] font-black text-neutral-900">{record.bookName}</p>
                                  <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-widest">{record.pageCount || 0} Sayfa</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Başlama</p>
                                  <p className="text-[11px] font-bold text-neutral-700">
                                    {record.startDate ? new Date(record.startDate.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                  </p>
                                </div>
                                <ArrowRight size={12} className="text-neutral-300 hidden md:block" />
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Bitiş</p>
                                  <p className={`text-[11px] font-bold ${record.endDate ? 'text-emerald-600' : 'text-amber-600 italic'}`}>
                                    {record.endDate ? new Date(record.endDate.seconds * 1000).toLocaleDateString('tr-TR') : 'Okuyor'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center text-neutral-400 italic">Henüz kitap kaydı bulunmuyor.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'tournaments' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {studentTournaments.length > 0 ? (
                      studentTournaments.map((tournament, idx) => {
                        const isOngoing = tournament.status === 'Devam Ediyor' || tournament.status === 'active';
                        return (
                          <div key={idx} className={`p-8 rounded-[2.5rem] border shadow-sm ${isOngoing ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                            <div className="flex items-center justify-between mb-6">
                              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${isOngoing ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {isOngoing ? 'Devam Ediyor' : 'Tamamlandı'}
                              </div>
                              <Trophy className={isOngoing ? 'text-emerald-500' : 'text-rose-500'} size={24} />
                            </div>
                            <h4 className="text-xl font-black text-neutral-900 mb-2">{tournament.name}</h4>
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/60 mb-4">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Öğrencimin Durumu</p>
                              <p className={`text-sm font-black ${isOngoing ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tournament.studentStatus}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-white/60 p-3 rounded-2xl border border-white/40">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Mod</p>
                                <p className="text-xs font-black text-neutral-700">{tournament.type}</p>
                              </div>
                              <div className="bg-white/60 p-3 rounded-2xl border border-white/40">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Katılımcı</p>
                                <p className="text-xs font-black text-neutral-700">{tournament.participants?.length || 0} Öğrenci</p>
                              </div>
                            </div>
                            {!isOngoing && tournament.winnerName && (
                              <div className="bg-white p-4 rounded-2xl border border-white/60">
                                <p className="text-xs font-black text-amber-600 flex items-center gap-2">
                                  <Award size={16} />
                                  Şampiyon: {tournament.winnerName}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center text-neutral-400 font-bold">Henüz bir turnuva katılımı bulunmuyor.</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MyStudentsPage: React.FC<MyStudentsPageProps> = (props) => {
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  const [teacherData, setTeacherData] = useState<any>(null);

  useEffect(() => {
    // Update timestamp every minute to keep it "fresh" if they stay on page
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (props.linkedStudents.length > 0) {
        const firstStudent = props.linkedStudents[0];
        const teacherUid = firstStudent.teacherUid;
        
        if (teacherUid) {
          try {
            const tDoc = await getDoc(doc(db, `users/${teacherUid}`));
            if (tDoc.exists()) {
              setTeacherData(tDoc.data());
            }
          } catch (err) {
            console.warn("Could not fetch teacher for sync info", err);
          }
        }
      }
    };
    fetchTeacher();
  }, [props.linkedStudents]);

  const sortedStudents = useMemo(() => {
    // Sort to put records with grade/section info first so they are preferred during Map deduplication
    const sorted = [...props.linkedStudents].sort((a, b) => {
      const aComplete = (a.gradeLevel || a.grade) && (a.section || a.sectionName);
      const bComplete = (b.gradeLevel || b.grade) && (b.section || b.sectionName);
      if (aComplete && !bComplete) return -1;
      if (!aComplete && bComplete) return 1;
      return 0;
    });
    
    // Deduplicate by studentNo + name
    const uniqueMap = new Map();
    sorted.forEach(s => {
      const key = `${String(s.studentNo || '').trim()}-${String(s.name || '').trim()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [props.linkedStudents]);

  if (isEditing || (props.linkedStudents.length === 0 && !isEditing)) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 p-4 md:p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl">
              <User size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">Öğrenci Yönetimi</h2>
              <p className="text-neutral-500 font-medium">Çocuklarınızın bilgilerini girerek onları takip etmeye başlayın.</p>
            </div>
          </div>
          {props.linkedStudents.length > 0 && (
            <button 
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
            >
              Vazgeç
            </button>
          )}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl overflow-hidden">
          <ParentProfileSetup 
            cities={props.cities}
            districts={props.districts}
            schools={props.schools}
            onLoadCities={props.onLoadCities}
            onLoadDistricts={props.onLoadDistricts}
            onLoadSchools={props.onLoadSchools}
            isLoadingCities={props.isLoadingCities}
            isLoadingDistricts={props.isLoadingDistricts}
            isLoadingSchools={props.isLoadingSchools}
            linkedStudents={props.linkedStudents}
            savedChildren={props.savedChildren}
            onSave={(children: any[]) => {
              props.onSaveProfile(children);
              setIsEditing(false);
            }}
            onDeleteProfile={(props.savedChildren && props.savedChildren.length > 0) || props.linkedStudents.length > 0 ? props.onDeleteProfile : undefined}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 p-6 md:p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-6">
        <div className="flex items-start md:items-center gap-4 md:gap-6 w-full">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black shadow-inner flex-shrink-0">
            <User size={32} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">ÖĞRENCİLERİM</h1>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 dark:focus:ring-offset-neutral-900"
                title="Öğrenci Ekle / Düzenle"
              >
                <UserPlus size={18} className="sm:w-5 sm:h-5" />
                <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Ekle</span>
              </button>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium text-xs sm:text-sm md:text-base">Bağlı olan tüm öğrencilerinizi buradan takip edebilirsiniz.</p>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-3">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full w-fit border border-emerald-100/50 dark:border-emerald-800 transition-all">
                <Sparkles size={10} className="sm:w-3 sm:h-3" />
                <span>Sisteme Bağlı: {lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {props.unreadAnnouncementsCount && props.unreadAnnouncementsCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => props.onTabChange && props.onTabChange('announcements')}
          className="bg-amber-100 border-2 border-amber-200 rounded-3xl p-5 flex items-center justify-between shadow-lg shadow-amber-100/50 cursor-pointer group transition-all"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:animate-bounce">
              <Bell size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h3 className="text-amber-900 font-black text-base md:text-lg uppercase tracking-tight leading-tight">ÖĞRETMENİNİZDEN MESAJ VAR 📢</h3>
              <p className="text-amber-700 text-xs md:text-sm font-bold mt-0.5">
                Okunmamış <span className="bg-amber-200 px-2 py-0.5 rounded-lg text-amber-900 inline-block mx-1">{props.unreadAnnouncementsCount}</span> adet yeni duyurunuz var. Görmek için tıklayın.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-200/50 text-amber-600 group-hover:bg-amber-200 transition-colors">
            <ChevronRight size={20} className="md:w-6 md:h-6" />
          </div>
        </motion.div>
      ) : null}

      <div className="space-y-4">
        {sortedStudents.map(student => (
          <StudentAccordion 
            key={student.id}
            student={student}
            isOpen={openStudentId === student.id}
            onToggle={() => setOpenStudentId(openStudentId === student.id ? null : student.id)}
            allStudents={[]} // This will be fetched locally in StudentAccordion
          />
        ))}
      </div>
    </motion.div>
  );
};
