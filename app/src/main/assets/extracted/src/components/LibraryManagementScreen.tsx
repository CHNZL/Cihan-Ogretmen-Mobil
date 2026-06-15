import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Library,
  ClipboardCheck,
  Trash2,
  Edit3,
  UserPlus,
  Undo2,
  X,
  Users,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
  birthDate: string;
  parentEmail: string;
  teacherUid: string;
}

interface Book {
  id: string;
  registrationNo: number;
  name: string;
  author?: string;
  pageCount?: number;
  status?: string; // 'Rafta' or Student Name
  currentStudentId?: string | null;
  currentStudentName?: string | null;
  assignmentDate?: any | null;
  isReadByAll?: boolean;
}

export interface ReadingRecord {
  id: string;
  bookId: string;
  bookName: string;
  pageCount?: number;
  studentId: string;
  studentName: string;
  startDate: any;
  endDate: any;
  teacherUid: string;
  createdAt: any;
}

export interface ReadingEvaluation {
  id: string;
  bookId: string;
  studentId: string;
  readingScore?: number | null;
  tellingScore?: number | null;
  writingScore?: number | null;
  examScore?: number | null;
  teacherUid: string;
  updatedAt: any;
}

interface LibraryManagementScreenProps {
  activeSubTab: 'list' | 'records' | 'evaluation';
  onSubTabChange: (tab: 'list' | 'records' | 'evaluation') => void;
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  books: Book[];
  students?: Student[];
  readingRecords?: ReadingRecord[];
  readingEvaluations?: ReadingEvaluation[];
  onAssignBook?: (book: Book, studentId: string, studentName: string) => void;
  onReturnBook?: (book: Book) => void;
  onMarkAsReadByAll?: (book: Book) => void;
  onDeleteReadingRecord?: (recordId: string) => void;
  onCancelAssignment?: (book: Book) => void;
  onDeleteAllReadingRecords?: () => void;
  onSaveEvaluation?: (evaluation: Partial<ReadingEvaluation>) => void;
  onSaveAllEvaluations?: (bookId: string, field: keyof ReadingEvaluation, value: number | null) => void;
  onImportExcel?: (file: File) => void;
  userProfile?: any;
}

