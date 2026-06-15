import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Trophy, Play, Star, CheckCircle2, 
  Settings, Target, RefreshCw, X, Info, Award, Plus, Minus, Users, ChevronRight
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { doc, updateDoc, increment, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface RitmikSaymaActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo: () => void;
}

type GameMode = 'practice' | 'duel';

export const RitmikSaymaActivity: React.FC<RitmikSaymaActivityProps> = ({ onBack, students, user, onShowInfo }) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode | ''>('');
  const [stepValue, setStepValue] = useState(2);
  const [startValue, setStartValue] = useState(0);
  const [targetCount, setTargetCount] = useState(10); // How many numbers to count
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [rewardAmount, setRewardAmount] = useState(10);
  const [isRewardSettingsOpen, setIsRewardSettingsOpen] = useState(false);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  const [isPreparing, setIsPreparing] = useState(true); // For sequential start
  const [currentStudentIdx, setCurrentStudentIdx] = useState(0);
  
  // Game Play State
  const [playerStates, setPlayerStates] = useState<{[id: string]: {current: number, count: number, options: number[]}}>({});
  const [scores, setScores] = useState<{[id: string]: number}>({});
  const [winners, setWinners] = useState<string[]>([]);

  const generateOptions = (correct: number) => {
    const opts = new Set<number>([correct]);
    while (opts.size < 4) {
      const offset = (Math.floor(Math.random() * 3) + 1) * (Math.random() > 0.5 ? 1 : -1) * stepValue;
      opts.add(Math.abs(correct + offset));
    }
    return Array.from(opts).sort(() => Math.random() - 0.5);
  };

  const handleStartGame = () => {
    if (selectedStudents.length === 0) return;
    if (gameMode === 'duel' && selectedStudents.length !== 2) return;

    const initialStates: {[id: string]: any} = {};
    const initialScores: {[id: string]: number} = {};
    
    selectedStudents.forEach(id => {
      const nextValue = direction === 'forward' ? startValue + stepValue : startValue - stepValue;
      initialStates[id] = {
        current: startValue,
        count: 0,
        options: generateOptions(nextValue)
      };
      initialScores[id] = 0;
    });

    setPlayerStates(initialStates);
    setScores(initialScores);
    setGameState('playing');
    setIsPreparing(true);
    setCurrentStudentIdx(0);
    setWinners([]);
  };

  const handleAnswer = (studentId: string, chosen: number) => {
    const state = playerStates[studentId];
    const nextCorrect = direction === 'forward' ? state.current + stepValue : state.current - stepValue;
    
    if (chosen === nextCorrect) {
      const newCount = state.count + 1;
      if (newCount >= targetCount) {
        // Current student finished
        setWinners(prev => [...prev, studentId]);
        
        if (gameMode === 'duel') {
            // In duel, we check if someone already finished
            if (winners.length + 1 >= 2 || (winners.length + 1 >= selectedStudents.length)) {
                setTimeout(() => setGameState('results'), 1000);
            }
        } else {
            // In practice (sequential), move to next
            if (currentStudentIdx < selectedStudents.length - 1) {
                setTimeout(() => {
                    setCurrentStudentIdx(prev => prev + 1);
                    setIsPreparing(true);
                }, 1500);
            } else {
                setTimeout(() => setGameState('results'), 1500);
            }
        }
      } else {
        const newerValue = nextCorrect;
        const evenNewerNext = direction === 'forward' ? newerValue + stepValue : newerValue - stepValue;
        setPlayerStates(prev => ({
          ...prev,
          [studentId]: {
            current: newerValue,
            count: newCount,
            options: generateOptions(evenNewerNext)
          }
        }));
        setScores(prev => ({ ...prev, [studentId]: prev[studentId] + 10 }));
      }
    }
  };

  const handleFinishAndReward = async () => {
    if (!user || winners.length === 0) return;
    
    try {
      const winnerId = winners[0];
      const winner = students.find(s => s.id === winnerId);
      
      if (winner) {
        const studentRef = doc(db, `users/${user.uid}/students`, winnerId);
        await updateDoc(studentRef, {
          stars: increment(rewardAmount),
          badges: arrayUnion({
            id: 'ritmik-' + Date.now(),
            name: 'Ritmik Sayma Şampiyonu',
            date: new Date().toISOString(),
            icon: 'Target'
          })
        });

        await addDoc(collection(db, `users/${user.uid}/activityScores`), {
          activityId: 'ritmik-sayma',
          instanceId: 'ritmik-sayma-' + Date.now(),
          studentId: winnerId,
          studentName: winner.name,
          totalScore: 1, // Winner of the duel
          teacherUid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/students`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 hover:bg-neutral-100 rounded-2xl transition-colors text-neutral-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Target className="text-fuchsia-500" /> Ritmik Sayma Düellosu
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium italic">Sayılar arası eğlenceli ve hızlı bir yolculuk</p>
          </div>
        </div>
        <button 
          onClick={onShowInfo}
          className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-2xl hover:bg-neutral-200 transition-all flex items-center gap-2 font-bold"
        >
          <Info size={20} /> Bilgilendirme
        </button>
      </div>

    <div className="relative min-h-[800px] w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950 p-4 md:p-8">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-fuchsia-200/20 dark:bg-fuchsia-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: 'radial-gradient(#d946ef 1px, transparent 1px)', 
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
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 hover:text-fuchsia-600 rounded-[2rem] transition-all shadow-xl shadow-neutral-200/50 dark:shadow-none"
            >
              <ArrowLeft size={24} />
            </motion.button>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-fuchsia-600 rounded-xl text-white shadow-lg shadow-fuchsia-200 dark:shadow-none font-black text-xs">
                  <Target size={24} />
                </div>
                <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">
                  Ritmik Sayma Düellosu
                </h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  onClick={onShowInfo}
                  className="p-2 text-neutral-400 hover:text-fuchsia-600 transition-colors"
                >
                  <Info size={24} />
                </motion.button>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 font-bold ml-1 italic">
                Sayıların ritmiyle dans etmeye ve zirveye tırmanmaya hazır ol!
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

        {gameState === 'setup' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Settings */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-12 xl:col-span-4 space-y-6"
            >
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none space-y-8">
                <h3 className="text-2xl font-black text-neutral-800 dark:text-white uppercase tracking-tight flex items-center gap-4">
                  <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
                    <Settings size={24} />
                  </div>
                  Arena Ayarları
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Oyun Modu</label>
                    <div className="relative">
                      <select
                         value={gameMode || ''}
                         onChange={(e) => {
                           setGameMode(e.target.value as any);
                           setSelectedStudents([]);
                         }}
                         className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 rounded-2xl font-black text-neutral-800 dark:text-white appearance-none border-2 border-transparent focus:border-indigo-500 transition-all uppercase tracking-tight text-sm px-6"
                      >
                         <option value="" disabled>🌟 Mod Seçin</option>
                         <option value="practice">⚔️ Alıştırma</option>
                         <option value="duel">🔥 Düello</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                        <ChevronRight className="rotate-90" size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Artış Miktarı</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[2, 3, 4, 5, 10].map(v => (
                        <button 
                          key={v} 
                          onClick={() => setStepValue(v)} 
                          className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${
                            stepValue === v 
                            ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-100 dark:shadow-none' 
                            : 'bg-neutral-50 dark:bg-neutral-800 border-transparent text-neutral-400'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">Başlangıç</label>
                      <input 
                        type="number" 
                        value={startValue} 
                        onChange={(e) => setStartValue(parseInt(e.target.value) || 0)}
                        className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl font-black text-xl border-none text-center focus:ring-2 focus:ring-fuchsia-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">Hedef Adım</label>
                      <input 
                        type="number" 
                        value={targetCount} 
                        onChange={(e) => setTargetCount(parseInt(e.target.value) || 10)}
                        className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl font-black text-xl border-none text-center focus:ring-2 focus:ring-fuchsia-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Sayma Yönü</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setDirection('forward')} 
                        className={`py-4 rounded-xl font-black flex items-center justify-center gap-2 border-2 transition-all ${
                          direction === 'forward' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'bg-neutral-50 dark:bg-neutral-800 border-transparent text-neutral-400'
                        }`}
                      >
                        <Plus size={18} /> İleri Say
                      </button>
                      <button 
                        onClick={() => setDirection('backward')} 
                        className={`py-4 rounded-xl font-black flex items-center justify-center gap-2 border-2 transition-all ${
                          direction === 'backward' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'bg-neutral-50 dark:bg-neutral-800 border-transparent text-neutral-400'
                        }`}
                      >
                        <Minus size={18} /> Geri Say
                      </button>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartGame}
                  disabled={!gameMode || (gameMode === 'duel' ? selectedStudents.length !== 2 : selectedStudents.length === 0)}
                  className="w-full py-8 bg-fuchsia-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-fuchsia-100 dark:shadow-none overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                  <div className="relative flex items-center justify-center gap-4">
                    <Play fill="currentColor" size={24} />
                    <span className="uppercase tracking-tighter">{gameMode === 'duel' ? 'Düelloyu Başlat' : 'Macerayı Başlat'}</span>
                  </div>
                </motion.button>
              </div>
            </motion.div>

            {/* Right Column: Player Selection */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-12 xl:col-span-8 bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none min-h-[600px] flex flex-col"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
                    <Users size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-neutral-800 dark:text-white uppercase tracking-tight">Kadro Seçimi</h3>
                    <p className="text-neutral-400 dark:text-neutral-500 font-bold text-sm">
                      Mücadele edecek ritmik şampiyonları belirleyin
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedStudents(students.map(s => s.id))}
                    className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-black uppercase hover:bg-indigo-100 transition-colors"
                  >
                    Tümünü Seç
                  </button>
                  <button 
                    onClick={() => setSelectedStudents([])}
                    className="px-6 py-2 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-black uppercase hover:bg-neutral-100 transition-colors"
                  >
                    Sıfırla
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar p-1">
                {students.map((student, idx) => {
                  const isSelected = selectedStudents.includes(student.id);
                  return (
                    <motion.button
                      key={student.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedStudents(prev => prev.filter(id => id !== student.id));
                        } else {
                          if (gameMode === 'duel' && selectedStudents.length >= 2) return;
                          setSelectedStudents(prev => [...prev, student.id]);
                        }
                      }}
                      className={`relative group p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${
                        isSelected 
                        ? 'border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-900/20 shadow-lg shadow-fuchsia-100 dark:shadow-none' 
                        : 'border-neutral-50 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-fuchsia-200 dark:hover:border-fuchsia-900/50'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-sm transition-all ${
                        isSelected ? 'bg-fuchsia-500 text-white scale-110' : 'bg-white dark:bg-neutral-700 text-neutral-400'
                      }`}>
                        {student.name[0]}
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">#{student.studentNo}</span>
                        <span className="block text-sm font-black uppercase text-neutral-800 dark:text-white truncate w-32">{student.name}</span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-4 right-4 bg-fuchsia-600 text-white p-1 rounded-full shadow-lg">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* The rest of the game UI component (playing, results) follows original logic... */}
        {gameState === 'playing' && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
            {isPreparing ? (
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-neutral-900 p-12 rounded-[3.5rem] border shadow-2xl text-center space-y-8"
                >
                    <div className="w-24 h-24 bg-fuchsia-500 text-white rounded-3xl flex items-center justify-center text-5xl font-black mx-auto">
                        {students.find(s => s.id === selectedStudents[currentStudentIdx])?.name[0]}
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs font-black text-neutral-400 uppercase tracking-widest block">Sıradaki Oyuncu</span>
                        <h2 className="text-4xl font-black text-neutral-900 dark:text-white uppercase">{students.find(s => s.id === selectedStudents[currentStudentIdx])?.name}</h2>
                    </div>
                    <p className="text-neutral-500 font-medium max-w-sm mx-auto italic">
                        {stepValue}'şer {direction === 'forward' ? 'ileri' : 'geri'} ritmik saymaya hazır mısın? 
                        Hedef {targetCount} adım!
                    </p>
                    <button 
                        onClick={() => setIsPreparing(false)}
                        className="px-12 py-5 bg-fuchsia-600 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
                    >
                        <Play fill="currentColor" /> BAŞLAYALIM!
                    </button>
                </motion.div>
            ) : (
                <div className={`grid ${gameMode === 'duel' ? 'grid-cols-2 h-[75vh]' : 'grid-cols-1 w-full max-w-2xl'} gap-6`}>
                    {gameMode === 'duel' ? (
                        selectedStudents.map(id => {
                            const state = playerStates[id];
                            const student = students.find(s => s.id === id);
                            const color = selectedStudents.indexOf(id) === 0 ? 'fuchsia' : 'indigo';
                            const isFinished = winners.includes(id);

                            return (
                                <div key={id} className={`bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-8 ${isFinished ? 'border-emerald-500' : `border-${color}-100`} flex flex-col relative overflow-hidden transition-all`}>
                                    {isFinished && (
                                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center z-10 backdrop-blur-[2px]">
                                            <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center">
                                                <CheckCircle2 size={60} className="text-emerald-500 mb-2" />
                                                <span className="font-black text-emerald-600 uppercase">BİTTİ!</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 bg-${color}-500 text-white rounded-2xl flex items-center justify-center text-3xl font-black`}>
                                            {student?.name[0]}
                                        </div>
                                        <div className="text-left">
                                            <span className="text-xl font-black block">{student?.name}</span>
                                            <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">{state.count} / {targetCount} ADIM</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 max-w-[200px] mx-4 h-3 bg-neutral-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(state.count / targetCount) * 100}%` }}
                                            className={`h-full bg-${color}-500`}
                                        />
                                    </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center gap-12">
                                    <div className="text-center space-y-2">
                                        <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Şu Anki Sayı</span>
                                        <div className="text-8xl font-black text-neutral-900 dark:text-white">{state.current}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        {state.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            disabled={isFinished}
                                            onClick={() => handleAnswer(id, opt)}
                                            className={`py-10 bg-neutral-50 dark:bg-neutral-800 rounded-3xl text-4xl font-black border-4 border-transparent hover:border-${color}-500 transition-all active:scale-95 disabled:opacity-50`}
                                        >
                                            {opt}
                                        </button>
                                        ))}
                                    </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        (() => {
                            const id = selectedStudents[currentStudentIdx];
                            const state = playerStates[id];
                            const student = students.find(s => s.id === id);
                            const color = 'fuchsia';

                            return (
                                <motion.div 
                                    key={id}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className={`bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-8 border-${color}-100 flex flex-col relative w-full`}
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 bg-${color}-500 text-white rounded-2xl flex items-center justify-center text-3xl font-black`}>
                                                {student?.name[0]}
                                            </div>
                                            <div className="text-left">
                                                <span className="text-xl font-black block">{student?.name}</span>
                                                <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">
                                                    {currentStudentIdx + 1} / {selectedStudents.length} OYUNCU • {state.count} / {targetCount} ADIM
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 max-w-[200px] mx-4 h-3 bg-neutral-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(state.count / targetCount) * 100}%` }}
                                                className={`h-full bg-${color}-500`}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center gap-12 py-10">
                                        <div className="text-center space-y-2">
                                            <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Şu Anki Sayı</span>
                                            <div className="text-8xl font-black text-neutral-900 dark:text-white">{state.current}</div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 w-full">
                                            {state.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleAnswer(id, opt)}
                                                    className={`py-12 bg-neutral-50 dark:bg-neutral-800 rounded-3xl text-4xl font-black border-4 border-transparent hover:border-${color}-500 transition-all active:scale-95 shadow-sm`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()
                    )}
                </div>
            )}
        </div>
      )}

      {gameState === 'results' && (
        <div className="bg-white dark:bg-neutral-900 p-12 rounded-[3.5rem] border shadow-xl text-center space-y-12">
           <Trophy size={80} className="mx-auto text-amber-500 animate-bounce" />
           <h2 className="text-4xl font-black uppercase tracking-tight">TURNUVA BİTTİ!</h2>
           <div className="max-w-md mx-auto space-y-4">
             {winners.map((id, idx) => (
               <div key={id} className={`flex justify-between items-center p-6 rounded-3xl border-2 ${idx === 0 ? 'bg-amber-50 border-amber-500 shadow-xl scale-105' : 'bg-neutral-50 border-neutral-100'}`}>
                 <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-500 text-white' : 'bg-white'}`}>#{idx+1}</div>
                   <span className="font-black text-xl">{students.find(s => s.id === id)?.name}</span>
                 </div>
                 <CheckCircle2 className="text-emerald-500" size={32} />
               </div>
             ))}
           </div>
           <div className="flex justify-center gap-4 pt-8">
             <button onClick={() => setGameState('setup')} className="px-10 py-5 bg-neutral-100 rounded-[2rem] font-black">YENİDEN DENE</button>
             <button onClick={handleFinishAndReward} className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl">KAYDET VE ÖDÜLLENDİR</button>
           </div>
        </div>
      )}
    </div>
    </div>
    </div>
  );
};
