import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, Target as TargetIcon, Play, Swords, X, User, Stars } from 'lucide-react';
import { collection, doc, serverTimestamp, updateDoc, increment, arrayUnion, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useJokers } from './useJokers';
import { JokerToolbar, FriendHelpModal, FriendAdviceModal } from './JokerUI';

interface SinifMucadelesiGameProps {
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

type GameState = 'intro' | 'finding-p1' | 'finding-p2' | 'match-ready' | 'playing' | 'tie-breaker-intro' | 'tie-breaker' | 'match-ended' | 'ended' | 'bye';

type RPSChoice = 'tas' | 'kagit' | 'makas';

export const SinifMucadelesiGame: React.FC<SinifMucadelesiGameProps> = ({ 
  students, selectedStudents, questions, teacherUid, settings, onFinish, onBack 
}) => {
  const [unplayedPool, setUnplayedPool] = useState<any[]>([]);
  const [nextRoundPool, setNextRoundPool] = useState<any[]>([]);
  const [eliminatedPool, setEliminatedPool] = useState<any[]>([]);
  const [p1, setP1] = useState<MatchPlayer | null>(null);
  const [p2, setP2] = useState<MatchPlayer | null>(null);
  const [gameState, setGameState] = useState<GameState>('intro');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [preMatchCountdown, setPreMatchCountdown] = useState<number | null>(null);
  const [roundName, setRoundName] = useState<string>('ÖN ELEME TURU');
  
  const [tbP1Score, setTbP1Score] = useState(0);
  const [tbP2Score, setTbP2Score] = useState(0);
  const [tbP1Choice, setTbP1Choice] = useState<RPSChoice | null>(null);
  const [tbP2Choice, setTbP2Choice] = useState<RPSChoice | null>(null);
  const [tbCurrentOption, setTbCurrentOption] = useState<RPSChoice>('tas');
  const [tbRoundResult, setTbRoundResult] = useState<string | null>(null);
  
  const initializedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const p1Jokers = useJokers(settings, p1?.currentQ);
  const p2Jokers = useJokers(settings, p2?.currentQ);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let filtered = [...students];
    if (selectedStudents && selectedStudents.length > 0) {
      filtered = filtered.filter(s => selectedStudents.includes(s.id));
    }
    
    // Fisher-Yates Shuffle for initial pool
    const pool = [...filtered];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    setUnplayedPool(pool);
    setNextRoundPool([]);
    setEliminatedPool([]);
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
    // nextStep should work from intro (start game), match-ended (start next match), and bye (start next match)
    const canProgress = gameState === 'intro' || gameState === 'match-ended' || gameState === 'bye';
    if (!canProgress) return;

    let currentUnplayed = [...unplayedPool];
    let currentNextRound = [...nextRoundPool];

    // If current round is empty, start new round from nextRoundPool
    if (currentUnplayed.length === 0) {
      if (currentNextRound.length <= 1) {
        setGameState('ended');
        return;
      } else {
        // Robust Fisher-Yates Shuffle
        const pool = [...currentNextRound];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        currentUnplayed = pool;
        currentNextRound = [];
        setNextRoundPool([]);
        setUnplayedPool(currentUnplayed);
        
        let nextRoundLabel = 'TUR';
        if (currentUnplayed.length === 2) nextRoundLabel = 'FİNAL';
        else if (currentUnplayed.length === 3 || currentUnplayed.length === 4) nextRoundLabel = 'YARI FİNAL';
        else if (currentUnplayed.length > 4 && currentUnplayed.length <= 8) nextRoundLabel = 'ÇEYREK FİNAL';
        else nextRoundLabel = currentUnplayed.length + ' ÖĞRENCİ';
        
        setRoundName(nextRoundLabel);
      }
    }

    // Now start the next match or bye
    if (currentUnplayed.length === 1) {
      const byeStudent = currentUnplayed.pop()!;
      currentNextRound.push(byeStudent);
      setNextRoundPool(currentNextRound);
      setUnplayedPool([]);
      
      setP1({ student: byeStudent, score: 0 });
      setP2(null);
      setGameState('bye');
      return;
    }

    if (currentUnplayed.length >= 2) {
      const student1 = currentUnplayed.pop()!;
      setUnplayedPool(currentUnplayed);
      setP1({ student: student1, score: 0 });
      setP2(null);
      setGameState('finding-p1');
    }
  };

  const findOpponent = () => {
    if (!p1) return;
    
    let currentUnplayed = [...unplayedPool];
    if (currentUnplayed.length > 0) {
      const p2Student = currentUnplayed.pop();
      setUnplayedPool(currentUnplayed);
      setP2({ student: p2Student, score: 0 });
      setGameState('finding-p2');
    }
  };

