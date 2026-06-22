import React, { useState } from 'react';
import { 
  Star, 
  RefreshCw,
  Search, 
  ArrowLeft, 
  Plus, 
  Trophy, 
  Sparkles,
  X,
  History,
  Trash2,
  Users,
  Heart,
  Globe,
  FlaskConical,
  Brain,
  Languages,
  Palette,
  Music,
  BookOpen,
  ShieldCheck,
  HeartHandshake,
  Smile,
  Mountain,
  Gem,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove, writeBatch, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
  stars?: number;
  starHistory?: { category: string; description?: string; amount?: number; timestamp: number }[];
}

interface StarsBadgesScreenProps {
  students: Student[];
  user: any;
  onBack: () => void;
}

const STAR_CATEGORIES = [
  { id: 'hayat', name: 'Hayat Bilgisi Yıldızı', color: 'bg-emerald-50 text-emerald-600', icon: Heart },
  { id: 'sosyal', name: 'Sosyal Bilgiler Yıldızı', color: 'bg-orange-50 text-orange-600', icon: Globe },
  { id: 'fen', name: 'Fen Bilimleri Yıldızı', color: 'bg-sky-50 text-sky-600', icon: FlaskConical },
  { id: 'matematik', name: 'Matematik Yıldızı', color: 'bg-indigo-50 text-indigo-600', icon: Brain },
  { id: 'turkce', name: 'Türkçe Yıldızı', color: 'bg-rose-50 text-rose-600', icon: Languages },
  { id: 'ingilizce', name: 'İngilizce Yıldızı', color: 'bg-pink-50 text-pink-600', icon: Languages },
  { id: 'gorsel', name: 'Görsel Sanatlar Yıldızı', color: 'bg-pink-50 text-pink-600', icon: Palette },
  { id: 'muzik', name: 'Müzik Yıldızı', color: 'bg-purple-50 text-purple-600', icon: Music },
  { id: 'beden', name: 'Beden Eğitimi Yıldızı', color: 'bg-teal-50 text-teal-600', icon: Trophy },
  { id: 'kitap', name: 'Kitap Kurdu Yıldızı', color: 'bg-amber-50 text-amber-600', icon: BookOpen },
  { id: 'sorumluluk', name: 'Sorumluluk Sahibi Öğrenci Yıldızı', color: 'bg-blue-50 text-blue-600', icon: ShieldCheck },
  { id: 'yardimsever', name: 'Yardımsever Öğrenci Yıldızı', color: 'bg-green-50 text-green-600', icon: HeartHandshake },
  { id: 'temiz', name: 'Temiz ve Düzenli Öğrenci Yıldızı', color: 'bg-cyan-50 text-cyan-600', icon: Sparkles },
  { id: 'nazik', name: 'Nazik Öğrenci Yıldızı', color: 'bg-fuchsia-50 text-fuchsia-600', icon: Smile },
  { id: 'azimli', name: 'Azimli Öğrenci Yıldızı', color: 'bg-violet-50 text-violet-600', icon: Mountain },
  { id: 'isbirlikci', name: 'İşbirlikçi Öğrenci Yıldızı', color: 'bg-lime-50 text-lime-600', icon: Users },
  { id: 'ozel', name: 'Öğretmen Özel Ödülü Yıldızı', color: 'bg-red-50 text-red-600', icon: Gem }
];

