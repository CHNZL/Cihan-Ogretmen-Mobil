import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Swords, CheckCircle2, User, HelpCircle, Shuffle, AlertCircle, Edit3, Settings, Minus } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Match, Tournament, Student, generateElemeFixture } from '../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TournamentFixtureScreenProps {
  tournament: Tournament;
  students: Student[];
  onClose: () => void;
  user: any;
}

export const TournamentFixtureScreen: React.FC<TournamentFixtureScreenProps> = ({
  tournament,
  students,
  onClose,
  user
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [scores, setScores] = useState<{ [key: string]: { s1: string, s2: string } }>({});
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedLeg, setSelectedLeg] = useState<'first' | 'second'>('first');
  const [selectedGroup, setSelectedGroup] = useState<string>('G1');
  const [activeStage, setActiveStage] = useState<'group' | 'knockout'>(tournament.currentStage || 'group');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const getRoundName = (round: number, matches: Match[], totalRounds: number) => {
    const isKnockout = (tournament.type === 'Eleme') || (tournament.type === 'Grup+Eleme' && activeStage === 'knockout');
    
    if (isKnockout) {
      const roundMatches = matches.filter(m => m.round === round);
      const pairCodes = new Set(roundMatches.map(m => m.pairCode || m.matchCode));
      const pairCount = pairCodes.size;
      
      if (pairCount === 1) return 'Final';
      if (pairCount === 2) return 'Yarı Final';
      if (pairCount === 4) return 'Çeyrek Final';
      if (pairCount === 8) return 'Son 16';
      if (pairCount === 16) return 'Son 32';
      return `${round}. Tur`;
    }

    return `${round}. Hafta`;
  };

  useEffect(() => {
    if (tournament.currentStage) {
      setActiveStage(tournament.currentStage);
    }
  }, [tournament.currentStage]);

  useEffect(() => {
    if ((tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') && (tournament.pointsWin === undefined || tournament.pointsWin === null)) {
      setShowPointsModal(true);
    }
  }, [tournament]);

  const handleSavePoints = async (win: number, draw: number, loss: number) => {
    if (!user) return;
    try {
      const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournament.id);
      await updateDoc(tournamentRef, {
        pointsWin: win,
        pointsDraw: draw,
        pointsLoss: loss,
        updatedAt: serverTimestamp()
      });
      setShowPointsModal(false);
    } catch (error) {
      console.error('Error saving points:', error);
    }
  };

  const filteredMatches = useMemo(() => {
    if (tournament.type === 'Grup+Eleme' && activeStage === 'knockout') {
      return matches.filter(m => m.stage === 'knockout');
    }
    if (tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') {
      return matches.filter(m => m.groupId === selectedGroup && m.stage !== 'knockout');
    }
    return matches;
  }, [matches, tournament.type, selectedGroup, activeStage]);

  const rounds = useMemo(() => {
    const r = Array.from(new Set(filteredMatches.map(m => m.round))).sort((a: number, b: number) => a - b);
    if (r.length > 0 && !r.includes(selectedRound)) {
      setSelectedRound(r[r.length - 1]);
    }
    return r;
  }, [filteredMatches, selectedRound]);

  useEffect(() => {
    if (!user || !tournament.id) return;

    const matchesRef = collection(db, `users/${user.uid}/tournaments/${tournament.id}/matches`);
    const q = query(matchesRef, orderBy('round', 'asc'), orderBy('matchCode', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      setMatches(matchesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, tournament.id]);

  const getPairWinner = (pairCode: string, matches: Match[]) => {
    const pairMatches = matches.filter(m => m.pairCode === pairCode || m.matchCode === pairCode);
    if (pairMatches.length === 0) return null;

    // If it's a single match (not double match mode)
    if (pairMatches.length === 1 && !pairMatches[0].isDoubleMatch) {
      return pairMatches[0].status === 'completed' ? pairMatches[0].winnerId : null;
    }

    // Double match logic
    const m1 = pairMatches.find(m => m.matchCode === `${pairCode}-1`);
    const m2 = pairMatches.find(m => m.matchCode === `${pairCode}-2`);
    const m3 = pairMatches.find(m => m.isTieBreaker && m.pairCode === pairCode);

    // If tie-breaker exists and is completed, it's the final answer
    if (m3 && m3.status === 'completed') return m3.winnerId;

    // If both matches are completed, check for overall winner
    if (m1?.status === 'completed' && m2?.status === 'completed') {
      const p1Id = m1.player1Id;
      const p2Id = m1.player2Id;

      if (tournament.winnerSelectionMethod === 'score') {
        const p1Total = (m1.score1 || 0) + (m2.score2 || 0);
        const p2Total = (m1.score2 || 0) + (m2.score1 || 0);
        if (p1Total > p2Total) return p1Id;
        if (p2Total > p1Total) return p2Id;
      } else {
        let p1Wins = 0;
        let p2Wins = 0;
        if (m1.winnerId === p1Id) p1Wins++; else if (m1.winnerId === p2Id) p2Wins++;
        if (m2.winnerId === p1Id) p1Wins++; else if (m2.winnerId === p2Id) p2Wins++;
        if (p1Wins > p2Wins) return p1Id;
        if (p2Wins > p1Wins) return p2Id;
      }
    }

    return null;
  };

  const advancersByRound = useMemo(() => {
    const advancers: { [key: number]: { id: string, type: 'winner' | 'bye' }[] } = {};
    const allParticipants = (tournament.type === 'Grup+Eleme' && tournament.currentStage === 'knockout')
      ? (tournament.advancingPlayers || [])
      : [...tournament.participants, ...(tournament.extraParticipants || [])];
    
    const roundsList = Array.from(new Set(filteredMatches.map(m => (m as any).round as number))).sort((a: number, b: number) => a - b);
    const maxRound = roundsList.length > 0 ? Math.max(...(roundsList as number[])) : 0;

    // Calculate for each round from 1 up to maxRound
    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = filteredMatches.filter(m => ((m as any).round as number) === round);
      const playersInMatches = new Set<string>();
      roundMatches.forEach(m => {
        if (!m.player1Id.startsWith('WINNER_OF_')) playersInMatches.add(m.player1Id);
        if (!m.player2Id.startsWith('WINNER_OF_')) playersInMatches.add(m.player2Id);
      });

      if (round === 1) {
        // Round 1 "Yükselenler" are those who skip R1
        advancers[round] = allParticipants
          .filter(p => !playersInMatches.has(p))
          .map(p => ({ id: p, type: 'bye' as const }));
      } else {
        const prevRound = round - 1;
        const prevRoundMatches = filteredMatches.filter(m => m.round === prevRound);
        
        let winners: { id: string, type: 'winner' }[] = [];
        if (tournament.matchType === 'Çift Maç') {
          const pairCodes = Array.from(new Set(prevRoundMatches.map(m => m.pairCode || m.matchCode))) as string[];
          const uniqueWinnerIds = new Set<string>(
            pairCodes
              .map(pc => getPairWinner(pc, filteredMatches))
              .filter((id): id is string => !!id && !id.startsWith('WINNER_OF_'))
          );
          winners = Array.from(uniqueWinnerIds).map(id => ({ id, type: 'winner' as const }));
        } else {
          const uniqueWinnerIds = new Set<string>(
            prevRoundMatches
              .filter(m => m.status === 'completed' && m.winnerId && !m.winnerId.startsWith('WINNER_OF_'))
              .map(m => m.winnerId!)
          );
          winners = Array.from(uniqueWinnerIds).map(id => ({ id, type: 'winner' as const }));
        }

        const playersInPrevMatches = new Set<string>();
        prevRoundMatches.forEach(m => {
          if (!m.player1Id.startsWith('WINNER_OF_')) playersInPrevMatches.add(m.player1Id);
          if (!m.player2Id.startsWith('WINNER_OF_')) playersInPrevMatches.add(m.player2Id);
        });

        let prevPool: string[] = [];
        if (prevRound === 1) {
          prevPool = allParticipants;
        } else {
          prevPool = (advancers[prevRound] || []).map(a => a.id);
        }
        
        const byes = prevPool
          .filter(p => !playersInPrevMatches.has(p))
          .map(p => ({ id: p, type: 'bye' as const }));

        advancers[round] = [...winners, ...byes];
      }
    }
    
    return advancers;
  }, [filteredMatches, tournament.participants, tournament.extraParticipants, tournament.advancingPlayers, tournament.type, tournament.currentStage, tournament.matchType, tournament.winnerSelectionMethod]);

  const getStudentName = (id: string | null | undefined) => {
    if (!id) return 'Bekleniyor...';
    if (id === 'BYE') return 'BAY';
    
    if (id.startsWith('WINNER_OF_')) {
      const matchCode = id.replace('WINNER_OF_', '');
      const winnerId = getPairWinner(matchCode, matches);
      if (winnerId) {
        return getStudentName(winnerId);
      }
      return `${matchCode} Galibi`;
    }

    if (id.startsWith('extra:')) {
      return id.replace('extra:', '');
    }

    const student = students.find(s => s.id === id);
    if (student) {
      // Check if there are other students with the same name to distinguish them
      const duplicates = students.filter(s => s.name === student.name);
      if (duplicates.length > 1 && student.number) {
        return `${student.name} (${student.number})`;
      }
      return student.name;
    }

    // Fallback for extra participants that might not have the prefix in some contexts
    if (tournament.extraParticipants?.includes(id)) return id;
    
    return id;
  };

  const handleUpdateMatch = async (matchId: string, winnerId: string, score1: number, score2: number) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const matchRef = doc(db, `users/${user.uid}/tournaments/${tournament.id}/matches`, matchId);
      const currentMatch = matches.find(m => m.id === matchId);
      if (!currentMatch) return;

      batch.update(matchRef, {
        winnerId,
        score1,
        score2,
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      // Double match tie-breaker logic
      if (currentMatch.isDoubleMatch && !currentMatch.isTieBreaker) {
        const pairCode = currentMatch.pairCode!;
        const pairMatches = matches.filter(m => m.pairCode === pairCode);
        const m1 = pairMatches.find(m => m.matchCode === `${pairCode}-1`);
        const m2 = pairMatches.find(m => m.matchCode === `${pairCode}-2`);
        
        // Use the updated data for the current match
        const updatedM1 = m1?.id === matchId ? { ...m1, status: 'completed', winnerId, score1, score2 } : m1;
        const updatedM2 = m2?.id === matchId ? { ...m2, status: 'completed', winnerId, score1, score2 } : m2;

        if (updatedM1?.status === 'completed' && updatedM2?.status === 'completed') {
          const p1Id = updatedM1.player1Id;
          const p2Id = updatedM1.player2Id;
          let isTie = false;

          if (tournament.winnerSelectionMethod === 'score') {
            const p1Total = (updatedM1.score1 || 0) + (updatedM2.score2 || 0);
            const p2Total = (updatedM1.score2 || 0) + (updatedM2.score1 || 0);
            isTie = p1Total === p2Total;
          } else {
            let p1Wins = 0;
            let p2Wins = 0;
            if (updatedM1.winnerId === p1Id) p1Wins++; else if (updatedM1.winnerId === p2Id) p2Wins++;
            if (updatedM2.winnerId === p1Id) p1Wins++; else if (updatedM2.winnerId === p2Id) p2Wins++;
            isTie = p1Wins === p2Wins;
          }

          if (isTie) {
            // Check if tie-breaker already exists
            const existingTieBreaker = pairMatches.find(m => m.isTieBreaker);
            if (!existingTieBreaker) {
              const tieBreakerRef = doc(collection(db, `users/${user.uid}/tournaments/${tournament.id}/matches`));
              batch.set(tieBreakerRef, {
                id: tieBreakerRef.id,
                tournamentId: tournament.id,
                round: currentMatch.round,
                player1Id: p1Id,
                player2Id: p2Id,
                status: 'pending',
                matchCode: `${pairCode}-T`,
                isDoubleMatch: true,
                pairCode: pairCode,
                isTieBreaker: true,
                createdAt: serverTimestamp()
              });
            }
          }
        }
      }

      // Propagate winner to next matches if fixtureType is 'all' and it's a knockout stage
      if (tournament.fixtureType === 'all' && (tournament.type === 'Eleme' || (tournament.type === 'Grup+Eleme' && activeStage === 'knockout'))) {
        const pairCode = currentMatch.pairCode || currentMatch.matchCode;
        if (pairCode) {
          const pairMatches = matches.filter(m => m.pairCode === pairCode || m.matchCode === pairCode);
          const updatedMatches = matches.map(m => m.id === matchId ? { ...m, status: 'completed', winnerId, score1, score2 } : m);
          const overallWinnerId = getPairWinner(pairCode, updatedMatches);

          if (overallWinnerId) {
            const oldWinnerId = currentMatch.winnerId;
            
            // Only find matches that are explicitly waiting for the winner of THIS pair
            const dependentMatches = matches.filter(m => 
              m.id !== matchId && (
                m.player1Id === `WINNER_OF_${pairCode}` || 
                m.player2Id === `WINNER_OF_${pairCode}` ||
                // If it was already propagated (handling edits), we check if the ID matches the old winner
                // This is still a bit heuristic but much safer than the previous check
                (oldWinnerId && (m.player1Id === oldWinnerId || m.player2Id === oldWinnerId))
              )
            );

            dependentMatches.forEach(depMatch => {
              const depMatchRef = doc(db, `users/${user.uid}/tournaments/${tournament.id}/matches`, depMatch.id);
              const updates: any = { updatedAt: serverTimestamp() };
              
              // Only update if it matches the placeholder or the old winner
              if (depMatch.player1Id === `WINNER_OF_${pairCode}` || (oldWinnerId && depMatch.player1Id === oldWinnerId)) {
                updates.player1Id = overallWinnerId;
              }
              if (depMatch.player2Id === `WINNER_OF_${pairCode}` || (oldWinnerId && depMatch.player2Id === oldWinnerId)) {
                updates.player2Id = overallWinnerId;
              }
              
              if (Object.keys(updates).length > 1) { // Only update if we actually changed something besides updatedAt
                batch.update(depMatchRef, updates);
              }
            });
          }
        }
      }

      await batch.commit();
      setEditingMatchId(null);
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  const handleScoreSubmit = (match: Match) => {
    const s1 = parseInt(scores[match.id]?.s1 || '0');
    const s2 = parseInt(scores[match.id]?.s2 || '0');
    
    if (s1 === s2 && tournament.type === 'Eleme' && !match.isDoubleMatch) {
      alert('Eleme usulü turnuvalarda beraberlik durumunda kazanan belirlenemez. Lütfen skorları kontrol edin.');
      return;
    }

    // In double match, tie-breaker cannot be a tie
    if (s1 === s2 && match.isTieBreaker) {
      alert('Kazananı belirleme maçında beraberlik olamaz. Lütfen skorları kontrol edin.');
      return;
    }

    const winnerId = s1 > s2 ? match.player1Id : (s1 < s2 ? match.player2Id : '');
    handleUpdateMatch(match.id, winnerId, s1, s2);
  };

  const handleDrawNextRound = async () => {
    if (!user || isDrawing) return;
    setIsDrawing(true);

    try {
      const currentRoundMatches = filteredMatches.filter(m => m.round === tournament.currentRound);
      
      // Check if next round matches already exist
      const nextRound = tournament.currentRound + 1;
      const existingNextRoundMatches = filteredMatches.filter(m => m.round === nextRound);
      
      if (existingNextRoundMatches.length > 0) {
        // If they exist, just update the currentRound state in Firestore and return
        const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournament.id);
        await updateDoc(tournamentRef, {
          currentRound: nextRound,
          updatedAt: serverTimestamp()
        });
        setIsDrawing(false);
        return;
      }

      const allCompleted = currentRoundMatches.every(m => m.status === 'completed');

      if (!allCompleted) {
        alert('Lütfen önce mevcut turdaki tüm maçları tamamlayın.');
        setIsDrawing(false);
        return;
      }

      // Check for pending tie-breakers in double match mode
      if (tournament.matchType === 'Çift Maç') {
        const pairCodes = Array.from(new Set(currentRoundMatches.map(m => m.pairCode || m.matchCode))) as string[];
        for (const pc of pairCodes) {
          const winnerId = getPairWinner(pc, filteredMatches);
          if (!winnerId) {
            // If no winner, check if we need a tie-breaker that hasn't been created or completed
            alert('Bazı eşleşmelerde beraberlik var veya maçlar tamamlanmadı. Lütfen tüm maçları ve varsa beraberlik maçlarını tamamlayın.');
            setIsDrawing(false);
            return;
          }
        }
      }

      // Calculate pool for next round
      const currentPool = tournament.currentRound === 1 
        ? (tournament.type === 'Grup+Eleme' ? (tournament.advancingPlayers || []) : [...tournament.participants, ...(tournament.extraParticipants || [])])
        : (advancersByRound[tournament.currentRound]?.map(a => a.id) || []);
        
      console.log('Drawing next round:', { currentRound: tournament.currentRound, nextRound, poolSize: currentPool.length });

      const winners = tournament.matchType === 'Çift Maç'
        ? Array.from(new Set(currentRoundMatches.map(m => m.pairCode || m.matchCode)))
            .map(pc => getPairWinner(pc as string, filteredMatches))
            .filter((id): id is string => !!id)
        : currentRoundMatches.filter(m => m.status === 'completed' && m.winnerId).map(m => m.winnerId!);

      const playersInCurrentMatches = new Set<string>();
      currentRoundMatches.forEach(m => {
        playersInCurrentMatches.add(m.player1Id);
        playersInCurrentMatches.add(m.player2Id);
      });

      const byes = currentPool.filter(p => !playersInCurrentMatches.has(p));
      const pool = Array.from(new Set([...winners, ...byes]));

      console.log('Pool for next round:', { winners: winners.length, byes: byes.length, total: pool.length });

      if (pool.length <= 1) {
        // Tournament finished!
        const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournament.id);
        await updateDoc(tournamentRef, {
          status: 'Tamamlandı',
          winnerName: pool.length === 1 ? getStudentName(pool[0]) : 'Bilinmiyor',
          updatedAt: serverTimestamp()
        });
        setIsDrawing(false);
        return;
      }

      // Draw matches for next round
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const batch = writeBatch(db);
      
      for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
        const mCodeBase = `R${nextRound}-M${i + 1}`;
        if (tournament.matchType === 'Çift Maç') {
          const m1Ref = doc(collection(db, `users/${user.uid}/tournaments/${tournament.id}/matches`));
          batch.set(m1Ref, {
            id: m1Ref.id,
            tournamentId: tournament.id,
            round: nextRound,
            player1Id: shuffled[i * 2],
            player2Id: shuffled[i * 2 + 1],
            status: 'pending',
            matchCode: `${mCodeBase}-1`,
            isDoubleMatch: true,
            pairCode: mCodeBase,
            stage: tournament.type === 'Grup+Eleme' ? 'knockout' : null,
            createdAt: serverTimestamp()
          });
          const m2Ref = doc(collection(db, `users/${user.uid}/tournaments/${tournament.id}/matches`));
          batch.set(m2Ref, {
            id: m2Ref.id,
            tournamentId: tournament.id,
            round: nextRound,
            player1Id: shuffled[i * 2 + 1],
            player2Id: shuffled[i * 2],
            status: 'pending',
            matchCode: `${mCodeBase}-2`,
            isDoubleMatch: true,
            pairCode: mCodeBase,
            stage: tournament.type === 'Grup+Eleme' ? 'knockout' : null,
            createdAt: serverTimestamp()
          });
        } else {
          const matchRef = doc(collection(db, `users/${user.uid}/tournaments/${tournament.id}/matches`));
          batch.set(matchRef, {
            id: matchRef.id,
            tournamentId: tournament.id,
            round: nextRound,
            player1Id: shuffled[i * 2],
            player2Id: shuffled[i * 2 + 1],
            status: 'pending',
            matchCode: mCodeBase,
            stage: tournament.type === 'Grup+Eleme' ? 'knockout' : null,
            createdAt: serverTimestamp()
          });
        }
      }

      // Handle odd number of players in next round (another bye)
      if (shuffled.length % 2 !== 0) {
        // The last player gets a bye automatically? 
        // Or we just leave them for the next draw.
        // In knockout, if you have 3 players, 2 play, 1 byes.
        // So we should probably just not create a match for them, they'll be in the pool for R+1.
      }

      // Update tournament current round
      const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournament.id);
      batch.update(tournamentRef, {
        currentRound: nextRound,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      setSelectedRound(nextRound);
    } catch (error) {
      console.error('Error drawing next round:', error);
    } finally {
      setIsDrawing(false);
    }
  };

  const isCurrentRoundFinished = useMemo(() => {
    const currentMatches = filteredMatches.filter(m => m.round === tournament.currentRound);
    if (currentMatches.length === 0) return false;
    
    if (tournament.matchType === 'Çift Maç') {
      const pairCodes = Array.from(new Set(currentMatches.map(m => m.pairCode || m.matchCode))) as string[];
      return pairCodes.every(pc => getPairWinner(pc, filteredMatches) !== null);
    }
    
    return currentMatches.every(m => m.status === 'completed');
  }, [filteredMatches, tournament.currentRound, tournament.matchType]);

  const isTournamentFinished = useMemo(() => {
    if (filteredMatches.length === 0) return false;
    
    // For Group+Knockout, we only finish after the knockout stage
    if (tournament.type === 'Grup+Eleme' && activeStage === 'group') return false;

    // For League or Group modes, it's finished when all matches are completed
    if (tournament.type === 'Lig' || tournament.type === 'Grup') {
      return filteredMatches.every(m => m.status === 'completed');
    }

    // For Knockout modes, it's finished when the last round (final) is completed
    const lastRound = Math.max(...filteredMatches.map(m => m.round));
    const lastRoundMatches = filteredMatches.filter(m => m.round === lastRound);
    
    if (tournament.matchType === 'Çift Maç') {
      const pairCodes = Array.from(new Set(lastRoundMatches.map(m => m.pairCode || m.matchCode))) as string[];
      return pairCodes.length === 1 && getPairWinner(pairCodes[0], filteredMatches) !== null;
    }
    
    return lastRoundMatches.length === 1 && lastRoundMatches[0].status === 'completed';
  }, [filteredMatches, tournament.matchType, tournament.type, activeStage]);

  useEffect(() => {
    if (isTournamentFinished && tournament.status === 'Devam Ediyor') {
      setShowCompleteModal(true);
    }
  }, [isTournamentFinished, tournament.status]);

  const handleCompleteTournament = async () => {
    if (!user || !isTournamentFinished) return;
    
    try {
      let winnerId: string | null = null;

      if (tournament.type === 'Lig' || tournament.type === 'Grup') {
        // Winner is the one at the top of the standings
        if (standings.length > 0) {
          winnerId = standings[0].id;
        }
      } else {
        // Knockout winner
        const lastRound = Math.max(...matches.map(m => m.round));
        const lastRoundMatches = matches.filter(m => m.round === lastRound);
        
        if (tournament.matchType === 'Çift Maç') {
          const pairCodes = Array.from(new Set(lastRoundMatches.map(m => m.pairCode || m.matchCode))) as string[];
          winnerId = getPairWinner(pairCodes[0], matches);
        } else {
          winnerId = lastRoundMatches[0]?.winnerId || null;
        }
      }
      
      if (!winnerId) return;

      const winnerName = getStudentName(winnerId);
      const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournament.id);
      
      await updateDoc(tournamentRef, {
        status: 'Tamamlandı',
        winnerName,
        updatedAt: serverTimestamp()
      });
      
      setShowCompleteModal(false);
      onClose();
    } catch (error) {
      console.error('Error completing tournament:', error);
    }
  };

  const handleStartKnockout = async () => {
    if (!user || tournament.type !== 'Grup+Eleme') return;

    try {
      const advancingPlayers: string[] = [];
      const advancingCount = tournament.advancingPerGroup || 2;

      groups.forEach(group => {
        const groupMatches = matches.filter(m => m.groupId === group.id);
        
        const stats: { [key: string]: { id: string, played: number, win: number, draw: number, loss: number, points: number, goalsFor: number, goalsAgainst: number } } = {};
        
        const relevantParticipants = new Set<string>();
        groupMatches.forEach(m => {
          if (m.player1Id !== 'BYE') relevantParticipants.add(m.player1Id);
          if (m.player2Id !== 'BYE') relevantParticipants.add(m.player2Id);
        });
        relevantParticipants.forEach(id => {
          stats[id] = { id, played: 0, win: 0, draw: 0, loss: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
        });

        groupMatches.filter(m => m.status === 'completed').forEach(m => {
          const p1 = stats[m.player1Id];
          const p2 = stats[m.player2Id];
          if (!p1 || !p2) return;

          p1.played++;
          p2.played++;

          if (tournament.winnerSelectionMethod === 'score') {
            p1.goalsFor += (m.score1 || 0);
            p1.goalsAgainst += (m.score2 || 0);
            p2.goalsFor += (m.score2 || 0);
            p2.goalsAgainst += (m.score1 || 0);
          }

          if (m.score1! > m.score2!) {
            p1.win++;
            p1.points += (tournament.pointsWin || 0);
            p2.loss++;
            p2.points += (tournament.pointsLoss || 0);
          } else if (m.score1! < m.score2!) {
            p2.win++;
            p2.points += (tournament.pointsWin || 0);
            p1.loss++;
            p1.points += (tournament.pointsLoss || 0);
          } else {
            p1.draw++;
            p2.draw++;
            p1.points += (tournament.pointsDraw ?? 0);
            p2.points += (tournament.pointsDraw ?? 0);
          }
        });

        const sortedStats = Object.values(stats).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.win !== a.win) return b.win - a.win;
          if (tournament.winnerSelectionMethod === 'score') {
            const aGD = a.goalsFor - a.goalsAgainst;
            const bGD = b.goalsFor - b.goalsAgainst;
            if (bGD !== aGD) return bGD - aGD;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
          }
          return 0;
        });

        const topPlayers = sortedStats.slice(0, advancingCount).map(s => s.id);
        advancingPlayers.push(...topPlayers);
      });

      const knockoutMatches = generateElemeFixture(
        tournament.id,
        advancingPlayers,
        tournament.fixtureType,
        tournament.matchType,
        1 // Starting round
      );

      const batch = writeBatch(db);
      
      knockoutMatches.forEach(match => {
        const matchRef = doc(collection(db, `users/${user.uid}/tournaments/${tournament.id}/matches`));
        batch.set(matchRef, {
          ...match,
          id: matchRef.id,
          createdAt: serverTimestamp()
        });
      });

      const tournamentRef = doc(db, `users/${user.uid}/tournaments`, tournament.id);
      batch.update(tournamentRef, {
        currentStage: 'knockout',
        currentRound: 1,
        advancingPlayers,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error starting knockout phase:', error);
    }
  };

  const standings = useMemo(() => {
    if (tournament.type !== 'Lig' && tournament.type !== 'Grup' && tournament.type !== 'Grup+Eleme') return [];
    if (tournament.type === 'Grup+Eleme' && activeStage === 'knockout') return [];
    
    const stats: { [key: string]: { id: string, name: string, played: number, win: number, draw: number, loss: number, points: number, goalsFor: number, goalsAgainst: number, rank?: number } } = {};
    
    if (tournament.type === 'Lig') {
      // Use Set to ensure we don't have duplicate IDs in stats
      const allParticipants = Array.from(new Set(tournament.participants as string[]));
      allParticipants.forEach((id: string) => {
        stats[id] = { id, name: getStudentName(id), played: 0, win: 0, draw: 0, loss: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
      });
    } else {
      const relevantParticipants = new Set<string>();
      filteredMatches.forEach((m: any) => {
        if (m.player1Id !== 'BYE') relevantParticipants.add(m.player1Id);
        if (m.player2Id !== 'BYE') relevantParticipants.add(m.player2Id);
      });
      relevantParticipants.forEach((id: string) => {
        stats[id] = { id, name: getStudentName(id), played: 0, win: 0, draw: 0, loss: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
      });
    }

    filteredMatches.filter(m => m.status === 'completed').forEach(m => {
      const p1 = stats[m.player1Id];
      const p2 = stats[m.player2Id];
      if (!p1 || !p2) return;

      p1.played++;
      p2.played++;

      // Always track goals if scores are present to support tie-breaking
      if (m.score1 !== undefined && m.score2 !== undefined) {
        p1.goalsFor += (m.score1 || 0);
        p1.goalsAgainst += (m.score2 || 0);
        p2.goalsFor += (m.score2 || 0);
        p2.goalsAgainst += (m.score1 || 0);
      }

      if (m.score1! > m.score2!) {
        p1.win++;
        p1.points += (tournament.pointsWin || 0);
        p2.loss++;
        p2.points += (tournament.pointsLoss || 0);
      } else if (m.score1! < m.score2!) {
        p2.win++;
        p2.points += (tournament.pointsWin || 0);
        p1.loss++;
        p1.points += (tournament.pointsLoss || 0);
      } else {
        p1.draw++;
        p2.draw++;
        p1.points += (tournament.pointsDraw ?? 0);
        p2.points += (tournament.pointsDraw ?? 0);
      }
    });

    const sortedStats = Object.values(stats).sort((a, b) => {
      // 1. Puan (Points)
      if (b.points !== a.points) return b.points - a.points;
      // 2. Galibiyet Sayısı (Number of Wins)
      if (b.win !== a.win) return b.win - a.win;
      // 3. Averaj (Goal Difference)
      const aGD = a.goalsFor - a.goalsAgainst;
      const bGD = b.goalsFor - b.goalsAgainst;
      if (bGD !== aGD) return bGD - aGD;
      // 4. Atılan Gol (Goals For)
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return 0;
    });

    let currentRank = 1;
    for (let i = 0; i < sortedStats.length; i++) {
      if (i > 0) {
        const prev = sortedStats[i - 1];
        const curr = sortedStats[i];
        
        let isTie = false;
        // Check for tie based on the same rules
        if (curr.points === prev.points && curr.win === prev.win) {
          const currGD = curr.goalsFor - curr.goalsAgainst;
          const prevGD = prev.goalsFor - prev.goalsAgainst;
          if (currGD === prevGD && curr.goalsFor === prev.goalsFor) {
            isTie = true;
          }
        }
        
        if (!isTie) {
          currentRank = i + 1;
        }
      }
      sortedStats[i].rank = currentRank;
    }

    return sortedStats;
  }, [filteredMatches, tournament, students]);

  const leagueRounds = useMemo(() => {
    if (tournament.type !== 'Lig' && tournament.type !== 'Grup' && tournament.type !== 'Grup+Eleme') return { firstLeg: rounds, secondLeg: [] };
    
    const totalWeeks = rounds.length;
    if (tournament.matchType === 'Çift Maç') {
      const midPoint = Math.floor(totalWeeks / 2);
      const firstLeg = rounds.filter(r => r <= midPoint);
      const secondLeg = rounds.filter(r => r > midPoint);
      
      // Auto-switch leg if selected round is in second leg
      if (selectedRound > midPoint && selectedLeg === 'first') {
        setSelectedLeg('second');
      } else if (selectedRound <= midPoint && selectedLeg === 'second' && firstLeg.length > 0) {
        setSelectedLeg('first');
      }

      return { firstLeg, secondLeg };
    }
    return { firstLeg: rounds, secondLeg: [] };
  }, [rounds, tournament, selectedRound, selectedLeg]);

  const groups = useMemo(() => {
    if (tournament.type !== 'Grup' && tournament.type !== 'Grup+Eleme') return [];
    const groupMap = new Map<string, { id: string, name: string }>();
    matches.forEach(m => {
      if (m.groupId) {
        groupMap.set(m.groupId, { id: m.groupId, name: m.groupName || m.groupId });
      }
    });
    return Array.from(groupMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [matches, tournament.type]);

  const currentLegRounds = selectedLeg === 'first' ? leagueRounds.firstLeg : leagueRounds.secondLeg;

  const handleExportPDF = (type: 'all' | 'round') => {
    const doc = new jsPDF();
    
    const normalizeTurkishChars = (text: string) => {
      if (!text) return '';
      return text
        .replace(/Ğ/g, 'G')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U')
        .replace(/ü/g, 'u')
        .replace(/Ş/g, 'S')
        .replace(/ş/g, 's')
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'i')
        .replace(/Ö/g, 'O')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'C')
        .replace(/ç/g, 'c');
    };
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(normalizeTurkishChars(tournament.name), 14, 22);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(normalizeTurkishChars(`${tournament.type} Modu`), 14, 30);
    
    let matchesToExport = filteredMatches;
    let title = 'Tum Fikstur';
    
    if (type === 'round') {
      matchesToExport = filteredMatches.filter(m => m.round === selectedRound);
      title = normalizeTurkishChars(`${getRoundName(selectedRound, matches, rounds.length)} Maclari`);
    }
    
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(title, 14, 42);
    
    const tableData = matchesToExport.map(match => {
      const p1Name = getStudentName(match.player1Id);
      const p2Name = getStudentName(match.player2Id);
      const score = match.status === 'completed' ? `${match.score1 || 0} - ${match.score2 || 0}` : '';
      const winner = match.status === 'completed' ? getStudentName(match.winnerId) : '';
      
      return [
        normalizeTurkishChars(match.matchCode || '-'),
        normalizeTurkishChars(p1Name),
        score,
        normalizeTurkishChars(p2Name),
        normalizeTurkishChars(winner)
      ];
    });
    
    autoTable(doc, {
      startY: 48,
      head: [['Mac Kodu', '1. Oyuncu', 'Skor', '2. Oyuncu', 'Kazanan']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      styles: { font: 'helvetica', fontSize: 10 },
    });
    
    doc.save(normalizeTurkishChars(`${tournament.name}_${title}.pdf`));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <AnimatePresence>
          {showPointsModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                  <Trophy size={40} className="text-indigo-600" />
                </div>

                <h3 className="text-3xl font-black text-neutral-900 mb-3 tracking-tight">Puanlama Sistemi</h3>
                <p className="text-neutral-500 font-medium mb-10 text-lg leading-relaxed">
                  Lig usulü turnuvada puanlama nasıl yapılacak? Lütfen galibiyet, beraberlik ve mağlubiyet puanlarını belirleyin.
                </p>
                
                <div className="grid grid-cols-1 gap-4 mb-10">
                  <div className="group flex items-center justify-between p-6 bg-emerald-50/50 rounded-[2rem] border-2 border-emerald-100/50 hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <span className="block font-black text-emerald-900 text-lg">Galibiyet</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Kazanan Takım</span>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      id="points-win"
                      defaultValue={3}
                      className="w-20 px-4 py-3 rounded-2xl border-2 border-emerald-200 text-center font-black text-xl focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="group flex items-center justify-between p-6 bg-amber-50/50 rounded-[2rem] border-2 border-amber-100/50 hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                        <Minus size={20} />
                      </div>
                      <div>
                        <span className="block font-black text-amber-900 text-lg">Beraberlik</span>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Eşitlik Durumu</span>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      id="points-draw"
                      defaultValue={1}
                      className="w-20 px-4 py-3 rounded-2xl border-2 border-amber-200 text-center font-black text-xl focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="group flex items-center justify-between p-6 bg-rose-50/50 rounded-[2rem] border-2 border-rose-100/50 hover:border-rose-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100">
                        <X size={20} />
                      </div>
                      <div>
                        <span className="block font-black text-rose-900 text-lg">Mağlubiyet</span>
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Kaybeden Takım</span>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      id="points-loss"
                      defaultValue={0}
                      className="w-20 px-4 py-3 rounded-2xl border-2 border-rose-200 text-center font-black text-xl focus:ring-4 focus:ring-rose-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const win = parseInt((document.getElementById('points-win') as HTMLInputElement).value) || 0;
                    const draw = parseInt((document.getElementById('points-draw') as HTMLInputElement).value) || 0;
                    const loss = parseInt((document.getElementById('points-loss') as HTMLInputElement).value) || 0;
                    handleSavePoints(win, draw, loss);
                  }}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98]"
                >
                  Turnuvayı Başlat
                </button>
              </motion.div>
            </div>
          )}

          {showCompleteModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy size={40} className="text-amber-600" />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 mb-2">Tebrikler!</h3>
                <p className="text-neutral-500 font-medium mb-8">
                  {tournament.type === 'Lig' || tournament.type === 'Grup' 
                    ? 'Tüm maçlar tamamlandı. Turnuvayı sonlandırıp şampiyonu ilan etmek istiyor musunuz?'
                    : 'Final maçı tamamlandı. Turnuvayı "Tamamlandı" olarak işaretleyip sonuçları kaydetmek istiyor musunuz?'}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCompleteTournament}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Evet, Tamamla
                  </button>
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black hover:bg-neutral-200 transition-all"
                  >
                    Hayır, Düzenlemeye Devam Et
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

          {/* Points System Banner for League Mode */}
          {(tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') && tournament.pointsWin !== undefined && (
            <div className="px-8 py-4 bg-indigo-600 flex items-center justify-between shadow-lg shadow-indigo-100 relative z-10 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/50 via-transparent to-transparent"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                  <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Galibiyet</span>
                  <span className="text-sm font-black text-white">{tournament.pointsWin} Puan</span>
                </div>
                <div className="w-px h-4 bg-indigo-500/50"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                  <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Beraberlik</span>
                  <span className="text-sm font-black text-white">{tournament.pointsDraw} Puan</span>
                </div>
                <div className="w-px h-4 bg-indigo-500/50"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"></div>
                  <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Mağlubiyet</span>
                  <span className="text-sm font-black text-white">{tournament.pointsLoss} Puan</span>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Puan Sistemi</span>
                <div className="p-1.5 bg-indigo-500/30 rounded-lg">
                  <Settings size={12} className="text-indigo-100" />
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-4 px-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Trophy className="text-amber-600" size={24} />
              </div>
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">{tournament.name}</h2>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                {tournament.type} Modu
              </span>
              {tournament.type === 'Eleme' && (
                <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-bold">
                  {tournament.fixtureType === 'all' ? 'Tüm Fikstür Planlı' : 'Tur Bazlı Kura'}
                </span>
              )}
              <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">
                {tournament.currentRound}. Tur
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4 border-r border-neutral-200 pr-4">
              <button
                onClick={() => handleExportPDF('all')}
                className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all shadow-sm"
              >
                Tüm Fikstür PDF
              </button>
              <button
                onClick={() => handleExportPDF('round')}
                className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all shadow-sm"
              >
                Bu Tur PDF
              </button>
            </div>

            {(tournament.type === 'Eleme' || (tournament.type === 'Grup+Eleme' && tournament.currentStage === 'knockout')) && tournament.fixtureType === 'round-by-round' && tournament.status === 'Devam Ediyor' && (
              <button
                onClick={handleDrawNextRound}
                disabled={!isCurrentRoundFinished || isDrawing}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                  isCurrentRoundFinished && !isDrawing
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Shuffle size={18} />
                {isDrawing ? 'Kura Çekiliyor...' : 'Sonraki Tur Kurası Çek'}
              </button>
            )}

            {/* Finish Button for League/Group Modes if all matches are done */}
            {(tournament.type === 'Lig' || tournament.type === 'Grup') && tournament.status === 'Devam Ediyor' && isTournamentFinished && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95"
              >
                <Trophy size={18} />
                Turnuvayı Tamamla
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 hover:bg-white rounded-2xl text-neutral-400 hover:text-neutral-600 transition-all shadow-sm hover:shadow-md"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden flex ${(tournament.type === 'Lig' || tournament.type === 'Grup' || (tournament.type === 'Grup+Eleme' && activeStage === 'group')) ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          <div className={`flex-1 overflow-y-auto p-6 bg-neutral-50/30 ${(tournament.type === 'Lig' || tournament.type === 'Grup' || (tournament.type === 'Grup+Eleme' && activeStage === 'group')) ? 'lg:border-r border-neutral-100' : ''}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-neutral-500 font-bold">Fikstür yükleniyor...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                <div className="p-6 bg-white rounded-full shadow-sm">
                  <AlertCircle size={48} className="text-neutral-300" />
                </div>
                <div>
                  <p className="text-neutral-900 font-black text-xl">Fikstür Bulunamadı</p>
                  <p className="text-neutral-500 font-medium">Bu turnuva için henüz maç oluşturulmamış.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Stage Toggle for Grup+Eleme */}
                {tournament.type === 'Grup+Eleme' && tournament.currentStage === 'knockout' && (
                  <div className="flex bg-neutral-100 p-1.5 rounded-2xl w-max mx-auto mb-6">
                    <button
                      onClick={() => {
                        setActiveStage('group');
                        setSelectedRound(1);
                      }}
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
                        activeStage === 'group'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Grup Aşaması
                    </button>
                    <button
                      onClick={() => {
                        setActiveStage('knockout');
                        setSelectedRound(1);
                      }}
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
                        activeStage === 'knockout'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Eleme Aşaması
                    </button>
                  </div>
                )}

                {/* Start Knockout Button */}
                {tournament.type === 'Grup+Eleme' && tournament.currentStage !== 'knockout' && matches.filter(m => m.stage !== 'knockout').every(m => m.status === 'completed') && (
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={handleStartKnockout}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1"
                    >
                      <Trophy size={24} />
                      Eleme Turunu Başlat
                    </button>
                  </div>
                )}

                {/* Group Tabs */}
                {(tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') && activeStage === 'group' && groups.length > 0 && (
                  <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar scroll-smooth">
                    {groups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedGroup(group.id);
                          setSelectedRound(1);
                        }}
                        className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
                          selectedGroup === group.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-neutral-600 hover:bg-neutral-50 border-2 border-neutral-100'
                        }`}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Round Tabs */}
                {(tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') ? (
                  <div className="space-y-6 mb-8">
                    {/* Leg Toggle */}
                    {leagueRounds.secondLeg.length > 0 && (
                      <div className="flex justify-center">
                        <div className="inline-flex bg-neutral-100 p-1.5 rounded-2xl shadow-inner">
                          <button
                            onClick={() => {
                              setSelectedLeg('first');
                              setSelectedRound(leagueRounds.firstLeg[0]);
                            }}
                            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${
                              selectedLeg === 'first'
                                ? 'bg-white text-indigo-600 shadow-md'
                                : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                          >
                            1. Devre
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLeg('second');
                              setSelectedRound(leagueRounds.secondLeg[0]);
                            }}
                            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${
                              selectedLeg === 'second'
                                ? 'bg-white text-indigo-600 shadow-md'
                                : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                          >
                            2. Devre
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Week Selector Ribbon */}
                    <div className="relative group">
                      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar scroll-smooth px-2">
                        {currentLegRounds.map(round => (
                          <button
                            key={round}
                            onClick={() => setSelectedRound(round)}
                            className={`flex-shrink-0 min-w-[100px] p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-1 ${
                              selectedRound === round
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                : 'bg-white border-neutral-100 text-neutral-500 hover:border-indigo-200 hover:bg-neutral-50'
                            }`}
                          >
                            <span className={`text-[9px] font-black uppercase tracking-widest ${selectedRound === round ? 'text-indigo-100' : 'text-neutral-400'}`}>
                              {(tournament.type === 'Eleme' || (tournament.type === 'Grup+Eleme' && activeStage === 'knockout')) ? 'Tur' : 'Hafta'}
                            </span>
                            <span className="text-lg font-black">{round}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-1 bg-neutral-100 rounded-2xl mb-8">
                    {rounds.map(round => {
                      const roundMatches = matches.filter(m => m.round === round);
                      const name = getRoundName(round, matches, rounds.length);
                      return (
                        <button
                          key={round}
                          onClick={() => setSelectedRound(round)}
                          className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${
                            selectedRound === round
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-700'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-12">
                  {/* Selected Round View */}
                  <div className="space-y-8">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-6 w-full">
                        <div className="h-px flex-1 bg-neutral-200"></div>
                        <div className="px-6 py-2 bg-white rounded-2xl border-2 border-neutral-100 shadow-sm">
                          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest">
                            {getRoundName(selectedRound, matches, rounds.length)} Maçları
                          </h3>
                        </div>
                        <div className="h-px flex-1 bg-neutral-200"></div>
                      </div>

                      {/* Bye Player Display for League Mode */}
                      {(() => {
                        const byeMatch = matches.find(m => m.round === selectedRound && (m.player1Id === 'BYE' || m.player2Id === 'BYE'));
                        if (tournament.type !== 'Lig' || !byeMatch) return null;
                        
                        const byePlayerId = byeMatch.player1Id === 'BYE' ? byeMatch.player2Id : byeMatch.player1Id;
                        
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center"
                          >
                            <div className="flex items-center gap-3 px-6 py-3 bg-rose-50 border-2 border-rose-100 rounded-2xl shadow-sm">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-rose-100">
                                <User size={16} className="text-rose-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">BU HAFTA BAY GEÇTİ</span>
                                <span className="text-sm font-black text-rose-900 leading-none">
                                  {getStudentName(byePlayerId)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </div>

                    {/* Advancers Section */}
                    {tournament.type !== 'Lig' && tournament.type !== 'Grup' && tournament.type !== 'Grup+Eleme' && advancersByRound[selectedRound]?.length > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6 mb-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Trophy className="text-amber-600" size={18} />
                          </div>
                          <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider">Yükselenler</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {advancersByRound[selectedRound].map(advancer => (
                            <div key={advancer.id} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-amber-200 shadow-sm">
                              <User size={14} className="text-amber-500" />
                              <span className="text-xs font-bold text-amber-900">
                                {getStudentName(advancer.id)}
                                {advancer.type === 'bye' && (
                                  <span className="text-rose-600 ml-1 font-black">(Bay geçti)</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`grid grid-cols-1 gap-4 ${(tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') ? 'md:grid-cols-1 xl:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                      {filteredMatches.filter(m => m.round === selectedRound && m.player1Id !== 'BYE' && m.player2Id !== 'BYE').map(match => {
                      const p1Name = getStudentName(match.player1Id);
                      const p2Name = getStudentName(match.player2Id);

                      const isP1Winner = match.winnerId === match.player1Id;
                      const isP2Winner = match.winnerId === match.player2Id;
                      const isP1Waiting = match.player1Id.startsWith('WINNER_OF_');
                      const isP2Waiting = match.player2Id.startsWith('WINNER_OF_');
                      
                      const sourceMatch1 = isP1Waiting ? matches.find(m => m.matchCode === match.player1Id.replace('WINNER_OF_', '')) : null;
                      const sourceMatch2 = isP2Waiting ? matches.find(m => m.matchCode === match.player2Id.replace('WINNER_OF_', '')) : null;
                      
                      const isP1Ready = !isP1Waiting || (sourceMatch1?.status === 'completed');
                      const isP2Ready = !isP2Waiting || (sourceMatch2?.status === 'completed');
                      
                      const canPlay = isP1Ready && isP2Ready;

                      return (
                        <div
                          key={match.id}
                          className={`bg-white rounded-[1.5rem] p-4 border-2 transition-all relative overflow-hidden group ${
                            match.status === 'completed'
                              ? 'border-emerald-100 bg-emerald-50/10'
                              : 'border-neutral-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/30'
                          }`}
                        >
                          {/* Match Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {match.matchCode}
                              </span>
                              {match.isDoubleMatch && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  match.isTieBreaker ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {match.isTieBreaker ? 'Kazananı Belirleme' : match.matchCode?.endsWith('-1') ? 'İlk Maç' : 'Rövans'}
                                </span>
                              )}
                              {match.status === 'completed' && (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle2 size={10} />
                                  Bitti
                                </span>
                              )}
                            </div>
                            {match.status === 'completed' && tournament.status === 'Devam Ediyor' && (
                              <button
                                onClick={() => {
                                  setEditingMatchId(match.id);
                                  setScores(prev => ({
                                    ...prev,
                                    [match.id]: { s1: String(match.score1 || 0), s2: String(match.score2 || 0) }
                                  }));
                                }}
                                className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-indigo-600 transition-all"
                                title="Düzenle"
                              >
                                <Edit3 size={12} />
                              </button>
                            )}
                          </div>

                          {/* Players */}
                          <div className="space-y-1.5">
                            {/* Player 1 */}
                            <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              isP1Winner 
                                ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                                : !isP1Ready ? 'bg-neutral-50 border-neutral-100 opacity-40' : 'bg-white border-neutral-100'
                            }`}>
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isP1Winner ? 'bg-emerald-500 text-white' : isP1Ready ? 'bg-indigo-50 text-indigo-600' : 'bg-neutral-100 text-neutral-400'
                                }`}>
                                  <User size={14} />
                                </div>
                                <span className={`text-xs font-bold truncate ${
                                  isP1Winner ? 'text-emerald-700' : isP1Ready ? 'text-neutral-900' : 'text-neutral-400'
                                }`}>
                                  {p1Name}
                                </span>
                              </div>
                              {match.status === 'completed' && editingMatchId !== match.id && (
                                <span className="font-black text-base text-neutral-900 ml-3">{match.score1}</span>
                              )}
                              {((match.status === 'pending' && canPlay && (tournament.winnerSelectionMethod === 'score' || tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme')) || editingMatchId === match.id) && (
                                <input
                                  type="number"
                                  value={scores[match.id]?.s1 || ''}
                                  onChange={e => setScores(prev => ({
                                    ...prev,
                                    [match.id]: { ...prev[match.id], s1: e.target.value }
                                  }))}
                                  className="w-10 px-1.5 py-1 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-black text-xs"
                                  placeholder="0"
                                />
                              )}
                            </div>

                            <div className="flex justify-center relative h-3">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-px w-full bg-neutral-100"></div>
                              </div>
                              <div className="relative z-10 bg-white px-2">
                                <Swords size={10} className="text-neutral-300" />
                              </div>
                            </div>

                            {/* Player 2 */}
                            <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              isP2Winner 
                                ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                                : !isP2Ready ? 'bg-neutral-50 border-neutral-100 opacity-40' : 'bg-white border-neutral-100'
                            }`}>
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isP2Winner ? 'bg-emerald-500 text-white' : isP2Ready ? 'bg-indigo-50 text-indigo-600' : 'bg-neutral-100 text-neutral-400'
                                }`}>
                                  <User size={14} />
                                </div>
                                <span className={`text-xs font-bold truncate ${
                                  isP2Winner ? 'text-emerald-700' : isP2Ready ? 'text-neutral-900' : 'text-neutral-400'
                                }`}>
                                  {p2Name}
                                </span>
                              </div>
                              {match.status === 'completed' && editingMatchId !== match.id && (
                                <span className="font-black text-base text-neutral-900 ml-3">{match.score2}</span>
                              )}
                              {((match.status === 'pending' && canPlay && (tournament.winnerSelectionMethod === 'score' || tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme')) || editingMatchId === match.id) && (
                                <input
                                  type="number"
                                  value={scores[match.id]?.s2 || ''}
                                  onChange={e => setScores(prev => ({
                                    ...prev,
                                    [match.id]: { ...prev[match.id], s2: e.target.value }
                                  }))}
                                  className="w-10 px-1.5 py-1 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-black text-xs"
                                  placeholder="0"
                                />
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          {match.status === 'pending' && canPlay && (
                            <div className="mt-4">
                              {tournament.winnerSelectionMethod === 'winner' && tournament.type !== 'Lig' && tournament.type !== 'Grup' && (tournament.type !== 'Grup+Eleme' || activeStage === 'knockout') ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleUpdateMatch(match.id, match.player1Id, 1, 0)}
                                    className="py-2 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
                                  >
                                    1. Oyuncu Kazandı
                                  </button>
                                  <button
                                    onClick={() => handleUpdateMatch(match.id, match.player2Id, 0, 1)}
                                    className="py-2 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
                                  >
                                    2. Oyuncu Kazandı
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleScoreSubmit(match)}
                                  className="w-full py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all"
                                >
                                  Skoru Kaydet
                                </button>
                              )}
                            </div>
                          )}

                          {editingMatchId === match.id && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setEditingMatchId(null)}
                                className="py-2 rounded-xl bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-wider hover:bg-neutral-200 transition-all"
                              >
                                İptal
                              </button>
                              <button
                                onClick={() => handleScoreSubmit(match)}
                                className="py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all"
                              >
                                Güncelle
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          
          {/* Standings Sidebar for League and Group Modes */}
          {(tournament.type === 'Lig' || tournament.type === 'Grup' || (tournament.type === 'Grup+Eleme' && activeStage === 'group')) && (
            <div className="w-full lg:w-[460px] overflow-y-auto bg-white border-l border-neutral-100 flex flex-col">
              <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                    <Trophy className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-neutral-900">
                      {tournament.type === 'Lig' ? 'Puan Durumu' : `${groups.find(g => g.id === selectedGroup)?.name || 'Grup'} Puan Durumu`}
                    </h3>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Canlı Sıralama</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">
                      <th className="text-left pb-4 w-8 px-2">#</th>
                      <th className="text-left pb-4">Takım</th>
                      <th className="pb-4 text-center">O</th>
                      {(tournament.winnerSelectionMethod === 'score' || tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme') && (
                        <>
                          <th className="pb-4 text-center" title="Kazanılan Skor/Set">KS</th>
                          <th className="pb-4 text-center" title="Verilen Skor/Set">VS</th>
                        </>
                      )}
                      <th className="pb-4 text-center" title="Averaj">AV</th>
                      <th className="pb-4 text-center">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((stat, index) => {
                      const showScores = tournament.winnerSelectionMethod === 'score' || tournament.type === 'Lig' || tournament.type === 'Grup' || tournament.type === 'Grup+Eleme';
                      
                      let rowBg = 'border-t border-neutral-50';
                      if (stat.rank === 1) rowBg = 'bg-amber-50/60 border-t border-amber-100/50';
                      else if (stat.rank === 2) rowBg = 'bg-slate-50/60 border-t border-slate-200/50';
                      else if (stat.rank === 3) rowBg = 'bg-orange-50/60 border-t border-orange-100/50';

                      return (
                        <tr key={index} className={rowBg}>
                          <td className="py-3 px-2 text-left rounded-l-xl">
                            <span className={`text-[10px] font-black ${
                              stat.rank === 1 ? 'text-amber-600' : stat.rank === 2 ? 'text-slate-600' : stat.rank === 3 ? 'text-orange-600' : 'text-neutral-400'
                            }`}>
                              {stat.rank}.
                            </span>
                          </td>
                          <td className="py-3 px-1 font-bold text-neutral-900 truncate max-w-[120px]">{stat.name}</td>
                          <td className="py-3 px-1 text-center text-neutral-500">{stat.played}</td>
                          {showScores && (
                            <>
                              <td className="py-3 px-1 text-center text-emerald-600 font-bold">{stat.goalsFor}</td>
                              <td className="py-3 px-1 text-center text-rose-600 font-bold">{stat.goalsAgainst}</td>
                            </>
                          )}
                          <td className="py-3 px-1 text-center text-neutral-400 font-bold">
                            {stat.goalsFor - stat.goalsAgainst > 0 ? '+' : ''}{stat.goalsFor - stat.goalsAgainst}
                          </td>
                          <td className="py-3 px-2 text-center rounded-r-xl">
                            <span className={`px-2.5 py-1 rounded-md font-black text-sm ${
                              stat.rank === 1 ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 
                              stat.rank === 2 ? 'bg-slate-500 text-white shadow-md shadow-slate-200' : 
                              stat.rank === 3 ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 
                              'bg-indigo-50 text-indigo-600'
                            }`}>
                              {stat.points}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
