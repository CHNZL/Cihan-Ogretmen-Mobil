import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, HelpCircle, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useGlobalOutcomes } from '../../hooks/useGlobalOutcomes';

interface ExamCreateProps {
  lessonId: string;
  lessonLabel: string;
  user: any;
  onBack: () => void;
  lessonIds?: string[];
}

export const ExamCreate: React.FC<ExamCreateProps> = ({ lessonId, lessonLabel, user, onBack, lessonIds: providedLessonIds }) => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  
  // selections map: ONLY for outcomeId! value = { selected: boolean, count: number, type: string }
  const [selections, setSelections] = useState<Record<string, { selected: boolean, count: number, type: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  const lessonIdsList = React.useMemo(() => {
    const baseIds = providedLessonIds || [lessonId];
    const ids = [...baseIds];
    
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

  const { units, outcomes, loading: outcomesLoading } = useGlobalOutcomes(lessonIdsList, user);

  useEffect(() => {
    if (!user) return;
    
    const finalLessonIds = lessonIdsList;

    const localQuestionsRef = collection(db, `users/${user.uid}/lessonQuestions`);
    const qLocal = query(localQuestionsRef, where('lessonId', 'in', finalLessonIds));
    
    // We also need className/grade to fetch global questions. Assuming 3rd grade default for exams if not available
    const grade = '3'; // Hardcoding or picking from context? Let's check users.
    const globalQuestionsRef = collection(db, `globalQuestions`);
    const qGlobal = query(globalQuestionsRef, where('lessonId', 'in', finalLessonIds));

    let localQ: any[] = [];
    let globalQ: any[] = [];

    const mergeQuestions = () => {
      const purelyLocal = localQ.filter(lq => !lq.isOverride && lq.lessonId);
      const merged = globalQ.map(gq => {
        const override = localQ.find(lq => lq.id === gq.id);
        if (override) {
          if (override.deleted) return null;
          return { ...gq, ...override };
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
  }, [user, lessonId, providedLessonIds, lessonIdsList]);

  const handleToggleUnit = (unitId: string, isCurrentlySelected: boolean) => {
    const unitOutcomes = outcomes.filter(o => o.unitId === unitId);
    if (unitOutcomes.length === 0) return; // units without outcomes can't be selected in this logic

    setSelections(prev => {
      const next = { ...prev };
      const newSelectedState = !isCurrentlySelected;
      unitOutcomes.forEach(o => {
        // Soru havuzunda soru olmayan içerikler seçilemesin
        const hasQuestions = questions.some(q => q.outcomeId === o.id);
        if (!hasQuestions && newSelectedState) return;

        const current = next[o.id] || { selected: false, count: 1, type: 'Rastgele' };
        next[o.id] = { ...current, selected: newSelectedState };
      });
      return next;
    });
  };

  const handleToggleOutcome = (outcomeId: string) => {
    // Soru havuzunda soru olmayan içerikler seçilemesin
    const hasQuestions = questions.some(q => q.outcomeId === outcomeId);
    if (!hasQuestions) return;

    setSelections(prev => {
      const next = { ...prev };
      const current = next[outcomeId] || { selected: false, count: 1, type: 'Rastgele' };
      next[outcomeId] = { ...current, selected: !current.selected };
      return next;
    });
  };

  const handleChangeCount = (outcomeId: string, count: number) => {
    const availableQsCount = questions.filter(q => q.outcomeId === outcomeId).length;
    const finalCount = Math.min(Math.max(1, count), availableQsCount);
    
    setSelections(prev => {
      const next = { ...prev };
      if (!next[outcomeId]) next[outcomeId] = { selected: true, count: finalCount, type: 'Rastgele' };
      else next[outcomeId].count = finalCount;
      return next;
    });
  };

  const handleChangeType = (outcomeId: string, type: string) => {
    setSelections(prev => {
      const next = { ...prev };
      if (!next[outcomeId]) next[outcomeId] = { selected: true, count: 1, type };
      else next[outcomeId].type = type;
      return next;
    });
  };

  const totalQuestions = Object.values(selections).reduce((acc, curr: any) => {
    return curr.selected ? acc + curr.count : acc;
  }, 0);

  const handleSave = async () => {
    if (!title.trim()) { 
      alert('Sınavı kaydetmeden önce lütfen bir DERS SINAV ADI belirleyiniz. (Örn: 1. Dönem 1. Yazılı)'); 
      return; 
    }
    if (totalQuestions === 0) { 
      alert('Sınava eklenecek soru bulunamadı. Lütfen listeden en az bir içerik seçerek soru adedini belirtin.'); 
      return; 
    }

    setIsSaving(true);
    try {
      const finalSelections = Object.entries(selections)
        .filter(([_, data]: [string, any]) => data.selected)
        .map(([id, data]: [string, any]) => {
            const outcome = outcomes.find(o => o.id === id);
            return {
                id,
                count: data.count,
                type: data.type,
                name: outcome ? outcome.description : 'Bilinmeyen Öğrenme İçeriği'
            };
        });

      // Soru oluşturma
      const generatedQuestions: any[] = [];
      let missingQuestionsWarning = '';

      finalSelections.forEach(config => {
        let matchingQs = questions.filter(q => q.outcomeId === config.id);

        if (config.type !== 'Rastgele') {
          matchingQs = matchingQs.filter(q => {
            if (config.type === 'Çoktan Seçmeli') return q.type === 'multiple-choice';
            if (config.type === 'Doğru / Yanlış') return q.type === 'true-false';
            if (config.type === 'Eşleştirme') return q.type === 'matching';
            if (config.type === 'Boşluk Doldurma') return q.type === 'fill-in-the-blanks';
            return true;
          });
        }

        // Shuffle
        matchingQs = matchingQs.sort(() => Math.random() - 0.5);

        if (matchingQs.length < config.count) {
          missingQuestionsWarning += `● "${config.name.substring(0, 30)}..." için bankada ${matchingQs.length} soru bulundu, ancak siz ${config.count} adet istemiştiniz.\n`;
        }

        // Sanitize question data heavily before saving
        const selectedQs = matchingQs.slice(0, config.count).map(q => ({
          text: q.text || '',
          type: q.type || 'multiple-choice',
          label: q.label || config.name,
          options: q.options ? Array.from(q.options) : [],
          pairs: q.pairs ? Array.from(q.pairs) : [],
          imageUrl: q.imageUrl || null,
          correctAnswer: q.correctAnswer || null,
          correctLetter: q.correctLetter || (q.correctAnswer ? String(q.correctAnswer).charAt(0).toUpperCase() : ''),
          unitId: q.unitId || '',
          outcomeId: q.outcomeId || '',
          sourceConfigId: config.id,
          sourceConfigName: config.name
        }));

        generatedQuestions.push(...selectedQs);
      });

      if (missingQuestionsWarning && generatedQuestions.length > 0) {
        // AI Studio iframe'lerde window.confirm engellenebiliyor ve `false` dönerek aşağıdaki kodun iptal edilmesine sebep oluyor.
        // Bu yüzden sessizce devam edeceğiz, sadece log ile yetinebiliriz ya da sonradan toast eklenebilir.
        console.warn('Eksik sorular var: ', missingQuestionsWarning);
      }

      // Final karıştırma ve kontrol
      const finalQuestions = generatedQuestions.sort(() => Math.random() - 0.5);
      
      if (finalQuestions.length === 0) {
        alert('Seçtiğiniz içeriklerde (veya belirtilen soru tiplerinde) hiç soru bulunamadı! Lütfen soru bankanızı kontrol edin.');
        setIsSaving(false);
        return;
      }

      const cleanConfig = JSON.parse(JSON.stringify(finalSelections.map(s => ({ id: s.id, count: s.count, name: s.name }))));
      const cleanQuestions = JSON.parse(JSON.stringify(finalQuestions));

      await addDoc(collection(db, `users/${user.uid}/exams`), {
        lessonId: lessonId || 'genel',
        title: title.trim(),
        totalQuestions: cleanQuestions.length,
        examConfig: cleanConfig, 
        questions: cleanQuestions,
        status: 'published',
        createdAt: serverTimestamp()
      });
      
      onBack();
    } catch (e: any) {
      console.error("Save Error ExamCreate: ", e);
      alert('Sınav veritabanına kaydedilirken beklenmedik bir hata oluştu: ' + (e?.message || 'Bilinmeyen Hata'));
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-neutral-50">
          <ArrowLeft size={20} className="text-neutral-600" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-neutral-900">Yeni Sınav Oluştur</h2>
          <p className="text-neutral-500 font-medium">Öğrenme içeriği ve ünitelerden soru adetlerini belirleyin.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-neutral-200 p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label className="block text-sm font-bold text-neutral-700 uppercase tracking-widest mb-2">
              Sınav Adı
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: 1. Dönem 1. Yazılı"
              className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div>
              <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Toplam Soru</p>
              <p className="text-4xl font-black text-indigo-700">{totalQuestions}</p>
            </div>
            <HelpCircle size={48} className="text-indigo-200" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-neutral-800 uppercase tracking-tight flex items-center gap-2">
            <Layers size={20} className="text-indigo-500" />
            Öğrenme Alanları-Üniteler/Temalar ve Öğrenme İçeriği Dağılımı
          </h3>
          
          <div className="space-y-4">
            {units.length === 0 && <p className="text-neutral-500">Bu derse ait ünite bulunamadı.</p>}
            {units.map(unit => {
              const unitOutcomes = outcomes.filter(o => o.unitId === unit.id);
              
              // Varsayılan olarak tüm ünite/içerikleri hesapla
              const isUnitFullySelected = unitOutcomes.length > 0 && unitOutcomes.every(o => selections[o.id]?.selected);
              const isUnitPartiallySelected = unitOutcomes.length > 0 && unitOutcomes.some(o => selections[o.id]?.selected) && !isUnitFullySelected;
              const unitTotalQuestions = unitOutcomes.reduce((acc, o) => acc + (selections[o.id]?.selected ? (selections[o.id]?.count || 1) : 0), 0);

                const isExpanded = expandedUnitId === unit.id;

                return (
                  <div key={unit.id} className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isUnitFullySelected || isUnitPartiallySelected ? 'border-indigo-200 bg-indigo-50/10 shadow-sm' : 'border-neutral-200 bg-neutral-50/50'
                  }`}>
                    <div 
                      className={`p-4 flex items-center justify-between border-b transition-colors ${
                        isUnitFullySelected || isUnitPartiallySelected ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Checkbox Section - ONLY for selection */}
                        <div className="flex items-center">
                          <label className="relative flex items-center justify-center cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={isUnitFullySelected} 
                              onChange={() => handleToggleUnit(unit.id, isUnitFullySelected)}
                              className="w-5 h-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer appearance-none checked:bg-indigo-600 checked:border-indigo-600 transition-all"
                            />
                            {isUnitFullySelected && <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>}
                            {isUnitPartiallySelected && <div className="absolute inset-0 flex items-center justify-center text-indigo-600 pointer-events-none border border-indigo-600 rounded bg-white"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="2" rx="1"/></svg></div>}
                            <div className="absolute -inset-2 bg-indigo-500/0 group-hover:bg-indigo-500/5 rounded-full -z-10 transition-colors" />
                          </label>
                        </div>

                        {/* Name Section - ONLY for accordion toggle */}
                        <div 
                          className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                          onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                        >
                          <span className="font-bold text-neutral-800 text-base truncate">{unit.name || 'Ad Yok'}</span>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mt-1">
                            ({unitOutcomes.length} Öğrenme İçeriği • {isExpanded ? 'Kapatmak için tıkla' : 'İçerikleri görmek için tıkla'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-neutral-200 rounded-xl shadow-sm">
                          <span className="text-sm font-black text-indigo-600 min-w-[1.5rem] text-center">{unitTotalQuestions}</span>
                          <span className="text-xs font-bold text-neutral-500 border-l border-neutral-200 pl-2">Soru Seçildi</span>
                        </div>
                        <button 
                          onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                          className={`p-1.5 rounded-full border transition-all duration-300 ${
                            isExpanded 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 rotate-180' 
                              : 'bg-white border-neutral-100 text-neutral-400 hover:border-indigo-200 hover:text-indigo-500'
                          }`}
                        >
                          <ChevronDown size={20} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Outcomes Accordion Body */}
                    {unitOutcomes.length > 0 && isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-4 space-y-3 pl-12 bg-white/50 backdrop-blur-sm"
                      >
                      {unitOutcomes.map(outcome => {
                        const outSel = selections[outcome.id] || { selected: false, count: 1, type: 'Rastgele' };
                        const availableQsCount = questions.filter(q => q.outcomeId === outcome.id).length;
                        const hasNoQuestions = availableQsCount === 0;

                        return (
                          <div key={outcome.id} className="flex items-center justify-between py-1 px-2 rounded-xl hover:bg-neutral-50 transition-colors">
                            <label className={`flex items-center gap-3 flex-1 min-w-0 ${hasNoQuestions ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <div className="relative flex items-center justify-center shrink-0">
                                <input 
                                  type="checkbox" 
                                  checked={outSel.selected && !hasNoQuestions} 
                                  disabled={hasNoQuestions}
                                  onChange={() => handleToggleOutcome(outcome.id)}
                                  className="w-4 h-4 rounded border-neutral-300 text-indigo-600 checked:bg-indigo-600 disabled:opacity-30 disabled:grayscale cursor-pointer"
                                />
                              </div>
                              <span className={`text-sm font-medium truncate ${hasNoQuestions ? 'text-rose-500 font-bold' : 'text-neutral-600'}`} title={outcome.description}>
                                {outcome.description}
                                {hasNoQuestions && <span className="ml-2 text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 italic">Soru Bankası Boş</span>}
                              </span>
                            </label>

                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              {/* Always show Max info as requested */}
                              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-all ${
                                hasNoQuestions ? 'bg-rose-50 border-rose-100 text-rose-400' : 
                                outSel.selected ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-neutral-50 border-neutral-100 text-neutral-400'
                              }`}>
                                <span className="text-[10px] font-black uppercase tracking-tighter shrink-0">Banka: {availableQsCount}</span>
                                
                                {outSel.selected && !hasNoQuestions && (
                                  <div className="flex items-center gap-2 border-l border-current pl-2">
                                    <select 
                                      value={outSel.type} 
                                      onChange={(e) => handleChangeType(outcome.id, e.target.value)}
                                      className="text-[10px] font-bold bg-transparent outline-none cursor-pointer"
                                    >
                                      <option>Rastgele</option>
                                      <option>Çoktan Seçmeli</option>
                                      <option>Doğru / Yanlış</option>
                                      <option>Eşleştirme</option>
                                      <option>Boşluk Doldurma</option>
                                    </select>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      max={availableQsCount}
                                      value={outSel.count} 
                                      onChange={(e) => {
                                          const v = parseInt(e.target.value) || 0;
                                          handleChangeCount(outcome.id, v);
                                      }}
                                      className="w-12 text-center bg-white border border-neutral-200 rounded py-0.5 text-[10px] font-black text-neutral-800 outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </motion.div>
                    )}
                  </div>
                );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Kaydediliyor...' : 'Sınavı Kaydet'}
            <Save size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
