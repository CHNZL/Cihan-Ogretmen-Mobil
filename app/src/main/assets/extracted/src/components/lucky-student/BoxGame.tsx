import React, { useState, useEffect } from 'react';
import { Gift, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface BoxGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playClickSound: () => void;
}

const COLORS = [
  'bg-rose-500 border-rose-600 shadow-rose-100',
  'bg-sky-500 border-sky-600 shadow-sky-100',
  'bg-emerald-500 border-emerald-600 shadow-emerald-100',
  'bg-amber-500 border-amber-600 shadow-amber-100',
  'bg-indigo-500 border-indigo-600 shadow-indigo-100',
  'bg-violet-500 border-violet-600 shadow-violet-100',
  'bg-pink-500 border-pink-600 shadow-pink-100',
  'bg-cyan-500 border-cyan-600 shadow-cyan-100'
];

export const BoxGame: React.FC<BoxGameProps> = ({ students, onWin, playClickSound }) => {
  const [shuffled, setShuffled] = useState<(Student & { colorClass: string; index: number })[]>([]);
  const [openedBoxId, setOpenedBoxId] = useState<number | null>(null);

  useEffect(() => {
    if (students.length === 0) return;
    const items = students.map((st, i) => ({
      ...st,
      colorClass: COLORS[i % COLORS.length],
      index: i
    }));
    // Shuffle
    const shuffledItems = [...items].sort(() => Math.random() - 0.5);
    setShuffled(shuffledItems);
    setOpenedBoxId(null);
  }, [students]);

  const handleBoxClick = (item: typeof shuffled[0], index: number) => {
    if (openedBoxId !== null) return;
    setOpenedBoxId(index);
    playClickSound();

    setTimeout(() => {
      onWin(item);
    }, 1000);
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Kutu oyunu için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {shuffled.map((item, index) => {
          const isOpened = openedBoxId === index;
          return (
            <motion.button
              key={`${item.id}-${index}`}
              whileHover={!isOpened ? { scale: 1.05, y: -4 } : {}}
              whileTap={!isOpened ? { scale: 0.95 } : {}}
              onClick={() => handleBoxClick(item, index)}
              disabled={openedBoxId !== null}
              className={`aspect-square rounded-2xl md:rounded-[24px] border-b-4 flex flex-col items-center justify-center transition-all shadow-md relative overflow-hidden ${
                isOpened 
                  ? 'bg-white border-neutral-200 shadow-inner' 
                  : item.colorClass
              }`}
            >
              <div className="absolute top-2 left-2 text-white/45 font-black text-xs leading-none">
                {index + 1}
              </div>

              {isOpened ? (
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="flex flex-col items-center p-2 text-center"
                >
                  <Star className="text-amber-500 fill-amber-500 w-8 h-8 md:w-10 md:h-10 animate-pulse" />
                  <span className="text-neutral-900 font-black text-xs md:text-sm mt-2 uppercase tracking-tight break-words max-w-[100px] leading-tight">
                    {item.name}
                  </span>
                  <span className="text-neutral-400 font-bold text-[10px] mt-1">
                    No: {item.studentNo}
                  </span>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center text-white p-2">
                  <Gift className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
