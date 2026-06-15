import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Trophy, Play, Star, ChevronRight, CheckCircle2, 
  Settings, Clock, Target, Hash, RefreshCw, X, Shuffle, AlertCircle, Info, ListOrdered, Award, Trash2, ArrowRight
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { doc, updateDoc, increment, arrayUnion, collection, getDocs, addDoc, serverTimestamp, deleteDoc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface EsZitAnlamActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo?: () => void;
}

type Stage = 'config' | 'setup' | 'bracket' | 'playing' | 'finished';
type ContentType = 'es' | 'zit' | 'karisik';
type RaceMode = 'time' | 'target';

interface Match {
  id: string;
  round: number;
  player1: Student | null;
  player2: Student | null;
  winner: Student | null;
}

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

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateOptions = (correctAnswer: string, list: {w: string, a: string}[]) => {
  const options = new Set([correctAnswer]);
  
  // Try to get options from identical list
  const availableOptions = Array.from(new Set(list.map(item => item.a)));
  
  // If we don't have enough options in this list, we'll just use what we have
  // and then fill with some defaults if it's really empty, but usually the user adds enough.
  // Safety to avoid infinite loop
  let attempts = 0;
  while (options.size < Math.min(4, availableOptions.length) && attempts < 20) {
    const randomItem = availableOptions[Math.floor(Math.random() * availableOptions.length)];
    options.add(randomItem);
    attempts++;
  }
  
  // If still not enough, add from a broad pool of common words
  const fallbackWords = ["Okul", "Kitap", "Kalem", "Sınıf", "Öğrenci", "Ders", "Oyun", "Arkadaş"];
  attempts = 0;
  while (options.size < 4 && attempts < 20) {
    const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    options.add(randomWord);
    attempts++;
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
};

export const EsZitAnlamActivity: React.FC<EsZitAnlamActivityProps> = ({ onBack, students, user, onShowInfo }) => {
  // Config States
  const [jokerSettings, setJokerSettings] = useState<JokerSettings>(defaultJokerSettings);
  const [stage, setStage] = useState<Stage>('config');
  const [contentType, setContentType] = useState<ContentType>('karisik');
  const [raceMode, setRaceMode] = useState<RaceMode>('target');
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [targetScore, setTargetScore] = useState<number>(10);
  const [rewardType, setRewardType] = useState<string>('Türkçe Yıldızı');
  const [rewardAmount, setRewardAmount] = useState<number>(10);
  const [isRewardSettingsOpen, setIsRewardSettingsOpen] = useState(false);
  const [isWordManagerOpen, setIsWordManagerOpen] = useState(false);
  
  // Solo game ranking states
  const [showSoloRanking, setShowSoloRanking] = useState(false);
  const [soloScores, setSoloScores] = useState<any[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Word Lists Management
  const [zitAnlamlilar, setZitAnlamlilar] = useState(ZIT_ANLAMLILAR);
  const [esAnlamlilar, setEsAnlamlilar] = useState(ES_ANLAMLILAR);
  const [newWord, setNewWord] = useState({ w: '', a: '', type: 'es' });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Fetch word pairs from Firestore on mount
  useEffect(() => {
    if (!user) return;
    
    const wordsPath = `users/${user.uid}/esZitAnlamWords`;
    const wordsRef = collection(db, wordsPath);
    
    const unsubscribe = onSnapshot(wordsRef, (snap) => {
      const fetchedEs: any[] = [];
      const fetchedZit: any[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.type === 'es') fetchedEs.push({ w: data.w, a: data.a, id: d.id });
        else fetchedZit.push({ w: data.w, a: data.a, id: d.id });
      });
      
      setEsAnlamlilar([...ES_ANLAMLILAR.map(x => ({...x, type: 'es'})), ...fetchedEs]);
      setZitAnlamlilar([...ZIT_ANLAMLILAR.map(x => ({...x, type: 'zit'})), ...fetchedZit]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, wordsPath);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Fetch EsZit Ranking Data
  useEffect(() => {
    if (!user || (!showSoloRanking && soloScores.length === 0)) return;
    const path = `users/${user.uid}/activityScores`;
    
    const dbActivityId = 'es-zit-solo';
    
    const q = query(
      collection(db, path),
      where('activityId', '==', dbActivityId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const bestScores: { [studentId: string]: { studentId: string, studentName: string, totalScore: number, bestCorrectCount: number } } = {};
      
      allScores.forEach((scoreData: any) => {
        if (!bestScores[scoreData.studentId]) {
          bestScores[scoreData.studentId] = {
            studentId: scoreData.studentId,
            studentName: scoreData.studentName || 'Bilinmeyen Öğrenci',
            totalScore: scoreData.totalScore || 0,
            bestCorrectCount: scoreData.score || 0
          };
        } else {
          if ((scoreData.totalScore || 0) > bestScores[scoreData.studentId].totalScore) {
            bestScores[scoreData.studentId].totalScore = scoreData.totalScore || 0;
            bestScores[scoreData.studentId].bestCorrectCount = scoreData.score || 0;
          }
        }
      });

      const rankingArray = Object.values(bestScores).sort((a, b) => b.totalScore - a.totalScore);
      setSoloScores(rankingArray);
    }, (error) => {
      console.error("Error fetching activity ranking:", error);
    });

    return () => unsubscribe();
  }, [user, showSoloRanking]);

  const [isResetting, setIsResetting] = useState(false);

  const handleResetSoloGameScores = async () => {
    if (!user) return;
    setIsResetting(true);
    
    try {
      const path = `users/${user.uid}/activityScores`;
      const q = query(collection(db, path), where('activityId', '==', 'es-zit-solo'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setShowResetConfirm(false);
        setIsResetting(false);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
      setShowResetConfirm(false);
      setSoloScores([]); // Optimistic local clear
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/activityScores`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.w || !newWord.a || !user) return;
    setIsSyncing(true);
    
    const wordsPath = `users/${user.uid}/esZitAnlamWords`;
    try {
      const wordsRef = collection(db, wordsPath);
      const res = await addDoc(wordsRef, {
        w: newWord.w,
        a: newWord.a,
        type: newWord.type,
        createdAt: serverTimestamp()
      });
      
      const newPair = { w: newWord.w, a: newWord.a, id: res.id };
      if (newWord.type === 'es') setEsAnlamlilar(prev => [...prev, newPair]);
      else setZitAnlamlilar(prev => [...prev, newPair]);
      
      setNewWord({ w: '', a: '', type: 'es' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, wordsPath);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteWord = async (id: string, type: 'es' | 'zit') => {
    if (!user || !id) return;
    setIsSyncing(true);
    
    const deletePath = `users/${user.uid}/esZitAnlamWords/${id}`;
    try {
      await deleteDoc(doc(db, deletePath));
      if (type === 'es') setEsAnlamlilar(prev => prev.filter(w => w.id !== id));
      else setZitAnlamlilar(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, deletePath);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Setup States
  const [selectedStudents, setSelectedStudents] = useState<Student[]>(students);
  
  // Tournament States
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [winner, setWinner] = useState<Student | null>(null);
  
  // Gameplay States
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  
  const [p1Question, setP1Question] = useState<{word: string, answer: string, type: string} | null>(null);
  const [p1Options, setP1Options] = useState<string[]>([]);
  const [p1Waiting, setP1Waiting] = useState<boolean>(false);
  const [p1Feedback, setP1Feedback] = useState<'correct' | 'wrong' | null>(null);
  const [p1PenaltyTimeLeft, setP1PenaltyTimeLeft] = useState<number | null>(null);
  
  const [p2Question, setP2Question] = useState<{word: string, answer: string, type: string} | null>(null);
  const [p2Options, setP2Options] = useState<string[]>([]);
  const [p2Waiting, setP2Waiting] = useState<boolean>(false);
  const [p2Feedback, setP2Feedback] = useState<'correct' | 'wrong' | null>(null);
  const [p2PenaltyTimeLeft, setP2PenaltyTimeLeft] = useState<number | null>(null);

  const [matchOverMsg, setMatchOverMsg] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const matchOverRef = useRef<boolean>(false);
  const [rewardGiven, setRewardGiven] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);

  const getRoundName = (roundNum: number) => {
    const roundMatches = matches.filter(m => m.round === roundNum);
    if (roundMatches.length === 1) return "FİNAL";
    if (roundMatches.length === 2) return "YARI FİNAL";
    if (roundMatches.length > 2 && roundMatches.length <= 4) return "ÇEYREK FİNAL";
    return `TUR ${roundNum}`;
  };

  const handleBackToConfig = () => {
    setStage('config');
    setWinner(null);
    setRewardGiven(false);
  };

  const getQuestionContent = () => {
    let list = zitAnlamlilar;
    let type = 'Zıt Anlam';
    
    if (contentType === 'es') {
      list = esAnlamlilar;
      type = 'Eş Anlam';
    } else if (contentType === 'zit') {
      list = zitAnlamlilar;
      type = 'Zıt Anlam';
    } else {
      if (Math.random() > 0.5) {
        list = esAnlamlilar;
        type = 'Eş Anlam';
      } else {
        list = zitAnlamlilar;
        type = 'Zıt Anlam';
      }
    }
    
    if (list.length === 0) {
      // Fallback if list is empty
      list = contentType === 'es' ? ES_ANLAMLILAR : ZIT_ANLAMLILAR;
    }

    const randomQ = list[Math.floor(Math.random() * list.length)];
    return {
      question: { word: randomQ.w, answer: randomQ.a, type },
      options: generateOptions(randomQ.a, list)
    };
  };

  const initMatch = () => {
    const q1 = getQuestionContent();
    setP1Question(q1.question);
    setP1Options(q1.options);
    
    const q2 = getQuestionContent();
    setP2Question(q2.question);
    setP2Options(q2.options);
    
    setP1Score(0);
    setP2Score(0);
    setP1Waiting(false);
    setP2Waiting(false);
    
    setP1Feedback(null);
    setP2Feedback(null);
    setP1PenaltyTimeLeft(null);
    setP2PenaltyTimeLeft(null);
    setMatchOverMsg(null);
    matchOverRef.current = false;

    if (raceMode === 'time') {
      setTimeLeft(timeLimit);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const endMatch = (winnerId: string | 'draw') => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const activeMatch = matches[currentMatchIndex];
    if (!activeMatch) return;

    if (winnerId === 'draw') {
      // Tie breaker logic -> just advance first player for now or randomly
      declareMatchWinner(activeMatch.id, Math.random() > 0.5 ? activeMatch.player1! : activeMatch.player2!);
    } else {
      const winningStudent = winnerId === activeMatch.player1?.id ? activeMatch.player1 : activeMatch.player2;
      if (winningStudent) {
        declareMatchWinner(activeMatch.id, winningStudent);
      }
    }
  };

  useEffect(() => {
    if (stage === 'playing' && raceMode === 'time' && timeLeft === 0 && !matchOverRef.current) {
      matchOverRef.current = true;
      if (p1Score > p2Score) {
        setMatchOverMsg(`Süre Bitti! Kazanan: ${matches[currentMatchIndex]?.player1?.name}`);
        setTimeout(() => endMatch(matches[currentMatchIndex]?.player1?.id || ''), 2000);
      } else if (p2Score > p1Score) {
        setMatchOverMsg(`Süre Bitti! Kazanan: ${matches[currentMatchIndex]?.player2?.name}`);
        setTimeout(() => endMatch(matches[currentMatchIndex]?.player2?.id || ''), 2000);
      } else {
        setMatchOverMsg('Süre Bitti! Berabere! Kura çekiliyor...');
        setTimeout(() => {
          const activeMatch = matches[currentMatchIndex];
          const tiedPlayers = [activeMatch?.player1, activeMatch?.player2];
          const rndWinner = tiedPlayers[Math.floor(Math.random() * 2)];
          setMatchOverMsg(`Kura Çekildi! Kazanan: ${rndWinner?.name}`);
          setTimeout(() => endMatch(rndWinner?.id || ''), 2000);
        }, 2000);
      }
    }
  }, [timeLeft, stage, raceMode, p1Score, p2Score, currentMatchIndex, matches]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (stage === 'playing') {
      timer = setInterval(() => {
        setP1PenaltyTimeLeft(prev => {
          if (prev !== null && prev > 0) return prev - 1;
          return prev;
        });
        setP2PenaltyTimeLeft(prev => {
          if (prev !== null && prev > 0) return prev - 1;
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage]);

  const applyWrongAnswerPenalty = (wrongPlayer: 1 | 2) => {
    if (wrongPlayer === 1) {
      setP1Feedback('wrong');
      setTimeout(() => setP1Feedback(null), 1000);
      
      setP1Waiting(true);
      setP1PenaltyTimeLeft(null);
      
      setP2Waiting(false);
      setP2PenaltyTimeLeft(5); // Diğer öğrenciye 5sn cevap süresi
    } else {
      setP2Feedback('wrong');
      setTimeout(() => setP2Feedback(null), 1000);
      
      setP2Waiting(true);
      setP2PenaltyTimeLeft(null);
      
      setP1Waiting(false);
      setP1PenaltyTimeLeft(5); // Diğer öğrenciye 5sn cevap süresi
    }
  };

  useEffect(() => {
    if (stage !== 'playing' || matchOverRef.current) return;
    
    if (p1PenaltyTimeLeft === 0) {
      setP1PenaltyTimeLeft(null);
      applyWrongAnswerPenalty(1);
    }
    if (p2PenaltyTimeLeft === 0) {
      setP2PenaltyTimeLeft(null);
      applyWrongAnswerPenalty(2);
    }
  }, [p1PenaltyTimeLeft, p2PenaltyTimeLeft, stage]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAnswer = (player: 1 | 2, answer: string) => {
    if (matchOverRef.current || matchOverMsg) return;

    if (player === 1) {
      if (p1Feedback) return;
      if (p1Question?.answer === answer) {
        // Correct
        const newScore = p1Score + 1;
        setP1Score(newScore);
        setP1Feedback('correct');
        const q = getQuestionContent();
        setTimeout(() => {
          setP1Question(q.question);
          setP1Options(q.options);
          setP1Feedback(null);
        }, 800);

        // Resume normal game
        setP1PenaltyTimeLeft(null);
        setP2PenaltyTimeLeft(null);
        if (p2Waiting) {
          setP2Waiting(false);
          const q2 = getQuestionContent();
          setP2Question(q2.question);
          setP2Options(q2.options);
        }

        if (raceMode === 'target' && newScore >= targetScore) {
          matchOverRef.current = true;
          setMatchOverMsg(`Hedefe Ulaşıldı! Kazanan: ${matches[currentMatchIndex].player1?.name}`);
          setTimeout(() => endMatch(matches[currentMatchIndex].player1?.id || ''), 2000);
        }
      } else {
        // Wrong
        applyWrongAnswerPenalty(1);
      }
    } else {
      if (p2Feedback) return;
      if (p2Question?.answer === answer) {
        // Correct
        const newScore = p2Score + 1;
        setP2Score(newScore);
        setP2Feedback('correct');
        const q = getQuestionContent();
        setTimeout(() => {
          setP2Question(q.question);
          setP2Options(q.options);
          setP2Feedback(null);
        }, 800);

        // Resume normal game
        setP1PenaltyTimeLeft(null);
        setP2PenaltyTimeLeft(null);
        if (p1Waiting) {
          setP1Waiting(false);
          const q1 = getQuestionContent();
          setP1Question(q1.question);
          setP1Options(q1.options);
        }

        if (raceMode === 'target' && newScore >= targetScore) {
          matchOverRef.current = true;
          setMatchOverMsg(`Hedefe Ulaşıldı! Kazanan: ${matches[currentMatchIndex].player2?.name}`);
          setTimeout(() => endMatch(matches[currentMatchIndex].player2?.id || ''), 2000);
        }
      } else {
        // Wrong
        applyWrongAnswerPenalty(2);
      }
    }
  };

  const startMatchPlaying = () => {
    const activeMatch = matches[currentMatchIndex];
    if (activeMatch && activeMatch.player1 && activeMatch.player2) {
      setStage('playing');
      initMatch();
    } else if (activeMatch && activeMatch.player1 && !activeMatch.player2) {
      // Bye match
      declareMatchWinner(activeMatch.id, activeMatch.player1);
    }
  };


  // Setup helpers (Tournament Bracket)
  const toggleStudent = (s: Student) => {
    if (selectedStudents.find(x => x.id === s.id)) {
      setSelectedStudents(prev => prev.filter(x => x.id !== s.id));
    } else {
      setSelectedStudents(prev => [...prev, s]);
    }
  };

  const startTournament = () => {
    if (selectedStudents.length < 2) return;
    setRewardGiven(false);
    setWinner(null);
    const shuffled = shuffleArray([...selectedStudents]);
    const initialMatches: Match[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      initialMatches.push({
        id: `m-1-${i/2}`,
        round: 1,
        player1: shuffled[i],
        player2: i + 1 < shuffled.length ? shuffled[i + 1] : null,
        winner: i + 1 < shuffled.length ? null : shuffled[i]
      });
    }

    setMatches(initialMatches);
    setCurrentRound(1);
    
    // Auto-advance if we are on a setup state
    const firstPlayable = initialMatches.findIndex(m => !m.winner);
    if (firstPlayable !== -1) {
      setCurrentMatchIndex(firstPlayable);
      setStage('bracket');
    } else {
      advanceToNextRound(initialMatches);
    }
  };

  const advanceToNextRound = (currentMatches: Match[]) => {
    const roundMatches = currentMatches.filter(m => m.round === currentRound);
    let winners = roundMatches.map(m => m.winner).filter(Boolean) as Student[];

    if (winners.length === 1) {
      setWinner(winners[0]);
      setStage('finished');
      return;
    }
    
    // Rastgele eşleşme
    winners = shuffleArray([...winners]);

    const nextRound = currentRound + 1;
    const newMatches: Match[] = [...currentMatches];

    for (let i = 0; i < winners.length; i += 2) {
      newMatches.push({
        id: `m-${nextRound}-${i/2}`,
        round: nextRound,
        player1: winners[i],
        player2: i + 1 < winners.length ? winners[i + 1] : null,
        winner: i + 1 < winners.length ? null : winners[i]
      });
    }

    setMatches(newMatches);
    setCurrentRound(nextRound);
    
    const firstPlayable = newMatches.findIndex(m => m.round === nextRound && !m.winner);
    if (firstPlayable !== -1) {
      setCurrentMatchIndex(firstPlayable);
      setStage('bracket');
    } else {
      advanceToNextRound(newMatches);
    }
  };

  const declareMatchWinner = (matchId: string, winningStudent: Student) => {
    const updatedMatches = matches.map(m => 
      m.id === matchId ? { ...m, winner: winningStudent } : m
    );
    setMatches(updatedMatches);

    const nextMatchObj = updatedMatches.find(m => m.round === currentRound && !m.winner);
    if (nextMatchObj) {
      setCurrentMatchIndex(updatedMatches.indexOf(nextMatchObj));
      setStage('bracket');
    } else {
      advanceToNextRound(updatedMatches);
    }
  };

  const awardStarToWinner = async () => {
    if (!winner || !user || rewardGiven) return;
    setIsAwarding(true);

    const studentPath = `users/${user.uid}/students/${winner.id}`;
    const activityPath = `users/${user.uid}/students/${winner.id}/activities`;
    try {
      const studentRef = doc(db, studentPath);
      
      // 1. Create activity record
      try {
        await addDoc(collection(db, activityPath), {
          title: 'Eş/Zıt Anlam Turnuvası', 
          description: 'Turnuva Şampiyonu Ödülü!', 
          rewardCategory: rewardType, 
          rewardAmount, 
          createdAt: serverTimestamp(), 
          type: 'tournament'
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, activityPath);
      }

      // 2. Update student profile
      try {
        await updateDoc(studentRef, {
          stars: increment(rewardAmount),
          starHistory: arrayUnion({
            category: rewardType,
            description: `Eş / Zıt Anlam turnuvası birinciliği`,
            amount: rewardAmount,
            timestamp: Date.now()
          }),
          starAwards: arrayUnion({
            category: rewardType,
            amount: rewardAmount,
            timestamp: Date.now()
          })
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, studentPath);
      }

      setRewardGiven(true);
    } catch (error) {
      console.error("General Reward error:", error);
    } finally {
      setIsAwarding(false);
    }
  };


  if (stage === 'config') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black p-4 md:p-8 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-fuchsia-500/10 dark:bg-fuchsia-500/5 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="absolute -bottom-24 left-1/4 w-64 h-64 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', 
              backgroundSize: '40px 40px' 
            }} 
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack} 
                className="group flex items-center gap-2 px-6 py-4 bg-white dark:bg-neutral-900 rounded-[2rem] border-2 border-neutral-100 dark:border-neutral-800 shadow-lg hover:border-rose-500 dark:hover:border-rose-500 transition-all active:scale-95"
              >
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </div>
                <span className="font-black uppercase text-sm tracking-widest dark:text-white group-hover:text-rose-600 transition-colors">Ekrana Dön</span>
              </button>
            </div>

            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center"
            >
               <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 px-8 py-4 rounded-[2.5rem] border-4 border-indigo-500 shadow-[0_15px_40px_rgba(99,102,241,0.3)] rotate-1">
                  <div className="p-3 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-2xl shadow-lg -rotate-6">
                     <Hash size={32} strokeWidth={3} />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter dark:text-white italic">
                      KELİME <span className="text-indigo-500 text-4xl">AVCISI</span>
                    </h1>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] ml-1">Zıt ve Eş Anlamlılar</span>
                  </div>
               </div>
            </motion.div>

            <div className="flex items-center gap-3">
              {onShowInfo && (
                <button 
                  onClick={onShowInfo} 
                  className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 shadow-sm hover:scale-105 active:scale-95 transition-all text-neutral-500 hover:text-indigo-500"
                >
                  <Info size={24} />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-2 border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 gap-4">
              <h3 className="text-xl font-black uppercase flex items-center gap-3 dark:text-white shrink-0">
                <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Settings size={22} strokeWidth={2.5} />
                </div>
                Oyun Ayarları
              </h3>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setShowSoloRanking(!showSoloRanking)}
                  className={`text-sm px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${showSoloRanking ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 hover:bg-emerald-100'}`}
                >
                  <ListOrdered size={18} /> Sıralama
                </button>
                <button 
                  onClick={() => setIsWordManagerOpen(!isWordManagerOpen)}
                  className={`text-sm px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${isWordManagerOpen ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 hover:bg-indigo-100'}`}
                >
                  <RefreshCw size={18} /> Kelimeler
                </button>
                <button 
                  onClick={() => setIsRewardSettingsOpen(!isRewardSettingsOpen)}
                  className={`text-sm px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${isRewardSettingsOpen ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 hover:bg-amber-100'}`}
                >
                  <Star size={18} className="fill-current" /> Ödül
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isWordManagerOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border-4 border-dashed border-indigo-200 dark:border-indigo-800/30 p-8 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xl font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-3">
                        <RefreshCw size={24} className="animate-spin-slow" /> Kelime Çifti Ekle
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Kelime</label>
                         <input 
                           placeholder="Örn: Siyah"
                           value={newWord.w}
                           onChange={e => setNewWord(prev => ({ ...prev, w: e.target.value }))}
                           className="w-full bg-white dark:bg-neutral-900 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 font-bold text-neutral-800 dark:text-white outline-none focus:border-indigo-500 shadow-sm"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Anlamı</label>
                         <input 
                           placeholder="Örn: Beyaz"
                           value={newWord.a}
                           onChange={e => setNewWord(prev => ({ ...prev, a: e.target.value }))}
                           className="w-full bg-white dark:bg-neutral-900 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 font-bold text-neutral-800 dark:text-white outline-none focus:border-indigo-500 shadow-sm"
                         />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Tür</label>
                        <select 
                          value={newWord.type}
                          onChange={e => setNewWord(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full bg-white dark:bg-neutral-900 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 font-bold text-neutral-800 dark:text-white outline-none focus:border-indigo-500 shadow-sm"
                        >
                          <option value="es">Eş Anlam</option>
                          <option value="zit">Zıt Anlam</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={handleAddWord}
                          disabled={isSyncing || !newWord.w || !newWord.a}
                          className="w-full bg-indigo-600 text-white rounded-2xl font-black py-4 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
                        >
                          {isSyncing ? 'EKLENİYOR...' : 'YENİ EKLE'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white/50 dark:bg-neutral-800/50 p-6 rounded-3xl border-2 border-indigo-50 dark:border-indigo-900/30">
                        <h5 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                          Eş Anlamlılar <span>{esAnlamlilar.length}</span>
                        </h5>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {esAnlamlilar.map((pair) => (
                            <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={pair.id || `es-${pair.w}-${pair.a}`} className="flex items-center justify-between bg-white dark:bg-neutral-900 p-3 px-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">{pair.w} <ArrowRight size={14} className="inline mx-2 opacity-30" /> {pair.a}</span>
                              {pair.id && (
                                <button onClick={() => handleDeleteWord(pair.id, 'es')} disabled={isSyncing} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-neutral-800/50 p-6 rounded-3xl border-2 border-amber-50 dark:border-amber-900/30">
                        <h5 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                          Zıt Anlamlılar <span>{zitAnlamlilar.length}</span>
                        </h5>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {zitAnlamlilar.map((pair) => (
                            <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={pair.id || `zit-${pair.w}-${pair.a}`} className="flex items-center justify-between bg-white dark:bg-neutral-900 p-3 px-4 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm">
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">{pair.w} <ArrowRight size={14} className="inline mx-2 opacity-30" /> {pair.a}</span>
                              {pair.id && (
                                <button onClick={() => handleDeleteWord(pair.id, 'zit')} disabled={isSyncing} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isRewardSettingsOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 border-4 border-dashed border-amber-200 dark:border-amber-900/30 p-8 rounded-[2rem] grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest ml-2">Ödül Türü</label>
                      <select 
                        value={rewardType} 
                        onChange={(e) => setRewardType(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 font-black transition-all outline-none focus:ring-4 focus:ring-amber-500/20"
                      >
                         <option value="Türkçe Yıldızı">Türkçe Yıldızı</option>
                         <option value="Öğretmen Özel Ödülü Yıldızı">Özel Ödül Yıldızı</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest ml-2">Ödül Sahası (Yıldız Sayısı)</label>
                       <div className="flex bg-white dark:bg-neutral-900 rounded-2xl border-2 border-amber-200 dark:border-amber-800 overflow-hidden shadow-sm">
                         <button onClick={() => setRewardAmount(Math.max(1, rewardAmount - 1))} className="flex-1 py-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-black text-xl border-r-2 border-amber-200 dark:border-amber-800 transition-colors">-</button>
                         <div className="flex-[2] flex items-center justify-center font-black text-2xl text-amber-600">{rewardAmount}</div>
                         <button onClick={() => setRewardAmount(rewardAmount + 1)} className="flex-1 py-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-black text-xl border-l-2 border-amber-200 dark:border-amber-800 transition-colors">+</button>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSoloRanking && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border-4 border-dashed border-emerald-200 dark:border-emerald-900/30 p-8 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                        <ListOrdered size={24} /> Arena Liderlik Tablosu
                      </h4>
                      
                      {soloScores.length > 0 && (
                        <div className="flex items-center gap-2">
                          {showResetConfirm ? (
                            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 p-2 rounded-2xl border-2 border-red-200 shadow-sm">
                              <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter ml-2">Emin misiniz?</span>
                              <button onClick={handleResetSoloGameScores} disabled={isResetting} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-red-700 transition-all">Evet</button>
                              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-xs uppercase hover:bg-neutral-200 transition-all">Hayır</button>
                            </div>
                          ) : (
                            <button onClick={() => setShowResetConfirm(true)} className="px-5 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase transition-all hover:bg-red-500 hover:text-white border-2 border-red-100">SIFIRLA</button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {soloScores.length === 0 ? (
                      <div className="bg-white/50 dark:bg-neutral-800/50 rounded-2xl p-10 text-center text-emerald-600/50 flex flex-col items-center gap-4 border-2 border-dashed border-emerald-100">
                        <Trophy size={48} className="opacity-20 translate-y-2" />
                        <p className="font-black text-lg uppercase tracking-tight">Arena henüz boş, ilk kahramanını bekliyor!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {soloScores.map((score, idx) => (
                          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }} key={score.studentId} className={`flex items-center justify-between p-5 rounded-2xl shadow-sm border-2 ${idx === 0 ? 'bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 border-amber-300' : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-inner ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-neutral-300 text-neutral-600' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-black text-neutral-800 dark:text-neutral-100 uppercase text-sm tracking-tight">{score.studentName}</div>
                                <div className="text-[10px] font-bold text-emerald-600 uppercase">Arena Ustası</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-neutral-800 dark:text-neutral-200">{Math.round(score.totalScore)}</div>
                              <div className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">PUAN</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Soru İçeriği */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black">1</div>
                   <h4 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Soru İçeriği</h4>
                </div>
                <div className="grid gap-4">
                  {[
                    { id: 'es', label: 'Eş Anlamlılar', icon: RefreshCw, desc: 'Kelime anlamdaşlarını eşleştir.', color: 'fuchsia' },
                    { id: 'zit', label: 'Zıt Anlamlılar', icon: Shuffle, desc: 'Zıt kavramları bul ve seç.', color: 'amber' },
                    { id: 'karisik', label: 'Karışık Arena', icon: Hash, desc: 'Hem eş hem zıt anlamlılar!', color: 'indigo' }
                  ].map(opt => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={opt.id}
                      onClick={() => setContentType(opt.id as ContentType)}
                      className={`relative w-full group overflow-hidden p-6 rounded-[1.5rem] border-[4px] transition-all text-left ${
                        contentType === opt.id 
                        ? `border-${opt.color}-500 bg-${opt.color}-50/50 dark:bg-${opt.color}-900/30` 
                        : 'border-neutral-100 dark:border-neutral-800 hover:border-indigo-200 bg-white dark:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-5 relative z-10">
                        <div className={`p-4 rounded-2xl ${contentType === opt.id ? `bg-${opt.color}-500 text-white` : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'} transition-all`}>
                          <opt.icon size={28} />
                        </div>
                        <div className="flex-1">
                          <span className={`block font-black text-lg uppercase leading-tight ${contentType === opt.id ? `text-${opt.color}-700 dark:text-${opt.color}-300` : 'text-neutral-800 dark:text-neutral-200'}`}>
                            {opt.label}
                          </span>
                          <span className="block text-xs font-medium text-neutral-500 mt-1">{opt.desc}</span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Yarış Modu */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black">2</div>
                   <h4 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Yarış Modu</h4>
                </div>
                <div className="grid gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRaceMode('time')}
                    className={`relative w-full p-6 rounded-[1.5rem] border-[4px] transition-all text-left ${
                      raceMode === 'time' ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/30' : 'border-neutral-100 dark:border-neutral-800 hover:border-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${raceMode === 'time' ? 'bg-sky-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                        <Clock size={28} />
                      </div>
                      <div className="flex-1">
                         <span className={`block font-black text-lg uppercase leading-tight ${raceMode === 'time' ? 'text-sky-700 dark:text-sky-300' : 'text-neutral-800 dark:text-neutral-200'}`}>Hızlı Olan Kazanır</span>
                         <span className="block text-xs font-medium text-neutral-500 mt-1">Süre dolmadan en çok doğruyu yap!</span>
                      </div>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRaceMode('target')}
                    className={`relative w-full p-6 rounded-[1.5rem] border-[4px] transition-all text-left ${
                      raceMode === 'target' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/30' : 'border-neutral-100 dark:border-neutral-800 hover:border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${raceMode === 'target' ? 'bg-amber-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                        <Target size={28} />
                      </div>
                      <div className="flex-1">
                         <span className={`block font-black text-lg uppercase leading-tight ${raceMode === 'target' ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-800 dark:text-neutral-200'}`}>Hedefe İlk Ulaşan</span>
                         <span className="block text-xs font-medium text-neutral-500 mt-1">Belirlenen doğru sayısına ilk ulaşan kapar.</span>
                      </div>
                    </div>
                  </motion.button>
                </div>

                {/* Alt Ayarlar */}
                <AnimatePresence mode="wait">
                  {raceMode === 'time' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="pt-2">
                       <div className="bg-sky-100/50 dark:bg-sky-900/20 p-5 rounded-[1.5rem] border-2 border-sky-200">
                          <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-3 text-center">⏰ Kapışma Süresi</p>
                          <div className="flex gap-2">
                            {[30, 60, 120].map(s => (
                              <button key={s} onClick={() => setTimeLimit(s)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${timeLimit === s ? 'bg-sky-500 text-white border-sky-600 shadow-md scale-105' : 'bg-white text-sky-400 border-sky-100 shadow-sm'}`}>
                                {s} SN
                              </button>
                            ))}
                          </div>
                       </div>
                    </motion.div>
                  )}
                  {raceMode === 'target' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="pt-2">
                       <div className="bg-amber-100/50 dark:bg-amber-900/20 p-5 rounded-[1.5rem] border-2 border-amber-200">
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 text-center">🎯 Hedef Doğru Sayısı</p>
                          <div className="flex gap-2">
                            {[5, 10, 20].map(t => (
                              <button key={t} onClick={() => setTargetScore(t)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${targetScore === t ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105' : 'bg-white text-amber-400 border-amber-100 shadow-sm'}`}>
                                {t} SORU
                              </button>
                            ))}
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStage('setup')}
                className="group relative px-20 py-6 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[2rem] font-black text-2xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(79,70,229,0.3)] overflow-hidden"
              >
                <div className="relative z-10 flex items-center gap-4">
                  <span>DEVAM ET</span>
                  <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />
                </div>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'setup') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={handleBackToConfig} className="p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Turnuva Katılımcıları</h2>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-[1.5rem] border border-neutral-100 dark:border-neutral-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Turnuvaya katılacak öğrencileri seçin. Minimum 2 öğrenci gereklidir.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedStudents(students)}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                Tümünü Seç
              </button>
              <button
                onClick={() => setSelectedStudents([])}
                className="px-3 py-1.5 text-xs font-bold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Temizle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
            {students.map(student => {
              const isSelected = selectedStudents.some(s => s.id === student.id);
              return (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student)}
                  className={`relative p-2 rounded-xl border flex items-center text-left transition-all ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {student.name ? student.name.substring(0, 2).toUpperCase() : '?'}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-bold text-neutral-800 dark:text-white text-xs truncate">{student.name}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 text-indigo-600 dark:text-indigo-400 rounded-full bg-white dark:bg-neutral-900">
                      <CheckCircle2 size={12} className="fill-current" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={startTournament}
            disabled={selectedStudents.length < 2}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl py-3 text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Trophy size={16} />
            TURNUVAYI BAŞLAT ({selectedStudents.length} KİŞİ)
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'bracket') {
    const activeMatch = matches[currentMatchIndex];
    if (!activeMatch) return null;

    return (
      <div className="fixed inset-0 z-[150] bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-lg w-full text-center shadow-xl border border-neutral-200 dark:border-neutral-800">
          <div className="text-indigo-500 font-black tracking-widest text-sm mb-2 uppercase">{getRoundName(currentRound)}</div>
          <h2 className="text-3xl font-black text-neutral-800 dark:text-white mb-8">Sıradaki Eşleşme</h2>
          
          <div className="flex items-center justify-center gap-6 mb-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border-4 border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-3xl font-black text-indigo-700 dark:text-indigo-400">
                {activeMatch.player1?.name.substring(0, 1)}
              </div>
              <div className="font-bold text-lg text-neutral-800 dark:text-white">{activeMatch.player1?.name}</div>
            </div>
            
            <div className="text-4xl font-black text-neutral-300 dark:text-neutral-700">VS</div>
            
            {activeMatch.player2 ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-rose-100 dark:bg-rose-900/30 border-4 border-rose-200 dark:border-rose-800 flex items-center justify-center text-3xl font-black text-rose-700 dark:text-rose-400">
                  {activeMatch.player2.name.substring(0, 1)}
                </div>
                <div className="font-bold text-lg text-neutral-800 dark:text-white">{activeMatch.player2.name}</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 border-4 border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-3xl font-black text-neutral-400">
                  -
                </div>
                <div className="font-bold text-lg text-neutral-500">Bay (Otomatik Tur)</div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {!activeMatch.player2 ? (
              <button
                onClick={startMatchPlaying}
                className="w-full bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 font-bold text-lg p-4 rounded-xl hover:opacity-90 transition-opacity"
              >
                İLERLE
              </button>
            ) : (
              <button
                onClick={startMatchPlaying}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl p-4 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                <Play className="fill-current" size={24} />
                ÖĞRENCİLER HAZIR - BAŞLA
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'playing') {
    const activeMatch = matches[currentMatchIndex];
    if (!activeMatch || !activeMatch.player1 || !activeMatch.player2) return null;

    return (
      <div className="fixed inset-0 z-[150] bg-neutral-100 dark:bg-neutral-950 flex flex-col p-4 w-full h-full overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-neutral-900 rounded-[2rem] shadow-sm shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={handleBackToConfig} className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 transition-colors">
              <X size={20} className="stroke-[3]" />
            </button>
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                {getRoundName(currentRound)}
              </div>
              <div className="font-black text-xl text-neutral-800 dark:text-white">
                {activeMatch.player1.name.split(' ')[0]} vs {activeMatch.player2.name.split(' ')[0]}
              </div>
            </div>
          </div>

          {/* Center Info (Time or Target) */}
          <div className="flex items-center justify-center px-8 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-full border-2 border-neutral-100 dark:border-neutral-700">
            {raceMode === 'time' ? (
              <div className="flex items-center gap-3">
                <Clock className={timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-neutral-500'} size={24} />
                <span className={`font-black text-3xl tabular-nums ${timeLeft <= 10 ? 'text-rose-500' : 'text-neutral-800 dark:text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-neutral-800 dark:text-white">
                <Target className="text-amber-500" size={24} />
                <span className="font-black text-2xl">Hedef: {targetScore}</span>
              </div>
            )}
          </div>

          <div className="text-right text-sm font-bold text-indigo-500 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
            Maç {currentMatchIndex + 1} / {matches.filter(m => m.round === currentRound).length}
          </div>
        </div>

        {/* Dual Screen Area */}
        <div className="flex-1 flex gap-4 mt-4 relative min-h-0">
          
          {/* PLAYER 1 SIDE (LEFT) */}
          <div className="flex-1 bg-white dark:bg-neutral-900 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-8 border-4 border-fuchsia-100 dark:border-fuchsia-900/30">
            <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 opacity-50" />
            
            {/* Player Info P1 */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-fuchsia-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-md">
                  {activeMatch.player1.name.substring(0,1)}
                </div>
                <div>
                  <div className="font-bold text-sm text-fuchsia-600/80 uppercase tracking-widest mb-0.5">Yarışmacı 1</div>
                  <div className="font-black text-2xl text-neutral-800 dark:text-white leading-none truncate max-w-[200px]">{activeMatch.player1.name.split(' ')[0]}</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-fuchsia-500 uppercase">Skor</div>
                <div className="text-4xl font-black text-fuchsia-600 leading-none">{p1Score}</div>
              </div>
            </div>

            {/* Waiting State P1 */}
            {p1Waiting ? (
              <div className="flex flex-col items-center justify-center text-center animate-pulse">
                <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle size={48} className="stroke-[2.5]" />
                </div>
                <h3 className="text-2xl font-black text-neutral-800 dark:text-white mb-2">Yanlış Cevap!</h3>
                <p className="text-neutral-500 font-medium">Rakibinin cevap vermesini bekliyorsun...</p>
              </div>
            ) : p1Question ? (
              <div className="w-full max-w-sm mt-16 relative">
                 {p1PenaltyTimeLeft !== null && p1PenaltyTimeLeft > 0 && (
                   <div className="absolute -top-12 inset-x-0 flex justify-center z-10 animate-bounce">
                      <div className="bg-rose-500 text-white font-black px-4 py-2 rounded-full text-lg shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-2">
                         <Clock size={20} /> {p1PenaltyTimeLeft} SN
                      </div>
                   </div>
                 )}
                 <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">
                      {p1Question.type}ini Bul
                    </div>
                    <h2 className="text-5xl lg:text-6xl font-black text-neutral-900 dark:text-white tracking-tight break-all">
                      {p1Question.word}
                    </h2>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   {p1Options.map((opt) => (
                     <motion.button
                       key={`p1-opt-${opt}`}
                       whileTap={{ scale: 0.95 }}
                       onClick={() => handleAnswer(1, opt)}
                       className="aspect-video bg-neutral-50 hover:bg-fuchsia-50 dark:bg-neutral-800 dark:hover:bg-fuchsia-900/30 border-2 border-neutral-200 hover:border-fuchsia-500 dark:border-neutral-700 dark:hover:border-fuchsia-500 rounded-2xl flex items-center justify-center p-4 text-xl lg:text-2xl font-bold text-neutral-800 dark:text-white transition-all focus:outline-none"
                     >
                       {opt}
                     </motion.button>
                   ))}
                 </div>
              </div>
            ) : null}

            {/* Feedback effect */}
            <AnimatePresence>
              {p1Feedback && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className={`absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm`}
                >
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white ${p1Feedback === 'correct' ? 'bg-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_100px_rgba(244,63,94,0.5)]'}`}>
                    {p1Feedback === 'correct' ? <CheckCircle2 size={64} /> : <X size={64} className="stroke-[3]" />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* VS Divider Overlay */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center font-black text-2xl shadow-xl border-4 border-neutral-100 dark:border-neutral-950">
              VS
            </div>
          </div>

          {/* PLAYER 2 SIDE (RIGHT) */}
          <div className="flex-1 bg-white dark:bg-neutral-900 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-8 border-4 border-sky-100 dark:border-sky-900/30">
            <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-sky-400 to-sky-500 opacity-50" />

            {/* Player Info P2 */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center bg-sky-50 dark:bg-sky-900/20 p-4 rounded-2xl flex-row-reverse">
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-md">
                  {activeMatch.player2.name.substring(0,1)}
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-sky-600/80 uppercase tracking-widest mb-0.5">Yarışmacı 2</div>
                  <div className="font-black text-2xl text-neutral-800 dark:text-white leading-none truncate max-w-[200px]">{activeMatch.player2.name.split(' ')[0]}</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-sky-500 uppercase">Skor</div>
                <div className="text-4xl font-black text-sky-600 leading-none">{p2Score}</div>
              </div>
            </div>

            {/* Waiting State P2 */}
            {p2Waiting ? (
              <div className="flex flex-col items-center justify-center text-center animate-pulse">
                <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle size={48} className="stroke-[2.5]" />
                </div>
                <h3 className="text-2xl font-black text-neutral-800 dark:text-white mb-2">Yanlış Cevap!</h3>
                <p className="text-neutral-500 font-medium">Rakibinin cevap vermesini bekliyorsun...</p>
              </div>
            ) : p2Question ? (
              <div className="w-full max-w-sm mt-16 relative">
                 {p2PenaltyTimeLeft !== null && p2PenaltyTimeLeft > 0 && (
                   <div className="absolute -top-12 inset-x-0 flex justify-center z-10 animate-bounce">
                      <div className="bg-rose-500 text-white font-black px-4 py-2 rounded-full text-lg shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-2">
                         <Clock size={20} /> {p2PenaltyTimeLeft} SN
                      </div>
                   </div>
                 )}
                 <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">
                      {p2Question.type}ini Bul
                    </div>
                    <h2 className="text-5xl lg:text-6xl font-black text-neutral-900 dark:text-white tracking-tight break-all">
                      {p2Question.word}
                    </h2>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   {p2Options.map((opt) => (
                     <motion.button
                       key={`p2-opt-${opt}`}
                       whileTap={{ scale: 0.95 }}
                       onClick={() => handleAnswer(2, opt)}
                       className="aspect-video bg-neutral-50 hover:bg-sky-50 dark:bg-neutral-800 dark:hover:bg-sky-900/30 border-2 border-neutral-200 hover:border-sky-500 dark:border-neutral-700 dark:hover:border-sky-500 rounded-2xl flex items-center justify-center p-4 text-xl lg:text-2xl font-bold text-neutral-800 dark:text-white transition-all focus:outline-none"
                     >
                       {opt}
                     </motion.button>
                   ))}
                 </div>
              </div>
            ) : null}

            {/* Feedback effect */}
            <AnimatePresence>
              {p2Feedback && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className={`absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm`}
                >
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white ${p2Feedback === 'correct' ? 'bg-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_100px_rgba(244,63,94,0.5)]'}`}>
                    {p2Feedback === 'correct' ? <CheckCircle2 size={64} /> : <X size={64} className="stroke-[3]" />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Match Over Modal Overlay */}
        <AnimatePresence>
          {matchOverMsg && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-[2rem] p-10 max-w-md w-full text-center"
              >
                <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full mx-auto flex items-center justify-center mb-6">
                  <Trophy size={48} className="stroke-[2]" />
                </div>
                <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">{matchOverMsg}</h3>
                <p className="text-neutral-500">Sıradaki maça geçiliyor...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  if (stage === 'finished' && winner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={handleBackToConfig} className="p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Turnuva Sonucu</h2>
          </div>
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white dark:bg-neutral-900 rounded-[3rem] p-12 lg:p-20 border border-neutral-100 dark:border-neutral-800 text-center relative overflow-hidden shadow-2xl shadow-indigo-100/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-white dark:from-indigo-900/20 dark:via-neutral-900 dark:to-neutral-900 rounded-[3rem]" />
          <div className="relative z-10">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-6xl shadow-2xl shadow-indigo-200 dark:shadow-none mb-8 border-4 border-white">
              👑
            </div>
            <h3 className="text-indigo-500 font-black text-xl uppercase tracking-widest mb-2">KELİME ŞAMPİYONU</h3>
            <h1 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white mb-2">{winner.name}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8 max-w-sm mx-auto">Harika bir performans sergileyerek Eş ve Zıt Anlamlılar turnuvasının kazananı oldu!</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
              <button disabled={rewardGiven || isAwarding} onClick={awardStarToWinner} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl py-4 px-6 font-bold shadow-lg shadow-amber-200 dark:shadow-none hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                {isAwarding ? <RefreshCw className="animate-spin" size={20} /> : rewardGiven ? <CheckCircle2 size={20} /> : <Star size={20} className="fill-current" />}
                {rewardGiven ? "YILDIZ VERİLDİ" : `${rewardAmount} ${rewardType.toUpperCase()} YILDIZI VER`}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};