export const StarsBadgesScreen: React.FC<StarsBadgesScreenProps> = ({ students, user, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;
  const [isStarModalOpen, setIsStarModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2>(1);
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkAmount, setBulkAmount] = useState(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'top'>('all');
  const [leaderboardLimit, setLeaderboardLimit] = useState<number | 'all'>(5);

  // New states for Activity Star Giving enhancements
  const [bulkTimer, setBulkTimer] = useState(0);
  const [bulkPersonCount, setBulkPersonCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLuckyQuestionModalOpen, setIsLuckyQuestionModalOpen] = useState(false);
  const [isLuckyWinnerModalOpen, setIsLuckyWinnerModalOpen] = useState(false);
  const [luckyWinner, setLuckyWinner] = useState<Student | null>(null);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const [isFixingStars, setIsFixingStars] = useState(false);

  const fixStarCategories = async (isAuto = false) => {
    if (!user || students.length === 0) return;
    if (!isAuto) setIsFixingStars(true);
    const batch = writeBatch(db);
    let updatedCount = 0;

    const categoryMap: Record<string, string> = {
      'Matematik': 'Matematik Yıldızı',
      'Fen Bilimleri': 'Fen Bilimleri Yıldızı',
      'Fen': 'Fen Bilimleri Yıldızı',
      'Hayat Bilgisi': 'Hayat Bilgisi Yıldızı',
      'Türkçe': 'Türkçe Yıldızı',
      'Sosyal Bilgiler': 'Sosyal Bilgiler Yıldızı',
      'İngilizce': 'İngilizce Yıldızı',
      'Kelime Oyunu Şampiyonu': 'Türkçe Yıldızı',
      'Fen Bilimleri Arenası': 'Fen Bilimleri Yıldızı',
      'Hayat Bilgisi Serüveni': 'Hayat Bilgisi Yıldızı',
      'Matematik Etkinlikleri': 'Matematik Yıldızı',
      'Türkçe Etkinlikleri': 'Türkçe Yıldızı',
      'Özel Ödül': 'Öğretmen Özel Ödülü Yıldızı'
    };

    try {
      for (const student of students) {
        if (!student.starHistory || student.starHistory.length === 0) continue;

        let needsUpdate = false;
        const newHistory = student.starHistory.map(history => {
          if (categoryMap[history.category]) {
            needsUpdate = true;
            return { ...history, category: categoryMap[history.category] };
          }
          if (history.category && !history.category.endsWith(' Yıldızı')) {
            // Check if adding ' Yıldızı' makes it a standard category
            const withYildizi = `${history.category} Yıldızı`;
            if (STAR_CATEGORIES.some(c => c.name === withYildizi)) {
              needsUpdate = true;
              return { ...history, category: withYildizi };
            }
          }
          return history;
        });

        if (needsUpdate) {
          const studentRef = doc(db, `users/${user.uid}/students/${student.id}`);
          batch.update(studentRef, { starHistory: newHistory });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        if (!isAuto) {
          alert(`${updatedCount} öğrencinin yıldız kategorileri başarıyla standart hale getirildi.`);
        }
      } else {
        if (!isAuto) {
          alert("Güncellenecek standart dışı yıldız bulunamadı.");
        }
      }
    } catch (error) {
      console.error("Star correction error:", error);
      if (!isAuto) {
        alert("Yıldızlar güncellenirken bir hata oluştu.");
      }
    } finally {
      setIsFixingStars(false);
    }
  };

  // Auto-fix categories on mount
  React.useEffect(() => {
    if (user && students.length > 0) {
      const lastFix = localStorage.getItem(`star_fix_${user.uid}`);
      const now = Date.now();
      // Run once per day
      if (!lastFix || (now - Number(lastFix)) > 1000 * 60 * 60 * 24) {
        fixStarCategories(true);
        localStorage.setItem(`star_fix_${user.uid}`, now.toString());
      }
    }
  }, [user, students.length]);

  const lastProcessedRemoteRef = React.useRef(0);

  // Remote Control Effect for Etkinlikli Yıldız
  React.useEffect(() => {
    if (!user) return;
    const remoteDocRef = doc(db, 'users', user.uid, 'remote_control', 'state');
    
    const handleRemoteData = (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        const updatedAt = data.updatedAt || 0;
        
        // Prevent infinite loops in the same session, 
        // but allow firing on F5/hard refresh if command is recent (< 12 hours to handle timezone/clock skews)
        if (updatedAt !== lastProcessedRemoteRef.current) {
          lastProcessedRemoteRef.current = updatedAt;
          
          const now = Date.now();
          if (Math.abs(now - updatedAt) < 12 * 60 * 60 * 1000) {
            if (data.timerCommand === 'open_bulk_star') {
              setIsBulkModalOpen(true);
              setBulkStep(1);
            } else if (data.timerCommand === 'open_bulk_star_step2' && data.bulkConfig) {
              setBulkCategory(data.bulkConfig.category);
              setBulkDescription(data.bulkConfig.reason);
              setBulkAmount(data.bulkConfig.starCount || 1);
              setSelectedStudentIds([]); // Clear selection
              setIsBulkModalOpen(true);
              setBulkStep(2);
            }
          }
        }
      }
    };

    const unsub = onSnapshot(remoteDocRef, handleRemoteData);

    let unsub2 = () => {};
    const lowerEmail = (user.email || '').toLowerCase();
    if (lowerEmail === 'cihan.ozel10@gmail.com' || lowerEmail === 'cihanogretmen10@gmail.com') {
      const fallbackDocRef = doc(db, 'users', 'cihan_ozel_web_uid', 'remote_control', 'state');
      unsub2 = onSnapshot(fallbackDocRef, handleRemoteData);
    }

    return () => {
      unsub();
      unsub2();
    };
  }, [user]);

  // Timer Effect
  React.useEffect(() => {
    let interval: any;
    if (isBulkModalOpen && bulkStep === 2 && bulkTimer > 0 && timeLeft > 0 && !isSavingBulk) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSaveBulkStars();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBulkModalOpen, bulkStep, bulkTimer, timeLeft, isSavingBulk]);

  // Person Count Effect
  React.useEffect(() => {
    if (isBulkModalOpen && bulkStep === 2 && bulkPersonCount > 0 && selectedStudentIds.length >= bulkPersonCount && !isSavingBulk) {
      handleSaveBulkStars();
    }
  }, [selectedStudentIds.length, bulkPersonCount, isBulkModalOpen, bulkStep, isSavingBulk]);

  const getStandardCategory = (name: string) => {
    const categoryMap: Record<string, string> = {
      'Matematik': 'Matematik Yıldızı',
      'Fen Bilimleri': 'Fen Bilimleri Yıldızı',
      'Fen': 'Fen Bilimleri Yıldızı',
      'Hayat Bilgisi': 'Hayat Bilgisi Yıldızı',
      'Türkçe': 'Türkçe Yıldızı',
      'Sosyal Bilgiler': 'Sosyal Bilgiler Yıldızı',
      'İngilizce': 'İngilizce Yıldızı',
      'Gökkuşağı Yıldızı': 'Öğretmen Özel Ödülü Yıldızı',
      'Yarışma Yıldızı': 'Öğretmen Özel Ödülü Yıldızı',
      'Özel Ödül': 'Öğretmen Özel Ödülü Yıldızı'
    };
    
    if (categoryMap[name]) return categoryMap[name];
    if (name && !name.endsWith(' Yıldızı')) {
      const withYildizi = `${name} Yıldızı`;
      if (STAR_CATEGORIES.some(c => c.name === withYildizi)) return withYildizi;
    }
    return name;
  };

  const drawCategoryIcon = (category: string, size = 16) => {
    const standardName = getStandardCategory(category);
    const cat = STAR_CATEGORIES.find(c => c.name === standardName);
    const IconComponent = cat?.icon || Star;
    const colorClass = cat?.color || 'bg-amber-50 text-amber-600';
    
    return (
      <div className={`rounded-lg flex items-center justify-center ${colorClass}`} style={{ width: size * 2, height: size * 2 }}>
        <IconComponent size={size} fill="currentColor" />
      </div>
    );
  };
  const getCorrectedAmounts = (student: any) => {
    const amounts = new Map<any, number>();
    if (!student || !student.starHistory) return amounts;

    student.starHistory.forEach((star: any) => {
      if (star.amount !== undefined) {
        amounts.set(star, Number(star.amount));
      } else if (star.category === 'Kitap Kurdu Yıldızı' && star.description) {
        const match = star.description.match(/\((\d+)\s*Sayfa\)/i);
        if (match) {
          const amt = Math.ceil(parseInt(match[1]) / 10);
          amounts.set(star, amt);
        } else {
          amounts.set(star, 1);
        }
      } else {
        amounts.set(star, 1);
      }
    });

    return amounts;
  };

  const calculateTotalStars = (student: any) => {
    const correctedAmounts = getCorrectedAmounts(student);
    return (student.starHistory || []).reduce((sum: number, star: any) => {
      return sum + (correctedAmounts.get(star) || 1);
    }, 0);
  };

  const handleExportExcel = () => {
    const data = students.map(student => {
      const correctedAmounts = getCorrectedAmounts(student);
      const row: any = {
        'Okul No': student.studentNo,
        'Ad Soyad': student.name,
        'Cinsiyet': student.gender,
        'Toplam Yıldız': calculateTotalStars(student)
      };

      // Kategori bazlı toplam yıldızları ekle
      STAR_CATEGORIES.forEach(cat => {
        const total = (student.starHistory || [])
          .filter(h => h.category === cat.name)
          .reduce((sum, h) => sum + (correctedAmounts.get(h) || 1), 0);
        row[cat.name] = total;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Yıldızlar');
    XLSX.writeFile(workbook, `Yildizlar_Sinifi_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const batch = writeBatch(db);
        let updatedCount = 0;

        data.forEach((row: any) => {
          const studentNo = String(row['Okul No'] || '');
          const student = students.find(s => s.studentNo === studentNo);

          if (student) {
            let totalAdded = 0;
            const newHistory: any[] = [];

            STAR_CATEGORIES.forEach(cat => {
              const amount = parseInt(row[cat.name]);
              if (!isNaN(amount) && amount > 0) {
                totalAdded += amount;
                newHistory.push({
                  category: cat.name,
                  description: 'Excel İçe Aktarma',
                  amount: amount,
                  timestamp: Date.now()
                });
              }
            });

            if (totalAdded > 0) {
              const studentRef = doc(db, `users/${user.uid}/students/${student.id}`);
              batch.update(studentRef, {
                stars: increment(totalAdded),
                starHistory: arrayUnion(...newHistory)
              });
              updatedCount++;
            }
          }
        });

        if (updatedCount > 0) {
          await batch.commit();
          alert(`${updatedCount} öğrenci için yıldızlar başarıyla eklendi.`);
        } else {
          alert('Eklenecek yeni yıldız bulunamadı. Lütfen Excel dosyasındaki kategori sütunlarını kontrol edin.');
        }
      } catch (error) {
        console.error('Excel import error:', error);
        alert('Excel dosyası okunurken bir hata oluştu. Lütfen dosya formatını kontrol edin.');
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleResetAllStars = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      students.forEach(student => {
        const studentRef = doc(db, `users/${user.uid}/students/${student.id}`);
        batch.update(studentRef, {
          stars: 0,
          starHistory: []
        });
      });
      await batch.commit();
      setIsResetModalOpen(false);
    } catch (error) {
      console.error('Error resetting stars:', error);
    }
  };

  const handleAddStar = async (studentId: string, category: string, description: string = '', amount: number = 1) => {
    if (!user) return;
    const studentRef = doc(db, `users/${user.uid}/students/${studentId}`);
    try {
      await updateDoc(studentRef, {
        stars: increment(amount),
        starHistory: arrayUnion({
          category,
          description,
          amount,
          timestamp: Date.now()
        })
      });
      setIsStarModalOpen(false);
    } catch (error) {
      console.error('Error adding star:', error);
    }
  };

  const handleSaveBulkStars = async () => {
    if (!user || selectedStudentIds.length === 0 || !bulkCategory || isSavingBulk) return;
    
    setIsSavingBulk(true);
    try {
      const promises = selectedStudentIds.map(studentId => 
        handleAddStar(studentId, bulkCategory, bulkDescription, bulkAmount)
      );
      await Promise.all(promises);
      setIsBulkModalOpen(false);
      // Reset bulk state
      setBulkStep(1);
      
      // Open Lucky Student Question
      setIsLuckyQuestionModalOpen(true);
    } catch (error) {
      console.error('Error saving bulk stars:', error);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleLuckyStudentSelection = () => {
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    setLuckyWinner(randomStudent);
    setIsLuckyQuestionModalOpen(false);
    setIsLuckyWinnerModalOpen(true);
  };

  const handleLuckyStudentReward = async (isCorrect: boolean) => {
    if (isSavingBulk) return;
    
    setIsSavingBulk(true);
    try {
      if (isCorrect && luckyWinner && user) {
        const description = `${bulkDescription}${bulkDescription ? ' - ' : ''}Şanslı Öğrenci Ödülü`;
        await handleAddStar(luckyWinner.id, bulkCategory, description, bulkAmount);
      }
      
      // Final cleanup
      setIsLuckyWinnerModalOpen(false);
      setLuckyWinner(null);
      setBulkDescription('');
      setBulkCategory('');
      setBulkAmount(1);
      setSelectedStudentIds([]);
      setBulkTimer(0);
      setBulkPersonCount(0);
      setTimeLeft(0);
    } catch (error) {
      console.error('Error rewarding lucky student:', error);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleRemoveStarRecord = async (studentId: string, starRecord: any) => {
    if (!user) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const correctedAmounts = getCorrectedAmounts(student);
    const amountToRemove = correctedAmounts.get(starRecord) || 1;

    const studentRef = doc(db, `users/${user.uid}/students/${studentId}`);
    try {
      await updateDoc(studentRef, {
        stars: increment(-amountToRemove),
        starHistory: arrayRemove(starRecord)
      });
    } catch (error) {
      console.error('Error removing star:', error);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.studentNo || '').includes(searchTerm)
  );

  const topStudents = [...students].sort((a, b) => calculateTotalStars(b) - calculateTotalStars(a));
  const displayedTopStudents = leaderboardLimit === 'all' ? topStudents : topStudents.slice(0, leaderboardLimit);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 hover:bg-neutral-50 rounded-2xl transition-all text-neutral-400 hover:text-neutral-900"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">Yıldızlar Sınıfı</h1>
              <p className="text-neutral-400 font-medium">Öğrencilerinizi motive edin ve başarılarını yıldızlarla ödüllendirin.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2 border-r border-neutral-200 pr-4">
              <button
                onClick={handleExportExcel}
                className="p-3 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                title="Excel Olarak İndir"
              >
                <Download size={20} />
              </button>
              <label className="p-3 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all cursor-pointer" title="Excel'den Yıldız Yükle">
                <Upload size={20} />
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
              </label>
              <button
                onClick={fixStarCategories}
                disabled={isFixingStars}
                className={`p-3 rounded-2xl transition-all flex items-center gap-2 ${
                  isFixingStars 
                  ? 'bg-amber-50 text-amber-400 opacity-50' 
                  : 'text-neutral-400 hover:text-amber-600 hover:bg-amber-50'
                }`}
                title="Yıldız Kategorilerini Düzenle (Standartlaştır)"
              >
                {isFixingStars ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {isFixingStars && <span className="text-xs font-bold">Düzenleniyor...</span>}
              </button>
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="p-3 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                title="Tüm Yıldızları Sıfırla"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
            >
              <Sparkles size={16} />
              Etkinlikli Yıldız Ver
            </button>
            <div className="flex bg-neutral-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-400'}`}
              >
                TÜM ÖĞRENCİLER
              </button>
              <button 
                onClick={() => setActiveTab('top')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'top' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-400'}`}
              >
                LİDERLİK TABLOSU
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'all' ? (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text"
                  placeholder="Öğrenci ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white border border-neutral-100 rounded-2xl shadow-sm focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Students Grid */}
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStudents.map(student => (
                  <div 
                    key={student.id}
                    className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${
                          student.gender === 'Erkek' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                        }`}>
                          {student.studentNo}
                        </div>
                        <div>
                          <h3 className="font-black text-neutral-900 uppercase tracking-tight">{student.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-sm font-black text-amber-600">{calculateTotalStars(student)} Yıldız</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-3 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                          title="Yıldız Geçmişi"
                        >
                          <History size={20} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setIsStarModalOpen(true);
                          }}
                          className="relative w-12 h-12 bg-amber-400 text-white rounded-2xl hover:bg-amber-500 transition-all flex items-center justify-center shadow-lg shadow-amber-100 group/btn"
                        >
                          <Star size={24} fill="currentColor" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-amber-600 rounded-full flex items-center justify-center border-2 border-amber-400">
                            <Plus size={12} strokeWidth={4} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[32px] border border-dashed border-neutral-200 text-center">
                <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-neutral-300" />
                </div>
                <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">Öğrenci Bulunamadı</h3>
                <p className="text-neutral-400 font-medium">Arama kriterlerinize uygun öğrenci bulunmuyor veya henüz öğrenci eklemediniz.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[40px] shadow-sm border border-neutral-100">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-2 relative">
                <Trophy size={64} className="mx-auto text-amber-400 mb-4" />
                <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">Sınıfın Yıldızları</h2>
                <p className="text-neutral-400 font-medium">En çok yıldız toplayan öğrencilerimiz.</p>
                
                <div className="absolute top-0 right-0">
                  <select
                    value={leaderboardLimit}
                    onChange={(e) => setLeaderboardLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-4 py-2 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-amber-500 focus:bg-white outline-none transition-all font-bold text-xs text-neutral-600"
                  >
                    <option value={5}>İlk 5 Öğrenci</option>
                    <option value={10}>İlk 10 Öğrenci</option>
                    <option value="all">Tüm Sınıf</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {displayedTopStudents.map((student, index) => (
                  <div 
                    key={student.id}
                    className={`flex items-center justify-between p-6 rounded-3xl border ${
                      index === 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                        index === 0 ? 'bg-amber-400 text-white' : 
                        index === 1 ? 'bg-neutral-200 text-neutral-600' :
                        index === 2 ? 'bg-orange-200 text-orange-700' : 'bg-neutral-50 text-neutral-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-black text-neutral-900 uppercase tracking-tight">{student.name}</h3>
                        <p className="text-xs font-bold text-neutral-400">Okul No: {student.studentNo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-2xl font-black text-amber-600">{calculateTotalStars(student)}</span>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">YILDIZ</p>
                      </div>
                      {index === 0 && <Sparkles className="text-amber-400" size={24} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Star Category Selection Modal */}
      <AnimatePresence>
        {isStarModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Yıldız Ver</h3>
                    <p className="text-neutral-500 font-medium text-sm">{selectedStudent.name} için başarı kategorisi seçin.</p>
                  </div>
                  <button 
                    onClick={() => setIsStarModalOpen(false)}
                    className="p-2 hover:bg-neutral-50 rounded-xl transition-colors text-neutral-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                  {STAR_CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleAddStar(selectedStudent.id, category.name)}
                      className={`p-3 rounded-[2rem] border-2 border-neutral-50 hover:border-amber-200 hover:bg-amber-50/50 transition-all flex flex-col items-center justify-center text-center group gap-2 shadow-sm hover:shadow-md h-28 sm:h-32`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${category.color} rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                        <category.icon size={20} className="sm:w-6 sm:h-6" fill="currentColor" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-neutral-700 leading-tight max-w-[100px]">
                        {category.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Star History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Yıldız Geçmişi</h3>
                    <p className="text-neutral-500 font-medium">{selectedStudent.name}</p>
                  </div>
                  <button 
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="p-2 hover:bg-neutral-50 rounded-xl transition-colors text-neutral-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {(!selectedStudent.starHistory || selectedStudent.starHistory.length === 0) ? (
                    <div className="text-center py-12 text-neutral-300 font-bold uppercase tracking-widest">
                      Henüz yıldız yok
                    </div>
                  ) : (
                    (() => {
                      const correctedAmounts = getCorrectedAmounts(selectedStudent);
                        return [...selectedStudent.starHistory].reverse().map((record, i) => {
                          const standardName = getStandardCategory(record.category);
                          return (
                            <div key={`${record.timestamp || 'notime'}-${i}`} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl group">
                              <div className="flex items-center gap-3">
                                {drawCategoryIcon(record.category)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-neutral-700 uppercase tracking-tight">{standardName}</p>
                                    <span className="text-xs font-black text-amber-600">+{correctedAmounts.get(record) || 1}</span>
                                  </div>
                                  {record.description && (
                                    <p className="text-[10px] font-medium text-neutral-500 italic mb-0.5">{record.description}</p>
                                  )}
                                <p className="text-[10px] font-bold text-neutral-400">
                                  {new Date(record.timestamp).toLocaleString('tr-TR')}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveStarRecord(selectedStudent.id, record)}
                              className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reset All Stars Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Emin misiniz?</h3>
                  <p className="text-neutral-500 font-medium">
                    Tüm öğrencilerin yıldızları ve yıldız geçmişleri kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleResetAllStars}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                  >
                    Evet, Tümünü Sil
                  </button>
                  <button 
                    onClick={() => setIsResetModalOpen(false)}
                    className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neutral-200 transition-all"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Star Award Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-8 md:p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
                      Etkinlikli Yıldız Ver (Adım {bulkStep}/2)
                    </h3>
                    <p className="text-neutral-500 font-medium">
                      {bulkStep === 1 
                        ? 'Bir açıklama girin ve verilecek ödül kategorisini seçin.' 
                        : 'Yıldız verilecek öğrencileri seçin.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsBulkModalOpen(false);
                      setBulkStep(1);
                      setSelectedStudentIds([]);
                    }}
                    className="p-2 hover:bg-neutral-50 rounded-xl transition-colors text-neutral-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                {bulkStep === 1 ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-2 space-y-4">
                        <label className="block text-sm font-black text-neutral-700 uppercase tracking-widest">Etkinlik Açıklaması</label>
                        <textarea 
                          value={bulkDescription}
                          onChange={(e) => setBulkDescription(e.target.value)}
                          placeholder="Örn: Ders içi başarılı sunum, grup çalışmasına katkı..."
                          className="w-full h-32 p-6 bg-neutral-50 border-2 border-neutral-100 rounded-[2rem] focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="block text-sm font-black text-neutral-700 uppercase tracking-widest">Yıldız Ödülü</label>
                        <div className="flex items-center gap-4 p-4 bg-neutral-50 border-2 border-neutral-100 rounded-[2rem]">
                          <button 
                            onClick={() => setBulkAmount(Math.max(1, bulkAmount - 1))}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors shadow-sm"
                          >
                            <Trash2 size={20} />
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-3xl font-black text-indigo-600">{bulkAmount}</span>
                            <p className="text-[10px] font-black text-neutral-400 uppercase">Yıldız</p>
                          </div>
                          <button 
                            onClick={() => setBulkAmount(bulkAmount + 1)}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 hover:text-indigo-600 transition-colors shadow-sm"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="block text-sm font-black text-neutral-700 uppercase tracking-widest">Süre Ayarı (Saniye)</label>
                        <div className="flex items-center gap-4 p-4 bg-neutral-50 border-2 border-neutral-100 rounded-[2rem]">
                          <button 
                            onClick={() => setBulkTimer(Math.max(0, bulkTimer - 10))}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 hover:text-indigo-600 transition-colors shadow-sm"
                          >
                            -10
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-3xl font-black text-indigo-600">{bulkTimer}</span>
                            <p className="text-[10px] font-black text-neutral-400 uppercase">Saniye</p>
                          </div>
                          <button 
                            onClick={() => setBulkTimer(bulkTimer + 10)}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 hover:text-indigo-600 transition-colors shadow-sm"
                          >
                            +10
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium italic">Süre bittiğinde seçili öğrencilere yıldız verilir. (0 = Kapalı)</p>
                      </div>
                      <div className="space-y-4">
                        <label className="block text-sm font-black text-neutral-700 uppercase tracking-widest">Kişi Ayarı (Öğrenci Sayısı)</label>
                        <div className="flex items-center gap-4 p-4 bg-neutral-50 border-2 border-neutral-100 rounded-[2rem]">
                          <button 
                            onClick={() => setBulkPersonCount(Math.max(0, bulkPersonCount - 1))}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 hover:text-indigo-600 transition-colors shadow-sm"
                          >
                            -1
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-3xl font-black text-indigo-600">{bulkPersonCount}</span>
                            <p className="text-[10px] font-black text-neutral-400 uppercase">Kişi</p>
                          </div>
                          <button 
                            onClick={() => setBulkPersonCount(bulkPersonCount + 1)}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 hover:text-indigo-600 transition-colors shadow-sm"
                          >
                            +1
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium italic">Belirlenen sayıya ulaşıldığında otomatik kaydedilir. (0 = Kapalı)</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-black text-neutral-700 uppercase tracking-widest">Ödül Kategorisi</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {STAR_CATEGORIES.map(category => (
                          <button
                            key={category.id}
                            onClick={() => setBulkCategory(category.name)}
                            className={`p-3 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center text-center group gap-2 h-28 sm:h-32 ${
                              bulkCategory === category.name 
                                ? 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-50' 
                                : 'bg-white border-neutral-50 hover:border-amber-200 hover:bg-amber-50/30'
                            }`}
                          >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${category.color} rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                              <category.icon size={20} className="sm:w-6 sm:h-6" fill="currentColor" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-neutral-700 leading-tight max-w-[100px]">
                              {category.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                      <button 
                        onClick={() => setIsBulkModalOpen(false)}
                        className="px-8 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neutral-200 transition-all"
                      >
                        İptal
                      </button>
                      <button 
                        disabled={!bulkCategory}
                        onClick={() => {
                          setBulkStep(2);
                          if (bulkTimer > 0) setTimeLeft(bulkTimer);
                        }}
                        className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        İleri
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                          {React.createElement(STAR_CATEGORIES.find(c => c.name === bulkCategory)?.icon || Star, { size: 20, fill: 'currentColor' })}
                        </div>
                        <div>
                          <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">{bulkCategory}</p>
                          <p className="text-[10px] font-bold text-indigo-600">{bulkAmount} Yıldız Ödülü</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {bulkTimer > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Kalan Süre</p>
                            <p className="text-lg font-black text-red-600">{timeLeft}s</p>
                          </div>
                        )}
                        {bulkPersonCount > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Hedef Kişi</p>
                            <p className="text-lg font-black text-amber-600">{selectedStudentIds.length}/{bulkPersonCount}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Seçilen</p>
                          <p className="text-lg font-black text-indigo-600">{selectedStudentIds.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {students.sort((a, b) => a.name.localeCompare(b.name)).map(student => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                              } else {
                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center relative min-h-[60px] ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                                : (student.gender === 'Erkek' ? 'bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300' : 'bg-pink-50 border-pink-100 text-pink-700 hover:border-pink-300')
                            }`}
                          >
                            <span className={`text-[9px] font-black uppercase tracking-tight leading-tight ${isSelected ? 'text-white' : (student.gender === 'Erkek' ? 'text-blue-900' : 'text-pink-900')}`}>
                              {student.name}
                            </span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-white text-indigo-600 rounded-full shadow-sm">
                                <CheckCircle2 size={12} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <button 
                        onClick={() => setBulkStep(1)}
                        className="px-8 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neutral-200 transition-all"
                      >
                        Geri
                      </button>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setIsBulkModalOpen(false);
                            setBulkStep(1);
                            setSelectedStudentIds([]);
                          }}
                          className="px-8 py-4 text-neutral-400 font-black text-sm uppercase tracking-widest hover:text-red-500 transition-all"
                        >
                          İptal
                        </button>
                        <button 
                          disabled={selectedStudentIds.length === 0 || isSavingBulk}
                          onClick={handleSaveBulkStars}
                          className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingBulk ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Sparkles size={18} />
                          )}
                          {isSavingBulk ? 'Kaydediliyor...' : 'Kaydet ve Yıldızları Ver'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lucky Student Question Modal */}
      <AnimatePresence>
        {isLuckyQuestionModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <Sparkles size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Şanslı Öğrenci?</h3>
                  <p className="text-neutral-500 font-medium">
                    Etkinliği tamamlamak için rastgele bir öğrenci seçilsin mi?
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleLuckyStudentSelection}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Evet, Seç
                  </button>
                  <button 
                    onClick={() => {
                      setIsLuckyQuestionModalOpen(false);
                      handleLuckyStudentReward(false);
                    }}
                    className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neutral-200 transition-all"
                  >
                    Hayır, Bitir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lucky Winner Modal */}
      <AnimatePresence>
        {isLuckyWinnerModalOpen && luckyWinner && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8 text-center space-y-8">
                <div className="space-y-4">
                  <div className="w-24 h-24 bg-amber-400 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-xl shadow-amber-100">
                    <Star size={48} fill="currentColor" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-amber-600 font-black uppercase tracking-[0.3em] text-xs">Şanslı Öğrenci Seçildi!</p>
                    <h2 className="text-4xl font-black text-neutral-900 tracking-tight uppercase">
                      {luckyWinner.name}
                    </h2>
                    <p className="text-lg font-bold text-neutral-400">Okul No: {luckyWinner.studentNo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    disabled={isSavingBulk}
                    onClick={() => handleLuckyStudentReward(true)}
                    className="flex flex-col items-center gap-2 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] hover:bg-emerald-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isSavingBulk ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={24} />}
                    </div>
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Doğru Cevap</span>
                  </button>
                  <button 
                    disabled={isSavingBulk}
                    onClick={() => handleLuckyStudentReward(false)}
                    className="flex flex-col items-center gap-2 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] hover:bg-red-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <X size={24} />
                    </div>
                    <span className="text-xs font-black text-red-700 uppercase tracking-widest">Yanlış Cevap</span>
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
