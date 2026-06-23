import React, { useState, useEffect } from 'react';
import { ShieldAlert, Award, Star } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface TreasureGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playClickSound: () => void;
}

interface ChestItem {
  index: number;
  isWinner: boolean;
  isOpened: boolean;
  isFled: boolean;
  fledWithGold: boolean;
  pirateName: string;
  pirateEmoji: string;
}

interface FallingParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotateSpeed: number;
}

const PIRATE_EMOJIS = ["🏴‍☠️", "⚓", "☠️", "🦜"];
const PIRATE_NAMES = ["Karasakal", "Kızıl Barbar", "Tekgöz", "Gümüş Kanca"];

export const TreasureGame: React.FC<TreasureGameProps> = ({ students, onWin, playClickSound }) => {
  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);
  const [chests, setChests] = useState<ChestItem[]>([]);
  const [openedCount, setOpenedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [victoryType, setVictoryType] = useState<'JACKPOT' | 'PARTIAL' | 'CANDIES' | null>(null);
  const [particles, setParticles] = useState<FallingParticle[]>([]);

  const { playBoing, playSuccess } = useSound();

  useEffect(() => {
    if (students.length === 0) return;
    
    // Select the lucky student
    const chosen = students[Math.floor(Math.random() * students.length)];
    setWinnerStudent(chosen);

    // Initializing 4 chests
    const winnerIndex = Math.floor(Math.random() * 4);
    const prepared = Array.from({ length: 4 }, (_, i) => {
      const isWinner = i === winnerIndex;
      return {
        index: i,
        isWinner,
        isOpened: false,
        isFled: false,
        fledWithGold: false,
        pirateName: isWinner ? "" : PIRATE_NAMES[i % PIRATE_NAMES.length],
        pirateEmoji: isWinner ? "" : PIRATE_EMOJIS[i % PIRATE_EMOJIS.length]
      };
    });

    setChests(prepared);
    setOpenedCount(0);
    setIsFinished(false);
    setVictoryType(null);
    setParticles([]);
  }, [students]);

  // Click chest handler
  const handleChestClick = (item: ChestItem) => {
    if (item.isOpened || isFinished) return;

    playClickSound();
    const nextOpenedCount = openedCount + 1;
    setOpenedCount(nextOpenedCount);

    if (item.isWinner) {
      setIsFinished(true);
      playSuccess();

      if (nextOpenedCount === 1) {
        setVictoryType('JACKPOT');
        // All others flee empty-handed
        setChests(prev => prev.map(ch => ch.isWinner ? { ...ch, isOpened: true } : { ...ch, isOpened: true, isFled: true, fledWithGold: false }));
      } else if (nextOpenedCount === 4) {
        setVictoryType('CANDIES');
        setChests(prev => prev.map(ch => ch.index === item.index ? { ...ch, isOpened: true } : ch));
      } else {
        setVictoryType('PARTIAL');
        setChests(prev => prev.map(ch => ch.index === item.index ? { ...ch, isOpened: true } : ch));
      }
    } else {
      playBoing();
      setChests(prev => prev.map(ch => ch.index === item.index ? { ...ch, isOpened: true, isFled: true, fledWithGold: true } : ch));
    }
  };

  // Spark falling coins/candies animation
  useEffect(() => {
    if (!isFinished || !victoryType) return;

    const emojiPool = victoryType === 'CANDIES' 
      ? ["🍬", "🍭", "🍩", "🍫", "🧁"]
      : ["🪙", "💰", "👑", "✨"];

    const count = victoryType === 'JACKPOT' ? 45 : victoryType === 'PARTIAL' ? 30 : 20;
    const initialParticles = Array.from({ length: count }, (_, id) => ({
      id,
      x: Math.random() * 100, // percentage x
      y: -10 - Math.random() * 20,
      emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)],
      speedY: 2 + Math.random() * 3,
      speedX: Math.random() * 1 - 0.5,
      rotation: Math.random() * 360,
      rotateSpeed: 45 + Math.random() * 90
    }));

    setParticles(initialParticles);

    // Particle slide loop timer
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let ny = p.y + p.speedY * 0.25;
        let nx = p.x + p.speedX * 0.25;
        let nr = p.rotation + p.rotateSpeed * 0.05;

        if (ny > 110) {
          ny = -10;
          nx = Math.random() * 100;
        }

        return {
          ...p,
          y: ny,
          x: nx,
          rotation: nr
        };
      }));
    }, 30);

    return () => clearInterval(interval);

  }, [isFinished, victoryType]);

  const handleClaim = () => {
    if (winnerStudent) {
      onWin(winnerStudent);
    }
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Hazine avı için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 bg-amber-950/20 dark:bg-amber-950/40 rounded-2xl md:rounded-[32px] overflow-hidden min-h-[460px] relative border border-amber-900/30">
      {/* Falling gold coins or candy animation viewport */}
      {particles.map(p => (
        <span
          key={`part-${p.id}`}
          className="absolute text-xl pointer-events-none select-none z-10"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`
          }}
        >
          {p.emoji}
        </span>
      ))}

      <h2 className="text-xl font-black text-amber-600 text-center uppercase tracking-wider mb-8 z-20 leading-none">
        🪙 HAZİNE AVI
      </h2>

      {/* Grid of 4 chests */}
      <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto w-full z-20">
        {chests.map((ch, idx) => {
          return (
            <motion.button
              key={`chest-${idx}`}
              whileHover={!ch.isOpened ? { scale: 1.05 } : {}}
              whileTap={!ch.isOpened ? { scale: 0.95 } : {}}
              onClick={() => handleChestClick(ch)}
              disabled={ch.isOpened || isFinished}
              className={`aspect-video rounded-2xl shadow-md border-2 p-3 text-center flex flex-col items-center justify-center transition-all ${
                ch.isOpened 
                  ? 'bg-neutral-900/60 border-amber-950/50 shadow-inner' 
                  : 'bg-amber-800 hover:bg-amber-700 border-amber-900 text-amber-50 cursor-pointer'
              }`}
            >
              <AnimatePresence mode="wait">
                {!ch.isOpened ? (
                  <motion.div 
                    key="closed"
                    className="flex flex-col items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="text-4xl filter drop-shadow-md drop-shadow">📦</span>
                    <span className="text-3xs font-extrabold tracking-widest uppercase mt-2 text-amber-300">
                      SANDIK {idx + 1}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="opened"
                    className="flex flex-col items-center"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    {ch.isWinner ? (
                      <>
                        <span className="text-5xl animate-bounce">👑</span>
                        <span className="text-3xs font-black text-amber-400 mt-2 uppercase tracking-wide">
                          Hazine Bulundu!
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">{ch.pirateEmoji}</span>
                        <span className="text-2xs font-extrabold text-rose-500 mt-1 uppercase tracking-tight leading-none">
                          {ch.pirateName}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-bold leading-none mt-1">
                          {ch.fledWithGold ? "Altını Çaldı!" : "Kaçtı!"}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Victory card banner panel */}
      {isFinished && victoryType && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-8 bg-white dark:bg-neutral-900 p-5 rounded-2xl shadow-xl max-w-sm mx-auto w-full text-center z-20 border border-neutral-100 dark:border-neutral-800"
        >
          <div className="flex justify-center mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              victoryType === 'JACKPOT' ? 'bg-amber-500 text-white' : victoryType === 'CANDIES' ? 'bg-pink-500 text-white' : 'bg-indigo-500 text-white'
            }`}>
              {victoryType === 'JACKPOT' ? <Award size={24} /> : victoryType === 'CANDIES' ? <Star size={24} /> : <ShieldAlert size={24} />}
            </div>
          </div>

          <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-tight">
            {victoryType === 'JACKPOT' && "🏆 JACKPOT KAZANDINIZ!"}
            {victoryType === 'PARTIAL' && "🪙 KISMİ ZAFER!"}
            {victoryType === 'CANDIES' && "🍬 ŞEKER KAZANDINIZ!"}
          </h3>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {victoryType === 'JACKPOT' && "Tüm sandıkları kurtardın, korsanlar eli boş kaçtı!"}
            {victoryType === 'PARTIAL' && "Korsanlar altının bir kısmını çaldı ama kalanlar senin!"}
            {victoryType === 'CANDIES' && "Korsanlar tüm altınları çaldı ama sana leziz şekerler kaldı!"}
          </p>

          {winnerStudent && (
            <div className="my-4 p-2 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-3xs uppercase tracking-widest font-extrabold text-neutral-400">
                Şanslı Hazineci
              </span>
              <h4 className="text-md font-black text-amber-500 uppercase leading-none mt-1">
                {winnerStudent.name} {winnerStudent.surname}
              </h4>
            </div>
          )}

          <button
            onClick={handleClaim}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-98 transition-all text-white font-black text-sm rounded-xl shadow-md uppercase tracking-wide leading-none"
          >
            DEVAM ET
          </button>
        </motion.div>
      )}
    </div>
  );
};
