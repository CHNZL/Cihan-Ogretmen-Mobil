import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface BalloonGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playPopSound: () => void;
}

const BALLOON_COLORS = [
  '#f43f5e', // Rose
  '#0ea5e9', // Sky
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f97316'  // Orange
];

interface FloatingBalloon {
  id: string;
  student: Student;
  color: string;
  left: number; // percentage (0-85)
  size: number; // size in px (60-90)
  duration: number; // float duration in seconds (6-12)
  delay: number; // start delay in seconds (0-4)
}

export const BalloonGame: React.FC<BalloonGameProps> = ({ students, onWin, playPopSound }) => {
  const [balloons, setBalloons] = useState<FloatingBalloon[]>([]);
  const [poppedId, setPoppedId] = useState<string | null>(null);

  useEffect(() => {
    if (students.length === 0) return;
    
    // Select at most 15 students at random to display
    const selected = [...students].sort(() => Math.random() - 0.5).slice(0, 15);
    
    const prepared = selected.map((student, i) => {
      const left = 5 + Math.random() * 80; // random percentage
      const size = 65 + Math.random() * 25; // 65px - 90px
      const duration = 5 + Math.random() * 6; // 5s - 11s
      const delay = Math.random() * 3.5; // 0s - 3.5s
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      return {
        id: `${student.id}-${i}-${Math.random()}`,
        student,
        color,
        left,
        size,
        duration,
        delay
      };
    });
    
    setBalloons(prepared);
    setPoppedId(null);
  }, [students]);

  const handlePop = (balloon: FloatingBalloon) => {
    if (poppedId !== null) return;
    setPoppedId(balloon.id);
    playPopSound();

    setTimeout(() => {
      onWin(balloon.student);
    }, 450);
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Balon oyunu için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-sky-100 dark:bg-neutral-950 overflow-hidden min-h-[450px] w-full rounded-2xl md:rounded-[32px] shadow-inner-lg">
      {/* Sky background clouds */}
      <div className="absolute top-10 left-[8%] opacity-30 select-none pointer-events-none text-4xl">☁️</div>
      <div className="absolute top-24 right-[12%] opacity-20 select-none pointer-events-none text-5xl">☁️</div>
      <div className="absolute bottom-32 left-[18%] opacity-25 select-none pointer-events-none text-3xl">☁️</div>

      {balloons.map((b) => {
        const isThisPopped = poppedId === b.id;
        
        return (
          <div
            key={b.id}
            className="absolute bottom-[-150px] pointer-events-auto"
            style={{
              left: `${b.left}%`,
              animation: `rise ${b.duration}s linear infinite`,
              animationDelay: `${b.delay}s`,
              // Disable browser animation once popped to allow exit pop scales
              animationPlayState: isThisPopped ? 'paused' : 'running',
              zIndex: isThisPopped ? 999 : 50
            }}
          >
            <motion.button
              onClick={() => handlePop(b)}
              disabled={poppedId !== null}
              animate={isThisPopped ? { scale: [1, 2.5, 0], opacity: [1, 0.8, 0] } : { scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative cursor-pointer transition-transform hover:scale-105 active:scale-90 flex flex-col items-center"
              style={{
                width: `${b.size}px`,
                height: `${b.size * 1.2}px`
              }}
            >
              {/* Balloon main body, pear shape drawing */}
              <svg 
                viewBox="0 0 100 120" 
                className="w-full h-full drop-shadow-md select-none pointer-events-none"
                style={{ color: b.color }}
              >
                <path 
                  d="M50,116 C85,100 95,75 95,45 C95,15 75,5 50,5 C25,5 5,15 5,45 C5,75 15,100 50,116" 
                  fill="currentColor" 
                />
                {/* Slanted gloss shine reflection circle */}
                <ellipse cx="30" cy="30" rx="12" ry="6" fill="#ffffff" fillOpacity="0.4" transform="rotate(-30, 30, 30)" />
                {/* Bottom little triangle knot tie */}
                <polygon points="46,114 54,114 50,120" fill="currentColor" />
              </svg>

              {/* Little thread hanging string */}
              <div 
                className="w-0.5 opacity-60 bg-neutral-400 dark:bg-neutral-600"
                style={{ height: `${b.size * 0.4}px` }}
              />

              {/* Name badge below balloon */}
              <div className="absolute top-[35%] left-1/2 -translate-x-1/2 bg-white/85 dark:bg-neutral-900/85 px-1.5 py-0.5 rounded shadow text-[9px] md:text-2xs font-extrabold text-neutral-800 dark:text-neutral-100 uppercase border border-neutral-100 dark:border-neutral-800 max-w-[85px] truncate text-center select-none pointer-events-none">
                {b.student.name}
              </div>
            </motion.button>
          </div>
        );
      })}

      <style>{`
        @keyframes rise {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-40vh) rotate(2deg);
          }
          100% {
            transform: translateY(-110vh) rotate(-2deg);
          }
        }
      `}</style>
    </div>
  );
};
