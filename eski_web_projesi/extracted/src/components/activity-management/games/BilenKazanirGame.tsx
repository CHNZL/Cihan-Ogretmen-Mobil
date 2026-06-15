import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, ArrowRight, Play, X } from 'lucide-react';
import { collection, serverTimestamp, updateDoc, increment, arrayUnion, addDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { useJokers } from './useJokers';
import { JokerToolbar, FriendHelpModal, FriendAdviceModal } from './JokerUI';

interface BilenKazanirGameProps {
  students: any[];
  selectedStudents?: string[];
  questions: any[];
  subject: string;
  teacherUid: string;
  settings?: {
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

export const BilenKazanirGame: React.FC<BilenKazanirGameProps> = ({ 
  students, 
  selectedStudents,
  questions, 
  subject, 
  teacherUid,
  settings, 
  onFinish,
  onBack 
}) => {
  const [queue, setQueue] = useState<any[]>([]);
  const initializedRef = React.useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [state, setState] = useState<'intro' | 'playing' | 'feedback' | 'ended'>('intro');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const {
    jokerState,
    useFiftyFifty,
    useDoubleChance,
    initFriendHelp,
    selectFriendHelper,
    friendHelpModalOpen,
    friendHelpFriends,
    friendAdvice,
    setFriendAdvice,
    handleOptionClick,
    resetJokersForNewTurn,
    handleSkipQuestion
  } = useJokers(settings || {}, currentQuestion);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let filtered = [...students];
    if (selectedStudents && selectedStudents.length > 0) {
      filtered = filtered.filter(s => selectedStudents.includes(s.id));
    }
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    setQueue(shuffled);
  }, [students, selectedStudents]);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const lastQuestionIdRef = React.useRef<string | null>(null);

  const startNextStudent = (newIndex?: number) => {
    setIsNavigating(false); 
    const targetIndex = newIndex !== undefined ? newIndex : currentIndex;
    
    if (targetIndex >= queue.length) {
      setState('ended');
      return;
    }
    
    const valid = questions.filter(q => q.options && q.options.length > 0);
    if (valid.length === 0) {
      console.error("No questions available for Bilen Kazanır game.");
      setState('ended');
      return;
    }

    let nextQ;
    if (valid.length > 1) {
      const remaining = valid.filter(q => q.id !== lastQuestionIdRef.current);
      nextQ = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      nextQ = valid[0];
    }
    
    lastQuestionIdRef.current = nextQ.id;
    setCurrentQuestion(nextQ);
    resetJokersForNewTurn();
    setState('playing');
  };

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

  const checkAnswer = (q: any, option: string) => {
    if (!q) return false;
    const answer = q.answer?.toString().trim().toLowerCase();
    const optText = option?.toString().trim().toLowerCase();
    const optIndex = q.options?.indexOf(option);
    const indexLabels = ['a', 'b', 'c', 'd'];
    return (answer === optText) || (optIndex !== -1 && indexLabels[optIndex] === answer);
  };

  const handleAnswer = async (option: string) => {
    if (state !== 'playing') return; 

    const correct = checkAnswer(currentQuestion, option);
    
    const jokerResult = handleOptionClick(option, correct);
    if (jokerResult.shouldBlockEvaluation) {
      playSound('wrong');
      const el = document.getElementById(`opt-${option}`);
      if (el) {
        el.classList.add('bg-rose-100', 'border-rose-300', 'text-rose-500', 'shake', 'opacity-50');
      }
      return;
    }

    setIsCorrect(correct);
    setState('feedback');

    if (correct) {
      playSound('correct');
      try {
        const student = queue[currentIndex];
        const studentRef = doc(db, `users/${teacherUid}/students/${student.id}`);
        const activityPath = `users/${teacherUid}/students/${student.id}/activities`;
        
        const rewardCategoryForHistory = settings?.rewardCategory || `${subject} Yıldızı`;
        const rewardAmountForHistory = settings?.rewardAmount || 1;

        try {
          await addDoc(collection(db, activityPath), {
            title: 'Bilen Kazanır',
            description: currentQuestion.text || 'Soru başarıyla cevaplandı.',
            rewardCategory: rewardCategoryForHistory,
            rewardAmount: rewardAmountForHistory,
            createdAt: serverTimestamp(),
            type: 'bilen-kazanir'
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, activityPath);
        }

        try {
          await updateDoc(studentRef, {
            stars: increment(rewardAmountForHistory),
            starHistory: arrayUnion({
              category: rewardCategoryForHistory,
              description: `Bilen Kazanır: ${currentQuestion.text?.substring(0, 30)}...`,
              amount: rewardAmountForHistory,
              timestamp: Date.now()
            }),
            starAwards: arrayUnion({
              category: rewardCategoryForHistory,
              amount: rewardAmountForHistory,
              timestamp: Date.now()
            })
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${teacherUid}/students/${student.id}`);
        }
      } catch (err) {
        console.error("General Reward error", err);
      }
    } else {
      playSound('wrong');
    }
  };

  const currentStudent = queue[currentIndex];
  const nextStudent = queue[currentIndex + 1];

  if (state === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 flex items-center justify-center p-4">
        <div className="absolute top-6 right-6">
          <button onClick={onBack || onFinish} className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all border border-white/30">
            <X size={24} />
          </button>
        </div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-10 max-w-2xl w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20 rotate-6">
            <Trophy className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-tighter text-neutral-800">Bilen Kazanır</h2>
          <p className="text-xl font-medium text-neutral-500 mb-8 px-4 leading-relaxed">
             Etkinlik Başlıyor! İlk yarışmacı:<br/>
             <span className="text-emerald-600 font-extrabold text-3xl block mt-2">{queue[0]?.name} {queue[0]?.surname}</span>
          </p>
          <button onClick={() => startNextStudent(0)} className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl font-black text-2xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3">
            <Play fill="currentColor" size={28} /> BAŞLA
          </button>
        </motion.div>
      </div>
    );
  }

  if (state === 'ended') {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-10 max-w-2xl w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <Trophy className="w-14 h-14 text-amber-50" />
          </div>
          <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter text-neutral-800">Etkinlik Tamamlandı!</h2>
          <p className="text-xl font-medium text-neutral-500 mb-10 leading-relaxed px-6">
            Tebrikler! Tüm öğrenciler sorularını cevapladı ve yarışma başarıyla sona erdi.
          </p>
          <button onClick={onFinish} className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl font-black text-2xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3">
            ANA EKRANA DÖN
          </button>
        </motion.div>
      </div>
    );
  }

  if (!currentStudent && state !== 'intro') return (
    <div className="fixed inset-0 z-[100] bg-neutral-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-neutral-500">Yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-100 flex flex-col pt-safe">
      <div className="bg-white p-4 shadow-sm flex items-center justify-between shrink-0 z-10 border-b">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-black text-xl border-2 border-emerald-200">
            {currentIndex + 1}/{queue.length}
          </div>
          <div>
            <h3 className="font-black text-xl text-neutral-800">{currentStudent.name} {currentStudent.surname}</h3>
            <p className="text-sm text-neutral-500 font-bold uppercase tracking-wider">Bilen Kazanır</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative p-6 md:p-12 flex flex-col justify-center">
        {state === 'playing' && currentQuestion && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6 text-neutral-500">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-black">
                {currentIndex + 1} / {queue.length}
              </span>
              <span className="font-bold text-lg">
                Yarışan Öğrenci: <span className="text-emerald-600 font-black">{currentStudent.name} {currentStudent.surname}</span>
              </span>
            </div>

            <JokerToolbar 
              state={jokerState}
              onFiftyFifty={useFiftyFifty}
              onDoubleChance={useDoubleChance}
              onSkip={() => handleSkipQuestion(() => startNextStudent(currentIndex))}
              onFriendHelp={() => initFriendHelp(students, [currentStudent.id])}
            />

            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border-4 border-emerald-100 mb-8 flex flex-col items-center">
              {currentQuestion.imageUrl && (
                <img src={currentQuestion.imageUrl} alt="Soru" className="w-full max-w-xl max-h-64 object-contain mb-8 rounded-xl" />
              )}
              <h2 className="text-2xl md:text-4xl font-black text-center text-neutral-800 leading-tight">
                {currentQuestion.text}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentQuestion.options || []).length > 0 ? (
                currentQuestion.options.map((opt: string, i: number) => {
                  const isHidden = jokerState.hiddenOptions.includes(opt);
                  if (isHidden) {
                    return <div key={i} className="p-6 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 opacity-20 pointer-events-none" />;
                  }
                  return (
                    <button id={`opt-${opt}`} key={i} onClick={() => handleAnswer(opt)} className="p-6 bg-white border-2 border-neutral-200 rounded-2xl text-xl font-bold hover:border-emerald-500 hover:bg-emerald-50 transition-all text-neutral-700 shadow-sm hover:shadow">
                      {opt}
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full text-center p-12 bg-amber-50 rounded-[2rem] border-2 border-amber-200 text-amber-700 font-bold flex flex-col items-center gap-6">
                  <p className="text-2xl font-black italic">Opss! Teknik Bir Aksaklık...</p>
                  <button onClick={() => startNextStudent(currentIndex)} className="px-10 py-5 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all font-black text-xl shadow-lg shadow-amber-500/30 flex items-center gap-2">
                    YENİ SORU GETİR
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {state === 'feedback' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-xl w-full mx-auto bg-white p-10 rounded-[3rem] shadow-2xl text-center">
            {isCorrect ? (
              <>
                <Star className="w-24 h-24 text-emerald-500 mx-auto mb-6 fill-emerald-500" />
                <h2 className="text-3xl font-black text-emerald-600 mb-2">Tebrikler Doğru Cevap!</h2>
                <p className="text-lg font-bold text-neutral-600 mb-8">{settings?.rewardAmount || 1} {subject} Yıldızı Kazandın</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black">X</div>
                <h2 className="text-3xl font-black text-rose-600 mb-2">Maalesef Yanlış</h2>
                <p className="text-lg font-bold text-neutral-600 mb-8">Doğru Cevap: <span className="text-emerald-500 font-extrabold">{currentQuestion?.answer}</span></p>
              </>
            )}

            <div className="mt-8 pt-8 border-t-2 border-dashed border-neutral-100">
              {nextStudent ? (
                 <button 
                   disabled={isNavigating}
                   onClick={() => {
                      if(isNavigating) return;
                      setIsNavigating(true);
                      const nextIdx = currentIndex + 1;
                      setCurrentIndex(nextIdx);
                      startNextStudent(nextIdx);
                   }} 
                   className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg hover:bg-emerald-600 transition-colors flex justify-center items-center gap-2"
                 >
                   Devam <ArrowRight size={20} />
                 </button>
              ) : (
                 <button 
                   onClick={() => setState('ended')}
                   className="w-full py-4 bg-pink-500 text-white rounded-2xl font-black text-lg hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
                 >
                   <Trophy size={20} /> Etkinliği Tamamla
                 </button>
              )}
            </div>
          </motion.div>
        )}
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
