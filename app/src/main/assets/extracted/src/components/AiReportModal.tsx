import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Copy, Check, Download, AlertCircle, Bot } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'react-hot-toast';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  activities: any[];
  readingRecords: any[];
  tournaments: any[];
  totalStars: number;
}

export const AiReportModal: React.FC<AiReportModalProps> = ({
  isOpen,
  onClose,
  student,
  activities,
  readingRecords,
  tournaments,
  totalStars
}) => {
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = localStorage.getItem('user_gemini_api_key');
      if (!apiKey) {
        toast.error('AI kullanabilmek için Lütfen sağ üstteki Profil menüsünden (Profil ve Ayarlar) Gemini API anahtarınızı girin.');
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Gather student data summary
      const starCategories = activities
        .filter(a => a.type === 'star')
        .reduce((acc: any, curr) => {
          const cat = curr.title.replace('Yıldız Kazanıldı', '').trim() || 'Genel';
          acc[cat] = (acc[cat] || 0) + (curr.amount || 1);
          return acc;
        }, {});

      const bookCount = readingRecords.filter(r => r.endDate).length;
      
      const prompt = `Lütfen aşağıdaki bilgilere sahip bir ilkokul öğrencisi için veli toplantısında öğretmenin veliye verebileceği samimi, yapıcı, profesyonel ama sıcak bir dille (Cihan Öğretmen üslubunda) "Dönem Sonu / Gelişim Değerlendirme Taslak Raporu" oluştur. Raporu doğrudan kopyalanıp veliye verilebilecek şekilde yaz, giriş ve çıkışlarda açıklama yapma. Emojileri dozunda kullan.

Öğrenci Bilgileri:
- Adı: ${student.name}
- Cinsiyeti: ${student.gender}
- Sınıfı: ${student.gradeLevel || 'İlkokul'}-${student.section || ''} Şubesi

Performans Özeti:
- Toplam Kazanılan Yıldız: ${totalStars}
- Yıldız Kazanılan Alanlar: ${Object.entries(starCategories).map(([k,v]) => `${k} (${v})`).join(', ') || 'Yok'}
- Okuduğu Tamamlanan Kitap Sayısı: ${bookCount}
- Katıldığı Turnuvalar/Etkinlikler: ${tournaments.length}

Raporun Formatı (Markdown olarak):
- Başlık: 🌟 [Öğrenci Adı] Gelişim Raporu
- Kısa bir karşılama ve genel durum değerlendirmesi.
- Güçlü yönleri (kazanılan yıldız alanlarına ve okuduğu kitap sayılarına göre vurgula).
- Gelişime açık yönleri veya desteklenmesi gereken alanlar (çok nazik bir dille).
- Öğretmenin kapanış notu ve veliye teşekkür.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: 'Sen ilkokul öğretmeni Cihan Öğretmen\'in idari asistanı olan bir yapay zekasın. Veliler için sıcak, profesyonel, yapıcı ve samimi değerlendirme raporları hazırlıyorsun. Emojileri çok dengeli kullanmalısın.',
          temperature: 0.7,
        }
      });

      if (response.text) {
        setReport(response.text.trim());
      } else {
        throw new Error('Yanıt alınamadı.');
      }
    } catch (err: any) {
      console.error('Yapay zeka raporu oluşturulurken hata:', err);
      setError(err.message || 'Rapor oluşturulurken bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-indigo-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-neutral-900 uppercase tracking-tight">AI Gelişim Raporu</h3>
                <p className="text-neutral-500 font-medium text-sm">{student.name} için asistan raporu</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white rounded-2xl transition-colors text-neutral-400 shadow-sm"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 flex flex-col relative">
            {!report && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                  <Sparkles size={32} />
                </div>
                <h4 className="text-lg font-bold text-neutral-900 mb-2">Otomatik Rapor Oluşturucu</h4>
                <p className="text-neutral-500 max-w-sm mb-6 text-sm leading-relaxed">
                  Öğrencinin tüm yıldızları, kitap okuma kayıtları ve katılımını analiz edip veliye sunulacak taslak bir rapor oluşturun.
                </p>
                <button
                  onClick={generateReport}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                >
                  Raporu Oluştur
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-48 text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-indigo-600 font-bold animate-pulse">Sistemdeki veriler analiz ediliyor, rapor yazılıyor...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Bir hata oluştu</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button onClick={generateReport} className="mt-4 px-4 py-2 bg-red-100 font-bold rounded-xl hover:bg-red-200 transition">
                    Tekrar Dene
                  </button>
                </div>
              </div>
            )}

            {report && !isGenerating && (
              <div className="flex flex-col bg-neutral-50 p-6 rounded-3xl border border-neutral-100 text-neutral-800 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {report}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {report && !isGenerating && (
            <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={generateReport}
                className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 border border-indigo-100 transition shadow-sm"
              >
                Yeniden Oluştur
              </button>
              <button
                onClick={handleCopy}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
                {isCopied ? 'Kopyalandı!' : 'Kopyala'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
