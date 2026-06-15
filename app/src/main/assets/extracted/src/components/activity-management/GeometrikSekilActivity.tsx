import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Trophy, Play, Star, ChevronRight, CheckCircle2, 
  Settings, Clock, Target, Hash, RefreshCw, X, Shuffle, AlertCircle, Info, LayoutGrid, Award
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { doc, updateDoc, increment, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface GeometrikSekilActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo: () => void;
}

const shapes = [
  { name: 'Kare', sides: 4, corners: 4, icon: '■' },
  { name: 'Üçgen', sides: 3, corners: 3, icon: '▲' },
  { name: 'Daire', sides: 0, corners: 0, icon: '●' },
  { name: 'Dikdörtgen', sides: 4, corners: 4, icon: '▮' },
  { name: 'Beşgen', sides: 5, corners: 5, icon: '⬟' },
  { name: 'Altıgen', sides: 6, corners: 6, icon: '⬢' }
];

export const GeometrikSekilActivity: React.FC<GeometrikSekilActivityProps> = ({ onBack, students, user, onShowInfo }) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  const [rewardAmount, setRewardAmount] = useState(10);
  const [isRewardSettingsOpen, setIsRewardSettingsOpen] = useState(false);

  // Game State
  const [currentShape, setCurrentShape] = useState<any>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const generateQuestion = () => {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    setCurrentShape(shape);
    
    const opts = new Set<string>([shape.name]);
    while (opts.size < 4) {
      opts.add(shapes[Math.floor(Math.random() * shapes.length)].name);
    }
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
  };

  const handleStartGame = () => {
    if (selectedStudents.length !== 2) return;
    setGameState('playing');
    setP1Score(0);
    setP2Score(0);
    setWinner(null);
    generateQuestion();
  };

  const handleAnswer = (playerIdx: number, chosenName: string) => {
    if (chosenName === currentShape.name) {
      if (playerIdx === 1) setP1Score(prev => prev + 1);
      else setP2Score(prev => prev + 1);

      if (p1Score + (playerIdx === 1 ? 1 : 0) >= 5) {
        setWinner(selectedStudents[0]);
        setGameState('results');
      } else if (p2Score + (playerIdx === 2 ? 1 : 0) >= 5) {
        setWinner(selectedStudents[1]);
        setGameState('results');
      } else {
        generateQuestion();
      }
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
            id: 'geo-avci-' + Date.now(),
            name: 'Geometrik Şekil Avcısı',
            date: new Date().toISOString(),
            icon: 'LayoutGrid'
          })
        });

        await addDoc(collection(db, `users/${user.uid}/activityScores`), {
          activityId: 'geometrik-sekil',
          instanceId: 'geometrik-sekil-' + Date.now(),
          studentId: winner,
          studentName: winnerStudent.name,
          totalScore: Math.max(p1Score, p2Score),
          teacherUid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/students`);
    }
  };

  if (gameState === 'playing' && currentShape) {
    const p1 = students.find(s => s.id === selectedStudents[0]);
    const p2 = students.find(s => s.id === selectedStudents[1]);

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button onClick={() => setGameState('setup')} className="p-3 bg-white rounded-2xl border border-neutral-100">
            <X size={20} />
          </button>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{p1?.name}</p>
              <p className="text-4xl font-black text-sky-600">{p1Score}</p>
            </div>
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center font-black text-neutral-400">VS</div>
            <div className="text-center">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{p2?.name}</p>
              <p className="text-4xl font-black text-emerald-600">{p2Score}</p>
            </div>
          </div>
          <div className="w-12 h-12" />
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8 p-6">
          <div className="bg-sky-50 rounded-[3rem] p-8 flex flex-col items-center justify-center border-4 border-sky-100 text-center">
            <div className="text-9xl mb-8 text-sky-600">{currentShape.icon}</div>
            <p className="text-neutral-500 font-bold mb-8 italic">Bu şeklin adı nedir?</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              {options.map(opt => (
                <button 
                  key={`p1-${opt}`}
                  onClick={() => handleAnswer(1, opt)}
                  className="bg-white p-6 rounded-2xl text-xl font-black text-sky-600 shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-[3rem] p-8 flex flex-col items-center justify-center border-4 border-emerald-100 text-center">
            <div className="text-9xl mb-8 text-emerald-600">{currentShape.icon}</div>
            <p className="text-neutral-500 font-bold mb-8 italic">Bu şeklin adı nedir?</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              {options.map(opt => (
                <button 
                  key={`p2-${opt}`}
                  onClick={() => handleAnswer(2, opt)}
                  className="bg-white p-6 rounded-2xl text-xl font-black text-emerald-600 shadow-lg hover:scale-105 active:scale-95 transition-all"
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
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-32 h-32 bg-sky-400 rounded-full flex items-center justify-center text-6xl mb-8 shadow-2xl">🧩</motion.div>
        <h1 className="text-5xl font-black text-neutral-900 mb-4 tracking-tighter">MUHTEŞEM!</h1>
        <p className="text-2xl font-bold text-sky-600 mb-8">{winnerStudent?.name} Şekil Avcısı Oldu!</p>
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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-200/20 dark:bg-sky-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: 'radial-gradient(#0ea5e9 1px, transparent 1px)', 
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
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 hover:text-sky-600 rounded-[2rem] transition-all shadow-xl shadow-neutral-200/50 dark:shadow-none"
            >
              <ArrowLeft size={24} />
            </motion.button>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-200 dark:shadow-none">
                  <LayoutGrid size={24} />
                </div>
                <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">
                  Geometrik Şekil Avcısı
                </h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  onClick={onShowInfo}
                  className="p-2 text-neutral-400 hover:text-sky-600 transition-colors"
                >
                  <Info size={24} />
                </motion.button>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 font-bold ml-1 italic">
                Etrafındaki dünyayı şekillerle keşfetmeye hazır mısın avcı?
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
          {/* Left Column: Selection */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-12 xl:col-span-8 bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none min-h-[500px]"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-2xl">
                  <Users size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-800 dark:text-white uppercase tracking-tight">Avcıları Belirle</h3>
                  <p className="text-neutral-400 dark:text-neutral-500 font-bold text-sm">
                    Bu düelloda kapışacak 2 kişi seçin
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedStudents(students.slice(0, 2).map(s => s.id))}
                  className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-black uppercase hover:bg-indigo-100 transition-colors"
                >
                  Hızlı Seç
                </button>
                <button 
                  onClick={() => setSelectedStudents([])}
                  className="px-6 py-2 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-black uppercase hover:bg-neutral-100 transition-colors"
                >
                  Sıfırla
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar max-h-[450px] p-1">
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
                      } else if (selectedStudents.length < 2) {
                        setSelectedStudents(prev => [...prev, student.id]);
                      }
                    }}
                    className={`relative group p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${
                      isSelected 
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20 shadow-lg shadow-sky-100 dark:shadow-none' 
                      : 'border-neutral-50 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-sky-200 dark:hover:border-sky-900/50'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-sm transition-all ${
                      isSelected ? 'bg-sky-500 text-white scale-110' : 'bg-white dark:bg-neutral-700 text-neutral-300'
                    }`}>
                      {student.name[0]}
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">#{student.studentNo}</span>
                      <span className="block text-sm font-black uppercase text-neutral-800 dark:text-white truncate w-32">{student.name}</span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-4 right-4 bg-sky-600 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column: Start Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-12 xl:col-span-4"
          >
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none space-y-8 sticky top-8">
              <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2rem] border border-amber-100 dark:border-amber-900/50 text-center relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="block text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Kazanan Ödülü</span>
                  <p className="text-6xl font-black text-amber-500 tracking-tighter flex items-center justify-center gap-2">
                    {rewardAmount} <Star size={40} fill="currentColor" />
                  </p>
                </div>
                <div className="absolute -bottom-4 -right-4 text-amber-200/30 dark:text-amber-500/10 rotate-12 transition-transform group-hover:scale-110">
                  <Trophy size={120} />
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50">
                <h4 className="text-sm font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info size={16} /> Görev Bilgisi
                </h4>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300/70 leading-relaxed">
                  İki oyuncu ekrandaki şeklin ismini en hızlı bulan olmak için yarışır. 5 puanı toplayan ödülü kapar!
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartGame}
                disabled={selectedStudents.length !== 2}
                className="w-full py-8 bg-sky-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-sky-100 dark:shadow-none overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                <div className="relative flex items-center justify-center gap-4">
                  <Play fill="currentColor" size={24} />
                  <span className="uppercase tracking-tighter">AV'I BAŞLAT</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isRewardSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-2xl font-black mb-6">Ödül Ayarları</h3>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-neutral-500 uppercase tracking-widest text-center">Kazanan Yıldızı</label>
                <div className="flex items-center gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRewardAmount(Math.max(1, rewardAmount - 5))} 
                    className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center font-black"
                  >
                    -
                  </motion.button>
                  <div className="flex-1 text-center font-black text-3xl text-amber-500">{rewardAmount} ⭐</div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRewardAmount(rewardAmount + 5)} 
                    className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center font-black"
                  >
                    +
                  </motion.button>
                </div>
              </div>
              <button onClick={() => setIsRewardSettingsOpen(false)} className="w-full mt-8 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest">Kaydet</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
