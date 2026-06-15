import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, HelpCircle, ArrowRight, X, RefreshCw, CheckCircle2, XCircle, Users, Trophy, Play, Clock, Star, Medal, Trash2, ListChecks } from 'lucide-react';
import { collection, query, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, increment, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { QuestionDisplay } from '../QuestionDisplay';

interface LessonUnitsViewProps {
  lessonId: string;
  lessonLabel: string;
  user: any;
  units: any[];
  questions: any[];
}

type ViewMode = 'idle' | 'class-setup' | 'class-play' | 'class-summary' | 'comp-setup' | 'comp-ready' | 'comp-play' | 'comp-initial-results' | 'comp-final-results' | 'persistent-leaderboard';

export const LessonUnitsView: React.FC<LessonUnitsViewProps> = ({ 
  lessonId,
  lessonLabel,
  user,
  units, 
  questions 
}) => {
  const [students, setStudents] = useState<any[]>([]);
  
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const q = query(collection(db, `users/${user.uid}/students`));
        const snap = await getDocs(q);
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchData();
  }, [user]);

  const [mode, setMode] = useState<ViewMode>('idle');
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Shared Question State
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  const [userAnswer, setUserAnswer] = useState<any>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  // Class Activity State
  const classQueueRef = useRef<string[]>([]);
  const [classResults, setClassResults] = useState<{studentId: string, correct: boolean}[]>([]);

  // Competition State
  const compQueueRef = useRef<string[]>([]);
  const [compResults, setCompResults] = useState<Record<string, { correct: number, timeMs: number }>>({});
  const [currentCompQuestionIndex, setCurrentCompQuestionIndex] = useState(0);
  const [compStartTime, setCompStartTime] = useState(0);
  const [persistentLeaderboard, setPersistentLeaderboard] = useState<any[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch persistent leaderboard when in that mode
  useEffect(() => {
    if (mode !== 'persistent-leaderboard' || !selectedUnit || !user) return;

    const fetchData = async () => {
      try {
        const leaderboardRef = collection(db, `users/${user.uid}/lessonUnits/${selectedUnit.id}/leaderboard`);
        const snapshot = await getDocs(leaderboardRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by score (desc), then time (asc)
        data.sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeMs - b.timeMs;
        });
        setPersistentLeaderboard(data);
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
      }
    };
    fetchData();
  }, [mode, selectedUnit, user]);

  const handleResetLeaderboard = async () => {
    if (!selectedUnit || !user) return;
    setIsResetting(true);

    try {
      const leaderboardRef = collection(db, `users/${user.uid}/lessonUnits/${selectedUnit.id}/leaderboard`);
      const snapshot = await getDocs(leaderboardRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Error resetting leaderboard:", error);
    } finally {
      setIsResetting(false);
    }
  };

  const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const getRandomQuestion = (unitId: string, excludeIds: string[] = []) => {
    const unitQuestions = questions.filter(q => q.unitId === unitId && !excludeIds.includes(q.id));
    if (unitQuestions.length === 0) {
      const allUnitQuestions = questions.filter(q => q.unitId === unitId);
      return allUnitQuestions[Math.floor(Math.random() * allUnitQuestions.length)];
    }
    return unitQuestions[Math.floor(Math.random() * unitQuestions.length)];
  };

  const setupQuestion = (q: any) => {
    setCurrentQuestion(q);
    setHasSubmitted(false);
    setUserAnswer(q?.type === 'matching' ? {} : '');
    setIsCorrect(false);
  };

  const awardStar = async (studentId: string, amount: number, description: string) => {
    if (amount <= 0 || !user) return;
    
    // Standardize category name
    let category = lessonLabel;
    if (!category.endsWith(' Yıldızı')) {
      category = `${lessonLabel} Yıldızı`;
    }

    try {
      const studentRef = doc(db, `users/${user.uid}/students/${studentId}`);
      await updateDoc(studentRef, {
        stars: increment(amount),
        starHistory: arrayUnion({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          category: category,
          description: description,
          amount: amount,
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.error("Error awarding star:", err);
    }
  };

  // --- Class Activity ---
  const startClassActivitySetup = (unit: any) => {
    setSelectedUnit(unit);
    setSelectedStudentIds(students.map(s => s.id));
    setMode('class-setup');
  };

  const startClassActivity = () => {
    if (selectedStudentIds.length === 0) {
      setErrorMessage("Lütfen en az bir öğrenci seçin.");
      return;
    }
    setErrorMessage(null);
    const queue = shuffle([...selectedStudentIds]);
    classQueueRef.current = queue;
    setClassResults([]);
    nextClassStudent();
  };

  const nextClassStudent = () => {
    const queue = classQueueRef.current;
    if (queue.length === 0) {
      setMode('class-summary');
    } else {
      const nextStudent = queue[0];
      setCurrentStudentId(nextStudent);
      classQueueRef.current = queue.slice(1);
      setupQuestion(getRandomQuestion(selectedUnit.id));
      setMode('class-play');
    }
  };

  const handleClassSubmit = async (finalAnswer?: any) => {
    if (!currentQuestion || hasSubmitted) return;
    
    const answerToCheck = finalAnswer !== undefined ? finalAnswer : userAnswer;
    
    let correct = false;
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
      correct = answerToCheck === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'fill-in-the-blanks') {
      correct = answerToCheck?.toString().trim().toLocaleLowerCase('tr-TR') === currentQuestion.correctAnswer.trim().toLocaleLowerCase('tr-TR');
    } else if (currentQuestion.type === 'matching') {
      const matches = answerToCheck || {};
      correct = currentQuestion.pairs.every((p: any) => matches[p.left] === p.right) && 
                Object.keys(matches).length === currentQuestion.pairs.length;
    }
    
    setIsCorrect(correct);
    setHasSubmitted(true);
    setClassResults(prev => [...prev, { studentId: currentStudentId!, correct }]);

    if (correct) {
      await awardStar(currentStudentId!, 1, currentQuestion.text);
    }
  };

  // --- Competition ---
  const startCompSetup = (unit: any) => {
    setSelectedUnit(unit);
    setSelectedStudentIds([]);
    setMode('comp-setup');
  };

  const startCompetition = () => {
    if (selectedStudentIds.length < 2 || selectedStudentIds.length > 5) {
      setErrorMessage("Lütfen en az 2, en fazla 5 öğrenci seçin.");
      return;
    }
    setErrorMessage(null);
    const queue = shuffle([...selectedStudentIds]);
    compQueueRef.current = queue;
    setCompResults({});
    nextCompParticipant();
  };

  const nextCompParticipant = () => {
    const queue = compQueueRef.current;
    if (queue.length === 0) {
      setMode('comp-initial-results');
    } else {
      const nextParticipant = queue[0];
      setCurrentStudentId(nextParticipant);
      compQueueRef.current = queue.slice(1);
      setCurrentCompQuestionIndex(0);
      setMode('comp-ready');
    }
  };

  const startCompParticipant = () => {
    setCompStartTime(Date.now());
    setupQuestion(getRandomQuestion(selectedUnit.id));
    setMode('comp-play');
  };

  const handleCompSubmit = (finalAnswer?: any) => {
    if (!currentQuestion || hasSubmitted) return;
    
    const answerToCheck = finalAnswer !== undefined ? finalAnswer : userAnswer;
    
    let correct = false;
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
      correct = answerToCheck === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'fill-in-the-blanks') {
      correct = answerToCheck?.toString().trim().toLocaleLowerCase('tr-TR') === currentQuestion.correctAnswer.trim().toLocaleLowerCase('tr-TR');
    } else if (currentQuestion.type === 'matching') {
      const matches = answerToCheck || {};
      correct = currentQuestion.pairs.every((p: any) => matches[p.left] === p.right) && 
                Object.keys(matches).length === currentQuestion.pairs.length;
    }
    
    setIsCorrect(correct);
    setHasSubmitted(true);

    setCompResults(prev => {
      const current = prev[currentStudentId!] || { correct: 0, timeMs: 0 };
      return {
        ...prev,
        [currentStudentId!]: {
          ...current,
          correct: current.correct + (correct ? 1 : 0)
        }
      };
    });

    setTimeout(() => {
      if (currentCompQuestionIndex < 4) {
        setCurrentCompQuestionIndex(prev => prev + 1);
        setupQuestion(getRandomQuestion(selectedUnit.id, [currentQuestion.id]));
      } else {
        const timeMs = Date.now() - compStartTime;
        setCompResults(prev => ({
          ...prev,
          [currentStudentId!]: {
            ...prev[currentStudentId!],
            timeMs
          }
        }));
        nextCompParticipant();
      }
    }, 1500);
  };

  const handleShowFinalResults = async () => {
    setMode('comp-final-results');
  };

  const finishCompetition = async () => {
    const resultsArray = Object.values(compResults) as { correct: number, timeMs: number }[];
    const totalCorrect = resultsArray.reduce((sum, r) => sum + r.correct, 0);
    const N = selectedStudentIds.length;
    const starAwards = [
      Math.floor(totalCorrect * 2),
      Math.floor(totalCorrect),
      Math.floor(totalCorrect / 2),
      Math.floor(totalCorrect / N),
      Math.floor((totalCorrect / N) / 2)
    ];

    const sortedParticipants = [...selectedStudentIds].sort((a, b) => {
      const resA = compResults[a] || { correct: 0, timeMs: 0 };
      const resB = compResults[b] || { correct: 0, timeMs: 0 };
      if (resB.correct !== resA.correct) return resB.correct - resA.correct;
      return resA.timeMs - resB.timeMs;
    });

    for (let i = 0; i < sortedParticipants.length; i++) {
      const studentId = sortedParticipants[i];
      const stars = starAwards[i] || 0;
      if (stars > 0) {
        await awardStar(studentId, stars, `${selectedUnit?.name || 'Ünite'} - Yarışma Ödülü`);
      }
    }
    
    setMode('idle');
  };

  const isSubmitDisabled = () => {
    if (!currentQuestion) return true;
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') return !userAnswer;
    if (currentQuestion.type === 'fill-in-the-blanks') return !userAnswer?.toString().trim();
    if (currentQuestion.type === 'matching') return Object.keys(userAnswer || {}).length !== currentQuestion.pairs.length;
    return true;
  };

  const renderQuestionArea = () => {
    const student = students.find(s => s.id === currentStudentId);
    return (
      <div className="space-y-3 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black text-lg shadow-md border border-indigo-400">
            <span className="opacity-80 text-[10px] mr-2 uppercase tracking-widest font-bold">Sıra:</span>
            {student?.name}
          </div>
          {mode === 'comp-play' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="font-black text-lg text-amber-600">Soru {currentCompQuestionIndex + 1} </span>
              <span className="font-bold text-amber-500 opacity-60 text-[10px]">/ 5</span>
            </div>
          )}
        </div>

        <QuestionDisplay
          question={currentQuestion}
          userAnswer={userAnswer}
          onAnswerChange={(val) => {
            setUserAnswer(val);
            if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
              if (mode === 'class-play') handleClassSubmit(val);
              else if (mode === 'comp-play') handleCompSubmit(val);
            } else if (currentQuestion.type === 'matching') {
              if (Object.keys(val || {}).length === currentQuestion.pairs.length) {
                if (mode === 'class-play') handleClassSubmit(val);
                else if (mode === 'comp-play') handleCompSubmit(val);
              }
            }
          }}
          onAnswerSubmit={(val) => {
            if (mode === 'class-play') handleClassSubmit(val);
            else if (mode === 'comp-play') handleCompSubmit(val);
          }}
          hasSubmitted={hasSubmitted}
          isCorrect={isCorrect}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...units].sort((a, b) => (a.order || 0) - (b.order || 0)).map(unit => {
          const unitQuestions = questions.filter(q => q.unitId === unit.id);
          const hasQuestions = unitQuestions.length > 0;

          return (
            <motion.div
              key={unit.id}
              whileHover={{ y: -4 }}
              className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm transition-all ${
                hasQuestions 
                  ? 'border-indigo-100 shadow-indigo-100/50' 
                  : 'border-neutral-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                  {unit.unitNo}
                </div>
                {hasQuestions && (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold flex items-center gap-1">
                    <HelpCircle size={14} />
                    {unitQuestions.length} Soru
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-neutral-800 leading-tight mb-2">
                {unit.name}
              </h3>
              
              {hasQuestions ? (
                <div className="flex flex-col gap-3 mt-6">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startClassActivitySetup(unit); }} 
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-4 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-2xl font-black text-sm shadow-[0_4px_0_0_rgba(79,70,229,0.3)] hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-[0_0px_0_0_rgba(79,70,229,0.3)] transition-all"
                    >
                      <Users size={20} className="mb-1 text-indigo-100" /> Sınıf Etkinliği
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); startCompSetup(unit); }} 
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl font-black text-sm shadow-[0_4px_0_0_rgba(245,158,11,0.3)] hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-[0_0px_0_0_rgba(245,158,11,0.3)] transition-all"
                    >
                      <Trophy size={20} className="mb-1 text-amber-100" /> Yarışma
                    </button>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedUnit(unit);
                      setMode('persistent-leaderboard'); 
                    }} 
                    className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-black text-sm hover:bg-neutral-200 transition-colors"
                  >
                    <ListChecks size={18} /> Tüm Sonuçları Gör
                  </button>
                </div>
              ) : (
                <div className="mt-8 text-sm font-bold text-neutral-400 text-center p-4 border-2 border-dashed border-neutral-200 rounded-2xl">
                  Etkinlik yok
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {mode !== 'idle' && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`bg-white rounded-3xl shadow-2xl w-full max-h-[96vh] flex flex-col overflow-hidden transition-all duration-300 ${mode === 'class-setup' || mode === 'comp-setup' ? 'max-w-6xl' : 'max-w-4xl'}`}
            >
              {/* Header */}
              {(mode === 'class-play' || mode === 'comp-play' || mode === 'class-setup' || mode === 'comp-setup' || mode === 'persistent-leaderboard') && (
                <div className="p-3 md:p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
                  <div className="flex items-center gap-3 text-neutral-800">
                    <Layers size={18} className="text-indigo-500" />
                    <h3 className="font-black text-base md:text-lg">{selectedUnit?.name}</h3>
                  </div>
                  <button 
                    onClick={() => setMode('idle')}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-neutral-50/30">
                {errorMessage && (
                  <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100 flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-100 rounded-lg transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {mode === 'class-setup' && (
                  <div>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 bg-indigo-50/50 p-6 md:p-8 rounded-[2rem] border border-indigo-100/50">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-2xl flex items-center justify-center transform -rotate-3 shadow-sm shrink-0">
                          <Users size={32} />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-2xl md:text-3xl text-neutral-900 mb-1">
                            Sınıf Etkinliği Seçimi
                          </h4>
                          <p className="text-neutral-500 font-bold text-sm md:text-base">Bu macerada kimler yer alacak?</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setSelectedStudentIds(students.map(s => s.id))} className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-bold shadow-sm hover:shadow transition-all border border-indigo-100">Tümünü Seç</button>
                        <button onClick={() => setSelectedStudentIds([])} className="px-5 py-2.5 bg-white text-neutral-600 rounded-xl font-bold shadow-sm hover:shadow transition-all border border-neutral-200">Tümünü Kaldır</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {students.map(s => (
                        <label key={s.id} className={`flex items-center gap-2 p-2 border-[2px] rounded-xl cursor-pointer transition-all h-[3.5rem] select-none ${selectedStudentIds.includes(s.id) ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-200 hover:border-indigo-300 hover:bg-neutral-50'}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedStudentIds(prev => [...prev, s.id]);
                              else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <span className="font-bold text-neutral-700 text-[11px] leading-tight flex-1 line-clamp-2" style={{ wordBreak: 'break-word' }}>{s.name}</span>
                        </label>
                      ))}
                    </div>
                    <button 
                      onClick={startClassActivity}
                      disabled={selectedStudentIds.length === 0}
                      className="mt-8 w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-2xl disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-indigo-200"
                    >
                      ETKİNLİĞİ BAŞLAT ({selectedStudentIds.length} Öğrenci)
                    </button>
                  </div>
                )}

                {mode === 'comp-setup' && (
                  <div>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 bg-amber-50/50 p-6 md:p-8 rounded-[2rem] border border-amber-100/50">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-500 rounded-2xl flex items-center justify-center transform rotate-3 shadow-sm shrink-0">
                          <Trophy size={32} />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-2xl md:text-3xl text-neutral-900 mb-1">
                            Büyük Yarışma
                          </h4>
                          <p className="text-neutral-500 font-bold text-sm md:text-base">Şampiyonlar ligine kimler katılacak? (2 - 5 öğrenci)</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {/* We don't have "select all" for competition since limit is 5 */}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {students.map(s => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        const isDisabled = !isSelected && selectedStudentIds.length >= 5;
                        return (
                          <label key={s.id} className={`flex items-center gap-2 p-2 border-[2px] rounded-xl cursor-pointer transition-all h-[3.5rem] select-none ${isSelected ? 'border-amber-500 bg-amber-50' : isDisabled ? 'border-neutral-200 opacity-50 cursor-not-allowed bg-neutral-50' : 'border-neutral-200 hover:border-amber-300 hover:bg-neutral-50'}`}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedStudentIds(prev => [...prev, s.id]);
                                else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                              }}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="font-bold text-neutral-700 text-[11px] leading-tight flex-1 line-clamp-2" style={{ wordBreak: 'break-word' }}>{s.name}</span>
                          </label>
                        )
                      })}
                    </div>
                    <button 
                      onClick={startCompetition}
                      disabled={selectedStudentIds.length < 2 || selectedStudentIds.length > 5}
                      className="mt-8 w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-2xl disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-amber-200"
                    >
                      YARIŞMAYI BAŞLAT ({selectedStudentIds.length} Öğrenci)
                    </button>
                  </div>
                )}

                {mode === 'comp-ready' && (
                  <div className="text-center py-20 px-8 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.2),transparent_50%)] pointer-events-none" />
                    <motion.div 
                      animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="mx-auto text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-8 flex justify-center"
                    >
                      <Trophy size={100} />
                    </motion.div>
                    <h2 className="text-6xl font-black text-white mb-4 drop-shadow-md">
                      {students.find(s => s.id === currentStudentId)?.name}
                    </h2>
                    <p className="text-2xl text-white/90 font-bold mb-16 drop-shadow-sm uppercase tracking-widest">Sıra Sende! Hazır olduğunda başla.</p>
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.95, y: 4 }}
                      onClick={startCompParticipant} 
                      className="px-20 py-8 bg-white text-indigo-600 rounded-[3rem] font-black text-4xl shadow-[0_10px_0_0_rgba(255,255,255,0.3)] hover:shadow-[0_10px_0_0_rgba(255,255,255,0.5)] active:shadow-[0_0px_0_0_rgba(255,255,255,0)] transition-all"
                    >
                      BAŞLA
                    </motion.button>
                  </div>
                )}

                {(mode === 'class-play' || mode === 'comp-play') && renderQuestionArea()}

                {mode === 'class-summary' && (
                  <div className="text-center py-16 bg-white rounded-[3rem] shadow-xl border-b-[8px] border-emerald-200">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3"
                    >
                      <CheckCircle2 size={64} />
                    </motion.div>
                    <h2 className="text-5xl font-black text-neutral-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Etkinlik Tamamlandı!</h2>
                    <p className="text-2xl text-neutral-500 font-bold mb-12">
                      Seçilen tüm öğrenciler sorularını cevapladı.
                    </p>
                    <div className="max-w-xl mx-auto bg-neutral-50 rounded-[2rem] p-8 border-b-[6px] border-neutral-200 flex flex-col gap-4">
                      <div className="flex justify-between items-center px-4 py-2 bg-white rounded-xl shadow-sm">
                        <span className="font-black text-neutral-600 uppercase tracking-widest text-sm">Toplam Öğrenci</span>
                        <span className="font-black text-3xl text-neutral-800">{classResults.length}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-white rounded-xl shadow-sm">
                        <span className="font-black text-neutral-600 uppercase tracking-widest text-sm">Doğru Cevap</span>
                        <span className="font-black text-3xl text-emerald-600">{classResults.filter(r => r.correct).length}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-white rounded-xl shadow-sm">
                        <span className="font-black text-neutral-600 uppercase tracking-widest text-sm">Kazanılan Yıldız</span>
                        <span className="font-black text-3xl text-amber-500">{classResults.filter(r => r.correct).length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'comp-initial-results' && (
                  <div className="max-w-3xl mx-auto py-12">
                    <div className="text-center mb-12">
                      <h2 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600">Yarışma Sonuçları</h2>
                      <p className="text-xl text-neutral-500 font-bold">Kimin ne kadar doğru yaptığına bir bakalım!</p>
                    </div>
                    <div className="space-y-2">
                      {[...selectedStudentIds].sort((a, b) => compResults[b].correct - compResults[a].correct).map((id, index) => {
                        const student = students.find(s => s.id === id);
                        const res = compResults[id];
                        return (
                          <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            key={id} 
                            className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border-b-[4px] border-indigo-100 transition-transform hover:scale-[1.01]"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-100 text-neutral-400 rounded-xl flex items-center justify-center font-black text-lg">
                                #{index + 1}
                              </div>
                              <span className="text-xl font-black text-neutral-800">{student?.name}</span>
                            </div>
                            <div className="px-4 py-1.5 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                              <span className="text-xl font-black text-emerald-600">{res.correct} </span>
                              <span className="text-emerald-500 font-bold uppercase tracking-widest text-[10px]">Doğru</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mode === 'comp-final-results' && (
                  <div className="max-w-4xl mx-auto py-12">
                    <div className="text-center mb-16 relative">
                      <motion.div 
                        animate={{ scale: [1, 1.05, 1] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-amber-200 rounded-full blur-[100px] -z-10 opacity-50"
                      />
                      <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 mb-6 drop-shadow-sm">GERÇEK SIRALAMA</h2>
                      <p className="text-xl text-orange-800 font-black bg-orange-100 border-2 border-orange-200 inline-block px-8 py-3 rounded-full shadow-sm">
                        EN ÇOK YILDIZI, EN ÇOK DOĞRUYU EN HIZLI BİLEN KAZANIR!
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      {[...selectedStudentIds]
                        .sort((a, b) => {
                          const resA = compResults[a] || { correct: 0, timeMs: 0 };
                          const resB = compResults[b] || { correct: 0, timeMs: 0 };
                          if (resB.correct !== resA.correct) return resB.correct - resA.correct;
                          return resA.timeMs - resB.timeMs;
                        })
                        .map((id, index) => {
                          const student = students.find(s => s.id === id);
                          const res = compResults[id] || { correct: 0, timeMs: 0 };
                          const resultsArray = Object.values(compResults) as { correct: number, timeMs: number }[];
                          const totalCorrect = resultsArray.reduce((sum, r) => sum + r.correct, 0);
                          const N = selectedStudentIds.length;
                          const starAwards = [
                            Math.floor(totalCorrect * 2),
                            Math.floor(totalCorrect),
                            Math.floor(totalCorrect / 2),
                            Math.floor(totalCorrect / N),
                            Math.floor((totalCorrect / N) / 2)
                          ];
                          const stars = starAwards[index] || 0;

                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: -50, scale: 0.9 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ delay: index * 0.15, type: "spring", bounce: 0.4 }}
                              key={id} 
                              className={`flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 rounded-[1.5rem] border-b-[4px] transition-transform hover:scale-[1.01] ${
                                index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-100 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 
                                index === 1 ? 'bg-neutral-50 border-neutral-200' :
                                index === 2 ? 'bg-orange-50 border-orange-100' :
                                'bg-white border-neutral-100'
                              }`}
                            >
                              <div className="flex items-center gap-4 w-full sm:w-auto mb-2 sm:mb-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-sm ${
                                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white -rotate-6' :
                                  index === 1 ? 'bg-gradient-to-br from-neutral-300 to-neutral-500 text-white -rotate-3' :
                                  index === 2 ? 'bg-gradient-to-br from-orange-300 to-rose-400 text-white rotate-3' :
                                  'bg-neutral-100 text-neutral-400'
                                }`}>
                                  #{index + 1}
                                </div>
                                <span className="text-xl font-black text-neutral-900">{student?.name}</span>
                              </div>
                              <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end w-full sm:w-auto bg-white/50 backdrop-blur-sm sm:bg-transparent p-2 sm:p-0 rounded-xl">
                                <div className="text-center">
                                  <div className="text-[9px] uppercase font-black tracking-widest text-neutral-400 mb-0.5">Doğru</div>
                                  <div className="text-lg font-black text-emerald-600">{res.correct} <span className="text-xs opacity-50">/{questions.length}</span></div>
                                </div>
                                <div className="w-px h-8 bg-neutral-200 hidden sm:block"></div>
                                <div className="text-center">
                                  <div className="text-[9px] uppercase font-black tracking-widest text-neutral-400 mb-0.5">Süre</div>
                                  <div className="text-lg font-black text-blue-500 flex items-center justify-center gap-1">
                                    {(res.timeMs / 1000).toFixed(1)}s
                                  </div>
                                </div>
                                {stars > 0 && (
                                  <>
                                    <div className="w-px h-8 bg-neutral-200 hidden sm:block"></div>
                                    <div className="text-center bg-white px-3 py-1 rounded-xl shadow-sm border border-amber-100">
                                      <div className="text-[9px] uppercase font-black tracking-widest text-amber-500 mb-0.5">Kazanılan</div>
                                      <div className="text-lg font-black text-amber-500 flex items-center justify-center gap-1">
                                        +{stars} <Star size={16} className="fill-amber-500" />
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                    
                    <div className="mt-16 text-center">
                      <button 
                        onClick={finishCompetition}
                        className="px-16 py-6 bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-[2rem] font-black text-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.5)] hover:shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_0px_0_0_rgba(0,0,0,0)] hover:translate-y-1 active:translate-y-2 transition-all inline-flex items-center gap-3"
                      >
                        <Trophy size={28} />
                        KAZANANLARA YILDIZLARINI VER
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'persistent-leaderboard' && (
                  <div className="max-w-4xl mx-auto py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 rounded-2xl flex items-center justify-center -rotate-3 shadow-sm">
                          <Trophy size={28} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-neutral-900 drop-shadow-sm">Şampiyonlar Tablosu</h2>
                          <p className="text-neutral-500 font-bold text-sm">Bu ünitenin en iyileri kimler?</p>
                        </div>
                      </div>
                      {!showResetConfirm ? (
                        <button
                          onClick={() => setShowResetConfirm(true)}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-colors border-2 border-rose-100"
                        >
                          <Trash2 size={20} /> Sıralamayı Sıfırla
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 bg-red-50 p-3 rounded-2xl border-2 border-red-200">
                          <span className="text-sm font-black text-rose-600 uppercase tracking-widest px-2">Emin misin?</span>
                          <button
                            onClick={handleResetLeaderboard}
                            disabled={isResetting}
                            className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                          >
                            {isResetting ? 'Sıfırlanıyor...' : 'Evet, Sıfırla'}
                          </button>
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            disabled={isResetting}
                            className="px-6 py-3 bg-white text-neutral-700 rounded-xl font-bold hover:bg-neutral-100 border-2 border-neutral-200 transition-colors disabled:opacity-50"
                          >
                            Vazgeç
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {persistentLeaderboard.map((entry, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={entry.id} 
                          className={`flex items-center justify-between p-2 sm:p-3 rounded-2xl border-[2px] transition-transform hover:scale-[1.01] ${
                            idx === 0 ? 'bg-amber-50 border-amber-300 shadow-sm z-10' :
                            idx === 1 ? 'bg-neutral-50 border-neutral-300 shadow-sm' :
                            idx === 2 ? 'bg-orange-50 border-orange-200 shadow-sm' :
                            'bg-white border-neutral-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-base shadow-sm ${
                              idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white -rotate-6' :
                              idx === 1 ? 'bg-gradient-to-br from-neutral-400 to-neutral-600 text-white -rotate-3' :
                              idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white rotate-3' :
                              'bg-neutral-100 text-neutral-400'
                            }`}>
                              #{idx + 1}
                            </div>
                            <p className="font-black text-neutral-900 text-lg">{entry.studentName}</p>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 text-right bg-white/50 px-3 py-1.5 rounded-xl">
                            <div>
                              <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Skor</p>
                              <p className="font-black text-emerald-600 text-lg">{entry.score}<span className="text-xs text-emerald-600/50">/{entry.totalQuestions}</span></p>
                            </div>
                            <div className="w-px h-6 bg-neutral-200" />
                            <div>
                              <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Süre</p>
                              <p className="font-black text-blue-500 text-lg">{(entry.timeMs / 1000).toFixed(1)}s</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {persistentLeaderboard.length === 0 && (
                        <div className="p-16 text-center bg-neutral-50 rounded-[3rem] border-4 border-dashed border-neutral-200">
                          <Trophy size={64} className="mx-auto text-neutral-300 mb-6" />
                          <h3 className="text-2xl font-black text-neutral-400">Henüz kimse yarışmadı</h3>
                          <p className="text-neutral-400 font-bold mt-2">Bu ünitenin ilk şampiyonu kim olacak?</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {(mode === 'class-play' || mode === 'comp-play' || mode === 'comp-initial-results' || mode === 'class-summary' || mode === 'comp-final-results' || mode === 'persistent-leaderboard') && (
                <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
                  {mode === 'class-play' && (
                    !hasSubmitted ? (
                      <button 
                        onClick={handleClassSubmit} 
                        disabled={isSubmitDisabled()}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-xl shadow-[0_4px_0_0_rgba(79,70,229,0.5)] active:shadow-[0_0px_0_0_rgba(79,70,229,0.5)] active:translate-y-[4px] transition-all disabled:opacity-50"
                      >
                        Cevapla
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xl ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                          {isCorrect ? 'Doğru!' : 'Yanlış!'}
                        </div>
                        <button 
                          onClick={nextClassStudent}
                          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-xl shadow-[0_4px_0_0_rgba(79,70,229,0.5)] active:shadow-[0_0px_0_0_rgba(79,70,229,0.5)] active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                        >
                          Sonraki <ArrowRight size={20} />
                        </button>
                      </div>
                    )
                  )}
                  {mode === 'comp-play' && (
                    !hasSubmitted ? (
                      <button 
                        onClick={handleCompSubmit} 
                        disabled={isSubmitDisabled()}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-black text-xl shadow-[0_4px_0_0_rgba(245,158,11,0.5)] active:shadow-[0_0px_0_0_rgba(245,158,11,0.5)] active:translate-y-[4px] transition-all disabled:opacity-50"
                      >
                        Cevapla
                      </button>
                    ) : (
                      <div className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xl ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                        {isCorrect ? 'Doğru!' : 'Yanlış!'}
                      </div>
                    )
                  )}
                  {mode === 'comp-initial-results' && (
                    <button 
                      onClick={handleShowFinalResults}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-black text-xl shadow-[0_4px_0_0_rgba(245,158,11,0.5)] active:shadow-[0_0px_0_0_rgba(245,158,11,0.5)] active:translate-y-[4px] transition-all"
                    >
                      GERÇEK SIRALAMAYI BELİRLE
                    </button>
                  )}
                  {(mode === 'class-summary' || mode === 'comp-final-results' || mode === 'persistent-leaderboard') && (
                    <button 
                      onClick={() => setMode('idle')}
                      className="w-full py-3 bg-neutral-200 text-neutral-700 rounded-xl font-black text-xl hover:bg-neutral-300 transition-all border-[3px] border-neutral-300 active:translate-y-1 shadow-sm"
                    >
                      Kapat
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
