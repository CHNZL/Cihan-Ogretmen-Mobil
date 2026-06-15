import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, CheckCircle2, XCircle, ArrowRight, Play, X, Star } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp, increment, updateDoc, arrayUnion } from 'firebase/firestore';

const ZIT_ANLAMLILAR = [
  { w: "Siyah", a: "Beyaz" }, { w: "Aşağı", a: "Yukarı" }, { w: "Uzun", a: "Kısa" },
  { w: "Büyük", a: "Küçük" }, { w: "Sıcak", a: "Soğuk" }, { w: "Hızlı", a: "Yavaş" },
  { w: "Gece", a: "Gündüz" }, { w: "Zengin", a: "Fakir" }, { w: "Eski", a: "Yeni" },
  { w: "Güzel", a: "Çirkin" }, { w: "Doğru", a: "Yanlış" }, { w: "Ağır", a: "Hafif" },
  { w: "Dolu", a: "Boş" }, { w: "Acı", a: "Tatlı" }, { w: "Tembel", a: "Çalışkan" },
  { w: "Karanlık", a: "Aydınlık" }, { w: "Geniş", a: "Dar" }, { w: "İçeri", a: "Dışarı" },
  { w: "İleri", a: "Geri" }, { w: "İlk", a: "Son" }, { w: "Uzak", a: "Yakın" },
  { w: "Ağlamak", a: "Gülmek" }, { w: "Aç", a: "Tok" }, { w: "Alt", a: "Üst" },
  { w: "Cimri", a: "Cömert" }, { w: "Çok", a: "Az" }, { w: "Erken", a: "Geç" }
];

const ES_ANLAMLILAR = [
  { w: "Öğrenci", a: "Talebe" }, { w: "Öğretmen", a: "Muallim" }, { w: "Okul", a: "Mektep" },
  { w: "Kırmızı", a: "Al" }, { w: "Siyah", a: "Kara" }, { w: "Beyaz", a: "Ak" },
  { w: "Misafir", a: "Konuk" }, { w: "Cevap", a: "Yanıt" }, { w: "Soru", a: "Sual" },
  { w: "Hekim", a: "Doktor" }, { w: "Güz", a: "Sonbahar" }, { w: "Yürek", a: "Kalp" },
  { w: "Anı", a: "Hatıra" }, { w: "Görev", a: "Vazife" }, { w: "Zaman", a: "Vakit" },
  { w: "Rüzgar", a: "Yel" }, { w: "Doğa", a: "Tabiat" }, { w: "Kelime", a: "Sözcük" },
  { w: "Cümle", a: "Tümce" }, { w: "Lisan", a: "Dil" }, { w: "Uzak", a: "Irak" },
  { w: "Fayda", a: "Yarar" }, { w: "Zarar", a: "Ziyan" }, { w: "Tutsak", a: "Esir" }
];

interface EsZitSoloGameProps {
  teacherUid: string;
  student: any;
  onClose: () => void;
}

