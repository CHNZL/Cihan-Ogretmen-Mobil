import React from 'react';
import { Sparkles, ArrowRight, School, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

export const MemberDashboard = ({ setActiveTab, onSetProfileType }: { 
  setActiveTab: (tab: string) => void;
  onSetProfileType: (type: 'ÖĞRETMEN' | 'VELİ') => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 p-4 md:p-8"
    >
      <div className="bg-white dark:bg-neutral-900 p-8 md:p-12 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 text-center">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles size={40} />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Hoş Geldiniz!</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium mb-10 max-w-lg mx-auto">
          Sitemize hoş geldiniz. Henüz bir profil türü seçmediniz. Lütfen aşağıdaki seçeneklerden size uygun olanı seçerek profilinizi tamamlayın.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto">
          <button
            onClick={() => onSetProfileType('ÖĞRETMEN')}
            className="flex flex-col items-center p-8 bg-indigo-600 text-white rounded-[2rem] hover:bg-indigo-700 transition-all shadow-md group"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <School size={32} />
            </div>
            <span className="font-black text-2xl tracking-tight mb-1">Öğretmenim</span>
            <span className="text-sm text-indigo-100 font-medium">Profilimi doldur</span>
          </button>
          
          <button
            onClick={() => onSetProfileType('VELİ')}
            className="flex flex-col items-center p-8 bg-emerald-600 text-white rounded-[2rem] hover:bg-emerald-700 transition-all shadow-md group"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UserPlus size={32} />
            </div>
            <span className="font-black text-2xl tracking-tight mb-1">Veliyim</span>
            <span className="text-sm text-emerald-100 font-medium">Öğrencimi bağla</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
