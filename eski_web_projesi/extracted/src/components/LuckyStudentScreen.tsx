import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Disc, 
  Flag, 
  Gift, 
  Sparkles, 
  Ticket, 
  Flower2, 
  Rocket, 
  Diamond,
  CheckCircle2,
  Users,
  Search,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Zap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useSound } from '../hooks/useSound';
import { WheelGame } from './lucky-student/WheelGame';
import { BoxGame } from './lucky-student/BoxGame';
import { BalloonGame } from './lucky-student/BalloonGame';
import { DrawGame } from './lucky-student/DrawGame';
import { RaceGame } from './lucky-student/RaceGame';
import { FlowerGame } from './lucky-student/FlowerGame';
import { SpaceGame } from './lucky-student/SpaceGame';
import { TreasureGame } from './lucky-student/TreasureGame';
import { HeroGame } from './lucky-student/HeroGame';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface LuckyStudentScreenProps {
  students: Student[];
  onBack: () => void;
  persistentConfig?: { isPersistent: boolean; selectedStudentIds: string[] };
  onUpdateConfig?: (config: { isPersistent: boolean; selectedStudentIds: string[] }) => void;
}

const GAMES = [
  { id: 'wheel', title: 'Çarkıfelek', icon: Disc, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  { id: 'box', title: 'Şanslı Kutu', icon: Gift, color: 'text-rose-500', bgColor: 'bg-rose-50' },
  { id: 'balloon', title: 'Balon Patlatma', icon: Sparkles, color: 'text-sky-500', bgColor: 'bg-sky-50' },
  { id: 'draw', title: 'Kura Çekimi', icon: Ticket, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  { id: 'race', title: 'Yarış Pisti', icon: Flag, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  { id: 'flower', title: 'Çiçek Bahçesi', icon: Flower2, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  { id: 'space', title: 'Uzay Yolculuğu', icon: Rocket, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  { id: 'treasure', title: 'Hazine Avı', icon: Diamond, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  { id: 'hero', title: 'Kahraman Sinyali', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-50' }
];

export const LuckyStudentScreen: React.FC<LuckyStudentScreenProps> = ({ students, onBack, persistentConfig, onUpdateConfig }) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
    if (persistentConfig?.isPersistent && persistentConfig.selectedStudentIds.length > 0) {
      // Filter existing students only (in case some were deleted)
      const validIds = persistentConfig.selectedStudentIds.filter(id => students.some(s => s.id === id));
      return validIds;
    }
    return students.map(s => s.id);
  });
  const [isPersistent, setIsPersistent] = useState(persistentConfig?.isPersistent || false);
  const [searchTerm, setSearchTerm] = useState('');
  const [winner, setWinner] = useState<Student | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { playWinSound, playPopSound, playClickSound, playWhooshSound } = useSound(isMuted);

  // Sync with persistent config when it loads for the first time
  useEffect(() => {
    if (isInitialLoad && persistentConfig) {
      if (persistentConfig.isPersistent) {
        if (persistentConfig.selectedStudentIds && persistentConfig.selectedStudentIds.length > 0) {
          const validIds = persistentConfig.selectedStudentIds.filter(id => students.some(s => s.id === id));
          setSelectedStudentIds(validIds);
        }
        setIsPersistent(true);
      } else {
        setIsPersistent(false);
      }
      setIsInitialLoad(false);
    }
  }, [persistentConfig, students, isInitialLoad]);

  // Use ref to prevent infinite loops from parent render cycles changing function reference
  const onUpdateConfigRef = React.useRef(onUpdateConfig);
  useEffect(() => {
    onUpdateConfigRef.current = onUpdateConfig;
  }, [onUpdateConfig]);

  // Sync with persistent config if it changes
  useEffect(() => {
    if (!isInitialLoad && isPersistent && onUpdateConfigRef.current) {
      onUpdateConfigRef.current({ isPersistent, selectedStudentIds });
    }
  }, [selectedStudentIds, isPersistent, isInitialLoad]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  const handleWin = (student: Student) => {
    setWinner(student);
    // Automatically deselect the winner for the next round
    setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
    
    playWinSound();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4f46e5', '#f59e0b', '#ef4444', '#10b981']
    });
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentNo.includes(searchTerm)
  );

  const activeStudents = students.filter(s => selectedStudentIds.includes(s.id));

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-3 md:p-4 flex flex-col pt-20">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-neutral-900 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={activeGame ? () => setActiveGame(null) : onBack}
              className="p-2 md:p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg md:rounded-xl transition-all text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <ArrowLeft size={18} className="md:w-5 md:h-5" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-neutral-900 dark:text-white tracking-tight uppercase leading-tight">
                {activeGame ? GAMES.find(g => g.id === activeGame)?.title : 'Şanslı Öğrenci'}
              </h1>
              <p className="text-neutral-400 dark:text-neutral-500 font-medium text-[9px] md:text-xs">
                Derse katılımı artırmak için eğlenceli bir yöntem seçin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const newValue = !isPersistent;
                setIsPersistent(newValue);
                if (onUpdateConfig) {
                  onUpdateConfig({ isPersistent: newValue, selectedStudentIds });
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${
                isPersistent 
                  ? 'bg-amber-100 border-amber-200 text-amber-700' 
                  : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 text-neutral-400'
              }`}
              title={isPersistent ? 'Gün Boyu Aktif (Seçimler Kaydedilir)' : 'Gün Boyu Devre Dışı'}
            >
              <Clock size={16} />
              <span className="text-[10px] font-black uppercase tracking-tight hidden sm:block">Gün Boyu</span>
              <div className={`w-6 h-3 rounded-full relative transition-colors ${isPersistent ? 'bg-amber-400' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${isPersistent ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all ${isMuted ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'}`}
            >
              {isMuted ? <VolumeX size={18} className="md:w-5 md:h-5" /> : <Volume2 size={18} className="md:w-5 md:h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4 flex-1 overflow-hidden pb-2">
          {/* Main Area */}
          <div className="lg:col-span-3 flex flex-col overflow-y-auto custom-scrollbar pr-1">
            {!activeGame ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {GAMES.map((game) => (
                  <motion.button
                    key={game.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveGame(game.id)}
                    className="bg-white dark:bg-neutral-900 p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all text-left flex flex-col sm:flex-row items-center sm:items-center gap-3 md:gap-6 group"
                  >
                    <div className={`w-12 h-12 md:w-16 md:h-16 ${game.bgColor} dark:bg-opacity-10 ${game.color} rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <game.icon size={24} className="md:w-8 md:h-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-sm md:text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{game.title}</h3>
                      <p className="text-neutral-400 dark:text-neutral-500 text-[10px] md:text-sm font-medium leading-tight mt-1 hidden sm:block">Hemen başla!</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl md:rounded-[40px] shadow-sm border border-neutral-100 dark:border-neutral-800 relative overflow-hidden flex flex-col min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeGame}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="flex-1"
                  >
                    {activeGame === 'wheel' && <WheelGame students={activeStudents} onWin={handleWin} isSpinning={isSelecting} setIsSpinning={setIsSelecting} playClickSound={playClickSound} />}
                    {activeGame === 'box' && <BoxGame students={activeStudents} onWin={handleWin} playClickSound={playClickSound} />}
                    {activeGame === 'balloon' && <BalloonGame students={activeStudents} onWin={handleWin} playPopSound={playPopSound} />}
                    {activeGame === 'draw' && <DrawGame students={activeStudents} onWin={handleWin} playClickSound={playClickSound} />}
                    {activeGame === 'race' && <RaceGame students={activeStudents} onWin={handleWin} playClickSound={playClickSound} />}
                    {activeGame === 'flower' && <FlowerGame students={activeStudents} onWin={handleWin} playClickSound={playClickSound} />}
                    {activeGame === 'space' && <SpaceGame students={activeStudents} onWin={handleWin} playWhooshSound={playWhooshSound} />}
                    {activeGame === 'treasure' && <TreasureGame students={activeStudents} onWin={handleWin} playClickSound={playClickSound} />}
                    {activeGame === 'hero' && <HeroGame students={activeStudents} onWin={handleWin} playClickSound={playClickSound} />}
                  </motion.div>
                </AnimatePresence>

                {/* Winner Overlay */}
                <AnimatePresence>
                  {winner && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[9999] bg-indigo-600/90 backdrop-blur-xl flex items-center justify-center p-8"
                    >
                      <motion.div
                        initial={{ scale: 0.5, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white dark:bg-neutral-900 p-12 rounded-[56px] shadow-2xl text-center relative max-w-lg w-full"
                      >
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-xl">
                          <Trophy size={64} />
                        </div>

                        <div className="mt-12 space-y-4">
                          <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">TEBRİKLER!</h2>
                          <div className="space-y-1">
                            <p className="text-neutral-400 dark:text-neutral-500 font-black text-sm uppercase tracking-widest">Şanslı Öğrenci</p>
                            <h3 className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">{winner.name}</h3>
                            <p className="text-xl font-bold text-neutral-500 dark:text-neutral-400">No: {winner.studentNo}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setWinner(null)}
                          className="mt-10 w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-indigo-100 dark:shadow-none uppercase tracking-tight flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={24} />
                          YENİDEN DENE
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Participants Sidebar */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 flex flex-col h-full max-h-[calc(100vh-180px)]">
              <div className="space-y-1 mb-4">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Katılımcılar ({selectedStudentIds.length})</h3>
                <p className="text-neutral-400 dark:text-neutral-500 text-xs font-medium">Oyunda yer alacak öğrencileri seçin.</p>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={14} />
                <input 
                  type="text"
                  placeholder="Öğrenci ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <button 
                onClick={toggleAll}
                className="flex items-center gap-2 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all mb-1 group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  selectedStudentIds.length === students.length ? 'bg-indigo-600 border-indigo-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {selectedStudentIds.length === students.length && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Tümünü Seç</span>
              </button>

              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-0.5">
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`w-full py-1 px-3 rounded-lg border transition-all flex items-center justify-between group ${
                      selectedStudentIds.includes(student.id)
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/40'
                        : 'bg-white dark:bg-neutral-900 border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        selectedStudentIds.includes(student.id) ? 'bg-indigo-600 border-indigo-600' : 'border-neutral-300 dark:border-neutral-600'
                      }`}>
                        {selectedStudentIds.includes(student.id) && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">({student.studentNo}) {student.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
};
