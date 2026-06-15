import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Target, 
  HelpCircle, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  PlusCircle,
  CheckCircle2,
  BarChart3,
  ListChecks,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { LessonOutcomes } from './LessonOutcomes';
import { LessonQuestions } from './LessonQuestions';
import { LessonUnitsView } from './LessonUnitsView';

import { Student } from '../../App';
import { ActivityManagement, predefinedActivities } from '../activity-management/ActivityManagement';
import { ExamManagement } from '../exam-management/ExamManagement';
import { useGlobalOutcomes } from '../../hooks/useGlobalOutcomes';

interface LessonManagementProps {
  lessonId: string;
  lessonLabel: string;
  user: any;
  userProfile?: any;
  lessonIds?: string[];
  students?: Student[];
}

export const LessonManagement: React.FC<LessonManagementProps> = ({ lessonId, lessonLabel, user, userProfile, lessonIds: providedLessonIds, students = [] }) => {
  const [view, setView] = useState<'activities' | 'outcomes' | 'questions' | 'exams' | 'units'>('activities');
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const lessonIdsList = React.useMemo(() => {
    const baseIds = providedLessonIds || [lessonId];
    const ids = [...baseIds];
    
    // Add legacy variants for EACH base ID to ensure historical data is found
    baseIds.forEach(id => {
      if (typeof id === 'string') {
        if (id.startsWith('lesson-')) {
          const raw = id.replace('lesson-', '');
          if (!ids.includes(raw)) ids.push(raw);
        } else {
          const prefixed = `lesson-${id}`;
          if (!ids.includes(prefixed)) ids.push(prefixed);
        }
      }
    });

    return [...new Set(ids)].slice(0, 10);
  }, [lessonId, providedLessonIds]);

  const grade = React.useMemo(() => {
    let g = '1';
    const rawGrade = userProfile?.gradeLevel || userProfile?.classLevel;
    if (rawGrade) {
      const match = String(rawGrade).match(/\d+/);
      if (match) {
        g = match[0];
      }
    }
    return g;
  }, [userProfile?.gradeLevel, userProfile?.classLevel]);

  const { units, outcomes, loading: outcomesLoading } = useGlobalOutcomes(lessonIdsList, user);

  useEffect(() => {
    if (!user) return;

    const finalLessonIds = lessonIdsList;

    // Fetch global questions and user overrides
    const localQuestionsRef = collection(db, `users/${user.uid}/lessonQuestions`);
    const qLocal = query(localQuestionsRef, where('lessonId', 'in', finalLessonIds));
    
    // We also need className/grade to fetch global questions
    const globalQuestionsRef = collection(db, `globalQuestions`);
    const qGlobal = query(globalQuestionsRef, where('lessonId', 'in', finalLessonIds), where('grade', '==', grade));

    let localQ: any[] = [];
    let globalQ: any[] = [];

    const mergeQuestions = () => {
      // Find purely local ones (from legacy or created if we still allowed it)
      const purelyLocal = localQ.filter(lq => !lq.isOverride);
      
      const merged = globalQ.map(gq => {
        const override = localQ.find(lq => lq.id === gq.id);
        if (override) {
          if (override.deleted) return null;
          return { ...gq, ...override }; // override fields take precedence
        }
        return gq;
      }).filter(Boolean);

      setQuestions([...purelyLocal, ...merged] as any[]);
    };

    const unsubLocal = onSnapshot(qLocal, (snap) => {
      localQ = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeQuestions();
    }, (err) => console.error("Error listening to local questions:", err));

    const unsubGlobal = onSnapshot(qGlobal, (snap) => {
      globalQ = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeQuestions();
    }, (err) => console.error("Error listening to global questions:", err));

    return () => {
      unsubLocal();
      unsubGlobal();
    };
  }, [user, lessonIdsList]);

  // Migration for legacy questions to use global outcomes
  useEffect(() => {
    const runMigration = async () => {
      if (!user || questions.length === 0 || outcomes.length === 0) return;
      
      const unmigratedQuestions = questions.filter(q => q.outcomeId && !q.outcomeId.startsWith('o_'));
      if (unmigratedQuestions.length === 0) return;

      try {
        console.log(`Migrating ${unmigratedQuestions.length} questions to global outcomes...`);
        // Fetch legacy outcomes once to map descriptions
        const legacyOutcomesRef = collection(db, `users/${user.uid}/lessonOutcomes`);
        const legacySnap = await getDocs(legacyOutcomesRef);
        const legacyOutcomesData = legacySnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const batch = writeBatch(db);
        let migratedCount = 0;

        for (const q of unmigratedQuestions) {
          const legacyObj = legacyOutcomesData.find(l => l.id === q.outcomeId);
          if (legacyObj) {
            // Find global outcome matching the description or code
            const desc = (legacyObj as any).description;
            const globalMatch = outcomes.find(o => 
              o.description.trim().toLowerCase() === desc?.trim().toLowerCase() ||
              (o.code && o.code === (legacyObj as any).code)
            );

            if (globalMatch) {
              const qRef = doc(db, `users/${user.uid}/lessonQuestions`, q.id);
              batch.update(qRef, {
                outcomeId: globalMatch.id,
                unitId: globalMatch.unitId
              });
              migratedCount++;
            }
          }
        }
        
        if (migratedCount > 0) {
          await batch.commit();
          console.log(`Successfully migrated ${migratedCount} questions.`);
        }
      } catch (err) {
        console.error("Error migrating legacy questions:", err);
      }
    };
    
    runMigration();
  }, [questions, outcomes, user]);

  const getStats = () => {
    const totalQuestions = questions.length;
    const totalOutcomes = outcomes.length;
    const totalUnits = units.length;

    return { totalQuestions, totalOutcomes, totalUnits };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            {lessonLabel}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            {view === 'activities' ? 'Dijital Etkinlikler ve Yarışmalar' : 
             view === 'outcomes' ? 'Öğrenme Alanı ve Öğrenme İçeriği Yönetimi' : 
             view === 'exams' ? 'Sınav ve Değerlendirme Yönetimi' :
             view === 'units' ? 'Öğrenme Alanı Yönetimi' :
             'Soru Bankası'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 pr-6 border-r border-neutral-200">
            <button
              onClick={() => setView('activities')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                view === 'activities'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-100'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50 border border-neutral-100'
              }`}
            >
              <Sparkles size={16} />
              Etkinlikler
            </button>
            <button
              onClick={() => setView('exams')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                view === 'exams'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50 border border-neutral-100'
              }`}
            >
              <FileText size={16} />
              Sınavlar
            </button>
            <button
              onClick={() => setView('outcomes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                view === 'outcomes'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50 border border-neutral-100'
              }`}
            >
              <Target size={16} />
              Öğrenme İçerikleri
            </button>
            <button
              onClick={() => setView('questions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                view === 'questions'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-100'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50 border border-neutral-100'
              }`}
            >
              <HelpCircle size={16} />
              Sorular
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <Target size={14} />
              {stats.totalOutcomes} Öğrenme İçeriği
            </div>
            <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <HelpCircle size={14} />
              {stats.totalQuestions} Soru
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'activities' ? (
          <motion.div
            key="activities-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ActivityManagement 
              activityId={selectedActivityId || ''} 
              students={students} 
              user={user} 
              subject={lessonLabel}
              onBack={() => {
                if (selectedActivityId) {
                  setSelectedActivityId(null);
                }
              }}
              onSelectActivity={setSelectedActivityId}
              units={units}
              questions={questions}
              onManageQuestions={() => setView('questions')}
            />
          </motion.div>
        ) : view === 'exams' ? (
          <motion.div
            key="exams-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ExamManagement 
              lessonId={lessonId}
              lessonLabel={lessonLabel}
              students={students}
              user={user}
              userProfile={userProfile}
              lessonIds={lessonIdsList}
            />
          </motion.div>
        ) : view === 'outcomes' ? (
          <motion.div
            key="outcomes-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <LessonOutcomes 
              lessonId={lessonId} 
              user={user} 
              units={units} 
              outcomes={outcomes}
              questions={questions}
            />
          </motion.div>
        ) : (
          <motion.div
            key="questions-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <LessonQuestions 
              lessonId={lessonId} 
              lessonLabel={lessonLabel}
              user={user} 
              units={units} 
              outcomes={outcomes}
              questions={questions}
              grade={grade}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
