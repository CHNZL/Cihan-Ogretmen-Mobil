import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Search, User, Clock, CheckCircle2, Trash2, Smile
} from 'lucide-react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, setDoc, getDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Categories } from 'emoji-picker-react';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
  teacherId: string;
  parentId: string;
  isRead: boolean;
  readAt?: any;
}

interface Chat {
  id: string;
  teacherId: string;
  parentId: string;
  teacherName: string;
  parentName: string;
  studentName: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCountTeacher: number;
  unreadCountParent: number;
}

export default function Messages({
  user,
  teacherUid,
  selectedStudentId,
  students,
  isTeacher
}: any) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container') && !event.target.closest('.emoji-button')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prevInput => prevInput + emojiObject.emoji);
  };

  const handleDeleteChat = async () => {
    if (!activeChat || !isTeacher || isDeleting) return;
    
    if (!window.confirm(`${activeChat.parentName} adlı veli ile olan tüm mesajlaşma silinecek. Onaylıyor musunuz?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete all messages in the chat first
      const messagesRef = collection(db, `chats/${activeChat.id}/messages`);
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete the chat document itself
      await deleteDoc(doc(db, 'chats', activeChat.id));
      
      setActiveChat(null);
    } catch (err) {
      console.error("Sohbet silinirken hata oluştu:", err);
      alert("Sohbet silinirken bir hata oluştu.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Parent needs to find or create chat with teacher
  // Teacher needs to list all parents

  useEffect(() => {
    if (!user || (!isTeacher && !teacherUid)) return;
    setIsLoading(true);
    
    // Listen to chats covering this user
    let q;
    if (isTeacher) {
      q = query(collection(db, 'chats'), where('teacherId', '==', user.uid));
    } else {
      q = query(collection(db, 'chats'), where('parentId', '==', user.uid), where('teacherId', '==', teacherUid));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedChats: Chat[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      fetchedChats.sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
      setChats(fetchedChats);
      
      // Auto-select chat for parent
      if (!isTeacher && fetchedChats.length > 0 && !activeChat) {
        setActiveChat(fetchedChats[0]);
      } else if (!isTeacher && fetchedChats.length === 0 && teacherUid && selectedStudentId) {
        // Parent hasn't started a chat yet, we can create an empty stub or just not show anything until they send.
        // Actually best to create a chat doc.
        createOrGetChat();
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, teacherUid, isTeacher, selectedStudentId]);

  const createOrGetChat = async () => {
    if (!teacherUid || !user || isTeacher) return;
    
    // Find student info
    const student = students?.find((s:any) => s.id === selectedStudentId);
    if (!student) return;

    const chatId = `${teacherUid}_${user.uid}`;
    const chatRef = doc(db, 'chats', chatId);
    
    try {
      const snap = await getDoc(chatRef);
      
      if (!snap.exists()) {
        await setDoc(chatRef, {
          teacherId: teacherUid,
          parentId: user.uid,
          teacherName: student.teacherProfile?.name || 'Öğretmenim',
          parentName: user.displayName || user.email || 'Veli',
          studentName: student.name || student.studentName,
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          unreadCountTeacher: 0,
          unreadCountParent: 0
        });
      }
    } catch (err) {
      console.error("Chat oluştururken veya okurken hata:", err);
    }
  };

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      
      // Mark unread messages as read
      msgs.forEach(msg => {
        if (msg.senderId !== user.uid && !msg.isRead) {
          updateDoc(doc(db, `chats/${activeChat.id}/messages`, msg.id), {
            isRead: true,
            readAt: serverTimestamp()
          });
        }
      });
      
      // Reset unread count for current user
      if (activeChat) {
        const chatRef = doc(db, 'chats', activeChat.id);
        if (isTeacher && activeChat.unreadCountTeacher > 0) {
          updateDoc(chatRef, { unreadCountTeacher: 0 });
        } else if (!isTeacher && activeChat.unreadCountParent > 0) {
          updateDoc(chatRef, { unreadCountParent: 0 });
        }
      }

      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [activeChat, user, isTeacher]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      // Add message
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        chatId: activeChat.id,
        senderId: user.uid,
        text: textToSend,
        createdAt: serverTimestamp(),
        teacherId: activeChat.teacherId,
        parentId: activeChat.parentId,
        isRead: false
      });

      // Update chat last message & unread count
      const chatRef = doc(db, 'chats', activeChat.id);
      const updateData: any = {
        lastMessage: textToSend,
        lastMessageTime: serverTimestamp(),
      };
      
      // If teacher is sending, increment parent unread count
      if (isTeacher) {
        // We can't easily increment securely using field.increment if we are teacher updating parent's unread logic, but we can if rule allows update. We added "allow update if teacher or parent".
      }

      // Hack to increment safely on client without increment
      if (isTeacher) {
         await updateDoc(chatRef, {
           lastMessage: textToSend,
           lastMessageTime: serverTimestamp(),
           unreadCountParent: activeChat.unreadCountParent + 1
         });
      } else {
         await updateDoc(chatRef, {
           lastMessage: textToSend,
           lastMessageTime: serverTimestamp(),
           unreadCountTeacher: activeChat.unreadCountTeacher + 1
         });
      }

    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts || !ts.seconds) return '';
    return new Date(ts.seconds * 1000).toLocaleTimeString('tr-TR', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row h-[600px] overflow-hidden">
      {/* Sidebar for Teachers (List of Parents) */}
      {isTeacher && (
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-100 flex flex-col bg-neutral-50/50">
          <div className="p-3 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-800">Velileriniz</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-neutral-400 text-xs">
                Henüz mesaj bulunmuyor.
              </div>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full text-left p-3 border-b border-neutral-100 transition-colors flex items-center gap-2 ${
                    activeChat?.id === chat.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-neutral-100 border-l-4 border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold shrink-0">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-[13px] text-neutral-900 truncate pr-1">{chat.parentName}</span>
                      {chat.lastMessageTime && (
                         <span className="text-[9px] text-neutral-400 shrink-0">
                           {formatDate(chat.lastMessageTime)}
                         </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-neutral-500 truncate pr-1">
                        {chat.lastMessage || 'Mesaj yok'}
                      </span>
                      {chat.unreadCountTeacher > 0 && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {chat.unreadCountTeacher}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {!activeChat ? (
           <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
             <User size={48} className="mb-4 text-neutral-200" />
             <p>{isTeacher ? 'Sohbet etmek için sol taraftan bir veli seçin.' : 'Öğretmeniniz ile sohbet başlatılıyor...'}</p>
           </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-neutral-100 flex items-center justify-between bg-white">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                   <User size={16} />
                 </div>
                 <div>
                   <h3 className="font-bold text-sm text-neutral-900">
                     {isTeacher ? `${activeChat.parentName}` : 'Öğretmeniniz'}
                   </h3>
                   <p className="text-[10px] text-neutral-500">
                     {isTeacher ? activeChat.studentName + ' Velisi' : 'Sınıf Öğretmeni'}
                   </p>
                 </div>
               </div>
               
               {isTeacher && (
                 <button
                   onClick={handleDeleteChat}
                   disabled={isDeleting}
                   className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                   title="Sohbeti Sil"
                 >
                   <Trash2 size={18} />
                   <span className="hidden sm:inline">Sohbeti Sil</span>
                 </button>
               )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/30">
              {messages.map(msg => {
                const isMine = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                        isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      <p className={`whitespace-pre-wrap ${/^[\s\p{Extended_Pictographic}]+$/u.test(msg.text) ? 'text-4xl' : 'text-[15px]'}`}>
                        {msg.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-neutral-400">
                        {formatDate(msg.createdAt)}
                      </span>
                      {isMine && msg.isRead && (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-white border-t border-neutral-100 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-[80px] right-4 z-50 emoji-picker-container shadow-2xl rounded-2xl overflow-hidden mt-2 scale-90 sm:scale-100 origin-bottom-right">
                  <EmojiPicker 
                    onEmojiClick={onEmojiClick} 
                    autoFocusSearch={false}
                    searchDisabled={true}
                    skinTonesDisabled={true}
                    categories={[
                      { category: Categories.SUGGESTED, name: 'Sık Kullanılanlar' },
                      { category: Categories.SMILEYS_PEOPLE, name: 'Yüzler ve İnsanlar' },
                      { category: Categories.ANIMALS_NATURE, name: 'Hayvanlar ve Doğa' },
                      { category: Categories.FOOD_DRINK, name: 'Yiyecek ve İçecek' },
                      { category: Categories.TRAVEL_PLACES, name: 'Seyahat ve Yerler' },
                      { category: Categories.ACTIVITIES, name: 'Etkinlikler' },
                      { category: Categories.OBJECTS, name: 'Nesneler' },
                      { category: Categories.SYMBOLS, name: 'Semboller' },
                      { category: Categories.FLAGS, name: 'Bayraklar' }
                    ]}
                  />
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex-1 bg-neutral-100 rounded-2xl flex items-center pr-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="emoji-button p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
                  >
                    <Smile size={20} />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
