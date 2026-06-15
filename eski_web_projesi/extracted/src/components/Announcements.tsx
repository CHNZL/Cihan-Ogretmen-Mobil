import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Trash2, CheckCircle2, User, Users, Check, Clock, X, Eye, Pencil, MessageSquare,
  BarChart2, ListPlus, Vote, Sparkles, Bot
} from 'lucide-react';
import { 
  collection, query, addDoc, serverTimestamp, orderBy, updateDoc, doc, deleteDoc, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import Messages from './Messages';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'react-hot-toast';

export default function Announcements({
  user,
  teacherUid,
  students,
  selectedStudentId,
  isTeacher,
  unreadAnnouncementsCount,
  unreadMessagesCount
}: any) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'messages'>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateAiDraft = async () => {
    if (!content.trim()) {
      setErrorMessage("Önce ana fikri kısaca yazmalısınız (Örn: Yarın gezi var).");
      return;
    }
    
    setIsGeneratingAi(true);
    setErrorMessage(null);
    try {
      const apiKey = localStorage.getItem('user_gemini_api_key');
      if (!apiKey) {
        toast.error('AI kullanabilmek için Lütfen sağ üstteki Profil menüsünden (Profil ve Ayarlar) Gemini API anahtarınızı girin.');
        setIsGeneratingAi(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Aşağıda velilere gönderilmek üzere kısa bir ana fikir verilmiştir. Lütfen bunu, ilkokul öğretmeni Cihan Öğretmen'in üslubuyla, samimi, saygılı, net ve enerjik bir mesaja dönüştür. Emojileri dozunda ve güzel kullan. Yeni mesajı sadece metin olarak döndür.
      
Taslak/Ana Fikir: ${content}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            systemInstruction: "Sen samimi, sevecen ve profesyonel bir ilkokul öğretmeni olan Cihan Öğretmen'sin. Velilere yazılan duyurularında her zaman sıcak bir üslup kullanırsın.",
            temperature: 0.7
        }
      });
      
      if (response.text) {
        setContent(response.text.trim());
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("AI taslağı oluşturulurken hata: " + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    if (!teacherUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, `users/${teacherUid}/announcements`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      let fetched: any[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Handle local pending writes gracefully
          createdAt: data.createdAt || { seconds: Date.now() / 1000 }
        };
      });

      // Maintain order including pending local writes
      fetched.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

      if (!isTeacher) {
        // Parent view: filter to ones meant for them
        fetched = fetched.filter(a => 
          a.targetAudience === 'ALL' || (a.targetStudentIds && a.targetStudentIds.includes(selectedStudentId))
        );
      }
      
      setAnnouncements(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Duyurular getirilemedi:", err);
      // Wait for it silently so it doesn't crash if offline, but drop loading state
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teacherUid, isTeacher, selectedStudentId]);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (targetAudience === 'SPECIFIC' && selectedStudentIds.length === 0) {
      setErrorMessage("Lütfen en az bir öğrenci seçin.");
      return;
    }

    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        targetAudience,
        targetStudentIds: targetAudience === 'ALL' ? [] : selectedStudentIds,
        readBy: editingAnnouncement?.readBy || {},
        hasPoll,
        pollOptions: hasPoll ? pollOptions.filter(opt => opt.trim() !== '') : [],
        pollVotes: editingAnnouncement?.pollVotes || {}
      };

      if (editingAnnouncement) {
        await updateDoc(doc(db, `users/${user.uid}/announcements`, editingAnnouncement.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, `users/${user.uid}/announcements`), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setTitle('');
      setContent('');
      setTargetAudience('ALL');
      setSelectedStudentIds([]);
      setHasPoll(false);
      setPollOptions(['', '']);
      setEditingAnnouncement(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("İşlem sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (ann: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnnouncement(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setTargetAudience(ann.targetAudience);
    setSelectedStudentIds(ann.targetStudentIds || []);
    setHasPoll(ann.hasPoll || false);
    setPollOptions(ann.pollOptions?.length ? ann.pollOptions : ['', '']);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteDoc(doc(db, `users/${user.uid}/announcements`, id));
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      setErrorMessage("Silinirken bir hata oluştu.");
    }
  };

  const handleRead = async (announcement: any) => {
    // Only parents mark as read
    if (!isTeacher && selectedStudentId) {
      const isAlreadyRead = announcement.readBy && announcement.readBy[selectedStudentId];
      if (!isAlreadyRead) {
        try {
          const ref = doc(db, `users/${teacherUid}/announcements`, announcement.id);
          await updateDoc(ref, {
             [`readBy.${selectedStudentId}`]: serverTimestamp()
          });
          // Optimistically update local state
          setAnnouncements(prev => prev.map(a => {
            if (a.id === announcement.id) {
              return {
                ...a,
                readBy: {
                  ...(a.readBy || {}),
                  [selectedStudentId]: { seconds: Date.now() / 1000 }
                }
              }
            }
            return a;
          }));
        } catch (err) {
          console.error("Okundu işaretlenemedi:", err);
        }
      }
    }
    
    // Toggle expand
    if (expandedId === announcement.id) {
      setExpandedId(null);
    } else {
      setExpandedId(announcement.id);
    }
  };

  const handleVote = async (announcement: any, optionIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTeacher || !selectedStudentId) return;
    
    try {
      const ref = doc(db, `users/${teacherUid}/announcements`, announcement.id);
      await updateDoc(ref, {
         [`pollVotes.${selectedStudentId}`]: optionIndex
      });
    } catch (err) {
      console.error("Oy kullanılamadı:", err);
    }
  };

  const getPollResults = (ann: any) => {
    const votes = ann.pollVotes || {};
    const totalVotes = Object.keys(votes).length;
    const results = ann.pollOptions.map((opt: string, idx: number) => {
      // Robust comparison for index (Firestore numbers can be tricky)
      const voterIds = Object.keys(votes).filter(uid => {
        const voteValue = votes[uid];
        return voteValue !== undefined && voteValue !== null && Number(voteValue) === idx;
      });
      
      const voters = voterIds.map(id => {
        const student = students?.find((s: any) => s.id === id);
        return {
          id,
          name: student ? student.name : `Veli/Öğrenci (ID: ${id.slice(-4)})`
        };
      });
      
      return {
        option: opt,
        count: voterIds.length,
        voters,
        percent: totalVotes > 0 ? Math.round((voterIds.length / totalVotes) * 100) : 0
      };
    });
    return { results, totalVotes };
  };

  const formatDate = (ts: any) => {
    if (!ts || !ts.seconds) return '';
    return new Date(ts.seconds * 1000).toLocaleString('tr-TR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Top Tabs */}
      <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-neutral-100 mb-4 max-w-sm mx-auto relative overflow-hidden">
        {/* Animated background pill for Active Tab */}
        <div 
          className="absolute inset-y-1 bg-indigo-600 rounded-xl transition-all duration-300 ease-out z-0"
          style={{ 
            width: 'calc(50% - 4px)', 
            left: activeTab === 'announcements' ? '4px' : 'calc(50% + 0px)' 
          }}
        />

        {/* Tab 1: Announcements */}
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex-1 flex flex-col items-center justify-center p-2 sm:py-2 sm:px-4 rounded-xl relative z-10 transition-colors ${
            activeTab === 'announcements' ? 'text-white' : 'text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <div className="relative">
            <Megaphone size={18} className="mb-0.5" />
            {(unreadAnnouncementsCount || 0) > 0 && (
               <span className={`absolute -top-1 -right-2 text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white ${
                 activeTab === 'announcements' ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
               }`}>
                 {unreadAnnouncementsCount}
               </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-bold truncate">
            {isTeacher ? 'Duyurularım' : 'Duyurular'}
          </span>
        </button>

        {/* Tab 2: Messages */}
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex-1 flex flex-col items-center justify-center p-2 sm:py-2 sm:px-4 rounded-xl relative z-10 transition-colors ${
            activeTab === 'messages' ? 'text-white' : 'text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <div className="relative">
             <MessageSquare size={18} className="mb-0.5" />
             {(unreadMessagesCount || 0) > 0 && (
                <span className={`absolute -top-1 -right-2 text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white ${
                  activeTab === 'messages' ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
                }`}>
                  {unreadMessagesCount}
                </span>
             )}
          </div>
          <span className="text-[10px] sm:text-xs font-bold truncate">
            {isTeacher ? 'Velilerle Sohbet' : 'Öğretmeninle Sohbet'}
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'announcements' && (
          <motion.div
            key="announcements-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-neutral-900">
                    {isTeacher ? 'Duyurular' : 'Duyurular'}
                  </h1>
                  <p className="text-neutral-500 text-[11px] hidden sm:block">
                    {isTeacher ? 'Sınıfınıza veya velilere özel duyurular gönderin.' : 'Öğretmeninizden gelen duyurular.'}
                  </p>
                </div>
              </div>
              
              {isTeacher && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all shrink-0"
                >
                  <Plus size={16} />
                  Yeni Duyuru
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-20 text-neutral-400">Yükleniyor...</div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-neutral-100 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-300">
                  <Megaphone size={32} />
                </div>
                <h3 className="text-xl font-bold text-neutral-800 mb-2">Henüz Duyuru Yok</h3>
                <p className="text-neutral-500">
                   {isTeacher ? "Yeni bir duyuru oluşturmak için yukarıdaki butonu kullanın." : "Öğretmeniniz henüz bir duyuru paylaşmadı."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => {
                  const isExpanded = expandedId === ann.id;
                  const isReadForParent = !isTeacher && ann.readBy && ann.readBy[selectedStudentId!];

                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white border rounded-3xl overflow-hidden shadow-sm transition-all ${
                        !isTeacher && !isReadForParent ? 'border-amber-300 shadow-amber-50' : 'border-neutral-200'
                      }`}
                    >
                      <div 
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-neutral-50 transition-colors ${!isTeacher && !isReadForParent ? 'bg-amber-50/30' : ''}`}
                        onClick={() => handleRead(ann)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-neutral-100 text-neutral-600">
                              {formatDate(ann.createdAt)}
                            </span>
                            {ann.hasPoll && (
                               <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                 <Vote size={12} /> Anket
                               </span>
                            )}
                            {isTeacher ? (
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                ann.targetAudience === 'ALL' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {ann.targetAudience === 'ALL' ? <Users size={12}/> : <User size={12}/>}
                                {ann.targetAudience === 'ALL' ? 'Tüm Sınıf' : `${ann.targetStudentIds?.length} Kişiye Özel`}
                              </span>
                            ) : (
                               <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                ann.targetAudience === 'ALL' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {ann.targetAudience === 'ALL' ? 'Tüm Sınıf' : 'Size Özel'}
                              </span>
                            )}
                            
                            {!isTeacher && !isReadForParent && (
                              <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg animate-pulse inline-flex items-center gap-1">
                                Yeni
                              </span>
                            )}
                          </div>
                          <h3 className={`font-bold text-sm truncate pr-4 ${!isTeacher && !isReadForParent ? 'text-neutral-900 border-l-4 border-amber-400 pl-2 -ml-2' : 'text-neutral-800'}`}>
                            {ann.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isTeacher && isReadForParent && (
                            <span className="text-green-500 flex items-center gap-1 text-[10px] font-bold">
                              <CheckCircle2 size={14} /> Okundu
                            </span>
                          )}

                          {isTeacher && (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex flex-row items-center gap-2">
                                <div className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-xl flex items-center gap-1.5 border border-indigo-100 shadow-sm" title="Okunma Sayısı">
                                  <Eye size={14} />
                                  <span className="flex items-center gap-1">
                                    <span className="text-xs">{Object.keys(ann.readBy || {}).length}</span>
                                    <span className="text-indigo-300">/</span>
                                    <span className="text-xs">{ann.targetAudience === 'ALL' ? (students?.length || 0) : (ann.targetStudentIds?.length || 0)}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => handleEdit(ann, e)}
                                  className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Bildirimi Düzenle"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(ann.id);
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Bildirimi Sil"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-neutral-100"
                          >
                            <div className="p-3">
                               <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-xs bg-neutral-50 p-3 rounded-xl mb-3">
                                 {ann.content}
                               </div>

                               {/* Poll UI */}
                               {ann.hasPoll && ann.pollOptions && (
                                  <div className="mb-4 bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                          <BarChart2 size={18} />
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-black text-neutral-900 uppercase">Görüşünüzü Bildirin</h4>
                                          <p className="text-[10px] font-bold text-neutral-400">Tercihinizi aşağıdan seçebilirsiniz.</p>
                                        </div>
                                      </div>
                                      {isTeacher && (
                                        <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                          Anket Sonuçları
                                        </div>
                                      )}
                                    </div>

                                    {(() => {
                                      const { results, totalVotes } = getPollResults(ann);
                                      const userVote = !isTeacher && selectedStudentId ? ann.pollVotes?.[selectedStudentId] : null;
                                      const hasUserVoted = userVote !== undefined && userVote !== null;

                                      return (
                                        <div className="space-y-3">
                                          {results.map((res: any, idx: number) => (
                                            <div key={idx} className="space-y-2">
                                              <div className="relative group overflow-hidden rounded-xl">
                                                {/* Background Progress Bar */}
                                                {(hasUserVoted || isTeacher) && (
                                                  <div className="absolute inset-0 bg-neutral-50">
                                                    <motion.div 
                                                      initial={{ width: 0 }}
                                                      animate={{ width: `${res.percent}%` }}
                                                      className={`h-full opacity-10 transition-all ${
                                                        userVote === idx ? 'bg-amber-600' : 'bg-neutral-600'
                                                      }`}
                                                    />
                                                  </div>
                                                )}

                                                <button
                                                  disabled={isTeacher || hasUserVoted}
                                                  onClick={(e) => handleVote(ann, idx, e)}
                                                  className={`relative w-full text-left p-3.5 border-2 transition-all flex items-center justify-between gap-3 ${
                                                    hasUserVoted 
                                                      ? userVote === idx 
                                                        ? 'border-amber-500 bg-amber-50/20' 
                                                        : 'border-neutral-100 bg-white/50'
                                                      : 'border-neutral-100 hover:border-amber-200 hover:bg-amber-50/10'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-3">
                                                     <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                                       userVote === idx ? 'bg-amber-600 border-amber-600' : 'border-neutral-300'
                                                     }`}>
                                                       {userVote === idx && <Check size={12} className="text-white" />}
                                                     </div>
                                                     <span className={`text-xs font-bold ${userVote === idx ? 'text-amber-800' : 'text-neutral-700'}`}>
                                                       {res.option}
                                                     </span>
                                                  </div>

                                                  {(hasUserVoted || isTeacher) && (
                                                    <div className="text-right">
                                                      <span className="text-xs font-black text-neutral-900">%{res.percent}</span>
                                                      <div className="text-[9px] font-bold text-neutral-400">{res.count} Oy</div>
                                                    </div>
                                                  )}
                                                </button>
                                              </div>

                                              {/* Voter Names for Teacher - Moved outside the relative container to avoid overlap */}
                                              {isTeacher && res.voters && res.voters.length > 0 && (
                                                <div className="pl-4 flex flex-wrap gap-1.5 pb-2">
                                                  <div className="w-full flex items-center gap-1.5 text-[8px] font-black text-indigo-400 uppercase mb-1">
                                                    <Users size={10} /> Seçenler:
                                                  </div>
                                                  {res.voters.map((voter: any) => (
                                                    <span 
                                                      key={voter.id} 
                                                      className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-sm whitespace-nowrap"
                                                    >
                                                      {voter.name}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                          
                                          <div className="mt-4 flex items-center justify-between px-1">
                                             <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                               <Users size={12} /> Toplam Katılım: {totalVotes}
                                             </div>
                                             {hasUserVoted && (
                                               <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                                 Oyunuz kaydedildi
                                               </div>
                                             )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                               )}

                               {/* Teacher View: Reading Status Table */}
                               {isTeacher && (
                                  <div className="mt-6">
                                     <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                       <Eye size={12} /> Okunma Durumu
                                     </h4>
                                     {students && students.length > 0 ? (
                                       <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                                         <table className="w-full text-sm text-left">
                                           <thead className="bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                                             <tr>
                                               <th className="px-4 py-3">Alıcı (Veli/Öğrenci)</th>
                                               <th className="px-4 py-3 text-center">Gönderildi</th>
                                               <th className="px-4 py-3 text-center">Okundu</th>
                                             </tr>
                                           </thead>
                                           <tbody className="divide-y divide-neutral-100">
                                              {students
                                                .filter((s:any) => ann.targetAudience === 'ALL' || ann.targetStudentIds?.includes(s.id))
                                                .map((student:any) => {
                                                  const readRecord = ann.readBy?.[student.id];
                                                  return (
                                                    <tr key={student.id} className="hover:bg-neutral-50/50">
                                                      <td className="px-4 py-1.5 font-medium text-neutral-800">
                                                        {student.name}
                                                      </td>
                                                      <td className="px-4 py-1.5 text-center">
                                                        <div className="flex justify-center text-emerald-500">
                                                          <Check size={16} />
                                                        </div>
                                                      </td>
                                                      <td className="px-4 py-1.5 text-center">
                                                        {readRecord ? (
                                                           <div className="flex flex-col items-center justify-center text-emerald-500">
                                                             <CheckCircle2 size={16} />
                                                             <span className="text-[9px] text-neutral-400 font-medium mt-0.5">
                                                                {formatDate(readRecord)}
                                                             </span>
                                                           </div>
                                                        ) : (
                                                           <div className="flex justify-center text-neutral-300">
                                                             <Clock size={16} />
                                                           </div>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  );
                                              })}
                                           </tbody>
                                         </table>
                                       </div>
                                     ) : (
                                       <div className="text-center py-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-[10px] font-bold text-neutral-400">
                                         Henüz öğrenci bulunmuyor veya yüklenmedi.
                                       </div>
                                     )}
                                  </div>
                               )}

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div
            key="messages-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Added instruction to the top of messages for Parent */}
            {!isTeacher && (
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-6 flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                   <MessageSquare size={24} />
                </div>
                <div>
                   <h3 className="font-bold text-indigo-900 text-lg">Öğretmeninle Sohbet</h3>
                   <p className="text-indigo-600/80 text-sm mt-1">Buradan öğretmeninizle doğrudan iletişime geçebilirsiniz. Mesajlarınız sadece öğretmeniniz tarafından görülür.</p>
                </div>
              </div>
            )}

            <Messages 
              user={user}
              teacherUid={teacherUid}
              selectedStudentId={selectedStudentId}
              students={students}
              isTeacher={isTeacher}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teacher New Announcement Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    {editingAnnouncement ? 'Bildirimi Düzenle' : 'Yeni Bildirim'}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {editingAnnouncement ? 'Bildirim içeriğini güncelleyin.' : 'Velilere bir bildirim gönderin.'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAnnouncement(null);
                    setTitle('');
                    setContent('');
                    setTargetAudience('ALL');
                    setSelectedStudentIds([]);
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleCreateDraft} className="space-y-5">
                {errorMessage && (
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 animate-pulse">
                    {errorMessage}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-neutral-400 uppercase mb-1.5 ml-1">Kime</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetAudience('ALL')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        targetAudience === 'ALL' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-neutral-100 bg-white text-neutral-500 hover:bg-neutral-50'
                      }`}
                    >
                      Tüm Sınıf
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('SPECIFIC')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        targetAudience === 'SPECIFIC' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-neutral-100 bg-white text-neutral-500 hover:bg-neutral-50'
                      }`}
                    >
                      Kişiye Özel
                    </button>
                  </div>
                </div>

                {targetAudience === 'SPECIFIC' && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2">
                    {students.map((student:any) => (
                      <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer border border-transparent hover:border-neutral-200 shadow-sm hover:shadow-none">
                        <input 
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds([...selectedStudentIds, student.id]);
                            } else {
                              setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm font-medium text-neutral-700">{student.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-neutral-400 uppercase mb-1.5 ml-1">Bildirim Başlığı</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Hafta Sonu Ödevleri"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-black text-neutral-400 uppercase mb-1.5 px-1">
                    <span>Bildirim İçeriği</span>
                  </label>
                  <div className="relative">
                    <textarea
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Ana fikri veya metni buraya yazın..."
                      className="w-full h-32 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateAiDraft}
                      disabled={isGeneratingAi || !content.trim()}
                      className="absolute bottom-3 right-3 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Yapay zeka asistanı ile Cihan Öğretmen üslubunda taslak oluşturun"
                    >
                      {isGeneratingAi ? (
                        <>
                          <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          Yazılıyor...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Akıllı Taslak
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Poll Options Setup */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${hasPoll ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                        <Vote size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 uppercase">Anket Ekle</h4>
                        <p className="text-[10px] font-bold text-neutral-400">Velilerden fikir veya onay alın.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasPoll(!hasPoll)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${hasPoll ? 'bg-amber-600' : 'bg-neutral-300'}`}
                    >
                      <motion.div 
                        animate={{ x: hasPoll ? 26 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {hasPoll && (
                    <div className="space-y-3 pt-2">
                       {pollOptions.map((opt, idx) => (
                         <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...pollOptions];
                                newOpts[idx] = e.target.value;
                                setPollOptions(newOpts);
                              }}
                              placeholder={`Seçenek ${idx + 1}`}
                              className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            />
                            {pollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                className="p-2 text-neutral-400 hover:text-rose-500 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            )}
                         </div>
                       ))}
                       {pollOptions.length < 5 && (
                         <button
                           type="button"
                           onClick={() => setPollOptions([...pollOptions, ''])}
                           className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-600 rounded-xl text-[10px] font-black uppercase hover:border-amber-300 hover:bg-amber-100/50 transition-all flex items-center justify-center gap-2"
                         >
                           <ListPlus size={14} /> Seçenek Ekle
                         </button>
                       )}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex justify-center items-center gap-2"
                  >
                     {isSubmitting ? 'İşleniyor...' : (editingAnnouncement ? 'Güncelle ve Velilere Bildir' : 'Velilere Gönder')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Bildirimi Sil</h3>
              <p className="text-neutral-500 mb-8">
                Bu bildirim kalıcı olarak silinecek ve tüm velilerden kaldırılacaktır. Emin misiniz?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
