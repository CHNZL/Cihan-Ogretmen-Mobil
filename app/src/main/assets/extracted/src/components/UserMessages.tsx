import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, where, getDocs, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, MessageCircle, Lock, Smile, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface UserMessagesProps {
  user: any;
  userProfile: any;
  onLoginRequest?: () => void;
}

export const UserMessages: React.FC<UserMessagesProps> = ({ user, userProfile, onLoginRequest }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatData, setChatData] = useState<any>(null);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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
    if (!user) return;

    // Listen to chat metadata (for typing indicator and blocked status)
    const chatUnsubscribe = onSnapshot(doc(db, 'chats', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChatData(data);
        
        // Mark chat as read by user ONLY if there are unread messages
        if (data.unreadUser > 0) {
          setDoc(doc(db, 'chats', user.uid), { unreadUser: 0 }, { merge: true })
            .catch(err => console.error("Error marking as read", err));
        }
      }
    });

    // Fetch Admin UID once
    const fetchAdminUid = async () => {
      try {
        const q = query(collection(db, 'users'), where('email', '==', 'cihan.ozel10@gmail.com'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdminUid(snap.docs[0].id);
        }
      } catch (err) {
        console.error("Error fetching admin UID", err);
      }
    };
    fetchAdminUid();

    const q = query(
      collection(db, `chats/${user.uid}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setMessages(msgs);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Cleanup old messages once on mount
    const cleanupOldMessages = async () => {
      try {
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oldMsgsQuery = query(
          collection(db, `chats/${user.uid}/messages`),
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

    return () => {
      unsubscribe();
      chatUnsubscribe();
    };
  }, [user]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && user) {
      setIsTyping(true);
      setDoc(doc(db, 'chats', user.uid), { userTyping: true }, { merge: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (user) setDoc(doc(db, 'chats', user.uid), { userTyping: false }, { merge: true });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || chatData?.isBlocked) return;

    const text = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Reset typing status immediately
    setDoc(doc(db, 'chats', user.uid), { userTyping: false }, { merge: true });

    try {
      // Add message to subcollection
      await addDoc(collection(db, `chats/${user.uid}/messages`), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seen: false
      });

      // Update chat document
      await setDoc(doc(db, 'chats', user.uid), {
        userId: user.uid,
        userName: user.displayName || 'İsimsiz Kullanıcı',
        userEmail: user.email,
        userPhoto: user.photoURL || '',
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadAdmin: 1
      }, { merge: true });

      // Send notification to admin
      if (adminUid) {
        await addDoc(collection(db, `users/${adminUid}/notifications`), {
          title: 'Yeni Mesaj',
          message: `${user.displayName || 'Bir kullanıcı'} size mesaj gönderdi: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
          type: 'message',
          senderId: user.uid,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  // remove the early return block that was added previously
  // ...
  
  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <MessageCircle size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">İletişim</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            {chatData?.adminTyping ? (
              <span className="text-indigo-500 animate-pulse">Yönetici yazıyor...</span>
            ) : (
              'Site yöneticisi ile iletişime geçin. (Ürün, eğitim, site hataları...)'
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50 dark:bg-neutral-950/50">
        <div className="text-center mb-6">
          <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px] font-bold px-3 py-1 rounded-full">
            Not: 1 haftadan eski mesajlar otomatik olarak silinmektedir.
          </span>
        </div>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p>Sizden mesaj bekliyoruz.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
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
          })
        )}
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
                theme={Theme.LIGHT}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {chatData?.isBlocked ? (
          <div className="flex items-center justify-center gap-2 text-rose-500 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl">
            <Lock size={18} />
            <span className="text-sm font-bold">Sohbet yönetici tarafından kilitlendi.</span>
          </div>
        ) : (
          <div className="relative">
            {!user && (
              <div className="absolute inset-0 z-10 flex items-center justify-between px-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-[2px] rounded-2xl border border-indigo-100 dark:border-indigo-900">
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Mesaj göndermek için giriş yapmalısınız.
                </span>
                <button
                  onClick={onLoginRequest}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-black transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                >
                  <LogIn size={16} />
                  Giriş Yap
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className={`flex gap-2 ${!user ? 'opacity-30 pointer-events-none' : ''}`}>
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
                className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
