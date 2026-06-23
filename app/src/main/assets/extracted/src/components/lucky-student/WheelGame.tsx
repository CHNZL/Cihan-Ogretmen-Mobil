import React, { useRef, useState, useEffect } from 'react';
import { Play } from 'lucide-react';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface WheelGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  playClickSound: () => void;
}

const COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b',
  '#8b5cf6', '#0ea5e9', '#f43f5e', '#3b82f6'
];

export const WheelGame: React.FC<WheelGameProps> = ({
  students,
  onWin,
  isSpinning,
  setIsSpinning,
  playClickSound
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || students.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and Redraw Wheel at current rotation
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    
    ctx.clearRect(0, 0, size, size);
    
    const segmentAngle = (2 * Math.PI) / students.length;

    students.forEach((student, index) => {
      ctx.beginPath();
      ctx.moveTo(center, center);
      const startAngle = index * segmentAngle + rotation - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = COLORS[index % COLORS.length];
      ctx.fill();

      // Text drawing
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segmentAngle / 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Space Grotesk", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(student.name.toUpperCase(), radius - 30, 5);
      ctx.restore();
    });

    // Draw center silver pin
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

  }, [students, rotation]);

  const spin = () => {
    if (isSpinning || students.length === 0) return;
    setIsSpinning(true);

    const duration = 4000; // 4 seconds
    const fps = 60;
    const totalFrames = (duration / 1000) * fps;
    const extraSpins = 5 * 2 * Math.PI; // 5 full spins minimum
    const randomOffset = Math.random() * 2 * Math.PI;
    const targetRotation = rotation + extraSpins + randomOffset;
    const startingRotation = rotation;
    const distance = targetRotation - startingRotation;

    let currentFrame = 0;
    let lastTickAngle = rotation;
    const tickInterval = (2 * Math.PI) / students.length;

    const animate = () => {
      currentFrame++;
      const t = currentFrame / totalFrames;
      
      // Cubic Ease-Out
      const easeOut = 1 - Math.pow(1 - t, 3);
      const currentRotation = startingRotation + distance * easeOut;
      setRotation(currentRotation);

      // Sound play on segment transition
      if (Math.abs(currentRotation - lastTickAngle) >= tickInterval) {
        playClickSound();
        lastTickAngle = currentRotation;
      }

      if (currentFrame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Calculate Winner
        const finalAngle = currentRotation % (2 * Math.PI);
        const normalizedAngle = (2 * Math.PI - finalAngle) % (2 * Math.PI);
        const winnerIndex = Math.floor(normalizedAngle / tickInterval) % students.length;
        
        setTimeout(() => {
          onWin(students[winnerIndex]);
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Çarkı çevirmek için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-slate-50 dark:bg-neutral-950 rounded-3xl overflow-hidden min-h-[450px]">
      {/* Pointer needle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-rose-500 text-3xl filter drop-shadow-md animate-bounce">
        ▼
      </div>

      <div className="relative w-72 h-72 sm:w-96 sm:h-96 aspect-square max-w-[90vw] shrink-0">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full rounded-full shadow-2xl bg-white dark:bg-neutral-900"
        />

        {/* Center spin overlay selector click */}
        <button
          onClick={spin}
          disabled={isSpinning}
          className="absolute inset-[40%] bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 text-white disabled:text-neutral-400 font-extrabold rounded-full shadow-lg flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-300 transform active:scale-90 border-[6px] border-white dark:border-neutral-900 group"
        >
          <Play size={20} className="group-hover:scale-125 transition-transform text-white" />
          <span className="text-[9px] font-black tracking-wider uppercase mt-1 leading-none">DÖNDÜR</span>
        </button>
      </div>
    </div>
  );
};
