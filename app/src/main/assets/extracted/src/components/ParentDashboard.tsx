import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  User, 
  School, 
  Star, 
  BookOpen, 
  Trophy, 
  X, 
  Calendar, 
  Clock, 
  ChevronRight,
  Medal,
  Target,
  History,
  BookMarked,
  ArrowRight,
  Award,
  Gamepad2,
  Bell,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, where, getDoc, getDocs } from 'firebase/firestore';
import { ClassCompetitionModal } from './ClassCompetitionModal';
import { AiReportModal } from './AiReportModal';

interface ParentDashboardProps {
  linkedStudents: any[];
  selectedStudentId: string | null;
  allStudents: any[];
  seatingPlan: { [key: string]: string };
  teacherProfile: any;
  readingRecords: any[];
  tournaments: any[];
  scheduleConfig: any;
  scheduleData: any;
  subjects: any[];
  unreadAnnouncementsCount?: number;
  onTabChange?: (tab: string) => void;
  isTeacher?: boolean;
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

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ 
  linkedStudents, 
  selectedStudentId,
  allStudents,
  seatingPlan,
  teacherProfile,
  readingRecords,
  tournaments,
  scheduleConfig,
  scheduleData,
  subjects,
  unreadAnnouncementsCount,
  onTabChange,
  isTeacher
}) => {
  const [activeModal, setActiveModal] = useState<'schedule' | 'stars' | 'reading' | 'tournaments' | null>(null);
  const [isCompetitionModalOpen, setIsCompetitionModalOpen] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);

  const selectedStudent = useMemo(() => {
    return linkedStudents.find(s => s.id === selectedStudentId) || linkedStudents[0];
  }, [linkedStudents, selectedStudentId]);

  const [fetchedStudents, setFetchedStudents] = useState<any[]>([]);
  const [fetchedSeatingPlan, setFetchedSeatingPlan] = useState<{ [key: string]: string }>({});
  const [fetchedSeatingConfig, setFetchedSeatingConfig] = useState<any>(null);
  const [fetchedReadingRecords, setFetchedReadingRecords] = useState<any[]>([]);
  const [allClassReadingRecords, setAllClassReadingRecords] = useState<any[]>([]);
  const [fetchedTournaments, setFetchedTournaments] = useState<any[]>([]);
  const [studentActivityScores, setStudentActivityScores] = useState<any[]>([]);
  const [studentMatches, setStudentMatches] = useState<any[]>([]);
  const [fetchedScheduleConfig, setFetchedScheduleConfig] = useState<any>(null);
  const [fetchedScheduleData, setFetchedScheduleData] = useState<any>({ slots: {} });
  const [fetchedSubjects, setFetchedSubjects] = useState<any[]>([]);
  const [currentStudentData, setCurrentStudentData] = useState<any>(null);
  const [currentlyAssignedBook, setCurrentlyAssignedBook] = useState<any>(null);

  useEffect(() => {
    if (!selectedStudent?.teacherUid || !selectedStudent?.id) return;

    const teacherUid = selectedStudent.teacherUid;
    const studentId = selectedStudent.id;

    // Real-time Student Document
    const unsubStudent = onSnapshot(doc(db, `users/${teacherUid}/students/${studentId}`), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentStudentData({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // Fetch All Students (Real-time for class lists and averages)
    const unsubAllStudents = onSnapshot(collection(db, `users/${teacherUid}/students`), (snapshot) => {
      setFetchedStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Seating Plan (Real-time)
    const unsubSeatingPlan = onSnapshot(doc(db, `users/${teacherUid}/config/seatingPlan`), (snap) => {
      if (snap.exists()) setFetchedSeatingPlan(snap.data().plan || {});
    });
    
    // Fetch Seating Config (Real-time)
    const unsubSeatingConfig = onSnapshot(doc(db, `users/${teacherUid}/config/seating`), (snap) => {
      if (snap.exists()) setFetchedSeatingConfig(snap.data());
    });

    // Fetch Reading Records (Real-time)
    const unsubReading = onSnapshot(collection(db, `users/${teacherUid}/readingRecords`), (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllClassReadingRecords(allRecords);
      setFetchedReadingRecords(allRecords.filter((r: any) => r.studentId === studentId));
    });

    // Fetch currently assigned book from books collection
    const qCurrentBook = query(
      collection(db, `users/${teacherUid}/books`),
      where('currentStudentId', '==', studentId)
    );
    const unsubCurrentBook = onSnapshot(qCurrentBook, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentlyAssignedBook({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setCurrentlyAssignedBook(null);
      }
    });

    // Fetch Activity Scores (Real-time)
    const qScores = query(
      collection(db, `users/${teacherUid}/activityScores`),
      where('studentId', '==', studentId)
    );
    const unsubScores = onSnapshot(qScores, (snapshot) => {
      setStudentActivityScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Tournaments and Matches (Real-time)
    const unsubTournaments = onSnapshot(collection(db, `users/${teacherUid}/tournaments`), async (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setFetchedTournaments(tournamentsData);

      // Fetch matches for each active tournament
      // This is slightly heavy, in a bigger app we'd only watch matches for relevant tournaments
      const allStudentMatches: any[] = [];
      for (const t of tournamentsData) {
        const matchSnap = await getDocs(collection(db, `users/${teacherUid}/tournaments/${t.id}/matches`));
        const matches = matchSnap.docs.map(d => ({ id: d.id, ...d.data(), tournamentName: t.name }));
        const filtered = matches.filter((m: any) => m.p1Id === studentId || m.p2Id === studentId);
        allStudentMatches.push(...filtered);
      }
      setStudentMatches(allStudentMatches);
    });

    // Fetch Schedule (Real-time)
    const unsubScheduleConfig = onSnapshot(doc(db, `users/${teacherUid}/config/schedule`), (snap) => {
      if (snap.exists()) setFetchedScheduleConfig(snap.data());
    });
    
    const unsubScheduleData = onSnapshot(doc(db, `users/${teacherUid}/config/scheduleData`), (snap) => {
      if (snap.exists()) setFetchedScheduleData(snap.data());
    });

    // Fetch Subjects (Real-time)
    const unsubSubjects = onSnapshot(collection(db, `users/${teacherUid}/subjects`), (snapshot) => {
      setFetchedSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudent();
      unsubAllStudents();
      unsubSeatingPlan();
      unsubSeatingConfig();
      unsubReading();
      unsubCurrentBook();
      unsubScores();
      unsubTournaments();
      unsubScheduleConfig();
      unsubScheduleData();
      unsubSubjects();
    };
  }, [selectedStudent?.teacherUid, selectedStudent?.id]);

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
      } else {
        currentTime = lessonEnd;
      }
    }
    return slots;
  };

  const timeSlots = useMemo(() => {
    if (!fetchedScheduleConfig) return [];
    return generateTimeSlots(fetchedScheduleConfig);
  }, [fetchedScheduleConfig]);

  // Calculate seating info
  const seatingInfoText = (() => {
    const seatId = Object.keys(fetchedSeatingPlan).find(key => fetchedSeatingPlan[key] === selectedStudent?.id);
    if (!seatId) return 'Belirlenmemiş';
    const match = seatId.match(/g(\d+)-r(\d+)-s(\d+)/);
    if (!match) return 'Belirlenmemiş';

    const groupIdx = parseInt(match[1], 10);
    const rowIdx = parseInt(match[2], 10);
    const colIdx = parseInt(match[3], 10);

    const groupText = `${groupIdx + 1}. Grup`;
    const rowText = `${rowIdx + 1}. Sıra`;

    let colText = '';
    const peoplePerRow = fetchedSeatingConfig?.peoplePerRow || 2;
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
  })();

  // Calculate reading stats
  const studentReadingRecords = fetchedReadingRecords
    .filter(r => r.studentId === selectedStudent?.id)
    .sort((a, b) => {
      const dateA = a.endDate?.seconds || 0;
      const dateB = b.endDate?.seconds || 0;
      return dateB - dateA;
    });

  const totalPages = useMemo(() => {
    const finishedPages = studentReadingRecords.reduce((sum, r) => sum + (Number(r.pageCount) || 0), 0);
    const currentPages = currentlyAssignedBook ? (Number(currentlyAssignedBook.pageCount) || 0) : 0;
    return finishedPages + currentPages;
  }, [studentReadingRecords, currentlyAssignedBook]);

  const lastBook = studentReadingRecords[0];

  // Calculate tournament stats
  const studentTournaments = fetchedTournaments
    .filter(t => t.participants?.some((p: any) => p.id === selectedStudent?.id))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const ongoingTournament = studentTournaments.find(t => t.status === 'active');
  
  // Calculate class averages
  const classStats = useMemo(() => {
    if (fetchedStudents.length === 0) return { starAvg: 0, readingAvg: 0 };
    
    const calculateStarSum = (student: any) => {
      if (!student || !student.starHistory) return 0;
      return student.starHistory.reduce((sum: number, star: any) => {
        let amount = 1;
        if (star.amount !== undefined) amount = Number(star.amount);
        else if (star.category === 'Kitap Kurdu Yıldızı' && star.description) {
          const match = star.description.match(/\((\d+)\s*Sayfa\)/i);
          if (match) amount = Math.ceil(parseInt(match[1]) / 10);
        }
        return sum + amount;
      }, 0);
    };

    const totalStars = fetchedStudents.reduce((sum, s) => sum + calculateStarSum(s), 0);
    const starAvg = totalStars / fetchedStudents.length;

    // Count records that have an endDate (finished books)
    const finishedReadingRecordsCount = allClassReadingRecords.filter(r => r.endDate).length;
    const readingAvg = finishedReadingRecordsCount / fetchedStudents.length;

    return {
      starAvg: Number(starAvg.toFixed(1)),
      readingAvg: Number(readingAvg.toFixed(1))
    };
  }, [fetchedStudents, allClassReadingRecords]);

  // Activity Log
  const activities = useMemo(() => {
    const list: any[] = [];

    // Stars
    ((currentStudentData || selectedStudent)?.starHistory || []).forEach((star: any) => {
      list.push({
        type: 'star',
        title: 'Yıldız Kazanıldı',
        description: `${star.category}: ${star.description}`,
        timestamp: star.timestamp,
        amount: star.amount || 1,
        icon: <Star size={16} className="text-amber-500" />
      });
    });

    // Books
    fetchedReadingRecords.forEach((record: any) => {
      if (record.endDate) {
        list.push({
          type: 'book',
          title: 'Kitap Bitirildi',
          description: `"${record.bookName}" kitabı başarıyla okundu.`,
          timestamp: record.endDate.seconds * 1000,
          amount: record.pageCount,
          icon: <BookOpen size={16} className="text-emerald-500" />
        });
      }
      if (record.startDate) {
        list.push({
          type: 'book_start',
          title: 'Kitap Alındı',
          description: `"${record.bookName}" kitabını okumaya başladı.`,
          timestamp: record.startDate.seconds * 1000,
          label: 'Başladı',
          icon: <BookMarked size={16} className="text-blue-500" />
        });
      }
    });

    // Activity Scores
    studentActivityScores.forEach((score: any) => {
      let activityName = 'Etkinlik';
      if (score.activityId === 'es-zit-solo') activityName = 'Eş/Zıt Anlam Oyunu';
      if (score.activityId === 'dort-islem') activityName = 'Dört İşlem Arenası';
      
      list.push({
        type: 'activity',
        title: 'Puan Kazanıldı',
        description: `${activityName} etkinliğinden ${score.score || score.correctCount || 0} puan aldı.`,
        timestamp: score.date || score.createdAt?.seconds * 1000,
        amount: score.totalScore || score.score,
        icon: <Gamepad2 size={16} className="text-fuchsia-500" />
      });
    });

    // Matches
    studentMatches.forEach((match: any) => {
      const isWinner = match.winnerId === selectedStudent?.id;
      list.push({
        type: 'tournament',
        title: 'Turnuva Maçı',
        description: `${match.tournamentName}: Maç ${isWinner ? 'kazanıldı' : 'tamamlandı'}.`,
        timestamp: match.createdAt?.seconds * 1000 || Date.now(),
        label: isWinner ? 'Kazandı' : 'Oynadı',
        icon: <Trophy size={16} className="text-indigo-500" />
      });
    });

    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
  }, [currentStudentData, selectedStudent?.starHistory, fetchedReadingRecords, studentActivityScores, studentMatches, selectedStudent?.id]);

  // Star categories summary
  const getCorrectedAmounts = (student: any) => {
    const amounts = new Map<any, number>();
    if (!student || !student.starHistory) return amounts;

    student.starHistory.forEach((star: any) => {
      if (star.amount !== undefined) {
        amounts.set(star, Number(star.amount));
      } else if (star.category === 'Kitap Kurdu Yıldızı' && star.description) {
        const match = star.description.match(/\((\d+)\s*Sayfa\)/i);
        if (match) {
          const amt = Math.ceil(parseInt(match[1]) / 10);
          amounts.set(star, amt);
        } else {
          amounts.set(star, 1);
        }
      } else {
        amounts.set(star, 1);
      }
    });

    return amounts;
  };

  const correctedAmounts = getCorrectedAmounts(currentStudentData || selectedStudent);

  // Master total comes from calculating history sum, matching teacher screen source of truth
  const calculatedTotalStars = ((currentStudentData || selectedStudent)?.starHistory || []).reduce((sum: number, star: any) => {
    return sum + (correctedAmounts.get(star) || 1);
  }, 0);

  const starSummary = ((currentStudentData || selectedStudent)?.starHistory || []).reduce((acc: any, star: any) => {
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
    
    let category = star.category || 'Diğer';
    if (categoryMap[category]) category = categoryMap[category];
    else if (category && !category.endsWith(' Yıldızı') && CATEGORY_COLORS[`${category} Yıldızı`]) {
      category = `${category} Yıldızı`;
    }

    acc[category] = (acc[category] || 0) + (correctedAmounts.get(star) || 1);
    return acc;
  }, {});

  const sortedStarHistory = [...((currentStudentData || selectedStudent)?.starHistory || [])].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (!selectedStudent && linkedStudents.length > 0) return null;

  if (linkedStudents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto"
      >
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-neutral-200">
          <h1 className="text-3xl md:text-5xl font-black text-neutral-900 mb-4 tracking-tight">Merhaba, Sayın Velimiz! 👋</h1>
          <p className="text-neutral-500 text-lg font-medium max-w-2xl">
            Veli panelinize hoş geldiniz. Çocuğunuzun eğitim sürecini buradan takip edebilirsiniz.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-amber-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-amber-900 mb-2">Henüz Bağlı Öğrenci Bulunamadı</h2>
          <p className="text-amber-700 max-w-md mx-auto">
            Öğretmeniniz sınıf listesine e-posta adresinizi eklediğinde, çocuğunuzun bilgileri burada otomatik olarak görünecektir.
          </p>
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
      <div className="bg-white dark:bg-neutral-900 p-6 md:p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black shadow-inner">
            {selectedStudent.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{selectedStudent.name}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest text-[11px] mt-1.5">
              Öğrenci No: {selectedStudent.studentNo} • {selectedStudent.gender}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isTeacher && (
            <button
              onClick={() => setIsAiReportModalOpen(true)}
              className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl border border-indigo-500 font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
            >
              <Bot size={20} />
              AI Raporu Al
            </button>
          )}
          <div className="flex items-center gap-3 px-6 py-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <Sparkles className="text-amber-500" size={24} />
            <span className="text-neutral-900 dark:text-white font-black text-2xl tracking-tighter">{calculatedTotalStars}</span>
            <span className="text-neutral-400 font-bold text-xs uppercase tracking-widest ml-1">Yıldız</span>
          </div>
        </div>
      </div>

      {unreadAnnouncementsCount && unreadAnnouncementsCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onTabChange && onTabChange('announcements')}
          className="bg-amber-100 border-2 border-amber-200 rounded-3xl p-5 flex items-center justify-between shadow-lg shadow-amber-100/50 cursor-pointer group transition-all"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:animate-bounce">
              <Bell size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h3 className="text-amber-900 font-black text-base md:text-lg uppercase tracking-tight leading-tight">ÖĞRETMENİNİZDEN MESAJ VAR 📢</h3>
              <p className="text-amber-700 text-xs md:text-sm font-bold mt-0.5">
                Okunmamış <span className="bg-amber-200 px-2 py-0.5 rounded-lg text-amber-900 inline-block mx-1">{unreadAnnouncementsCount}</span> adet yeni duyurunuz var. Görmek için tıklayın.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-200/50 text-amber-600 group-hover:bg-amber-200 transition-colors">
            <ChevronRight size={20} className="md:w-6 md:h-6" />
          </div>
        </motion.div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Okul Bilgileri */}
        <motion.button
          whileHover={{ y: -5 }}
          onClick={() => setActiveModal('schedule')}
          className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 text-left group transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 flex flex-col"
        >
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <School size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Öğrenci Hareketliliği</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {activities.length > 0 ? (
              activities.map((activity, idx) => (
                <div key={idx} className="flex gap-3 items-start p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                  <div className="mt-1 flex-shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center border border-neutral-100 dark:border-neutral-800">
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[11px] font-black text-neutral-900 dark:text-white truncate">{activity.title}</p>
                      {activity.label && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-tight">
                          {activity.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight mt-0.5">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-neutral-300" />
                      <p className="text-[9px] text-neutral-400 font-bold">
                        {new Date(activity.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <History size={32} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">Hareketlilik Bulunmuyor</p>
              </div>
            )}
          </div>
          <div className="mt-auto pt-6 border-t border-neutral-50 dark:border-neutral-800 flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
            Tüm Hareketler
            <ChevronRight size={14} />
          </div>
        </motion.button>

        {/* Yıldızlarım */}
        <motion.button
          whileHover={{ y: -5 }}
          onClick={() => setActiveModal('stars')}
          className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-200 text-left group transition-all hover:shadow-md hover:border-amber-200 flex flex-col"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Star size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 mb-4 tracking-tight">Yıldızlarım</h3>
          <div className="flex items-end gap-3 mb-1">
            <span className="text-5xl font-black text-amber-600 leading-none">{calculatedTotalStars}</span>
            <span className="text-neutral-400 font-bold text-xs uppercase tracking-widest mb-1">Toplam Yıldız</span>
          </div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 bg-amber-50 inline-block px-2 py-0.5 rounded">
            Sınıf Ortalaması: <span className="text-amber-600">{classStats.starAvg}</span>
          </div>
          <div className="space-y-2 mb-4">
            {Object.entries(starSummary).slice(0, 3).map(([category, count]: [string, any]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate max-w-[120px]">{category}</span>
                <span className="text-xs font-black text-amber-600">+{count}</span>
              </div>
            ))}
            {Object.keys(starSummary).length > 3 && (
              <p className="text-[9px] text-neutral-400 italic font-bold">ve {Object.keys(starSummary).length - 3} kategori daha...</p>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-50 flex items-center justify-between text-amber-600 font-bold text-xs uppercase tracking-widest">
            Yıldız Detayları
            <ChevronRight size={14} />
          </div>
        </motion.button>

        {/* Okuma Durumu */}
        <motion.button
          whileHover={{ y: -5 }}
          onClick={() => setActiveModal('reading')}
          className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-200 text-left group transition-all hover:shadow-md hover:border-emerald-200 flex flex-col"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 mb-4 tracking-tight">Okuma Durumu</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-end gap-2">
                <p className="text-4xl font-black text-emerald-600">
                  {studentReadingRecords.length + (currentlyAssignedBook ? 1 : 0)}
                </p>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Kitap</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tight">Sınıf Ort.</p>
                <p className="text-xs font-black text-emerald-600">{classStats.readingAvg}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Toplam Sayfa</p>
                <p className="text-xl font-black text-emerald-600">{totalPages + (currentlyAssignedBook?.pageCount || 0)}</p>
              </div>
            </div>
            {(currentlyAssignedBook || lastBook) && (
              <div className={currentlyAssignedBook ? "bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50" : "bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50"}>
                <p className={`text-[10px] font-black ${currentlyAssignedBook ? 'text-amber-600/70' : 'text-emerald-600/70'} uppercase tracking-widest mb-1`}>
                  {currentlyAssignedBook ? 'Şu An Okuyor' : 'Son Bitirilen'}
                </p>
                <p className="text-sm font-bold text-neutral-800 line-clamp-1">{currentlyAssignedBook?.name || lastBook.bookName}</p>
                <div className="flex flex-col gap-1 mt-2 text-xs text-neutral-500">
                  <div className="flex items-center gap-2">
                    <span>{(currentlyAssignedBook?.pageCount || lastBook.pageCount)} Sayfa</span>
                    <span>•</span>
                    <span className={currentlyAssignedBook ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                      {currentlyAssignedBook ? 'Okuyor' : 'Bitti'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-80">
                    <span>Alış: {(currentlyAssignedBook?.assignmentDate || lastBook.startDate) ? new Date(((currentlyAssignedBook?.assignmentDate || lastBook.startDate).seconds * 1000)).toLocaleDateString('tr-TR') : '-'}</span>
                    {!currentlyAssignedBook && lastBook.endDate && (
                      <>
                        <span>•</span>
                        <span>Bitiş: {new Date(lastBook.endDate.seconds * 1000).toLocaleDateString('tr-TR')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-50 flex items-center justify-between text-emerald-600 font-bold text-xs uppercase tracking-widest">
            Okuma Geçmişi
            <ChevronRight size={14} />
          </div>
        </motion.button>

        {/* Turnuvalarım */}
        <motion.button
          whileHover={{ y: -5 }}
          onClick={() => setActiveModal('tournaments')}
          className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-200 text-left group transition-all hover:shadow-md hover:border-indigo-200 flex flex-col"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Trophy size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 mb-4 tracking-tight">Turnuvalarım</h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Katılım</p>
              <p className="text-xl font-black text-indigo-600">{studentTournaments.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Devam Eden</p>
              <p className="text-sm font-bold text-neutral-700 truncate">{ongoingTournament?.name || 'Yok'}</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-50 flex items-center justify-between text-indigo-600 font-bold text-xs uppercase tracking-widest">
            Turnuva Detayları
            <ChevronRight size={14} />
          </div>
        </motion.button>
      </div>

      {/* Modals */}
      <AiReportModal
        isOpen={isAiReportModalOpen}
        onClose={() => setIsAiReportModalOpen(false)}
        student={selectedStudent}
        activities={activities}
        readingRecords={fetchedReadingRecords}
        tournaments={fetchedTournaments}
        totalStars={calculatedTotalStars}
      />
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full ${activeModal === 'schedule' ? 'max-w-7xl' : 'max-w-5xl'} max-h-[95vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col`}
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    activeModal === 'schedule' ? 'bg-blue-50 text-blue-600' :
                    activeModal === 'stars' ? 'bg-amber-50 text-amber-600' :
                    activeModal === 'reading' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {activeModal === 'schedule' && <Calendar size={24} />}
                    {activeModal === 'stars' && <Star size={24} />}
                    {activeModal === 'reading' && <BookOpen size={24} />}
                    {activeModal === 'tournaments' && <Trophy size={24} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900">
                      {activeModal === 'schedule' && 'Ders Programı'}
                      {activeModal === 'stars' && 'Yıldız Detayları'}
                      {activeModal === 'reading' && 'Okuma Geçmişi'}
                      {activeModal === 'tournaments' && 'Turnuva Geçmişi'}
                    </h2>
                    <p className="text-neutral-400 font-bold text-xs uppercase tracking-widest mt-0.5">
                      {activeModal === 'schedule' ? (selectedStudent.teacherProfile?.displayName || selectedStudent.name) : selectedStudent.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-3 bg-neutral-50 text-neutral-400 rounded-2xl hover:bg-neutral-100 hover:text-neutral-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-neutral-50/30">
                {activeModal === 'schedule' && (
                  <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
                    {fetchedScheduleConfig?.days && fetchedScheduleData ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-neutral-50/50">
                              <th className="p-4 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100">Saat</th>
                              {fetchedScheduleConfig.days.map((day: string) => (
                                <th key={day} className="p-4 text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {timeSlots.map((slot, idx) => (
                              <tr key={idx} className={slot.type !== 'lesson' ? 'bg-neutral-50/30' : ''}>
                                <td className="p-4 border-r border-neutral-50">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-neutral-700">{slot.start} - {slot.end}</span>
                                    <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">
                                      {slot.type === 'lesson' ? `${slot.number}. Ders` : slot.type === 'lunch' ? 'Öğle Arası' : 'Teneffüs'}
                                    </span>
                                  </div>
                                </td>
                                {slot.type === 'lesson' ? (
                                  fetchedScheduleConfig.days.map((day: string) => {
                                    const slotKey = `${day}_${slot.number}`;
                                    const subjectId = fetchedScheduleData.slots[slotKey];
                                    const subject = fetchedSubjects.find(s => s.id === subjectId);
                                    return (
                                      <td key={day} className="p-2 border-r border-neutral-50 last:border-r-0">
                                        {subject ? (
                                          <div 
                                            className="p-3 rounded-2xl text-center transition-all shadow-sm"
                                            style={{ backgroundColor: `${subject.color}15`, border: `1px solid ${subject.color}30` }}
                                          >
                                            <span className="text-xs font-black" style={{ color: subject.color }}>
                                              {subject.name}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="p-3 rounded-2xl border border-dashed border-neutral-200 text-center">
                                            <span className="text-[10px] text-neutral-300 font-bold italic uppercase tracking-widest">Boş</span>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })
                                ) : (
                                  <td colSpan={fetchedScheduleConfig.days.length} className="p-2 text-center">
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
                      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <Calendar className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Ders programı henüz tanımlanmamış.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeModal === 'stars' && (
                  <div className="space-y-8">
                    {/* Category Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {Object.entries(starSummary).map(([category, count]: [string, any]) => {
                        const colorClass = CATEGORY_COLORS[category] || 'bg-amber-50 text-amber-600 border-amber-100';
                        return (
                          <div key={category} className={`p-4 rounded-2xl border shadow-sm text-center ${colorClass}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2 truncate opacity-80">{category}</p>
                            <p className="text-2xl font-black">{count}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* History List */}
                    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-neutral-50 bg-neutral-50/50">
                        <h4 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                          <History size={16} className="text-indigo-500" />
                          Yıldız Geçmişi
                        </h4>
                      </div>
                      <div className="divide-y divide-neutral-50">
                        {sortedStarHistory.length > 0 ? (
                          sortedStarHistory.map((star, idx) => (
                            <div key={idx} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                  <Star size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-neutral-900">{star.category}</p>
                                  <p className="text-xs text-neutral-500 font-medium">{star.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-amber-600">+{correctedAmounts.get(star) || 1}</p>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                  {new Date(star.timestamp).toLocaleString('tr-TR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <p className="text-neutral-400 italic">Henüz yıldız kazanılmamış.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'reading' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <BookMarked size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Toplam Kitap</p>
                          <p className="text-2xl font-black text-neutral-900">{studentReadingRecords.length}</p>
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
                        {currentlyAssignedBook && (
                          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-50/20 group hover:bg-amber-50/30 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                <BookOpen size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-neutral-900">{currentlyAssignedBook.name}</p>
                                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">{currentlyAssignedBook.pageCount || 0} Sayfa</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-center">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Başlama</p>
                                <p className="text-xs font-bold text-neutral-700">
                                  {currentlyAssignedBook.assignmentDate ? new Date(currentlyAssignedBook.assignmentDate.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                </p>
                              </div>
                              <ArrowRight size={14} className="text-neutral-300 hidden md:block" />
                              <div className="text-center">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Durum</p>
                                <p className="text-xs font-black text-amber-600 italic">Okuyor</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {studentReadingRecords.length > 0 ? (
                          studentReadingRecords.map((record, idx) => (
                            <div key={idx} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                  <BookOpen size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-neutral-900">{record.bookName}</p>
                                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">{record.pageCount || 0} Sayfa</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Başlama</p>
                                  <p className="text-xs font-bold text-neutral-700">
                                    {record.startDate ? new Date(record.startDate.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                  </p>
                                </div>
                                <ArrowRight size={14} className="text-neutral-300 hidden md:block" />
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Bitiş</p>
                                  <p className={`text-xs font-bold ${record.endDate ? 'text-emerald-600' : 'text-amber-600 italic'}`}>
                                    {record.endDate ? new Date(record.endDate.seconds * 1000).toLocaleDateString('tr-TR') : 'Okuyor'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <p className="text-neutral-400 italic">Henüz kitap kaydı bulunmuyor.</p>
                          </div>
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
                          <div 
                            key={idx} 
                            className={`p-8 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-xl ${
                              isOngoing 
                                ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200' 
                                : 'bg-rose-50/50 border-rose-100 hover:border-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-6">
                              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                                isOngoing ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                              }`}>
                                {isOngoing ? 'Devam Ediyor' : 'Tamamlandı'}
                              </div>
                              <Trophy className={isOngoing ? 'text-emerald-500' : 'text-rose-500'} size={24} />
                            </div>
                            
                            <h4 className="text-xl font-black text-neutral-900 mb-2">{tournament.name}</h4>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-white/60 p-3 rounded-2xl border border-white/40">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Mod</p>
                                <p className="text-xs font-black text-neutral-700">{tournament.type}</p>
                              </div>
                              <div className="bg-white/60 p-3 rounded-2xl border border-white/40">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Maç Tipi</p>
                                <p className="text-xs font-black text-neutral-700">{tournament.matchType}</p>
                              </div>
                              <div className="bg-white/60 p-3 rounded-2xl border border-white/40">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Katılımcı</p>
                                <p className="text-xs font-black text-neutral-700">{tournament.participants?.length || 0} Öğrenci</p>
                              </div>
                              <div className="bg-white/60 p-3 rounded-2xl border border-white/40">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Tarih</p>
                                <p className="text-xs font-black text-neutral-700">
                                  {tournament.createdAt ? new Date(tournament.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-white/60 shadow-sm">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOngoing ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                  <Medal size={16} />
                                </div>
                                <p className="text-xs font-black text-neutral-900 uppercase tracking-widest">Öğrenci Durumu</p>
                              </div>
                              
                              <div className="space-y-2">
                                {tournament.type === 'Eleme' && (
                                  <p className="text-sm font-bold text-neutral-600">
                                    Mevcut Tur: <span className="text-neutral-900">{tournament.currentRound}. Tur</span>
                                  </p>
                                )}
                                {tournament.type === 'Grup' && (
                                  <p className="text-sm font-bold text-neutral-600">
                                    Grup Aşaması: <span className="text-neutral-900">{tournament.groupCount} Grup</span>
                                  </p>
                                )}
                                {tournament.type === 'Lig' && (
                                  <p className="text-sm font-bold text-neutral-600">
                                    Lig Sıralaması: <span className="text-neutral-900">Puan Durumunda</span>
                                  </p>
                                )}
                                {!isOngoing && tournament.winnerName && (
                                  <div className="mt-3 pt-3 border-t border-neutral-100">
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">Şampiyon</p>
                                    <p className="text-sm font-black text-amber-600 flex items-center gap-2">
                                      <Award size={16} />
                                      {tournament.winnerName}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-neutral-200" />
                        <p className="text-neutral-400 font-bold">Henüz bir turnuva katılımı bulunmuyor.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
