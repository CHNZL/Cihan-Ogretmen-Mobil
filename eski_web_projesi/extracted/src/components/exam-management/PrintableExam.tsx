import React, { useEffect, useState } from 'react';
import { BookOpen, ArrowLeft, Download, Loader2, Printer } from 'lucide-react';

interface PrintableExamProps {
  exam: any;
  students: any[];
  userProfile?: any;
  onComplete: () => void;
  onBack?: () => void;
}

export const PrintableExam: React.FC<PrintableExamProps> = ({ exam, students, userProfile, onComplete, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const renderQuestionItem = (q: any, i: number, isAnswerKey?: boolean) => {
    const isMultipleChoice = q.type === 'multiple-choice' && q.options;
    
    return (
    <div className="question-item">
      <div className={`flex gap-2 text-base`}>
        <span className="font-extrabold text-neutral-900 shrink-0 font-sans text-[15px]">{i + 1}.</span>
        <div className="flex-1 font-semibold font-sans text-[14px] text-neutral-900 leading-snug" dangerouslySetInnerHTML={{ __html: q.text }} />
      </div>
      
      {q.imageUrl && (
        <div className="ml-6 py-1">
          <img 
            src={q.imageUrl} 
            alt="Soru görseli" 
            referrerPolicy="no-referrer"
            className="max-h-32 max-w-[60%] object-contain rounded-lg border border-neutral-100" 
          />
        </div>
      )}

      {isMultipleChoice && (
        <div className={`ml-6 grid grid-cols-1 gap-x-4 gap-y-1 mt-1.5 text-sm`}>
          {q.options.map((opt: string, optIdx: number) => {
            const letter = String.fromCharCode(65 + optIdx);
            const cleanOpt = opt.replace(new RegExp(`^${letter}[\\.\\)\\-\\s:]+\\s*`, 'i'), '');
            
            // Highlight correct answer if this is the answer key
            const isCorrect = isAnswerKey && q.correctAnswer && (q.correctAnswer.trim() === opt.trim() || q.correctAnswer === letter || q.correctAnswer.startsWith(`${letter})`));

            return (
              <div key={optIdx} className="flex gap-3 items-start break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <span className={`font-extrabold w-6 h-6 flex items-center justify-center rounded-full border-[1.5px] text-[13px] shrink-0 mt-[1.5px] ${isCorrect ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-800 border-neutral-400'}`}>
                  {letter}
                </span>
                <span className={`font-semibold text-[14px] leading-snug break-words mt-0.5 ${isCorrect ? 'text-neutral-900 underline decoration-2 underline-offset-2' : 'text-neutral-800'}`}>
                  {cleanOpt}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {q.type === 'true-false' && (
        <div className="ml-6 flex gap-3 mt-2">
          <div className="flex items-center gap-2 border border-neutral-200 px-3 py-1 rounded-lg bg-neutral-50/30">
            <div className={`w-6 h-6 flex items-center justify-center font-extrabold text-[13px] rounded-full border-[1.5px] ${isAnswerKey && (q.correctAnswer === 'Doğru' || q.correctAnswer?.toLowerCase() === 'true') ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-400 text-neutral-800 bg-white'}`}>D</div>
            <span className="text-[12px] font-bold text-neutral-600 uppercase tracking-wide">Doğru</span>
          </div>
          <div className="flex items-center gap-2 border border-neutral-200 px-3 py-1 rounded-lg bg-neutral-50/30">
            <div className={`w-6 h-6 flex items-center justify-center font-extrabold text-[13px] rounded-full border-[1.5px] ${isAnswerKey && (q.correctAnswer === 'Yanlış' || q.correctAnswer?.toLowerCase() === 'false') ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-400 text-neutral-800 bg-white'}`}>Y</div>
            <span className="text-[12px] font-bold text-neutral-600 uppercase tracking-wide">Yanlış</span>
          </div>
        </div>
      )}

      {q.type === 'matching' && q.pairs && (
        <div className="ml-6 grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            {q.pairs.map((p: any, pIdx: number) => (
              <div key={`left-${pIdx}`} className="flex items-center gap-3 shadow-sm border border-neutral-100 rounded-xl p-2 bg-neutral-50/50">
                <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center font-extrabold text-white text-[15px] shrink-0">{pIdx + 1}</div>
                <div className="flex-1 font-bold text-[15px] text-neutral-700">{p.left}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 relative">
            {q.pairs.map((p: any, pIdx: number) => {
              const letter = String.fromCharCode(65 + pIdx);
              return (
                <div key={`right-${pIdx}`} className="flex items-center gap-3 shadow-sm border border-neutral-100 rounded-xl p-2 bg-neutral-50/50">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-extrabold text-[15px] shrink-0 ${isAnswerKey ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-400 bg-white text-neutral-800'}`}>{letter}</div>
                  <div className="flex-1 font-bold text-[15px] text-neutral-700">{p.right}</div>
                  {isAnswerKey && (
                     <div className="absolute right-0 translate-x-4 font-extrabold text-[12px] text-neutral-900 bg-neutral-200 px-2 py-0.5 rounded-md">
                       {pIdx + 1} &rarr; {letter}
                     </div>
                  )}
                </div>
            )})}
          </div>
        </div>
      )}
    </div>
  );
  }

  const classInfo = userProfile ? `${userProfile.gradeLevel || ''} / ${userProfile.section || ''}` : '---';

  // Add the Teacher's Copy (Answer Key) at the beginning of the list
  const printItems = [
    { id: 'answer-key', name: 'CEVAP ANAHTARI', studentNo: '---', isAnswerKey: true },
    ...(students.length > 0 ? students : [])
  ];

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  if (!exam || !exam.questions) return null;

  return (
    <div className="bg-neutral-100 min-h-screen">
      {/* Non-printable Top Bar */}
      <div className="print:hidden sticky top-0 left-0 right-0 bg-white border-b border-neutral-200 z-50 p-4 shadow-sm flex items-center justify-between">
         <button 
           onClick={onBack || onComplete} 
           disabled={isGenerating}
           className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition-colors disabled:opacity-50"
         >
            <ArrowLeft size={20} />
            Geri Dön
         </button>
         <div className="text-center">
            <h2 className="text-xl font-black text-neutral-900">{exam.title} Sınavı</h2>
            <p className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full inline-block mt-1">
              {printItems.length} Öğrenci Kağıdı Hazır
            </p>
         </div>
         <div className="flex items-center gap-3">
           <button 
             onClick={handlePrint} 
             disabled={isGenerating}
             className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:bg-emerald-400"
           >
              <Printer size={24} />
              <span>Yazdır / PDF İndir</span>
           </button>
         </div>
      </div>

      {/* Information Hint */}
      <div className="print:hidden bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 p-4 shadow-sm text-center">
        <div className="flex flex-col gap-1.5 items-center justify-center text-xs font-bold text-emerald-800">
          <p className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-200 text-emerald-700">💡</span>
            <span><b className="uppercase tracking-wider">Kusursuz PDF Çıktısı Nasıl Alınır?</b></span>
          </p>
          <p className="opacity-90 max-w-2xl text-center leading-relaxed font-semibold">
            Soruların bölünmemesi ve sistemin en kaliteli çözünürlüğü verebilmesi için tarayıcınızın yerleşik yazdırma motoru kullanılmaktadır. Lütfen <b>"Yazdır / PDF İndir"</b> butonuna basıp, açılan yazdırma penceresinde <b>Hedef (Printer)</b> kutucuğundan <b>"PDF Olarak Kaydet" (Save as PDF)</b> seçeneğini işaretleyin. 
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap');

        @media print {
          html, body, #root, [class*="h-screen"], [class*="overflow"] {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
          }
          @page {
            size: A4;
            margin: 5mm;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-hidden, .print\\:hidden, .sticky {
            display: none !important;
          }
          .py-12 {
            padding: 0 !important;
            background: transparent !important;
          }
          .print-container {
            gap: 0 !important;
            display: block !important;
          }
          .a4-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
          }
          .a4-page:last-child {
            page-break-after: auto;
          }
          table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          thead td { padding-bottom: 2mm; }
          tfoot td { padding-top: 5mm; }
        }
        
        .a4-page {
          width: 210mm;
          min-height: 296mm;
          padding: 8mm 12mm;
          margin: 0 auto;
          background: white;
          position: relative;
          color: #27272a;
          font-family: 'Quicksand', system-ui, sans-serif;
          box-sizing: border-box;
          border: 1px solid #e5e7eb;
          letter-spacing: 0.01em;
        }

        .preview-shadow {
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .student-field {
          border-bottom: 2px solid #f0f0f0;
          height: 24px;
          display: flex;
          align-items: flex-end;
          padding-bottom: 2px;
          font-weight: 700;
          font-size: 13px;
          color: #1a1a1a;
        }

        .questions-container {
          width: 100%;
        }

        /* Improved spacing for professional look */
        .question-item {
          page-break-inside: avoid;
          margin-bottom: 0.75rem;
        }

        .omr-bubble {
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;
          line-height: 1;
        }
      `}</style>

      <div className="py-12 bg-neutral-200 print:bg-white transition-colors">
        <div className="print-container flex flex-col gap-12 items-center" id="exam-capture-area">
          {printItems.map((student, idx) => (
            <div key={student.id} className="a4-page print-page preview-shadow">
              <table className="w-full border-collapse table-fixed h-full">
                <colgroup>
                  <col className="w-1/2" />
                  <col className="w-1/2" />
                </colgroup>
                <thead className="table-header-group">
                  <tr>
                    <td colSpan={2} className="p-0 m-0">
                      {/* Ultra Compact Header */}
                      <div className="exam-header border-b border-neutral-900 pb-1 mb-3 flex justify-between items-end bg-white w-full relative">
                        <div className="flex-1 pr-4 mt-1">
                          <h1 className="text-[16px] leading-none font-bold uppercase text-neutral-900 tracking-tighter break-words max-w-sm mb-1 line-clamp-2">
                            {exam.title}
                          </h1>
                          <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                            SINAV NO: 1 • {exam.questions?.length || 0} SORU
                          </div>
                        </div>
                        
                        <div className="flex gap-6 items-end shrink-0 text-[10px] font-bold text-neutral-900 pb-0.5" style={{ visibility: 'hidden' }}>
                           <div className="flex items-end gap-2 border-b border-neutral-300 pb-0.5 whitespace-nowrap">
                              <span className="text-[8px] text-neutral-400 uppercase tracking-widest">AD SOYAD:</span>
                              <span className="min-w-[140px] inline-block">{student.name}</span>
                           </div>
                           <div className="flex items-end gap-2 border-b border-neutral-300 pb-0.5 whitespace-nowrap">
                              <span className="text-[8px] text-neutral-400 uppercase tracking-widest">NO:</span>
                              <span className="min-w-[40px] inline-block text-center">{student.studentNo || '---'}</span>
                           </div>
                           <div className="flex items-end gap-2 border-b border-neutral-300 pb-0.5 whitespace-nowrap">
                              <span className="text-[8px] text-neutral-400 uppercase tracking-widest">SINIF:</span>
                              <span className="min-w-[50px] inline-block text-center">{classInfo}</span>
                           </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                  {(() => {
                    const mid = Math.ceil(exam.questions.length / 2);
                    const firstHalf = exam.questions.slice(0, mid);
                    const secondHalf = exam.questions.slice(mid);
                    
                    return firstHalf.map((q: any, i: number) => {
                      const q2 = secondHalf[i] || null;

                      return (
                        <tr key={i} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                          <td className="p-0 m-0 pb-1.5 pt-1 align-top w-1/2 pr-6 border-r border-neutral-300">
                            {renderQuestionItem(q, i, student.isAnswerKey)}
                          </td>
                          <td className="p-0 m-0 pb-1.5 pt-1 w-1/2 pl-6 align-top">
                            {q2 && renderQuestionItem(q2, i + mid, student.isAnswerKey)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
                <tfoot className="table-footer-group">
                  <tr>
                    <td colSpan={2} className="pt-2">
                        <div className="flex flex-col relative break-inside-avoid bg-white border-[2px] border-neutral-900 px-2 py-1.5 rounded-lg mt-1 w-full" style={{ pageBreakInside: 'avoid' }}>
                        
                        {/* Top bar of footer: Printed Student info */}
                        <div className="flex justify-between items-center border-b-[2px] border-neutral-900 pb-1 mb-2">
                           <div className="font-black text-[13px] uppercase flex items-center gap-2">
                             <span className="text-neutral-500">AD SOYAD:</span>
                             <span className="text-[15px] tracking-wide text-neutral-900">{student.name}</span>
                           </div>
                           <div className="font-black text-[13px] uppercase flex items-center gap-2">
                             <span className="text-neutral-500">SINIF:</span>
                             <span className="text-[15px] tracking-wide text-neutral-900">{classInfo}</span>
                           </div>
                           <div className="font-black text-[13px] uppercase flex items-center gap-2">
                             <span className="text-neutral-500">OKUL NO:</span>
                             <span className="text-[15px] tracking-wide text-neutral-900">{student.studentNo || '------'}</span>
                           </div>
                        </div>

                        {/* Horizontal Coding Area for Answers */}
                        <div className="grid grid-rows-2 grid-flow-col gap-y-2.5 justify-between justify-items-center w-full px-1 pb-1">
                           {exam.questions.map((q: any, qidx: number) => {
                              let options: string[] = [];
                              if (q.type === 'multiple-choice' && q.options) {
                                  options = Array.from({length: q.options.length}).map((_, i) => String.fromCharCode(65 + i));
                              } else if (q.type === 'true-false') {
                                  options = ['D', 'Y'];
                              } else {
                                  return <div key={qidx} className="hidden" />;
                              }

                              return (
                                 <div key={qidx} className="flex items-center gap-2">
                                    <span className="font-extrabold text-[13px] w-5 text-right font-sans text-neutral-900">{qidx + 1}.</span>
                                    <div className="flex gap-1.5">
                                       {options.map((opt, optIdx) => {
                                          let isCorrect = false;
                                          if (student.isAnswerKey) {
                                              if (q.type === 'multiple-choice') {
                                                  isCorrect = !!q.correctAnswer && (q.correctAnswer.trim() === q.options[optIdx]?.trim() || q.correctAnswer === opt || q.correctAnswer.startsWith(`${opt})`));
                                              } else if (q.type === 'true-false') {
                                                  if (opt === 'D') isCorrect = q.correctAnswer === 'Doğru' || q.correctAnswer?.toLowerCase() === 'true';
                                                  if (opt === 'Y') isCorrect = q.correctAnswer === 'Yanlış' || q.correctAnswer?.toLowerCase() === 'false';
                                              }
                                          }
                                          
                                          return (
                                              <div key={opt} className={`font-extrabold w-6 h-6 flex items-center justify-center rounded-full border-[1.5px] text-[13px] shrink-0 ${isCorrect ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-800 border-neutral-400'}`}>
                                                 {opt}
                                              </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