  const startMatch = () => {
    if (!p1 || !p2) return;
    setGameState('match-ready');
    setPreMatchCountdown(3);
  };

  useEffect(() => {
    if (preMatchCountdown === null) return;
    
    if (preMatchCountdown > 0) {
      const timer = setTimeout(() => setPreMatchCountdown(preMatchCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
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

  const settingsType = settings.type;
  
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
    if (p1 && p2 && p1.score === p2.score) {
      setTbP1Score(0);
      setTbP2Score(0);
      setTbP1Choice(null);
      setTbP2Choice(null);
      setTbRoundResult(null);
      setGameState('tie-breaker-intro');
    } else {
      setGameState('match-ended');
      processRewards();
    }
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

  useEffect(() => {
    if (gameState !== 'tie-breaker') return;
    if (tbP1Choice && tbP2Choice) return;
    
    const options: RPSChoice[] = ['tas', 'kagit', 'makas'];
    const interval = setInterval(() => {
      setTbCurrentOption(prev => {
        const otherOptions = options.filter(o => o !== prev);
        return otherOptions[Math.floor(Math.random() * otherOptions.length)];
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [gameState, tbP1Choice, tbP2Choice]);

  useEffect(() => {
    if (gameState === 'tie-breaker' && tbP1Choice && tbP2Choice && !tbRoundResult) {
      let winner: 'p1' | 'p2' | 'tie' = 'tie';
      if (tbP1Choice === tbP2Choice) {
        winner = 'tie';
      } else if (
        (tbP1Choice === 'tas' && tbP2Choice === 'makas') ||
        (tbP1Choice === 'kagit' && tbP2Choice === 'tas') ||
        (tbP1Choice === 'makas' && tbP2Choice === 'kagit')
      ) {
        winner = 'p1';
      } else {
        winner = 'p2';
      }
      
      let newP1Score = tbP1Score;
      let newP2Score = tbP2Score;
      
      if (winner === 'p1') {
        newP1Score++;
        setTbP1Score(newP1Score);
        setTbRoundResult(`${p1?.student.name} Turu Kazandı!`);
      } else if (winner === 'p2') {
        newP2Score++;
        setTbP2Score(newP2Score);
        setTbRoundResult(`${p2?.student.name} Turu Kazandı!`);
      } else {
        setTbRoundResult('Berabere!');
      }
      
      setTimeout(() => {
        if (newP1Score >= 2) {
          setP1(p => ({ ...p!, score: p!.score + 1 }));
          setGameState('match-ended');
          processRewards('p1');
        } else if (newP2Score >= 2) {
          setP2(p => ({ ...p!, score: p!.score + 1 }));
          setGameState('match-ended');
          processRewards('p2');
        } else {
          setTbP1Choice(null);
          setTbP2Choice(null);
          setTbRoundResult(null);
        }
      }, 2000);
    }
  }, [tbP1Choice, tbP2Choice, gameState]);

  const processRewards = async (overrideWinner?: 'p1' | 'p2') => {
    if (!p1 || !p2) return;
    
    let s1 = p1.score;
    let s2 = p2.score;
    
    if (overrideWinner === 'p1') s1++;
    if (overrideWinner === 'p2') s2++;
    const { rewardCategory, rewardAmount } = settings;

    let winner = null;
    let loser = null;
    
    if (s1 > s2 || overrideWinner === 'p1') {
      winner = p1.student;
      loser = p2.student;
    } else {
      winner = p2.student;
      loser = p1.student;
    }
    
    setNextRoundPool(prev => [...prev, winner]);
    setEliminatedPool(prev => [...prev, loser]);

    if (roundName === 'FİNAL') {
      const playersToReward = [];
      playersToReward.push({ sid: winner.id, sname: winner.name, amt: rewardAmount, desc: 'Sınıf Mücadelesi Şampiyonu' });
      playersToReward.push({ sid: loser.id, sname: loser.name, amt: Math.ceil(rewardAmount / 2), desc: 'Sınıf Mücadelesi İkincisi' });

      for (const r of playersToReward) {
        try {
          const studentRef = doc(db, `users/${teacherUid}/students/${r.sid}`);
          await addDoc(collection(db, `${studentRef.path}/activities`), {
            title: 'Sınıf Mücadelesi',
            description: r.desc,
            rewardCategory,
            rewardAmount: r.amt,
            createdAt: serverTimestamp(),
            type: 'sinif'
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
    }
  };

  if (gameState === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] bg-indigo-600 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
             <Swords className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-2 text-neutral-800 uppercase tracking-tight">Sınıf Mücadelesi</h2>
          <p className="text-neutral-500 mb-8 font-medium">Turnuva formatında eşleşmeler başlıyor! Yenilen elenir.</p>
          
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

          <button onClick={nextStep} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-600/20">
            TURNUVAYI BAŞLAT
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
          <h2 className="text-4xl font-black mb-4 text-neutral-800">ŞAMPİYON!</h2>
          <p className="text-neutral-500 mb-8 font-medium">Sınıf Mücadelesi turnuvası sona erdi!</p>
          <button onClick={onFinish} className="w-full py-5 bg-neutral-800 text-white rounded-2xl font-black text-xl hover:bg-neutral-900 shadow-lg">
            BİTİR VE DÖN
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col overflow-hidden text-neutral-800 select-none">
      <div className="h-20 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 font-black text-sm uppercase tracking-widest">
            {roundName}
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
                  <div className="flex-1 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">BEKLEYENLER ({unplayedPool.length})</p>
                     <div className="grid grid-cols-2 gap-2">
                        {unplayedPool.map(s => (
                          <div key={s.id} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-bold truncate">
                             {s.name}
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="flex-[2] flex items-center justify-center gap-8">
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

                  <div className="flex-1 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar text-right">
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">ÜST TURA ÇIKANLAR ({nextRoundPool.length})</p>
                     <div className="flex flex-col gap-2">
                        {nextRoundPool.map(s => (
                          <div key={s.id} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-emerald-400 text-[10px] font-bold truncate">
                             {s.name} (Kazandı)
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
                 <button onClick={startMatch} className="px-16 py-8 bg-green-500 text-white rounded-[2rem] font-black text-4xl shadow-xl hover:scale-110 transition-all uppercase tracking-[0.2em]">HAZIRIZ!</button>
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

          {(gameState === 'tie-breaker-intro' || gameState === 'tie-breaker') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-neutral-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white">
                <div className="absolute top-12 left-0 w-full text-center">
                    <h2 className="text-6xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] italic uppercase mb-2">BERABERLİK!</h2>
                    <p className="text-2xl text-white/70 tracking-widest uppercase">TAŞ - KAĞIT - MAKAS (2'de biter)</p>
                </div>

                {gameState === 'tie-breaker-intro' ? (
                    <div className="text-center">
                       <p className="text-xl mb-8">İki öğrenci de kendi butonuna basarak seçimini yapar. (Döngü otomatik ilerler)</p>
                       <button onClick={() => setGameState('tie-breaker')} className="px-12 py-6 bg-amber-500 text-white rounded-3xl font-black text-3xl shadow-xl hover:scale-105 transition-all">
                          MAÇA GEÇ
                       </button>
                    </div>
                ) : (
                    <div className="flex w-full items-center justify-between gap-12 max-w-5xl">
                        <div className="flex-1 flex flex-col items-center relative">
                            <p className="text-3xl font-black text-blue-400 mb-8">{p1?.student.name}</p>
                            <div className="text-8xl font-black mb-8 text-white">{tbP1Score}</div>
                            <div className={`w-48 h-48 bg-white/10 rounded-full flex items-center justify-center mb-8 border-4 border-white/20 transition-transform ${tbP1Choice ? 'scale-110 shadow-xl shadow-blue-500/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]' : ''}`}>
                                {tbP1Choice ? (
                                    <span className="text-8xl transform hover:scale-110 transition-transform">
                                        {tbP1Choice === 'tas' ? '✊' : tbP1Choice === 'kagit' ? '✋' : '✌️'}
                                    </span>
                                ) : (
                                    <span className="text-8xl opacity-50">
                                        {tbCurrentOption === 'tas' ? '✊' : tbCurrentOption === 'kagit' ? '✋' : '✌️'}
                                    </span>
                                )}
                            </div>
                            {!tbP1Choice ? (
                                <button onClick={() => setTbP1Choice(tbCurrentOption)} className="w-full py-6 bg-blue-500 rounded-[2rem] font-black text-2xl shadow-lg hover:scale-105 active:scale-95 transition-all outline-none">SEÇ!</button>
                            ) : (
                                <div className="w-full py-6 bg-white/5 rounded-[2rem] text-center font-black text-2xl text-white/50 border border-white/10">SEÇİLDİ</div>
                            )}
                        </div>

                        <div className="text-8xl font-black italic text-white/10">VS</div>

                        <div className="flex-1 flex flex-col items-center relative">
                            <p className="text-3xl font-black text-rose-400 mb-8">{p2?.student.name}</p>
                            <div className="text-8xl font-black mb-8 text-white">{tbP2Score}</div>
                            <div className={`w-48 h-48 bg-white/10 rounded-full flex items-center justify-center mb-8 border-4 border-white/20 transition-transform ${tbP2Choice ? 'scale-110 shadow-xl shadow-rose-500/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]' : ''}`}>
                                {tbP2Choice ? (
                                    <span className="text-8xl transform hover:scale-110 transition-transform">
                                        {tbP2Choice === 'tas' ? '✊' : tbP2Choice === 'kagit' ? '✋' : '✌️'}
                                    </span>
                                ) : (
                                    <span className="text-8xl opacity-50">
                                        {tbCurrentOption === 'tas' ? '✊' : tbCurrentOption === 'kagit' ? '✋' : '✌️'}
                                    </span>
                                )}
                            </div>
                            {!tbP2Choice ? (
                                <button onClick={() => setTbP2Choice(tbCurrentOption)} className="w-full py-6 bg-rose-500 rounded-[2rem] font-black text-2xl shadow-lg hover:scale-105 active:scale-95 transition-all outline-none">SEÇ!</button>
                            ) : (
                                <div className="w-full py-6 bg-white/5 rounded-[2rem] text-center font-black text-2xl text-white/50 border border-white/10">SEÇİLDİ</div>
                            )}
                        </div>
                        
                        {tbRoundResult && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-neutral-900 px-12 py-8 rounded-[3rem] font-black text-5xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-8 border-amber-400 whitespace-nowrap animate-bounce z-50 text-center">
                               {tbRoundResult}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
          )}

          {gameState === 'bye' && p1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-neutral-900/90 backdrop-blur-xl flex items-center justify-center p-6">
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 className="bg-white rounded-[4rem] p-16 max-w-3xl w-full text-center shadow-3xl overflow-hidden relative"
               >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
                  <div className="w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl ring-8 ring-amber-500/20">
                    <Stars className="w-16 h-16 text-white" />
                  </div>
                  <h2 className="text-5xl font-black mb-2 uppercase text-neutral-800 tracking-tighter italic">ŞANS GÜNÜ!</h2>
                  
                  <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-100 mb-10">
                    <p className="text-2xl font-bold text-neutral-700 leading-relaxed">
                      Eşleşecek rakip kalmadığı için <br/>
                      <span className="text-4xl block my-2 text-orange-600 font-black">{p1.student.name}</span> 
                      bay geçerek üst tura yüksəldi!
                    </p>
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={nextStep} 
                    className="w-full py-7 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl font-black text-3xl shadow-xl shadow-amber-500/30 hover:shadow-2xl transition-all"
                  >
                    İLERLE
                  </motion.button>
               </motion.div>
            </motion.div>
          )}

          {gameState === 'match-ended' && p1 && p2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-neutral-900/90 backdrop-blur-xl flex items-center justify-center p-6">
               <div className="bg-white rounded-[4rem] p-16 max-w-3xl w-full text-center shadow-3xl">
                  <div className="w-32 h-32 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <Trophy className="w-16 h-16 text-white" />
                  </div>
                  <h2 className="text-5xl font-black mb-2 uppercase text-neutral-800 tracking-tighter">MAÇ SONUCU</h2>
                  
                  {roundName === 'FİNAL' && p1.score !== p2.score ? (
                    <p className="text-2xl font-black text-indigo-600 mb-10">BÜYÜK ŞAMPİYON: {p1.score > p2.score ? p1.student.name : p2.student.name}</p>
                  ) : (
                    <p className="text-xl font-bold text-neutral-500 mb-10">{p1.score >= p2.score ? p1.student.name : p2.student.name} ÜST TURA ÇIKTI!</p>
                  )}
                  
                  <div className="flex items-center justify-center gap-12 mb-16">
                     <div className={`flex-1 p-8 rounded-[2.5rem] transition-all ${p1.score >= p2.score ? 'bg-indigo-50 border-4 border-indigo-200 scale-110' : 'bg-neutral-50 border-2 border-neutral-100 opacity-50'}`}>
                        <p className="font-black text-2xl mb-3 text-neutral-800">{p1.student.name}</p>
                        <p className="text-7xl font-black text-indigo-600 tracking-tighter">{p1.score}</p>
                     </div>
                     <div className="text-6xl font-black text-neutral-200">/</div>
                     <div className={`flex-1 p-8 rounded-[2.5rem] transition-all ${p2.score > p1.score ? 'bg-indigo-50 border-4 border-indigo-200 scale-110' : 'bg-neutral-50 border-2 border-neutral-100 opacity-50'}`}>
                        <p className="font-black text-2xl mb-3 text-neutral-800">{p2.student.name}</p>
                        <p className="text-7xl font-black text-indigo-600 tracking-tighter">{p2.score}</p>
                     </div>
                  </div>

                  <button onClick={nextStep} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl shadow-xl hover:bg-indigo-700 transition-all">
                    İLERLE
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex relative overflow-hidden">
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
