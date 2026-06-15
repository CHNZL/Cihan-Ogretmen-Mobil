import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Trash2, X } from 'lucide-react';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

interface PersistentLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  unit: any;
}

export const PersistentLeaderboardModal: React.FC<PersistentLeaderboardModalProps> = ({ isOpen, onClose, user, unit }) => {
  const [persistentLeaderboard, setPersistentLeaderboard] = useState<any[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!isOpen || !unit || !user) return;

    const fetchData = async () => {
      try {
        const leaderboardRef = collection(db, `users/${user.uid}/lessonUnits/${unit.id}/leaderboard`);
        const snapshot = await getDocs(leaderboardRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by score (desc), then time (asc)
        data.sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeMs - b.timeMs;
        });
        setPersistentLeaderboard(data);
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
      }
    };
    fetchData();
  }, [isOpen, unit, user]);

  const handleResetLeaderboard = async () => {
    if (!unit || !user) return;
    setIsResetting(true);

    try {
      const leaderboardRef = collection(db, `users/${user.uid}/lessonUnits/${unit.id}/leaderboard`);
      const snapshot = await getDocs(leaderboardRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setShowResetConfirm(false);
      setPersistentLeaderboard([]);
    } catch (error) {
      console.error("Error resetting leaderboard:", error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div className="flex items-center gap-3 text-neutral-800">
            <Trophy size={18} className="text-amber-500" />
            <h3 className="font-black text-lg">{unit.name || unit.title} - Sınıf Sıralaması</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-neutral-50/30">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 rounded-2xl flex items-center justify-center -rotate-3 shadow-sm">
                  <Trophy size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 drop-shadow-sm">Şampiyonlar Tablosu</h2>
                  <p className="text-neutral-500 font-bold text-sm">Bu ünitenin en iyileri kimler?</p>
                </div>
              </div>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-colors border-2 border-rose-100"
                >
                  <Trash2 size={18} /> Sıralamayı Sıfırla
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-red-50 p-3 rounded-2xl border-2 border-red-200">
                  <span className="text-sm font-black text-rose-600 uppercase tracking-widest px-2">Emin misin?</span>
                  <button
                    onClick={handleResetLeaderboard}
                    disabled={isResetting}
                    className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {isResetting ? 'Sıfırlanıyor...' : 'Evet, Sıfırla'}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isResetting}
                    className="px-6 py-2 bg-white text-neutral-700 rounded-xl font-bold hover:bg-neutral-100 border-2 border-neutral-200 transition-colors disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {persistentLeaderboard.map((entry, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={entry.id} 
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border-[2px] transition-transform hover:scale-[1.01] ${
                    idx === 0 ? 'bg-amber-50 border-amber-300 shadow-sm z-10' :
                    idx === 1 ? 'bg-neutral-50 border-neutral-300 shadow-sm' :
                    idx === 2 ? 'bg-orange-50 border-orange-200 shadow-sm' :
                    'bg-white border-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-base shadow-sm ${
                      idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white -rotate-6' :
                      idx === 1 ? 'bg-gradient-to-br from-neutral-400 to-neutral-600 text-white -rotate-3' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white rotate-3' :
                      'bg-neutral-100 text-neutral-400'
                    }`}>
                      #{idx + 1}
                    </div>
                    <p className="font-black text-neutral-900 text-lg">{entry.studentName}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-right bg-white/50 px-3 py-1.5 rounded-xl">
                    <div>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Skor</p>
                      <p className="font-black text-emerald-600 text-lg">{entry.score}<span className="text-xs text-emerald-600/50">/{entry.totalQuestions}</span></p>
                    </div>
                    <div className="w-px h-6 bg-neutral-200" />
                    <div>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Süre</p>
                      <p className="font-black text-blue-500 text-lg">{(entry.timeMs / 1000).toFixed(1)}s</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {persistentLeaderboard.length === 0 && (
                <div className="p-12 text-center bg-neutral-50 rounded-[2rem] border-4 border-dashed border-neutral-200">
                  <Trophy size={48} className="mx-auto text-neutral-300 mb-4" />
                  <h3 className="text-xl font-black text-neutral-400">Henüz kimse yarışmadı</h3>
                  <p className="text-neutral-400 font-bold mt-2">Bu ünitenin ilk şampiyonu kim olacak?</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
