import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Construction, 
  BookOpen, 
  Trophy, 
  PlusCircle, 
  Calendar, 
  Users, 
  FileText, 
  Download, 
  ChevronRight, 
  Star,
  Award,
  ArrowLeft,
  CheckCircle2,
  X,
  ClipboardList,
  Save,
  PenTool,
  Zap,
  Target,
  Calculator,
  Info,
  Plus,
  LayoutGrid
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
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Student } from '../../App';
import { GuzelOkumaActivity } from './GuzelOkumaActivity';
import { GuzelYazmaActivity } from './GuzelYazmaActivity';
import { EsZitAnlamActivity } from './EsZitAnlamActivity';
import { DortIslemActivity } from './DortIslemActivity';
import { RitmikSaymaActivity } from './RitmikSaymaActivity';
import { CarpimTablosuActivity } from './CarpimTablosuActivity';
import { GeometrikSekilActivity } from './GeometrikSekilActivity';
import { HayatBilgisiActivity } from './HayatBilgisiActivity';
import { FenBilimleriActivity } from './FenBilimleriActivity';
import { MatematikActivity } from './MatematikActivity';

export const predefinedActivities = [
  {
    id: 'guzel-okuma',
    category: 'Türkçe Yıldızı',
    title: 'Güzel Okuma Etkinliği',
    description: 'Metinleri veya şiirleri doğru vurgu, tonlama ve akıcılıkla okuma becerisini geliştirmeye yönelik çalışma.',
    features: [
      'Sınıf listesinden öğrenci seçimi',
      'Metin veya Şiir kategorisi belirleme',
      'Zaman tutma ve hata takibi',
      'Puanlama ve jüri değerlendirme sistemi',
      'Sonuçları PDF olarak kaydetme'
    ],
    instructions: 'Etkinlik Adını Giriniz. \nOkuyacağı türü (Metin veya Şiir) belirleyiniz. \nTarih seçimini yapınız. \nÖdül Planınızı belirleyiniz.\n"Yarışmayı Başlat" butonuyla süreci başlatın. \nOluşan Etkinlik kartında PDF al tuşuna basarak değerlendirme formunu indirebilirsiniz ya da doğrudan sonuç gir tuşuna basarak değerlendirmelerinizi anında girebilirsiniz.\nİlk 3 etkinlikte jüri sadece öğretmendir.\nSonraki etkinliklerde ise, önceki etkinliklerin değerlendirme sonuçların göre ilk 3\'e giren öğrenciler de öğretmenle birlikte jüri olur.',
    icon: BookOpen,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50'
  },
  {
    id: 'guzel-yazma',
    category: 'Türkçe Yıldızı',
    title: 'Güzel Yazma Etkinliği',
    description: 'Harflerin doğru yazılışı, harflerin aralıkları ve sayfa düzeni kurallarıyla güzel yazı yazma çalışmaları.',
    features: [
      'Estetik, Düzen ve Kurallara Uygunluk değerlendirmesi',
      'Jüri puan sistemi',
      'Sıralama ve şampiyon belirleme',
      'Başarı belgeleri ve PDF çıktı'
    ],
    instructions: 'Etkinlik Adını Giriniz. \nYazacağı türü (Metin veya Şiir) belirleyiniz. \nTarih seçimini yapınız. \nÖdül Planınızı belirleyiniz.\n"Yarışmayı Başlat" butonuyla süreci başlatın. \nOluşan Etkinlik kartında PDF al tuşuna basarak değerlendirme formunu indirebilirsiniz ya da doğrudan sonuç gir tuşuna basarak değerlendirmelerinizi anında girebilirsiniz.\nİlk 3 etkinlikte jüri sadece öğretmendir.\nSonraki etkinliklerde ise, önceki etkinliklerin değerlendirme sonuçların göre ilk 3\'e giren öğrenciler de öğretmenle birlikte jüri olur.',
    icon: PenTool,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50'
  },
  {
    id: 'zit-es-anlam',
    category: 'Türkçe Yıldızı',
    title: 'Zıt ve Eş Anlamlılar',
    description: 'Verilen kelimelerin zıt ve eş anlamlarını en hızlı şekilde bularak kelime dağarcığını zenginleştirme.',
    features: [
      'Zıt ve Eş anlam kategorilerine ayırma',
      'Kelime listesi oluşturma ve yönetme',
      'Canlı tahta yarışı modu',
      'Doğru cevap takibi'
    ],
    instructions: 'Önce Soru İçeriği Türünü, sonra da istediğiniz yarışma modunu seçiniz.\nİleri tuşuna basarak yarışmaya katılacak öğrencileri seçebilirsiniz. Yarışma rastgele 2 öğrenciyi eşler. Kazanan öğrenci bir üst tura adını yazdırır. Eleme usulü ile ilerleyen bu etkinlikte şampiyon olan öğrenci ödülü kazanır. Dilerseniz yarışmaya girmeden önce üstte yer alan ÖDÜL AYARLARI bölümümnden ödül miktarınızı değiştirebilirsiniz. KELİME YÖNETİMİ böümünden de yeni kelime çiftleri ekelyebilirsiniz.',
    icon: Zap,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50'
  },
  {
    id: 'matematik-firtinasi',
    category: 'Matematik Yıldızı',
    title: 'Matematik Fırtınası',
    description: 'Hızlı düşünme ve işlem yapma yeteneğini geliştiren, zamana karşı bir matematik serüveni.',
    features: [
      'Zamana karşı yarışma',
      'Farklı zorluk seviyeleri',
      'Yüksek puan tablosu',
      'Hızlı işlem bonusları'
    ],
    instructions: '1. Seviye seçin. \n2. Ekrana gelen matematik problemlerini en kısa sürede çözün. \n3. Hata yapmadan seri cevaplar vererek kombo yapın.',
    icon: Calculator,
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50'
  },
  {
    id: 'sayilarin-gizemi',
    category: 'Matematik Yıldızı',
    title: 'Sayıların Gizemi',
    description: 'Mantık yürütme ve problem çözme odaklı, bulmaca tarzında matematik etkinlikleri.',
    features: [
      'Mantık bulmacaları',
      'Sayı dizileri ve örüntüler',
      'Grateful matematik yaklaşımı',
      'Analitik düşünme becerisi'
    ],
    instructions: '1. Bulmacayı dikkatlice inceleyin. \n2. Verilen ipuçlarını kullanarak gizemli sayıları bulun. \n3. Her doğru cevapta yeni bir seviye açılır.',
    icon: Target,
    color: 'bg-cyan-600',
    lightColor: 'bg-cyan-50'
  },
  {
    id: 'dort-islem',
    category: 'Matematik Yıldızı',
    title: 'Dört İşlem Canavarı',
    description: 'Toplama, çıkarma, çarpma ve bölme işlemlerinde ustalaşın.',
    features: [
      'Karışık işlem soruları',
      'Hız ve doğruluk odaklı',
      'Zorluk kademeleri',
      'Canavar karakterlerle eğlence'
    ],
    instructions: '1. İşlem türünü seçin. \n2. Karşınıza çıkan canavarların sorularını doğru cevaplayarak onları alt edin. \n3. Ne kadar hızlı olursanız o kadar çok puan kazanırsınız.',
    icon: Calculator,
    color: 'bg-orange-600',
    lightColor: 'bg-orange-50'
  },
  {
    id: 'ritmik-sayma',
    category: 'Matematik Yıldızı',
    title: 'Ritmi Yakala',
    description: 'Sayılar arasındaki ritmi bulun ve seriyi tamamlayın.',
    features: [
      'Ritmik sayma egzersizleri',
      'Eğlenceli müzik ve ritim',
      'Farklı artış miktarları',
      'Konsantrasyon geliştirme'
    ],
    instructions: '1. Sayma kuralını belirleyin (2şer, 3er vb.). \n2. Boş bırakılan yerleri doğru sayılarla doldurun. \n3. Ritmi bozmadan ilerleyin.',
    icon: Star,
    color: 'bg-purple-600',
    lightColor: 'bg-purple-50'
  },
  {
    id: 'carpim-tablosu',
    category: 'Matematik Yıldızı',
    title: 'Çarpım Tablosu Ustası',
    description: 'Yarışarak ve oyun oynayarak çarpım tablosunu ezberleyin.',
    features: [
      'Birebir düello',
      'Otomatik test sistemi',
      'Hata raporu',
      'Şampiyonluk madalyası'
    ],
    instructions: '1. Çalışmak istediğiniz rakamı seçin. \n2. Çarpma işlemlerine hızlıca cevap verin. \n3. Arkadaşlarınızla yarışın.',
    icon: Trophy,
    color: 'bg-emerald-600',
    lightColor: 'bg-emerald-50'
  },
  {
    id: 'geometrik-sekiller',
    category: 'Matematik Yıldızı',
    title: 'Geometrik Şekiller Sahnesi',
    description: 'Şekilleri tanıyın, özelliklerini öğrenin ve kendi yapılarınızı oluşturun.',
    features: [
      'Görsel tanıma testleri',
      'Kenar ve köşe hesaplama',
      '3B modelleme temel eğitimi',
      'Yaratıcı tasarım modu'
    ],
    instructions: '1. Bir şekil seçin veya size sorulan şekli bulun. \n2. Kenar, köşe ve yüzey sayılarını doğru cevaplayın. \n3. Şekilleri birleştirerek verilen hedefleri tamamlayın.',
    icon: LayoutGrid,
    color: 'bg-indigo-600',
    lightColor: 'bg-indigo-50'
  },
  {
    id: 'hayat-bilgisi',
    category: 'Hayat Bilgisi Yıldızı',
    title: 'Hayat Bilgisi Serüveni',
    description: 'Ünite öğrenme içeriklerine uygun, eğlenceli ve öğretici bir bilgi yarışı.',
    features: [
      '6 Farklı ünite seçeneği',
      'Görsel destekli sorular',
      '1v1 Düello veya Antrenman modu',
      'Ünite sonu yıldız ödülü'
    ],
    instructions: '1. Çalışmak istediğiniz Üniteyi seçin.\n2. Oyun Modunu (Alıştırma veya Düello) belirleyin.\n3. Sorulara en hızlı ve doğru cevabı vererek puanları toplayın.\n4. Doğru cevaplar size yıldız kazandırır.',
    icon: Sparkles,
    color: 'bg-amber-400',
    lightColor: 'bg-amber-50'
  },
  {
    id: 'fen-bilimleri',
    category: 'Fen Bilimleri Yıldızı',
    title: 'Fen Bilimleri Arenası',
    description: 'Ünite öğrenme içeriklerine uygun, eğlenceli ve öğretici bir bilgi yarışı.',
    features: [
      ' Farklı ünite seçeneği',
      'Görsel destekli sorular',
      '1v1 Düello veya Antrenman modu',
      'Ünite sonu yıldız ödülü'
    ],
    instructions: '1. Çalışmak istediğiniz Üniteyi seçin.\n2. Oyun Modunu (Alıştırma veya Düello) belirleyin.\n3. Sorulara en hızlı ve doğru cevabı vererek puanları toplayın.\n4. Doğru cevaplar size yıldız kazandırır.',
    icon: Sparkles,
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50'
  }
];