export const EsZitSoloGame: React.FC<EsZitSoloGameProps> = ({ teacherUid, student, onClose }) => {
  const [stage, setStage] = useState<'intro' | 'playing' | 'score'>('intro');
  const [words, setWords] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  const [startTime, setStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    // Fetch settings and words
    const fetchWords = async () => {
      let fetchedWords: any[] = [];
      try {
        const wordsPath = `users/${teacherUid}/esZitAnlamWords`;
        const snap = await getDocs(collection(db, wordsPath));
        if (!snap.empty) {
          fetchedWords = snap.docs.map(d => d.data());
        }
      } catch (error) {
        console.error("Error fetching words:", error);
      }

      let allWords = [...fetchedWords];
      allWords = [
        ...allWords,
        ...ES_ANLAMLILAR.map(x => ({ ...x, type: 'es' })),
        ...ZIT_ANLAMLILAR.map(x => ({ ...x, type: 'zit' }))
      ];

      // Shuffle allWords and pick 10
      const shuffled = [...allWords].sort(() => Math.random() - 0.5).slice(0, 10);
      setWords(shuffled);
    };
    fetchWords();
  }, [teacherUid]);

  const startGame = () => {
    setStage('playing');
    setCurrentQIndex(0);
    setScore(0);
    setStartTime(Date.now());
    generateOptions(words[0], words);
    setTimeLeft(15);
    setIsAnswered(false);
    setSelectedOption(null);
  };

  const generateOptions = (correctWord: any, allAvailableWords: any[]) => {
    const list = correctWord.type === 'es' ? ES_ANLAMLILAR : ZIT_ANLAMLILAR;
    
    let wrongOptions: string[] = [];
    const pool = allAvailableWords.filter(w => w.type === correctWord.type && w.a !== correctWord.a).map(w => w.a);
    if (pool.length >= 3) {
      wrongOptions = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    } else {
      const fallbackPool = list.filter(w => w.a !== correctWord.a).map(w => w.a);
      wrongOptions = [...fallbackPool].sort(() => Math.random() - 0.5).slice(0, 3);
    }

    const opts = [correctWord.a, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(opts);
  };

  useEffect(() => {
    if (stage === 'playing' && !isAnswered) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAnswer(null); // Time out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [stage, isAnswered, currentQIndex]);

  const handleAnswer = (option: string | null) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(option);
    
    const correctOption = words[currentQIndex].a;
    let newScore = score;
    if (option === correctOption) {
      newScore = score + 1;
      setScore(newScore);
    }

    setTimeout(() => {
      if (currentQIndex + 1 < words.length) {
        setCurrentQIndex(prev => prev + 1);
        generateOptions(words[currentQIndex + 1], words);
        setIsAnswered(false);
        setSelectedOption(null);
        setTimeLeft(15);
      } else {
        finishGame(newScore);
      }
    }, 1500);
  };

  const finishGame = async (finalCorrectCount: number) => {
    const timeTakenMs = Date.now() - startTime;
    setStage('score');
    
    try {
      // Create a unique score ID
      const scoreRef = doc(collection(db, `users/${teacherUid}/activityScores`));
      
      const timeBonus = Math.max(0, 150000 - timeTakenMs); // 150 seconds baseline
      const finalScore = (finalCorrectCount * 1000) + Math.floor(timeBonus / 100); 
      // Example: 10 correct = 10000 points. 50s taken = 1000 bonus. Total: 11000.
      
      await setDoc(scoreRef, {
        activityId: 'es-zit-solo',
        instanceId: 'solo',
        studentId: student.id,
        studentName: student.name,
        score: finalCorrectCount, // How many correct out of 10
        totalScore: finalScore, // Encodes score + speed bonus
        timeTakenMs: timeTakenMs,
        date: Date.now(),
        teacherUid: teacherUid
      });

      // Update student's stars if score > 0
      if (finalCorrectCount > 0) {
        const studentRef = doc(db, `users/${teacherUid}/students/${student.id}`);
        const rewardAmount = Math.floor(finalCorrectCount / 2);
        if (rewardAmount > 0) {
          await updateDoc(studentRef, {
            stars: increment(rewardAmount),
            starHistory: arrayUnion({
              category: 'Eş/Zıt Anlam Yıldızı',
              description: `Eş ve Zıt Anlam Solo Oyun: 10/${finalCorrectCount} Doğru`,
              amount: rewardAmount,
              timestamp: Date.now()
            })
          });
        }
      }

    } catch (error: any) {
      console.error("Error saving score:", error);
      alert("Skor kaydedilemedi: " + error.message);
    }
  };

  if (stage === 'intro') {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          style={{ perspective: 1000 }}
          className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-10 text-center relative overflow-hidden border-b-[6px] border-indigo-200"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none" />

          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-full transition-colors z-10">
            <X size={20} strokeWidth={3} />
          </button>
          
          <motion.div 
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="w-24 h-24 bg-gradient-to-br from-fuchsia-400 to-indigo-500 text-white mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-lg rotate-3"
          >
            <Star size={48} className="fill-current" />
          </motion.div>
          
          <h2 className="text-3xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-indigo-600 drop-shadow-sm leading-tight">Eş ve Zıt Anlam <br />Meydan Okuması</h2>
          <p className="text-neutral-500 mb-8 text-base font-bold">
            10 kelime, 15 saniye! <br />Sınıf liderliğine oynayabileceksin. Hazır mısın?
          </p>
          
          <motion.button
            whileHover={words.length > 0 ? { scale: 1.02, y: -4 } : {}}
            whileTap={words.length > 0 ? { scale: 0.95, y: 2 } : {}}
            onClick={startGame}
            disabled={words.length === 0}
            className={`w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black text-xl py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_6px_0_0_rgba(79,70,229,0.4)] relative z-10 ${words.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:shadow-[0_0px_0_0_rgba(79,70,229,0.4)]'}`}
          >
            <Play size={24} className="fill-current" />
            Hemen Oyna
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (stage === 'score') {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-full max-w-lg rounded-[3rem] p-8 md:p-12 text-center border-b-[8px] border-amber-200"
        >
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-40 h-40 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] flex items-center justify-center mb-8 border-4 border-white shadow-[0_0_60px_rgba(245,158,11,0.6)] rotate-6"
          >
            <Trophy size={80} className="text-white drop-shadow-md" />
          </motion.div>
          
          <h2 className="text-5xl font-black mb-2 text-neutral-900 drop-shadow-sm">Oyun Bitti!</h2>
          <p className="text-indigo-600 font-bold mb-10 text-xl">Harika bir iş çıkardın, {student.name}!</p>
          
          <div className="flex bg-neutral-50 rounded-[2rem] p-8 mb-10 gap-6 justify-center border-b-[4px] border-neutral-200">
            <div className="text-center px-4 border-r-2 border-neutral-200">
              <div className="text-sm uppercase tracking-widest font-black text-neutral-500 mb-2">Doğru</div>
              <div className="text-5xl font-black text-emerald-600 drop-shadow-sm">{score}<span className="text-2xl text-neutral-400">/10</span></div>
            </div>
            <div className="text-center px-4">
              <div className="text-sm uppercase tracking-widest font-black text-neutral-500 mb-2">Puan</div>
              <div className="text-5xl font-black text-fuchsia-600 drop-shadow-sm">{score * 10}</div>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98, y: 2 }}
            onClick={onClose}
            className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 text-white font-black text-2xl py-5 rounded-[2rem] transition-all shadow-[0_8px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_0px_0_0_rgba(0,0,0,0.5)]"
          >
            Sıralamaya Dön
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentQIndex];
  
  const optionColors = [
    'bg-rose-500 border-rose-600 shadow-rose-700',
    'bg-blue-500 border-blue-600 shadow-blue-700',
    'bg-amber-500 border-amber-600 shadow-amber-700',
    'bg-emerald-500 border-emerald-600 shadow-emerald-700',
  ];

  return (
    <div className="fixed top-16 bottom-0 left-0 right-0 z-50 bg-neutral-100 flex flex-col p-3 md:p-4 overflow-y-auto">
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col py-2">
        <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
          <button onClick={onClose} className="p-3 bg-white rounded-xl shadow-sm hover:bg-neutral-50 text-neutral-500 border-b-2 border-neutral-200 active:border-b-0 active:translate-y-1 transition-all">
            <X size={24} strokeWidth={3} />
          </button>
          
          <div className="bg-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-black text-lg md:text-xl shadow-sm text-neutral-900 border-b-2 border-neutral-200">
            Soru {currentQIndex + 1} <span className="opacity-50 text-base">/ 10</span>
          </div>
          
          <div className={`px-4 md:px-8 py-2 md:py-3 rounded-xl font-black text-lg md:text-xl shadow-sm flex items-center gap-2 border-b-2 transition-colors ${
            timeLeft <= 5 && !isAnswered ? 'bg-rose-500 border-rose-600 text-white animate-pulse' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <Clock size={24} className={timeLeft <= 5 && !isAnswered ? 'animate-bounce' : ''} />
            {timeLeft}s
          </div>
        </div>

        <div key={currentQIndex} className="flex-1 flex flex-col justify-center max-w-3xl w-full mx-auto relative pb-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-4 md:p-8 text-center shadow-md relative mb-4 border-b-4 border-neutral-100"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 md:px-10 py-1.5 rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-lg">
              {currentWord?.type === 'es' ? 'EŞ ANLAMLISINI BUL' : 'ZIT ANLAMLISINI BUL'}
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black text-neutral-900 mt-2 drop-shadow-sm">
              {currentWord?.w}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((option, idx) => {
              const baseColor = optionColors[idx % optionColors.length];
              let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle';
              
              if (isAnswered) {
                if (option === currentWord.a) state = 'correct';
                else if (option === selectedOption) state = 'wrong';
              } else if (option === selectedOption) {
                state = 'selected';
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={!isAnswered ? { y: -2, scale: 1.01 } : {}}
                  whileTap={!isAnswered ? { y: 2, scale: 0.99 } : {}}
                  onClick={() => handleAnswer(option)}
                  disabled={isAnswered}
                  className={`min-h-[70px] md:min-h-[90px] p-4 rounded-xl font-black text-xl md:text-2xl transition-all duration-300 border-b-[6px] relative overflow-hidden flex items-center justify-center text-white drop-shadow-sm ${
                    state === 'correct' ? 'bg-emerald-500 border-emerald-600 shadow-emerald-700 scale-[1.02] z-10 brightness-110' :
                    state === 'wrong' ? 'bg-rose-500 border-rose-600 shadow-rose-700 opacity-90' :
                    state === 'selected' ? `${baseColor} ring-4 ring-white scale-[1.02] brightness-110` :
                    `${baseColor}`
                  } ${isAnswered && state === 'idle' ? 'opacity-40 scale-95 grayscale' : ''}`}
                >
                  <span className="relative z-10">{option}</span>
                  
                  <AnimatePresence>
                    {isAnswered && option === currentWord.a && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-emerald-500 rounded-full p-1.5 shadow-md z-20">
                        <CheckCircle2 size={24} className="fill-emerald-50" />
                      </motion.div>
                    )}
                    {isAnswered && option === selectedOption && option !== currentWord.a && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-rose-500 rounded-full p-1.5 shadow-md z-20">
                        <XCircle size={24} className="fill-rose-50" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
