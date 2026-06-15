import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  ChevronDown, 
  ChevronUp, 
  Target, 
  HelpCircle,
  Download,
  Info
} from 'lucide-react';

interface LessonOutcomesProps {
  lessonId: string;
  user: any;
  units: any[];
  outcomes: any[];
  questions: any[];
}

export const LessonOutcomes: React.FC<LessonOutcomesProps> = ({ 
  lessonId, 
  user, 
  units, 
  outcomes,
  questions 
}) => {
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const handleExportExcel = () => {
    const data = outcomes.map(outcome => {
      const unit = units.find(u => u.id === outcome.unitId);
      return {
        'Öğrenme Alanları-Üniteler/Temalar': unit?.name || '',
        'Öğrenme İçerikleri': outcome.code ? `${outcome.code} ${outcome.description}` : outcome.description,
        'Süreç Bileşenleri': outcome.processComponents || ''
      };
    });

    data.sort((a, b) => {
      return String(a['Öğrenme İçerikleri']).localeCompare(String(b['Öğrenme İçerikleri']), undefined, { numeric: true });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Öğrenme İçerikleri");
    XLSX.writeFile(workbook, `${lessonId}_ogrenme_icerikleri.xlsx`);
  };

  const getQuestionCountForOutcome = (outcomeId: string) => {
    return questions.filter(q => q.outcomeId === outcomeId).length;
  };

  const getQuestionCountForUnit = (unitId: string) => {
    return questions.filter(q => q.unitId === unitId).length;
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Info */}
      <div className="flex items-center gap-3 bg-indigo-50 text-indigo-700 p-4 rounded-2xl border border-indigo-100">
        <Info className="shrink-0" size={24} />
        <p className="text-sm font-medium">
          Bu içerikler merkezi <strong>Öğrenme İçerikleri Havuzu</strong> üzerinden gelmektedir. Sınıf seviyenize uygun içerikler sizin için otomatik olarak listelenmektedir.
        </p>
      </div>

      {/* Excel Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleExportExcel}
          className="px-5 py-2 bg-white border border-neutral-200 text-neutral-600 rounded-xl font-bold text-xs hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-2 shadow-sm"
        >
          <Download size={14} />
          Excel İndir
        </button>
      </div>

      {/* Units List */}
      <div className="space-y-3">
        {units.length === 0 ? (
           <div className="text-center py-10 bg-neutral-50 rounded-3xl border border-neutral-100 text-neutral-400 font-medium">
             Sınıf seviyeniz için bu derse ait öğrenme içeriği bulunmuyor.
           </div>
        ) : (
          units.map((unit) => {
            const isExpanded = expandedUnits[unit.id] ?? false;
            const unitOutcomes = outcomes.filter(o => o.unitId === unit.id);
            
            return (
              <div key={unit.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
                {/* Unit Header */}
                <div 
                  onClick={() => toggleUnit(unit.id)}
                  className="p-4 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/50 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-black text-sm">
                      {unit.order}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-neutral-900 dark:text-white">{unit.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                          {unitOutcomes.length} Öğrenme İçeriği
                        </span>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                          <HelpCircle size={10} />
                          {getQuestionCountForUnit(unit.id)} Soru
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <div className="ml-2 p-1 text-neutral-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Outcomes Section (Collapsible) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-neutral-50"
                    >
                      <div className="p-4 space-y-1.5">
                        {unitOutcomes.map((outcome) => (
                          <div key={outcome.id} className="group flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all">
                            <div className="mt-1">
                              <Target size={14} className="text-indigo-400" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                {outcome.code && (
                                  <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[9px] font-black rounded">
                                    {outcome.code}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                                  <HelpCircle size={10} />
                                  {getQuestionCountForOutcome(outcome.id)} Soru
                                </span>
                              </div>
                              <p className="text-neutral-700 dark:text-neutral-300 text-sm font-medium leading-snug">
                                {outcome.description}
                              </p>
                              {outcome.processComponents && (
                                <div className="mt-1 flex flex-col">
                                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Süreç Bileşenleri:</span>
                                  <span className="text-xs text-indigo-700 dark:text-indigo-300 italic leading-tight">
                                    {outcome.processComponents}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

