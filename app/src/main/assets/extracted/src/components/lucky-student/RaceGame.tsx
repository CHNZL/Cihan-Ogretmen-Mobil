import React, { useState, useEffect, useRef } from 'react';
import { Flag, Play, AlertTriangle } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface RaceGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playClickSound: () => void;
}

interface Racer {
  student: Student;
  progress: number;
  speed: number;
  icon: string;
  isPaused: boolean;
  isReverse: boolean;
  reachedBox: boolean;
  accident1Checked: boolean;
  accident2Checked: boolean;
  finished: boolean;
}

const MALE_ICONS = ["👦", "👨", "👱‍♂️", "🧔", "🦸‍♂️", "🥷", "🧙‍♂️", "🧛‍♂️"];
const FEMALE_ICONS = ["👧", "👩", "👱‍♀️", "👩‍🦰", "🦸‍♀️", "🧝‍♀️", "🧚‍♀️", "🧛‍♀️"];

const VEHICLES = [
  { icon: "🚀", speed: 0.35 },
  { icon: "🏎️", speed: 0.32 },
  { icon: "🛸", speed: 0.28 },
  { icon: "🚲", speed: 0.18 },
  { icon: "🐴", speed: 0.15 },
  { icon: "🐢", speed: 0.08 }
];

export const RaceGame: React.FC<RaceGameProps> = ({ students, onWin, playClickSound }) => {
  const [racers, setRacers] = useState<Racer[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isRacing, setIsRacing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const {
    playF1Beep,
    playF1Go,
    playEngineTurbo,
    playCarSkid,
    playSuccess
  } = useSound();

  const isRacingRef = useRef(isRacing);
  const racersRef = useRef<Racer[]>([]);

  useEffect(() => {
    isRacingRef.current = isRacing;
  }, [isRacing]);

  useEffect(() => {
    racersRef.current = racers;
  }, [racers]);

  useEffect(() => {
    if (students.length === 0) return;
    
    // Choose up to 5 random students for the lanes
    const pool = [...students].sort(() => Math.random() - 0.5).slice(0, 5);
    const initialRacers = pool.map(student => {
      const isFemale = student.gender === 'Kız';
      const starterIcon = isFemale 
        ? FEMALE_ICONS[Math.floor(Math.random() * FEMALE_ICONS.length)]
        : MALE_ICONS[Math.floor(Math.random() * MALE_ICONS.length)];
      
      return {
        student,
        progress: 0,
        speed: 0.08 + Math.random() * 0.04, // starter speed
        icon: starterIcon,
        isPaused: false,
        isReverse: false,
        reachedBox: false,
        accident1Checked: false,
        accident2Checked: false,
        finished: false
      };
    });

    setRacers(initialRacers);
    setGameStarted(false);
    setIsRacing(false);
    setCountdown(null);
  }, [students]);

  const startRaceSequence = () => {
    if (gameStarted) return;
    setGameStarted(true);
    setCountdown(3);
    playF1Beep();
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        playF1Beep();
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      playF1Go();
      setIsRacing(true);
    }
  }, [countdown]);

  // Main game loop
  useEffect(() => {
    if (!isRacing) return;

    let lastTime = performance.now();
    let frameId = 0;

    const gameLoop = (now: number) => {
      if (!isRacingRef.current) return;
      
      const delta = (now - lastTime) / 1000; // in seconds
      lastTime = now;

      let anyChange = false;
      let winnerFound: Student | null = null;

      const updated = racersRef.current.map(racer => {
        if (racer.finished) return racer;

        let progress = racer.progress;
        let speed = racer.speed;
        let icon = racer.icon;
        let isPaused = racer.isPaused;
        let isReverse = racer.isReverse;
        let reachedBox = racer.reachedBox;
        let accident1Checked = racer.accident1Checked;
        let accident2Checked = racer.accident2Checked;
        let finished = racer.finished;

        if (!isPaused) {
          const moveDirection = isReverse ? -1 : 1;
          progress += speed * delta * moveDirection;
          progress = Math.max(0, Math.min(1, progress));
          anyChange = true;
        }

        // Surprise magic box (20% mark)
        if (progress >= 0.2 && !reachedBox && !isReverse) {
          reachedBox = true;
          playEngineTurbo();
          const vehicle = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
          icon = vehicle.icon;
          speed = vehicle.speed * (0.85 + Math.random() * 0.3);
        }

        // Accident 1 (50% mark)
        if (progress >= 0.5 && !accident1Checked && !isReverse) {
          accident1Checked = true;
          if (Math.random() < 0.75) {
            playCarSkid();
            if (Math.random() < 0.5) {
              isPaused = true;
              setTimeout(() => {
                setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isPaused: false } : pr));
              }, 1600);
            } else {
              isReverse = true;
              setTimeout(() => {
                setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isReverse: false } : pr));
              }, 1200);
            }
          }
        }

        // Accident 2 (80% mark)
        if (progress >= 0.8 && !accident2Checked && !isReverse) {
          accident2Checked = true;
          if (Math.random() < 0.65) {
            playCarSkid();
            if (Math.random() < 0.5) {
              isPaused = true;
              setTimeout(() => {
                setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isPaused: false } : pr));
              }, 1200);
            } else {
              isReverse = true;
              setTimeout(() => {
                setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isReverse: false } : pr));
              }, 800);
            }
          }
        }

        // Finished
        if (progress >= 0.98 && !finished) {
          finished = true;
          if (!winnerFound) {
            winnerFound = racer.student;
          }
        }

        return {
          ...racer,
          progress,
          speed,
          icon,
          isPaused,
          isReverse,
          reachedBox,
          accident1Checked,
          accident2Checked,
          finished
        };
      });

      if (anyChange) {
        setRacers(updated);
      }

      if (winnerFound) {
        setIsRacing(false);
        const winStudent = winnerFound;
        setTimeout(() => {
          onWin(winStudent);
        }, 1200);
      } else {
        frameId = requestAnimationFrame(gameLoop);
      }
    };

    frameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isRacing]);

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Yarış pisti için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-slate-100 dark:bg-neutral-950 rounded-2xl md:rounded-[32px] overflow-hidden min-h-[450px]">
      {!gameStarted ? (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={startRaceSequence}
            className="px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl rounded-full shadow-lg hover:shadow-emerald-200/50 dark:hover:shadow-none transition-all uppercase tracking-tight flex items-center gap-2 transform active:scale-95 leading-none"
          >
            <Play size={24} />
            YARIŞI BAŞLAT
          </button>
        </div>
      ) : countdown !== null && countdown > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-9xl font-black text-emerald-500 animate-ping">
            {countdown}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between py-4">
          <h2 className="text-xl font-black text-emerald-500 text-center uppercase tracking-wider animate-pulse">
            Yarış Sürüyor!
          </h2>

          <div className="flex-1 flex flex-col justify-center space-y-4 my-6">
            {racers.map((racer, idx) => (
              <div 
                key={`${racer.student.id}-${idx}`}
                className="flex items-center w-full h-12 bg-white dark:bg-neutral-900 rounded-xl relative shadow-sm border border-neutral-200/50 dark:border-neutral-800"
              >
                {/* Horizontal Lane Dotted track */}
                <div className="absolute inset-x-4 inset-y-0 flex items-center select-none pointer-events-none overflow-hidden">
                  <div className="w-full text-center text-xl font-black text-neutral-200 dark:text-neutral-800 tracking-widest uppercase truncate px-8 leading-none opacity-45">
                    {racer.student.name} {racer.student.surname}
                  </div>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-neutral-300 dark:border-neutral-700 w-full" />
                </div>

                {/* Surprise Mystery Box Mark */}
                {!racer.reachedBox && (
                  <div className="absolute left-[20%] z-10 w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-md border border-amber-600 animate-bounce">
                    ?
                  </div>
                )}

                {/* Moving Racer Avatar */}
                <div 
                  className="absolute transition-[left] ease-linear duration-75 relative"
                  style={{ left: `calc(${racer.progress * 85}% + 10px)` }}
                >
                  <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-full border-2 border-emerald-500 shadow-md flex items-center justify-center text-xl relative">
                    {racer.icon}

                    {/* Alert sub-badge modifiers */}
                    {racer.isPaused && (
                      <span className="absolute -top-1 -right-1 text-xs">💨</span>
                    )}
                    {racer.isReverse && (
                      <AlertTriangle className="absolute -top-1 -right-1 text-rose-500 w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Red checkered style finish line */}
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-rose-500 flex flex-col items-center justify-between select-none pointer-events-none rounded-r-xl">
                  <div className="w-full h-1 bg-white" />
                  <div className="w-full h-1 bg-black" />
                  <div className="w-full h-1 bg-white" />
                  <div className="w-full h-1 bg-black" />
                  <div className="w-full h-1 bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
