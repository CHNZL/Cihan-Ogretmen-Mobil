import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Maximize2 } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const WelcomePopupViewer: React.FC<{ user: any, activeTab?: string }> = ({ user, activeTab }) => {
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hideFuture, setHideFuture] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasBeenClosedForTab, setHasBeenClosedForTab] = useState(false);

  // Reset closed status when navigating back to home
  useEffect(() => {
    if (activeTab === 'home') {
      setHasBeenClosedForTab(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const campaignsRef = collection(db, 'welcome_campaigns');
    const q = query(campaignsRef, where('isActive', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const now = Date.now();
      
      const currentCampaign = campaigns.find(c => {
        return c.startDate <= now && c.endDate >= now;
      });

      if (currentCampaign) {
        const storageKey = `hide_welcome_${currentCampaign.id}`;
        const hasDismissed = localStorage.getItem(storageKey);
        if (!hasDismissed) {
          setActiveCampaign(currentCampaign);
        } else {
           setActiveCampaign(null);
        }
      } else {
        setActiveCampaign(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching welcome campaigns:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleClose = () => {
    if (activeCampaign && hideFuture) {
      localStorage.setItem(`hide_welcome_${activeCampaign.id}`, 'true');
      setActiveCampaign(null); // Kalıcı olarak state'ten temizle
    }
    setHasBeenClosedForTab(true);
  };

  if (isLoading || !activeCampaign) return null;
  
  // Eğer localStorage'da zaten gizli işaretlenmişse hemen null dön
  if (activeCampaign && localStorage.getItem(`hide_welcome_${activeCampaign.id}`)) return null;

  // If user navigated to another tab and we don't want to show it on other tabs every time, 
  // or if they explicitly closed it while on the current tab view
  if (hasBeenClosedForTab || activeTab !== 'home') return null;

  const processMediaUrl = (url: string, type: string) => {
    if (!url) return url;

    // Google Drive Linkleri
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : null;

      if (fileId) {
        if (type === 'image') {
          // Drive görsellerini doğrudan gösterebilmek için thumbnail veya uc endpointi
          // Güvenilir olması adına thumbnail endpointini (sz=w1200 ile büyük boy) kullanıyoruz
          return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
        } else if (type === 'video') {
          // Drive videolarını iframe içinde göstermek için preview endpointi
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
    }

    // YouTube Linkleri (Video)
    if (type === 'video' && (url.includes('youtube.com/watch') || url.includes('youtu.be'))) {
      const ytMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
      const ytId = ytMatch ? ytMatch[1] : null;
      if (ytId) {
        return `https://www.youtube.com/embed/${ytId}`;
      }
    }

    return url;
  };

  const processedUrl = activeCampaign.mediaUrl ? processMediaUrl(activeCampaign.mediaUrl, activeCampaign.mediaType) : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden z-10"
        >
          {/* Close Button overlay */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-neutral-100/90 hover:bg-neutral-200 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 text-neutral-500 rounded-full transition-colors z-[100] backdrop-blur-md"
          >
            <X size={20} />
          </button>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            {/* Media Header */}
            {activeCampaign.mediaUrl && activeCampaign.mediaUrl.trim() !== '' && (
              <div 
                className="-mt-6 -mx-6 sm:-mt-8 sm:-mx-8 mb-6 relative aspect-video bg-neutral-100 dark:bg-neutral-800 overflow-hidden cursor-pointer group flex-shrink-0"
                onClick={() => setIsExpanded(true)}
              >
                {activeCampaign.mediaType === 'image' && (
                  <img src={processedUrl} alt={activeCampaign.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                {activeCampaign.mediaType === 'video' && (
                  <div className="w-full h-full relative pointer-events-none">
                    {/* Overlay to catch clicks over iframe */}
                    <div className="absolute inset-0 z-10" />
                    <iframe 
                      src={processedUrl} 
                      title={activeCampaign.title}
                      className="w-full h-full border-0 pointer-events-none" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      tabIndex={-1}
                    />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 z-20 flex items-center justify-center">
                   <div className="bg-white/90 text-neutral-900 p-3 rounded-full opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg backdrop-blur-sm">
                     <Maximize2 size={24} />
                   </div>
                </div>
              </div>
            )}

            <div className="text-center relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6 mx-auto">
                <Calendar size={24} />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mb-4 leading-tight">
                {activeCampaign.title}
              </h2>
              
              <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed text-left max-w-none">
                {activeCampaign.message}
              </p>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="bg-neutral-50 dark:bg-neutral-800/80 px-6 py-6 sm:px-8 sm:py-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-4 relative z-10 flex-shrink-0">
            <label className="flex items-center gap-3 cursor-pointer group w-fit mx-auto">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={hideFuture}
                  onChange={e => setHideFuture(e.target.checked)}
                  className="peer w-5 h-5 appearance-none rounded border-2 border-neutral-300 dark:border-neutral-600 checked:border-indigo-600 checked:bg-indigo-600 transition-colors cursor-pointer"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none text-white">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors">Bu etkinliği bir daha gösterme</span>
            </label>
            
            <button
              onClick={handleClose}
              className="w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98]"
            >
              Tamam, Kapat
            </button>
          </div>
        </motion.div>
      </div>

      {/* Expanded Media Overlay */}
      {isExpanded && activeCampaign.mediaUrl && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            onClick={() => setIsExpanded(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center overflow-hidden rounded-2xl"
          >
            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 backdrop-blur-md"
            >
              <X size={24} />
            </button>
            
            {activeCampaign.mediaType === 'image' && (
              <img 
                src={processedUrl} 
                alt={activeCampaign.title} 
                className="w-full h-full object-contain" 
              />
            )}
            {activeCampaign.mediaType === 'video' && (
              <iframe 
                src={processedUrl} 
                title={activeCampaign.title}
                className="w-full h-full border-0 rounded-2xl shadow-2xl" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
