import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface SpaceGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playWhooshSound: () => void;
}

interface SpaceRacer {
  student: Student;
  progress: number;
  speed: number;
  icon: string;
  isPaused: boolean;
  isReverse: boolean;
  isTurbo: boolean;
  isShaking: boolean;
  reachedTurbo: boolean;
  reachedAsteroid1: boolean;
  reachedAsteroid2: boolean;
  finished: boolean;
}

const SPACE_ICONS = ["🚀", "🛸", "🛰️", "🚀", "🛸", "🚀", "🛰️"];

export const SpaceGame: React.FC<SpaceGameProps> = ({ students, onWin, playWhooshSound }) => {
  const [racers, setRacers] = useState<SpaceRacer[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isRacing, setIsRacing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const {
    playF1Beep,
    playRocketLaunch,
    playSpaceTurbo,
    playAsteroidHit,
    playSuccess
  } = useSound();

  const isRacingRef = useRef(isRacing);
  const racersRef = useRef<SpaceRacer[]>([]);

  useEffect(() => {
    isRacingRef.current = isRacing;
  }, [isRacing]);

  useEffect(() => {
    racersRef.current = racers;
  }, [racers]);

  useEffect(() => {
    if (students.length === 0) return;

    const pool = [...students].sort(() => Math.random() - 0.5).slice(0, 5);
    const initialRacers = pool.map(student => {
      const icon = SPACE_ICONS[Math.floor(Math.random() * SPACE_ICONS.length)];
      return {
        student,
        progress: 0,
        speed: 0.08 + Math.random() * 0.04,
        icon,
        isPaused: false,
        isReverse: false,
        isTurbo: false,
        isShaking: false,
        reachedTurbo: false,
        reachedAsteroid1: false,
        reachedAsteroid2: false,
        finished: false
      };
    });

    setRacers(initialRacers);
    setGameStarted(false);
    setIsRacing(false);
    setCountdown(null);
  }, [students]);

  const firlat = () => {
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
      playRocketLaunch();
      setIsRacing(true);
    }
  }, [countdown]);

  // Physics animation loop
  useEffect(() => {
    if (!isRacing) return;

    let lastTime = performance.now();
    let frameId = 0;

    const gameLoop = (now: number) => {
      if (!isRacingRef.current) return;

      const delta = (now - lastTime) / 1000;
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
        let isTurbo = racer.isTurbo;
        let isShaking = racer.isShaking;
        let reachedTurbo = racer.reachedTurbo;
        let reachedAsteroid1 = racer.reachedAsteroid1;
        let reachedAsteroid2 = racer.reachedAsteroid2;
        let finished = racer.finished;

        if (!isPaused && !isShaking) {
          const moveDirection = isReverse ? -1 : 1;
          const currentSpeed = isTurbo ? speed * 2.5 : speed;
          progress += currentSpeed * delta * moveDirection;
          progress = Math.max(0, Math.min(1, progress));
          anyChange = true;
        }

        // Turbo check (30% mark)
        if (progress >= 0.3 && !reachedTurbo && !isReverse) {
          reachedTurbo = true;
          if (Math.random() < 0.5) {
            playSpaceTurbo();
            isTurbo = true;
            setTimeout(() => {
              setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isTurbo: false } : pr));
            }, 2000);
          }
        }

        // Asteroid Hit check (50% mark)
        if (progress >= 0.5 && !reachedAsteroid1 && !isReverse) {
          reachedAsteroid1 = true;
          if (Math.random() < 0.6) {
            playAsteroidHit();
            if (Math.random() < 0.5) {
              isPaused = true;
              setTimeout(() => {
                setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isPaused: false } : pr));
              }, 1500);
            } else {
              isShaking = true;
              setTimeout(() => {
                setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isShaking: false } : pr));
              }, 1000);
            }
          }
        }

        // Black Hole pull check (75% mark)
        if (progress >= 0.75 && !reachedAsteroid2 && !isReverse) {
          reachedAsteroid2 = true;
          if (Math.random() < 0.5) {
            playAsteroidHit();
            isReverse = true;
            setTimeout(() => {
              setRacers(prev => prev.map(pr => pr.student.id === racer.student.id ? { ...pr, isReverse: false } : pr));
            }, 1200);
          }
        }

        // Finished flag check
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
          isTurbo,
          isShaking,
          reachedTurbo,
          reachedAsteroid1,
          reachedAsteroid2,
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
        }, 800);
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
        Uzay yolculuğu için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-slate-950 rounded-2xl md:rounded-[32px] overflow-hidden min-h-[450px] relative">
      {/* Twinkling star field background layer */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute w-1 h-1 bg-white rounded-full top-[10%] left-[20%] animate-pulse" />
        <div className="absolute w-1.5 h-1.5 bg-white rounded-full top-[25%] left-[80%] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-1 h-1 bg-white rounded-full top-[70%] left-[15%] animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-2 h-2 bg-purple-400 rounded-full top-[45%] left-[65%] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute w-1 h-1 bg-sky-300 rounded-full top-[85%] left-[75%] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {!gameStarted ? (
        <div className="flex-1 flex items-center justify-center z-10">
          <button
            onClick={firlat}
            className="px-10 py-5 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xl rounded-full shadow-lg hover:shadow-indigo-500/50 transition-all uppercase tracking-tight flex items-center gap-2 transform active:scale-95 leading-none"
          >
            <Play size={24} />
            FIRLAT!
          </button>
        </div>
      ) : countdown !== null && countdown > 0 ? (
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="text-9xl font-black text-indigo-400 animate-ping">
            {countdown}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between py-4 z-10">
          <h2 className="text-xl font-black text-indigo-400 text-center uppercase tracking-wider flex items-center justify-center gap-2 animate-pulse leading-none">
            <Sparkles size={20} />
            UZAY YOLCULUĞU
          </h2>

          <div className="flex-1 flex justify-around items-stretch my-6 relative overflow-hidden px-4">
            {racers.map((racer, idx) => (
              <div 
                key={`${racer.student.id}-${idx}`}
                className="flex flex-col items-center w-12 bg-neutral-900/50 rounded-2xl relative shadow-md border border-neutral-800"
              >
                {/* Vertical Lane track lines */}
                <div className="absolute inset-y-4 inset-x-0 flex flex-col items-center select-none pointer-events-none overflow-hidden justify-center text-center">
                  <div className="text-xs font-black text-neutral-800 tracking-widest uppercase vertical-text absolute top-10 leading-none">
                    {racer.student.name}
                  </div>
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-neutral-800 h-full" />
                </div>

                {/* Sky blue laser finish line at the top */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-sky-400 select-none pointer-events-none rounded-t-2xl shadow-md animate-pulse" />

                {/* Moving Rocket Racer upward */}
                <div 
                  className="absolute transition-[bottom] ease-linear duration-75 relative"
                  style={{ 
                    bottom: `calc(${racer.progress * 82}% + 10px)`,
                    animation: racer.isShaking ? 'shake 0.1s infinite' : 'none'
                  }}
                >
                  <div className="w-10 h-10 bg-neutral-800 rounded-full border-2 border-indigo-400 shadow-md flex items-center justify-center text-xl relative">
                    {racer.icon}

                    {/* Laser trails fire */}
                    {racer.isTurbo && (
                      <span className="absolute -bottom-2 text-xs text-orange-500 animate-bounce">🔥</span>
                    )}
                    {racer.isPaused && (
                      <span className="absolute -top-1 -right-1 text-xs">💥</span>
                    )}
                    {racer.isReverse && (
                      <span className="absolute -top-1 -right-1 text-xs">☄️</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10.0% { transform: translate(-1px, -2px) rotate(-1deg); }
          20.0% { transform: translate(-3px, 0px) rotate(1deg); }
          30.0% { transform: translate(0px, 2px) rotate(0deg); }
          40.0% { transform: translate(1px, -1px) rotate(1deg); }
          50.0% { transform: translate(-1px, 2px) rotate(-1deg); }
          60.0% { transform: translate(-3px, 1px) rotate(0deg); }
          70.0% { transform: translate(2px, 1px) rotate(-1deg); }
          80.0% { transform: translate(-1px, -1px) rotate(1deg); }
          90.0% { transform: translate(2px, 2px) rotate(0deg); }
          100.0% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};
