import { useState, useCallback } from 'react';

export interface JokerState {
  available: {
    friendHelp: boolean;
    fiftyFifty: boolean;
    doubleChance: boolean;
    skipQuestion: boolean;
  };
  active: {
    friendHelp: boolean;
    fiftyFifty: boolean;
    doubleChance: boolean;
    skipQuestion: boolean;
  };
  hiddenOptions: string[]; // Used by 50/50
  doubleChanceUsedOnce: boolean; // Used by X2
}

export const getCorrectOptionText = (q: any) => {
  if (!q) return '';
  const answer = q.answer?.toString().trim();
  const indexLabels = ['a', 'b', 'c', 'd'];
  const labelIndex = indexLabels.indexOf(answer?.toLowerCase());
  if (labelIndex !== -1 && q.options && q.options[labelIndex]) {
    return q.options[labelIndex];
  }
  return q.answer || ''; // it's already the option text (or whatever matches)
};

export function useJokers(initialSettings: any, currentQuestion: any) {
  const [jokerState, setJokerState] = useState<JokerState>({
    available: {
      friendHelp: initialSettings?.friendHelp || false,
      fiftyFifty: initialSettings?.fiftyFifty || false,
      doubleChance: initialSettings?.doubleChance || false,
      skipQuestion: initialSettings?.skipQuestion || false
    },
    active: {
      friendHelp: false,
      fiftyFifty: false,
      doubleChance: false,
      skipQuestion: false
    },
    hiddenOptions: [],
    doubleChanceUsedOnce: false
  });

  const [friendHelpModalOpen, setFriendHelpModalOpen] = useState(false);
  const [friendHelpFriends, setFriendHelpFriends] = useState<any[]>([]);
  const [friendAdvice, setFriendAdvice] = useState<{ friendName: string; recommendedOption: string } | null>(null);

  // Call this ONLY when a brand new match or game starts to renew all selected jokers
  const resetJokersForNewTurn = () => {
    setJokerState({
      available: {
        friendHelp: initialSettings?.friendHelp || false,
        fiftyFifty: initialSettings?.fiftyFifty || false,
        doubleChance: initialSettings?.doubleChance || false,
        skipQuestion: initialSettings?.skipQuestion || false
      },
      active: { friendHelp: false, fiftyFifty: false, doubleChance: false, skipQuestion: false },
      hiddenOptions: [],
      doubleChanceUsedOnce: false
    });
    setFriendAdvice(null);
    setFriendHelpModalOpen(false);
  };

  // Call this when moving to a new question under the same match/game
  // It clears active states and temporary UI elements but preserves used/available jokers!
  const resetQuestionState = () => {
    setJokerState(prev => ({
      ...prev,
      active: {
        friendHelp: false,
        fiftyFifty: false,
        doubleChance: false,
        skipQuestion: false
      },
      hiddenOptions: [],
      doubleChanceUsedOnce: false
    }));
    setFriendAdvice(null);
  };

  const useFiftyFifty = () => {
    if (!jokerState.available.fiftyFifty || !currentQuestion?.options) return;
    
    const correctAns = getCorrectOptionText(currentQuestion);
    const wrongOptions = currentQuestion.options.filter((o: string) => o?.toString().trim().toLowerCase() !== correctAns?.toString().trim().toLowerCase());
    
    // shuffle wrong options
    const shuffledWrong = [...wrongOptions].sort(() => Math.random() - 0.5);
    const toHide = shuffledWrong.slice(0, Math.min(2, shuffledWrong.length));
    
    setJokerState(prev => ({
      ...prev,
      available: { ...prev.available, fiftyFifty: false },
      active: { ...prev.active, fiftyFifty: true },
      hiddenOptions: toHide
    }));
  };

  const useDoubleChance = () => {
    if (!jokerState.available.doubleChance) return;
    setJokerState(prev => ({
      ...prev,
      available: { ...prev.available, doubleChance: false },
      active: { ...prev.active, doubleChance: true }
    }));
  };

  // Called when a user clicks an option. Returns true if the app should block immediate evaluation (because they used double chance and got it wrong)
  const handleOptionClick = (option: string, isCorrect: boolean): { shouldBlockEvaluation: boolean } => {
    if (jokerState.active.doubleChance && !jokerState.doubleChanceUsedOnce && !isCorrect) {
      // First wrong answer with X2 active
      setJokerState(prev => ({ ...prev, doubleChanceUsedOnce: true }));
      return { shouldBlockEvaluation: true };
    }
    return { shouldBlockEvaluation: false };
  };

  // Arkadas yardimi
  const initFriendHelp = (allStudents: any[], currentPlayers: string[]) => {
    if (!jokerState.available.friendHelp) return;
    
    const candidates = (allStudents || []).filter(s => s && s.id && !currentPlayers.includes(s.id));
    const randomFriends = [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.min(3, candidates.length));
    
    setFriendHelpFriends(randomFriends);
    setFriendHelpModalOpen(true);
    setJokerState(prev => ({
      ...prev,
      available: { ...prev.available, friendHelp: false },
      active: { ...prev.active, friendHelp: true }
    }));
  };

  const selectFriendHelper = (friend: any) => {
    setFriendHelpModalOpen(false);
    
    if (!currentQuestion?.options) return;
    
    const correctOptionText = getCorrectOptionText(currentQuestion);
    let chosenOption = correctOptionText;
    
    // Friend has a 70% chance of getting it right, 30% chance of picking a random visible alternative option
    if (Math.random() > 0.70) {
      const visibleOptions = currentQuestion.options.filter((o: string) => !jokerState.hiddenOptions.includes(o));
      if (visibleOptions.length > 0) {
        chosenOption = visibleOptions[Math.floor(Math.random() * visibleOptions.length)];
      }
    }
    
    const friendName = friend.surname && friend.surname !== 'undefined'
      ? `${friend.name} ${friend.surname}`
      : friend.name;

    setFriendAdvice({
      friendName,
      recommendedOption: chosenOption
    });
  };

  // Handles consuming the skip joker properly and executing the next transition
  const handleSkipQuestion = (onNext: () => void) => {
    if (!jokerState.available.skipQuestion) return;
    setJokerState(prev => ({
      ...prev,
      available: { ...prev.available, skipQuestion: false },
      active: { ...prev.active, skipQuestion: true }
    }));
    resetQuestionState();
    onNext();
  };

  return {
    jokerState,
    useFiftyFifty,
    useDoubleChance,
    initFriendHelp,
    selectFriendHelper,
    friendHelpModalOpen,
    setFriendHelpModalOpen,
    friendHelpFriends,
    friendAdvice,
    setFriendAdvice,
    handleOptionClick,
    resetJokersForNewTurn,
    resetQuestionState,
    handleSkipQuestion,
    setJokerState
  };
}
