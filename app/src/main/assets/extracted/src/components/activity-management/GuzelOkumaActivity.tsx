import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  PlusCircle, 
  Trophy, 
  Calendar, 
  Users, 
  FileText, 
  Download, 
  Star,
  Award,
  CheckCircle2,
  X,
  ClipboardList,
  Save,
  ChevronRight,
  Printer,
  Trash2,
  AlertTriangle,
  Edit3,
  Info
} from 'lucide-react';
import { 
  collection, 
  query, 
  where,
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  orderBy,
  getDocs,
  deleteDoc,
  increment,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GuzelOkumaActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo?: () => void;
}

interface ActivityInstance {
  id: string;
  activityId: string;
  name: string;
  type: 'Metin' | 'Şiir';
  date: string;
  rewards: {
    first: number;
    second: number;
    third: number;
    fourth: number;
    fifth: number;
    others: number;
  };
  juryIds: string[];
  status: 'Planlandı' | 'Tamamlandı';
  teacherUid: string;
  createdAt: any;
}

interface ActivityScore {
  id: string;
  instanceId: string;
  studentId: string;
  studentName: string;
  scores: { [juryId: string]: { [criteriaId: string]: number } };
  totalScore: number;
  rank?: number;
  rewardStars?: number;
  teacherUid: string;
}

const CRITERIA = {
  'Metin': [
    { id: 'telaffuz', label: 'Doğru Telaffuz', max: 10 },
    { id: 'vurgu', label: 'Vurgu ve Tonlama', max: 10 },
    { id: 'akicilik', label: 'Akıcı Okuma', max: 10 },
    { id: 'noktalama', label: 'Noktalama İşaretleri', max: 10 },
    { id: 'sestonu', label: 'Uygun Ses Yüksekliği', max: 10 }
  ],
  'Şiir': [
    { id: 'duygu', label: 'Duyguyu Yansıtma', max: 10 },
    { id: 'vurgu', label: 'Vurgu ve Tonlama', max: 10 },
    { id: 'telaffuz', label: 'Kelimeleri Doğru Söyleme', max: 10 },
    { id: 'sestonu', label: 'Uygun Ses Yüksekliği', max: 10 },
    { id: 'hiz', label: 'Okuma Hızı', max: 10 }
  ]
};

const fixTurkishChars = (text: string) => {
  if (!text) return "";
  return text
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");
};

