import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Trophy, Play, Star, ChevronRight, CheckCircle2, 
  Settings, Clock, Target, Hash, RefreshCw, X, Shuffle, AlertCircle, Info, Calculator, Award, Zap
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { doc, updateDoc, increment, arrayUnion, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface DortIslemActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
type GameMode = 'solo' | 'duel';

interface Question {
  a: number;
  b: number;
  op: string;
  answer: number;
  options: number[];
}

export const DortIslemActivity: React.FC<DortIslemActivityProps> = ({ onBack, students, user, onShowInfo }) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [operation, setOperation] = useState<Operation>('addition');
  const [isRewardSettingsOpen, setIsRewardSettingsOpen] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(10);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  
  // Game State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [duelQuestions, setDuelQuestions] = useState<{p1: Question, p2: Question} | null>(null);
  const [currentStudentIdx, setCurrentStudentIdx] = useState(0);
  const [scores, setScores] = useState<{[studentId: string]: number}>({});
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<string | null>(null);

  const generateSingleQuestion = (): Question => {
    let a = 0, b = 0, op = '', answer = 0;
    
    const currentOp = operation === 'mixed' 
      ? (['addition', 'subtraction', 'multiplication', 'division'] as Operation[])[Math.floor(Math.random() * 4)]
      : operation;

    const currentDiff = difficulty === 'mixed'
      ? (['easy', 'medium', 'hard'] as Difficulty[])[Math.floor(Math.random() * 3)]
      : difficulty;
    
    if (currentOp === 'addition') {
      op = '+';
      if (currentDiff === 'easy') { a = Math.floor(Math.random() * 20); b = Math.floor(Math.random() * 20); }
      else if (currentDiff === 'medium') { a = Math.floor(Math.random() * 100); b = Math.floor(Math.random() * 100); }
      else { a = Math.floor(Math.random() * 500) + 100; b = Math.floor(Math.random() * 500) + 100; }
      answer = a + b;
    } else if (currentOp === 'subtraction') {
      op = '-';
      if (currentDiff === 'easy') { a = Math.floor(Math.random() * 20) + 10; b = Math.floor(Math.random() * a); }
      else if (currentDiff === 'medium') { a = Math.floor(Math.random() * 100) + 50; b = Math.floor(Math.random() * a); }
      else { a = Math.floor(Math.random() * 1000) + 100; b = Math.floor(Math.random() * a); }
      answer = a - b;
    } else if (currentOp === 'multiplication') {
      op = '×';
      if (currentDiff === 'easy') { a = Math.floor(Math.random() * 6) + 1; b = Math.floor(Math.random() * 6) + 1; }
      else if (currentDiff === 'medium') { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; }
      else { a = Math.floor(Math.random() * 25) + 1; b = Math.floor(Math.random() * 15) + 1; }
      answer = a * b;
    } else if (currentOp === 'division') {
      op = '÷';
      if (currentDiff === 'easy') { b = Math.floor(Math.random() * 5) + 1; answer = Math.floor(Math.random() * 10); a = b * answer; }
      else if (currentDiff === 'medium') { b = Math.floor(Math.random() * 10) + 1; answer = Math.floor(Math.random() * 15); a = b * answer; }
      else { b = Math.floor(Math.random() * 15) + 1; answer = Math.floor(Math.random() * 20); a = b * answer; }
    }

    // Generate 4 unique options
    const options = new Set<number>([answer]);
    while (options.size < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const fake = Math.abs(answer + (offset === 0 ? 5 : offset));
      options.add(fake);
    }

    return { a, b, op, answer, options: Array.from(options).sort(() => Math.random() - 0.5) };
  };

  const generateQuestion = () => {
    if (gameMode === 'solo') {
      setCurrentQuestion(generateSingleQuestion());
      const currentDiff = difficulty === 'mixed' ? 'medium' : difficulty;
      setTimeLeft(currentDiff === 'easy' ? 20 : currentDiff === 'medium' ? 15 : 10);
      setIsTimerActive(true);
    } else {
      setDuelQuestions({
        p1: generateSingleQuestion(),
        p2: generateSingleQuestion()
      });
      const currentDiff = difficulty === 'mixed' ? 'medium' : difficulty;
      setTimeLeft(currentDiff === 'easy' ? 30 : currentDiff === 'medium' ? 20 : 15);
      setIsTimerActive(true);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      if (gameMode === 'solo') {
        handleSoloAnswer(null);
      } else {
        setGameState('results');
      }
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft, gameMode]);

  const handleStartGame = () => {
    if (gameMode === 'solo' && selectedStudents.length === 0) return;
    if (gameMode === 'duel' && selectedStudents.length !== 2) return;

    const initialScores: {[key: string]: number} = {};
    selectedStudents.forEach(id => initialScores[id] = 0);
    setScores(initialScores);
    setGameState('playing');
    setCurrentStudentIdx(0);
    generateQuestion();
  };

  const handleSoloAnswer = (chosen: number | null) => {
    const studentId = selectedStudents[currentStudentIdx];
    const isCorrect = chosen === currentQuestion?.answer;
    
    setIsTimerActive(false);
    if (isCorrect) {
      setLastCorrect('correct');
      setScores(prev => ({ ...prev, [studentId]: prev[studentId] + (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20) }));
    } else {
      setLastCorrect('wrong');
    }

    setTimeout(() => {
      setLastCorrect(null);
      if (currentStudentIdx < selectedStudents.length - 1) {
        setCurrentStudentIdx(prev => prev + 1);
        generateQuestion();
      } else {
        setGameState('results');
      }
    }, 1000);
  };

  const handleDuelAnswer = (playerIdx: number, chosen: number) => {
    const studentId = selectedStudents[playerIdx];
    const question = playerIdx === 0 ? duelQuestions?.p1 : duelQuestions?.p2;
    
    if (chosen === question?.answer) {
      setScores(prev => ({ ...prev, [studentId]: prev[studentId] + 1 }));
      // Generate new question for this player
      setDuelQuestions(prev => prev ? {
        ...prev,
        [playerIdx === 0 ? 'p1' : 'p2']: generateSingleQuestion()
      } : null);
    } else {
      // Small penalty or shake effect
    }
  };

  const handleFinishAndReward = async () => {
    if (!user) return;
    
    try {
      const winnerId = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const winner = students.find(s => s.id === winnerId);
      
      if (winner) {
        const studentRef = doc(db, `users/${user.uid}/students`, winnerId);
        await updateDoc(studentRef, {
          stars: increment(rewardAmount),
          badges: arrayUnion({
            id: 'dort-islem-' + Date.now(),
            name: 'Dört İşlem Şampiyonu',
            date: new Date().toISOString(),
            icon: 'Calculator'
          })
        });

        await addDoc(collection(db, `users/${user.uid}/activityScores`), {
          activityId: 'dort-islem',
          instanceId: 'dort-islem-' + Date.now(),
          studentId: winnerId,
          studentName: winner.name,
          totalScore: scores[winnerId],
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
          <button 
            onClick={onBack}
            className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-neutral-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Calculator className="text-emerald-500" /> Dört İşlem Arenası
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium italic">Öğrenciler arası eğlenceli matematik yarışı</p>
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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', 
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
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 hover:text-emerald-600 rounded-[2rem] transition-all shadow-xl shadow-neutral-200/50 dark:shadow-none"
            >
              <ArrowLeft size={24} />
            </motion.button>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                  <Calculator size={24} />
                </div>
                <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">
                  Dört İşlem Arenası
                </h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  onClick={onShowInfo}
                  className="p-2 text-neutral-400 hover:text-emerald-600 transition-colors"
                >
                  <Info size={24} />
                </motion.button>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 font-bold ml-1 italic">
                Sayıların gizemli dünyasında bir yolculuğa çıkmaya hazır mısın?
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
            {/* Left Column: Game Settings */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-12 xl:col-span-4 space-y-6"
            >
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none space-y-8">
                <h3 className="text-2xl font-black text-neutral-800 dark:text-white uppercase tracking-tight flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Target size={24} />
                  </div>
                  Oyun Stratejisi
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
                         <option value="solo">⚔️ Solo Macera</option>
                         <option value="duel">🔥 Destansı Düello</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                        <ChevronRight className="rotate-90" size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">İşlem Türü</label>
                    <div className="relative">
                      <select 
                        value={operation} 
                        onChange={(e) => setOperation(e.target.value as Operation)}
                        className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 rounded-2xl font-black text-neutral-800 dark:text-white appearance-none border-2 border-transparent focus:border-emerald-500 transition-all uppercase tracking-tight text-sm px-6"
                      >
                        <option value="addition">➕ Toplama</option>
                        <option value="subtraction">➖ Çıkarma</option>
                        <option value="multiplication">✖️ Çarpma</option>
                        <option value="division">➗ Bölme</option>
                        <option value="mixed">🌀 Karışık İşlem</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                        <ChevronRight className="rotate-90" size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Zorluk Kademesi</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'easy', label: 'Kolay', color: 'emerald' },
                        { id: 'medium', label: 'Orta', color: 'amber' },
                        { id: 'hard', label: 'Zor', color: 'rose' },
                        { id: 'mixed', label: 'Karışık', color: 'indigo' }
                      ].map(d => (
                        <button
                          key={d.id}
                          onClick={() => setDifficulty(d.id as Difficulty)}
                          className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                            difficulty === d.id 
                            ? `bg-${d.color}-500 border-${d.color}-500 text-white shadow-lg shadow-${d.color}-100 dark:shadow-none` 
                            : 'bg-neutral-50 dark:bg-neutral-800 border-transparent text-neutral-400'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartGame}
                    disabled={!gameMode || (gameMode === 'solo' ? selectedStudents.length === 0 : selectedStudents.length !== 2)}
                    className="w-full py-8 bg-emerald-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-emerald-100 dark:shadow-none overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                    <div className="relative flex items-center justify-center gap-4">
                      {gameMode === 'solo' ? <Play fill="currentColor" size={24} /> : <Zap size={24} />}
                      <span className="uppercase tracking-tighter">{gameMode === 'solo' ? 'Yarışmayı Başlat' : 'Arenaya Gir'}</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Student Selection */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-12 xl:col-span-8 bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-neutral-200/30 dark:shadow-none min-h-[600px] flex flex-col"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl">
                    <Users size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-neutral-800 dark:text-white uppercase tracking-tight">Karakter Seçimi</h3>
                    <p className="text-neutral-400 dark:text-neutral-500 font-bold text-sm">
                      {gameMode === 'solo' ? 'Yarışacak cesur öğrencileri seçin' : 'Düelloda kapışacak 2 kişiyi belirleyin'}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const allIds = students.map(s => s.id);
                      if (gameMode === 'duel') {
                        setSelectedStudents(allIds.slice(0, 2));
                      } else {
                        setSelectedStudents(allIds);
                      }
                    }}
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
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-100 dark:shadow-none' 
                        : 'border-neutral-50 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-emerald-200 dark:hover:border-emerald-900/50'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-sm transition-all ${
                        isSelected ? 'bg-emerald-500 text-white scale-110' : 'bg-white dark:bg-neutral-700 text-neutral-400'
                      }`}>
                        {student.name[0]}
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">#{student.studentNo}</span>
                        <span className="block text-sm font-black uppercase text-neutral-800 dark:text-white truncate w-32">{student.name}</span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-4 right-4 bg-emerald-600 text-white p-1 rounded-full shadow-lg">
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

        {/* The rest of the game UI component (playing, results) follows original logic but would benefit from similar styling refinements... */}
        {gameState === 'playing' && gameMode === 'solo' && currentQuestion && (
        <div className="bg-white dark:bg-neutral-900 p-12 rounded-[3.5rem] border shadow-xl relative overflow-hidden">
          {/* Solo UI: Turn based multiple choice */}
          <div className="max-w-3xl mx-auto space-y-12 text-center">
            <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl">
              <div className="text-left">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Şu An Oynayan</span>
                <span className="text-2xl font-black text-indigo-600">{students.find(s => s.id === selectedStudents[currentStudentIdx])?.name}</span>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-black tabular-nums ${timeLeft <= 3 ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>{timeLeft}</div>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Süre</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 py-10">
              <div className="text-9xl font-black text-neutral-900 dark:text-white tracking-widest">
                 {currentQuestion.a} <span className="text-emerald-500">{currentQuestion.op}</span> {currentQuestion.b}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSoloAnswer(opt)}
                  className="py-12 bg-white dark:bg-neutral-800 border-4 border-neutral-100 dark:border-neutral-700 rounded-[2.5rem] text-4xl font-black hover:border-emerald-500 hover:text-emerald-600 transition-all active:scale-95 shadow-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {lastCorrect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 2 }}
                className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${lastCorrect === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
              >
                {lastCorrect === 'correct' ? (
                  <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center">
                    <CheckCircle2 size={120} className="text-emerald-600" />
                    <span className="text-4xl font-black text-emerald-600 mt-4 uppercase">TEBRİKLER!</span>
                  </div>
                ) : (
                  <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center">
                    <X size={120} className="text-red-600" />
                    <span className="text-4xl font-black text-red-600 mt-4 uppercase">YANLIŞ!</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {gameState === 'playing' && gameMode === 'duel' && duelQuestions && (
        <div className="h-[75vh] grid grid-cols-2 gap-4 relative">
          {/* Duel UI: Split Screen */}
          {[0, 1].map(playerIdx => {
             const student = students.find(s => s.id === selectedStudents[playerIdx]);
             const question = playerIdx === 0 ? duelQuestions.p1 : duelQuestions.p2;
             const color = playerIdx === 0 ? 'indigo' : 'amber';
             
             return (
               <div key={playerIdx} className={`bg-white dark:bg-neutral-900 rounded-[3rem] border-8 ${playerIdx === 0 ? 'border-indigo-100' : 'border-amber-100'} p-8 flex flex-col`}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className={`w-16 h-16 bg-${color}-500 text-white rounded-2xl flex items-center justify-center text-3xl font-black`}>
                         {student?.name[0]}
                       </div>
                       <div className="text-left">
                         <span className="text-xl font-black block">{student?.name}</span>
                         <span className={`text-${color}-600 font-bold`}>{scores[student?.id || ''] || 0} PUAN</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center gap-12">
                     <div className="text-7xl font-black">
                       {question.a} {question.op} {question.b}
                     </div>
                     <div className="grid grid-cols-2 gap-4 w-full">
                       {question.options.map((opt, i) => (
                         <button
                           key={i}
                           onClick={() => handleDuelAnswer(playerIdx, opt)}
                           className={`py-12 bg-neutral-50 dark:bg-neutral-800 rounded-3xl text-4xl font-black border-4 border-transparent hover:border-${color}-500 transition-all active:scale-95`}
                         >
                           {opt}
                         </button>
                       ))}
                     </div>
                  </div>
               </div>
             );
          })}

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white dark:bg-neutral-800 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-neutral-100">
             <div className="text-4xl font-black tabular-nums">{timeLeft}</div>
             <span className="text-[10px] font-black uppercase">SÜRE</span>
          </div>
        </div>
      )}

      {gameState === 'results' && (
        <div className="bg-white dark:bg-neutral-900 p-12 rounded-[3.5rem] border shadow-xl text-center space-y-12">
          <Trophy size={80} className="mx-auto text-amber-500 animate-bounce" />
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight">MUHTEŞEM BİTİŞ!</h2>
            <p className="text-neutral-500 font-medium">Arenadaki cesaretiniz için tebrikler!</p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            {Object.entries(scores).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).map(([id, score], idx) => (
              <div key={id} className={`flex items-center justify-between p-6 rounded-3xl border-2 ${idx === 0 ? 'bg-amber-50 border-amber-500' : 'bg-neutral-50 border-neutral-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm ${idx === 0 ? 'bg-amber-500 text-white' : 'bg-white text-neutral-400'}`}>
                    #{idx + 1}
                  </div>
                  <span className="font-black text-2xl text-neutral-800">{students.find(s => s.id === id)?.name}</span>
                </div>
                <span className="font-black text-3xl">{score}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 pt-8">
             <button onClick={() => setGameState('setup')} className="px-10 py-5 bg-neutral-100 text-neutral-600 rounded-[2rem] font-black">YENİDEN DENE</button>
             <button onClick={handleFinishAndReward} className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl">KAYDET VE ÖDÜLLENDİR</button>
          </div>
        </div>
      )}

      {/* Rewards Settings logic stays basically same */}
      <AnimatePresence>
        {isRewardSettingsOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm">
               <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Award className="text-amber-500" /> Yıldız Yağmuru</h3>
               <div className="grid grid-cols-4 gap-2 mb-10">
                 {[5,10,20,50].map(v => (
                   <button key={v} onClick={() => setRewardAmount(v)} className={`py-5 rounded-2xl font-black text-xl transition-all ${rewardAmount === v ? 'bg-indigo-600 text-white' : 'bg-neutral-50'}`}>{v}</button>
                 ))}
               </div>
               <button onClick={() => setIsRewardSettingsOpen(false)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">KAZANANI BELİRLE</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
    </div>
  );
};
