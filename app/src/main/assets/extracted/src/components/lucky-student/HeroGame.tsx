import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Zap } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface HeroGameProps {
  students: Student[];
  onWin: (student: Student) => void;
  playClickSound: () => void;
}

export const HeroGame: React.FC<HeroGameProps> = ({ students, onWin, playClickSound }) => {
  const [selectedHero, setSelectedHero] = useState<Student | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [tickerName, setTickerName] = useState("");
  const [beamAngle, setBeamAngle] = useState(0);
  const [flashAlpha, setFlashAlpha] = useState(0);

  const { playTick, playSuccess } = useSound();

  useEffect(() => {
    if (students.length === 0) return;
    
    // Choose selected hero student
    const chosen = students[Math.floor(Math.random() * students.length)];
    setSelectedHero(chosen);
    setIsSearching(false);
    setIsFinished(false);
    setTickerName("");
    setBeamAngle(0);
    setFlashAlpha(0);
  }, [students]);

  // Handle angle sweeping for searchlight in interval
  useEffect(() => {
    if (!isSearching) return;

    let dir = 0.8;
    const interval = setInterval(() => {
      setBeamAngle(prev => {
        let nextAngle = prev + dir;
        if (nextAngle > 30) dir = -0.8;
        if (nextAngle < -30) dir = 0.8;
        return nextAngle;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isSearching]);

  // Flash fading loop
  useEffect(() => {
    if (flashAlpha <= 0) return;
    const timer = setTimeout(() => {
      setFlashAlpha(prev => Math.max(0, prev - 0.08));
    }, 20);
    return () => clearTimeout(timer);
  }, [flashAlpha]);

  const startSearch = () => {
    if (isSearching || students.length === 0) return;
    setIsSearching(true);
    setIsFinished(false);

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      const randStudent = students[Math.floor(Math.random() * students.length)];
      setTickerName(randStudent.name.toUpperCase());
      playTick();
      tickCount++;

      if (tickCount >= 22) {
        clearInterval(tickInterval);
        
        // Finalize 
        setFlashAlpha(1.0);
        setIsSearching(false);
        setIsFinished(true);
        playSuccess();
      }
    }, 125);
  };

  const handleContinue = () => {
    if (selectedHero) {
      onWin(selectedHero);
    }
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-500">
        Kahraman sinyali için yan taraftan en az 1 öğrenci seçmelisiniz.
      </div>
    );
  }

  const isFemale = selectedHero?.gender === 'Kız';

  return (
    <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-950 to-indigo-950/80 rounded-2xl md:rounded-[32px] overflow-hidden min-h-[460px] relative">
      
      {/* City skyline silhouettes and twinkling stars */}
      <div className="absolute inset-x-0 bottom-0 h-40 z-10 flex items-end justify-around px-4 pointer-events-none opacity-85">
        <div className="w-14 h-24 bg-neutral-900 border-x border-t border-neutral-950/50 flex flex-wrap p-1 content-start gap-1">
          <div className="w-1.5 h-1.5 bg-amber-400/40 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-neutral-800 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-amber-400/30 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-amber-400/40 rounded-sm" />
        </div>
        <div className="w-20 h-32 bg-neutral-900/90 border-x border-t border-neutral-950/50 flex flex-wrap p-1.5 content-start gap-1">
          <div className="w-2 h-2 bg-neutral-800 rounded-sm" />
          <div className="w-2 h-2 bg-amber-400/30 rounded-sm" />
          <div className="w-2 h-2 bg-amber-400/40 rounded-sm" />
          <div className="w-2 h-2 bg-neutral-800 rounded-sm" />
          <div className="w-2 h-2 bg-amber-400/20 rounded-sm" />
        </div>
        <div className="w-16 h-28 bg-neutral-900 border-x border-t border-neutral-950/50 flex flex-wrap p-1 content-start gap-1.5">
          <div className="w-2 h-2 bg-amber-400/40 rounded-sm" />
          <div className="w-2 h-2 bg-neutral-800 rounded-sm" />
          <div className="w-2 h-2 bg-amber-400/35 rounded-sm" />
        </div>
      </div>

      {/* Star twinkle field */}
      <div className="absolute top-10 left-10 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
      <div className="absolute top-24 right-16 w-1 h-1 bg-white rounded-full animate-pulse" />
      <div className="absolute top-36 left-48 w-1 h-1 bg-white rounded-full animate-pulse" />

      {/* Explosive flash impact white sheet panel */}
      {flashAlpha > 0 && (
        <div 
          className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-75"
          style={{ opacity: flashAlpha }}
        />
      )}

      {/* Searchlight Beam rendering */}
      {(isSearching || (isFinished && flashAlpha <= 0)) && (
        <div 
          className="absolute left-1/2 bottom-[15%] w-80 h-[400px] z-5 origin-bottom pointer-events-none"
          style={{
            transform: `translateX(-50%) rotate(${isSearching ? beamAngle : 0}deg)`,
            background: 'radial-gradient(circle at bottom, rgba(34,211,238,0.3) 0%, rgba(59,130,246,0.05) 50%, transparent 100%)',
            clipPath: 'polygon(45% 100%, 55% 100%, 100% 0%, 0% 0%)'
          }}
        />
      )}

      {/* Glowing Signal High Aura in the beam endpoint */}
      {isFinished && flashAlpha <= 0 && selectedHero && (
        <div 
          className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full z-15 flex items-center justify-center border-4 border-dashed border-sky-400/35 animate-spin"
          style={{ animationDuration: '20s' }}
        >
          <div className="w-24 h-24 rounded-full bg-sky-400/20 backdrop-blur-md flex items-center justify-center text-5xl">
            {isFemale ? "🦸‍♀️" : "🦸‍♂️"}
          </div>
        </div>
      )}

      {/* UI state switches */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-20">
        {!gameStarted ? (
          <button
            onClick={startSearch}
            className="px-10 py-5 bg-sky-500 hover:bg-sky-600 text-white font-black text-xl rounded-full shadow-lg hover:shadow-sky-500/50 transition-all uppercase tracking-tight flex items-center gap-2 transform active:scale-95 leading-none"
          >
            <Search size={22} />
            SİNYAL GÖNDER
          </button>
        ) : isSearching ? (
          <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-sky-500/30 text-center max-w-sm w-full">
            <ShieldAlert size={40} className="text-sky-400 animate-bounce mx-auto" />
            <h3 className="text-md font-bold text-sky-400 uppercase tracking-widest mt-2 animate-pulse">
              BAĞLANTI ARANIYOR...
            </h3>
            <div className="text-xl font-black text-white mt-1 bg-slate-950 py-2.5 px-4 rounded-xl border border-neutral-800 truncate">
              {tickerName}
            </div>
          </div>
        ) : isFinished && selectedHero ? (
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 text-center max-w-sm w-full mt-24 shadow-2xl">
            <Zap className="text-sky-500 w-12 h-12 mx-auto animate-pulse" />
            <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100 uppercase mt-3 tracking-tight">
              SÜPER KAHRAMAN BELİRDİ!
            </h3>
            <div className="my-4 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-3xs uppercase tracking-widest font-black text-neutral-400">
                LİGDEN SEÇİLEN KAHRAMAN
              </span>
              <h4 className="text-xl font-black text-sky-500 uppercase mt-1 leading-none">
                {selectedHero.name} {selectedHero.surname}
              </h4>
            </div>
            <button
              onClick={handleContinue}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 active:scale-98 transition-all text-white font-black text-sm rounded-xl shadow-md uppercase tracking-wide leading-none"
            >
              DEVAM ET
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
