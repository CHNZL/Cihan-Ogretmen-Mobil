import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Target, BarChart2, BookOpen, AlertCircle, Edit2, Save, X, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, writeBatch, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface ExamDetailProps {
  exam: any;
  user: any;
  students: any[];
  onBack: () => void;
}

export const ExamDetail: React.FC<ExamDetailProps> = ({ exam, user, students, onBack }) => {
  const [results, setResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'analysis_questions' | 'analysis_outcomes'>('students');

  const [isEditingStudents, setIsEditingStudents] = useState(false);
  const [studentEdits, setStudentEdits] = useState<Record<string, { answers: Record<string, string> }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || !exam) return;
    
    const resultsRef = collection(db, `users/${user.uid}/exams/${exam.id}/results`);
    const q = query(resultsRef);
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const studentMap = new Map();
      const duplicatesToDelete: string[] = [];
      fetchedResults.forEach((res: any) => {
          if (res.studentId) {
              if (studentMap.has(res.studentId)) {
                  const existing = studentMap.get(res.studentId);
                  if (res.id === res.studentId) {
                      duplicatesToDelete.push(existing.id);
                      studentMap.set(res.studentId, res);
                  } else {
                      duplicatesToDelete.push(res.id);
                  }
              } else {
                  studentMap.set(res.studentId, res);
              }
          } else {
              studentMap.set(res.id, res);
          }
      });
      
      if (duplicatesToDelete.length > 0) {
          const b = writeBatch(db);
          duplicatesToDelete.forEach(id => {
              b.delete(doc(db, `users/${user.uid}/exams/${exam.id}/results`, id));
          });
          b.commit().catch(console.error);
      }
      
      const finalResults = Array.from(studentMap.values());
      finalResults.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
      setResults(finalResults);
    });

    return () => unsubscribe();
  }, [user, exam]);

  const startEditingStudents = () => {
    const edits: Record<string, { answers: Record<string, string> }> = {};
    
    // Existing results
    results.forEach(res => {
        const answers: Record<string, string> = {};
        if (exam.questions) {
            exam.questions.forEach((q: any, idx: number) => {
                const ans = res.answers ? res.answers[idx] : null;
                answers[idx] = ans?.givenAnswer ? ans.givenAnswer.toUpperCase().trim() : '';
            });
        }
        edits[res.studentId] = { answers };
    });

    // Missing students
    const missingStudents = students.filter(s => !results.some(r => r.studentId === s.id));
    missingStudents.forEach(s => {
        const answers: Record<string, string> = {};
        if (exam.questions) {
            exam.questions.forEach((q: any, idx: number) => {
                answers[idx] = '';
            });
        }
        edits[s.id] = { answers };
    });

    setStudentEdits(edits);
    setIsEditingStudents(true);
  };

  const handleEditChange = (id: string, qIdx: number, value: string) => {
    setStudentEdits(prev => ({
        ...prev,
        [id]: {
            ...prev[id],
            answers: {
                ...prev[id].answers,
                [qIdx]: value
            }
        }
    }));
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!window.confirm("Bu öğrencinin sonucunu silmek istediğinize emin misiniz?")) return;
    if (!user || !exam) return;
    
    try {
        await deleteDoc(doc(db, `users/${user.uid}/exams/${exam.id}/results`, resultId));
    } catch (e: any) {
        console.error("Silme hatası: ", e);
        alert('Silme işlemi sırasında hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
    }
  };

  const saveStudentEdits = async () => {
    if (!user || !exam) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(db);
        Object.keys(studentEdits).forEach(studentId => {
            const edited = studentEdits[studentId];
            if (!edited) return;
            
            const existingRes = results.find(r => r.studentId === studentId);
            
            // Check if all answers are blank
            const allBlank = Object.values(edited.answers).every(a => !a || (a as string).trim() === '');
            
            // If it's a new result and all answers are completely blank, don't create it
            if (!existingRes && allBlank) {
                return;
            }

            const newAnswers: Record<string, any> = existingRes ? { ...(existingRes.answers || {}) } : {};
            let correctCount = 0;
            let totalAttempted = 0;
            
            if (exam.questions) {
                exam.questions.forEach((q: any, idx: number) => {
                    const givenAnswer = edited.answers[idx] || '';
                    
                    const correctAnswerStr = q.correctAnswer ? q.correctAnswer.toUpperCase().trim() : '';
                    let correctLetter = '';
                    if (correctAnswerStr) {
                       const match = correctAnswerStr.match(/^([A-Z])[\)\.\- ]/);
                       if (match) {
                           correctLetter = match[1];
                       } else if (correctAnswerStr.length === 1) {
                           correctLetter = correctAnswerStr;
                       }
                    }

                    const isCorrect = givenAnswer !== '' && givenAnswer === correctLetter;
                    
                    if (givenAnswer !== '') {
                        totalAttempted++;
                    }
                    if (isCorrect) {
                        correctCount++;
                    }

                    if (!newAnswers[idx]) newAnswers[idx] = {};
                    newAnswers[idx].givenAnswer = givenAnswer;
                    newAnswers[idx].isCorrect = givenAnswer !== '' && isCorrect;
                });
            }
            
            const newScore = exam.questions && exam.questions.length > 0 
              ? Math.round((correctCount / exam.questions.length) * 100) 
              : 0;

            const docId = existingRes ? existingRes.id : studentId;
            const resRef = doc(db, `users/${user.uid}/exams/${exam.id}/results`, docId);
            const payload: any = {
                studentId: studentId,
                score: newScore,
                answers: newAnswers
            };
            if (!existingRes) {
                payload.createdAt = serverTimestamp();
            }
            batch.set(resRef, payload, { merge: true });
        });
        try {
            await batch.commit();
        } catch (e: any) {
            console.error("Batch commit failed. studentEdits:", JSON.stringify(studentEdits));
            throw new Error('Sonuçlar kaydedilirken izin hatası (Lütfen konsola bakın): ' + e.message);
        }
        
        try {
            // Mark exam as having results so parents can see it
            if (!exam.hasResults) {
                await updateDoc(doc(db, `users/${user.uid}/exams`, exam.id), { hasResults: true });
            }
        } catch (e: any) {
            console.error("Exam hasResults update failed", e);
        }
        
        setIsEditingStudents(false);
    } catch (e: any) {
        console.error(e);
        alert('Kaydedilirken hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
    }
    setIsSaving(false);
  };

  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
    : 0;

  const getPerformanceData = () => {
    let successCount = 0;
    let failCount = 0;
    results.forEach(r => {
      if (r.score >= 50) successCount++;
      else failCount++;
    });
    return { successCount, failCount };
  };

  const { successCount, failCount } = getPerformanceData();

  const getQuestionStats = () => {
    if (!exam.questions || results.length === 0) return [];

    return exam.questions.map((q: any, qIndex: number) => {
        let totalWrong = 0;
        let failedStudentNames: string[] = [];
        let optionCounts: Record<string, number> = {};
        let studentsByOption: Record<string, string[]> = {};
        
        // Define options (A, B, C, D...)
        const numOptions = q.options ? q.options.length : 4; 
        const letters = Array.from({length: numOptions}, (_, i) => String.fromCharCode(65 + i));
        letters.forEach(l => {
             optionCounts[l] = 0;
             studentsByOption[l] = [];
        });
        optionCounts['Boş/Geçersiz'] = 0;
        studentsByOption['Boş/Geçersiz'] = [];

        results.forEach(res => {
            const student = students.find(s => s.id === res.studentId);
            const studentName = student ? student.name : res.studentId;

            const ans = res.answers ? res.answers[qIndex] : null;
            if (!ans) {
                 optionCounts['Boş/Geçersiz']++;
                 studentsByOption['Boş/Geçersiz'].push(studentName);
                 totalWrong++;
                 failedStudentNames.push(studentName);
            } else {
                 if (!ans.isCorrect) {
                     totalWrong++;
                     failedStudentNames.push(studentName);
                 }
                 const given = ans.givenAnswer ? ans.givenAnswer.toUpperCase().trim() : '';
                 const optionKey = (given && optionCounts[given] !== undefined) ? given : 
                                   (given && letters.includes(given) ? given : 'Boş/Geçersiz');
                 
                 if (optionCounts[optionKey] === undefined) {
                     optionCounts[optionKey] = 0;
                     studentsByOption[optionKey] = [];
                 }
                 
                 optionCounts[optionKey]++;
                 studentsByOption[optionKey].push(studentName);
            }
        });

        // Ensure we capture all valid letters even if some options were added dynamically
        const allUsedLetters = Array.from(new Set([...letters, ...Object.keys(optionCounts).filter(k => k !== 'Boş/Geçersiz' && (k.length === 1 && k >= 'A' && k <= 'Z'))])).sort();

        // Extract correct letter from the string (like 'A) Apple' -> 'A')
        const correctAnswerStr = q.correctAnswer ? q.correctAnswer.toUpperCase().trim() : '';
        let correctLetter = '';
        if (correctAnswerStr) {
           const match = correctAnswerStr.match(/^([A-Z])[\)\.\- ]/);
           if (match) {
               correctLetter = match[1];
           } else if (correctAnswerStr.length === 1) {
               correctLetter = correctAnswerStr;
           }
        }

        return {
            qIndex,
            correctAnswer: correctAnswerStr,
            correctLetter,
            totalWrong,
            failedStudentNames,
            optionCounts,
            studentsByOption,
            letters: allUsedLetters,
        };
    });
  };

  const getOutcomeStats = () => {
    if (!exam.examConfig || results.length === 0) return [];
    
    return exam.examConfig.map((config: any, idx: number) => {
        const matchingQs = exam.questions?.reduce((acc: number[], q: any, i: number) => {
              const matchById = (q.outcomeId && config.id && q.outcomeId === config.id) || (q.outcomeId && config.outcomeId && q.outcomeId === config.outcomeId);
              const matchByName = (q.outcomeName && config.name && q.outcomeName === config.name) || (q.outcomeName && config.title && q.outcomeName === config.title);
              const matchByTitle = (q.outcomeTitle && config.title && q.outcomeTitle === config.title) || (q.outcomeTitle && config.name && q.outcomeTitle === config.name);
 
              if (matchById || matchByName || matchByTitle) {
                 acc.push(i);
              }
              return acc;
        }, []) || [];
 
        let totalQuestionsAttempted = 0;
        let totalCorrect = 0;
 
        results.forEach(res => {
            matchingQs.forEach((qIdx: number) => {
                totalQuestionsAttempted++;
                if (res.answers && res.answers[qIdx] && res.answers[qIdx].isCorrect) {
                    totalCorrect++;
                }
            });
        });
 
        return {
            config,
            idx,
            matchingQs,
            totalQuestionsAttempted,
            totalCorrect,
            successRate: totalQuestionsAttempted > 0 ? Math.round((totalCorrect / totalQuestionsAttempted) * 100) : 0
        };
    });
  };

  const questionStats = getQuestionStats();
  const outcomeStats = getOutcomeStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-neutral-50">
          <ArrowLeft size={20} className="text-neutral-600" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-neutral-900">{exam.title} - Detaylı Analiz</h2>
          <p className="text-neutral-500 font-medium">
            {exam.date || (exam.createdAt ? new Date(exam.createdAt.toDate()).toLocaleDateString('tr-TR') : '')} • Sınıf bazlı ve bireysel sonuçları görüntüleyin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Katılım</p>
            <p className="text-3xl font-black text-neutral-800">{results.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Trophy size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Sınıf Ortalaması</p>
            <p className="text-3xl font-black text-neutral-800">{averageScore}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <Target size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Başarı Durumu</p>
            <div className="flex gap-4 mt-1 font-bold">
              <span className="text-emerald-500">{successCount} Başarılı</span>
              <span className="text-red-500">{failCount} Geliştirilmeli</span>
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden mt-8">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 p-2 bg-neutral-50/50 border-b border-neutral-100 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors whitespace-nowrap ${
                activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
              }`}
            >
              <Users size={18} />
              Öğrenci Listesi
            </button>
            <button 
              onClick={() => setActiveTab('analysis_questions')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors whitespace-nowrap ${
                activeTab === 'analysis_questions' ? 'bg-white text-emerald-600 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
              }`}
            >
              <BarChart2 size={18} />
              Soru Analizi
            </button>
            <button 
              onClick={() => setActiveTab('analysis_outcomes')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors whitespace-nowrap ${
                activeTab === 'analysis_outcomes' ? 'bg-white text-purple-600 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
              }`}
            >
              <BookOpen size={18} />
              Öğrenme İçerikleri Analizi
            </button>
          </div>

          <div className="p-0">
            <AnimatePresence mode="wait">
              {activeTab === 'students' && (
                <motion.div 
                  key="students"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-x-auto relative"
                >
                  <div className="flex justify-end p-4 border-b border-neutral-100 bg-neutral-50/30">
                    {isEditingStudents ? (
                       <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setIsEditingStudents(false)}
                             className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors flex items-center gap-2"
                             disabled={isSaving}
                           >
                             <X size={16} /> İptal
                           </button>
                           <button 
                             onClick={saveStudentEdits}
                             className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                             disabled={isSaving}
                           >
                             <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                           </button>
                       </div>
                    ) : (
                       <button 
                         onClick={startEditingStudents}
                         className="px-4 py-2 text-sm font-bold bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                       >
                         <Edit2 size={16} /> Listeyi Düzenle
                       </button>
                    )}
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50/50 border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest break-words">Öğrenci Adı</th>
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Puan</th>
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Cevaplar</th>
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest w-16">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {(() => {
                        const displayList = isEditingStudents 
                          ? students.map(s => {
                              const res = results.find(r => r.studentId === s.id);
                              return { student: s, res: res || { id: s.id, studentId: s.id, score: 0, answers: {} }, isMissing: !res };
                            }).sort((a,b) => (parseInt(a.student.studentNo)||0) - (parseInt(b.student.studentNo)||0))
                          : results.map(res => ({ student: students.find(s => s.id === res.studentId), res, isMissing: false }));

                        return displayList.map(({student, res, isMissing}, idx) => {
                          const studentName = student ? `${student.studentNo ? `(${student.studentNo}) ` : ''}${student.name}` : res.studentId;
                          
                          const edited = studentEdits[res.studentId || res.id];

                          // Calculate dynamic score during edit
                          let currentScore = res.score;
                          if (isEditingStudents && edited && exam.questions) {
                              let correctCount = 0;
                              exam.questions.forEach((q: any, qidx: number) => {
                                  const givenAnswer = edited.answers[qidx] || '';
                                  const correctAnswerStr = q.correctAnswer ? q.correctAnswer.toUpperCase().trim() : '';
                                  let correctLetter = '';
                                  if (correctAnswerStr) {
                                     const match = correctAnswerStr.match(/^([A-Z])[\)\.\- ]/);
                                     if (match) {
                                         correctLetter = match[1];
                                     } else if (correctAnswerStr.length === 1) {
                                         correctLetter = correctAnswerStr;
                                     }
                                  }
                                  if (givenAnswer !== '' && givenAnswer === correctLetter) {
                                      correctCount++;
                                  }
                              });
                              currentScore = Math.round((correctCount / exam.questions.length) * 100);
                          }

                          return (
                            <tr key={res.id || idx} className={`hover:bg-neutral-50 transition-colors ${isMissing ? 'bg-rose-50/30' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="font-bold text-neutral-900 truncate max-w-[150px] md:max-w-none">
                                    {studentName}
                                    {isMissing && <span className="ml-2 text-xs font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">Sınavı Yok</span>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-xl font-black text-sm ${
                                    currentScore >= 85 ? 'bg-emerald-100 text-emerald-700' :
                                    currentScore >= 50 ? 'bg-amber-100 text-amber-700' : 
                                    (isMissing && !edited) ? 'bg-neutral-100 text-neutral-400' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isMissing && currentScore === 0 ? '-' : currentScore}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                {isEditingStudents && edited ? (
                                    <div className="flex flex-wrap gap-2">
                                      {exam.questions?.map((q: any, qidx: number) => (
                                        <div key={qidx} className="flex items-center gap-1">
                                          <span className="text-[10px] font-black text-neutral-400">{qidx + 1})</span>
                                          <input 
                                            type="text"
                                            maxLength={1}
                                            value={edited.answers[qidx] || ''}
                                            onChange={(e) => handleEditChange(res.studentId || res.id, qidx, e.target.value.toUpperCase().replace(/[^A-E]/g, ''))}
                                            placeholder="-"
                                            className="w-7 h-7 text-center rounded border border-neutral-300 text-xs font-black text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {isMissing ? (
                                        <span className="text-sm font-medium text-neutral-400">Sonuç girilmemiş</span>
                                      ) : exam.questions?.map((q: any, qidx: number) => {
                                        const ansItem = res.answers ? res.answers[qidx] : null;
                                        const isCorrect = ansItem?.isCorrect ?? false;
                                        const givenAns = ansItem?.givenAnswer ? ansItem.givenAnswer.toUpperCase().trim() : '-';
                                        return (
                                          <span 
                                            key={qidx} 
                                            title={`Doğru Cevap: ${q.correctAnswer || '-'}`}
                                            className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border cursor-help ${
                                              isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                              givenAns === '-' ? 'bg-neutral-50 text-neutral-500 border-neutral-100' : 
                                              'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}
                                          >
                                            {qidx + 1}){givenAns}
                                          </span>
                                        );
                                      })}
                                    </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {!isMissing && (
                                  <button
                                    onClick={() => handleDeleteResult(res.id)}
                                    className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                    title="Sonucu Sil"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </motion.div>
              )}

              {activeTab === 'analysis_questions' && (
                <motion.div
                  key="analysis_questions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-x-auto"
                >
                  <table className="w-full text-center">
                    <thead className="bg-neutral-50/50 border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-left">Soru</th>
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Doğru Cevap</th>
                        <th className="px-6 py-4 text-xs font-black text-red-400 uppercase tracking-widest">Kayıp (Yanlış/Boş)</th>
                        {/* Dinamik Şık Başlıkları */}
                        {questionStats[0]?.letters.map((letter: string) => (
                           <th key={letter} className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">
                             {letter}
                           </th>
                        ))}
                        <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Boş/G.siz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {questionStats.map((stat: any) => (
                        <tr key={stat.qIndex} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-left font-bold text-neutral-900 leading-tight">
                            <div>{stat.qIndex + 1}.</div>
                            <div>Soru</div>
                          </td>
                          <td className="px-6 py-4 text-left font-black text-emerald-600 max-w-[250px]">{stat.correctAnswer}</td>
                          <td className="px-6 py-4 font-black">
                            {stat.totalWrong > 0 ? (
                              <span 
                                className="text-red-500 bg-red-50 px-3 py-1 rounded-lg cursor-help transition-colors hover:bg-red-100"
                                title={stat.failedStudentNames.join('\n')}
                              >
                                {stat.totalWrong} Kişi
                              </span>
                            ) : (
                              <span className="text-neutral-300">-</span>
                            )}
                          </td>
                          {stat.letters.map((letter: string) => {
                            const count = stat.optionCounts[letter] || 0;
                            const isCorrectAnswer = stat.correctLetter === letter;
                            const tooltip = (!isCorrectAnswer && count > 0 && stat.studentsByOption[letter]?.length > 0) 
                                ? stat.studentsByOption[letter].join('\n') 
                                : undefined;
                            
                            return (
                              <td key={letter} className="px-6 py-4 font-bold">
                                {count > 0 ? (
                                  <span 
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${isCorrectAnswer ? 'bg-emerald-500 text-white' : 'bg-red-100 text-red-700 cursor-help'}`}
                                    title={tooltip}
                                  >
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-neutral-300">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-6 py-4 font-bold">
                            {stat.optionCounts['Boş/Geçersiz'] > 0 ? (
                              <span 
                                className="text-neutral-500 bg-neutral-100 px-3 py-1 rounded-lg shadow-sm cursor-help"
                                title={stat.studentsByOption['Boş/Geçersiz']?.join('\n')}
                              >
                                {stat.optionCounts['Boş/Geçersiz']}
                              </span>
                            ) : (
                              <span className="text-neutral-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}

              {activeTab === 'analysis_outcomes' && (
                <motion.div
                  key="analysis_outcomes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  {exam.examConfig && exam.examConfig.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {outcomeStats.map((stat: any) => (
                        <div key={stat.idx} className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 flex flex-col relative overflow-hidden">
                          {/* Success Rate Background Bar */}
                          <div 
                            className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 transition-all duration-1000" 
                            style={{ width: `${stat.successRate}%` }}
                          />
                          
                          <div className="flex items-center justify-between mb-4 border-b border-neutral-200/60 pb-3 h-10">
                            <span className="text-xs font-black text-purple-600 uppercase tracking-tighter bg-purple-100 px-3 py-1.5 rounded-xl">Öğrenme İçeriği {stat.idx + 1}</span>
                            <span className="bg-white px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-black text-neutral-600 shadow-sm">
                              {stat.matchingQs.length > 0 ? `Toplam ${stat.matchingQs.length} Soru` : `Toplam ${stat.config.count} Soru`}
                            </span>
                          </div>
                          
                          <p className="text-sm font-bold text-neutral-800 line-clamp-3 mb-4 leading-snug flex-1" title={stat.config.name}>
                            {stat.config.name}
                          </p>
                          
                          <div className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1 mb-1">Sınıf Başarısı</p>
                                <p className="text-2xl font-black text-neutral-900">
                                   %{stat.successRate}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-neutral-50 flex items-center justify-center shrink-0" 
                                style={{
                                    background: `conic-gradient(from 0deg, ${
                                        stat.successRate >= 80 ? '#10b981' : stat.successRate >= 50 ? '#f59e0b' : '#ef4444'
                                    } ${stat.successRate * 3.6}deg, #f5f5f5 ${stat.successRate * 3.6}deg 360deg)`
                                }}
                            >
                                <span className={`text-xs font-black ${
                                    stat.successRate >= 80 ? 'text-emerald-600' : stat.successRate >= 50 ? 'text-amber-500' : 'text-red-500'
                                } bg-white w-8 h-8 rounded-full justify-center flex items-center`}>
                                    {stat.successRate}
                                </span>
                            </div>
                          </div>
                          
                          {stat.matchingQs && stat.matchingQs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                              {stat.matchingQs.map((qIndex: number) => (
                                <span key={qIndex} className="text-[10px] font-black text-neutral-600 bg-neutral-100 px-2 py-1 rounded-lg">
                                  {qIndex + 1}. Soru
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      Bu sınav için öğrenme içeriği verisi bulunmuyor.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden mt-8 p-12 text-center text-neutral-500 flex flex-col items-center justify-center">
            <AlertCircle size={48} className="text-neutral-300 mb-4" />
            <h3 className="text-lg font-bold text-neutral-800 mb-2">Henüz Sonuç Yok</h3>
            <p>Öğrenci sonuçlarını görmek için kağıt okuma işlemini tamamlayın.</p>
        </div>
      )}
    </div>
  );
};

