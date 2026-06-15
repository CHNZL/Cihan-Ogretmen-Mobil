import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, Target as TargetIcon, ArrowRight, Play, Swords, X, User } from 'lucide-react';
import { collection, setDoc, doc, serverTimestamp, updateDoc, increment, arrayUnion, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { useJokers } from './useJokers';
import { JokerToolbar, FriendHelpModal, FriendAdviceModal } from './JokerUI';

interface IkiliMucadeleGameProps {
  students: any[];
  selectedStudents?: string[];
  questions: any[];
  subject: string;
  teacherUid: string;
  settings: {
    type: 'sureli' | 'sorulu';
    timeLimit?: number;
    targetScore?: number;
    rewardCategory: string;
    rewardAmount: number;
    friendHelp?: boolean;
    fiftyFifty?: boolean;
    doubleChance?: boolean;
    skipQuestion?: boolean;
  };
  onFinish: () => void;
  onBack?: () => void;
}

interface MatchPlayer {
  student: any;
  score: number;
  currentQ?: any;
  feedback?: 'correct' | 'wrong' | null;
  clickedOpt?: string | null;
}

type GameState = 'intro' | 'finding-p1' | 'finding-p2' | 'match-ready' | 'playing' | 'match-ended' | 'ended';

export const IkiliMucadeleGame: React.FC<IkiliMucadeleGameProps> = ({ 
  students, selectedStudents, questions, subject, teacherUid, settings, onFinish, onBack 
}) => {
  // State
  const [unplayedPool, setUnplayedPool] = useState<any[]>([]);
  const [lostPool, setLostPool] = useState<any[]>([]);
  const [p1, setP1] = useState<MatchPlayer | null>(null);
  const [p2, setP2] = useState<MatchPlayer | null>(null);
  const [gameState, setGameState] = useState<GameState>('intro');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [preMatchCountdown, setPreMatchCountdown] = useState<number | null>(null);
  const [matchesPlayed, setMatchesPlayed] = useState(0);
  const [totalMatchesCount, setTotalMatchesCount] = useState(0);
  const initializedRef = useRef(false);

  const p1Jokers = useJokers(settings, p1?.currentQ);
  const p2Jokers = useJokers(settings, p2?.currentQ);

  // Sound ref to avoid recreating
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize pool once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let filtered = [...students];
    if (selectedStudents && selectedStudents.length > 0) {
      filtered = filtered.filter(s => selectedStudents.includes(s.id));
    }
    
    // Fisher-Yates shuffle
    const pool = [...filtered];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    setUnplayedPool(pool);
    setTotalMatchesCount(Math.ceil(pool.length / 2));
    setLostPool([]);
    setMatchesPlayed(0);
  }, [students, selectedStudents]);

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

  const lastQuestionIdRef = useRef<string | null>(null);

  const getRandomQuestion = () => {
    const valid = questions.filter(q => q.options && q.options.length > 0);
    if (valid.length === 0) return { text: "Soru bulunamadı", options: ["A"], answer: "A" };
    
    let nextQ;
    if (valid.length > 1) {
      const remaining = valid.filter(q => q.id !== lastQuestionIdRef.current);
      nextQ = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      nextQ = valid[0];
    }
    
    lastQuestionIdRef.current = nextQ.id;
    return nextQ;
  };

  const nextStep = () => {
    if (gameState === 'intro' || gameState === 'match-ended') {
      if (unplayedPool.length === 0) {
        setGameState('ended');
      } else {
        // Player 1 is chosen randomly from the unplayed pool
        const pool = [...unplayedPool];
        const randomIndex = Math.floor(Math.random() * pool.length);
        const student = pool.splice(randomIndex, 1)[0];
        setUnplayedPool(pool);
        setP1({ student, score: 0 });
        setP2(null);
        setGameState('finding-p1');
      }
    }
  };

  const findOpponent = () => {
    if (!p1) return;

    let p2Student = null;
    if (unplayedPool.length > 0) {
      // Pick next student randomly from unplayed pool
      const pool = [...unplayedPool];
      const randomIndex = Math.floor(Math.random() * pool.length);
      p2Student = pool.splice(randomIndex, 1)[0];
      setUnplayedPool(pool);
    } else if (lostPool.length > 0) {
      // Odd number of students - pick from losers who aren't the same person
      const validLosers = lostPool.filter(s => s.id !== p1.student.id);
      if (validLosers.length > 0) {
        p2Student = validLosers[Math.floor(Math.random() * validLosers.length)];
      } else {
        // Fallback to any other student if lostPool is empty or only contains p1
        const allPlayedExceptP1 = students.filter(s => s.id !== p1.student.id);
        p2Student = allPlayedExceptP1[Math.floor(Math.random() * allPlayedExceptP1.length)];
      }
    } else {
      // Fallback: if somehow no one is in lostPool and no unplayed, pick any random from all students except P1
      const allOthers = students.filter(s => s.id !== p1.student.id);
      p2Student = allOthers[Math.floor(Math.random() * allOthers.length)];
    }

    if (p2Student) {
      setP2({ student: p2Student, score: 0 });
      setMatchesPlayed(prev => prev + 1);
      setGameState('finding-p2');
    } else {
      setGameState('ended');
    }
  };

  const startMatch = () => {
    if (!p1 || !p2) return;
    
    // Pre-match countdown
    setGameState('match-ready');
    setPreMatchCountdown(3);
  };

  useEffect(() => {
    if (preMatchCountdown === null) return;
    
    if (preMatchCountdown > 0) {
      const timer = setTimeout(() => setPreMatchCountdown(preMatchCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished, start game
      const timer = setTimeout(() => {
        setPreMatchCountdown(null);
        p1Jokers.resetJokersForNewTurn();
        p2Jokers.resetJokersForNewTurn();
        setP1(p => ({ ...p!, score: 0, currentQ: getRandomQuestion(), feedback: null }));
        setP2(p => ({ ...p!, score: 0, currentQ: getRandomQuestion(), feedback: null }));
        
        if (settings.type === 'sureli') {
          setTimeLeft(settings.timeLimit || 60);
        }
        setGameState('playing');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [preMatchCountdown]);

  // Timer logic
  const settingsType = settings.type;
  const settingsTimeLimit = settings.timeLimit;
  
  useEffect(() => {
    if (gameState !== 'playing' || settingsType !== 'sureli' || timeLeft === null) return;
    
    if (timeLeft <= 0) {
      handleMatchEnd();
      return;
    }
    
    const id = setTimeout(() => setTimeLeft(t => t !== null ? t - 1 : null), 1000);
    return () => clearTimeout(id);
  }, [gameState, timeLeft, settingsType]);

  const handleMatchEnd = () => {
    setGameState('match-ended');
    processRewards();
  };

  const checkAnswer = (q: any, option: string) => {
    if (!q) return false;
    const answer = q.answer?.toString().trim().toLowerCase();
    const optText = option?.toString().trim().toLowerCase();
    const optIndex = q.options?.indexOf(option);
    const indexLabels = ['a', 'b', 'c', 'd'];
    return (answer === optText) || (optIndex !== -1 && indexLabels[optIndex] === answer);
  };

  const handleAnswer = (playerKey: 'p1' | 'p2', option: string) => {
    if (gameState !== 'playing') return;
    
    const currentPlayer = playerKey === 'p1' ? p1 : p2;
    if (!currentPlayer || currentPlayer.feedback) return;

    const isCorrect = checkAnswer(currentPlayer.currentQ, option);
    
    // Evaluate joker usage
    const jokerHooks = playerKey === 'p1' ? p1Jokers : p2Jokers;
    const jokerResult = jokerHooks.handleOptionClick(option, isCorrect);
    
    if (jokerResult.shouldBlockEvaluation) {
      playSound('wrong');
      const setter = playerKey === 'p1' ? setP1 : setP2;
      setter(p => ({ ...p!, clickedOpt: option }));
      // We don't mark as wrong, just blink the button via CSS later?
      // Actually let's just do a small visual shake on that button via CSS class if possible, or just ignore.
      return;
    }
    
    if (isCorrect) {
      playSound('correct');
      const newScore = currentPlayer.score + 1;
      const setter = playerKey === 'p1' ? setP1 : setP2;
      
      setter(p => ({ ...p!, score: newScore, feedback: 'correct', clickedOpt: option }));
      
      setTimeout(() => {
        jokerHooks.resetQuestionState();
        setter(p => ({ ...p!, feedback: null, clickedOpt: null, currentQ: getRandomQuestion() }));
        // Check target score win condition
        if (settings.type === 'sorulu' && newScore >= (settings.targetScore || 5)) {
          handleMatchEnd();
        }
      }, 1500);
    } else {
      playSound('wrong');
      const setter = playerKey === 'p1' ? setP1 : setP2;
      setter(p => ({ ...p!, feedback: 'wrong', clickedOpt: option }));
      setTimeout(() => {
        jokerHooks.resetQuestionState();
        setter(p => ({ ...p!, feedback: null, clickedOpt: null, currentQ: getRandomQuestion() }));
      }, 1500);
    }
  };

  const processRewards = async () => {
    if (!p1 || !p2) return;
    
    const s1 = p1.score;
    const s2 = p2.score;
    const { rewardCategory, rewardAmount } = settings;

    // Track losers for odd-one-out cases
    const newLost = [...lostPool];
    if (s1 > s2) {
      if (!newLost.some(s => s.id === p2.student.id)) newLost.push(p2.student);
    } else if (s2 > s1) {
      if (!newLost.some(s => s.id === p1.student.id)) newLost.push(p1.student);
    } else {
      // Tie - both added back as potential opponents if needed
      if (!newLost.some(s => s.id === p1.student.id)) newLost.push(p1.student);
      if (!newLost.some(s => s.id === p2.student.id)) newLost.push(p2.student);
    }
    setLostPool(newLost);

    // Give stars and log activity
    const playersToReward = [];
    if (s1 > s2) playersToReward.push({ sid: p1.student.id, sname: p1.student.name, amt: rewardAmount, desc: 'Mücadele Galibiyeti' });
    else if (s2 > s1) playersToReward.push({ sid: p2.student.id, sname: p2.student.name, amt: rewardAmount, desc: 'Mücadele Galibiyeti' });
    else {
      const half = Math.ceil(rewardAmount / 2);
      playersToReward.push({ sid: p1.student.id, sname: p1.student.name, amt: half, desc: 'Mücadele Beraberliği' });
      playersToReward.push({ sid: p2.student.id, sname: p2.student.name, amt: half, desc: 'Mücadele Beraberliği' });
    }

    for (const r of playersToReward) {
      try {
        const studentRef = doc(db, `users/${teacherUid}/students/${r.sid}`);
        await addDoc(collection(db, `${studentRef.path}/activities`), {
          title: 'İkili Mücadele',
          description: r.desc,
          rewardCategory,
          rewardAmount: r.amt,
          createdAt: serverTimestamp(),
          type: 'ikili'
        });
        await updateDoc(studentRef, {
          stars: increment(r.amt),
          starHistory: arrayUnion({
            category: rewardCategory,
            description: r.desc,
            amount: r.amt,
            timestamp: Date.now()
          })
        });
      } catch (err) {
        console.error("Reward error:", err);
      }
    }
  };

  // UI Components
  if (gameState === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] bg-rose-600 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
             <Swords className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-2 text-neutral-800 uppercase tracking-tight">İkili Mücadele</h2>
          <p className="text-neutral-500 mb-8 font-medium">Bire bir karşılaşmalar başlıyor! Tüm öğrenciler eşleşene kadar devam edeceğiz.</p>
          
          <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6 mb-8 text-left">
            <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Katılımcı Listesi ({unplayedPool.length})</h4>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
              {unplayedPool.map(s => (
                <span key={s.id} className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-sm font-bold text-neutral-700 shadow-sm">
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <button onClick={nextStep} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-xl hover:bg-rose-700 active:scale-95 transition-all shadow-xl shadow-rose-600/20">
            MÜCADELEYİ BAŞLAT
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-900 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-black mb-4 text-neutral-800">Tebrikler!</h2>
          <p className="text-neutral-500 mb-8 font-medium">Tüm eşleşmeler tamamlandı. Herkes harika yarıştı!</p>
          <button onClick={onFinish} className="w-full py-5 bg-neutral-800 text-white rounded-2xl font-black text-xl hover:bg-neutral-900 shadow-lg">
            BİTİR VE DÖN
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col overflow-hidden text-neutral-800 select-none">
      {/* Header */}
      <div className="h-20 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 bg-white/5 rounded-xl border border-white/10 text-white/80 font-black text-sm uppercase tracking-widest">
            MAÇ {matchesPlayed} / {totalMatchesCount}
          </div>
        </div>

        {gameState === 'playing' ? (
          <div className="flex items-center gap-6">
            {settings.type === 'sureli' ? (
              <div className="px-8 py-3 bg-red-600/20 text-red-500 rounded-2xl font-black text-2xl border border-red-500/30 flex items-center gap-3">
                <Clock size={20} /> SON {timeLeft} SN
              </div>
            ) : (
              <div className="px-8 py-3 bg-amber-500/20 text-amber-500 rounded-2xl font-black text-2xl border border-amber-500/30 flex items-center gap-3">
                <TargetIcon size={20} /> HEDEF: {settings.targetScore}
              </div>
            )}
          </div>
        ) : null}

        <button onClick={() => window.confirm('Çıkmak istediğinize emin misiniz?') && (onBack ? onBack() : onFinish())} className="p-3 bg-white/5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-white/10">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex w-full relative">
        <AnimatePresence mode="wait">
          {(gameState === 'finding-p1' || gameState === 'finding-p2' || gameState === 'match-ready') ? (
            <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-neutral-900/95 flex flex-col items-center justify-center p-6">
               <div className="flex items-center justify-between gap-12 w-full max-w-6xl mb-12">
                  {/* Left Column: Remaining Students */}
                  <div className="flex-1 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">SIRASINI BEKLEYENLER ({unplayedPool.length})</p>
                     <div className="grid grid-cols-2 gap-2">
                        {unplayedPool.map(s => (
                          <div key={s.id} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-bold truncate">
                             {s.name}
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Center Match Display */}
                  <div className="flex-[2] flex items-center justify-center gap-8">
                    {/* P1 Card */}
                    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`flex-1 h-72 rounded-[3.5rem] p-10 flex flex-col items-center justify-center text-white border-4 shadow-2xl transition-all duration-700 ${p1 ? 'bg-blue-600 border-white/20' : 'bg-white/5 border-dashed border-white/10'}`}>
                      {p1 ? (
                        <>
                          <div className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center mb-4 shadow-xl">
                            <User className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">KATILIMCI 1</p>
                          <h3 className="text-3xl font-black uppercase tracking-tighter text-center leading-none">{p1.student.name} {p1.student.surname}</h3>
                        </>
                      ) : (
                        <p className="text-white/20 font-black uppercase tracking-widest text-xl">...</p>
                      )}
                    </motion.div>
  
                    <div className="relative">
                      <div className="text-7xl font-black text-white/5 italic">VS</div>
                      <Swords className="w-12 h-12 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>

                    {/* P2 Card */}
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`flex-1 h-72 rounded-[3.5rem] p-10 flex flex-col items-center justify-center text-white border-4 shadow-2xl transition-all duration-700 ${p2 ? 'bg-rose-600 border-white/20' : 'bg-white/5 border-dashed border-white/10'}`}>
                      {p2 ? (
                        <>
                          <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mb-4 shadow-xl">
                            <User className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-rose-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">KATILIMCI 2</p>
                          <h3 className="text-3xl font-black uppercase tracking-tighter text-center leading-none">{p2.student.name} {p2.student.surname}</h3>
                        </>
                      ) : (
                        <p className="text-white/20 font-black uppercase tracking-widest text-xl">RAKİP BEKLENİYOR</p>
                      )}
                    </motion.div>
                  </div>

                  {/* Right Column: Played/Losers */}
                  <div className="flex-1 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar text-right">
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">SIRASINI TAMAMLAYANLAR ({students.length - unplayedPool.length - (p1 ? 1 : 0) - (p2 ? 1 : 0)})</p>
                     <div className="flex flex-col gap-2">
                        {lostPool.slice(-10).map(s => (
                          <div key={s.id} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-white/20 text-[10px] font-bold truncate">
                             {s.name} (Oynadı)
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               {gameState === 'finding-p1' && (
                 <button onClick={findOpponent} className="px-12 py-6 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-4">
                   <Swords size={32} /> RAKİBİMİ BUL!
                 </button>
               )}

               {gameState === 'finding-p2' && (
                 <button onClick={startMatch} className="px-16 py-8 bg-green-500 text-white rounded-[2rem] font-black text-4xl shadow-xl hover:scale-110 transition-all uppercase tracking-[0.2em]">BAŞLA!</button>
               )}

               {gameState === 'match-ready' && (
                 <motion.div 
                    key="countdown" 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="text-[12rem] font-black text-white italic drop-shadow-2xl"
                  >
                    {preMatchCountdown === 0 ? "BAŞLA!" : preMatchCountdown}
                  </motion.div>
               )}
            </motion.div>
          ) : null}

          {gameState === 'match-ended' && p1 && p2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-neutral-900/90 backdrop-blur-xl flex items-center justify-center p-6">
               <div className="bg-white rounded-[4rem] p-16 max-w-3xl w-full text-center shadow-3xl">
                  <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <Trophy className="w-16 h-16 text-white" />
                  </div>
                  <h2 className="text-5xl font-black mb-12 uppercase text-neutral-800 tracking-tighter">MAÇ SONUCU</h2>
                  
                  <div className="flex items-center justify-center gap-12 mb-16">
                     <div className={`flex-1 p-8 rounded-[2.5rem] transition-all ${p1.score > p2.score ? 'bg-blue-50 border-4 border-blue-200 scale-110' : 'bg-neutral-50 border-2 border-neutral-100 opacity-50'}`}>
                        <p className="font-black text-2xl mb-3 text-neutral-800">{p1.student.name}</p>
                        <p className="text-7xl font-black text-blue-600 tracking-tighter">{p1.score}</p>
                     </div>
                     <div className="text-6xl font-black text-neutral-200">/</div>
                     <div className={`flex-1 p-8 rounded-[2.5rem] transition-all ${p2.score > p1.score ? 'bg-rose-50 border-4 border-rose-200 scale-110' : 'bg-neutral-50 border-2 border-neutral-100 opacity-50'}`}>
                        <p className="font-black text-2xl mb-3 text-neutral-800">{p2.student.name}</p>
                        <p className="text-7xl font-black text-rose-600 tracking-tighter">{p2.score}</p>
                     </div>
                  </div>

                  <button onClick={nextStep} className="w-full py-6 bg-neutral-900 text-white rounded-3xl font-black text-2xl shadow-xl hover:bg-black transition-all">
                    SIRADAKİ MÜCADELE
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gameplay Sides */}
        <div className="flex-1 flex relative overflow-hidden">
           {/* Center HUD: Timer / Score */}
           {gameState === 'playing' && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex flex-col items-center min-w-[160px]">
                   {settings.type === 'sureli' ? (
                     <>
                        <div className="flex items-center gap-3">
                           <Clock className={`w-5 h-5 ${timeLeft! <= 10 ? 'text-red-500 animate-pulse' : 'text-white/40'}`} />
                           <div className="text-4xl font-black tabular-nums tracking-tighter text-white">
                              {timeLeft}
                           </div>
                        </div>
                        <div className="w-20 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                           <motion.div 
                              initial={{ width: '100%' }}
                              animate={{ width: `${(timeLeft! / (settings.timeLimit || 60)) * 100}%` }}
                              className={`h-full ${timeLeft! <= 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
                           />
                        </div>
                     </>
                   ) : (
                     <div className="flex flex-col items-center">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">HEDEF</div>
                        <div className="text-3xl font-black text-white tracking-tighter">{settings.targetScore}</div>
                     </div>
                   )}
                </div>
             </div>
           )}

          {/* P1 Gameplay */}
          <div className="flex-1 bg-blue-50/50 flex flex-col border-r border-blue-100 relative pt-32">
             <div className="absolute top-6 left-6 flex items-center gap-4 bg-white/95 p-3 rounded-2xl shadow-xl border-2 border-blue-100 z-10 transition-all">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/20">{p1?.score}</div>
                <div className="max-w-[140px]">
                   <p className="text-[9px] font-black text-blue-600/40 uppercase tracking-widest leading-none mb-1">OYUNCU 1</p>
                   <p className="text-sm font-black text-neutral-800 uppercase truncate leading-none">{p1?.student.name}</p>
                </div>
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center p-8 pt-12">
                <AnimatePresence mode="wait">
                  {p1?.currentQ && (
                    <motion.div key={p1.currentQ.text} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="w-full max-w-lg mt-8">
                        <JokerToolbar 
                         size="md"
                         state={p1Jokers.jokerState}
                         onFiftyFifty={p1Jokers.useFiftyFifty}
                         onDoubleChance={p1Jokers.useDoubleChance}
                         onSkip={() => p1Jokers.handleSkipQuestion(() => setP1(p => ({ ...p!, currentQ: getRandomQuestion() })))}
                         onFriendHelp={() => p1Jokers.initFriendHelp(students, [p1?.student?.id, p2?.student?.id].filter((id): id is string => !!id))}
                       />
                       <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-100 mb-6 min-h-[180px] flex items-center justify-center text-center">
                          <p className="text-xl font-black text-neutral-800 leading-tight">{p1.currentQ.text}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          {p1.currentQ.options.map((opt: any, i: number) => {
                            const isHidden = p1Jokers.jokerState.hiddenOptions.includes(opt);
                            if (isHidden) return <div key={i} className="p-6 border-2 border-dashed border-blue-100 rounded-[2rem] bg-blue-50/30 opacity-30 pointer-events-none" />;
                            return (
                              <button key={i} onClick={() => handleAnswer('p1', opt)} disabled={!!p1.feedback}
                                className={`p-6 rounded-[2rem] text-xl font-black transition-all transform active:scale-95 ${
                                  p1.feedback && checkAnswer(p1.currentQ, opt) ? 'bg-green-500 text-white shadow-xl translate-y-[-4px]' :
                                  p1.feedback === 'wrong' && p1.clickedOpt === opt ? 'bg-rose-500 text-white shake' :
                                  p1.feedback ? 'bg-neutral-100 text-neutral-300 opacity-40' :
                                  'bg-white text-blue-900 border-b-8 border-blue-100 hover:bg-blue-50 shadow-md'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
             
             {/* P1 Friend Help Modals */}
             <FriendHelpModal
               isOpen={p1Jokers.friendHelpModalOpen}
               friends={p1Jokers.friendHelpFriends}
               onSelect={(f) => p1Jokers.selectFriendHelper(f)}
               position="absolute"
             />
             <FriendAdviceModal
               isOpen={!!p1Jokers.friendAdvice}
               friendName={p1Jokers.friendAdvice?.friendName || ''}
               recommendedOption={p1Jokers.friendAdvice?.recommendedOption || ''}
               onClose={() => p1Jokers.setFriendAdvice(null)}
               onApply={() => {
                 if (p1Jokers.friendAdvice) {
                   handleAnswer('p1', p1Jokers.friendAdvice.recommendedOption);
                 }
               }}
               position="absolute"
             />
          </div>

          <div className="w-0.5 bg-neutral-900/10 z-10"></div>

          {/* P2 Gameplay */}
          <div className="flex-1 bg-rose-50/50 flex flex-col relative pt-32">
             <div className="absolute top-6 right-6 flex items-center gap-4 bg-white/95 p-3 rounded-2xl shadow-xl border-2 border-rose-100 z-10 transition-all text-right">
                <div className="max-w-[140px]">
                   <p className="text-[9px] font-black text-rose-600/40 uppercase tracking-widest leading-none mb-1">OYUNCU 2</p>
                   <p className="text-sm font-black text-neutral-800 uppercase truncate leading-none">{p2?.student.name}</p>
                </div>
                <div className="bg-rose-600 text-white w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-lg shadow-rose-500/20">{p2?.score}</div>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center p-8 pt-12">
                <AnimatePresence mode="wait">
                  {p2?.currentQ && (
                    <motion.div key={p2.currentQ.text} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="w-full max-w-lg mt-8">
                       <JokerToolbar 
                         size="md"
                         state={p2Jokers.jokerState}
                         onFiftyFifty={p2Jokers.useFiftyFifty}
                         onDoubleChance={p2Jokers.useDoubleChance}
                         onSkip={() => p2Jokers.handleSkipQuestion(() => setP2(p => ({ ...p!, currentQ: getRandomQuestion() })))}
                         onFriendHelp={() => p2Jokers.initFriendHelp(students, [p1?.student?.id, p2?.student?.id].filter((id): id is string => !!id))}
                       />
                       <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-rose-100 mb-6 min-h-[180px] flex items-center justify-center text-center">
                          <p className="text-xl font-black text-neutral-800 leading-tight">{p2.currentQ.text}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          {p2.currentQ.options.map((opt: any, i: number) => {
                            const isHidden = p2Jokers.jokerState.hiddenOptions.includes(opt);
                            if (isHidden) return <div key={i} className="p-6 border-2 border-dashed border-rose-100 rounded-[2rem] bg-rose-50/30 opacity-30 pointer-events-none" />;
                            return (
                              <button key={i} onClick={() => handleAnswer('p2', opt)} disabled={!!p2.feedback}
                                className={`p-6 rounded-[2rem] text-xl font-black transition-all transform active:scale-95 ${
                                  p2.feedback && checkAnswer(p2.currentQ, opt) ? 'bg-green-500 text-white shadow-xl translate-y-[-4px]' :
                                  p2.feedback === 'wrong' && p2.clickedOpt === opt ? 'bg-rose-500 text-white shake' :
                                  p2.feedback ? 'bg-neutral-100 text-neutral-300 opacity-40' :
                                  'bg-white text-rose-900 border-b-8 border-rose-100 hover:bg-rose-50 shadow-md'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                       </div>
                     </motion.div>
                  )}
                </AnimatePresence>
             </div>
             
             {/* P2 Friend Help Modals */}
             <FriendHelpModal
               isOpen={p2Jokers.friendHelpModalOpen}
               friends={p2Jokers.friendHelpFriends}
               onSelect={(f) => p2Jokers.selectFriendHelper(f)}
               position="absolute"
             />
             <FriendAdviceModal
               isOpen={!!p2Jokers.friendAdvice}
               friendName={p2Jokers.friendAdvice?.friendName || ''}
               recommendedOption={p2Jokers.friendAdvice?.recommendedOption || ''}
               onClose={() => p2Jokers.setFriendAdvice(null)}
               onApply={() => {
                 if (p2Jokers.friendAdvice) {
                   handleAnswer('p2', p2Jokers.friendAdvice.recommendedOption);
                 }
               }}
               position="absolute"
             />
          </div>
        </div>
      </div>
    </div>
  );
};
