import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, FileUp, Download, Loader2, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { OUTCOMES } from '../../data/outcomes';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

const GRADES = ['1', '2', '3', '4'];

const SUBJECTS_BY_GRADE: Record<string, { id: string, name: string }[]> = {
  '1': [
    { id: 'hayat_bilgisi', name: 'Hayat Bilgisi' },
    { id: 'turkce', name: 'Türkçe' },
    { id: 'matematik', name: 'Matematik' }
  ],
  '2': [
    { id: 'hayat_bilgisi', name: 'Hayat Bilgisi' },
    { id: 'turkce', name: 'Türkçe' },
    { id: 'matematik', name: 'Matematik' },
    { id: 'ingilizce', name: 'İngilizce' }
  ],
  '3': [
    { id: 'hayat_bilgisi', name: 'Hayat Bilgisi' },
    { id: 'turkce', name: 'Türkçe' },
    { id: 'matematik', name: 'Matematik' },
    { id: 'fen_bilimleri', name: 'Fen Bilimleri' },
    { id: 'ingilizce', name: 'İngilizce' }
  ],
  '4': [
    { id: 'fen_bilimleri', name: 'Fen Bilimleri' },
    { id: 'sosyal_bilgiler', name: 'Sosyal Bilgiler' },
    { id: 'turkce', name: 'Türkçe' },
    { id: 'matematik', name: 'Matematik' },
    { id: 'ingilizce', name: 'İngilizce' },
    { id: 'insan_haklari', name: 'İnsan Hakları ve Demokrasi' },
    { id: 'trafik_guvenligi', name: 'Trafik Güvenliği' },
    { id: 'din_kulturu', name: 'Din Kültürü ve Ahlak Bilgisi' }
  ]
};

interface OutcomeData {
  id: string;
  code: string;
  description: string;
  processComponents?: string;
}

interface UnitData {
  id: string;
  name: string;
  order: number;
  outcomes: OutcomeData[];
}

