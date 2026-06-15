import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Trophy, Play, Star, ChevronRight, CheckCircle2, 
  Settings, Clock, Target, Hash, RefreshCw, X, Shuffle, AlertCircle, Info, Zap, Award
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { doc, updateDoc, increment, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface CarpimTablosuActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo: () => void;
}

export const CarpimTablosuActivity: React.FC<CarpimTablosuActivityProps> = ({ onBack, students, user, onShowInfo }) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<number>(5); // Max multiplier
  const [isRewardSettingsOpen, setIsRewardSettingsOpen] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(10);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  
  // Game State
  const [question, setQuestion] = useState<{a: number, b: number, answer: number, options: number[]} | null>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const generateQuestion = () => {
    const a = Math.floor(Math.random() * difficulty) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const answer = a * b;
    
    const options = new Set<number>([answer]);
    while (options.size < 4) {
      const fake = (Math.floor(Math.random() * difficulty) + 1) * (Math.floor(Math.random() * 10) + 1);
      if (fake !== answer) options.add(fake);
    }
    
    setQuestion({ a, b, answer, options: Array.from(options).sort(() => Math.random() - 0.5) });
    setTimeLeft(5);
    setIsTimerActive(true);
  };

  useEffect(() => {
    let timer: any;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      generateQuestion(); // Skip to next if no one answers? Or just wait? 
      // For duel, we'll just keep the question until someone answers or it's a draw?
      // Actually, let's keep it simple: whoever answers first.
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const handleStartGame = () => {
    if (selectedStudents.length !== 2) return;
    setGameState('playing');
    setP1Score(0);
    setP2Score(0);
    setWinner(null);
    generateQuestion();
  };

  const handleAnswer = (playerIdx: number, chosen: number) => {
    if (chosen === question?.answer) {
      if (playerIdx === 1) setP1Score(prev => prev + 1);
      else setP2Score(prev => prev + 1);
      
      if (p1Score + (playerIdx === 1 ? 1 : 0) >= 5) {
        setWinner(selectedStudents[0]);
        setGameState('results');
        setIsTimerActive(false);
      } else if (p2Score + (playerIdx === 2 ? 1 : 0) >= 5) {
        setWinner(selectedStudents[1]);
        setGameState('results');
        setIsTimerActive(false);
      } else {
        generateQuestion();
      }
    } else {
      // Wrong answer effect?
    }
  };

  const handleFinishAndReward = async () => {
    if (!user || !winner) return;
    
    try {
      const winnerStudent = students.find(s => s.id === winner);
      if (winnerStudent) {
        const studentRef = doc(db, `users/${user.uid}/students`, winner);
        await updateDoc(studentRef, {
          stars: increment(rewardAmount),
          badges: arrayUnion({
            id: 'carpim-duel-' + Date.now(),
            name: 'Çarpım Tablosu Şampiyonu',
            date: new Date().toISOString(),
            icon: 'Zap'
          })
        });

        await addDoc(collection(db, `users/${user.uid}/activityScores`), {
          activityId: 'carpim-tablosu',
          studentId: winner,
          studentName: winnerStudent.name,
          score: 1, // 1 victory
          timestamp: serverTimestamp()
        });
      }
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/students`);
    }
  };

  if (gameState === 'playing' && question) {
    const p1 = students.find(s => s.id === selectedStudents[0]);
    const p2 = students.find(s => s.id === selectedStudents[1]);

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button onClick={() => setGameState('setup')} className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 text-neutral-500">
            <X size={20} />
          </button>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{p1?.name}</p>
              <p className="text-4xl font-black text-indigo-600">{p1Score}</p>
            </div>
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center font-black text-neutral-400">VS</div>
            <div className="text-center">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{p2?.name}</p>
              <p className="text-4xl font-black text-rose-600">{p2Score}</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 dark:border-neutral-800 flex items-center justify-center font-black text-indigo-600">
            {timeLeft}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8 p-6">
          {/* Player 1 Side */}
          <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] p-8 flex flex-col items-center justify-center border-4 border-indigo-100 dark:border-indigo-900/30">
            <h2 className="text-6xl font-black text-indigo-900 dark:text-indigo-100 mb-12">{question.a} × {question.b}</h2>
            <div className="grid grid-cols-2 gap-4 w-full">
              {question.options.map(opt => (
                <button 
                  key={`p1-${opt}`}
                  onClick={() => handleAnswer(1, opt)}
                  className="bg-white dark:bg-neutral-800 p-6 rounded-2xl text-3xl font-black text-indigo-600 shadow-xl shadow-indigo-100/50 hover:scale-105 active:scale-95 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Player 2 Side */}
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-[3rem] p-8 flex flex-col items-center justify-center border-4 border-rose-100 dark:border-rose-900/30">
            <h2 className="text-6xl font-black text-rose-900 dark:text-rose-100 mb-12">{question.a} × {question.b}</h2>
            <div className="grid grid-cols-2 gap-4 w-full">
              {question.options.map(opt => (
                <button 
                  key={`p2-${opt}`}
                  onClick={() => handleAnswer(2, opt)}
                  className="bg-white dark:bg-neutral-800 p-6 rounded-2xl text-3xl font-black text-rose-600 shadow-xl shadow-rose-100/50 hover:scale-105 active:scale-95 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'results' && winner) {
    const winnerStudent = students.find(s => s.id === winner);
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-32 h-32 bg-amber-400 rounded-full flex items-center justify-center text-6xl mb-8 shadow-2xl">👑</motion.div>
        <h1 className="text-5xl font-black text-neutral-900 mb-4 uppercase tracking-tighter">Tebrikler!</h1>
        <p className="text-2xl font-bold text-indigo-600 mb-8">{winnerStudent?.name} Düelloyu Kazandı!</p>
        <button onClick={handleFinishAndReward} className="px-12 py-5 bg-emerald-500 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-105 transition-all">
          Ödülü Ver ve Bitir
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[800px] w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950 p-4 md:p-8">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/20 dark:bg-rose-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 hover:text-indigo-600 rounded-[2rem] transition-all shadow-xl shadow-neutral-200/50 dark:shadow-none"
            >
              <ArrowLeft size={24} />
            </motion.button>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                  <RefreshCw size={24} className="animate-spin-slow" />
                </div>
                <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">
                  Çarpım Tablosu Düellosu
                </h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  onClick={onShowInfo}
                  className="p-2 text-neutral-400 hover:text-indigo-600 transition-colors"
                >
                  <Info size={24} />
                </motion.button>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 font-bold ml-1">
                Matematik zekanı konuştur, rakiplerini geride bırak!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRewardSettingsOpen(true)}
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-amber-500 rounded-[2rem] shadow-xl shadow-neutral-200/50 dark:shadow-none"
            >
              <Settings size={24} />
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Player Selection */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-12 xl:col-span-8 bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-[1.5rem]">
                  <Users size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-800 dark:text-white uppercase tracking-tight">Efsane Yarışmacılar</h3>
                  <p className="text-neutral-400 dark:text-neutral-500 font-bold text-sm">Düello için 2 kahraman seçmelisin</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedStudents([])}
                  className="px-6 py-2 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Tümünü Temizle
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar p-1">
              {students.map((s, idx) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (selectedStudents.includes(s.id)) {
                      setSelectedStudents(prev => prev.filter(id => id !== s.id));
                    } else if (selectedStudents.length < 2) {
                      setSelectedStudents(prev => [...prev, s.id]);
                    }
                  }}
                  className={`relative group p-6 rounded-[2rem] border-2 transition-all text-left overflow-hidden ${
                    selectedStudents.includes(s.id) 
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-none' 
                      : 'border-neutral-100 dark:border-neutral-800 hover:border-indigo-200 dark:hover:border-indigo-900/50'
                  }`}
                >
                  {/* Selection Indicator */}
                  <div className={`absolute top-4 right-4 transition-all duration-300 ${selectedStudents.includes(s.id) ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                    <div className="bg-indigo-600 text-white p-1 rounded-full">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>

                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 mb-2 uppercase tracking-widest">#{s.studentNo}</p>
                  <p className="font-black text-neutral-800 dark:text-white text-lg leading-tight uppercase tracking-tight">{s.name}</p>
                  
                  {/* Accent Line */}
                  <div className={`mt-4 h-1 w-8 rounded-full transition-all duration-300 ${selectedStudents.includes(s.id) ? 'bg-indigo-600 w-16' : 'bg-neutral-200 dark:bg-neutral-800 group-hover:bg-indigo-200'}`} />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Config & Start */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none"
            >
              <h3 className="text-2xl font-black mb-8 flex items-center gap-4 dark:text-white">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl">
                  <Zap size={24} />
                </div>
                <div>
                  <span className="block uppercase tracking-tight">Zorluk Arenası</span>
                  <span className="block text-xs text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Kat Sayıları Belirle</span>
                </div>
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { val: 5, label: 'Kolay Mertebe', desc: '1-5 Çarpımları', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                  { val: 10, label: 'Orta Kademe', desc: '1-10 Çarpımları', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                  { val: 15, label: 'Master Seviye', desc: '1-15 Çarpımları', color: 'bg-rose-50 text-rose-600 border-rose-100' }
                ].map(opt => (
                  <motion.button
                    key={opt.val}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDifficulty(opt.val)}
                    className={`relative p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-1 ${
                      difficulty === opt.val 
                        ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' 
                        : 'border-neutral-50 dark:border-neutral-800 hover:border-indigo-100 dark:hover:border-indigo-900/30'
                    }`}
                  >
                    <span className="text-lg font-black text-neutral-800 dark:text-white uppercase tracking-tight">{opt.label}</span>
                    <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">{opt.desc}</span>
                    
                    {difficulty === opt.val && (
                      <motion.div 
                        layoutId="difficulty-indicator"
                        className="absolute right-6 top-1/2 -translate-y-1/2"
                      >
                        <Award className="text-indigo-600" size={24} />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartGame}
              disabled={selectedStudents.length !== 2}
              className="group relative w-full py-8 bg-indigo-600 text-white rounded-[3rem] font-black text-2xl shadow-2xl shadow-indigo-200 dark:shadow-none overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              <div className="relative flex items-center justify-center gap-4">
                <Play fill="currentColor" size={28} />
                <span className="uppercase tracking-tighter">Savaşı Başlat!</span>
              </div>
            </motion.button>

            {selectedStudents.length !== 2 && (
              <p className="text-center text-sm font-bold text-neutral-400 dark:text-neutral-500 animate-pulse">
                🤜 Başlamak için 2 şampiyon seçmelisin 🤛
              </p>
            )}
          </div>
        </div>

        {/* Bottom Decorative Pattern */}
        <div className="flex justify-center gap-4 opacity-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="text-4xl font-black select-none">×</div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isRewardSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Ganimetler</h3>
                <button onClick={() => setIsRewardSettingsOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Kazanan Şampiyon Ödülü</label>
                  <div className="flex items-center gap-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-3xl">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRewardAmount(Math.max(1, rewardAmount - 5))} 
                      className="w-14 h-14 bg-white dark:bg-neutral-700 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border border-neutral-100 dark:border-neutral-600"
                    >-</motion.button>
                    
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-black text-4xl text-amber-500">{rewardAmount}</span>
                        <Star className="text-amber-500" fill="currentColor" size={24} />
                      </div>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1 block">Yıldız Puanı</span>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRewardAmount(rewardAmount + 5)} 
                      className="w-14 h-14 bg-white dark:bg-neutral-700 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border border-neutral-100 dark:border-neutral-600"
                    >+</motion.button>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 text-center leading-relaxed italic">
                    "Büyük ödüller, büyük zaferler getirir. Şampiyonu hemen seç ve düelloya başla!"
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsRewardSettingsOpen(false)} 
                className="w-full mt-10 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg uppercase tracking-tighter shadow-xl shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] transition-all"
              >
                AYARLARI MÜHÜRLE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
