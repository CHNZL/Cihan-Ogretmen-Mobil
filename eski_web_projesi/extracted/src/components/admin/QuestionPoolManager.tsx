import React, { useState, useEffect } from 'react';
import { Target, Download, Cloud } from 'lucide-react';
import { LessonQuestions } from '../lesson-management/LessonQuestions';
import { useGlobalOutcomes } from '../../hooks/useGlobalOutcomes';
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { GoogleDriveImporter } from './GoogleDriveImporter';

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

interface QuestionPoolManagerProps {
  user: any;
}

export const QuestionPoolManager: React.FC<QuestionPoolManagerProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'drive'>('list');
  const [selectedGrade, setSelectedGrade] = useState<string>('3');
  const [selectedSubject, setSelectedSubject] = useState<string>('turkce');
  const [questions, setQuestions] = useState<any[]>([]);

  // Derive subjects for current grade
  const currentSubjects = SUBJECTS_BY_GRADE[selectedGrade] || [];

  useEffect(() => {
    if (!currentSubjects.find(s => s.id === selectedSubject)) {
      setSelectedSubject(currentSubjects[0]?.id || '');
    }
  }, [selectedGrade]);

  const lessonIdStr = `lesson-${selectedSubject.replace(/_/g, '-')}`;
  const lessonIdsMemo = React.useMemo(() => [lessonIdStr], [lessonIdStr]);

  const { units, outcomes, loading: loadingOutcomes } = useGlobalOutcomes(lessonIdsMemo, user);

  useEffect(() => {
    if (!user || !selectedSubject) return;

    const globalQuestionsRef = collection(db, 'globalQuestions');
    // Global questions filter by lessonId and grade
    const qGlobal = query(
      globalQuestionsRef, 
      where('lessonId', '==', lessonIdStr), 
      where('grade', '==', selectedGrade)
    );

    const unsub = onSnapshot(qGlobal, (snap) => {
      setQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error listening to global questions:", err));

    return () => unsub();
  }, [user, selectedGrade, selectedSubject]);

  const handleMigrateMyQuestions = async () => {
    if (!user) return;
    try {
      const oldSnap = await getDocs(collection(db, `users/${user.uid}/lessonQuestions`));
      
      const normSubject = selectedSubject.toLowerCase().replace(/_/g, '-').replace('lesson-', '');
      
      const docsToMigrate = oldSnap.docs.filter(d => {
        const data = d.data();
        if (data.deleted) return false;
        const qLessonId = (data.lessonId || '').toLowerCase().replace(/_/g, '-').replace('lesson-', '');
        return qLessonId === normSubject;
      });

      if (docsToMigrate.length === 0) {
        toast.error("Bu derse ait hazırlamış olduğunuz size özel kayıtlı soru bulunamadı.");
        return;
      }
      
      let confirmMsg = `Bu işlem bulduğumuz ${docsToMigrate.length} adet size özel sorununuzu ${selectedGrade}. Sınıf - ${currentSubjects.find(s=>s.id===selectedSubject)?.name} dersi olarak ortak Global Soru Havuzu'na aktaracaktır. Devam etmek istiyor musunuz?`;
      if (!window.confirm(confirmMsg)) return;

      const batch = writeBatch(db);
      docsToMigrate.forEach(d => {
        const data = d.data();
        const globalQRef = doc(collection(db, 'globalQuestions'));
        batch.set(globalQRef, {
           ...data,
           grade: selectedGrade,
           lessonId: lessonIdStr // Ensure standard synced lessonId format is saved
        });
        batch.delete(doc(db, `users/${user.uid}/lessonQuestions`, d.id));
      });
      await batch.commit();
      toast.success(`${docsToMigrate.length} adet soru başarıyla Global Soru Havuzu'na taşındı ve yerel sorularınızdan silindi.`);
    } catch (err) {
      console.error(err);
      toast.error("Sorular taşınırken bir hata oluştu.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 flex items-center gap-2">
            <Target className="text-amber-500" />
            Soru Havuzu Yönetimi
          </h2>
          <p className="text-neutral-500 text-sm mt-1">
            Global soru havuzunu sınıf, ders veya Google Drive entegrasyonu ile oluşturun. Bu sorular öğretmenlerin Ders Yönetimi sayfalarında görünecektir.
          </p>
        </div>
        
        {activeTab === 'list' && (
          <button
            onClick={handleMigrateMyQuestions}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition-all text-sm whitespace-nowrap border-2 border-dashed border-neutral-300"
          >
            <Download size={18} />
            <span>V1 Sorularımı Havuza Taşı</span>
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-neutral-250 border-neutral-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'list'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          Soru Havuzu Listesi
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'drive'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          <Cloud size={16} />
          Google Drive'dan İçe Aktar
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800 space-y-6">
            <div className="flex flex-wrap gap-2">
              {GRADES.map(grade => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                    selectedGrade === grade
                      ? 'bg-amber-100 text-amber-700 shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {grade}. Sınıf
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
              {currentSubjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedSubject === subject.id
                      ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>

          {loadingOutcomes ? (
            <div className="flex items-center justify-center py-12 text-neutral-500">
              Yükleniyor...
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800">
              <LessonQuestions 
                lessonId={lessonIdStr}
                lessonLabel={currentSubjects.find(s => s.id === selectedSubject)?.name || selectedSubject}
                user={user}
                units={units}
                outcomes={outcomes}
                questions={questions}
                mode="admin"
                grade={selectedGrade}
              />
            </div>
          )}
        </>
      ) : (
        <GoogleDriveImporter user={user} />
      )}
    </div>
  );
};
