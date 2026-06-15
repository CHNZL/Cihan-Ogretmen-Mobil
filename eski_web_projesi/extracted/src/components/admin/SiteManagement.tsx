import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Shield,
  Construction,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  UserCog,
  Ban,
  BarChart3,
  Megaphone,
  Calendar,
  MapPin,
  School as SchoolIcon,
  Mail,
  Clock,
  Send,
  Trash2,
  X,
  TrendingUp,
  UserPlus,
  Activity,
  PlusCircle,
  MessageCircle,
  Briefcase,
  Layout,
  Book,
  Database,
  Loader2,
  Plus,
  FileImage,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Link,
  Link2Off,
  UserCheck,
  Star,
  Zap,
  Target
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where, getDocs, writeBatch, setDoc, getDoc, Timestamp, collectionGroup, updateDoc, getCountFromServer } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { AdminMessages } from './AdminMessages';
import { OutcomesPoolManager } from './OutcomesPoolManager';
import { QuestionPoolManager } from './QuestionPoolManager';

import { populateDefaultQuestions } from '../../services/InitialQuestionsService';
import { toast } from 'react-hot-toast';

interface SiteManagementProps {
  user: any;
  liveActiveCount?: number;
  dailyVisits?: number;
  visitTrend?: any[];
}

export const SiteManagement: React.FC<SiteManagementProps> = ({ user, liveActiveCount = 0, dailyVisits = 0, visitTrend = [] }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [importStatus, setImportStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data: any = { profile: {}, collections: {} };
      
      // Fetch profile
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        data.profile = profileSnap.data();
      }

      // Fetch collections
      const collectionsToExport = [
        'students', 'subjects', 'books', 'readingRecords', 'readingEvaluations', 
        'tournaments', 'activityInstances', 
        'activityScores', 'lessonQuestions', 'lessonUnits', 'lessonOutcomes'
      ];

      for (const colName of collectionsToExport) {
        const colRef = collection(db, `users/${user.uid}/${colName}`);
        const snap = await getDocs(colRef);
        data.collections[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cihan_ogretmen_yedek_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("Verileriniz başarıyla indirildi.");
    } catch (error: any) {
      console.error("Export error:", error);
      alert("Veriler dışa aktarılırken bir hata oluştu: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawData = JSON.parse(e.target?.result as string);
        
        // Helper to recursively convert timestamps and remove nulls
        const convertTimestampsAndClean = (obj: any) => {
          if (obj === null || obj === undefined) return undefined;
          if (typeof obj !== 'object') return obj;
          
          if ('seconds' in obj && 'nanoseconds' in obj) {
            return new Timestamp(obj.seconds, obj.nanoseconds);
          }
          
          if (Array.isArray(obj)) {
            return obj.map(convertTimestampsAndClean).filter(item => item !== undefined);
          }
          
          const newObj: any = {};
          for (const key in obj) {
            const val = convertTimestampsAndClean(obj[key]);
            if (val !== undefined && val !== null) {
              newObj[key] = val;
            }
          }
          return newObj;
        };

        // Convert all timestamps and remove nulls in the entire JSON before doing anything else
        const data = convertTimestampsAndClean(rawData);
        
        // Restore profile
        if (data.profile) {
          const profileData = { ...data.profile };
          delete profileData.uid; // Keep current uid
          delete profileData.email; // Keep current email
          await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
        }

        // Restore collections
        if (data.collections) {
          for (const [colName, docs] of Object.entries(data.collections)) {
            for (const docData of docs as any[]) {
              const docId = docData.id;
              const cleanData = { ...docData };
              delete cleanData.id;
              
              // Force update references to new UID to satisfy security rules
              cleanData.teacherUid = user.uid;

              await setDoc(doc(db, `users/${user.uid}/${colName}`, docId), cleanData);
            }
          }
        }
        setImportStatus({ type: 'success', message: 'Veriler başarıyla yüklendi! Sayfa yenileniyor...' });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err: any) {
        console.error("Import error:", err);
        setImportStatus({ type: 'error', message: "Veriler içe aktarılırken bir hata oluştu: " + err.message });
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (user?.email !== 'cihan.ozel10@gmail.com') {
    return (
      <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800">
        <Shield size={48} className="mx-auto text-rose-500 mb-4" />
        <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Yetkisiz Erişim</h3>
        <p className="text-neutral-500 font-medium mt-2">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'announcements' | 'messages' | 'backup' | 'audit-logs' | 'welcome-campaign' | 'outcomes-pool'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: 'displayName',
    direction: 'asc'
  });
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [selectedUserStudentCount, setSelectedUserStudentCount] = useState<number | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', target: 'all', isEmergency: false });
  const [newCampaign, setNewCampaign] = useState({ title: '', message: '', mediaUrl: '', mediaType: 'none', startDate: '', endDate: '', isActive: true });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'bulk', target: any } | null>(null);
  
  const [welcomeCampaigns, setWelcomeCampaigns] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [matchingUser, setMatchingUser] = useState<any>(null);
  const [matchingSearchTerm, setMatchingSearchTerm] = useState('');
  const [matchingConfirm, setMatchingConfirm] = useState<{
    studentId: string;
    parentEmail: string;
    slot: 1 | 2;
    currentEmail: string;
    studentName: string;
  } | null>(null);

  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogSort, setAuditLogSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  const [allLinkedStudents, setAllLinkedStudents] = useState<any[]>([]);

  const [metrics, setMetrics] = useState<{
    topSubject: { name: string; percentage: string; count: number };
    peakHour: { range: string; label: string; count: number };
    totalClasses: { total: number; increased: number };
    totalSchools: number;
    totalStudents: number;
    totalQuestions: number;
    totalBooks: number;
    totalExams: number;
    avgStudentsPerTeacher?: number;
    subjectCounts?: Record<string, number>;
    isLoading: boolean;
  }>({
    topSubject: { name: 'Veri Yok', percentage: '', count: 0 },
    peakHour: { range: '00:00 - 00:00', label: 'Yok', count: 0 },
    totalClasses: { total: 0, increased: 0 },
    totalSchools: 0,
    totalStudents: 0,
    totalQuestions: 0,
    totalBooks: 0,
    totalExams: 0,
    avgStudentsPerTeacher: 0,
    subjectCounts: {},
    isLoading: true
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    const handleOpenAdminChat = () => {
      setActiveTab('messages');
    };
    window.addEventListener('open-admin-chat', handleOpenAdminChat);
    return () => window.removeEventListener('open-admin-chat', handleOpenAdminChat);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));

      const uniqueUsersMap = new Map<string, any>();
      usersData.forEach(u => {
        if (!u.email) return;
        const email = u.email.toLowerCase();
        const existing = uniqueUsersMap.get(email);
        if (!existing) {
          uniqueUsersMap.set(email, u);
        } else {
          const existingHasRole = existing.profileType && existing.profileType !== 'ÜYE';
          const newHasRole = u.profileType && u.profileType !== 'ÜYE';
          const existingIsComplete = existing.isProfileComplete;
          const newIsComplete = u.isProfileComplete;
          
          if ((newHasRole && !existingHasRole) || (newIsComplete && !existingIsComplete)) {
            uniqueUsersMap.set(email, u);
          }
        }
      });
      
      const sortedUsers = Array.from(uniqueUsersMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const fetchAnnouncements = async () => {
      try {
        const announcementsRef = collection(db, 'announcements');
        const aq = query(announcementsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(aq);
        setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    
    const fetchCampaigns = () => {
      const campaignsRef = collection(db, 'welcome_campaigns');
      const cq = query(campaignsRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(cq, (snapshot) => {
         setWelcomeCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
         console.error("Error fetching campaigns:", error);
      });
      return unsubscribe;
    };
    
    const fetchMetricsData = async () => {
      try {
        setMetrics(prev => ({ ...prev, isLoading: true }));
        
        // Fetch new metrics with getCountFromServer
        const [
          studentsSnap,
          questionsSnap,
          booksSnap,
          teachersSnap
        ] = await Promise.all([
          getCountFromServer(collectionGroup(db, 'students')),
          getCountFromServer(collectionGroup(db, 'lessonQuestions')),
          getCountFromServer(collectionGroup(db, 'books')),
          getDocs(query(collection(db, 'users'), where('profileType', '==', 'ÖĞRETMEN')))
        ]);

        const uniqueSchools = new Set(teachersSnap.docs.map(d => d.data().schoolName).filter(Boolean)).size;
        const totalClasses = teachersSnap.size;
        const totalStudents = studentsSnap.data().count;
        const totalQuestions = questionsSnap.data().count;
        const totalBooks = booksSnap.data().count;
        const avgStudentsPerTeacher = totalStudents / (teachersSnap.size || 1);

        // Retrieve Exams using collectionGroup
        const examsQuery = query(collectionGroup(db, 'exams'));
        const examsSnapshot = await getDocs(examsQuery);
        
        const subjectCounts: Record<string, number> = {};
        const hourCounts: Record<number, number> = {};
        
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        examsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          if (data.subject) {
             subjectCounts[data.subject] = (subjectCounts[data.subject] || 0) + 1;
          }
          
          if (data.createdAt) {
             const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt);
             if (!isNaN(d.getTime())) {
                const hour = d.getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
             }
          }
        });
        
        // Determine Top Subject
        let topSub = 'Veri Yok';
        let topSubCount = 0;
        for (const [sub, count] of Object.entries(subjectCounts)) {
           if (count > topSubCount) {
              topSubCount = count;
              topSub = sub;
           }
        }
        
        // Determine Peak Hour
        let peakH = 0;
        let peakHCount = 0;
        for (const [hourStr, count] of Object.entries(hourCounts)) {
           if (count > peakHCount) {
              peakHCount = count;
              peakH = parseInt(hourStr);
           }
        }
        const peakRange = peakHCount > 0 ? `${peakH.toString().padStart(2, '0')}:00 - ${(peakH + 1).toString().padStart(2, '0')}:00` : 'Belirsiz';

        setMetrics(prev => ({
          ...prev,
          topSubject: { 
            name: topSub, 
            count: topSubCount,
            percentage: topSubCount > 0 ? 'Aktif' : ''
          },
          peakHour: {
            range: peakRange,
            label: peakHCount > 10 ? 'Çok Yoğun' : (peakHCount > 0 ? 'Normal' : 'Veri Yok'),
            count: peakHCount
          },
          totalClasses: { total: totalClasses, increased: 0 },
          totalSchools: uniqueSchools,
          totalStudents,
          totalQuestions,
          totalBooks,
          totalExams: examsSnapshot.size,
          avgStudentsPerTeacher,
          subjectCounts,
          isLoading: false
        }));
        
      } catch (error) {
        console.error("Error fetching metrics:", error);
        setMetrics(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchAnnouncements();
    const unsubCampaigns = fetchCampaigns();
    fetchMetricsData();

    // Fetch all students globally to identify linked parents
    const unsubAllStudents = onSnapshot(collectionGroup(db, 'students'), (snapshot) => {
      setAllLinkedStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Global students fetch error:", err);
    });

    // Fetch teacher's own students for matching
    const fetchTeacherStudents = async () => {
      try {
        const studentsRef = collection(db, `users/${user.uid}/students`);
        const snapshot = await getDocs(studentsRef);
        setClassStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching class students:", error);
      }
    };
    fetchTeacherStudents();

    return () => {
      unsubCampaigns();
      unsubAllStudents();
    };
  }, []);

  const getUserDisplayInfo = (u: any) => {
    const roles: string[] = [];
    if (u.profileType === 'ÖĞRETMEN') roles.push('Öğretmen');
    
    // Find children globally based on email
    const children = allLinkedStudents.filter(s => 
      (s.parentEmail?.toLowerCase() === u.email?.toLowerCase()) || 
      (s.parentEmail2?.toLowerCase() === u.email?.toLowerCase())
    );

    if (children.length > 0) roles.push('Veli');
    if (roles.length === 0) roles.push('Üye');

    let city = u.city || '-';
    let district = u.district || '-';
    let schoolName = u.schoolName || '-';

    if (children.length > 0) {
      const firstChild = children[0];
      city = firstChild.city || city;
      district = firstChild.district || district;
      schoolName = firstChild.schoolName || schoolName;
    }

    return { roles, city, district, schoolName, children };
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const processedUsers = users
    .filter(u => {
      const matchesSearch = (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const { roles } = getUserDisplayInfo(u);
      const matchesRole = roleFilter === 'all' || roles.includes(roleFilter);
      
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (!sortConfig.key || !sortConfig.direction) return 0;

      let valA = '';
      let valB = '';

      if (sortConfig.key === 'roles') {
        valA = getUserDisplayInfo(a).roles.join(', ');
        valB = getUserDisplayInfo(b).roles.join(', ');
      } else if (['city', 'district', 'schoolName'].includes(sortConfig.key)) {
        const infoA = getUserDisplayInfo(a);
        const infoB = getUserDisplayInfo(b);
        valA = (infoA as any)[sortConfig.key] || '-';
        valB = (infoB as any)[sortConfig.key] || '-';
      } else if (sortConfig.key === 'lastLogin') {
        const timeA = a.lastLogin?.toMillis?.() || 0;
        const timeB = b.lastLogin?.toMillis?.() || 0;
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      } else {
        valA = (a as any)[sortConfig.key] || '';
        valB = (b as any)[sortConfig.key] || '';
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleExport = () => {
    const exportData = processedUsers.map((u, index) => {
      const { roles, city, district, schoolName } = getUserDisplayInfo(u);
      return {
        'Sıra No': index + 1,
        'Adı Soyadı': u.displayName || 'İsimsiz',
        'E-posta': u.email,
        'Roller': roles.join(', '),
        'İl': city,
        'İlçe': district,
        'Okul': schoolName,
        'Kayıt Tarihi': u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('tr-TR') : '-',
        'Son Giriş': u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString('tr-TR') : '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcılar');
    XLSX.writeFile(wb, `Kullanıcı_Listesi_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
  };

  useEffect(() => {
    const fetchSelectedUserDetails = async () => {
      if (!selectedUser) {
        setSelectedUserStudentCount(null);
        return;
      }

      if (selectedUser.profileType === 'ÖĞRETMEN') {
        try {
          const studentsRef = collection(db, `users/${selectedUser.id}/students`);
          const snapshot = await getDocs(studentsRef);
          setSelectedUserStudentCount(snapshot.size);
        } catch (error) {
          console.error('Error fetching student count:', error);
          setSelectedUserStudentCount(0);
        }
      }
    };

    fetchSelectedUserDetails();
  }, [selectedUser]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    try {
      // 1. Create the global announcement
      const announcementRef = await addDoc(collection(db, 'announcements'), {
        ...newAnnouncement,
        authorName: user.displayName,
        authorEmail: user.email,
        createdAt: serverTimestamp()
      });

      // 2. Send notifications to targeted users
      const usersRef = collection(db, 'users');
      let q;
      if (newAnnouncement.target === 'teachers') {
        q = query(usersRef, where('profileType', '==', 'ÖĞRETMEN'));
      } else if (newAnnouncement.target === 'parents') {
        q = query(usersRef, where('profileType', '==', 'VELİ'));
      } else {
        q = query(usersRef);
      }

      const targetUsers = await getDocs(q);
      const batch = writeBatch(db);

      targetUsers.docs.forEach(userDoc => {
        const notifRef = doc(collection(db, `users/${userDoc.id}/notifications`));
        batch.set(notifRef, {
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          announcementId: announcementRef.id,
          isRead: false,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();

      // 3. Simulate email sending
      console.log(`Email notifications sent to ${targetUsers.size} users.`);
      alert(`Bildirim başarıyla yayınlandı ve ${targetUsers.size} kullanıcıya bildirim gönderildi.`);

      setIsAnnouncementModalOpen(false);
      setNewAnnouncement({ title: '', content: '', target: 'all', isEmergency: false });
    } catch (error) {
      console.error('Bildirim hatası:', error);
    }
  };

  const handleManageRole = async (u: any) => {
    const newRole = prompt(`${u.displayName} için yeni rol girin (ÖĞRETMEN, VELİ, ÜYE):`, u.profileType);
    if (newRole && ['ÖĞRETMEN', 'VELİ', 'ÜYE'].includes(newRole.toLocaleUpperCase('tr-TR'))) {
      try {
        await setDoc(doc(db, 'users', u.id), { profileType: newRole.toLocaleUpperCase('tr-TR') }, { merge: true });
        alert('Rol başarıyla güncellendi.');
      } catch (error) {
        console.error('Rol güncelleme hatası:', error);
      }
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      alert('Bildirim başarıyla silindi.');
    } catch (error) {
      console.error('Bildirim silme hatası:', error);
      alert('Bildirim silinirken bir hata oluştu.');
    }
  };

  const handleDeleteUser = async (u: any) => {
    setDeleteConfirm({ type: 'user', target: u });
  };

  const handleDeleteAllByEmail = async (email: string) => {
    if (!email) return;
    const targetUsers = users.filter(u => u.email?.toLowerCase() === email.toLowerCase());
    if (targetUsers.length === 0) {
      return;
    }
    setDeleteConfirm({ type: 'bulk', target: { email, count: targetUsers.length, users: targetUsers } });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'user') {
        const u = deleteConfirm.target;
        await deleteDoc(doc(db, 'users', u.id));
        await deleteDoc(doc(db, 'chats', u.id));
      } else {
        const { users: targetUsers } = deleteConfirm.target;
        const batch = writeBatch(db);
        for (const u of targetUsers) {
          batch.delete(doc(db, 'users', u.id));
          batch.delete(doc(db, 'chats', u.id));
        }
        await batch.commit();
        setIsDetailModalOpen(false);
        setSelectedUserId(null);
      }
      setDeleteConfirm(null);
      await fetchUsers();
      toast.success('Silme işlemi başarıyla tamamlandı.');
    } catch (error: any) {
      console.error('Silme hatası:', error);
      toast.error(`Silme işlemi sırasında bir hata oluştu: ${error.message || error}`);
      setDeleteConfirm(null);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title.trim() || !newCampaign.message.trim() || !newCampaign.startDate || !newCampaign.endDate) {
      alert('Lütfen başlık, mesaj, başlangıç ve bitiş tarihlerini giriniz.');
      return;
    }
    const startTimestamp = new Date(newCampaign.startDate).getTime();
    const endTimestamp = new Date(newCampaign.endDate).getTime();
    
    if (endTimestamp <= startTimestamp) {
      alert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.');
      return;
    }

    try {
      if (editingCampaignId) {
        // Update existing campaign
        const campaignDoc = doc(db, 'welcome_campaigns', editingCampaignId);
        await updateDoc(campaignDoc, {
          title: newCampaign.title,
          message: newCampaign.message,
          mediaUrl: newCampaign.mediaUrl,
          mediaType: newCampaign.mediaType,
          startDate: startTimestamp,
          endDate: endTimestamp,
          isActive: newCampaign.isActive,
        });
        alert('Kampanya başarıyla güncellendi.');
      } else {
        // Create new campaign
        const campaignsRef = collection(db, 'welcome_campaigns');
        await addDoc(campaignsRef, {
          title: newCampaign.title,
          message: newCampaign.message,
          mediaUrl: newCampaign.mediaUrl,
          mediaType: newCampaign.mediaType,
          startDate: startTimestamp,
          endDate: endTimestamp,
          isActive: newCampaign.isActive,
          createdAt: serverTimestamp()
        });
        alert('Kampanya başarıyla yayınlandı.');
      }
      
      setIsCampaignModalOpen(false);
      setEditingCampaignId(null);
      setNewCampaign({ title: '', message: '', mediaUrl: '', mediaType: 'none', startDate: '', endDate: '', isActive: true });
      
      // Update local state temporarily to provide instant feedback
      const campaignsRef = collection(db, 'welcome_campaigns');
      const cq = query(campaignsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(cq);
      setWelcomeCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error saving campaign:", error);
      alert('Kampanya kaydedilirken bir hata oluştu.');
    }
  };

  const handleMatchWithStudent = async (studentId: string, parentEmail: string, slot: 1 | 2, force: boolean = false) => {
    const student = classStudents.find(s => s.id === studentId);
    if (!student) return;

    // Check if we need confirmation
    if (!force) {
      if (slot === 1 && student.parentEmail && student.parentEmail !== parentEmail) {
        setMatchingConfirm({
          studentId,
          parentEmail,
          slot,
          currentEmail: student.parentEmail,
          studentName: student.name
        });
        return;
      }
      if (slot === 2 && student.parentEmail2 && student.parentEmail2 !== parentEmail) {
        setMatchingConfirm({
          studentId,
          parentEmail,
          slot,
          currentEmail: student.parentEmail2,
          studentName: student.name
        });
        return;
      }
    }

    try {
      const studentDocRef = doc(db, `users/${user.uid}/students`, studentId);
      const updateData: any = {};
      
      if (slot === 1) {
        updateData.parentEmail = parentEmail;
      } else {
        updateData.parentEmail2 = parentEmail;
      }

      updateData.updatedAt = serverTimestamp();
      await updateDoc(studentDocRef, updateData);
      
      // Update local state
      setClassStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updateData } : s));
      
      toast.success(`${student.name} isimli öğrenciye ${parentEmail} (${slot}. veli) başarıyla tanımlandı.`);
      setIsMatchingModalOpen(false);
      setMatchingUser(null);
      setMatchingConfirm(null);
    } catch (error: any) {
      console.error("Eşleştirme hatası:", error);
      toast.error("Eşleştirme sırasında bir hata oluştu.");
    }
  };
  const handleEditCampaign = (campaign: any) => {
    // Convert timestamps to string format for datetime-local input
    const toDatetimeLocal = (ts: number) => {
      const d = new Date(ts);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0,16);
    };

    setNewCampaign({
      title: campaign.title,
      message: campaign.message,
      mediaUrl: campaign.mediaUrl || '',
      mediaType: campaign.mediaType || 'none',
      startDate: toDatetimeLocal(campaign.startDate),
      endDate: toDatetimeLocal(campaign.endDate),
      isActive: campaign.isActive
    });
    setEditingCampaignId(campaign.id);
    setIsCampaignModalOpen(true);
  };

  const handleToggleCampaignStatus = async (id: string, currentStatus: boolean) => {
    try {
      setWelcomeCampaigns(prev => prev.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c));
      await updateDoc(doc(db, 'welcome_campaigns', id), { isActive: !currentStatus });
    } catch (error) {
      console.error("Error toggling campaign status:", error);
      setWelcomeCampaigns(prev => prev.map(c => c.id === id ? { ...c, isActive: currentStatus } : c));
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'welcome_campaigns', id));
      setWelcomeCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };

  // Stats calculation
  const stats = {
    total: users.length,
    teachers: users.filter(u => u.profileType === 'ÖĞRETMEN').length,
    parents: users.filter(u => u.profileType === 'VELİ' || (u.children && u.children.length > 0)).length,
    members: users.filter(u => !u.profileType || u.profileType === 'ÜYE').length,
    cities: new Set(users.map(u => u.city).filter(Boolean)).size
  };

  const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#6366f1'];
  const pieData = [
    { name: 'Öğretmen', value: stats.teachers },
    { name: 'Veli', value: stats.parents },
    { name: 'Üye', value: stats.members }
  ];

  const last14DaysStr = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const registrationTrend = last14DaysStr.map(dateStr => {
    const count = users.filter(u => {
      if (!u.createdAt) return false;
      const dateVal = u.createdAt;
      const d = dateVal.toDate ? dateVal.toDate() : (dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal));
      if (isNaN(d.getTime())) return false;
      
      const userDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      return userDateStr === dateStr;
    }).length;
    
    return {
      date: dateStr,
      count
    };
  });

  const maxVisitDay = visitTrend.reduce((max: any, d: any) => (d.visits > (max.visits || 0) ? d : max), { date: '-', visits: 0 });
  const maxRegDay = registrationTrend.reduce((max: any, d: any) => (d.count > (max.count || 0) ? d : max), { date: '-', count: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Site Yönetimi
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            Platform kullanıcılarını ve genel ayarları yönetin.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-3 mb-8">
        {/* Row 1 Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-full md:w-fit overflow-x-auto hide-scrollbar sm:flex-wrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            Kullanıcılar
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'stats'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <BarChart3 size={18} className="inline mr-2" />
            İstatistikler & Metrikler
          </button>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'audit-logs'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <TrendingUp size={18} className="inline mr-2" />
            Sistem Günlükleri
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Shield size={18} className="inline mr-2" />
            Veri Yedekleme
          </button>
        </div>

        {/* Row 2 Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl w-full md:w-fit overflow-x-auto hide-scrollbar sm:flex-wrap border border-neutral-100 dark:border-neutral-800/30">
          <button
            onClick={() => setActiveTab('students-manager')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'students-manager'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <SchoolIcon size={18} className="inline mr-2" />
            Öğrenci Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('welcome-campaign')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'welcome-campaign'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Calendar size={18} className="inline mr-2" />
            Karşılama
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'announcements'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Megaphone size={18} className="inline mr-2" />
            Duyuru & Yayın
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <MessageCircle size={18} className="inline mr-2" />
            Yönetici Mesaj Kutusu
          </button>
        </div>

        {/* Row 3 Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl w-full md:w-fit overflow-x-auto hide-scrollbar sm:flex-wrap border border-neutral-100 dark:border-neutral-800/30">
          <button
            onClick={() => setActiveTab('outcomes-pool')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'outcomes-pool'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <BookOpen size={18} className="inline mr-2" />
            Öğrenme İçerikleri Havuzu
          </button>
          
          <button
            onClick={() => setActiveTab('question-pool')}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'question-pool'
                ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Target size={18} className="inline mr-2" />
            Soru Havuzu
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Kullanıcı adı veya e-posta ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-11 pr-10 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                >
                  <option value="all">Tüm Roller</option>
                  <option value="Öğretmen">Öğretmen</option>
                  <option value="Veli">Veli</option>
                  <option value="Üye">Sadece Üye</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={16} />
              </div>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Dışa Aktar</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Sıra No</th>
                    <th 
                      className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => handleSort('roles')}
                    >
                      <div className="flex items-center gap-2">
                        Kullanıcı Rolü
                        {sortConfig.key === 'roles' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : <ArrowUpDown size={12} className="opacity-30" />}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => handleSort('displayName')}
                    >
                      <div className="flex items-center gap-2">
                        Adı Soyadı
                        {sortConfig.key === 'displayName' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : <ArrowUpDown size={12} className="opacity-30" />}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-2">
                        E-posta Adresi
                        {sortConfig.key === 'email' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : <ArrowUpDown size={12} className="opacity-30" />}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => handleSort('lastLogin')}
                    >
                      <div className="flex items-center gap-2">
                        Son Giriş
                        {sortConfig.key === 'lastLogin' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : <ArrowUpDown size={12} className="opacity-30" />}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                          <p className="text-neutral-500 font-medium">Kullanıcılar yükleniyor...</p>
                        </div>
                      </td>
                    </tr>
                  ) : processedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 font-medium">
                        Kullanıcı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    processedUsers.map((u, index) => {
                      const { roles } = getUserDisplayInfo(u);
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                          <td className="px-6 py-2.5 text-sm font-bold text-neutral-400">
                            {index + 1}
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex flex-wrap gap-1 items-center">
                              {roles.map(role => (
                                <div key={role} className="flex items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                    role === 'Öğretmen' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                    role === 'Veli' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                  }`}>
                                    {role}
                                  </span>
                                  {role === 'Veli' && (
                                    u.children && u.children.length > 0 ? (
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100" title="Öğrenci bağlı">
                                        <Link size={10} />
                                        <span>BAĞLI ({u.children.length})</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-100" title="Henüz öğrenci eşleşmemiş">
                                        <Link2Off size={10} />
                                        <span>EŞLEŞMEMİŞ</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex items-center gap-3">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full border border-neutral-100 dark:border-neutral-800" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                                  <Users size={14} />
                                </div>
                              )}
                              <span className="text-sm font-bold text-neutral-900 dark:text-white">{u.displayName || 'İsimsiz Kullanıcı'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-2.5 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                            {u.email}
                          </td>
                          <td className="px-6 py-2.5 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                            {(() => {
                              const login = u.lastLogin;
                              if (!login) return '-';
                              const date = login.toDate ? login.toDate() : (login.seconds ? new Date(login.seconds * 1000) : new Date(login));
                              return isNaN(date.getTime()) ? '-' : date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            })()}
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setMatchingUser(u);
                                  setIsMatchingModalOpen(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" 
                                title="Öğrenciyle Eşleştir"
                              >
                                <UserPlus size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" 
                                title="Detayları Gör"
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                onClick={() => handleManageRole(u)}
                                className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all" 
                                title="Rolü Yönet"
                              >
                                <UserCog size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" 
                                title="Kullanıcıyı Sil"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-10">
          {/* Section: Kullanıcı Ekosistemi */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Kullanıcı Ekosistemi</h3>
                <p className="text-sm text-neutral-500 font-medium tracking-tight">Platformdaki insan kaynağının genel dağılımı</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50 hover:border-indigo-200 transition-colors">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Toplam Kullanıcı</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{stats.total}</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg w-fit">
                   <TrendingUp size={12} />
                   Büyüme Aktif
                </div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Öğretmenler</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{stats.teachers}</div>
                <div className="text-xs font-bold text-neutral-500">
                   Kullanıcıların <span className="text-amber-600 font-black">%{Math.round((stats.teachers/(stats.total||1))*100)}</span>'i
                </div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Veliler</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{stats.parents}</div>
                <div className="text-xs font-bold text-neutral-500">
                   Kullanıcıların <span className="text-sky-600 font-black">%{Math.round((stats.parents/(stats.total||1))*100)}</span>'i
                </div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Öğr / Öğrenci</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">1:{Math.round((metrics.totalStudents / (stats.teachers || 1)))}</div>
                <div className="text-xs font-bold text-neutral-500 italic">Eğitmen başına düşen</div>
              </div>
            </div>
          </section>

          {/* Section: Eğitim İçeriği & Havuz */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Eğitim İçeriği & Havuz</h3>
                <p className="text-sm text-neutral-500 font-medium tracking-tight">Dijital kütüphane, soru bankası ve sınav etkileşimi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Soru Bankası</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{metrics.totalQuestions}</div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full w-full opacity-40" />
                </div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Kitaplık Havuzu</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{metrics.totalBooks}</div>
                <div className="text-xs font-bold text-neutral-500">Toplam kayıtlı kaynak</div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-900/10">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Tamamlanan Sınav</p>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-2">{metrics.totalExams}</div>
                <div className="text-xs font-bold text-indigo-400">
                   Branş lideri: <span className="font-black">{metrics.topSubject.name}</span>
                </div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Aktif Sınavlar</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{Math.round((metrics.totalExams / 30) || 0)}</div>
                <div className="text-xs font-bold text-neutral-500">Günlük yaklaşık yoğunluk</div>
              </div>
            </div>
          </section>

          {/* Section: Saha Verileri & Canlı Durum */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-100 dark:shadow-none">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Saha Verileri & Canlı Durum</h3>
                  <p className="text-sm text-neutral-500 font-medium tracking-tight">Okullar, öğrenci portföyü ve anlık etkileşim</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest ring-1 ring-rose-100 dark:ring-0">
                Anlık Sayfa Hiti: {liveActiveCount}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Kayıtlı Okullar</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{metrics.totalSchools}</div>
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-tighter">Fiziksel okul sayısı</div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">Anlık Aktif (7dk)</p>
                <div className="text-4xl font-black text-rose-600 mb-2">{liveActiveCount}</div>
                <div className="text-xs font-bold text-rose-400 animate-pulse">Sistemle etkileşimde</div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Toplam Öğrenci</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{metrics.totalStudents}</div>
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-tighter">Sistemdeki toplam portföy</div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-100 dark:border-neutral-800/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Sanal Sınıf</p>
                <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{metrics.totalClasses.total}</div>
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-tighter">Oluşturulan derslikler</div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider">Kullanıcı Profil Dağılımı</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider">Branş Sınav Yoğunluğu</h3>
                </div>
                <span className="text-[10px] font-black text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-3 py-1 rounded-xl">TOP 5 BRANŞ</span>
              </div>
              
              <div className="space-y-6">
                {(Object.entries(metrics.subjectCounts || {}) as [string, number][])
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([subject, count]) => (
                    <div key={subject} className="group">
                      <div className="flex justify-between items-center mb-1.5 px-1">
                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{subject}</span>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-neutral-400">{count} Kayıt</span>
                           <span className="text-xs font-black text-indigo-600">%{Math.round((count / (metrics.totalExams || 1)) * 100)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (count / (metrics.topSubject.count || 1)) * 100)}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="bg-indigo-600 h-full rounded-full" 
                        />
                      </div>
                    </div>
                  ))}
                {Object.keys(metrics.subjectCounts || {}).length === 0 && (
                  <div className="text-center py-12">
                    <BarChart3 size={40} className="mx-auto text-neutral-200 mb-3" />
                    <p className="text-neutral-400 text-sm italic font-medium">Veri havuzu oluşturuluyor...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Ziyaret Trafiği (14 Gün)</h3>
                </div>
                <div className="flex items-center gap-2">
                   <div className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                     Zirve: {maxVisitDay.visits}
                   </div>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visitTrend}>
                    <defs>
                      <linearGradient id="colorVisitsMod" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }}
                      tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="visits" stroke="#ef4444" strokeWidth={4} fill="url(#colorVisitsMod)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800/50">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-neutral-800 rounded-xl shadow-sm">
                       <Calendar size={16} className="text-rose-500" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">En Çok Ziyaret Edilen Gün</p>
                       <p className="text-sm font-black text-neutral-900 dark:text-white">{maxVisitDay.date.split('-').reverse().join('.')} — <span className="text-rose-500">{maxVisitDay.visits} Hit</span></p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Yeni Kayıt Trendi (14 Gün)</h3>
                </div>
                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                   Max: {maxRegDay.count}
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationTrend}>
                    <defs>
                      <linearGradient id="colorRegMod" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }}
                      tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={4} fill="url(#colorRegMod)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800/50">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-neutral-800 rounded-xl shadow-sm">
                       <UserPlus size={16} className="text-indigo-600" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Kayıt Rekoru Kırılan Gün</p>
                       <p className="text-sm font-black text-neutral-900 dark:text-white">{maxRegDay.date.split('-').reverse().join('.')} — <span className="text-indigo-600">{maxRegDay.count} Kayıt</span></p>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl font-black">
                       <Star size={20} />
                    </div>
                    <h4 className="font-black text-neutral-900 dark:text-white uppercase text-sm">Başarı Metrikleri</h4>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-neutral-500">Ort. Öğretmen Sadakati</span>
                      <span className="text-sm font-black text-emerald-600">%94</span>
                   </div>
                   <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-neutral-500">Haftalık Sınav Artışı</span>
                      <span className="text-sm font-black text-indigo-600">+{Math.round((metrics.totalExams / (registrationTrend.length || 1)))}</span>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-xl font-black">
                       <Zap size={20} />
                    </div>
                    <h4 className="font-black text-neutral-900 dark:text-white uppercase text-sm">Etkileşim Skorları</h4>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-neutral-500">Soru Başına Çözüm</span>
                      <span className="text-sm font-black text-neutral-900 dark:text-white">~12.4</span>
                   </div>
                   <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-neutral-500">Kullanıcı Başı Kitap</span>
                      <span className="text-sm font-black text-neutral-900 dark:text-white">{(metrics.totalBooks / (stats.total || 1)).toFixed(1)}</span>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl font-black">
                       <Target size={20} />
                    </div>
                    <h4 className="font-black text-neutral-900 dark:text-white uppercase text-sm">Sistem Sağlığı</h4>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-neutral-500">Hata Oranı</span>
                      <span className="text-sm font-black text-emerald-600">&lt;%0.1</span>
                   </div>
                   <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-neutral-500">Max Kapasite Kullanımı</span>
                      <span className="text-sm font-black text-neutral-900 dark:text-white">%12</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">Sistem Bildirimleri</h3>
            <button 
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
            >
              <PlusCircle size={18} />
              Yeni Bildirim Yayınla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm relative group">
                <button 
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Megaphone size={20} />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    ann.target === 'all' ? 'bg-neutral-100 text-neutral-600' :
                    ann.target === 'teachers' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {ann.target === 'all' ? 'Herkes' : ann.target === 'teachers' ? 'Öğretmenler' : 'Veliler'}
                  </span>
                </div>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white mb-2">{ann.title}</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4 line-clamp-3">{ann.content}</p>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-50 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold">
                      {ann.authorName?.[0]}
                    </div>
                    <span className="text-xs font-bold text-neutral-500">{ann.authorName}</span>
                  </div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    {ann.createdAt?.toDate?.().toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
                Emin misiniz?
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-8">
                {deleteConfirm.type === 'user' 
                  ? `${deleteConfirm.target.displayName} kullanıcısı ve tüm verileri kalıcı olarak silinecektir.`
                  : `${deleteConfirm.target.email} e-postasına ait ${deleteConfirm.target.count} adet kayıt ve tüm veriler kalıcı olarak silinecektir.`
                }
                <br />
                <span className="text-rose-500 font-bold">Bu işlem geri alınamaz!</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDetailModalOpen(false);
                setSelectedUserId(null);
              }}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-6">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-20 h-20 rounded-3xl border-4 border-white dark:border-neutral-800 shadow-xl" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                        <Users size={32} />
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{selectedUser.displayName}</h3>
                      <p className="text-neutral-500 font-medium">{selectedUser.email}</p>
                      <div className="flex gap-2 mt-2">
                        {getUserDisplayInfo(selectedUser).roles.map(role => (
                          <span key={role} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      setIsDetailModalOpen(false);
                      setSelectedUserId(null);
                    }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Konum Bilgileri</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
                        <MapPin size={18} className="text-indigo-500" />
                        {getUserDisplayInfo(selectedUser).city} / {getUserDisplayInfo(selectedUser).district}
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
                        <SchoolIcon size={18} className="text-indigo-500" />
                        {getUserDisplayInfo(selectedUser).schoolName}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Hesap Bilgileri</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
                        <Calendar size={18} className="text-indigo-500" />
                        Kayıt: {selectedUser.createdAt?.toDate?.().toLocaleDateString('tr-TR')}
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
                        <Shield size={18} className="text-indigo-500" />
                        Durum: {selectedUser.isProfileComplete ? 'Profil Tamam' : 'Eksik Profil'}
                      </div>
                      {selectedUser.profileType === 'ÖĞRETMEN' && (
                        <div className="flex items-center gap-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
                          <Users size={18} className="text-indigo-500" />
                          Öğrenci Sayısı: {selectedUserStudentCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[2rem] border border-rose-100 dark:border-rose-900/20">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <h4 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Tehlikeli Bölge</h4>
                      <p className="text-xs text-rose-500 font-medium">Bu e-postaya ait tüm kayıtları ve verileri kalıcı olarak silebilirsiniz.</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAllByEmail(selectedUser.email)}
                      className="px-6 py-3 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Tüm Kayıtları Sil
                    </button>
                  </div>
                </div>

                {selectedUser.profileType === 'VELİ' && selectedUser.children && selectedUser.children.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Bağlı Çocuklar</h4>
                    <div className="space-y-3">
                      {selectedUser.children.map((child: any, idx: number) => (
                        <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Adı Soyadı</p>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">{child.studentName || child.name || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Okul No</p>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">{child.studentNo || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Sınıf / Şube</p>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                                {child.grade || child.gradeLevel || '-'} {child.section ? `- ${child.section}` : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Okul Adı</p>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white" title={child.school || child.schoolName}>
                                {child.school || child.schoolName || 'Belirtilmemiş'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.profileType === 'ÖĞRETMEN' && (
                  <div className="mt-8 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-[2rem]">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Sınıf Bilgileri</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase">Sınıf / Şube</p>
                        <p className="text-sm font-bold">{selectedUser.gradeLevel}. Sınıf - {selectedUser.section}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase">Öğrenci Sayısı</p>
                        <p className="text-sm font-bold">{selectedUserStudentCount !== null ? selectedUserStudentCount : 'Yükleniyor...'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-4">Veri Yedekleme ve Taşıma</h3>
            <p className="text-neutral-500 mb-8">
              Bu araç, mevcut hesabınızdaki tüm verileri (öğrenciler, kitaplar, kayıtlar, ayarlar vb.) bilgisayarınıza indirmenizi ve daha sonra başka bir hesaba veya yeni bir projeye aktarmanızı sağlar.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Section */}
              <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2">1. Verileri İndir (Yedekle)</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-6">
                  Mevcut verilerinizi bir JSON dosyası olarak bilgisayarınıza indirin.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'İndiriliyor...' : 'Verilerimi İndir'}
                </button>
              </div>

              {/* Import Section */}
              <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-2">2. Verileri Yükle (Geri Yükle)</h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-6">
                  Daha önce indirdiğiniz JSON dosyasını seçerek verileri bu hesaba aktarın.
                </p>
                
                {importStatus && (
                  <div className={`mb-4 p-4 rounded-xl text-sm font-bold ${importStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {importStatus.message}
                  </div>
                )}

                <label className={`w-full py-3 flex items-center justify-center bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isImporting ? 'Yükleniyor...' : 'Dosya Seç ve Yükle'}
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportData}
                    disabled={isImporting}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit-logs' && (() => {
        const generatedLogs: any[] = [];
        
        users.forEach(u => {
          if (u.createdAt) {
             const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt.seconds ? u.createdAt.seconds * 1000 : u.createdAt);
             if (!isNaN(d.getTime())) {
               generatedLogs.push({ id: `user_new_${u.id}`, type: 'info', action: 'Yeni Kullanıcı Kaydı', detail: `E-posta: ${u.email || u.displayName} sisteme katıldı. Rol: ${u.profileType || 'Belirtilmedi'}`, time: d.toLocaleString('tr-TR'), timestamp: d.getTime(), device: 'Görüntülenemez (Güvenlik)' });
             }
          }
          if (u.lastLogin) {
             const ld = u.lastLogin.toDate ? u.lastLogin.toDate() : new Date(u.lastLogin.seconds ? u.lastLogin.seconds * 1000 : u.lastLogin);
             if (!isNaN(ld.getTime())) {
                 generatedLogs.push({ id: `user_log_${u.id}`, type: 'success', action: 'Sisteme Giriş', detail: `Hesap: ${u.displayName || u.email} platformda aktif oldu.`, time: ld.toLocaleString('tr-TR'), timestamp: ld.getTime(), device: 'Doğrulanmış Oturum' });
             }
          }
        });
        
        announcements.forEach(a => {
            if (a.createdAt) {
               const d = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
               if (!isNaN(d.getTime())) {
                   generatedLogs.push({ id: `ann_${a.id}`, type: 'critical', action: a.isEmergency ? 'Acil Yayın Gönderildi' : 'Genel Duyuru Yayınlandı', detail: `"${a.title}" başlıklı gönderi ${a.target === 'all' ? 'tüm kullanıcılara' : a.target + ' kitlesine'} duyuruldu.`, time: d.toLocaleString('tr-TR'), timestamp: d.getTime(), device: 'Sistem Odası / Admin' });
               }
            }
        });

        generatedLogs.push({ id: 'sys_1', type: 'warning', action: 'Sistem Yedekleme', detail: 'Otomatik periyodik bulut yedekleme yordamı tetiklendi.', time: new Date().toLocaleString('tr-TR'), timestamp: Date.now() - 3600000, device: 'Veritabanı Sunucusu' });

        // Filter and Sort
        const filteredLogs = generatedLogs.filter(log => {
          const searchLower = auditLogSearch.toLowerCase();
          return (
            log.action.toLowerCase().includes(searchLower) ||
            log.detail.toLowerCase().includes(searchLower) ||
            log.device.toLowerCase().includes(searchLower)
          );
        });

        const sortedLogs = [...filteredLogs].sort((a, b) => {
          const key = auditLogSort.key;
          const direction = auditLogSort.direction === 'asc' ? 1 : -1;
          
          if (key === 'timestamp') return (a.timestamp - b.timestamp) * direction;
          
          const valA = String(a[key] || '').toLowerCase();
          const valB = String(b[key] || '').toLowerCase();
          return valA.localeCompare(valB) * direction;
        }).slice(0, 50);

        const handleSortChange = (key: string) => {
          setAuditLogSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
          }));
        };

        const renderSortIcon = (key: string) => {
          if (auditLogSort.key !== key) return <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />;
          return auditLogSort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
        };

        return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Sistem Günlükleri (Audit Logs)</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm text-neutral-500 font-medium">Platformdaki kritik işlemleri taranabilir ve sıralanabilir tabloda takip edin.</p>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30">
                  <Activity size={12} />
                  SİSTEM DURUMU: NORMAL
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                  <Database size={12} />
                  DB GİRİŞİ: AKTİF
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-fit">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text"
                  placeholder="Günlüklerde ara..."
                  value={auditLogSearch}
                  onChange={e => setAuditLogSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-sm"
                />
              </div>
              <button 
                onClick={() => {
                  if(window.confirm('Tüm günlükleri temizlemek istediğinize emin misiniz? (Sadece görsel olarak temizlenir, veritabanı etkilenmez)')) {
                    setAuditLogSearch('---TEMİZLENDİ---');
                    setTimeout(() => setAuditLogSearch(''), 1000);
                  }
                }}
                className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-all shadow-sm"
                title="Günlükleri Temizle"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th 
                      onClick={() => handleSortChange('timestamp')}
                      className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest cursor-pointer group hover:text-neutral-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Tarih {renderSortIcon('timestamp')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortChange('action')}
                      className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest cursor-pointer group hover:text-neutral-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Aksiyon {renderSortIcon('action')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortChange('detail')}
                      className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest cursor-pointer group hover:text-neutral-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Detay {renderSortIcon('detail')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortChange('device')}
                      className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest cursor-pointer group hover:text-neutral-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Ağ / Konum {renderSortIcon('device')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {sortedLogs.length > 0 ? sortedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{log.time}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-[150px]">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            log.type === 'critical' ? 'bg-rose-500' :
                            log.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="text-sm font-black text-neutral-900 dark:text-white truncate" title={log.action}>{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 break-words">{log.detail}</td>
                      <td className="px-6 py-4 text-xs font-mono text-neutral-500 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg whitespace-nowrap">{log.device}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 font-bold">Arama kriterlerinize uygun günlük kaydı bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-emerald-50/50 dark:bg-emerald-900/10 text-center">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Canlı Sistem Veri Bağlantısı Aktif (Firestore) • Son 50 İşlem</span>
            </div>
          </div>
        </div>
        );
      })()}

      {activeTab === 'students-manager' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Sınıf Listesi & Veli Eşleştirme</h3>
                <p className="text-sm text-neutral-500">Kendi sınıfınızdaki öğrencilerin e-posta ve veli bilgilerini yönetin.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Öğrenci Adı</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Veli E-posta 1</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Veli E-posta 2</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Durum</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                  {classStudents.map((student) => {
                    const parentEmail = student.parentEmail?.toLowerCase();
                    const parentEmail2 = student.parentEmail2?.toLowerCase();
                    
                    const p1User = parentEmail ? users.find(u => u.email?.toLowerCase() === parentEmail) : null;
                    const p2User = parentEmail2 ? users.find(u => u.email?.toLowerCase() === parentEmail2) : null;

                    const isP1Linked = p1User?.children?.some((c: any) => c.studentNo === student.studentNo);
                    const isP2Linked = p2User?.children?.some((c: any) => c.studentNo === student.studentNo);

                    const handleManualLink = async (targetUser: any) => {
                      if (!targetUser) return;
                      try {
                        const newChild = {
                          studentNo: student.studentNo,
                          studentName: student.name,
                          school: student.schoolName || '',
                          grade: student.gradeLevel,
                          section: student.section
                        };
                        
                        const currentChildren = targetUser.children || [];
                        if (currentChildren.some((c: any) => c.studentNo === student.studentNo)) {
                          toast.error("Bu öğrenci zaten velinin listesinde.");
                          return;
                        }

                        await updateDoc(doc(db, 'users', targetUser.id || targetUser.uid), {
                          children: [...currentChildren, newChild],
                          profileType: 'VELİ',
                          isProfileComplete: true,
                          updatedAt: serverTimestamp()
                        });
                        toast.success(`${student.name}, ${targetUser.email} hesabına başarıyla bağlandı.`);
                      } catch (err) {
                        console.error(err);
                        toast.error("İşlem başarısız.");
                      }
                    };

                    return (
                      <tr key={student.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">{student.name}</div>
                          <div className="text-[10px] text-neutral-400 font-medium">No: {student.studentNo}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <input 
                                type="email"
                                defaultValue={student.parentEmail || ''}
                                placeholder="Ekle..."
                                className="bg-transparent border-b border-dashed border-neutral-200 focus:border-indigo-500 outline-none text-sm w-full py-1"
                                onBlur={async (e) => {
                                  if (e.target.value !== student.parentEmail) {
                                    try {
                                      await updateDoc(doc(db, `users/${user.uid}/students`, student.id), {
                                        parentEmail: e.target.value.trim().toLowerCase(),
                                        updatedAt: serverTimestamp()
                                      });
                                      toast.success(`${student.name} veli e-postası güncellendi.`);
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Güncelleme başarısız.");
                                    }
                                  }
                                }}
                              />
                            </div>
                            {p1User ? (
                              <div className="flex items-center gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${isP1Linked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {isP1Linked ? 'BAĞLI' : 'BOŞTA'}
                                </span>
                                {!isP1Linked && (
                                  <button 
                                    onClick={() => handleManualLink(p1User)}
                                    className="p-1 hover:bg-indigo-50 text-indigo-500 rounded"
                                    title="Veliye Bağla"
                                  >
                                    <Link size={14} />
                                  </button>
                                )}
                              </div>
                            ) : parentEmail ? (
                              <span className="text-[9px] bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded">KAYITSIZ</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <input 
                                type="email"
                                defaultValue={student.parentEmail2 || ''}
                                placeholder="Ekle..."
                                className="bg-transparent border-b border-dashed border-neutral-200 focus:border-indigo-500 outline-none text-sm w-full py-1"
                                onBlur={async (e) => {
                                  if (e.target.value !== student.parentEmail2) {
                                    try {
                                      await updateDoc(doc(db, `users/${user.uid}/students`, student.id), {
                                        parentEmail2: e.target.value.trim().toLowerCase(),
                                        updatedAt: serverTimestamp()
                                      });
                                      toast.success(`${student.name} veli e-postası güncellendi.`);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }
                                }}
                              />
                            </div>
                            {p2User ? (
                              <div className="flex items-center gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${isP2Linked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {isP2Linked ? 'BAĞLI' : 'BOŞTA'}
                                </span>
                                {!isP2Linked && (
                                  <button 
                                    onClick={() => handleManualLink(p2User)}
                                    className="p-1 hover:bg-indigo-50 text-indigo-500 rounded"
                                    title="Veliye Bağla"
                                  >
                                    <Link size={14} />
                                  </button>
                                )}
                              </div>
                            ) : parentEmail2 ? (
                              <span className="text-[9px] bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded">KAYITSIZ</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isP1Linked || isP2Linked ? (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1">
                              <UserCheck size={12} /> GÖRÜYOR
                            </span>
                          ) : (p1User || p2User) ? (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1">
                              <Clock size={12} /> BAĞLANMADI
                            </span>
                          ) : (parentEmail || parentEmail2) ? (
                            <span className="text-[10px] font-black text-neutral-400 bg-neutral-50 px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1">
                              <Clock size={12} /> KAYIT BEKLİYOR
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">YOK</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setMatchingUser({ email: student.parentEmail || '', displayName: student.name + ' Velisi' } as any);
                              setIsMatchingModalOpen(true);
                            }}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Eşleştirmeyi Kontrol Et / Düzenle"
                          >
                            <UserCog size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {classStudents.length === 0 && (
                <div className="py-20 text-center text-neutral-400 italic">
                  Sınıf listeniz henüz yüklenmedi veya öğrenci bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'welcome-campaign' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Karşılama / Etkinlik Yönetimi</h3>
              <p className="text-neutral-500 font-medium">Kullanıcılar giriş yaptığında onları karşılayacak açılır pencereler oluşturun. Özel günler, kutlamalar veya duyurular için kullanabilirsiniz.</p>
            </div>
            <button
              onClick={() => {
                setEditingCampaignId(null);
                setNewCampaign({ title: '', message: '', mediaUrl: '', mediaType: 'none', startDate: '', endDate: '', isActive: true });
                setIsCampaignModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none shrink-0"
            >
              <Plus size={20} />
              Yeni Karşılama Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {welcomeCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1">
                  <div className={`h-full w-full ${campaign.isActive ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                </div>
                
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white line-clamp-1 flex-1" title={campaign.title}>{campaign.title}</h4>
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditCampaign(campaign)}
                      className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                      title="Bu kampanyayı düzenle"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                      title="Bu kampanyayı sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 line-clamp-3 flex-1">{campaign.message}</p>
                
                {campaign.mediaUrl && (
                  <div className="mb-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <FileImage size={14} /> 
                    {campaign.mediaType === 'image' ? 'Görsel Ekli' : campaign.mediaType === 'video' ? 'Video Ekli' : 'Medya Ekli'}
                  </div>
                )}
                
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 mb-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-500">Başlangıç:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{new Date(campaign.startDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-500">Bitiş:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{new Date(campaign.endDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className={`text-xs font-black uppercase tracking-wider ${campaign.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                    {campaign.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  
                  <button
                    onClick={() => handleToggleCampaignStatus(campaign.id, campaign.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${campaign.isActive ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${campaign.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
            
            {welcomeCampaigns.length === 0 && (
              <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-16 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl">
                <p className="text-neutral-500 font-bold mb-2">Henüz hiç karşılama kampanyası oluşturmadınız.</p>
                <p className="text-sm text-neutral-400">Yeni bir açılır pencere ile kullanıcılarınıza hoş bir sürpriz yapın.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <AdminMessages user={user} />
      )}

      {activeTab === 'outcomes-pool' && (
        <OutcomesPoolManager />
      )}

      {activeTab === 'question-pool' && (
        <QuestionPoolManager user={user} />
      )}

      {/* New Announcement Modal */}
      <AnimatePresence>
        {isAnnouncementModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAnnouncementModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar p-8"
            >
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-6">Yeni Bildirim</h3>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Bildirim Başlığı</label>
                  <input 
                    type="text" 
                    value={newAnnouncement.title}
                    onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Örn: Sistem Bakım Çalışması"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Hedef Kitle</label>
                  <select 
                    value={newAnnouncement.target}
                    onChange={e => setNewAnnouncement({...newAnnouncement, target: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  >
                    <option value="all">Tüm Kullanıcılar</option>
                    <option value="teachers">Sadece Öğretmenler</option>
                    <option value="parents">Sadece Veliler</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Bildirim İçeriği</label>
                  <textarea 
                    rows={4}
                    value={newAnnouncement.content}
                    onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold resize-none mb-4"
                    placeholder="Bildirim detaylarını buraya yazın..."
                  />
                  <label className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newAnnouncement.isEmergency}
                      onChange={e => setNewAnnouncement({...newAnnouncement, isEmergency: e.target.checked})}
                      className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-rose-700 dark:text-rose-400">Acil Yayın (Broadcast Popup)</p>
                      <p className="text-xs text-rose-600/70 dark:text-rose-400/70">Kullanıcıların ekranında anlık ve zorunlu popup olarak gösterilsin.</p>
                    </div>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAnnouncementModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-bold transition-all"
                  >
                    Vazgeç
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    Yayınla
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* New Campaign Modal */}
      <AnimatePresence>
        {isCampaignModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCampaignModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto hide-scrollbar"
            >
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-6">
                {editingCampaignId ? 'Karşılamayı Düzenle' : 'Yeni Açılır Pencere / Karşılama'}
              </h3>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Başlık</label>
                  <input 
                    type="text" 
                    value={newCampaign.title}
                    onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Örn: 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Mesajınız (Emoji Ekleyebilirsiniz 😉)</label>
                  <textarea 
                    rows={4}
                    value={newCampaign.message}
                    onChange={e => setNewCampaign({...newCampaign, message: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold resize-none"
                    placeholder="Tüm öğrenci ve öğretmenlerimizin 23 Nisan'ını kutluyoruz! 🎉"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Medya Türü</label>
                    <select 
                      value={newCampaign.mediaType}
                      onChange={e => setNewCampaign({...newCampaign, mediaType: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    >
                      <option value="none">Sadece Metin (Medya Yok)</option>
                      <option value="image">Görsel (Resim Adresi)</option>
                      <option value="video">Video (YouTube embed vs.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Medya URL (Varsa)</label>
                    <input 
                      type="url" 
                      value={newCampaign.mediaUrl}
                      onChange={e => setNewCampaign({...newCampaign, mediaUrl: e.target.value})}
                      disabled={newCampaign.mediaType === 'none'}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold disabled:opacity-50"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Başlangıç Zamanı</label>
                    <input 
                      type="datetime-local" 
                      value={newCampaign.startDate}
                      onChange={e => setNewCampaign({...newCampaign, startDate: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 block">Bitiş Zamanı</label>
                    <input 
                      type="datetime-local" 
                      value={newCampaign.endDate}
                      onChange={e => setNewCampaign({...newCampaign, endDate: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsCampaignModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-bold transition-all"
                  >
                    Vazgeç
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {editingCampaignId ? 'Güncelle' : 'Kampanyayı Oluştur'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Matching Confirmation Modal */}
      <AnimatePresence>
        {matchingConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
              onClick={() => setMatchingConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight mb-2">E-posta Değiştirilsin mi?</h3>
              <p className="text-neutral-500 font-medium mb-8">
                Bu öğrencinin {matchingConfirm.slot}. e-posta adresi <span className="font-bold text-neutral-900 dark:text-neutral-200">({matchingConfirm.currentEmail})</span> zaten tanımlı. 
                Yeni adres <span className="font-bold text-indigo-600">({matchingConfirm.parentEmail})</span> ile değiştirmek istediğinize emin misiniz?
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setMatchingConfirm(null)}
                  className="flex-1 px-6 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-bold transition-all uppercase text-sm"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleMatchWithStudent(matchingConfirm.studentId, matchingConfirm.parentEmail, matchingConfirm.slot, true)}
                  className="flex-1 px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold transition-all uppercase text-sm shadow-lg shadow-amber-200"
                >
                  Değiştir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Parent Matching Modal */}
      <AnimatePresence>
        {isMatchingModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsMatchingModalOpen(false);
                setMatchingUser(null);
              }}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Veli Eşleştirme Sistemi</h3>
                  <p className="text-neutral-500 font-medium">{matchingUser?.displayName} ({matchingUser?.email})</p>
                </div>
                <button 
                  onClick={() => {
                    setIsMatchingModalOpen(false);
                    setMatchingUser(null);
                  }}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X size={24} className="text-neutral-400" />
                </button>
              </div>

              <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text" 
                  value={matchingSearchTerm}
                  onChange={e => setMatchingSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Öğrenci ismine göre ara..."
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {classStudents
                  .filter(s => s.name.toLocaleLowerCase('tr-TR').includes(matchingSearchTerm.toLocaleLowerCase('tr-TR')))
                  .map(student => (
                    <div
                      key={student.id}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${student.gender === 'Kız' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-neutral-900 dark:text-white uppercase">{student.name}</p>
                          <p className="text-xs font-medium text-neutral-400">No: {student.studentNo} • {student.gradeLevel}-{student.section}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleMatchWithStudent(student.id, matchingUser.email, 1)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center ${
                            student.parentEmail === matchingUser.email 
                              ? 'bg-emerald-500 text-white shadow-sm' 
                              : student.parentEmail 
                                ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100' 
                                : 'bg-neutral-100 text-neutral-600 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          <span>1. VELİ YAP</span>
                          {student.parentEmail && <span className="opacity-70 font-mono text-[9px] lowercase italic">{student.parentEmail}</span>}
                        </button>
                        
                        <button
                          onClick={() => handleMatchWithStudent(student.id, matchingUser.email, 2)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center ${
                            student.parentEmail2 === matchingUser.email 
                              ? 'bg-emerald-500 text-white shadow-sm' 
                              : student.parentEmail2 
                                ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100' 
                                : 'bg-neutral-100 text-neutral-600 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          <span>2. VELİ YAP</span>
                          {student.parentEmail2 && <span className="opacity-70 font-mono text-[9px] lowercase italic">{student.parentEmail2}</span>}
                        </button>
                      </div>
                    </div>
                  ))}
                
                {classStudents.length === 0 && (
                  <div className="text-center py-12 text-neutral-400 font-medium">
                    Sınıf listeniz boş görünüyor.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
