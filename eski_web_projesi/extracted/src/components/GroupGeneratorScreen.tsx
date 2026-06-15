import React, { useState, useEffect, useRef } from 'react';
import { 
  Users2, 
  Shuffle, 
  Hand, 
  Plus, 
  Minus,
  Trash2, 
  X, 
  Download, 
  Save,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  User,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface Group {
  id: string;
  name: string;
  studentIds: string[];
}

interface GroupGeneratorScreenProps {
  students: Student[];
  onBack: () => void;
}

export const GroupGeneratorScreen: React.FC<GroupGeneratorScreenProps> = ({ students, onBack }) => {
  const [mode, setMode] = useState<'selection' | 'random' | 'manual'>('selection');
  const [groupCount, setGroupCount] = useState(5);
  const [groups, setGroups] = useState<Group[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<string[]>([]);

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempGroupCount, setTempGroupCount] = useState(5);
  const [configStep, setConfigStep] = useState(1);
  const [configType, setConfigType] = useState<'groupCount' | 'studentCount'>('groupCount');
  const [balanceGender, setBalanceGender] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<'random' | 'manual'>('random');

  // Initialize unassigned students when entering manual mode
  useEffect(() => {
    if (mode === 'manual' && groups.length === 0) {
      const initialGroups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
        id: `group-${i + 1}`,
        name: `${i + 1}. Grup`,
        studentIds: []
      }));
      setGroups(initialGroups);
      setUnassignedStudents(students.map(s => s.id));
    }
  }, [mode, groupCount, students]);

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    
    setIsExportingPDF(true);
    try {
      const element = exportRef.current;
      
      // Add a temporary class for PDF styling
      element.classList.add('pdf-export');
      
      // Wait a bit for any transitions to finish
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        quality: 1.0,
        pixelRatio: 2
      });

      element.classList.remove('pdf-export');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      // If image is taller than page, scale it down
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;
      if (finalHeight > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
      
      const date = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      pdf.save(`Grup-Plani-${date}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleStartConfig = (type: 'random' | 'manual') => {
    setTargetMode(type);
    setConfigStep(1);
    setSelectedStudentIds(students.map(s => s.id));
    setIsConfigOpen(true);
  };

  const confirmConfig = () => {
    const activeStudents = students.filter(s => selectedStudentIds.includes(s.id));
    let finalGroupCount = tempGroupCount;
    
    if (configType === 'studentCount') {
      finalGroupCount = Math.ceil(activeStudents.length / tempGroupCount);
    }
    
    setGroupCount(finalGroupCount);
    
    if (targetMode === 'random') {
      generateRandomGroups(activeStudents, finalGroupCount);
      setMode('random');
    } else {
      const initialGroups: Group[] = Array.from({ length: finalGroupCount }, (_, i) => ({
        id: `group-${i + 1}`,
        name: `Grup ${i + 1}`,
        studentIds: []
      }));
      setGroups(initialGroups);
      setUnassignedStudents(activeStudents.map(s => s.id));
      setMode('manual');
    }
    
    setIsConfigOpen(false);
  };

  const generateRandomGroups = (activeStudents: Student[], count: number) => {
    let boys = activeStudents.filter(s => s.gender === 'Erkek').sort(() => Math.random() - 0.5);
    let girls = activeStudents.filter(s => s.gender === 'Kız').sort(() => Math.random() - 0.5);
    
    const newGroups: Group[] = Array.from({ length: count }, (_, i) => ({
      id: `group-${i + 1}`,
      name: `Grup ${i + 1}`,
      studentIds: []
    }));

    if (balanceGender) {
      boys.forEach((student, index) => {
        newGroups[index % count].studentIds.push(student.id);
      });
      girls.forEach((student, index) => {
        const targetIndex = (index + (boys.length % count)) % count;
        newGroups[targetIndex].studentIds.push(student.id);
      });
    } else {
      const allShuffled = [...activeStudents].sort(() => Math.random() - 0.5);
      allShuffled.forEach((student, index) => {
        newGroups[index % count].studentIds.push(student.id);
      });
    }

    setGroups(newGroups);
  };

  const handleReShuffle = () => {
    const activeStudents = students.filter(s => selectedStudentIds.includes(s.id));
    generateRandomGroups(activeStudents, groupCount);
  };

  const handleShuffleRemaining = () => {
    const activeStudents = students.filter(s => unassignedStudents.includes(s.id));
    const boys = activeStudents.filter(s => s.gender === 'Erkek').sort(() => Math.random() - 0.5);
    const girls = activeStudents.filter(s => s.gender === 'Kız').sort(() => Math.random() - 0.5);
    
    const newGroups = [...groups];
    
    // Distribute boys to groups with fewest students
    boys.forEach(student => {
      const targetGroup = newGroups.reduce((prev, curr) => 
        prev.studentIds.length <= curr.studentIds.length ? prev : curr
      );
      targetGroup.studentIds.push(student.id);
    });

    // Distribute girls to groups with fewest students
    girls.forEach(student => {
      const targetGroup = newGroups.reduce((prev, curr) => 
        prev.studentIds.length <= curr.studentIds.length ? prev : curr
      );
      targetGroup.studentIds.push(student.id);
    });
    
    setGroups(newGroups);
    setUnassignedStudents([]);
  };

  const assignToGroup = (studentId: string, groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, studentIds: [...g.studentIds, studentId] };
      }
      return g;
    }));
    setUnassignedStudents(prev => prev.filter(id => id !== studentId));
  };

  const removeFromGroup = (studentId: string, groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, studentIds: g.studentIds.filter(id => id !== studentId) };
      }
      return g;
    }));
    setUnassignedStudents(prev => [...prev, studentId]);
  };

  const getStudentById = (id: string) => students.find(s => s.id === id);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">Grup Oluşturucu</h1>
              <p className="text-neutral-400 dark:text-neutral-500 font-medium">Sınıfınızı hızlıca ve kolayca gruplara ayırın.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {mode !== 'selection' && (
              <button 
                onClick={() => setMode('selection')}
                className="flex items-center gap-2 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                <Plus size={20} />
                Yeni Plan Oluştur
              </button>
            )}
            <button 
              onClick={() => {/* Save logic */}}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <Save size={20} />
              Kaydet
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 dark:shadow-none disabled:opacity-50"
            >
              {isExportingPDF ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={20} />
              )}
              {isExportingPDF ? 'İndiriliyor...' : 'İndir'}
            </button>
          </div>
        </div>

        {/* Content wrapper for PDF export */}
        <div ref={exportRef} className="space-y-6 p-4 -m-4 rounded-[32px]">
          {mode === 'selection' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Area */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setConfigType('groupCount')}
                      className={`flex-1 p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3 ${
                        configType === 'groupCount' 
                          ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-900/10' 
                          : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-200 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${configType === 'groupCount' ? 'bg-sky-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'}`}>
                        <LayoutGrid size={24} />
                      </div>
                      <span className={`font-bold ${configType === 'groupCount' ? 'text-sky-900 dark:text-sky-400' : 'text-neutral-500 dark:text-neutral-400'}`}>Grup Sayısına Göre</span>
                    </button>
                    <button 
                      onClick={() => setConfigType('studentCount')}
                      className={`flex-1 p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3 ${
                        configType === 'studentCount' 
                          ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-900/10' 
                          : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-200 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${configType === 'studentCount' ? 'bg-sky-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'}`}>
                        <Users2 size={24} />
                      </div>
                      <span className={`font-bold ${configType === 'studentCount' ? 'text-sky-900 dark:text-sky-400' : 'text-neutral-500 dark:text-neutral-400'}`}>Kişi Sayısına Göre</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 space-y-4">
                    <label className="text-sm font-bold text-neutral-900 dark:text-white">{configType === 'groupCount' ? 'Grup Sayısı' : 'Kişi Sayısı'}</label>
                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800 p-2 rounded-2xl">
                      <button 
                        onClick={() => setTempGroupCount(Math.max(2, tempGroupCount - 1))}
                        className="w-12 h-12 bg-white dark:bg-neutral-700 rounded-xl shadow-sm flex items-center justify-center text-neutral-600 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <Minus size={20} />
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-black text-neutral-900 dark:text-white">{tempGroupCount}</span>
                      </div>
                      <button 
                        onClick={() => setTempGroupCount(Math.min(30, tempGroupCount + 1))}
                        className="w-12 h-12 bg-white dark:bg-neutral-700 rounded-xl shadow-sm flex items-center justify-center text-neutral-600 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 flex flex-col items-center text-center space-y-6">
                  <h3 className="font-black text-neutral-900 dark:text-white uppercase tracking-tight">Önizleme</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <span className="text-5xl font-black text-sky-500">
                        {configType === 'groupCount' ? tempGroupCount : Math.ceil(students.length / tempGroupCount)}
                      </span>
                      <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Grup</p>
                    </div>
                    <X size={24} className="text-neutral-200 dark:text-neutral-800 mt-[-20px]" />
                    <div className="text-center">
                      <span className="text-5xl font-black text-sky-500">
                        {configType === 'studentCount' ? tempGroupCount : Math.floor(students.length / tempGroupCount)}
                      </span>
                      <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Öğrenci</p>
                    </div>
                  </div>

                  <div className="w-full bg-sky-50/50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/20">
                    <p className="text-sm font-bold text-sky-900 dark:text-sky-400 mb-1">Grup Dağılımı</p>
                    <p className="text-xs text-sky-700 dark:text-sky-500">
                      {configType === 'groupCount' 
                        ? `${tempGroupCount} adet grubun her birinde yaklaşık ${Math.floor(students.length / tempGroupCount)} öğrenci olacak.`
                        : `Her birinde ${tempGroupCount} öğrenci olan ${Math.ceil(students.length / tempGroupCount)} adet grup oluşturulacak.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => handleStartConfig('random')}
                  className="px-12 py-5 bg-sky-500 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 dark:shadow-none flex items-center gap-3"
                >
                  Grupları Oluştur
                  <ArrowRight size={20} />
                </button>
                <button 
                  onClick={() => handleStartConfig('manual')}
                  className="px-12 py-5 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-2 border-neutral-100 dark:border-neutral-800 rounded-[24px] font-black uppercase tracking-widest hover:border-neutral-200 dark:hover:border-neutral-700 transition-all flex items-center gap-3"
                >
                  Elle Oluştur
                  <Hand size={20} />
                </button>
              </div>
            </div>
          )}

          {(mode === 'random' || mode === 'manual') && (
            <div className="space-y-6">
              {mode === 'random' && (
                <div className="flex items-center gap-3 no-print">
                  <button 
                    onClick={handleReShuffle}
                    className="px-6 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm"
                  >
                    Grupları Yeniden Karıştır
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar: Unassigned Students (Only in manual mode) */}
              {mode === 'manual' && (
                <div className="lg:col-span-1 space-y-4 no-print">
                  <div className="bg-white dark:bg-neutral-900 p-6 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-neutral-900 dark:text-white uppercase tracking-tight text-sm">Öğrenci Listesi</h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleShuffleRemaining}
                          className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                          title="Kalanları Rastgele Dağıt"
                        >
                          <Shuffle size={14} />
                        </button>
                        <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                          {unassignedStudents.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                      {unassignedStudents.map(id => {
                        const student = getStudentById(id);
                        if (!student) return null;
                        return (
                          <div 
                            key={id}
                            className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            onClick={() => {
                              // Automatically assign to the first group with space or just the first group
                              assignToGroup(id, groups[0].id);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                student.gender === 'Erkek' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
                              }`}>
                                {student.studentNo}
                              </div>
                              <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{student.name}</span>
                            </div>
                            <Plus size={16} className="text-neutral-300 dark:text-neutral-600 group-hover:text-indigo-500" />
                          </div>
                        );
                      })}
                      {unassignedStudents.length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Tüm öğrenciler yerleştirildi!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content: Groups Grid */}
              <div className={`${mode === 'manual' ? 'lg:col-span-3' : 'lg:col-span-4'} grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`}>
                {groups.map((group, gIdx) => (
                  <div key={group.id} className="bg-white dark:bg-neutral-900 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden flex flex-col">
                    <div className="p-5 bg-neutral-50 dark:bg-neutral-800/50 border-bottom border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white dark:bg-neutral-700 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{gIdx + 1}</span>
                        </div>
                        <h3 className="font-black text-neutral-900 dark:text-white uppercase tracking-tight text-sm">{group.name}</h3>
                      </div>
                      <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-700 px-2 py-1 rounded-lg border border-neutral-100 dark:border-neutral-600">
                        {group.studentIds.length} ÖĞRENCİ
                      </span>
                    </div>
                    
                    <div className="p-5 flex-1 space-y-2 min-h-[200px]">
                      {group.studentIds.map(id => {
                        const student = getStudentById(id);
                        if (!student) return null;
                        return (
                          <div 
                            key={id}
                            className="p-3 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-between group hover:border-red-100 dark:hover:border-red-900/30 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                student.gender === 'Erkek' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                              }`}>
                                {student.studentNo}
                              </div>
                              <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{student.name}</span>
                            </div>
                            {mode === 'manual' && (
                              <button 
                                onClick={() => removeFromGroup(id, group.id)}
                                className="p-1.5 text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-all no-print"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      
                      {mode === 'manual' && (
                        <div className="pt-2 no-print">
                          <select 
                            className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-400 dark:text-neutral-500 outline-none hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all appearance-none text-center cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                assignToGroup(e.target.value, group.id);
                                e.target.value = "";
                              }
                            }}
                            value=""
                          >
                            <option value="">+ ÖĞRENCİ EKLE</option>
                            {unassignedStudents.map(id => {
                              const student = getStudentById(id);
                              return (
                                <option key={id} value={id}>
                                  ({student?.studentNo}) {student?.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {group.studentIds.length === 0 && mode === 'random' && (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-700 py-12">
                          <User size={32} className="mb-2 opacity-20" />
                          <p className="text-xs font-bold uppercase tracking-widest opacity-40">Grup Boş</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {mode === 'manual' && groups.length < 12 && (
                  <button 
                    onClick={() => {
                      const newId = `group-${groups.length + 1}`;
                      setGroups([...groups, { id: newId, name: `${groups.length + 1}. Grup`, studentIds: [] }]);
                    }}
                    className="bg-neutral-50 dark:bg-neutral-800/30 rounded-[32px] border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center py-12 group hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all no-print"
                  >
                    <div className="w-12 h-12 bg-white dark:bg-neutral-700 rounded-2xl flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Plus size={24} className="text-neutral-400 dark:text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                    </div>
                    <span className="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Yeni Grup Ekle</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Config Modal (Attendance + Settings) */}
        <AnimatePresence>
          {isConfigOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${targetMode === 'random' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                      {targetMode === 'random' ? <Shuffle size={24} /> : <Hand size={24} />}
                    </div>
                    <button 
                      onClick={() => setIsConfigOpen(false)}
                      className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {configStep === 1 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Öğrenci Seçimi</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 font-medium">Sınıfta olmayanları çıkarın</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{selectedStudentIds.length}</span>
                          <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">MEVCUT</p>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {students.map(student => (
                          <button
                            key={student.id}
                            onClick={() => {
                              setSelectedStudentIds(prev => 
                                prev.includes(student.id) 
                                  ? prev.filter(id => id !== student.id)
                                  : [...prev, student.id]
                              );
                            }}
                            className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between ${
                              selectedStudentIds.includes(student.id)
                                ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/50'
                                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                student.gender === 'Erkek' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
                              }`}>
                                {student.studentNo}
                              </div>
                              <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{student.name}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                              selectedStudentIds.includes(student.id) ? 'bg-sky-600 border-sky-600' : 'border-neutral-300 dark:border-neutral-600'
                            }`}>
                              {selectedStudentIds.includes(student.id) && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                          </button>
                        ))}
                      </div>

                      <button 
                        onClick={() => setConfigStep(2)}
                        className="w-full py-4 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 dark:shadow-none"
                      >
                        Devam Et
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Ayarları Onayla</h3>
                        <p className="text-neutral-500 dark:text-neutral-400 font-medium">Grup dağılımı tercihleriniz</p>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-neutral-700 dark:text-neutral-300">Kız-Erkek Dağılımı</p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase">Cinsiyet dengesini koru</p>
                          </div>
                          <button 
                            onClick={() => setBalanceGender(!balanceGender)}
                            className={`w-12 h-6 rounded-full transition-all relative ${balanceGender ? 'bg-sky-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${balanceGender ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-900/30">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Toplam Öğrenci:</span>
                            <span className="font-bold text-sky-900 dark:text-sky-400">{selectedStudentIds.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Grup Sayısı:</span>
                            <span className="font-bold text-sky-900 dark:text-sky-400">{groupCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          onClick={() => setConfigStep(1)}
                          className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                        >
                          Geri
                        </button>
                        <button 
                          onClick={confirmConfig}
                          className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 dark:shadow-none"
                        >
                          Başla
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
