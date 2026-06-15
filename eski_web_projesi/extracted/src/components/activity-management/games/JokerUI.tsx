import React from 'react';
import { Users, SplitSquareHorizontal, CheckSquare, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { JokerState } from './useJokers';

export const JokerToolbar = ({
  state,
  onFiftyFifty,
  onDoubleChance,
  onSkip,
  onFriendHelp,
  size = 'md'
}: {
  state: JokerState;
  onFiftyFifty: () => void;
  onDoubleChance: () => void;
  onSkip: () => void;
  onFriendHelp: () => void;
  size?: 'sm' | 'md' | 'lg';
}) => {

  const jokers = [
    {
      id: 'friendHelp',
      icon: Users,
      label: 'Arkadaş',
      available: state.available.friendHelp,
      active: state.active.friendHelp,
      color: 'bg-pink-100 text-pink-600',
      activeColor: 'bg-pink-500 text-white shadow-lg shadow-pink-500/30',
      onClick: onFriendHelp
    },
    {
      id: 'fiftyFifty',
      text: '%50',
      label: 'Yarı Yarıya',
      available: state.available.fiftyFifty,
      active: state.active.fiftyFifty,
      color: 'bg-blue-100 text-blue-600',
      activeColor: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
      onClick: onFiftyFifty
    },
    {
      id: 'doubleChance',
      text: 'X2',
      label: 'Çift Cevap',
      available: state.available.doubleChance,
      active: state.active.doubleChance,
      color: 'bg-amber-100 text-amber-600',
      activeColor: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
      onClick: onDoubleChance
    },
    {
      id: 'skipQuestion',
      icon: SkipForward,
      label: 'Pas Geç',
      available: state.available.skipQuestion,
      active: state.active.skipQuestion,
      color: 'bg-emerald-100 text-emerald-600',
      activeColor: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
      onClick: onSkip
    }
  ];

  const anyEnabled = Object.values(state.available).some(v => v) || Object.values(state.active).some(v => v);
  if (!anyEnabled) return null;

  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {jokers.map(j => {
        const show = j.available || j.active;
        if (!show && !j.active) return null;

        const btnSize = size === 'sm' ? 'w-12 h-12 rounded-xl text-sm' : size === 'lg' ? 'w-16 h-16 rounded-2xl text-lg' : 'w-14 h-14 rounded-xl text-base';
        const iconSize = size === 'sm' ? 20 : size === 'lg' ? 28 : 24;

        return (
          <motion.button
            key={j.id}
            whileHover={j.available ? { scale: 1.05 } : {}}
            whileTap={j.available ? { scale: 0.95 } : {}}
            disabled={!j.available}
            onClick={j.onClick}
            title={j.label}
            className={`${btnSize} flex items-center justify-center font-black transition-all overflow-hidden relative ${
              j.active 
                ? j.activeColor 
                : j.available
                  ? `${j.color} hover:brightness-95 cursor-pointer shadow-sm border border-black/5`
                  : 'bg-neutral-100 text-neutral-300 cursor-not-allowed opacity-50'
            }`}
          >
            {j.icon ? <j.icon size={iconSize} strokeWidth={j.active ? 3.5 : 2.5} /> : <span className="font-extrabold">{j.text}</span>}
          </motion.button>
        );
      })}
    </div>
  );
};

export const FriendHelpModal = ({ 
  isOpen, 
  friends, 
  onSelect,
  position = 'fixed'
}: { 
  isOpen: boolean; 
  friends: any[]; 
  onSelect: (f: any) => void;
  position?: 'fixed' | 'absolute';
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${position} inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-none`}>
       <motion.div
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
       >
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 opacity-5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Users size={32} />
          </div>
          
          <h3 className="text-2xl font-black mb-2 text-neutral-800 tracking-tight">Arkadaş Yardımı</h3>
          <p className="text-neutral-500 mb-8 font-medium">Bu soruyu senin yerine cevaplaması için 3 arkadaşından birini seç!</p>
          
          <div className="grid grid-cols-1 gap-3">
            {friends.map(f => (
              <button
                key={f.id}
                onClick={() => onSelect(f)}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-neutral-100 hover:border-pink-200 bg-neutral-50 hover:bg-pink-50 hover:text-pink-700 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-600 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 group-hover:border-pink-300 group-hover:text-pink-600">
                  {f.name.charAt(0)}
                </div>
                <span className="font-bold text-lg text-neutral-800">{f.name} {f.surname && f.surname !== 'undefined' ? f.surname : ''}</span>
              </button>
            ))}
          </div>
       </motion.div>
    </div>
  );
};

export const FriendAdviceModal = ({ 
  isOpen, 
  friendName, 
  recommendedOption, 
  onClose,
  onApply,
  position = 'fixed'
}: { 
  isOpen: boolean; 
  friendName: string; 
  recommendedOption: string; 
  onClose: () => void;
  onApply: () => void;
  position?: 'fixed' | 'absolute';
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${position} inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-none`}>
       <motion.div
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
       >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Users size={32} />
          </div>
          
          <h3 className="text-2xl font-black mb-2 text-neutral-800 tracking-tight">{friendName} Diyor Ki:</h3>
          <p className="text-neutral-500 mb-6 font-medium">"Bence doğru cevap <span className="text-emerald-600 font-extrabold text-xl">'{recommendedOption}'</span> olmalı!"</p>
          
          <div className="flex flex-col gap-3 justify-center items-center w-full mt-4">
            <button
              onClick={onApply}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            >
              Tavsiyeyi Uygula
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              Kendim Karar Vereceğim
            </button>
          </div>
       </motion.div>
    </div>
  );
};
