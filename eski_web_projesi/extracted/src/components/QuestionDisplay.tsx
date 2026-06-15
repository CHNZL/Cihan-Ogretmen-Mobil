import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, HelpCircle, Type, LayoutGrid, CheckSquare, ArrowRightLeft, Star } from 'lucide-react';

export type QuestionType = 'multiple-choice' | 'true-false' | 'matching' | 'fill-in-the-blanks';

interface QuestionDisplayProps {
  question: any;
  userAnswer: any;
  onAnswerChange: (answer: any) => void;
  onAnswerSubmit?: (answer: any) => void;
  hasSubmitted: boolean;
  isCorrect?: boolean;
  showCorrectAnswer?: boolean;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  userAnswer,
  onAnswerChange,
  onAnswerSubmit,
  hasSubmitted,
  isCorrect,
  showCorrectAnswer = true
}) => {
  if (!question) return null;

  const renderMultipleChoice = () => {
    const kahootColors = [
      'bg-rose-500 border-rose-600 shadow-rose-700',
      'bg-blue-500 border-blue-600 shadow-blue-700',
      'bg-amber-500 border-amber-600 shadow-amber-700',
      'bg-emerald-500 border-emerald-600 shadow-emerald-700',
      'bg-purple-500 border-purple-600 shadow-purple-700',
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((option: string, idx: number) => {
          const isSelected = userAnswer === option;
          const isActuallyCorrect = option === question.correctAnswer;
          const baseColor = kahootColors[idx % kahootColors.length];
          
          let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle';
          if (hasSubmitted) {
            if (isActuallyCorrect) state = 'correct';
            else if (isSelected) state = 'wrong';
          } else if (isSelected) {
            state = 'selected';
          }

          return (
            <motion.button
              key={idx}
              whileHover={!hasSubmitted ? { y: -2, scale: 1.01 } : {}}
              whileTap={!hasSubmitted ? { y: 1, scale: 0.99 } : {}}
              disabled={hasSubmitted}
              onClick={() => onAnswerChange(option)}
              className={`group relative min-h-[60px] p-3 rounded-xl border-b-[6px] text-left transition-all duration-300 flex items-center justify-between gap-3 ${
                state === 'correct' ? 'bg-emerald-500 border-emerald-600 shadow-emerald-700 text-white brightness-110 z-10 scale-[1.02]' :
                state === 'wrong' ? 'bg-rose-500 border-rose-600 shadow-rose-700 text-white opacity-90' :
                state === 'selected' ? `${baseColor} text-white brightness-110 scale-[1.01] ring-2 ring-white` :
                `${baseColor} text-white`
              } ${hasSubmitted && state === 'idle' ? 'opacity-30 scale-95 grayscale' : ''}`}
            >
              <span className="text-sm md:text-base font-bold drop-shadow-sm flex-1 leading-snug">{option}</span>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 transition-colors bg-black/20 text-white/90`}>
                {String.fromCharCode(65 + idx)}
              </div>

              <AnimatePresence>
                {hasSubmitted && isActuallyCorrect && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} className="absolute -top-2 -right-2 bg-white text-emerald-500 rounded-full p-1 shadow-md">
                    <CheckCircle2 size={24} className="fill-emerald-50" />
                  </motion.div>
                )}
                {hasSubmitted && isSelected && !isActuallyCorrect && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-1 shadow-md">
                    <XCircle size={24} className="fill-rose-50" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderTrueFalse = () => {
    return (
      <div className="flex flex-row gap-4 justify-center items-stretch max-w-xl mx-auto w-full">
        {['Doğru', 'Yanlış'].map((opt) => {
          const isSelected = userAnswer === opt;
          const isActuallyCorrect = opt === question.correctAnswer;
          const isTrue = opt === 'Doğru';
          
          let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle';
          if (hasSubmitted) {
            if (isActuallyCorrect) state = 'correct';
            else if (isSelected) state = 'wrong';
          } else if (isSelected) {
            state = 'selected';
          }

          return (
            <motion.button
              key={opt}
              whileHover={!hasSubmitted ? { y: -4, scale: 1.02 } : {}}
              whileTap={!hasSubmitted ? { y: 2, scale: 0.98 } : {}}
              disabled={hasSubmitted}
              onClick={() => onAnswerChange(opt)}
              className={`flex-1 min-h-[80px] px-4 py-4 rounded-2xl border-b-[6px] font-black text-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                state === 'correct' ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-700 brightness-110 z-10 scale-[1.02]' :
                state === 'wrong' ? 'bg-rose-500 border-rose-600 text-white shadow-rose-700 opacity-90' :
                state === 'selected' ? `${isTrue ? 'bg-blue-500 border-blue-600 shadow-blue-700' : 'bg-rose-500 border-rose-600 shadow-rose-700'} text-white brightness-110 scale-[1.02] ring-2 ring-white` :
                `${isTrue ? 'bg-blue-500 border-blue-600 shadow-blue-700' : 'bg-rose-500 border-rose-600 shadow-rose-700'} text-white`
              } ${hasSubmitted && state === 'idle' ? 'opacity-30 scale-95 grayscale' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-black/20 text-white drop-shadow-sm`}>
                {isTrue ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>
              <span className="drop-shadow-sm">{opt.toUpperCase()}</span>
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderFillInTheBlanks = () => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && userAnswer?.trim()) {
        onAnswerSubmit?.(userAnswer);
      }
    };

    return (
      <div className="max-w-md mx-auto space-y-3">
        <div className="relative">
          <input
            type="text"
            disabled={hasSubmitted}
            value={userAnswer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cevabınızı buraya yazın..."
            className={`w-full px-4 py-3 text-center text-base font-bold rounded-xl border-2 outline-none transition-all duration-300 ${
              hasSubmitted
                ? isCorrect
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                  : 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                : 'bg-white border-neutral-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
            }`}
          />
          {!hasSubmitted && userAnswer?.trim() && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onAnswerSubmit?.(userAnswer)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <CheckCircle2 size={16} />
            </motion.button>
          )}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white border border-neutral-100 rounded-full text-[9px] font-black text-neutral-400 uppercase tracking-widest">
            Cevap Alanı
          </div>
        </div>
        
        <AnimatePresence>
          {hasSubmitted && !isCorrect && showCorrectAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-center shadow-sm"
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-0.5">Doğru Cevap</span>
              <span className="text-base font-black">{question.correctAnswer}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMatching = () => {
    return <MatchingQuestion 
      question={question} 
      userAnswer={userAnswer} 
      onAnswerChange={onAnswerChange} 
      hasSubmitted={hasSubmitted} 
    />;
  };

  return (
    <div className="w-full">
      <div className="bg-white p-3 md:p-5 rounded-2xl shadow-lg border border-neutral-100 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10">
          {/* Question Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-md shrink-0">
              {question.type === 'multiple-choice' ? <LayoutGrid size={16} /> :
               question.type === 'true-false' ? <CheckSquare size={16} /> :
               question.type === 'matching' ? <ArrowRightLeft size={16} /> :
               <Type size={16} />}
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                {question.type === 'multiple-choice' ? 'Çoktan Seçmeli' :
                 question.type === 'true-false' ? 'Doğru / Yanlış' :
                 question.type === 'matching' ? 'Eşleştirme' :
                 'Boşluk Doldurma'}
              </div>
              <h3 className="text-sm md:text-base font-black text-neutral-900 leading-tight">
                {question.text}
              </h3>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex flex-col justify-center min-h-[100px] md:min-h-[120px]">
            {question.type === 'multiple-choice' && renderMultipleChoice()}
            {question.type === 'true-false' && renderTrueFalse()}
            {question.type === 'fill-in-the-blanks' && renderFillInTheBlanks()}
            {question.type === 'matching' && renderMatching()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Matching Component for complex interaction
const MatchingQuestion: React.FC<{
  question: any;
  userAnswer: any;
  onAnswerChange: (answer: any) => void;
  hasSubmitted: boolean;
}> = ({ question, userAnswer, onAnswerChange, hasSubmitted }) => {
  const [leftItems, setLeftItems] = useState<string[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);
  const [connections, setConnections] = useState<Record<string, string>>(userAnswer || {});
  const [activeStart, setActiveStart] = useState<{ id: string, x: number, y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (question.pairs) {
      setLeftItems(question.pairs.map((p: any) => p.left));
      // Shuffle right items once
      const rights = question.pairs.map((p: any) => p.right);
      setRightItems([...rights].sort(() => Math.random() - 0.5));
    }
  }, [question]);

  useEffect(() => {
    onAnswerChange(connections);
  }, [connections]);

  const handleDotClick = (id: string, side: 'left' | 'right', e: React.MouseEvent) => {
    if (hasSubmitted) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const x = rect.left + rect.width / 2 - containerRect.left;
    const y = rect.top + rect.height / 2 - containerRect.top;

    if (side === 'left') {
      if (activeStart?.id === id) {
        setActiveStart(null);
      } else {
        setActiveStart({ id, x, y });
      }
    } else {
      if (activeStart) {
        // Create connection
        setConnections(prev => {
          const newCons = { ...prev };
          // Remove any existing connection for this right item
          Object.keys(newCons).forEach(key => {
            if (newCons[key] === id) delete newCons[key];
          });
          newCons[activeStart.id] = id;
          return newCons;
        });
        setActiveStart(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activeStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const getDotPos = (id: string) => {
    const dot = dotRefs.current[id];
    const container = containerRef.current;
    if (!dot || !container) return { x: 0, y: 0 };
    const dotRect = dot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      x: dotRect.left + dotRect.width / 2 - containerRect.left,
      y: dotRect.top + dotRect.height / 2 - containerRect.top
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative select-none"
      onMouseMove={handleMouseMove}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <AnimatePresence>
          {Object.entries(connections).map(([leftId, rightId]) => {
            const start = getDotPos(leftId);
            const end = getDotPos(rightId as string);
            const isCorrect = question.pairs.find((p: any) => p.left === leftId)?.right === rightId;
            
            return (
              <motion.line
                key={`${leftId}-${rightId}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={hasSubmitted ? (isCorrect ? '#10b981' : '#f43f5e') : '#6366f1'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={hasSubmitted && !isCorrect ? "8,8" : "0"}
              />
            );
          })}
        </AnimatePresence>
        {activeStart && (
          <line
            x1={activeStart.x}
            y1={activeStart.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#6366f1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="8,8"
            className="opacity-50"
          />
        )}
      </svg>

      <div className="grid grid-cols-2 gap-4 md:gap-8 relative z-10">
        {/* Left Column */}
        <div className="space-y-2">
          {leftItems.map((item) => (
            <div key={item} className="flex items-center gap-2 justify-end">
              <div className={`flex-1 p-2.5 rounded-xl border-2 text-right font-bold text-sm transition-all leading-tight ${
                hasSubmitted 
                  ? (connections[item] && question.pairs.find((p: any) => p.left === item)?.right === connections[item] ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-rose-50 border-rose-500 text-rose-900')
                  : (connections[item] ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-neutral-100 text-neutral-700')
              }`}>
                {item}
              </div>
              <div
                ref={el => dotRefs.current[item] = el}
                onClick={(e) => handleDotClick(item, 'left', e)}
                className={`w-4 h-4 rounded-full border-[3px] cursor-pointer transition-all hover:scale-110 shrink-0 ${
                  activeStart?.id === item ? 'bg-indigo-500 border-indigo-200 scale-110' :
                  connections[item] ? 'bg-indigo-500 border-indigo-100' : 'bg-white border-neutral-200'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          {rightItems.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div
                ref={el => dotRefs.current[item] = el}
                onClick={(e) => handleDotClick(item, 'right', e)}
                className={`w-4 h-4 rounded-full border-[3px] cursor-pointer transition-all hover:scale-110 shrink-0 ${
                  Object.values(connections).includes(item) ? 'bg-indigo-500 border-indigo-100' : 'bg-white border-neutral-200'
                }`}
              />
              <div className={`flex-1 p-2.5 rounded-xl border-2 font-bold text-sm transition-all leading-tight ${
                hasSubmitted
                  ? 'bg-neutral-50 border-neutral-200 text-neutral-400'
                  : (Object.values(connections).includes(item) ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-neutral-100 text-neutral-700')
              }`}>
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {!hasSubmitted && (
        <div className="mt-4 text-center text-[10px] font-bold text-neutral-400 animate-pulse uppercase tracking-wider">
          Eşleştirmek için noktalardan tutup karşıya sürükleyin veya tıklayın.
        </div>
      )}
    </div>
  );
};
