import React, { useState } from 'react';
import { Casino } from 'lucide-react'; // Wait, Lucide has Dices or Casino. Lucide has Dices or Ticket or Gift. Let's look up Lucide icons. Lucide has 'Dices', 'Sparkles'. We can use Dices or Sparkles from lucide. Let's use Dices and Sparkles!
import { Dices, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface DrawGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playClickSound: () => void;
}

export const DrawGame: React.FC<DrawGameProps> = ({ students, onWin, playClickSound }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [shuffleText, setShuffleText] = useState("?");

  const handleDraw = () => {
    if (isDrawing || students.length === 0) return;
    setIsDrawing(true);
    playClickSound();

    let counter = 0;
    const interval = setInterval(() => {
      // Pick a random student name to show during rapid shuffle
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      setShuffleText(randomStudent.name.substring(0, 10).toUpperCase());
      playClickSound();
      counter++;

      if (counter >= 15) {
        clearInterval(interval);
        
        // Final draw
        const winner = students[Math.floor(Math.random() * students.length)];
        setShuffleText(winner.name.toUpperCase());
        
        setTimeout(() => {
          setIsDrawing(false);
          setShuffleText("?");
          onWin(winner);
        }, 800);
      }
    }, 150);
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Kura oyunu için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-amber-50 dark:bg-neutral-950 rounded-2xl md:rounded-[32px] min-h-[450px]">
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        <AnimatePresence mode="wait">
          {!isDrawing ? (
            <motion.div
              key="idle"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-48 h-64 bg-amber-500 rounded-[32px] shadow-2xl flex flex-col items-center justify-center border-b-[8px] border-amber-600 border-x-2 border-amber-400 relative overflow-hidden group hover:rotate-1 transition-transform"
            >
              <Dices size={72} className="text-white/20 absolute top-10 left-6 -rotate-12" />
              <div className="text-7xl font-black text-white/10 select-none absolute bottom-10 right-6 rotate-12">
                ?
              </div>
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-5xl font-black">
                ?
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="drawing"
              animate={{ 
                y: [0, -15, 10, -10, 0],
                rotate: [0, -4, 4, -3, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 0.35, 
                ease: "linear" 
              }}
              className="w-48 h-64 bg-white dark:bg-neutral-900 rounded-[32px] shadow-xl border-4 border-amber-300 flex flex-col items-center justify-center p-4"
            >
              <Dices size={40} className="text-amber-400 animate-spin mb-4" />
              <div className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest text-center truncate w-full animate-pulse leading-none">
                {shuffleText}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleDraw}
          disabled={isDrawing}
          className="px-10 py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-white font-black text-xl rounded-full shadow-lg hover:shadow-amber-200/50 dark:hover:shadow-none transition-all uppercase tracking-tight flex items-center gap-2 transform active:scale-95 leading-none"
        >
          {isDrawing ? (
            <>
              <RefreshCw className="animate-spin" size={20} />
              KARILIYOR...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              KURA ÇEK
            </>
          )}
        </button>
      </div>
    </div>
  );
};
