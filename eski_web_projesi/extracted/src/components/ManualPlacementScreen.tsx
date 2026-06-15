import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, Trash2, Search, ArrowLeft, Download, Upload, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface SeatingConfig {
  groupCount: number;
  peoplePerRow: number;
  rowsPerGroup: number[];
}

interface ManualPlacementScreenProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  config: SeatingConfig;
  seatingPlan: { [key: string]: string };
  onSave: (plan: { [key: string]: string }) => void;
  teacherProfile?: any;
  showAlert: (message: string, title?: string, type?: 'warning' | 'error' | 'success' | 'info') => void;
}

export const ManualPlacementScreen: React.FC<ManualPlacementScreenProps> = ({
  isOpen,
  onClose,
  students,
  config,
  seatingPlan: initialPlan,
  onSave,
  teacherProfile,
  showAlert
}) => {
  const [plan, setPlan] = useState<{ [key: string]: string }>(initialPlan);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const seatingPlanRef = useRef<HTMLDivElement>(null);

  // Initialize plan if empty or config changed
  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan, isOpen]);

  const unplacedStudents = students.filter(s => !Object.values(plan).includes(s.id));
  const filteredStudents = unplacedStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentNo.includes(searchTerm)
  );

  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    e.dataTransfer.setData('studentId', studentId);
    setDraggedStudentId(studentId);
  };

  const handleDrop = (e: React.DragEvent, seatId: string) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('studentId');
    if (!studentId) return;

    const newPlan = { ...plan };
    
    // If student was already placed elsewhere, remove from there
    Object.keys(newPlan).forEach(key => {
      if (newPlan[key] === studentId) delete newPlan[key];
    });

    // If seat was occupied, that student becomes unplaced
    newPlan[seatId] = studentId;
    setPlan(newPlan);
    setDraggedStudentId(null);
  };

  const handleRemoveFromSeat = (seatId: string) => {
    const newPlan = { ...plan };
    delete newPlan[seatId];
    setPlan(newPlan);
  };

  const handleClearAll = () => {
    setPlan({});
    setShowClearConfirm(false);
  };

  const handleExport = () => {
    const data = {
      config,
      plan
    };
    const dataStr = JSON.stringify(data);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const exportFileDefaultName = `${day}-${month}-${year}-oturma-plani.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportPDF = async () => {
    if (!seatingPlanRef.current || isExportingPDF) return;
    
    setIsExportingPDF(true);
    try {
      // Temporarily add print-friendly class
      const element = seatingPlanRef.current;
      element.classList.add('pdf-export');
      
      // Small delay to ensure UI is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use toPng for better performance and reliability
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2, // Equivalent to scale: 2
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      // Remove print-friendly class
      element.classList.remove('pdf-export');
      
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Create A4 Landscape PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate aspect ratio to fit and center on A4
      const imgProps = pdf.getImageProperties(dataUrl);
      const margin = 10; // 10mm margin
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);
      
      let finalWidth = maxWidth;
      let finalHeight = (imgProps.height * finalWidth) / imgProps.width;
      
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }
      
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
      
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      pdf.save(`${day}-${month}-${year}-oturma-plani.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      showAlert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.', 'Hata', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.config && data.plan) {
          // Note: We can't easily update config here because it's in parent state
          // but we can update the local plan.
          setPlan(data.plan);
        } else {
          setPlan(data);
        }
      } catch (error) {
        showAlert('Geçersiz dosya formatı.', 'Hata', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-neutral-50 dark:bg-neutral-900 flex flex-col overflow-hidden"
    >
      {/* Hidden Input for Import */}
      <input 
        type="file"
        id="import-plan-input"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Header */}
      <header className="h-20 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-2xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">Oturma Planı Düzenleyici</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Sürükle bırak ile öğrencileri yerleştirin</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => document.getElementById('import-plan-input')?.click()}
            className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-white rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all flex items-center gap-2"
          >
            <Upload size={18} />
            İçe Aktar
          </button>
          <button 
            onClick={handleExport}
            className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-white rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Dışa Aktar
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className={`px-5 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-white rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all flex items-center gap-2 ${
              isExportingPDF ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isExportingPDF ? (
              <div className="w-4 h-4 border-2 border-neutral-400 dark:border-white/30 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
            ) : (
              <FileText size={18} />
            )}
            {isExportingPDF ? 'Hazırlanıyor...' : 'PDF İndir'}
          </button>
          {showClearConfirm ? (
            <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-xl border border-red-500/20">
              <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase px-2">Emin misiniz?</span>
              <button 
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all"
              >
                Evet
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-white rounded-lg text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all"
              >
                Hayır
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="px-5 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <Trash2 size={18} />
              Temizle
            </button>
          )}
          <button 
            onClick={() => onSave(plan)}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Save size={18} />
            Kaydet
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Student List */}
        <aside className="w-full md:w-80 bg-white dark:bg-neutral-800/50 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-700 flex flex-col shrink-0 max-h-[30vh] md:max-h-full">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={18} />
              <input 
                type="text"
                placeholder="Öğrenci ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            <div className="px-2 mb-4 flex justify-between items-center">
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Yerleşmemiş ({unplacedStudents.length})</span>
            </div>
            {filteredStudents.map(student => (
              <div
                key={student.id}
                draggable
                onDragStart={(e) => handleDragStart(e, student.id)}
                className={`p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl cursor-grab active:cursor-grabbing hover:border-indigo-500 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all group ${
                  draggedStudentId === student.id ? 'opacity-50 grayscale' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    student.gender === 'Kız' ? 'bg-pink-500/10 text-pink-500 dark:text-pink-400' : 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
                  }`}>
                    {student.studentNo}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{student.name}</p>
                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter">{student.gender}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-10 px-6">
                <p className="text-neutral-400 dark:text-neutral-500 text-sm font-medium">Öğrenci bulunamadı.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Center: Seating Grid */}
        <section className="flex-1 bg-neutral-50 dark:bg-neutral-900 p-6 md:p-10 overflow-auto custom-scrollbar flex flex-col items-center">
          <div ref={seatingPlanRef} className="p-10 flex flex-col items-center bg-neutral-50 dark:bg-neutral-900">
            {/* Title Section */}
            {teacherProfile && (
              <div className="mb-10 text-center">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  {teacherProfile.schoolName || 'OKUL BELİRTİLMEMİŞ'}
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 font-bold tracking-widest uppercase">
                  {teacherProfile.gradeLevel || '-'} / {teacherProfile.section?.toUpperCase().includes('ŞUBESİ') ? teacherProfile.section : `${teacherProfile.section || '-'} ŞUBESİ`} OTURMA PLANI
                </p>
              </div>
            )}

            {/* Teacher's Desk */}
            <div className="w-60 h-12 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl mb-6 flex items-center justify-center shadow-xl dark:shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest border border-neutral-200 dark:border-neutral-600">
                Öğretmen Masası
              </div>
              <div className="w-12 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
            </div>

            {/* Grid */}
            <div className="flex gap-6 justify-center">
              {Array.from({ length: config.groupCount }).map((_, groupIdx) => (
                <div key={groupIdx} className="flex flex-col gap-2">
                  <div className="text-center mb-0.5">
                    <span className="text-[10px] font-black text-neutral-300 dark:text-neutral-600 uppercase tracking-[0.2em]">{groupIdx + 1}. GRUP</span>
                  </div>
                  {Array.from({ length: config.rowsPerGroup[groupIdx] }).map((_, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1.5">
                      {Array.from({ length: config.peoplePerRow }).map((_, seatIdx) => {
                        const seatId = `g${groupIdx}-r${rowIdx}-s${seatIdx}`;
                        const studentId = plan[seatId];
                        const student = students.find(s => s.id === studentId);

                        return (
                          <div
                            key={seatIdx}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, seatId)}
                            className={`w-24 h-24 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-start pt-3 relative group ${
                              student 
                                ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-xl' 
                                : 'bg-neutral-100/50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-50/5'
                            }`}
                          >
                            {student ? (
                              <>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base mb-1.5 shrink-0 ${
                                  student.gender === 'Kız' ? 'bg-pink-500/20 text-pink-500 dark:text-pink-400' : 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
                                }`}>
                                  {student.studentNo}
                                </div>
                                <p className="text-[10px] font-bold text-neutral-900 dark:text-white text-center px-2 line-clamp-2 uppercase tracking-tight leading-tight">
                                  {student.name}
                                </p>
                                <button 
                                  onClick={() => handleRemoveFromSeat(seatId)}
                                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-90"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <div className="text-neutral-300 dark:text-neutral-700 flex flex-col items-center gap-2 mt-auto mb-auto">
                                <User size={24} className="opacity-20" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-20">BOŞ</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </motion.div>
  );
};