export const LibraryManagementScreen: React.FC<LibraryManagementScreenProps> = ({
  activeSubTab,
  onSubTabChange,
  onAddBook,
  onEditBook,
  onDeleteBook,
  books,
  students = [],
  userProfile,
  readingRecords = [],
  readingEvaluations = [],
  onAssignBook,
  onReturnBook,
  onCancelAssignment,
  onMarkAsReadByAll,
  onDeleteReadingRecord,
  onDeleteAllReadingRecords,
  onSaveEvaluation,
  onSaveAllEvaluations,
  onImportExcel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMarkAllModalOpen, setIsMarkAllModalOpen] = useState(false);
  const [selectedBookForAssign, setSelectedBookForAssign] = useState<Book | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isDeleteAllRecordsModalOpen, setIsDeleteAllRecordsModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [recordToReturn, setRecordToReturn] = useState<any | null>(null);
  const [isReturnRecordModalOpen, setIsReturnRecordModalOpen] = useState(false);
  const [bookToCancel, setBookToCancel] = useState<Book | null>(null);
  const [isCancelRecordModalOpen, setIsCancelRecordModalOpen] = useState(false);
  const [selectedEvaluationBookId, setSelectedEvaluationBookId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'onShelf' | 'atStudent'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Book | 'status'; direction: 'asc' | 'desc' }>({
    key: 'registrationNo',
    direction: 'asc'
  });

  const handleSort = (key: keyof Book | 'status') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEvaluateAll = (field: keyof ReadingEvaluation, value: string) => {
    const numValue = value === '' ? null : Number(value);
    if (onSaveAllEvaluations && selectedEvaluationBookId) {
      onSaveAllEvaluations(selectedEvaluationBookId, field, numValue);
    }
  };

  const exportToExcel = () => {
    const exportData = sortedBooks.map(book => ({
      'Kayıt No': book.registrationNo,
      'Kitap Adı': book.name,
      'Yazar': book.author || '-',
      'Sayfa Sayısı': book.pageCount || '-',
      'Durum': book.currentStudentId ? `Öğrencide (${book.currentStudentName})` : 'Rafta'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kitaplık');
    XLSX.writeFile(wb, 'Kitaplik_Listesi.xlsx');
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    
    try {
      const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf');
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      doc.addFileToVFS('Roboto-Regular.ttf', base64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
    } catch (e) {
      console.error('Font loading failed', e);
    }

    // Header
    let currentY = 20;
    
    if (userProfile?.schoolName) {
      doc.setFontSize(14);
      doc.text(userProfile.schoolName.toLocaleUpperCase('tr-TR'), 105, currentY, { align: 'center' });
      currentY += 8;
    }
    
    if (userProfile?.gradeLevel && userProfile?.section) {
      doc.setFontSize(12);
      doc.text(`${userProfile.gradeLevel} / ${userProfile.section} SINIFI`, 105, currentY, { align: 'center' });
      currentY += 8;
    }
    
    doc.setFontSize(16);
    doc.text('SINIF KİTAPLIK LİSTESİ', 105, currentY, { align: 'center' });
    currentY += 12;
    
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, currentY);
    doc.text(`Toplam Kitap: ${sortedBooks.length}`, 14, currentY + 6);

    const tableData = sortedBooks.map(book => [
      book.registrationNo.toString(),
      book.name,
      book.author || '-',
      book.pageCount?.toString() || '-'
    ]);

    autoTable(doc, {
      startY: currentY + 12,
      head: [['KAYIT NO', 'KİTAP ADI', 'YAZAR', 'SAYFA']],
      body: tableData,
      styles: { font: 'Roboto', fontSize: 9 },
      headStyles: { font: 'Roboto', fillColor: [79, 70, 229] }, // Indigo 600
      theme: 'grid'
    });

    doc.save('Kitaplik_Listesi.pdf');
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (statusFilter === 'onShelf') return !book.currentStudentId;
    if (statusFilter === 'atStudent') return !!book.currentStudentId;
    return true;
  });

  const sortedBooks = useMemo(() => {
    const sortableBooks = [...filteredBooks];
    sortableBooks.sort((a: any, b: any) => {
      if (sortConfig.key === 'status') {
        const aStatus = a.currentStudentId ? 1 : 0;
        const bStatus = b.currentStudentId ? 1 : 0;
        if (aStatus < bStatus) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStatus > bStatus) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'tr', { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableBooks;
  }, [filteredBooks, sortConfig]);

  const studentFinishedBooksCount = useMemo(() => {
    const counts: Record<string, number> = {};
    readingRecords.forEach(record => {
      if (record.studentId) {
        counts[record.studentId] = (counts[record.studentId] || 0) + 1;
      }
    });
    return counts;
  }, [readingRecords]);

  // Combine active assignments and completed records for the records view
  const activeAssignments = books
    .filter(b => b.currentStudentId)
    .map(b => ({
      id: `active-${b.id}`,
      bookId: b.id,
      bookName: b.name,
      pageCount: b.pageCount,
      studentId: b.currentStudentId!,
      studentName: b.currentStudentName!,
      startDate: b.assignmentDate,
      endDate: null,
      isActive: true
    }));

  const allRecords = [
    ...activeAssignments,
    ...readingRecords.map(r => ({ ...r, isActive: false }))
  ].sort((a, b) => {
    // Sort by start date descending
    const dateA = a.startDate?.seconds || 0;
    const dateB = b.startDate?.seconds || 0;
    return dateB - dateA;
  });

  const filteredRecords = allRecords.filter(record => {
    const matchesSearch = 
      record.bookName.toLowerCase().includes(recordsSearchTerm.toLowerCase()) ||
      record.studentName.toLowerCase().includes(recordsSearchTerm.toLowerCase());
    
    const matchesStudent = selectedStudentFilter === 'all' || record.studentId === selectedStudentFilter;

    return matchesSearch && matchesStudent;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-neutral-900 tracking-tight">Kitaplık Yönetimi</h1>
          <p className="text-xs text-neutral-500 font-medium">Sınıf kitaplığınızı yönetin ve okuma alışkanlıklarını takip edin.</p>
        </div>
        <div className="flex items-center gap-2">
          {onImportExcel && (
            <label className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer">
              <ClipboardCheck size={18} />
              Excel'den Yükle
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onImportExcel(e.target.files[0]);
                    e.target.value = ''; // Reset input
                  }
                }}
              />
            </label>
          )}
          <button
            onClick={onAddBook}
            className="flex items-center justify-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} />
            Yeni Kitap Ekle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-100/50 p-1 rounded-2xl flex flex-wrap gap-1">
        <button
          onClick={() => onSubTabChange('list')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'list'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Library size={16} />
          Kitaplık Listesi
        </button>
        <button
          onClick={() => onSubTabChange('records')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'records'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <BookOpen size={16} />
          Okuma Kayıtları
        </button>
        <button
          onClick={() => onSubTabChange('evaluation')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'evaluation'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <ClipboardCheck size={16} />
          Okuma Değerlendirme
        </button>
      </div>

      {/* Content Card */}
      <div className="bg-white border border-neutral-200 rounded-[32px] shadow-sm">
        {activeSubTab === 'list' && (
          <div className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-neutral-900 tracking-tight uppercase">Kitaplık Listesi</h2>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Kitaplığınızdaki tüm kitaplar.</p>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={exportToExcel}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border-2 border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors font-bold text-xs"
                >
                  <Download size={16} />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-xl hover:bg-rose-100 transition-colors font-bold text-xs"
                >
                  <Download size={16} />
                  PDF
                </button>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-sky-500 focus:bg-white outline-none transition-all font-bold text-xs text-neutral-600"
                >
                  <option value="all">Tüm Kitaplar</option>
                  <option value="onShelf">Rafta Olanlar</option>
                  <option value="atStudent">Öğrencide Olanlar</option>
                </select>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input
                    type="text"
                    placeholder="Kitap adına göre ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-sky-500 focus:bg-white outline-none transition-all font-bold text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <table className="w-full text-left border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-neutral-400 text-[11px] font-black uppercase tracking-widest">
                    <th className="px-4 py-2" onClick={() => handleSort('registrationNo')}>
                      <div className="flex items-center gap-2 cursor-pointer hover:text-neutral-600 transition-colors">
                        Kayıt No 
                        {sortConfig.key === 'registrationNo' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-2 cursor-pointer hover:text-neutral-600 transition-colors">
                        Kitap Adı 
                        {sortConfig.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2" onClick={() => handleSort('author')}>
                      <div className="flex items-center gap-2 cursor-pointer hover:text-neutral-600 transition-colors">
                        Yazar 
                        {sortConfig.key === 'author' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-center" onClick={() => handleSort('pageCount')}>
                      <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-neutral-600 transition-colors">
                        Sayfa 
                        {sortConfig.key === 'pageCount' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-2 cursor-pointer hover:text-neutral-600 transition-colors">
                        Durum
                        {sortConfig.key === 'status' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-right">Eylemler</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBooks.map((book, index) => (
                    <tr key={book.id} className="group hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-1 bg-neutral-50/50 group-hover:bg-transparent rounded-l-xl text-xs font-bold text-neutral-600">
                        {book.registrationNo}
                      </td>
                      <td className="px-4 py-1 text-xs font-bold text-neutral-900">
                        {book.name}
                      </td>
                      <td className="px-4 py-1 text-xs font-medium text-neutral-500">
                        {book.author || '-'}
                      </td>
                      <td className="px-4 py-1 text-xs font-bold text-neutral-600 text-center">
                        {book.pageCount || '-'}
                      </td>
                      <td className="px-4 py-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          book.currentStudentId
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {book.currentStudentName || 'Rafta'}
                        </span>
                      </td>
                      <td className="px-4 py-1 rounded-r-xl text-right relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === book.id ? null : book.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            openMenuId === book.id 
                              ? 'bg-sky-50 text-sky-600' 
                              : 'hover:bg-neutral-100 text-neutral-400'
                          }`}
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {openMenuId === book.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[100]" 
                                onClick={() => setOpenMenuId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-4 bottom-full mb-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl z-[101] overflow-hidden"
                              >
                                <div className="p-1.5">
                                  {book.currentStudentId ? (
                                    <button
                                      onClick={() => {
                                        if (onReturnBook) onReturnBook(book);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                    >
                                      <Undo2 size={16} />
                                      İade Al
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedBookForAssign(book);
                                        setSelectedStudentId('');
                                        setIsAssignModalOpen(true);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                                    >
                                      <UserPlus size={16} />
                                      Öğrenciye Ata
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      onEditBook(book);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
                                  >
                                    <Edit3 size={16} className="text-sky-500" />
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedBookForAssign(book);
                                      setIsMarkAllModalOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                  >
                                    <Users size={16} />
                                    Tüm Sınıf Okudu
                                  </button>
                                  <button
                                    onClick={() => {
                                      onDeleteBook(book);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                  >
                                    <Trash2 size={16} />
                                    Sil
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  ))}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-neutral-50 rounded-full text-neutral-300">
                            <Library size={48} />
                          </div>
                          <p className="text-neutral-400 font-bold">Henüz kitap eklenmemiş.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'records' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar: Students List */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="bg-white border border-neutral-200 rounded-3xl p-4 shadow-sm h-full">
                <h3 className="text-lg font-black text-neutral-900 mb-4 px-2">Öğrenciler</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedStudentFilter('all')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
                      selectedStudentFilter === 'all'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Tüm Sınıf
                  </button>
                  {students.map(student => {
                    const finishedCount = studentFinishedBooksCount[student.id] || 0;
                    return (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudentFilter(student.id)}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-between ${
                          selectedStudentFilter === student.id
                            ? 'bg-neutral-100 text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                          <span className="text-neutral-400 mr-2 shrink-0">({student.studentNo})</span>
                          <span className="truncate">{student.name}</span>
                        </div>
                        {finishedCount > 0 && (
                          <span className="ml-2 shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">
                            {finishedCount} Kitap
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content: Records Table */}
            <div className="flex-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-black text-neutral-900">Okuma Kayıtları</h2>
                  <p className="text-xs text-neutral-500 font-medium mt-1">Geçmiş ve güncel tüm kitap okuma hareketleri.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setIsDeleteAllRecordsModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <Trash2 size={14} />
                    Tümünü Sil
                  </button>
                  <div className="relative flex-1 md:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                      type="text"
                      placeholder="Ara..."
                      value={recordsSearchTerm}
                      onChange={(e) => setRecordsSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          Kitap Adı <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider text-center">
                        <div className="flex items-center justify-center gap-2">
                          Sayfa Sayısı <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          Öğrenci <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          Veriliş Tarihi <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          İade Tarihi <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider text-center">Durum</th>
                      <th className="px-4 py-3 text-xs font-black text-neutral-400 uppercase tracking-wider text-right">Eylem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="group">
                        <td className="px-4 py-1.5 bg-neutral-50/50 group-hover:bg-transparent rounded-l-2xl text-sm font-bold text-neutral-900">
                          {record.bookName}
                        </td>
                        <td className="px-4 py-1.5 text-sm font-bold text-neutral-600 text-center">
                          {record.pageCount || '-'}
                        </td>
                        <td className="px-4 py-1.5 text-sm font-bold text-neutral-700 uppercase">
                          {record.studentName}
                        </td>
                        <td className="px-4 py-1.5 text-sm font-medium text-neutral-500">
                          {formatDate(record.startDate)}
                        </td>
                        <td className="px-4 py-1.5 text-sm font-medium text-neutral-500">
                          {formatDate(record.endDate)}
                        </td>
                        <td className="px-4 py-1.5 text-center">
                          <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            record.isActive
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {record.isActive ? 'Öğrencide' : 'İade Edildi'}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 rounded-r-2xl text-right">
                          <button
                            onClick={() => {
                              if (record.isActive) {
                                // If active, "deleting" means cancelling assignment (no rewards)
                                const book = books.find(b => b.id === record.bookId);
                                if (book && onCancelAssignment) {
                                  setBookToCancel(book);
                                  setIsCancelRecordModalOpen(true);
                                }
                              } else {
                                setRecordToDelete(record);
                                setIsDeleteRecordModalOpen(true);
                              }
                            }}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-neutral-50 rounded-full text-neutral-300">
                              <BookOpen size={48} />
                            </div>
                            <p className="text-neutral-400 font-bold">Kayıt bulunamadı.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'evaluation' && (
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left sidebar: Books read by all */}
              <div className="w-full md:w-1/4 space-y-4">
                <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">Değerlendirilecek Kitaplar</h3>
                <div className="bg-neutral-50 rounded-2xl p-2 space-y-2 border border-neutral-100">
                  {books.filter(b => b.isReadByAll).length === 0 ? (
                    <div className="p-4 text-center text-neutral-400 text-sm font-medium">
                      Henüz tüm sınıfın okuduğu bir kitap bulunmuyor.
                    </div>
                  ) : (
                    books
                      .filter(b => b.isReadByAll)
                      .sort((a, b) => a.registrationNo - b.registrationNo)
                      .map(book => (
                        <button
                          key={book.id}
                          onClick={() => setSelectedEvaluationBookId(book.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            selectedEvaluationBookId === book.id
                              ? 'bg-sky-100 text-sky-700 shadow-sm'
                              : 'text-neutral-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          {book.name}
                        </button>
                      ))
                  )}
                </div>
              </div>

              {/* Right content: Evaluation table */}
              <div className="w-full md:w-3/4">
                {!selectedEvaluationBookId ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50/50">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-neutral-300 shadow-sm mb-4">
                      <ClipboardCheck size={32} />
                    </div>
                    <h3 className="text-xl font-black text-neutral-900 mb-2">Kitap Seçin</h3>
                    <p className="text-neutral-500 font-medium">Değerlendirme yapmak için sol taraftan bir kitap seçin.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-neutral-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                      <h3 className="text-lg font-black text-neutral-900">
                        {books.find(b => b.id === selectedEvaluationBookId)?.name} - Değerlendirme
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-100 bg-neutral-50/30">
                            <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider w-12 text-center">No</th>
                            <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-wider">Öğrenci Adı</th>
                            <th className="px-4 py-3 text-xs font-black text-neutral-500 uppercase tracking-wider text-center w-40">
                              <div className="mb-2">Okuma</div>
                              <select 
                                onChange={(e) => {
                                  handleEvaluateAll('readingScore', e.target.value);
                                  e.target.value = ''; // Reset after selection
                                }}
                                defaultValue=""
                                className="w-full text-left p-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-500 outline-none focus:border-sky-500 bg-white"
                              >
                                <option value="" disabled>Tümünü Değerlendir</option>
                                <option value="1">1 (Geliştirilmeli)</option>
                                <option value="2">2 (Yeterli)</option>
                                <option value="3">3 (İyi)</option>
                                <option value="4">4 (Çok İyi)</option>
                              </select>
                            </th>
                            <th className="px-4 py-3 text-xs font-black text-neutral-500 uppercase tracking-wider text-center w-40">
                              <div className="mb-2">Anlatma</div>
                              <select 
                                onChange={(e) => {
                                  handleEvaluateAll('tellingScore', e.target.value);
                                  e.target.value = '';
                                }}
                                defaultValue=""
                                className="w-full text-left p-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-500 outline-none focus:border-sky-500 bg-white"
                              >
                                <option value="" disabled>Tümünü Değerlendir</option>
                                <option value="1">1 (Geliştirilmeli)</option>
                                <option value="2">2 (Yeterli)</option>
                                <option value="3">3 (İyi)</option>
                                <option value="4">4 (Çok İyi)</option>
                              </select>
                            </th>
                            <th className="px-4 py-3 text-xs font-black text-neutral-500 uppercase tracking-wider text-center w-40">
                              <div className="mb-2">Yazma</div>
                              <select 
                                onChange={(e) => {
                                  handleEvaluateAll('writingScore', e.target.value);
                                  e.target.value = '';
                                }}
                                defaultValue=""
                                className="w-full text-left p-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-500 outline-none focus:border-sky-500 bg-white"
                              >
                                <option value="" disabled>Tümünü Değerlendir</option>
                                <option value="1">1 (Geliştirilmeli)</option>
                                <option value="2">2 (Yeterli)</option>
                                <option value="3">3 (İyi)</option>
                                <option value="4">4 (Çok İyi)</option>
                              </select>
                            </th>
                            <th className="px-4 py-3 text-xs font-black text-neutral-500 uppercase tracking-wider text-center w-40">
                              <div className="mb-2">Sınav</div>
                              <select 
                                onChange={(e) => {
                                  handleEvaluateAll('examScore', e.target.value);
                                  e.target.value = '';
                                }}
                                defaultValue=""
                                className="w-full text-left p-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-500 outline-none focus:border-sky-500 bg-white"
                              >
                                <option value="" disabled>Tümünü Değerlendir</option>
                                <option value="1">1 (Geliştirilmeli)</option>
                                <option value="2">2 (Yeterli)</option>
                                <option value="3">3 (İyi)</option>
                                <option value="4">4 (Çok İyi)</option>
                              </select>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {students.map((student, index) => {
                            const evaluation = readingEvaluations.find(e => e.bookId === selectedEvaluationBookId && e.studentId === student.id);
                            
                            const handleScoreChange = (field: 'readingScore' | 'tellingScore' | 'writingScore' | 'examScore', value: string) => {
                              const numValue = value === '' ? null : Number(value);
                              if (numValue !== null && (numValue < 1 || numValue > 4)) return; // Basic validation
                              
                              if (onSaveEvaluation) {
                                onSaveEvaluation({
                                  id: evaluation?.id,
                                  bookId: selectedEvaluationBookId,
                                  studentId: student.id,
                                  readingScore: field === 'readingScore' ? numValue : evaluation?.readingScore ?? null,
                                  tellingScore: field === 'tellingScore' ? numValue : evaluation?.tellingScore ?? null,
                                  writingScore: field === 'writingScore' ? numValue : evaluation?.writingScore ?? null,
                                  examScore: field === 'examScore' ? numValue : evaluation?.examScore ?? null,
                                });
                              }
                            };

                            return (
                              <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="px-6 py-3 text-sm font-bold text-neutral-400 text-center">{index + 1}</td>
                                <td className="px-6 py-3 text-sm font-bold text-neutral-700">{student.name}</td>
                                <td className="px-4 py-3">
                                  <select 
                                    value={evaluation?.readingScore ?? ''}
                                    onChange={(e) => handleScoreChange('readingScore', e.target.value)}
                                    className="w-full text-left p-2 border border-neutral-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all font-medium text-sm bg-white"
                                  >
                                    <option value=""></option>
                                    <option value="1">1 (Geliştirilmeli)</option>
                                    <option value="2">2 (Yeterli)</option>
                                    <option value="3">3 (İyi)</option>
                                    <option value="4">4 (Çok İyi)</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select 
                                    value={evaluation?.tellingScore ?? ''}
                                    onChange={(e) => handleScoreChange('tellingScore', e.target.value)}
                                    className="w-full text-left p-2 border border-neutral-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all font-medium text-sm bg-white"
                                  >
                                    <option value=""></option>
                                    <option value="1">1 (Geliştirilmeli)</option>
                                    <option value="2">2 (Yeterli)</option>
                                    <option value="3">3 (İyi)</option>
                                    <option value="4">4 (Çok İyi)</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select 
                                    value={evaluation?.writingScore ?? ''}
                                    onChange={(e) => handleScoreChange('writingScore', e.target.value)}
                                    className="w-full text-left p-2 border border-neutral-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all font-medium text-sm bg-white"
                                  >
                                    <option value=""></option>
                                    <option value="1">1 (Geliştirilmeli)</option>
                                    <option value="2">2 (Yeterli)</option>
                                    <option value="3">3 (İyi)</option>
                                    <option value="4">4 (Çok İyi)</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select 
                                    value={evaluation?.examScore ?? ''}
                                    onChange={(e) => handleScoreChange('examScore', e.target.value)}
                                    className="w-full text-left p-2 border border-neutral-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all font-medium text-sm bg-white"
                                  >
                                    <option value=""></option>
                                    <option value="1">1 (Geliştirilmeli)</option>
                                    <option value="2">2 (Yeterli)</option>
                                    <option value="3">3 (İyi)</option>
                                    <option value="4">4 (Çok İyi)</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Book Modal */}
      <AnimatePresence>
        {isAssignModalOpen && selectedBookForAssign && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Öğrenciye Ata</h2>
                    <p className="text-sm text-neutral-500 font-medium mt-1">"{selectedBookForAssign.name}" kitabını bir öğrenciye verin.</p>
                  </div>
                  <button
                    onClick={() => setIsAssignModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Öğrenci Seçin</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none transition-all font-medium text-sm"
                    >
                      <option value="">Öğrenci Seçiniz...</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.studentNo} - {student.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setIsAssignModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedStudentId && onAssignBook) {
                          const student = students.find(s => s.id === selectedStudentId);
                          if (student) {
                            setIsProcessing(true);
                            try {
                              await onAssignBook(selectedBookForAssign, student.id, student.name);
                              setIsAssignModalOpen(false);
                            } finally {
                              setIsProcessing(false);
                            }
                          }
                        }
                      }}
                      disabled={!selectedStudentId || isProcessing}
                      className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'İşleniyor...' : 'Ata'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark All As Read Modal */}
      <AnimatePresence>
        {isMarkAllModalOpen && selectedBookForAssign && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMarkAllModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                      <Users size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Tüm Sınıf Okudu</h2>
                  </div>
                  <button
                    onClick={() => setIsMarkAllModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <p className="text-neutral-600 font-medium mb-8">
                  <strong className="text-neutral-900">"{selectedBookForAssign.name}"</strong> kitabını tüm sınıf okudu olarak işaretlemek istediğinize emin misiniz? Sınıftaki tüm öğrenciler için okuma kaydı oluşturulacaktır.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsMarkAllModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={async () => {
                      if (onMarkAsReadByAll) {
                        setIsProcessing(true);
                        try {
                          await onMarkAsReadByAll(selectedBookForAssign);
                          setIsMarkAllModalOpen(false);
                        } finally {
                          setIsProcessing(false);
                        }
                      }
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'İşleniyor...' : 'Evet, İşaretle'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete All Records Modal */}
      <AnimatePresence>
        {isDeleteAllRecordsModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteAllRecordsModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                       <Trash2 size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Tümünü Sil</h2>
                  </div>
                  <button
                    onClick={() => setIsDeleteAllRecordsModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <p className="text-neutral-600 font-medium mb-8">
                  Tüm okuma kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteAllRecordsModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      if (onDeleteAllReadingRecords) {
                        onDeleteAllReadingRecords();
                        setIsDeleteAllRecordsModalOpen(false);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Single Record Modal */}
      <AnimatePresence>
        {isDeleteRecordModalOpen && recordToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteRecordModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                      <Trash2 size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Kaydı Sil</h2>
                  </div>
                  <button
                    onClick={() => setIsDeleteRecordModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <p className="text-neutral-600 font-medium mb-8">
                  Bu okuma kaydını silmek istediğinize emin misiniz?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteRecordModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      if (onDeleteReadingRecord) {
                        onDeleteReadingRecord(recordToDelete.id);
                        setIsDeleteRecordModalOpen(false);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Book Modal */}
      <AnimatePresence>
        {isReturnRecordModalOpen && recordToReturn && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReturnRecordModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                      <Undo2 size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">İade Al</h2>
                  </div>
                  <button
                    onClick={() => setIsReturnRecordModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <p className="text-neutral-600 font-medium mb-8">
                  <strong className="text-neutral-900">"{recordToReturn.name}"</strong> kitabını öğrenciden geri almak istediğinize emin misiniz? Bu işlem öğrenciye yıldız kazandıracaktır.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsReturnRecordModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      if (onReturnBook) {
                        onReturnBook(recordToReturn);
                        setIsReturnRecordModalOpen(false);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Evet, İade Al
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Assignment Modal */}
      <AnimatePresence>
        {isCancelRecordModalOpen && bookToCancel && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancelRecordModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                      <Trash2 size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Atamayı İptal Et</h2>
                  </div>
                  <button
                    onClick={() => setIsCancelRecordModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <p className="text-neutral-600 font-medium mb-8">
                  <strong className="text-neutral-900">"{bookToCancel.name}"</strong> kitabının bu öğrenciye olan atamasını silmek istediğinize emin misiniz? Bu işlem öğrenciye yıldız kazandırmayacak ve kitap iade edilmiş sayılmayacaktır.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCancelRecordModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={() => {
                      if (onCancelAssignment) {
                        onCancelAssignment(bookToCancel);
                        setIsCancelRecordModalOpen(false);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
