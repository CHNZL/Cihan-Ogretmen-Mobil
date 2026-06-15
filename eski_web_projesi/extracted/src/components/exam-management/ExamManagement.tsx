import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, ArrowLeft, Save, Trash2, Printer, Upload, Edit2, X } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { ExamCreate } from './ExamCreate';
import { PrintableExam } from './PrintableExam';
import { ExamResultUpload } from './ExamResultUpload';
import { ExamDetail } from './ExamDetail';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGlobalOutcomes } from '../../hooks/useGlobalOutcomes';

interface ExamManagementProps {
  lessonId: string;
  lessonLabel: string;
  students: any[];
  user: any;
  userProfile?: any;
  lessonIds?: string[];
}

export const ExamManagement: React.FC<ExamManagementProps> = ({ lessonId, lessonLabel, students, user, userProfile, lessonIds: providedLessonIds }) => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const selectedExam = exams.find(e => e.id === selectedExamId) || null;
  const [printingExam, setPrintingExam] = useState<any>(null);
  const [uploadingExam, setUploadingExam] = useState<any>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [editTitleBuffer, setEditTitleBuffer] = useState('');
  const [editDateBuffer, setEditDateBuffer] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [optionCount, setOptionCount] = useState<3 | 4>(3);
  const [questionCount, setQuestionCount] = useState<5 | 10>(5);
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

  const { units: availableUnits, outcomes: availableOutcomes, loading: outcomesLoading } = useGlobalOutcomes(lessonIdsList, user);

  const handleOpenAiModal = async () => {
    if (outcomesLoading) {
      toast.loading('Öğrenme İçerikleri yükleniyor, lütfen bekleyin...', { duration: 1500 });
      return;
    }
    
    try {
      if (availableOutcomes.length === 0) {
        alert('AI ile sınav oluşturabilmek için önce bu derse ait Öğrenme İçeriklerinin bulunması gerekmektedir.');
        return;
      }

      setSelectedOutcomes([]); // Default select none
      setShowAiModal(true);
    } catch(err: any) {
      console.error(err);
      alert('Öğrenme İçerikleri alınırken bir hata oluştu: ' + (err.message || String(err)));
    }
  };

  const handleGenerateAiExam = async () => {
    if (selectedOutcomes.length === 0) {
       alert("Lütfen testin hazırlanacağı en az 1 öğrenme içeriği seçin.");
       return;
    }
    
    setIsGeneratingAi(true);
    try {
      const chosenOutcomes = availableOutcomes.filter(o => selectedOutcomes.includes(o.id));
      const outcomeTexts = chosenOutcomes.map((o: any) => o.description).join('\n');

      const apiKey = localStorage.getItem('user_gemini_api_key');
      if (!apiKey) {
        toast.error('AI kullanabilmek için Lütfen sağ üstteki Profil menüsünden (Profil ve Ayarlar) Gemini API anahtarınızı girin.');
        setIsGeneratingAi(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Sen ilkokul öğrencilerine hitap eden Cihan Öğretmen adında tatlı bir yapay zekasın. 
Aşağıdaki Öğrenme İçeriklerine uygun tam ${questionCount} soruluk, seviyeye uygun, eğlenceli ve anlaşılır bir çoktan seçmeli 'Mini Öğrenme İçeriği Testi' (Deneme Testi) oluştur.
Öğrenciler ilkokul seviyesinde olduğu için soruların ${optionCount} şıkkı (${optionCount === 3 ? "A, B, C" : "A, B, C, D"}) olsun. 

SADECE VE SADECE AŞAĞIDAKİ JSON FORMATINDA YANIT VER. BAŞKA HİÇBİR METİN VEYA AÇIKLAMA YAZMA.
[
  {
    "text": "Soru metni buraya",
    "options": ["A) Şıkkı", "B) Şıkkı"${optionCount === 4 ? ', "C) Şıkkı"' : ', "C) Şıkkı"'} ${optionCount === 4 ? ', "D) Şıkkı"' : ''}],
    "correctAnswer": "A) Şıkkı"
  }
]

Öğrenme İçerikleri:
${outcomeTexts}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      });

      if (!response.text) throw new Error("JSON yanıtı boş geldi.");

      const questionsData = JSON.parse(response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());

      const finalQuestions = questionsData.map((q: any, index: number) => {
        const outcome = chosenOutcomes[index % chosenOutcomes.length];
        return {
          ...q,
          type: 'multiple-choice',
          outcomeId: outcome?.id || '',
          label: outcome?.description || `Soru ${index + 1}`,
          correctLetter: q.correctLetter || (q.correctAnswer ? String(q.correctAnswer).charAt(0).toUpperCase() : 'A')
        };
      });

      const dateStr = new Date().toLocaleDateString('tr-TR');
      
      let baseTitle = `${lessonLabel} (${dateStr})`;
      let examTitle = baseTitle;
      let counter = 2;
      
      // Ensure unique title
      while (exams.some(e => e.title === examTitle)) {
        examTitle = `${baseTitle} - ${counter}`;
        counter++;
      }

      const outcomeCounts: Record<string, number> = {};
      finalQuestions.forEach((q: any) => {
        if (q.outcomeId) {
          outcomeCounts[q.outcomeId] = (outcomeCounts[q.outcomeId] || 0) + 1;
        }
      });

      await addDoc(collection(db, `users/${user.uid}/exams`), {
        lessonId: lessonId || 'genel',
        title: examTitle,
        totalQuestions: finalQuestions.length,
        examConfig: chosenOutcomes.map((o: any) => ({
          id: o.id,
          count: outcomeCounts[o.id] || 0,
          name: o.description
        })),
        questions: finalQuestions,
        status: 'published',
        createdAt: serverTimestamp()
      });

      setShowAiModal(false);
    } catch(err: any) {
      console.error(err);
      alert('AI sınavı oluşturulurken bir hata oluştu: ' + (err.message || String(err)));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const examsRef = collection(db, `users/${user.uid}/exams`);
    const q = query(examsRef, where('lessonId', 'in', lessonIdsList));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedExams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      fetchedExams.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setExams(fetchedExams);
    }, (err) => console.error(err));

    return () => unsubscribe();
  }, [user, lessonIdsList]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/exams`, id));
      setExamToDelete(null);
    } catch (e: any) {
      console.error("Delete Error ExamManagement: ", e);
      alert('Sınav silinirken bir hata oluştu: ' + (e?.message || 'Bilinmeyen Hata'));
    }
  };

  const handleUpdateExam = async (id: string) => {
    if (!editTitleBuffer.trim()) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/exams`, id), { 
        title: editTitleBuffer,
        date: editDateBuffer 
      });
      setEditingExamId(null);
    } catch(e) {
      console.error(e);
      alert('Sınav güncellenirken bir hata oluştu.');
    }
  };

  if (printingExam) {
    return (
      <PrintableExam 
        exam={printingExam} 
        students={students} 
        userProfile={userProfile}
        onComplete={() => setPrintingExam(null)} 
        onBack={() => setPrintingExam(null)} 
      />
    );
  }

  if (view === 'create') {
    return (
      <ExamCreate 
        lessonId={lessonId} 
        lessonLabel={lessonLabel} 
        user={user} 
        onBack={() => setView('list')} 
        lessonIds={lessonIdsList}
      />
    );
  }

  if (view === 'detail' && selectedExam) {
    return (
      <ExamDetail
        exam={selectedExam}
        students={students}
        user={user}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <div className={"space-y-6 " + (printingExam ? 'no-print' : '')}>
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-xl font-black text-neutral-900">AI Sınav Oluştur</h3>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  disabled={isGeneratingAi}
                  className="p-2 hover:bg-white rounded-xl text-neutral-400 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm font-medium text-neutral-500 mb-4">
                  Sınavın hazırlanmasını istediğiniz <strong>Öğrenme İçeriklerini</strong> aşağıdan seçin. Yapay zeka, bu Öğrenme İçeriklerine uygun bir test üretecektir.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Soru Sayısı</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setQuestionCount(5)}
                        disabled={isGeneratingAi}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${questionCount === 5 ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-indigo-200'}`}
                      >
                        5 Soru
                      </button>
                      <button
                        onClick={() => setQuestionCount(10)}
                        disabled={isGeneratingAi}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${questionCount === 10 ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-indigo-200'}`}
                      >
                        10 Soru
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Şık Sayısı</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOptionCount(3)}
                        disabled={isGeneratingAi}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${optionCount === 3 ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-indigo-200'}`}
                      >
                        3 Şık (A, B, C)
                      </button>
                      <button
                        onClick={() => setOptionCount(4)}
                        disabled={isGeneratingAi}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${optionCount === 4 ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-indigo-200'}`}
                      >
                        4 Şık (A...D)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {availableUnits.length === 0 && availableOutcomes.length > 0 && (
                     <div className="space-y-2">
                      {availableOutcomes.map((outcome) => {
                        const isSelected = selectedOutcomes.includes(outcome.id);
                        return (
                          <label 
                            key={outcome.id} 
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                              isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-neutral-100 hover:border-indigo-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 shrink-0"
                              checked={isSelected}
                              disabled={isGeneratingAi}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOutcomes(prev => [...prev, outcome.id]);
                                } else {
                                  setSelectedOutcomes(prev => prev.filter(id => id !== outcome.id));
                                }
                              }}
                            />
                            <span className="text-sm font-medium text-neutral-700">{outcome.description}</span>
                          </label>
                        );
                      })}
                     </div>
                  )}
                  {availableUnits.map(unit => {
                    const unitOutcomes = availableOutcomes.filter(o => o.unitId === unit.id);
                    if (unitOutcomes.length === 0) return null;
                    const isUnitFullySelected = unitOutcomes.every(o => selectedOutcomes.includes(o.id));
                    const isUnitPartiallySelected = unitOutcomes.some(o => selectedOutcomes.includes(o.id)) && !isUnitFullySelected;
                    const isExpanded = expandedUnitId === unit.id;

                    return (
                      <div key={unit.id} className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-indigo-200 bg-indigo-50/5 shadow-sm' : 'border-neutral-200'}`}>
                        <div 
                          className={`px-4 py-3 flex items-center justify-between transition-colors ${isExpanded ? 'bg-indigo-50/50 border-b border-indigo-100' : 'bg-neutral-50 hover:bg-neutral-100'}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Checkbox Section */}
                            <div className="flex items-center">
                              <label className="relative flex items-center justify-center cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isUnitFullySelected}
                                  ref={input => { if (input) input.indeterminate = isUnitPartiallySelected; }}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const newOutcomes = [...selectedOutcomes];
                                      unitOutcomes.forEach(o => {
                                        if (!newOutcomes.includes(o.id)) newOutcomes.push(o.id);
                                      });
                                      setSelectedOutcomes(newOutcomes);
                                    } else {
                                      setSelectedOutcomes(prev => prev.filter(id => !unitOutcomes.find(o => o.id === id)));
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer appearance-none checked:bg-indigo-600 checked:border-indigo-600"
                                />
                                {isUnitFullySelected && <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>}
                                {isUnitPartiallySelected && <div className="absolute inset-0 flex items-center justify-center text-indigo-600 pointer-events-none border border-indigo-600 rounded bg-white"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="2" rx="1"/></svg></div>}
                              </label>
                            </div>

                            {/* Name Section - Expand Toggle */}
                            <div 
                              className="flex flex-col cursor-pointer flex-1 min-w-0"
                              onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                            >
                              <h4 className="font-bold text-neutral-800 text-sm truncate">{unit.name}</h4>
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{unitOutcomes.length} Öğrenme İçeriği</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                             <button 
                              onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                              className={`p-1.5 rounded-full border transition-all duration-300 ${
                                isExpanded 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 rotate-180' 
                                  : 'bg-white border-neutral-100 text-neutral-400 hover:border-indigo-200 hover:text-indigo-500'
                              }`}
                            >
                              <ChevronDown size={18} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="p-2 space-y-1 bg-white"
                          >
                            {unitOutcomes.map((outcome) => {
                              const isSelected = selectedOutcomes.includes(outcome.id);
                              return (
                                <label 
                                  key={outcome.id} 
                                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                                    isSelected ? 'bg-indigo-50/50 text-indigo-900 border border-indigo-100' : 'hover:bg-neutral-50 text-neutral-600 border border-transparent'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 shrink-0 w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={isSelected}
                                    disabled={isGeneratingAi}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedOutcomes(prev => [...prev, outcome.id]);
                                      } else {
                                        setSelectedOutcomes(prev => prev.filter(id => id !== outcome.id));
                                      }
                                    }}
                                  />
                                  <span className="text-sm font-medium leading-tight">{outcome.description}</span>
                                </label>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowAiModal(false)}
                  disabled={isGeneratingAi}
                  className="px-5 py-2.5 font-bold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleGenerateAiExam}
                  disabled={isGeneratingAi || selectedOutcomes.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingAi && <Loader2 className="animate-spin" size={18} />}
                  {isGeneratingAi ? 'Test Üretiliyor...' : 'Testi Üret'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {uploadingExam && (
        <ExamResultUpload
          exam={uploadingExam}
          students={students}
          user={user}
          onClose={() => setUploadingExam(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 tracking-tight">
            {lessonLabel} Sınavları
          </h2>
          <p className="text-neutral-500 font-medium">Sınav oluşturun, yazdırın ve sonuçları değerlendirin.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleOpenAiModal}
            disabled={isGeneratingAi}
            className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold hover:bg-amber-200 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAi ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            <span>AI Mini Test Üret</span>
          </button>
          
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Sınav Oluştur</span>
          </button>
        </div>
      </div>

      {/* Exam List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[2.5rem]">
            <div className="w-16 h-16 bg-neutral-50 flex items-center justify-center rounded-2xl mb-4">
              <FileText size={32} className="text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-800 mb-2">Sınav Bulunamadı</h3>
            <p className="text-neutral-500 text-center max-w-sm">
              Bu ders için henüz bir sınav oluşturmamışsınız. Yukarıdaki butonu kullanarak ilk sınavınızı hazırlayabilirsiniz.
            </p>
          </div>
        ) : (
          exams.map((exam) => (
            <div 
              key={exam.id} 
              onClick={() => { setSelectedExamId(exam.id); setView('detail'); }}
              className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 pr-2">
                    {editingExamId === exam.id ? (
                      <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Sınav Başlığı</label>
                          <input 
                            type="text" 
                            value={editTitleBuffer}
                            onChange={e => setEditTitleBuffer(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-bold border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateExam(exam.id); }}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Sınav Tarihi</label>
                          <input 
                            type="text" 
                            placeholder="Örn: 15 Mayıs 2024"
                            value={editDateBuffer}
                            onChange={e => setEditDateBuffer(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateExam(exam.id); }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateExam(exam.id);
                            }} 
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                          >
                            <Save size={14} /> KAYDET
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingExamId(null);
                            }} 
                            className="px-4 py-2 text-xs font-black text-neutral-400 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                          >
                            İPTAL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-neutral-900 text-lg line-clamp-1">{exam.title}</h3>
                        <p className="text-neutral-500 text-xs font-medium">
                          {exam.createdAt ? new Date(exam.createdAt.toDate()).toLocaleDateString('tr-TR') : 'Tarih Yok'} • {exam.totalQuestions} Soru
                          {exam.status === 'graded' && <span className="ml-2 text-emerald-600 font-bold">Okutuldu</span>}
                        </p>
                        {exam.examConfig && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exam.examConfig.slice(0, 3).map((c: any, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-neutral-50 text-[10px] font-bold text-neutral-400 rounded-md border border-neutral-100">
                                {c.count} Soru
                              </span>
                            ))}
                            {exam.examConfig.length > 3 && <span className="text-[10px] font-bold text-neutral-300">+{exam.examConfig.length - 3} Öğrenme İçeriği</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {editingExamId !== exam.id && (
                  <div className="flex items-center gap-1 shrink-0 z-10 relative">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditTitleBuffer(exam.title); 
                        setEditDateBuffer(exam.date || (exam.createdAt ? new Date(exam.createdAt.toDate()).toLocaleDateString('tr-TR') : ''));
                        setEditingExamId(exam.id); 
                      }}
                      className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Sınavı Düzenle"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExamToDelete(exam.id); }}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Sınavı Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Confirmation Overlay */}
              <AnimatePresence>
                {examToDelete === exam.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center border-2 border-red-100"
                  >
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-3">
                      <Trash2 size={24} />
                    </div>
                    <h4 className="font-bold text-neutral-900 mb-1">Emin misiniz?</h4>
                    <p className="text-xs text-neutral-500 mb-4 px-4 font-medium">Bu işlem geri alınamaz ve tüm sınav verileri silinir.</p>
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => setExamToDelete(null)}
                        className="flex-1 py-2 bg-neutral-100 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors"
                      >
                        İptal
                      </button>
                      <button 
                        onClick={() => handleDelete(exam.id)}
                        className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                      >
                        Evet, Sil
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPrintingExam(exam); }}
                  className="relative z-10 flex-1 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Printer size={16} />
                  PDF Al
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setUploadingExam(exam); }}
                  className="relative z-10 flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors"
                >
                  <Upload size={16} />
                  Sonuç Gir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
