import React, { useState, useEffect, useRef } from 'react';
import { useSound } from '../../hooks/useSound';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface FlowerGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playClickSound: () => void;
}

interface Flower {
  student: Student;
  x: number;
  y: number;
  icon: string;
  isWinner: boolean;
}

interface Bee {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
}

const EMOJIS = ["🌸", "🌺", "🌻", "🌼", "🌹", "🌷", "🪷"];

export const FlowerGame: React.FC<FlowerGameProps> = ({ students, onWin, playClickSound }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [bees, setBees] = useState<Bee[]>([]);
  const [gatheringPhase, setGatheringPhase] = useState(false);
  const [statusText, setStatusText] = useState("Arılar şanslı çiçeği arıyor...");

  const { playBeeBuzz, playCoin, playSuccess } = useSound();

  const gatheringRef = useRef(gatheringPhase);
  const flowersRef = useRef<Flower[]>([]);
  const beesRef = useRef<Bee[]>([]);

  useEffect(() => {
    gatheringRef.current = gatheringPhase;
  }, [gatheringPhase]);

  useEffect(() => {
    flowersRef.current = flowers;
  }, [flowers]);

  useEffect(() => {
    beesRef.current = bees;
  }, [bees]);

  // Spawn Flowers and Bees
  useEffect(() => {
    if (students.length === 0 || !containerRef.current) return;
    
    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 400;

    const selected = [...students].sort(() => Math.random() - 0.5).slice(0, 15);
    
    // Grid alignment for flowers to avoid overlaps
    const cols = Math.ceil(Math.sqrt(selected.length)) || 1;
    const rows = Math.ceil(selected.length / cols) || 1;
    const cellW = (width - 80) / cols;
    const cellH = (height - 80) / rows;

    const initialFlowers = selected.map((student, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 50 + col * cellW + cellW / 2 + (Math.random() * 20 - 10);
      const y = 50 + row * cellH + cellH / 2 + (Math.random() * 20 - 10);
      const icon = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      
      return {
        student,
        x,
        y,
        icon,
        isWinner: false
      };
    });

    const initialBees = Array.from({ length: 15 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      targetX: Math.random() * width,
      targetY: Math.random() * height,
      speed: 120 + Math.random() * 150
    }));

    setFlowers(initialFlowers);
    setBees(initialBees);
    setGatheringPhase(false);
    setStatusText("Arılar şanslı çiçeği arıyor...");

    // Buzzing audio loop trigger
    const soundTimer = setInterval(() => {
      if (!gatheringRef.current) {
        playBeeBuzz();
      }
    }, 1000);

    // Winner selection sequence
    const selectionTimer = setTimeout(() => {
      if (initialFlowers.length === 0) return;
      
      const winnerIdx = Math.floor(Math.random() * initialFlowers.length);
      const finalWinner = initialFlowers[winnerIdx].student;

      setFlowers(prev => prev.map((f, idx) => idx === winnerIdx ? { ...f, isWinner: true } : f));
      setGatheringPhase(true);
      setStatusText("Şanslı çiçek bulundu!");
      playCoin();

      // Finish Timer after gathering focusing
      setTimeout(() => {
        playSuccess();
        onWin(finalWinner);
      }, 3000);

    }, 4500);

    return () => {
      clearInterval(soundTimer);
      clearTimeout(selectionTimer);
    };

  }, [students]);

  // Fly animation updating
  useEffect(() => {
    if (flowers.length === 0 || bees.length === 0) return;

    let lastTime = performance.now();
    let frameId = 0;

    const updateMovement = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let width = 600;
      let height = 400;
      if (containerRef.current) {
        width = containerRef.current.clientWidth || 600;
        height = containerRef.current.clientHeight || 400;
      }

      const winFlower = flowersRef.current.find(f => f.isWinner);

      const nextBees = beesRef.current.map(bee => {
        let tx = bee.targetX;
        let ty = bee.targetY;

        if (gatheringRef.current && winFlower) {
          // Focus target on winning flower with slight scatter offset
          tx = winFlower.x + (Math.random() * 50 - 25);
          ty = winFlower.y + (Math.random() * 50 - 25);
        } else {
          // Roam logic: update target if reached
          const dx = tx - bee.x;
          const dy = ty - bee.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < 20) {
            tx = Math.random() * width;
            ty = Math.random() * height;
          }
        }

        const dx = tx - bee.x;
        const dy = ty - bee.y;
        const dist = Math.hypot(dx, dy);

        let nx = bee.x;
        let ny = bee.y;

        if (dist > 2) {
          nx += (dx / dist) * bee.speed * delta;
          ny += (dy / dist) * bee.speed * delta;
        }

        return {
          ...bee,
          x: nx,
          y: ny,
          targetX: tx,
          targetY: ty
        };
      });

      setBees(nextBees);
      frameId = requestAnimationFrame(updateMovement);
    };

    frameId = requestAnimationFrame(updateMovement);
    return () => cancelAnimationFrame(frameId);
  }, [flowers, bees]);

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Çiçek bahçesi için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex-1 relative bg-emerald-100 dark:bg-emerald-950/20 overflow-hidden min-h-[450px] w-full rounded-2xl md:rounded-[32px] border border-emerald-200/50"
    >
      {/* Garden state heading status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-extrabold px-6 py-2 rounded-full shadow-md z-15 select-none pointer-events-none text-xs md:text-sm tracking-wide uppercase leading-none">
        {statusText}
      </div>

      {/* Render flowers */}
      {flowers.map((fl, index) => (
        <div
          key={`${fl.student.id}-${index}`}
          className="absolute flex flex-col items-center pointer-events-none transition-all duration-300"
          style={{
            left: `${fl.x}px`,
            top: `${fl.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: fl.isWinner ? 20 : 10
          }}
        >
          <div className={`transition-transform duration-300 ${fl.isWinner ? 'scale-150 animate-bounce' : 'scale-100'} text-4xl sm:text-5xl`}>
            {fl.icon}
          </div>
          <div className="mt-1.5 bg-white/90 dark:bg-neutral-900/90 px-2 py-0.5 rounded shadow-sm text-[9px] md:text-2xs font-extrabold text-neutral-800 dark:text-neutral-100 uppercase border border-emerald-200 truncate max-w-[85px] text-center leading-none">
            {fl.student.name}
          </div>
        </div>
      ))}

      {/* Render bees */}
      {bees.map((bee, idx) => {
        const isFlipped = bee.targetX < bee.x;
        return (
          <div
            key={`bee-${idx}`}
            className="absolute text-2xl transition-transform ease-linear duration-75 select-none pointer-events-none"
            style={{
              left: `${bee.x}px`,
              top: `${bee.y}px`,
              transform: `translate(-50%, -50%) scaleX(${isFlipped ? -1 : 1})`,
              zIndex: 30
            }}
          >
            🐝
          </div>
        );
      })}
    </div>
  );
};