export interface ActivityManagementProps {
  activityId: string;
  students: Student[];
  user: any;
  subject?: string;
  onBack?: () => void;
  onSelectActivity?: (id: string) => void;
  units?: any[];
  questions?: any[];
  onManageQuestions?: () => void;
}

export const ActivityManagement: React.FC<ActivityManagementProps> = ({ activityId, students, user, subject, onBack, onSelectActivity, units, questions, onManageQuestions }) => {
  const [selectedInfo, setSelectedInfo] = useState<any>(null);

  const filteredActivities = predefinedActivities.filter(a => {
    if (!subject) return true;
    const s = subject.toLowerCase();
    const cat = a.category.toLowerCase();
    
    if (s.includes('türkçe') && cat === 'türkçe yıldızı') return true;
    if (s.includes('matematik') && cat === 'matematik yıldızı') return true;
    if ((s.includes('hayat bilgisi') || s.includes('hayat')) && cat === 'hayat bilgisi yıldızı') return true;
    if ((s.includes('fen bilimleri') || s.includes('fen bilgisi') || s.includes('fen')) && cat === 'fen bilimleri yıldızı') return true;
    
    return cat === s;
  });

  let effectiveActivityId = activityId;
  const isAutoAssigned = !effectiveActivityId && subject && filteredActivities.length === 1;
  if (isAutoAssigned) {
    effectiveActivityId = filteredActivities[0].id;
  }

  const handleBack = () => {
    if (isAutoAssigned && onBack) {
      onBack();
    } else if (onBack) {
      onBack();
    }
  };

  const renderInfoModal = () => (
    <AnimatePresence>
      {selectedInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 max-h-[95vh] flex flex-col"
          >
            <div className={`h-32 ${selectedInfo.color} relative overflow-hidden flex items-center justify-center shrink-0`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-black rounded-full -mr-16 -mb-16 blur-3xl" />
              </div>
              <selectedInfo.icon size={64} className="text-white relative z-10 drop-shadow-lg" />
            </div>

            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{selectedInfo.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium">{selectedInfo.description}</p>
                </div>
                <button 
                  onClick={() => setSelectedInfo(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest mb-3">
                    <Sparkles size={16} className="text-amber-500" />
                    Özellikler
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedInfo.features.map((feature: string, i: number) => (
                      <div key={`activity-feature-${i}`} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest mb-3">
                    <Info size={16} className="text-indigo-500" />
                    Nasıl Yapılır?
                  </h4>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800">
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed font-medium">
                      {selectedInfo.instructions}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // This logic depends on the parent but since we are inside ActivityManagement,
                    // we might need a way to trigger navigation or just close modal
                    setSelectedInfo(null);
                  }}
                  className={`w-full py-5 ${selectedInfo.color} text-white rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3`}
                >
                  Tamam, Anladım
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (effectiveActivityId === 'guzel-okuma') {
    const activity = predefinedActivities.find(a => a.id === 'guzel-okuma');
    return (
      <>
        {renderInfoModal()}
        <GuzelOkumaActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'guzel-yazma') {
    const activity = predefinedActivities.find(a => a.id === 'guzel-yazma');
    return (
      <>
        {renderInfoModal()}
        <GuzelYazmaActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'es-zit-anlam' || effectiveActivityId === 'zit-es-anlam') {
    const activity = predefinedActivities.find(a => a.id === 'zit-es-anlam');
    return (
      <>
        {renderInfoModal()}
        <EsZitAnlamActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'matematik-arenasi' || effectiveActivityId === 'matematik-firtinasi' || effectiveActivityId === 'sayilarin-gizemi') {
    const activity = predefinedActivities.find(a => a.id === effectiveActivityId) || predefinedActivities.find(a => a.id === 'matematik-firtinasi');
    return (
      <>
        {renderInfoModal()}
        <MatematikActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
          units={units}
          questions={questions}
          onManageQuestions={onManageQuestions}
        />
      </>
    );
  }

  if (effectiveActivityId === 'dort-islem') {
    const activity = predefinedActivities.find(a => a.id === 'dort-islem');
    return (
      <>
        {renderInfoModal()}
        <DortIslemActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'ritmik-sayma') {
    const activity = predefinedActivities.find(a => a.id === 'ritmik-sayma');
    return (
      <>
        {renderInfoModal()}
        <RitmikSaymaActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'carpim-tablosu') {
    const activity = predefinedActivities.find(a => a.id === 'carpim-tablosu');
    return (
      <>
        {renderInfoModal()}
        <CarpimTablosuActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'geometrik-sekiller') {
    const activity = predefinedActivities.find(a => a.id === 'geometrik-sekiller');
    return (
      <>
        {renderInfoModal()}
        <GeometrikSekilActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
        />
      </>
    );
  }

  if (effectiveActivityId === 'hayat-bilgisi') {
    const activity = predefinedActivities.find(a => a.id === 'hayat-bilgisi');
    return (
      <>
        {renderInfoModal()}
        <HayatBilgisiActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
          units={units}
          questions={questions}
          onManageQuestions={onManageQuestions}
        />
      </>
    );
  }

  if (effectiveActivityId === 'fen-bilimleri') {
    const activity = predefinedActivities.find(a => a.id === 'fen-bilimleri');
    return (
      <>
        {renderInfoModal()}
        <FenBilimleriActivity 
          onBack={handleBack} 
          students={students}
          user={user}
          onShowInfo={() => setSelectedInfo(activity)}
          units={units}
          questions={questions}
          onManageQuestions={onManageQuestions}
        />
      </>
    );
  }

  // Activity Selection Grid (when no specific activity is selected)
  return (
    <div className="space-y-8 pb-12">
      {renderInfoModal()}
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter">
            {subject ? `${subject} Etkinlikleri` : 'Tüm Etkinlikler'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium text-lg">
            Öğrenmeyi eğlenceli hale getiren dijital etkinlikler ve yarışmalar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity) => (
          <motion.div
            key={activity.id}
            whileHover={{ y: -8 }}
            className="group bg-white dark:bg-neutral-900 rounded-[2.5rem] overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all"
          >
            <div className={`h-3 w-full ${activity.color}`} />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${activity.lightColor} text-neutral-900 group-hover:scale-110 transition-transform`}>
                  <activity.icon size={28} />
                </div>
              </div>

              <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-tight leading-tight">
                {activity.title}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium leading-relaxed mb-8">
                {activity.description}
              </p>

              <button
                onClick={() => {
                  if (onSelectActivity) {
                    onSelectActivity(activity.id);
                  } else {
                    window.location.hash = `#/etkinlik/${activity.id}`;
                  }
                }}
                className={`w-full py-4 rounded-2xl ${activity.color} text-white font-bold shadow-lg shadow-neutral-200 dark:shadow-none hover:brightness-110 transition-all flex items-center justify-center gap-2`}
              >
                <span>Hemen Başlat</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        ))}

        {/* Soon Cards for future ideas */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-[2.5rem] border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center">
            <Plus size={32} />
          </div>
          <h4 className="text-lg font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-tight">Yeni Etkinlikler</h4>
          <p className="text-neutral-400 dark:text-neutral-600 text-sm font-medium">Yakında daha fazla eğlenceli içerik eklenecektir.</p>
        </div>
      </div>
    </div>
  );
};
