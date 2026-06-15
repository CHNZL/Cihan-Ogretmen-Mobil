import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, CheckCircle2, XCircle, Play, ArrowRight, Star, X, Medal, Timer, BookOpen } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { QuestionDisplay } from './QuestionDisplay';

interface ClassCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  linkedStudents: any[];
  teacherUid: string;
  units: any[];
  questions: any[];
  allStudents: any[];
  initialView?: 'game' | 'leaderboard';
  preSelectedUnit?: any;
}

export const ClassCompetitionModal: React.FC<ClassCompetitionModalProps> = ({
  isOpen,
  onClose,
  student,
  linkedStudents,
  teacherUid,
  units,
  questions,
  allStudents,
  initialView = 'game',
  preSelectedUnit
}) => {
  const [activeStudent, setActiveStudent] = useState<any>(student);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [gameState, setGameState] = useState<'student-selection' | 'selection' | 'playing' | 'finished' | 'leaderboard'>('selection');
  const [gameQuestions, setGameQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [personalBest, setPersonalBest] = useState<any>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [canAnswer, setCanAnswer] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'correct' | 'wrong') => {
    try {
      const audio = new Audio(type === 'correct' 
        ? 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' // Short Applause
        : 'https://assets.mixkit.co/active_storage/sfx/2959/2959-preview.mp3' // Clear Buzzer
      );
      audio.volume = 0.3;
      audio.play().catch(e => {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        
        if (type === 'correct') {
          // Cheerful chime if applause fails
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.connect(gain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.1));
            gain.gain.setValueAtTime(0.1, ctx.currentTime + (i * 0.1));
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i * 0.1) + 0.3);
            osc.start(ctx.currentTime + (i * 0.1));
            osc.stop(ctx.currentTime + (i * 0.1) + 0.3);
          });
        } else {
          // Classic "Daat" buzzer sound
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.setValueAtTime(110, ctx.currentTime);
          osc2.frequency.setValueAtTime(115, ctx.currentTime);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 0.6);
          osc2.stop(ctx.currentTime + 0.6);
        }
      });
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  // Initialize game state based on linked students
  useEffect(() => {
    if (!isOpen) return;
    
    // NEW: If a unit is specifically selected for the modal, start game directly.
    if (preSelectedUnit && initialView === 'game') {
      handleStartGame(preSelectedUnit);
      return;
    }

    if (initialView === 'leaderboard') {
      setActiveStudent(student);
      if (units.length === 1) {
        setSelectedUnit(units[0]);
        setGameState('leaderboard');
      } else {
        setGameState('selection');
      }
    } else if (linkedStudents && linkedStudents.length > 1) {
      setGameState('student-selection');
    } else {
      setActiveStudent(student);
      if (units.length === 1) { 
        handleStartGame(units[0]);
      } else {
        setGameState('selection');
      }
    }
  }, [isOpen, linkedStudents, student, units, initialView, preSelectedUnit]);

  // Fetch leaderboard for selected unit
  useEffect(() => {
    if (!selectedUnit || !teacherUid) return;

    const fetchLeaderboard = async () => {
      try {
        const leaderboardRef = collection(db, `users/${teacherUid}/lessonUnits/${selectedUnit.id}/leaderboard`);
        const snapshot = await getDocs(leaderboardRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by score (desc), then time (asc)
        data.sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeMs - b.timeMs;
        });
        setLeaderboard(data);
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
      }
    };
    
    fetchLeaderboard();

    // Fetch student's personal best
    if (activeStudent) {
      const bestRef = doc(db, `users/${teacherUid}/lessonUnits/${selectedUnit.id}/leaderboard`, activeStudent.id);
      getDoc(bestRef).then(snap => {
        if (snap.exists()) setPersonalBest(snap.data());
        else setPersonalBest(null);
      });
    }
  }, [selectedUnit, teacherUid, activeStudent]);

  const handleStudentSelect = (selected: any) => {
    setActiveStudent(selected);
    if (units.length === 1) {
      handleStartGame(units[0]);
    } else {
      setGameState('selection');
    }
  };

  const handleStartGame = (unit: any) => {
    const unitQuestions = questions.filter(q => q.unitId === unit.id);
    if (unitQuestions.length === 0) {
      return;
    }

    // Select 10 random questions (or less if not enough)
    const shuffled = [...unitQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    setSelectedUnit(unit);
    setGameQuestions(selected);
    setCurrentQuestionIndex(0);
    scoreRef.current = 0;
    setScore(0);
    setStartTime(Date.now());
    setGameState('playing');
    setUserAnswer(selected[0]?.type === 'matching' ? {} : null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setCanAnswer(true);
  };

  const handleAnswer = (answer: any) => {
    if (isAnswerChecked || gameState !== 'playing' || !canAnswer) return;
    
    setCanAnswer(false);
    setIsAnswerChecked(true);
    setUserAnswer(answer);
    
    const currentQ = gameQuestions[currentQuestionIndex];
    let correct = false;
    
    if (currentQ.type === 'multiple-choice' || currentQ.type === 'true-false') {
      correct = answer === currentQ.correctAnswer;
    } else if (currentQ.type === 'fill-in-the-blanks') {
      correct = answer?.toString().trim().toLocaleLowerCase('tr-TR') === currentQ.correctAnswer.trim().toLocaleLowerCase('tr-TR');
    } else if (currentQ.type === 'matching') {
      const matches = answer || {};
      correct = currentQ.pairs.every((p: any) => matches[p.left] === p.right) && 
                Object.keys(matches).length === currentQ.pairs.length;
    }

    setIsCorrect(correct);
    playSound(correct ? 'correct' : 'wrong');
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }

    const isLastQuestion = currentQuestionIndex === gameQuestions.length - 1;

    if (isLastQuestion) {
      // Save score immediately for the last question to prevent data loss
      finishGame(scoreRef.current);
    }

    setTimeout(() => {
      if (!isLastQuestion) {
        const nextIndex = currentQuestionIndex + 1;
        const nextQ = gameQuestions[nextIndex];
        setCurrentQuestionIndex(nextIndex);
        setUserAnswer(nextQ.type === 'matching' ? {} : null);
        setIsAnswerChecked(false);
        setIsCorrect(false);
        // Add a small delay for user to stabilize before they can answer again
        setTimeout(() => setCanAnswer(true), 500);
      } else {
        setGameState('finished');
      }
    }, 1500);
  };

  const finishGame = async (finalCorrectCount: number) => {
    const end = Date.now();
    setEndTime(end);
    const timeMs = end - startTime;
    const timeSeconds = timeMs / 1000;

    // SCORING FORMULA:
    // Base: 90 points per correct answer (900 max)
    // Speed: Up to 100 points bonus based on time (if finished within 5 mins)
    const baseScore = finalCorrectCount * 90;
    const speedBonus = Math.max(0, Math.floor(((300 - timeSeconds) / 300) * 100));
    const finalScore = baseScore + speedBonus;

    setScore(finalScore);

    // Save score if it's a personal best
    try {
      const recordRef = doc(db, `users/${teacherUid}/lessonUnits/${selectedUnit.id}/leaderboard`, activeStudent.id);
      const recordSnap = await getDoc(recordRef);

      let isNewBest = true;
      if (recordSnap.exists()) {
        const existingData = recordSnap.data();
        // If existing data has a higher or equal score, it's not a new best
        if (existingData.score >= finalScore) {
          isNewBest = false;
        }
      }

      setIsNewRecord(isNewBest);

      if (isNewBest) {
        setPersonalBest({ 
          score: finalScore, 
          correctCount: finalCorrectCount,
          timeMs: timeMs, 
          totalQuestions: gameQuestions.length 
        });
        await setDoc(recordRef, {
          studentId: activeStudent.id,
          studentName: activeStudent.name,
          score: finalScore,
          correctCount: finalCorrectCount,
          totalQuestions: gameQuestions.length,
          timeMs: timeMs,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50, rotateX: 20 }}
        style={{ perspective: 1000 }}
        className="relative w-full max-w-5xl max-h-[96vh] md:max-h-[92vh] bg-white rounded-2xl md:rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.2)] overflow-hidden flex flex-col border-[4px] border-indigo-100 dark:border-indigo-900"
      >
        {/* Header */}
        <div className="p-3 md:p-5 border-b border-neutral-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg transform shrink-0">
              <Trophy size={20} className="md:hidden" />
              <Trophy size={24} className="hidden md:block" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Bilgi Yarışması</h2>
              {activeStudent && (
                <p className="text-neutral-500 font-bold text-[9px] md:text-xs uppercase tracking-widest leading-none mt-0.5">
                  {activeStudent.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 md:p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shrink-0"
          >
            <X size={20} className="md:hidden" strokeWidth={3} />
            <X size={24} className="hidden md:block" strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none" />

          {gameState === 'student-selection' && (
            <div className="relative z-10 space-y-6">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h3 className="text-4xl font-black text-neutral-900 mb-4 drop-shadow-sm">Hangi Öğrenci Yarışacak?</h3>
                <p className="text-neutral-500 text-xl font-bold">
                  Yarışmaya katılacak kahramanı seç!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {linkedStudents.map(s => (
                  <motion.button
                    key={s.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStudentSelect(s)}
                    className="bg-white p-6 rounded-[2rem] shadow-xl border-b-[8px] border-indigo-200 hover:border-indigo-500 text-left group transition-all flex items-center gap-6"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-3xl flex items-center justify-center text-4xl font-black shrink-0 shadow-lg group-hover:rotate-6 transition-transform">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-neutral-900 mb-1">{s.name}</h4>
                      <p className="text-base font-bold text-neutral-500 uppercase tracking-wider">
                        Öğrenci No: {s.studentNo}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {gameState === 'selection' && (
            <div className="relative z-10 space-y-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h3 className="text-4xl font-black text-neutral-900 mb-4 drop-shadow-sm">Hangi Ünitede Yarışmak İstersin?</h3>
                <p className="text-neutral-500 text-xl font-bold">
                  Bir ünite seç, soruları cevapla ve liderlik tablosunu ele geçir!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {units.map(unit => {
                  const unitQuestions = questions.filter(q => q.unitId === unit.id);
                  return (
                    <motion.button
                      key={unit.id}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartGame(unit)}
                      className="bg-white p-6 rounded-[2.5rem] shadow-xl border-b-[8px] border-indigo-100 hover:border-indigo-500 text-left group transition-all flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:-rotate-12 transition-transform">
                          <BookOpen size={32} />
                        </div>
                        <span className="bg-neutral-100 text-neutral-600 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest">
                          {unitQuestions.length} Soru
                        </span>
                      </div>
                      <h4 className="text-2xl font-black text-neutral-900 mb-6 leading-tight min-h-[4rem]">{unit.name}</h4>
                      <div className="w-full py-4 bg-indigo-50 group-hover:bg-indigo-500 text-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center font-black text-lg transition-colors">
                        Yarışmaya Başla <ArrowRight size={24} className="ml-2" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="relative z-10 max-w-4xl mx-auto w-full">
              <div className="flex flex-row items-center justify-between gap-2 mb-4 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-md border-b-[4px] border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="px-3 md:px-5 py-1.5 md:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg md:rounded-xl font-black text-base md:text-xl shadow-md shrink-0">
                    Soru {currentQuestionIndex + 1} <span className="opacity-70 text-xs md:text-base">/ {gameQuestions.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2.5 bg-indigo-50 rounded-lg md:rounded-xl border-2 border-indigo-100">
                  <CheckCircle2 size={20} className="text-indigo-600 md:w-6 md:h-6" /> 
                  <span className="font-black text-lg md:text-2xl text-indigo-600">{score} </span>
                  <span className="font-bold text-indigo-500 uppercase tracking-widest text-[9px] md:text-xs hidden sm:block">BAŞARI</span>
                </div>
              </div>

              <QuestionDisplay
                key={gameQuestions[currentQuestionIndex]?.id || currentQuestionIndex}
                question={gameQuestions[currentQuestionIndex]}
                userAnswer={userAnswer}
                onAnswerChange={(answer) => {
                  setUserAnswer(answer);
                  const currentQ = gameQuestions[currentQuestionIndex];
                  
                  // Auto-submit for types that have a clear selection
                  if (currentQ.type === 'multiple-choice' || currentQ.type === 'true-false') {
                    handleAnswer(answer);
                  } else if (currentQ.type === 'matching') {
                    // Auto-submit matching when all pairs are connected
                    if (Object.keys(answer || {}).length === currentQ.pairs.length) {
                      handleAnswer(answer);
                    }
                  }
                }}
                onAnswerSubmit={(answer) => {
                  handleAnswer(answer);
                }}
                hasSubmitted={isAnswerChecked}
                isCorrect={isCorrect}
                showCorrectAnswer={false}
              />

              {/* Submit button removed for automatic progression */}
            </div>
          )}

          {(gameState === 'finished' || gameState === 'leaderboard') && (
            <div className="relative z-10 max-w-4xl mx-auto space-y-8">
              {gameState === 'finished' && (
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border-b-[8px] border-indigo-200 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100 to-transparent" />
                  
                  <div className="relative z-10">
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className={`w-32 h-32 ${isNewRecord ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_50px_rgba(245,158,11,0.5)]' : 'bg-gradient-to-br from-indigo-500 to-fuchsia-500'} text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3`}
                    >
                      {isNewRecord ? <Medal size={64} /> : <Trophy size={64} />}
                    </motion.div>
                    
                    {isNewRecord && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-500 text-white px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest mb-4 inline-block shadow-lg"
                      >
                        YENİ REKOR! 🎊
                      </motion.div>
                    )}

                    <h3 className="text-5xl font-black text-neutral-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 drop-shadow-sm">
                      {isNewRecord ? 'Rekoru Kırdın!' : 'Performans Tamamlandı!'}
                    </h3>
                    <p className="text-2xl text-neutral-600 font-bold mb-10 bg-neutral-100 inline-block px-6 py-2 rounded-full">{selectedUnit?.name}</p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
                      <div className="flex-1 bg-emerald-50 px-8 py-8 rounded-[2rem] border-b-[6px] border-emerald-200">
                        <p className="text-emerald-600 font-black text-lg uppercase tracking-widest mb-2">Başarı Puanı</p>
                        <p className="text-6xl font-black text-emerald-600 drop-shadow-md">{score} <span className="text-3xl text-emerald-400">/ 1000</span></p>
                      </div>
                      <div className="flex-1 bg-blue-50 px-8 py-8 rounded-[2rem] border-b-[6px] border-blue-200">
                        <p className="text-blue-600 font-black text-lg uppercase tracking-widest mb-2">Tamamlama Süresi</p>
                        <p className="text-6xl font-black text-blue-600 drop-shadow-md">{formatTime(endTime - startTime)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          setIsNewRecord(false);
                          setGameState('selection');
                        }}
                        className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl font-black text-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_0_0_rgba(79,70,229,0.5)]"
                      >
                        Tekrar Dene
                      </button>
                      <button
                        onClick={() => {
                          setIsNewRecord(false);
                          setGameState('leaderboard');
                        }}
                        className="w-full sm:w-auto px-10 py-5 bg-white text-zinc-500 border-2 border-zinc-100 rounded-3xl font-black text-xl hover:bg-zinc-50 hover:text-zinc-600 transition-all shadow-[0_10px_0_0_rgba(0,0,0,0.05)]"
                      >
                        Sıralamayı Gör
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div className="bg-white rounded-[3rem] shadow-xl border-b-[8px] border-neutral-200 overflow-hidden relative">
                <div className="p-8 border-b-2 border-neutral-100 bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center -rotate-6">
                      <Medal size={32} />
                    </div>
                    <h4 className="text-3xl font-black text-neutral-900 drop-shadow-sm">Sınıf Sıralaması</h4>
                  </div>
                  {gameState === 'leaderboard' && (
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-2xl font-black text-lg transition-colors border-b-4 border-neutral-300 active:border-b-0 active:translate-y-1"
                    >
                      Kapat
                    </button>
                  )}
                </div>
                <div className="divide-y-2 divide-neutral-50 p-3">
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.id} className={`p-3 sm:p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${entry.studentId === activeStudent?.id ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-neutral-50'}`}>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm ${
                          idx === 0 ? 'bg-gradient-to-br from-amber-300 to-yellow-500 text-white transform -rotate-6 scale-110' :
                          idx === 1 ? 'bg-gradient-to-br from-neutral-300 to-neutral-400 text-white transform -rotate-3 scale-105' :
                          idx === 2 ? 'bg-gradient-to-br from-orange-300 to-rose-400 text-white transform rotate-3 scale-100' :
                          'bg-neutral-100 text-neutral-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-black text-neutral-900 text-lg">{entry.studentName}</p>
                          {entry.studentId === activeStudent?.id && (
                            <span className="inline-block mt-0.5 text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100 px-2 py-0.5 rounded-full">Senin Çocuğun</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right w-full sm:w-auto justify-between sm:justify-end bg-white/50 sm:bg-transparent p-2 sm:p-0 rounded-xl">
                        <div>
                          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Puan</p>
                          <p className="font-black text-emerald-500 text-xl">{entry.score}</p>
                          <p className="text-[10px] font-bold text-neutral-400">{entry.correctCount || 0}/{entry.totalQuestions} Doğru</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Süre</p>
                          <p className="font-black text-blue-500 text-xl">{formatTime(entry.timeMs)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="p-16 text-center">
                      <Trophy size={64} className="mx-auto mb-6 text-neutral-200" />
                      <p className="text-2xl text-neutral-400 font-black">
                        Bu ünitede henüz yarışan olmamış. <br />İlk sen ol!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
