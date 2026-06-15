import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Timer as TimerIcon, 
  Bell, 
  Settings,
  X,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Sparkles,
  Music,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface TimerScreenProps {
  onBack: () => void;
}

export const TimerScreen: React.FC<TimerScreenProps> = ({ onBack }) => {
  const [time, setTime] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [showCelebration, setShowCelebration] = useState(false);

  const lastProcessedTimerUpdateRef = useRef<number>(0);

  // Synchronize with remote control from mobile app
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const handleTimerData = (data: any) => {
      if (data && data.timer && data.timer.updatedAt) {
        const remoteTime = data.timer.updatedAt;
        if (remoteTime !== lastProcessedTimerUpdateRef.current) {
          lastProcessedTimerUpdateRef.current = remoteTime;
          const cmd = data.timer.command;
          const tMode = data.timer.mode;
          const tRem = data.timer.remaining;
          const tDur = data.timer.duration;

          if (cmd === 'TOGGLE_MODE' && tMode) {
            setMode(tMode);
          } else if (cmd === 'START') {
            setIsRunning(true);
            if (tRem !== undefined) setTime(Number(tRem));
            if (tDur !== undefined) setInitialTime(Number(tDur));
          } else if (cmd === 'PAUSE') {
            setIsRunning(false);
          } else if (cmd === 'RESET') {
            setIsRunning(false);
            const targetTime = (tMode === 'countdown' || mode === 'countdown') ? (tDur || 300) : 0;
            setTime(Number(targetTime));
            setInitialTime(Number(tDur || 300));
          } else if (cmd === 'SET_TIME') {
            if (tRem !== undefined) {
              setTime(Number(tRem));
              setInitialTime(Number(tDur !== undefined ? tDur : tRem));
            }
          }
        }
      }
    };

    const unsubscribes: (() => void)[] = [];

    // Subscribe to standard real UID
    const remoteDocRef = doc(db, 'users', user.uid, 'remote_control', 'state');
    unsubscribes.push(
      onSnapshot(remoteDocRef, (snap) => {
        if (snap.exists()) {
          handleTimerData(snap.data());
        }
      })
    );

    // Subscribe to fallback teacher/admin UID if applicable
    const lowerEmail = (user.email || '').toLowerCase();
    if (lowerEmail === 'cihan.ozel10@gmail.com' || lowerEmail === 'cihanogretmen10@gmail.com') {
      const fallbackDocRef = doc(db, 'users', 'cihan_ozel_web_uid', 'remote_control', 'state');
      unsubscribes.push(
        onSnapshot(fallbackDocRef, (snap) => {
          if (snap.exists()) {
            handleTimerData(snap.data());
          }
        })
      );
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [mode]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playSound = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) => {
    if (isMuted) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const playTick = () => playSound(880, 'sine', 0.05, 0.05);
  const playStart = () => {
    playSound(440, 'sine', 0.2, 0.1);
    setTimeout(() => playSound(880, 'sine', 0.2, 0.1), 100);
  };
  const playFinish = () => {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      setTimeout(() => playSound(f, 'triangle', 0.5, 0.2), i * 150);
    });
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prev => {
          if (mode === 'countdown') {
            if (prev <= 1) {
              setIsRunning(false);
              playFinish();
              setShowCelebration(true);
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4f46e5', '#f59e0b', '#ef4444', '#10b981']
              });
              return 0;
            }
            if (prev <= 11) playTick();
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, isMuted]);

  const handleStart = () => {
    if (time > 0 || mode === 'stopwatch') {
      setIsRunning(true);
      playStart();
      setShowCelebration(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    playSound(220, 'sine', 0.1, 0.1);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(mode === 'countdown' ? initialTime : 0);
    playSound(330, 'sine', 0.1, 0.1);
    setShowCelebration(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const adjustTime = (amount: number) => {
    const newTime = Math.max(0, time + amount);
    setTime(newTime);
    if (mode === 'countdown') setInitialTime(newTime);
    playSound(660, 'sine', 0.05, 0.05);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-4 flex flex-col items-center justify-center overflow-hidden relative pt-20">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-100/30 rounded-[4rem] blur-3xl" 
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -right-20 w-[30rem] h-[30rem] bg-rose-100/30 rounded-full blur-3xl" 
        />
      </div>

      <div className="max-w-2xl w-full space-y-4 md:space-y-6 relative z-10 py-4">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-xl md:rounded-[32px] shadow-sm border border-white"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: -90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="w-10 h-10 md:w-12 md:h-12 bg-neutral-100 flex items-center justify-center rounded-xl md:rounded-2xl text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X size={18} className="md:w-6 md:h-6" />
            </motion.button>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-neutral-900 tracking-tight uppercase leading-none mb-1">Zamanlayıcı</h1>
              <p className="text-neutral-400 font-bold text-[9px] md:text-xs">Ders ve etkinlik yönetimi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMuted(!isMuted)}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-rose-100 text-rose-500' : 'bg-indigo-50 text-indigo-600'}`}
            >
              {isMuted ? <VolumeX size={18} className="md:w-5 md:h-5" /> : <Volume2 size={18} className="md:w-5 md:h-5" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Main Timer Display */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[48px] shadow-lg border border-white flex flex-col items-center justify-center space-y-6 md:space-y-10 relative overflow-hidden group"
        >
          {/* Mode Switcher */}
          <div className="flex bg-neutral-100 p-1.5 rounded-2xl md:rounded-3xl relative z-10">
            <button 
              onClick={() => {
                setMode('countdown');
                setIsRunning(false);
                setTime(initialTime);
                playSound(440, 'sine', 0.1, 0.05);
              }}
              className={`px-4 md:px-10 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black transition-all relative ${mode === 'countdown' ? 'text-indigo-600' : 'text-neutral-400'}`}
            >
              {mode === 'countdown' && (
                <motion.div layoutId="mode-bg" className="absolute inset-0 bg-white rounded-xl md:rounded-2xl shadow-sm" />
              )}
              <span className="relative z-10">GERİ SAYIM</span>
            </button>
            <button 
              onClick={() => {
                setMode('stopwatch');
                setIsRunning(false);
                setTime(0);
                playSound(440, 'sine', 0.1, 0.05);
              }}
              className={`px-4 md:px-10 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black transition-all relative ${mode === 'stopwatch' ? 'text-indigo-600' : 'text-neutral-400'}`}
            >
              {mode === 'stopwatch' && (
                <motion.div layoutId="mode-bg" className="absolute inset-0 bg-white rounded-xl md:rounded-2xl shadow-sm" />
              )}
              <span className="relative z-10">KRONOMETRE</span>
            </button>
          </div>

          {/* Time Display */}
          <div className="relative flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div 
                key={time}
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`text-[80px] sm:text-[120px] md:text-[160px] font-black tracking-tighter tabular-nums leading-none drop-shadow-2xl ${
                  isRunning 
                    ? mode === 'countdown' && time <= 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-600' 
                    : 'text-neutral-900'
                }`}
              >
                {formatTime(time)}
              </motion.div>
            </AnimatePresence>

            {/* Celebration Text */}
            <AnimatePresence>
              {showCelebration && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute -bottom-10 flex items-center gap-2 bg-amber-400 text-white px-6 py-2 rounded-full font-black text-xl shadow-xl"
                >
                  <Trophy size={24} />
                  SÜRE DOLDU!
                  <Sparkles size={24} />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Progress Ring */}
            {mode === 'countdown' && initialTime > 0 && (
              <div className="absolute inset-0 -m-16 pointer-events-none">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="48%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-neutral-50"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="48%"
                      fill="none"
                      stroke="url(#timer-gradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="100 100"
                      animate={{ strokeDashoffset: 100 - (time / initialTime) * 100 }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                    <defs>
                      <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                 </svg>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 md:gap-10 relative z-10">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: -180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleReset}
              className="w-14 h-14 md:w-20 md:h-20 bg-neutral-100 text-neutral-600 rounded-2xl md:rounded-[32px] flex items-center justify-center hover:bg-neutral-200 transition-all shadow-lg"
            >
              <RotateCcw size={24} className="md:w-8 md:h-8" />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.1, boxShadow: isRunning ? '0 20px 40px rgba(245,158,11,0.3)' : '0 20px 40px rgba(79,70,229,0.3)' }}
              whileTap={{ scale: 0.9 }}
              onClick={isRunning ? handlePause : handleStart}
              disabled={mode === 'countdown' && time === 0}
              className={`w-20 h-20 md:w-32 md:h-32 rounded-3xl md:rounded-[48px] flex items-center justify-center shadow-2xl transition-all disabled:opacity-50 disabled:shadow-none ${
                isRunning ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              {isRunning ? <Pause size={32} className="md:w-14 md:h-14" fill="currentColor" /> : <Play size={32} className="md:w-14 md:h-14 ml-1 md:ml-2" fill="currentColor" />}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSettingsOpen(true)}
              className="w-14 h-14 md:w-20 md:h-20 bg-neutral-100 text-neutral-600 rounded-2xl md:rounded-[32px] flex items-center justify-center hover:bg-neutral-200 transition-all shadow-lg"
            >
              <Settings size={24} className="md:w-8 md:h-8" />
            </motion.button>
          </div>

          {/* Quick Adjust */}
          {mode === 'countdown' && !isRunning && (
            <div className="flex flex-wrap justify-center gap-4 pt-8">
              {[1, 5, 10, 15, 30].map(mins => (
                <motion.button
                  key={mins}
                  whileHover={{ y: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => adjustTime(mins * 60)}
                  className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-black hover:bg-indigo-100 transition-all border-2 border-indigo-100 shadow-sm"
                >
                  +{mins} DK
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-white w-full max-w-lg rounded-[56px] shadow-2xl overflow-hidden border-8 border-indigo-50"
            >
              <div className="p-12 space-y-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-4xl font-black text-neutral-900 uppercase tracking-tighter">Süre Ayarla</h3>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-12 h-12 bg-neutral-100 hover:bg-neutral-200 rounded-2xl transition-colors text-neutral-500 flex items-center justify-center"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-2">Dakika</label>
                      <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-[32px] border-2 border-neutral-100">
                        <motion.button 
                          whileTap={{ scale: 0.8 }}
                          onClick={() => adjustTime(-60)}
                          className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-neutral-600 hover:text-indigo-600"
                        >
                          <Minus size={24} />
                        </motion.button>
                        <span className="flex-1 text-center text-4xl font-black text-neutral-900 tabular-nums">
                          {Math.floor(time / 60)}
                        </span>
                        <motion.button 
                          whileTap={{ scale: 0.8 }}
                          onClick={() => adjustTime(60)}
                          className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-neutral-600 hover:text-indigo-600"
                        >
                          <Plus size={24} />
                        </motion.button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-2">Saniye</label>
                      <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-[32px] border-2 border-neutral-100">
                        <motion.button 
                          whileTap={{ scale: 0.8 }}
                          onClick={() => adjustTime(-1)}
                          className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-neutral-600 hover:text-indigo-600"
                        >
                          <Minus size={24} />
                        </motion.button>
                        <span className="flex-1 text-center text-4xl font-black text-neutral-900 tabular-nums">
                          {time % 60}
                        </span>
                        <motion.button 
                          whileTap={{ scale: 0.8 }}
                          onClick={() => adjustTime(1)}
                          className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-neutral-600 hover:text-indigo-600"
                        >
                          <Plus size={24} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-600 p-6 rounded-[32px] shadow-xl shadow-indigo-200">
                    <p className="text-indigo-100 font-bold text-center mb-1">Toplam Süre</p>
                    <p className="text-5xl font-black text-white text-center tabular-nums tracking-tighter">
                      {formatTime(time)}
                    </p>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-6 bg-neutral-900 text-white rounded-[32px] font-black text-2xl hover:bg-neutral-800 transition-all shadow-2xl"
                >
                  Süreyi Başlat
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