export const GuzelOkumaActivity: React.FC<GuzelOkumaActivityProps> = ({ onBack, students, user, onShowInfo }) => {
  const [instances, setInstances] = useState<ActivityInstance[]>([]);
  const [allScores, setAllScores] = useState<ActivityScore[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<ActivityInstance | null>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<ActivityInstance | null>(null);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<ActivityInstance | null>(null);
  const [isResultEntryOpen, setIsResultEntryOpen] = useState(false);

  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'Metin' as 'Metin' | 'Şiir',
    date: new Date().toISOString().split('T')[0],
    rewards: {
      first: 50,
      second: 40,
      third: 30,
      fourth: 15,
      fifth: 10,
      others: 5
    }
  });

  // Fetch instances
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/activityInstances`;
    const q = query(
      collection(db, path),
      where('activityId', '==', 'guzel-okuma'),
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInstances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityInstance)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch all scores for cumulative ranking
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/activityScores`;
    const q = query(
      collection(db, path),
      orderBy('totalScore', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityScore)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user]);

  // Calculate cumulative scores
  const cumulativeScores = useMemo(() => {
    const scoresMap = new Map<string, { studentId: string; studentName: string; total: number }>();
    allScores.forEach(score => {
      const existing = scoresMap.get(score.studentId);
      if (existing) {
        existing.total += score.totalScore;
      } else {
        scoresMap.set(score.studentId, { 
          studentId: score.studentId, 
          studentName: score.studentName, 
          total: score.totalScore 
        });
      }
    });
    return Array.from(scoresMap.values()).sort((a, b) => b.total - a.total);
  }, [allScores]);

  // Determine jury for a new instance
  const determineJury = () => {
    if (instances.length < 3) {
      return ['teacher'];
    }
    // Top 3 students from cumulative scores
    const topStudents = cumulativeScores.slice(0, 3).map(s => s.studentId);
    return ['teacher', ...topStudents];
  };

  const handleCreateActivity = async () => {
    if (!newActivity.name) return;
    const path = `users/${user.uid}/activityInstances`;
    try {
      if (editingInstance) {
        const instancePath = `${path}/${editingInstance.id}`;
        await updateDoc(doc(db, instancePath), {
          ...newActivity,
          updatedAt: serverTimestamp()
        });
      } else {
        const juryIds = determineJury();
        await addDoc(collection(db, path), {
          activityId: 'guzel-okuma',
          ...newActivity,
          juryIds,
          status: 'Planlandı',
          teacherUid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setIsCreateModalOpen(false);
      setEditingInstance(null);
      setNewActivity({
        name: '',
        type: 'Metin',
        date: new Date().toISOString().split('T')[0],
        rewards: {
          first: 50,
          second: 40,
          third: 30,
          fourth: 15,
          fifth: 10,
          others: 5
        }
      });
    } catch (error) {
      handleFirestoreError(error, editingInstance ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDeleteInstance = (instance: ActivityInstance) => {
    setInstanceToDelete(instance);
  };

  const confirmDelete = async () => {
    if (!user || !instanceToDelete) return;
    
    const scoresPath = `users/${user.uid}/activityScores`;
    const instancePath = `users/${user.uid}/activityInstances/${instanceToDelete.id}`;
    try {
      // Delete scores
      const q = query(collection(db, scoresPath), where('instanceId', '==', instanceToDelete.id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      // Delete instance
      await deleteDoc(doc(db, instancePath));
      setInstanceToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, instancePath);
    }
  };

  const generatePDF = (instance: ActivityInstance) => {
    const doc = new jsPDF();
    const criteria = CRITERIA[instance.type];
    
    doc.setFont("helvetica", "bold");
    doc.text(fixTurkishChars(`${instance.name} - Degerlendirme Formu`), 105, 15, { align: 'center' });
    doc.setFontSize(10);
    const formattedDate = instance.date.split('-').reverse().join('.');
    doc.text(fixTurkishChars(`Tarih: ${formattedDate} | Tur: ${instance.type}`), 105, 22, { align: 'center' });

    const juryNames = instance.juryIds.map(id => {
      if (id === 'teacher') return 'Ogretmen';
      const student = students.find(s => s.id === id);
      return student ? fixTurkishChars(student.name) : 'Ogrenci Jurisi';
    });

    doc.text(fixTurkishChars(`Juri Uyeleri: ${juryNames.join(', ')}`), 15, 30);

    const headers = [[
      fixTurkishChars('No'), 
      fixTurkishChars('Adi Soyadi'), 
      ...criteria.map(c => fixTurkishChars(c.label)), 
      fixTurkishChars('Toplam')
    ]];
    
    const data = students.sort((a, b) => Number(a.studentNo) - Number(b.studentNo)).map(s => [
      s.studentNo,
      fixTurkishChars(s.name),
      ...criteria.map(() => ''),
      ''
    ]);

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 }
      }
    });

    doc.save(`${fixTurkishChars(instance.name)}_formu.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Güzel Okuma Etkinliği
              </h2>
              <button 
                onClick={onShowInfo}
                className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                title="Etkinlik Bilgisi"
              >
                <Info size={18} />
              </button>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
              Yarışmaları yönetin, sonuçları girin ve ödülleri dağıtın.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRankingModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-amber-100 dark:shadow-none active:scale-95"
          >
            <Trophy size={20} />
            Sınıf Sıralaması Sonucu
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95"
          >
            <PlusCircle size={20} />
            Etkinlik Oluştur
          </button>
        </div>
      </div>

      {/* Instances List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {instances.map((instance, idx) => (
          <motion.div 
            key={instance.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-neutral-900 p-6 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 space-y-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 ${instance.type === 'Metin' ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600'} rounded-2xl`}>
                {instance.type === 'Metin' ? <FileText size={24} /> : <Award size={24} />}
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                instance.status === 'Tamamlandı' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {instance.status}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight mb-1">
                {instance.name}
              </h4>
              <div className="flex items-center gap-4 text-neutral-500 text-sm font-medium">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {instance.date}
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  {instance.juryIds.length} Jüri
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-50 dark:border-neutral-800">
              <button
                onClick={() => generatePDF(instance)}
                className="flex items-center justify-center gap-2 py-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold text-xs hover:bg-neutral-100 transition-all"
              >
                <Printer size={16} />
                PDF Al
              </button>
              <button
                onClick={() => {
                  setSelectedInstance(instance);
                  setIsResultEntryOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
              >
                <ClipboardList size={16} />
                {instance.status === 'Tamamlandı' ? 'Sonuçlar' : 'Sonuç Gir'}
              </button>
              <button
                onClick={() => {
                  setEditingInstance(instance);
                  setNewActivity({
                    name: instance.name,
                    type: instance.type,
                    date: instance.date,
                    rewards: { ...instance.rewards }
                  });
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold text-xs hover:bg-neutral-100 transition-all"
              >
                <Edit3 size={16} />
                Düzenle
              </button>
              <button
                onClick={() => handleDeleteInstance(instance)}
                className="flex items-center justify-center gap-2 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all"
              >
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                    {editingInstance ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Oluştur'}
                  </h3>
                  <button onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingInstance(null);
                  }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Etkinlik Adı</label>
                    <input
                      type="text"
                      value={newActivity.name}
                      onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                      placeholder="Örn: 1. Güzel Okuma Yarışması"
                      className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Tür</label>
                      <select
                        value={newActivity.type}
                        onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as 'Metin' | 'Şiir' })}
                        className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      >
                        <option value="Metin">Metin</option>
                        <option value="Şiir">Şiir</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Tarih</label>
                      <input
                        type="date"
                        value={newActivity.date}
                        onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                        className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Ödül Planı (Türkçe Yıldızı)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['first', 'second', 'third', 'fourth', 'fifth', 'others'].map((key) => (
                        <div key={key}>
                          <span className="text-[10px] text-neutral-400 font-bold block mb-1">
                            {key === 'first' ? '1.' : 
                             key === 'second' ? '2.' : 
                             key === 'third' ? '3.' : 
                             key === 'fourth' ? '4.' : 
                             key === 'fifth' ? '5.' : 
                             '6-10. Arası'}
                          </span>
                          <input
                            type="number"
                            value={newActivity.rewards[key as keyof typeof newActivity.rewards]}
                            onChange={(e) => setNewActivity({
                              ...newActivity,
                              rewards: { ...newActivity.rewards, [key]: Number(e.target.value) }
                            })}
                            className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                    <div className="flex gap-3">
                      <Users className="text-indigo-600 dark:text-indigo-400 shrink-0" size={20} />
                      <div>
                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Jüri Bilgisi</p>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1">
                          {instances.length < 3 
                            ? "İlk 3 etkinlikte sadece öğretmen jüri olacaktır." 
                            : "Bu etkinlikte öğretmen ve önceki etkinliklerin toplamında ilk 3'e giren öğrenciler jüri olacaktır."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateActivity}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                  >
                    {editingInstance ? 'Değişiklikleri Kaydet' : 'Etkinliği Planla'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ranking Modal */}
      <AnimatePresence>
        {isRankingModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRankingModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                        Sınıf Sıralaması
                      </h3>
                      <p className="text-neutral-500 text-sm font-medium">Tüm Güzel Okuma etkinliklerinin toplam puanları.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsRankingModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {cumulativeScores.length > 0 ? (
                    cumulativeScores.map((score, idx) => (
                      <div 
                        key={score.studentId}
                        className={`flex items-center justify-between p-5 rounded-3xl border ${
                          idx < 3 ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30' : 'bg-neutral-50 border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                            idx === 0 ? 'bg-amber-500 text-white' :
                            idx === 1 ? 'bg-neutral-300 text-neutral-700' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-white dark:bg-neutral-700 text-neutral-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-black text-neutral-900 dark:text-white uppercase tracking-tight">{score.studentName}</p>
                            {idx < 3 && <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Gelecek Etkinlik Jürisi</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-neutral-900 dark:text-white">{score.total}</p>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Toplam Puan</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-neutral-500 font-medium">Henüz tamamlanmış bir etkinlik bulunmuyor.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Entry Modal */}
      <ResultEntryModal 
        isOpen={isResultEntryOpen}
        onClose={() => setIsResultEntryOpen(false)}
        instance={selectedInstance}
        students={students}
        user={user}
        allScores={allScores}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {instanceToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInstanceToDelete(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight mb-2">Etkinliği Sil</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                    <span className="font-bold text-neutral-900 dark:text-white">"{instanceToDelete.name}"</span> etkinliğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm puanlar silinecektir.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setInstanceToDelete(null)}
                    className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 dark:shadow-none transition-all"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: ActivityInstance | null;
  students: Student[];
  user: any;
  allScores: ActivityScore[];
}

const ResultEntryModal: React.FC<ResultEntryModalProps> = ({ isOpen, onClose, instance, students, user, allScores }) => {
  const [activeStudentIdx, setActiveStudentIdx] = useState(0);
  const [localScores, setLocalScores] = useState<{ [studentId: string]: ActivityScore }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'entry' | 'results'>('entry');

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => Number(a.studentNo) - Number(b.studentNo));
  }, [students]);

  const criteria = instance ? CRITERIA[instance.type] : [];

  // Fetch existing scores for this instance
  useEffect(() => {
    if (!isOpen || !instance || !user) return;
    const path = `users/${user.uid}/activityScores`;
    const q = query(
      collection(db, path),
      where('instanceId', '==', instance.id)
    );
    getDocs(q).then(snapshot => {
      const scores: { [studentId: string]: ActivityScore } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as ActivityScore;
        scores[data.studentId] = { id: doc.id, ...data };
      });
      setLocalScores(scores);
      if (instance.status === 'Tamamlandı') setViewMode('results');
    }).catch(error => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, [isOpen, instance, user]);

  const handleScoreChange = (juryId: string, criteriaId: string, value: number) => {
    if (!instance) return;
    const studentId = sortedStudents[activeStudentIdx].id;
    const studentName = sortedStudents[activeStudentIdx].name;

    setLocalScores(prev => {
      const currentStudentScore = prev[studentId] || {
        instanceId: instance.id,
        studentId,
        studentName,
        scores: {},
        totalScore: 0,
        teacherUid: user.uid
      };

      const newScores = {
        ...currentStudentScore.scores,
        [juryId]: {
          ...(currentStudentScore.scores[juryId] || {}),
          [criteriaId]: value
        }
      };

      // Calculate total
      let total = 0;
      Object.values(newScores).forEach(juryScores => {
        Object.values(juryScores).forEach(val => {
          total += val;
        });
      });

      return {
        ...prev,
        [studentId]: {
          ...currentStudentScore,
          scores: newScores,
          totalScore: total
        }
      };
    });
  };

  const handleSave = async () => {
    if (!instance || !user) return;
    setIsSaving(true);
    const scoresPath = `users/${user.uid}/activityScores`;
    const studentsPath = `users/${user.uid}/students`;
    const instancesPath = `users/${user.uid}/activityInstances`;
    try {
      const scoresArray = Object.values(localScores) as ActivityScore[];
      
      // Calculate ranks and rewards
      const rankedScores = [...scoresArray].sort((a, b) => b.totalScore - a.totalScore);
      
      let currentRank = 0;
      let lastScore = -1;
      
      for (let i = 0; i < rankedScores.length; i++) {
        const score = rankedScores[i];
        if (score.totalScore !== lastScore) {
          currentRank++;
          lastScore = score.totalScore;
        }
        const rank = currentRank;
        let reward = 0;
        if (rank === 1) reward = instance.rewards.first;
        else if (rank === 2) reward = instance.rewards.second;
        else if (rank === 3) reward = instance.rewards.third;
        else if (rank === 4) reward = instance.rewards.fourth;
        else if (rank === 5) reward = instance.rewards.fifth;
        else if (rank >= 6 && rank <= 10) reward = instance.rewards.others;

        score.rank = rank;
        score.rewardStars = reward;

        if (score.id) {
          await updateDoc(doc(db, scoresPath, score.id), {
            scores: score.scores,
            totalScore: score.totalScore,
            rank: score.rank,
            rewardStars: score.rewardStars,
            updatedAt: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, scoresPath), {
            instanceId: score.instanceId,
            studentId: score.studentId,
            studentName: score.studentName,
            scores: score.scores,
            totalScore: score.totalScore,
            rank: score.rank,
            rewardStars: score.rewardStars,
            teacherUid: score.teacherUid,
            createdAt: serverTimestamp()
          });
        }

        // Give stars to student
        const studentRef = doc(db, studentsPath, score.studentId);
        await updateDoc(studentRef, {
          stars: increment(reward),
          starHistory: arrayUnion({
            category: 'Türkçe Yıldızı',
            description: `Güzel Okuma - ${instance.name} Etkinliği Ödülü`,
            amount: reward,
            timestamp: Date.now()
          })
        });
      }

      // Mark instance as completed
      await updateDoc(doc(db, instancesPath, instance.id), {
        status: 'Tamamlandı'
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, scoresPath);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!instance || !user) return;
    
    const scoresPath = `users/${user.uid}/activityScores`;
    const instancePath = `users/${user.uid}/activityInstances/${instance.id}`;
    try {
      // Delete scores
      const q = query(collection(db, scoresPath), where('instanceId', '==', instance.id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      // Delete instance
      await deleteDoc(doc(db, instancePath));
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, instancePath);
    }
  };

  if (!instance) return null;

  const currentStudent = sortedStudents[activeStudentIdx];
  const currentScore = localScores[currentStudent?.id] || { scores: {} };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={`p-3 ${instance.type === 'Metin' ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600'} rounded-2xl`}>
                  {instance.type === 'Metin' ? <FileText size={24} /> : <Award size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                    {instance.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-bold text-neutral-400">{instance.date}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setViewMode('entry')}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'entry' ? 'bg-indigo-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}
                      >
                        Veri Girişi
                      </button>
                      <button 
                        onClick={() => setViewMode('results')}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'results' ? 'bg-indigo-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}
                      >
                        Sonuçlar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDelete} className="p-3 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                  <Trash2 size={20} />
                </button>
                <button onClick={onClose} className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {viewMode === 'entry' ? (
                <>
                  {/* Student Sidebar */}
                  <div className="w-64 border-r border-neutral-100 dark:border-neutral-800 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {sortedStudents.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveStudentIdx(idx)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                          activeStudentIdx === idx 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <span className="text-[10px] font-black opacity-50 w-6">{s.studentNo}</span>
                        <span className="text-sm font-bold truncate">{s.name}</span>
                        {localScores[s.id] && <CheckCircle2 size={14} className="ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* Entry Area */}
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {currentStudent ? (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                              {currentStudent.name}
                            </h4>
                            <p className="text-neutral-500 font-medium">Değerlendirme Puanlarını Girin</p>
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-black text-indigo-600">{currentScore.totalScore || 0}</p>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Toplam Puan</p>
                          </div>
                        </div>

                        <div className="space-y-10">
                          {instance.juryIds.map((juryId) => {
                            const juryName = juryId === 'teacher' ? 'Öğretmen' : students.find(s => s.id === juryId)?.name || 'Jüri';
                            return (
                              <div key={juryId} className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                                  <h5 className="font-black text-neutral-900 dark:text-white uppercase tracking-tight text-sm">
                                    {juryName} Jürisi
                                  </h5>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {criteria.map((c) => (
                                    <div key={c.id} className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                                      <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">{c.label}</span>
                                        <span className="text-xs font-black text-indigo-600">{(currentScore.scores as any)[juryId]?.[c.id] || 0} / {c.max}</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max={c.max}
                                        step="1"
                                        value={(currentScore.scores as any)[juryId]?.[c.id] || 0}
                                        onChange={(e) => handleScoreChange(juryId, c.id, Number(e.target.value))}
                                        className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-4 pt-8">
                          <button
                            disabled={activeStudentIdx === 0}
                            onClick={() => setActiveStudentIdx(prev => prev - 1)}
                            className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-bold disabled:opacity-50 transition-all"
                          >
                            Önceki Öğrenci
                          </button>
                          <button
                            onClick={() => {
                              if (activeStudentIdx < sortedStudents.length - 1) {
                                setActiveStudentIdx(prev => prev + 1);
                              } else {
                                handleSave();
                              }
                            }}
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            {activeStudentIdx === sortedStudents.length - 1 ? (
                              <>
                                <Save size={20} />
                                Tümünü Kaydet ve Bitir
                              </>
                            ) : (
                              <>
                                Sonraki Öğrenci
                                <ChevronRight size={20} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p className="font-medium">Öğrenci listesi bulunamadı.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="space-y-4">
                    {(Object.values(localScores) as ActivityScore[]).length > 0 ? (
                      (Object.values(localScores) as ActivityScore[])
                        .sort((a, b) => b.totalScore - a.totalScore)
                        .map((score, idx) => (
                          <div 
                            key={score.studentId}
                            className={`flex items-center justify-between p-5 rounded-3xl border ${
                              idx < 3 ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-900/30' : 'bg-neutral-50 border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                                idx === 0 ? 'bg-amber-500 text-white' :
                                idx === 1 ? 'bg-neutral-300 text-neutral-700' :
                                idx === 2 ? 'bg-amber-700 text-white' :
                                'bg-white dark:bg-neutral-700 text-neutral-400'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-black text-neutral-900 dark:text-white uppercase tracking-tight">{score.studentName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Star size={12} className="text-amber-500 fill-amber-500" />
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">+{score.rewardStars} Yıldız</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-neutral-900 dark:text-white">{score.totalScore}</p>
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Puan</p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-20">
                        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4 opacity-50" />
                        <p className="text-neutral-500 font-medium">Henüz sonuç girilmemiş.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight mb-2">Etkinliği Sil</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                    <span className="font-bold text-neutral-900 dark:text-white">"{instance?.name}"</span> etkinliğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm puanlar silinecektir.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 dark:shadow-none transition-all"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
