import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, Timestamp, writeBatch, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Send, MessageCircle, Search, User as UserIcon, Lock, Unlock, Smile, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-hot-toast';

interface AdminMessagesProps {
  user: any;
}

export const AdminMessages: React.FC<AdminMessagesProps> = ({ user }) => {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatList);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenAdminChat = (e: any) => {
      if (e.detail && e.detail.userId) {
        setSelectedChatId(e.detail.userId);
      }
    };
    window.addEventListener('open-admin-chat', handleOpenAdminChat);
    return () => window.removeEventListener('open-admin-chat', handleOpenAdminChat);
  }, []);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    // Mark as read
    const markAsRead = async () => {
      try {
        await setDoc(doc(db, 'chats', selectedChatId), { unreadAdmin: 0 }, { merge: true });
      } catch (error) {
        console.error("Error marking as read", error);
      }
    };
    markAsRead();

    const q = query(
      collection(db, `chats/${selectedChatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setMessages(msgs);
      
      markAsRead();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Cleanup old messages once on chat selection
    const cleanupOldMessages = async () => {
      try {
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oldMsgsQuery = query(
          collection(db, `chats/${selectedChatId}/messages`),
          where('createdAt', '<', Timestamp.fromMillis(oneWeekAgo))
        );
        const oldMsgsSnap = await getDocs(oldMsgsQuery);
        if (!oldMsgsSnap.empty) {
          const batch = writeBatch(db);
          oldMsgsSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.error("Error cleaning up old messages:", err);
      }
    };
    cleanupOldMessages();

    return () => unsubscribe();
  }, [selectedChatId]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!selectedChatId) return;

    if (!isTyping) {
      setIsTyping(true);
      setDoc(doc(db, 'chats', selectedChatId), { adminTyping: true }, { merge: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setDoc(doc(db, 'chats', selectedChatId), { adminTyping: false }, { merge: true });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId || !user) return;

    const text = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Reset typing status immediately
    setDoc(doc(db, 'chats', selectedChatId), { adminTyping: false }, { merge: true });

    try {
      await addDoc(collection(db, `chats/${selectedChatId}/messages`), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seen: false
      });

      await setDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadUser: 1
      }, { merge: true });

      // Send notification to user
      await addDoc(collection(db, `users/${selectedChatId}/notifications`), {
        title: 'Yeni Mesaj',
        message: `Yönetici size mesaj gönderdi: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        type: 'message',
        senderId: user.uid,
        isRead: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const toggleBlockChat = async () => {
    if (!selectedChatId || !selectedChat) return;
    try {
      await setDoc(doc(db, 'chats', selectedChatId), { 
        isBlocked: !selectedChat.isBlocked 
      }, { merge: true });
    } catch (error) {
      console.error("Error toggling block", error);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    if (!window.confirm("Bu konuşmayı ve tüm mesajları kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
      // 1. Delete all messages in the subcollection
      const msgsQuery = query(collection(db, `chats/${selectedChatId}/messages`));
      const msgsSnap = await getDocs(msgsQuery);
      
      // Firestore batches have a limit, but for chats 7 days old it should be fine.
      // If there are many messages, we might need a different approach, but usually it's < 500
      const batch = writeBatch(db);
      msgsSnap.docs.forEach(d => batch.delete(d.ref));
      
      // 2. Delete the chat document itself
      batch.delete(doc(db, 'chats', selectedChatId));
      
      await batch.commit();
      setSelectedChatId(null);
      toast.success("Konuşma başarıyla silindi.");
    } catch (err) {
      console.error("Error deleting chat:", err);
      toast.error("Konuşma silinirken bir hata oluştu.");
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          chat.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                          (filter === 'unread' && chat.unreadAdmin > 0);
    return matchesSearch && matchesFilter;
  });

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white dark:bg-neutral-900 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-1/3 border-r border-neutral-100 dark:border-neutral-800 flex flex-col ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:text-white transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'unread' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}
            >
              Okunmamış
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-sm">
              Mesaj bulunamadı.
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full text-left p-4 border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-start gap-3 ${selectedChatId === chat.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 overflow-hidden relative">
                  {chat.userPhoto ? <img src={chat.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon size={20} />}
                  {chat.isBlocked && <div className="absolute inset-0 bg-rose-500/50 flex items-center justify-center"><Lock size={14} className="text-white" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-bold text-sm truncate ${chat.unreadAdmin > 0 ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {chat.userName}
                    </h3>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                      {chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate().toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${chat.unreadAdmin > 0 ? 'text-neutral-900 dark:text-white font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {chat.userTyping ? <span className="text-indigo-500 italic">Yazıyor...</span> : <>{chat.lastMessageSenderId === user.uid ? 'Siz: ' : ''}{chat.lastMessage}</>}
                  </p>
                </div>
                {chat.unreadAdmin > 0 && (
                  <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-950/50 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        {selectedChatId ? (
          <>
            <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden p-2 -ml-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden">
                  {selectedChat?.userPhoto ? <img src={selectedChat.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
                    {selectedChat?.userName}
                    {selectedChat?.isBlocked && <Lock size={12} className="text-rose-500" />}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {selectedChat?.userTyping ? <span className="text-indigo-500 animate-pulse">Yazıyor...</span> : selectedChat?.userEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteChat}
                  title="Konuşmayı Sil"
                  className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={toggleBlockChat}
                  title={selectedChat?.isBlocked ? "Sohbet Kilidini Aç" : "Sohbeti Kilitle"}
                  className={`p-2 rounded-xl transition-colors ${selectedChat?.isBlocked ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                >
                  {selectedChat?.isBlocked ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-center mb-6">
                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px] font-bold px-3 py-1 rounded-full">
                  Not: 1 haftadan eski mesajlar otomatik olarak silinmektedir.
                </span>
              </div>
              {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 relative ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-100 dark:border-neutral-700 rounded-bl-sm'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className={`text-[10px] mt-1 block ${isMe ? 'text-white/70' : 'text-neutral-400'}`}>
                        {msg.createdAt?.toDate ? `${msg.createdAt.toDate().toLocaleDateString('tr-TR')} ${msg.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 relative">
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full right-4 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden"
                    ref={emojiPickerRef}
                  >
                    <EmojiPicker 
                      onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)}
                      theme={'light' as any}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Mesajınızı yazın..."
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 dark:text-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 text-neutral-400 hover:text-indigo-500 transition-colors"
                  >
                    <Smile size={20} />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p>Sohbeti görüntülemek için sol taraftan bir kullanıcı seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
};
