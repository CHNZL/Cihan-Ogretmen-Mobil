import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, Users, ArrowRight, Play, Star, X } from 'lucide-react';
import { collection, setDoc, doc, serverTimestamp, updateDoc, increment, arrayUnion, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { useJokers } from './useJokers';
import { JokerToolbar, FriendHelpModal, FriendAdviceModal } from './JokerUI';

interface GrupYarismasiProps {
  students: any[];
  selectedStudents?: string[];
  questions: any[];
  subject: string;
  teacherUid: string;
  settings: {
    groupSize: number; // 3, 4, 5
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

interface StudentPerformance {
  student: any;
  correctCount: number;
  timeMs: number;
  reward?: number;
}

export const GrupYarismasiGame: React.FC<GrupYarismasiProps> = ({ 
  students, selectedStudents, questions, subject, teacherUid, settings, onFinish, onBack 
}) => {
  const [shuffledQueue, setShuffledQueue] = useState<any[]>([]);
  
  const [groups, setGroups] = useState<any[][]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentGroupMembers, setCurrentGroupMembers] = useState<any[]>([]);
  const [currentGroupPerformances, setCurrentGroupPerformances] = useState<StudentPerformance[]>([]);

  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);

  const [state, setState] = useState<'intro' | 'group-intro' | 'member-ready' | 'playing' | 'member-result' | 'group-ranking' | 'ended'>('intro');

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [startTime, setStartTime] = useState(0);
  const [memberCorrect, setMemberCorrect] = useState(0);
  const [memberFeedback, setMemberFeedback] = useState<'correct'|'wrong'|null>(null);
  const [selectedOpt, setSelectedOpt] = useState<string|null>(null);

  const {
    jokerState,
    useFiftyFifty,
    useDoubleChance,
    initFriendHelp,
    selectFriendHelper,
    friendHelpModalOpen,
    setFriendHelpModalOpen,
    friendHelpFriends,
    friendAdvice,
    setFriendAdvice,
    handleOptionClick,
    resetJokersForNewTurn,
    resetQuestionState,
    handleSkipQuestion
  } = useJokers(settings, currentQ);

  const initializedRef = React.useRef(false);

  const audioCtxRef = React.useRef<AudioContext | null>(null);

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

  const lastQuestionIdRef = React.useRef<string | null>(null);

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
    return { ...nextQ, options: [...nextQ.options].sort(() => Math.random() - 0.5) };
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let filtered = [...students];
    if (selectedStudents && selectedStudents.length > 0) {
      filtered = filtered.filter(s => selectedStudents.includes(s.id));
    }
    const shuffle = filtered.sort(() => Math.random() - 0.5);
    setShuffledQueue(shuffle);
    
    // Chunk initially and fill incomplete groups
    const gs = settings.groupSize;
    const g: any[][] = [];
    for (let i = 0; i < shuffle.length; i += gs) {
      let chunk = shuffle.slice(i, i + gs);
      
      // If this group is incomplete, fill it using random students from the full pool
      if (chunk.length < gs && filtered.length > 0) {
        const needed = gs - chunk.length;
        // Avoid picking the same student who is already in this chunk if possible
        const others = filtered.filter(s => !chunk.some(c => c.id === s.id));
        const poolToPickFrom = others.length > 0 ? others : filtered;
        
        const extras = [...poolToPickFrom].sort(() => Math.random() - 0.5).slice(0, needed);
        chunk = [...chunk, ...extras];
        
        // Safety: if still short, duplicate
        while (chunk.length < gs) {
          chunk.push(filtered[0]);
        }
      }
      g.push(chunk);
    }
    setGroups(g);
  }, [students, selectedStudents, settings.groupSize]);

  const loadGroup = (gIndex: number) => {
    if (gIndex >= groups.length) {
      setState('ended');
      return;
    }
    const members = [...groups[gIndex]];
    
    setCurrentGroupMembers(members);
    setCurrentGroupIndex(gIndex);
    setCurrentGroupPerformances([]);
    setState('group-intro');
  };

  const loadMember = (mIndex: number) => {
    if (mIndex >= currentGroupMembers.length) {
      handleGroupFinish();
      return;
    }
    setCurrentMemberIndex(mIndex);
    setState('member-ready');
  };

  const startMemberPlay = () => {
    setCurrentQIndex(0);
    setMemberCorrect(0);
    setSelectedOpt(null);
    setMemberFeedback(null);
    setCurrentQ(getRandomQuestion());
    setStartTime(Date.now());
    resetJokersForNewTurn();
    setState('playing');
  };

  const checkAnswer = (q: any, option: string) => {
    if (!q) return false;
    const answer = q.answer?.toString().trim().toLowerCase();
    const optText = option?.toString().trim().toLowerCase();
    const optIndex = q.options?.indexOf(option);
    const indexLabels = ['a', 'b', 'c', 'd'];
    return (answer === optText) || (optIndex !== -1 && indexLabels[optIndex] === answer);
  };

  const handleAnswer = (opt: string) => {
    if (memberFeedback !== null) return;
    
    const correct = checkAnswer(currentQ, opt);
    const jokerResult = handleOptionClick(opt, correct);
    
    if (jokerResult.shouldBlockEvaluation) {
      playSound('wrong');
      // They get to try again. Just visually show this option is wrong.
      const el = document.getElementById(`opt-\${opt}`);
      if (el) {
        el.classList.add('bg-rose-100', 'border-rose-300', 'text-rose-500', 'shake', 'opacity-50');
      }
      return;
    }

    playSound(correct ? 'correct' : 'wrong');

    setSelectedOpt(opt);
    setMemberFeedback(correct ? 'correct' : 'wrong');
    if (correct) setMemberCorrect(v => v + 1);

    setTimeout(() => {
      setMemberFeedback(null);
      setSelectedOpt(null);
      if (currentQIndex + 1 < 5) {
        resetQuestionState();
        setCurrentQIndex(v => v + 1);
        setCurrentQ(getRandomQuestion());
      } else {
        const timeMs = Date.now() - startTime;
        const perf: StudentPerformance = {
          student: currentGroupMembers[currentMemberIndex],
          correctCount: correct ? memberCorrect + 1 : memberCorrect,
          timeMs
        };
        setCurrentGroupPerformances(prev => [...prev, perf]);
        setState('member-result');
      }
    }, 1000);
  };

  const handleGroupFinish = () => {
    setState('group-ranking');
  };

  const [showRewards, setShowRewards] = useState(false);
  const [rankedGroup, setRankedGroup] = useState<StudentPerformance[]>([]);

  useEffect(() => {
    if (state === 'group-ranking') {
      setShowRewards(false);
      const ranked = [...currentGroupPerformances].sort((a,b) => {
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return a.timeMs - b.timeMs;
      });
      setRankedGroup(ranked);
    }
  }, [state, currentGroupPerformances]);

  const revealRewards = async () => {
    const totalCorrect = rankedGroup.reduce((sum, p) => sum + p.correctCount, 0);
    const gs = rankedGroup.length;

    const rewarded = rankedGroup.map((p, i) => {
      let r = 0;
      if (i === 0) r = totalCorrect * 2;
      else if (i === 1) r = totalCorrect;
      else if (i === 2) r = Math.round(totalCorrect / 2);
      else if (i === 3) r = Math.round(totalCorrect / gs);
      else r = Math.round(totalCorrect / (gs * 2));

      return { ...p, reward: Math.max(1, r) }; // explicitly handle at least 1? Or 0 if they failed completely. Prompt: formulas were given.
    });
    setRankedGroup(rewarded);
    setShowRewards(true);

    // Save to Firestore
    try {
      for (let i = 0; i < rewarded.length; i++) {
         const p = rewarded[i];
         if (!p.reward) continue;
         const studentRef = doc(db, `users/${teacherUid}/students/${p.student.id}`);
         const activityPath = `users/${teacherUid}/students/${p.student.id}/activities`;
         
         // 1. Create activity record
         try {
           await addDoc(collection(db, activityPath), {
             title: 'Grup Yarışması',
             description: `${i+1}. oldun! Grup toplam doğru: ${totalCorrect}`,
             rewardCategory: settings.rewardCategory,
             rewardAmount: p.reward,
             createdAt: serverTimestamp(),
             type: 'grup-yarismasi'
           });
         } catch (err) {
           handleFirestoreError(err, OperationType.CREATE, activityPath);
         }

         // 2. Update student profile
         try {
           await updateDoc(studentRef, {
             stars: increment(p.reward),
             starHistory: arrayUnion({
               category: settings.rewardCategory,
               description: `Grup Yarışması: ${i+1}.lik Ödülü (Grup: ${totalCorrect} Doğru)`,
               amount: p.reward,
               timestamp: Date.now()
             }),
             starAwards: arrayUnion({
               category: settings.rewardCategory,
               amount: p.reward,
               timestamp: Date.now()
             })
           });
         } catch (err) {
           handleFirestoreError(err, OperationType.UPDATE, `users/${teacherUid}/students/${p.student.id}`);
         }
      }
    } catch(err) {
      console.error("General Reward error:", err);
    }
  };

  const nextGroup = () => {
     loadGroup(currentGroupIndex + 1);
  };

  if (state === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="absolute top-6 right-6">
          <button 
            onClick={onBack || onFinish} 
            className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all border border-white/30"
          >
            <X size={24} />
          </button>
        </div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-10 max-w-2xl w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20 rotate-6">
            <Users className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-tighter text-neutral-800">Grup Yarışması</h2>
          <div className="bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-2xl mb-8 font-black text-lg inline-block border-2 border-indigo-100 uppercase tracking-widest mt-2">
            {settings.groupSize} Kişilik Gruplar
          </div>
          <p className="text-xl font-medium text-neutral-500 mb-8 px-4 leading-relaxed">
             Sınıf toplam <span className="text-indigo-600 font-black">{groups.length}</span> gruba ayrıldı.<br/>Her öğrenci 5 soru cevaplayacak ve grup başarısına göre ödül kazanacak.
          </p>
          <button onClick={() => loadGroup(0)} className="w-full py-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-3xl font-black text-2xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/25">
            MÜCADELEYİ BAŞLAT
          </button>
        </motion.div>
      </div>
    );
  }

  if (state === 'ended') {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-900 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-lg w-full text-center">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-4xl font-black mb-4">Tüm Gruplar Bitti!</h2>
          <p className="text-neutral-500 mb-8">Etkinlik tamamlandı ve ödüller dağıtıldı.</p>
          <button onClick={onFinish} className="w-full py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-black hover:bg-neutral-200 transition-colors">Ana Ekrana Dön</button>
        </motion.div>
      </div>
    );
  }

  if (state === 'group-intro') {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="absolute top-6 right-6">
          <button 
            onClick={onBack || onFinish} 
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
          >
            <X size={24} />
          </button>
        </div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-2xl w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20 -rotate-6">
             <span className="text-3xl font-black">{currentGroupIndex + 1}</span>
          </div>
          <h2 className="text-4xl font-black mb-8 uppercase text-neutral-800 tracking-tight">SIradaki TakIM</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {currentGroupMembers.map((m, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-neutral-50 p-5 rounded-2xl border-2 border-neutral-100 font-black text-neutral-700 uppercase text-sm tracking-tight flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">#{i+1}</div>
                <div className="truncate">{m.name} {m.surname}</div>
              </motion.div>
            ))}
          </div>

          <button onClick={() => loadMember(0)} className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl hover:brightness-110 active:scale-95 transition-all uppercase tracking-[0.2em] shadow-xl">
            SAHNEYE ÇIKALIM
          </button>
        </motion.div>
      </div>
    );
  }

  if (state === 'member-ready') {
    const student = currentGroupMembers[currentMemberIndex];
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-900 flex flex-col items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
             <div className="text-indigo-400 font-black tracking-widest uppercase mb-4 text-xl">Sıra Sende</div>
             <h2 className="text-6xl md:text-8xl font-black text-white mb-12 uppercase">{student.name}</h2>
             <button onClick={startMemberPlay} className="px-16 py-6 bg-white text-indigo-600 rounded-full font-black text-3xl uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
               Hazırım
             </button>
          </motion.div>
      </div>
    );
  }

  if (state === 'member-result') {
    const p = currentGroupPerformances[currentGroupPerformances.length - 1];
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-900 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-10 max-w-lg w-full text-center">
          <h2 className="text-3xl font-black mb-4">Harika İş Çıkardın!</h2>
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
               <p className="text-neutral-500 font-bold mb-1">Doğru</p>
               <p className="text-5xl font-black text-emerald-500">{p.correctCount}/5</p>
            </div>
            <div className="w-px h-16 bg-neutral-200" />
            <div className="text-center">
               <p className="text-neutral-500 font-bold mb-1">Süre</p>
               <p className="text-3xl font-black text-blue-500">{(p.timeMs/1000).toFixed(1)}s</p>
            </div>
          </div>
          <button onClick={() => loadMember(currentMemberIndex + 1)} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2">
            Sıradaki Kişi <ArrowRight size={20} />
          </button>
        </motion.div>
      </div>
    );
  }

  if (state === 'group-ranking') {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-900 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-8 md:p-12 max-w-3xl w-full">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-4xl font-black text-neutral-800 uppercase tracking-widest">{currentGroupIndex + 1}. Grup Sonuçları</h2>
          </div>

          <div className="space-y-4 mb-8">
            {rankedGroup.map((p, i) => (
              <div key={i} className={`flex items-center p-4 rounded-2xl border-2 ${i === 0 ? 'bg-amber-50 border-amber-200' : 'border-neutral-100'} transition-all`}>
                 <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl bg-neutral-100 text-neutral-500 shrink-0 mr-4">
                    #{i + 1}
                 </div>
                 <div className="flex-1">
                    <p className="font-black text-xl text-neutral-800">{p.student.name} {p.student.surname}</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-400">Doğru</p>
                      <p className="font-black text-emerald-500 text-xl">{p.correctCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-400">Süre</p>
                      <p className="font-black text-blue-500 text-xl">{(p.timeMs/1000).toFixed(1)}s</p>
                    </div>
                    {showRewards && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 bg-amber-100 p-2 text-center rounded-xl border border-amber-200">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500 mx-auto mb-1" />
                        <p className="font-black text-amber-700">+{p.reward}</p>
                      </motion.div>
                    )}
                 </div>
              </div>
            ))}
          </div>

          {!showRewards ? (
             <button onClick={revealRewards} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-2xl hover:bg-amber-600 transition-colors uppercase tracking-widest shadow-xl">
               Ödül Sıralaması
             </button>
          ) : (
             <button onClick={nextGroup} className="w-full py-5 bg-neutral-800 text-white rounded-2xl font-black text-xl hover:bg-neutral-900 transition-colors">
               Sonraki Gruba Geç
             </button>
          )}
        </motion.div>
      </div>
    );
  }

  // playing
  const student = currentGroupMembers[currentMemberIndex];
  return (
    <div className="fixed inset-0 z-[100] bg-neutral-100 flex flex-col pt-safe">
      <div className="h-2 bg-neutral-200 flex overflow-hidden">
        {Array.from({length: 5}).map((_,i) => (
          <div key={i} className={`flex-1 ${i < currentQIndex ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
        ))}
      </div>
      <div className="bg-white p-4 shadow-sm flex items-center justify-between shrink-0 z-10 border-b">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-black uppercase text-sm">
             {student.name} {student.surname}
          </div>
          <div className="font-bold text-neutral-400 text-sm">Soru {currentQIndex + 1}/5</div>
        </div>
        <button 
          onClick={() => {
            if (window.confirm('Yarışmadan çıkmak istediğinize emin misiniz?')) {
              onBack ? onBack() : onFinish();
            }
          }}
          className="p-3 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors flex items-center gap-2 font-black text-xs uppercase"
        >
          <X size={20} />
          Çıkış
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 pb-24 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl w-full pt-8 pb-16">
           <AnimatePresence mode="wait">
             <motion.div key={currentQIndex} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}>
               
               <JokerToolbar 
                 state={jokerState}
                 onFiftyFifty={useFiftyFifty}
                 onDoubleChance={useDoubleChance}
                 onSkip={() => handleSkipQuestion(() => setCurrentQ(getRandomQuestion()))}
                 onFriendHelp={() => initFriendHelp(students, currentGroupMembers.map(m => m.id))}
               />
               
               <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-neutral-100 mb-8 flex flex-col items-center text-center">
                 {currentQ?.imageUrl && (
                   <img src={currentQ.imageUrl} alt="Soru" className="max-w-xs object-contain mb-8 rounded-xl" />
                 )}
                 <h2 className="text-3xl md:text-4xl font-black text-neutral-800 leading-tight">
                   {currentQ?.text}
                 </h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {(currentQ?.options || []).length > 0 ? (
                   currentQ.options.map((opt: string, i: number) => {
                     const isHidden = jokerState.hiddenOptions.includes(opt);
                     if (isHidden) {
                       return <div key={i} className="p-6 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 opacity-20 pointer-events-none" />;
                     }
                     
                     const isAnswered = memberFeedback !== null;
                     const isCorrect = checkAnswer(currentQ, opt);
                     const isClicked = selectedOpt === opt;
                     
                     let btnStyle = "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-indigo-200 shadow-sm";
                     if (isAnswered) {
                       if (isCorrect) btnStyle = "bg-emerald-500 border-emerald-500 text-white scale-105 shadow-xl";
                       else if (isClicked) btnStyle = "bg-rose-500 border-rose-600 text-white shadow-xl shake";
                       else btnStyle = "bg-neutral-100 border-neutral-200 text-neutral-400 opacity-60";
                     }

                     return (
                       <button
                         key={i}
                         id={`opt-${opt}`}
                         onClick={() => handleAnswer(opt)}
                         disabled={isAnswered}
                         className={`p-6 border-2 rounded-2xl text-xl font-bold transition-all ${btnStyle}`}
                       >
                         {opt}
                       </button>
                     );
                   })
                 ) : (
                   <div className="col-span-full text-center p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-amber-700 font-bold">
                     Seçenekler yüklenemedi
                   </div>
                 )}
               </div>
             </motion.div>
           </AnimatePresence>
        </div>
      </div>
      
      <FriendHelpModal 
        isOpen={friendHelpModalOpen} 
        friends={friendHelpFriends} 
        onSelect={(f) => {
          selectFriendHelper(f);
        }} 
      />
      <FriendAdviceModal 
        isOpen={!!friendAdvice} 
        friendName={friendAdvice?.friendName || ''} 
        recommendedOption={friendAdvice?.recommendedOption || ''} 
        onClose={() => setFriendAdvice(null)} 
        onApply={() => {
          if (friendAdvice) {
            handleAnswer(friendAdvice.recommendedOption);
          }
        }} 
      />
    </div>
  );
};