export const OutcomesPoolManager = () => {
  const [selectedGrade, setSelectedGrade] = useState<string>('3');
  const [selectedSubject, setSelectedSubject] = useState<string>('turkce');
  const [units, setUnits] = useState<UnitData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive subjects for current grade
  const currentSubjects = SUBJECTS_BY_GRADE[selectedGrade] || [];

  useEffect(() => {
    // If the selected subject doesn't exist in the new grade's subject list, reset to the first one
    if (!currentSubjects.find(s => s.id === selectedSubject)) {
      setSelectedSubject(currentSubjects[0]?.id || '');
    }
  }, [selectedGrade]);

  useEffect(() => {
    if (selectedSubject) {
      fetchOutcomes();
    }
  }, [selectedGrade, selectedSubject]);

  const toggleUnit = (idx: number) => {
    setExpandedUnits(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const fetchOutcomes = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'globalOutcomes', `${selectedGrade}_${selectedSubject}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUnits(data.units || []);
        // Expand all by default when loaded
        const newExpanded: Record<number, boolean> = {};
        (data.units || []).forEach((_: any, idx: number) => {
          newExpanded[idx] = true;
        });
        setExpandedUnits(newExpanded);
      } else {
        // Fallback to static OUTCOMES for 3rd grade if no data yet
        const staticData = OUTCOMES[selectedGrade];
        const subjectName = currentSubjects.find(s => s.id === selectedSubject)?.name;
        if (staticData && subjectName && staticData[subjectName]) {
            const fallbackUnits = Object.entries(staticData[subjectName]).map(([name, outcomesArr], unitIdx) => ({
                id: `u_${unitIdx}`,
                name,
                order: unitIdx + 1,
                outcomes: (outcomesArr as string[]).map((desc, outIdx) => {
                  let code = '';
                  // Extract code if format is "CODE: Description" or "CODE Description"
                  let match = desc.match(/^([A-Z0-9\.]+)\s*(?::|-)?\s*(.*)$/);
                  if (match && match[2]) {
                    code = match[1];
                    desc = match[2];
                  }
                  return {
                    id: `o_${unitIdx}_${outIdx}`,
                    code,
                    description: desc
                  };
                })
            })).filter(u => u.outcomes.length > 0);
            setUnits(fallbackUnits);
            
            const newExpanded: Record<number, boolean> = {};
            fallbackUnits.forEach((_, idx) => {
              newExpanded[idx] = true;
            });
            setExpandedUnits(newExpanded);
        } else {
            setUnits([]);
            setExpandedUnits({});
        }
      }
    } catch (error) {
      console.error("Error fetching outcomes:", error);
      toast.error("Öğrenme İçerikleri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    const data: any[] = [];
    units.forEach((unit) => {
      unit.outcomes.forEach((outcome) => {
        data.push({
          'Öğrenme Alanları-Üniteler/Temalar': unit.name,
          'Öğrenme İçerikleri': outcome.code ? `${outcome.code} ${outcome.description}` : outcome.description,
          'Süreç Bileşenleri': outcome.processComponents || ''
        });
      });
    });

    if (data.length === 0) {
      data.push({ 'Öğrenme Alanları-Üniteler/Temalar': '1. TEMA: ERDEMLER', 'Öğrenme İçerikleri': 'T.3.1.1. Metinle ilgili soruları cevaplar.', 'Süreç Bileşenleri': '' });
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Öğrenme İçerikleri");
    const subjectName = currentSubjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
    XLSX.writeFile(workbook, `${selectedGrade}_Sinif_${subjectName}_Ogrenme_Icerikleri.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newUnits: UnitData[] = [];
        data.forEach((rawRow, index) => {
          // Normalize row keys to prevent trailing/leading space issues from excel
          const row: any = {};
          Object.keys(rawRow).forEach(k => {
            row[k.trim()] = rawRow[k];
          });

          const unitName = String(row['Öğrenme Alanları-Üniteler/Temalar'] || row['Ünite Adı'] || row['Ünite'] || '').trim();
          let outcomeText = String(row['Öğrenme İçerikleri'] || row['Öğrenme İçeriği'] || row['Kazanım'] || row['Kazanım Açıklaması'] || '').trim();
          let outcomeCode = String(row['Öğrenme İçeriği Kodu'] || row['Kazanım Kodu'] || '').trim();
          const processComponents = String(row['Süreç Bileşenleri'] || '').trim();
          
          if (!unitName || (!outcomeText && !outcomeCode)) return;

          let unit = newUnits.find(u => u.name === unitName);
          if (!unit) {
            const unitId = `u_${index}_${btoa(encodeURIComponent(unitName)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`;
            unit = { id: unitId, name: unitName, order: newUnits.length + 1, outcomes: [] };
            newUnits.push(unit);
          }
          
          if (!outcomeCode) {
            const match = outcomeText.match(/^([a-zA-Z0-9\.]+)\s*(?::|-)?\s*(.*)$/);
            if (match && match[2]) {
              outcomeCode = match[1];
              outcomeText = match[2];
            }
          }

          const existingOutcome = unit.outcomes.find(o => 
            (outcomeCode && o.code === outcomeCode) || 
            (!outcomeCode && o.description.toLowerCase() === outcomeText.toLowerCase())
          );

          if (existingOutcome) {
            if (processComponents) {
              if (existingOutcome.processComponents) {
                if (!existingOutcome.processComponents.includes(processComponents)) {
                  existingOutcome.processComponents += ` • ${processComponents}`;
                }
              } else {
                existingOutcome.processComponents = processComponents;
              }
            }
          } else {
            const outcomeId = `o_${index}_${btoa(encodeURIComponent(outcomeText)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15)}`;
            unit.outcomes.push({
              id: outcomeId,
              code: outcomeCode,
              description: outcomeText,
              processComponents
            });
          }
        });

        const docRef = doc(db, 'globalOutcomes', `${selectedGrade}_${selectedSubject}`);
        await setDoc(docRef, {
          grade: selectedGrade,
          subject: selectedSubject,
          units: newUnits,
          updatedAt: serverTimestamp()
        });

        setUnits(newUnits);
        
        const newExpanded: Record<number, boolean> = {};
        newUnits.forEach((_, idx) => {
          newExpanded[idx] = true;
        });
        setExpandedUnits(newExpanded);
        
        toast.success("Öğrenme İçerikleri başarıyla yüklendi.");
      } catch (err) {
        console.error("Excel import error:", err);
        toast.error("Excel yüklenirken bir hata oluştu.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3 mb-2">
              <BookOpen className="text-indigo-600 dark:text-indigo-400" />
              Öğrenme İçerikleri Havuzu Yönetimi
            </h3>
            <p className="text-neutral-500 text-sm max-w-2xl">
              Sınıf düzeylerine ve derslere göre MEB müfredat içeriklerini yönetin. Buradan yapacağınız Excel yüklemeleri (güncellemeleri), sistemdeki öğretmenlerin ders içerikleri olarak kullanabileceği ortak havuza yansıyacaktır.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
              Excel Yükle / Senkronize Et
            </button>
            <button
              onClick={handleExportExcel}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <Download size={16} />
              {units.length === 0 ? "Şablon İndir" : "Excel Yedeği İndir"}
            </button>
          </div>
        </div>

        {/* Grade Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
          {GRADES.map(grade => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`shrink-0 px-6 py-3 rounded-2xl font-bold transition-all ${
                selectedGrade === grade
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              {grade}. Sınıf
            </button>
          ))}
        </div>

        {/* Subject Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2 px-1">
          {currentSubjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                selectedSubject === subject.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                  : 'text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {subject.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-800/50 rounded-[2rem] border-2 border-dashed border-neutral-200 dark:border-neutral-700">
             <BookOpen size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
             <p className="text-neutral-500 font-medium mb-6">
               <strong className="block text-lg mb-1">{selectedGrade}. Sınıf - {currentSubjects.find(s => s.id === selectedSubject)?.name}</strong>
               Bu sınıf düzeyi ve ders için henüz öğrenme içeriği verisi eklenmemiştir.
             </p>
             <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
               <button
                 onClick={handleExportExcel}
                 className="px-6 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-sm hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2"
               >
                 <Download size={18} /> Şablonu İndir
               </button>
               <button
                 onClick={() => fileInputRef.current?.click()}
                 className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
               >
                 <FileUp size={18} /> Excel ile Yükle
               </button>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            {units.map((unit, unitIdx) => (
              <div key={unitIdx} className="border border-neutral-100 dark:border-neutral-800 rounded-[2rem] overflow-hidden bg-white dark:bg-neutral-900 transition-all">
                <button 
                  onClick={() => toggleUnit(unitIdx)}
                  className="w-full text-left bg-neutral-50 dark:bg-neutral-800/50 p-5 px-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">
                      {unitIdx + 1}
                    </span>
                    {unit.name}
                  </h4>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-neutral-400 bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                      {unit.outcomes.length} Öğrenme İçeriği
                    </span>
                    {expandedUnits[unitIdx] ? (
                      <ChevronUp className="text-neutral-400" size={20} />
                    ) : (
                      <ChevronDown className="text-neutral-400" size={20} />
                    )}
                  </div>
                </button>
                
                {expandedUnits[unitIdx] && (
                  <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                    {unit.outcomes.map((outcome, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 sm:p-4 bg-neutral-50/50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800/50 rounded-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                        <Target size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1">
                          {outcome.code && <span className="text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded w-fit font-bold">{outcome.code}</span>}
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">{outcome.description}</span>
                          {outcome.processComponents && (
                            <div className="flex flex-col mt-1">
                              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Süreç Bileşenleri:</span>
                              <span className="text-xs text-indigo-700 dark:text-indigo-300 italic">{outcome.processComponents}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
