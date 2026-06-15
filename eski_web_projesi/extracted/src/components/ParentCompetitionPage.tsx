import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, ChevronDown, Award, Clock, Star, Play, Zap, ListOrdered, BookOpen, Activity, CheckCircle2, Gamepad2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { ClassCompetitionModal } from './ClassCompetitionModal';
import { LESSONS, getLessonIdFromName } from '../constants';
import { EsZitSoloGame } from './EsZitSoloGame';
import { useGlobalOutcomes } from '../hooks/useGlobalOutcomes';

interface ParentCompetitionPageProps {
  linkedStudents: any[];
  selectedSubject?: string | null;
  onSubjectChange?: (subject: string | null) => void;
}

export const ParentCompetitionPage: React.FC<ParentCompetitionPageProps> = ({ linkedStudents, selectedSubject, onSubjectChange }) => {
  const [selectedStudent, setSelectedStudent] = useState<any>(linkedStudents[0] || null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [modalView, setModalView] = useState<'game' | 'leaderboard'>('game');
  const [selectedModalUnit, setSelectedModalUnit] = useState<any | null>(null);
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);

  // Restore EsZit state
  const [scores, setScores] = useState<any[]>([]);
  const [isPlayingEsZit, setIsPlayingEsZit] = useState(false);
  const [showEsZitRanking, setShowEsZitRanking] = useState(false);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [personalBest, setPersonalBest] = useState<any>(null);
  
  const lessonIdsList = useMemo(() => {
    return LESSONS.map(l => l.id);
  }, []);

  // Use the teacher's UID for the hook
  const { units, outcomes, loading: outcomesLoading } = useGlobalOutcomes(
    lessonIdsList, 
    selectedStudent?.teacherUid ? { uid: selectedStudent.teacherUid } : null
  );

  const modalUnits = useMemo(() => {
    if (selectedModalUnit) return [selectedModalUnit];
    return [];
  }, [selectedModalUnit]);

  useEffect(() => {
    if (!selectedStudent?.teacherUid) return;

    const teacherUid = selectedStudent.teacherUid;

    const fetchTeacherData = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, 'users', teacherUid));
        if (teacherDoc.exists()) {
          setTeacherProfile(teacherDoc.data());
        }

        console.log("Fetching questions for teacher:", teacherUid, "and global pool");
        
        // 1. Fetch Teacher's Local Questions (overrides and custom)
        const localQRef = collection(db, `users/${teacherUid}/lessonQuestions`);
        const localSnap = await getDocs(localQRef);
        const localQ = localSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // 2. Fetch Global Questions
        const globalQRef = collection(db, 'globalQuestions');
        const globalSnap = await getDocs(globalQRef);
        const globalQ = globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // 3. Merge them
        const purelyLocal = localQ.filter(lq => !lq.isOverride && lq.lessonId);
        const merged = globalQ.map(gq => {
          const override = localQ.find(lq => lq.id === gq.id);
          if (override) {
            if (override.deleted) return null;
            return { ...gq, ...override };
          }
          return gq;
        }).filter(Boolean);

        const fetchedQ = [...purelyLocal, ...merged];
        console.log("Merged Questions count:", fetchedQ.length);
        setQuestions(fetchedQ);
      } catch (error) {
        console.error("Error fetching competition data:", error);
      }
    };

    fetchTeacherData();
  }, [selectedStudent?.teacherUid]);

  // Fetch Personal Best for Selected Unit
  useEffect(() => {
    if (!selectedUnitId || !selectedStudent?.id || !selectedStudent?.teacherUid) {
      setPersonalBest(null);
      return;
    }

    const fetchPersonalBest = async () => {
      try {
        const recordRef = doc(db, `users/${selectedStudent.teacherUid}/lessonUnits/${selectedUnitId}/leaderboard`, selectedStudent.id);
        const recordSnap = await getDoc(recordRef);
        if (recordSnap.exists()) {
          setPersonalBest(recordSnap.data());
        } else {
          setPersonalBest(null);
        }
      } catch (error) {
        console.error("Personal best fetch error:", error);
      }
    };

    fetchPersonalBest();
  }, [selectedUnitId, selectedStudent?.id, selectedStudent?.teacherUid]);

  // Fetch EsZit Ranking Data
  useEffect(() => {
    if (!selectedStudent?.teacherUid) return;
    const teacherUid = selectedStudent.teacherUid;
    const path = `users/${teacherUid}/activityScores`;
    
    const dbActivityId = 'es-zit-solo';
    
    const q = query(
      collection(db, path),
      where('activityId', '==', dbActivityId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const bestScores: { [studentId: string]: { studentId: string, studentName: string, totalScore: number, bestCorrectCount: number } } = {};
      
      allScores.forEach((scoreData: any) => {
        if (!bestScores[scoreData.studentId]) {
          bestScores[scoreData.studentId] = {
            studentId: scoreData.studentId,
            studentName: scoreData.studentName || 'Bilinmeyen Öğrenci',
            totalScore: scoreData.totalScore || 0,
            bestCorrectCount: scoreData.score || 0
          };
        } else {
          if ((scoreData.totalScore || 0) > bestScores[scoreData.studentId].totalScore) {
            bestScores[scoreData.studentId].totalScore = scoreData.totalScore || 0;
            bestScores[scoreData.studentId].bestCorrectCount = scoreData.score || 0;
          }
        }
      });

      const rankingArray = Object.values(bestScores).sort((a, b) => b.totalScore - a.totalScore);
      setScores(rankingArray);
    }, (error) => {
      console.error("Error fetching activity ranking:", error);
    });

    return () => unsubscribe();
  }, [selectedStudent?.teacherUid]);

  let displaySubjects = LESSONS.map(l => ({ id: l.id, name: l.label }));

  if (selectedSubject) {
    // If a specific subject is selected from the dropdown, filter by its name
    // The dropdown uses labels like 'Hayat Bilgisi', 'Beden Eğitimi ve Oyun'
    // The subjects in DB might be 'Beden Eğitimi' instead of 'Beden Eğitimi ve Oyun'
    displaySubjects = displaySubjects.filter(s => 
      s.name?.trim().toLowerCase() === selectedSubject.trim().toLowerCase() || 
      (selectedSubject === 'Beden Eğitimi ve Oyun' && s.name?.trim().toLowerCase() === 'beden eğitimi')
    );
  }

  if (isPlayingEsZit && selectedStudent?.teacherUid) {
    return (
      <EsZitSoloGame 
        key={`es-zit-${selectedStudent?.id}-${modalKey}`}
        teacherUid={selectedStudent.teacherUid} 
        student={selectedStudent} 
        onClose={() => setIsPlayingEsZit(false)} 
      />
    );
  }

  const handleStartCompetition = (unit: any, view: 'game' | 'leaderboard' = 'game') => {
    if (view === 'game') {
      const unitQuestions = questions.filter(q => q.unitId === unit.id);
      if (unitQuestions.length === 0) {
        alert("Bu öğrenme alanında hazırlanmış soru yoktur.");
        return;
      }
    }
    // Instead of setting state, just open the modal with the unit pre-selected
    setSelectedModalUnit(unit);
    setModalView(view);
    setModalKey(prev => prev + 1);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Student Selection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Sınıf Yarışmaları</h1>
            <p className="text-neutral-500 font-bold uppercase text-xs tracking-[0.2em]">{teacherProfile?.name || 'Öğretmen'} • Sınıf Sıralaması</p>
          </div>

          {linkedStudents.length > 1 && (
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-2 rounded-[2rem] border-2 border-neutral-100 dark:border-neutral-800 shadow-sm overflow-x-auto no-scrollbar">
              {linkedStudents.map(student => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`px-6 py-3 rounded-full font-black text-sm transition-all whitespace-nowrap ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {student.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Units Display */}
        <div className="space-y-12 pb-16">
          {displaySubjects.map(subject => {
            const expectedLessonId = getLessonIdFromName(subject.name);
            const subjectUnits = units.filter(u => 
              u.lessonId === expectedLessonId || 
              u.lessonId === `lesson-${expectedLessonId}` ||
              u.lessonId === expectedLessonId.replace('lesson-', '')
            );
            
            // Show all units for the subject, regardless of question count
            const visibleUnits = subjectUnits.sort((a,b) => (a.order||0) - (b.order||0));

            if (visibleUnits.length === 0) {
              if (selectedSubject) {
                return (
                  <div key={subject.id} className="flex flex-col items-center justify-center py-20 text-neutral-400 bg-white dark:bg-neutral-900 rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="text-xl font-black uppercase tracking-widest">Bu ders için henüz içerik bulunmuyor</p>
                  </div>
                );
              }
              return null;
            }

            return (
              <div key={subject.id} className="space-y-8">
                {!selectedSubject && (
                  <div className="flex items-center gap-4 px-2">
                    <div className="w-2.5 h-10 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
                    <h2 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{subject.name}</h2>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {visibleUnits.map(unit => {
                    const unitQuestions = questions.filter(q => q.unitId === unit.id);
                    return (
                      <motion.div
                        key={unit.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-200/60 dark:border-neutral-800 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col h-full hover:shadow-[0_20px_50px_rgba(99,102,241,0.12)] hover:scale-[1.02] transition-all group relative overflow-hidden"
                      >
                        {/* Decorative background accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-100/30 transition-colors" />

                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                            <BookOpen size={28} strokeWidth={2.5} />
                          </div>
                          <div className={`px-3 py-1.5 rounded-full border ${unitQuestions.length > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-neutral-100/80 border-neutral-200/50 text-neutral-500'} dark:bg-neutral-800 dark:border-neutral-700`}>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                              {unitQuestions.length} Soru
                            </span>
                          </div>
                        </div>

                        <h3 className="text-xl font-black text-neutral-900 dark:text-white leading-snug mb-8 line-clamp-3 flex-1 relative z-10 min-h-[3.5rem]">
                          {unit.name}
                        </h3>

                        <div className="space-y-3 relative z-10">
                          <button
                            onClick={() => handleStartCompetition(unit, 'game')}
                            className="w-full py-4 bg-[#F3F4F6] hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-2xl font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border-b-4 border-neutral-200 dark:border-neutral-900 group/btn"
                          >
                            <Gamepad2 size={24} className="opacity-70 group-hover/btn:scale-110 transition-transform" />
                            Bilgi Yarışması
                          </button>
                          
                          <button
                            onClick={() => handleStartCompetition(unit, 'leaderboard')}
                            className="w-full py-4 bg-[#FFFAEB] hover:bg-[#FEF3C7] dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-[#92400E] dark:text-amber-400 rounded-2xl font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border-b-4 border-[#FDE68A] dark:border-amber-900/50 hover:border-[#FCD34D]"
                          >
                            <Trophy size={20} className="fill-[#92400E] dark:fill-amber-400" />
                            Sınıf Sıralaması
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

          {/* Special Card for Es & Zıt */}
          {(!selectedSubject || selectedSubject === 'Türkçe') && (
            <motion.div
              layout
              className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-full text-white hover:scale-[1.02] transition-transform cursor-pointer mt-8"
              onClick={() => setIsPlayingEsZit(true)}
            >
              <div className="mb-6">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Zap size={28} className="fill-white" />
                </div>
              </div>
              <h3 className="text-xl font-black text-white leading-tight mb-2">Zıt ve Eş Anlam</h3>
              <p className="text-indigo-100 text-sm font-bold opacity-80 mb-8">Resimli Kelime Yarışı</p>
              
              <div className="mt-auto pt-4">
                <div className="w-full py-4 bg-white text-indigo-600 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                  Şimdi Yarış
                </div>
              </div>
            </motion.div>
          )}

          {/* Full-Screen Ranking Section for Es & Zıt (Optional Toggle) */}
          <AnimatePresence>
            {showEsZitRanking && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-200 dark:border-neutral-800 p-8 shadow-xl mt-8"
              >
                 {/* ... (Existing Ranking Logic) ... */}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isModalOpen && (
              <ClassCompetitionModal
                key={`${selectedModalUnit?.id || 'modal'}-${modalKey}`}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                student={selectedStudent}
                linkedStudents={linkedStudents}
                teacherUid={selectedStudent?.teacherUid}
                units={modalUnits}
                questions={questions}
                allStudents={[]}
                initialView={modalView}
                preSelectedUnit={selectedModalUnit}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };
