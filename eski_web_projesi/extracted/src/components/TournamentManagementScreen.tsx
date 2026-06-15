import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  PlusCircle, 
  Search, 
  Calendar, 
  Users, 
  ChevronRight, 
  LayoutGrid, 
  List as ListIcon,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  Upload,
  Download,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Tournament } from '../App';

interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: 'Erkek' | 'Kız';
}

interface TournamentManagementScreenProps {
  students: Student[];
  tournaments: Tournament[];
  onSaveTournament: (tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteTournament: (tournamentId: string) => Promise<void>;
  onManageTournament: (tournament: Tournament) => void;
  onViewFixture: (tournament: Tournament) => void;
  activeSubTab: 'create' | 'list';
  setActiveSubTab: (tab: 'create' | 'list') => void;
}

export const TournamentManagementScreen: React.FC<TournamentManagementScreenProps> = ({
  students,
  tournaments,
  onSaveTournament,
  onDeleteTournament,
  onManageTournament,
  onViewFixture,
  activeSubTab,
  setActiveSubTab
}) => {
  const [listTab, setListTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    type: 'Eleme' as Tournament['type'],
    matchType: 'Tek Maç' as Tournament['matchType'],
    fixtureType: 'all' as Tournament['fixtureType'],
    winnerSelectionMethod: 'winner' as Tournament['winnerSelectionMethod'],
    participants: [] as string[],
    extraParticipants: [] as string[],
    groupCount: 4,
    groupNaming: 'letters' as 'letters' | 'colors',
    advancingPerGroup: 2
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [newExtraParticipant, setNewExtraParticipant] = useState('');

  React.useEffect(() => {
    if (activeSubTab === 'create' && !isInitialized && students.length > 0) {
      setTournamentForm(prev => ({
        ...prev,
        participants: students.map(s => s.id)
      }));
      setIsInitialized(true);
    }
  }, [activeSubTab, students, isInitialized]);

  const [searchTerm, setSearchTerm] = useState('');
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentNo.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const toggleParticipant = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (!tournamentForm.participants.includes(studentId)) {
      // Check if an extra participant with the same name exists
      if (tournamentForm.extraParticipants.some(p => p.toLowerCase() === student.name.toLowerCase())) {
        alert(`"${student.name}" isimli bir dış katılımcı zaten eklenmiş. Lütfen önce onu silin veya öğrenciyi seçmeyin.`);
        return;
      }
    }

    setTournamentForm(prev => ({
      ...prev,
      participants: prev.participants.includes(studentId)
        ? prev.participants.filter(id => id !== studentId)
        : [...prev.participants, studentId]
    }));
  };

  const addExtraParticipant = () => {
    const name = newExtraParticipant.trim();
    if (!name) return;
    
    // Check if name already exists in extraParticipants
    if (tournamentForm.extraParticipants.some(p => p.toLowerCase() === name.toLowerCase())) {
      alert('Bu isimde bir katılımcı zaten eklenmiş.');
      return;
    }

    // Check if name matches ANY student in the class to avoid confusion
    const studentWithName = students.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (studentWithName) {
      alert(`"${name}" isimli bir öğrenci zaten sınıf listesinde mevcut. Lütfen listeden seçin.`);
      return;
    }

    setTournamentForm(prev => ({
      ...prev,
      extraParticipants: [...prev.extraParticipants, name]
    }));
    setNewExtraParticipant('');
  };

  const removeExtraParticipant = (index: number) => {
    setTournamentForm(prev => ({
      ...prev,
      extraParticipants: prev.extraParticipants.filter((_, i) => i !== index)
    }));
  };

  const handleCreateTournament = async () => {
    const totalParticipantsCount = tournamentForm.participants.length + tournamentForm.extraParticipants.length;
    if (!tournamentForm.name) {
      alert('Lütfen turnuva adını girin.');
      return;
    }

    // Check for unique name
    const isNameDuplicate = tournaments.some(t => t.name.toLowerCase() === tournamentForm.name.toLowerCase());
    if (isNameDuplicate) {
      alert('Bu isimde bir turnuva zaten mevcut. Lütfen farklı bir isim seçin.');
      return;
    }

    if (totalParticipantsCount < 2) {
      alert('Lütfen en az 2 katılımcı seçin.');
      return;
    }

    // Combine participants: IDs for class students, names for extra ones
    // Use Set to ensure uniqueness just in case
    const allParticipants = Array.from(new Set([
      ...tournamentForm.participants,
      ...tournamentForm.extraParticipants.map(name => `extra:${name}`)
    ]));

    if (allParticipants.length < 2) {
      alert('Lütfen en az 2 benzersiz katılımcı seçin.');
      return;
    }

    await onSaveTournament({
      name: tournamentForm.name,
      description: tournamentForm.description,
      type: tournamentForm.type,
      matchType: tournamentForm.matchType,
      fixtureType: tournamentForm.fixtureType,
      winnerSelectionMethod: tournamentForm.winnerSelectionMethod,
      currentRound: 1,
      participants: allParticipants,
      status: 'Devam Ediyor',
      teacherUid: '', // Will be set in App.tsx
      ...(tournamentForm.type === 'Grup' || tournamentForm.type === 'Grup+Eleme' ? {
        groupCount: tournamentForm.groupCount,
        groupNaming: tournamentForm.groupNaming,
        ...(tournamentForm.type === 'Grup+Eleme' ? { advancingPerGroup: tournamentForm.advancingPerGroup } : {})
      } : {})
    });

    // Reset form and switch tab
    setTournamentForm({
      name: '',
      description: '',
      type: 'Eleme',
      matchType: 'Tek Maç',
      fixtureType: 'all',
      winnerSelectionMethod: 'winner',
      participants: [],
      extraParticipants: [],
      groupCount: 4,
      groupNaming: 'letters',
      advancingPerGroup: 2
    });
    setIsInitialized(false);
    setActiveSubTab('list');
  };

  const ongoingTournaments = tournaments.filter(t => t.status === 'Devam Ediyor');
  const completedTournaments = tournaments.filter(t => t.status === 'Tamamlandı');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
            <Trophy className="text-amber-500" size={24} />
            Turnuva Yönetimi
          </h1>
          <p className="text-neutral-500 font-medium text-sm mt-0.5">Sınıf içi turnuvalarınızı oluşturun ve yönetin.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'create'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <PlusCircle size={14} />
            Yeni
          </button>
          <button
            onClick={() => setActiveSubTab('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'list'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Trophy size={14} />
            Listele
          </button>
        </div>
      </div>
    </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'create' ? (
          <motion.div
            key="create-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
                <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
                  <Info className="text-indigo-500" size={20} />
                  Turnuva Bilgileri
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Turnuva Adı</label>
                    <input
                      type="text"
                      value={tournamentForm.name}
                      onChange={e => setTournamentForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Örn: Satranç Turnuvası 2024"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Açıklama (Opsiyonel)</label>
                    <textarea
                      value={tournamentForm.description}
                      onChange={e => setTournamentForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Turnuva kuralları veya detayları..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-sm resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Turnuva Modu</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Eleme', 'Lig', 'Grup', 'Grup+Eleme'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTournamentForm(prev => ({ ...prev, type: mode as any }))}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                              tournamentForm.type === mode
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(tournamentForm.type === 'Grup' || tournamentForm.type === 'Grup+Eleme') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">Grup Sayısı</label>
                            <input
                              type="number"
                              min="2"
                              max="16"
                              value={tournamentForm.groupCount}
                              onChange={e => setTournamentForm(prev => ({ ...prev, groupCount: parseInt(e.target.value) || 2 }))}
                              className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-900 bg-white text-sm"
                            />
                          </div>
                          {tournamentForm.type === 'Grup+Eleme' && (
                            <div>
                              <label className="block text-xs font-bold text-indigo-900 mb-1">Gruptan Çıkacak</label>
                              <input
                                type="number"
                                min="1"
                                max="8"
                                value={tournamentForm.advancingPerGroup}
                                onChange={e => setTournamentForm(prev => ({ ...prev, advancingPerGroup: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-900 bg-white text-sm"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-indigo-900 mb-1">Grup İsimlendirme</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setTournamentForm(prev => ({ ...prev, groupNaming: 'letters' }))}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                tournamentForm.groupNaming === 'letters'
                                  ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm'
                                  : 'border-indigo-100 bg-indigo-50/50 text-indigo-400 hover:border-indigo-200'
                              }`}
                            >
                              Harfler
                            </button>
                            <button
                              onClick={() => setTournamentForm(prev => ({ ...prev, groupNaming: 'colors' }))}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                tournamentForm.groupNaming === 'colors'
                                  ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm'
                                  : 'border-indigo-100 bg-indigo-50/50 text-indigo-400 hover:border-indigo-200'
                              }`}
                            >
                              Renkler
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Maç Tipi</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Tek Maç', 'Çift Maç'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setTournamentForm(prev => ({ ...prev, matchType: type as any }))}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                              tournamentForm.matchType === type
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(tournamentForm.type === 'Eleme' || tournamentForm.type === 'Grup+Eleme') && (
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">Fikstür Planlama</label>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            onClick={() => setTournamentForm(prev => ({ ...prev, fixtureType: 'all' }))}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all text-left ${
                              tournamentForm.fixtureType === 'all'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                            }`}
                          >
                            <div className="font-black text-xs">Tüm Fikstürü Planla</div>
                          </button>
                          <button
                            onClick={() => setTournamentForm(prev => ({ ...prev, fixtureType: 'round-by-round' }))}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all text-left ${
                              tournamentForm.fixtureType === 'round-by-round'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                            }`}
                          >
                            <div className="font-black text-xs">Her Tur Başında Kura Çek</div>
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Kazanan Belirleme</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setTournamentForm(prev => ({ ...prev, winnerSelectionMethod: 'winner' }))}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all text-left ${
                            tournamentForm.winnerSelectionMethod === 'winner'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                              : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                          }`}
                        >
                          <div className="font-black text-xs">Sadece Kazanan</div>
                        </button>
                        <button
                          onClick={() => setTournamentForm(prev => ({ ...prev, winnerSelectionMethod: 'score' }))}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all text-left ${
                            tournamentForm.winnerSelectionMethod === 'score'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                              : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                          }`}
                        >
                          <div className="font-black text-xs">Skor Gir</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                    <Users className="text-indigo-500" size={20} />
                    Katılımcılar ({tournamentForm.participants.length + tournamentForm.extraParticipants.length})
                  </h2>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Sınıf listesinde ara..."
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                  />
                </div>

                <div className="mb-4 pb-4 border-b border-neutral-100">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newExtraParticipant}
                      onChange={e => setNewExtraParticipant(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addExtraParticipant()}
                      placeholder="Yeni katılımcı adı..."
                      className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                    />
                    <button
                      onClick={addExtraParticipant}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all text-sm"
                    >
                      Ekle
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tournamentForm.extraParticipants.map((name, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 text-xs font-bold"
                      >
                        <span>{name}</span>
                        <button
                          onClick={() => removeExtraParticipant(index)}
                          className="hover:text-rose-500 transition-colors"
                        >
                          <PlusCircle size={12} className="rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => toggleParticipant(student.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        tournamentForm.participants.includes(student.id)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-neutral-100 bg-neutral-50 hover:border-neutral-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        student.gender === 'Kız' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {student.studentNo}
                      </div>
                      <span className="text-xs font-bold text-neutral-700 truncate">{student.name}</span>
                      {tournamentForm.participants.includes(student.id) && (
                        <CheckCircle2 size={14} className="text-indigo-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="space-y-4">
              <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg sticky top-4">
                <h3 className="text-md font-black mb-4 flex items-center gap-2">
                  <Trophy size={18} />
                  Turnuva Özeti
                </h3>
                
                <div className="space-y-2 mb-6 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                    <span className="text-indigo-100 font-medium">Ad</span>
                    <span className="font-bold truncate max-w-[120px]">{tournamentForm.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                    <span className="text-indigo-100 font-medium">Mod</span>
                    <span className="font-bold">{tournamentForm.type}</span>
                  </div>
                  {(tournamentForm.type === 'Grup' || tournamentForm.type === 'Grup+Eleme') && (
                    <>
                      <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                        <span className="text-indigo-100 font-medium">Grup Sayısı</span>
                        <span className="font-bold">{tournamentForm.groupCount}</span>
                      </div>
                      {tournamentForm.type === 'Grup+Eleme' && (
                        <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                          <span className="text-indigo-100 font-medium">Çıkacak</span>
                          <span className="font-bold">{tournamentForm.advancingPerGroup}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                    <span className="text-indigo-100 font-medium">Maç Tipi</span>
                    <span className="font-bold">{tournamentForm.matchType}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                    <span className="text-indigo-100 font-medium">Fikstür</span>
                    <span className="font-bold">{tournamentForm.fixtureType === 'all' ? 'Tüm Plan' : 'Tur Kurası'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                    <span className="text-indigo-100 font-medium">Kazanan</span>
                    <span className="font-bold">{tournamentForm.winnerSelectionMethod === 'winner' ? 'Seçim' : 'Skor'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-indigo-500/30">
                    <span className="text-indigo-100 font-medium">Katılımcı</span>
                    <span className="font-bold">{tournamentForm.participants.length + tournamentForm.extraParticipants.length}</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateTournament}
                  disabled={!tournamentForm.name || (tournamentForm.participants.length + tournamentForm.extraParticipants.length) < 2}
                  className="w-full bg-white text-indigo-600 py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Oluştur
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Tabs for List */}
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-neutral-100">
              <button
                onClick={() => setListTab('ongoing')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${
                  listTab === 'ongoing'
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-400 hover:bg-neutral-50'
                }`}
              >
                Devam Eden ({ongoingTournaments.length})
              </button>
              <button
                onClick={() => setListTab('completed')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${
                  listTab === 'completed'
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-400 hover:bg-neutral-50'
                }`}
              >
                Tamamlanan ({completedTournaments.length})
              </button>
            </div>

            {/* Tournament List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(listTab === 'ongoing' ? ongoingTournaments : completedTournaments).length > 0 ? (
                (listTab === 'ongoing' ? ongoingTournaments : completedTournaments).map(tournament => (
                  <motion.div
                    key={tournament.id}
                    layout
                    className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-black text-neutral-900">
                          {tournament.name}
                        </h3>
                        <div className="text-[10px] font-bold text-neutral-400">
                          {tournament.createdAt?.seconds 
                            ? new Date(tournament.createdAt.seconds * 1000).toLocaleDateString('tr-TR')
                            : new Date().toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        tournament.status === 'Devam Ediyor' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {tournament.status}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 text-neutral-400 font-bold text-xs">
                      <div className="flex items-center gap-1">
                        <Trophy size={14} />
                        {tournament.type}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        {tournament.participants.length}
                      </div>
                    </div>

                    {tournament.status === 'Tamamlandı' && tournament.winnerName && (
                      <div className="flex items-center gap-2 mb-4 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <Award size={16} className="text-amber-500" />
                        <span className="text-xs font-black text-amber-700">
                          Şampiyon: {tournament.winnerName}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setDeletingId(tournament.id)}
                        className="p-3 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all"
                        title="Turnuvayı Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      {tournament.status === 'Devam Ediyor' ? (
                        <button 
                          onClick={() => onManageTournament(tournament)}
                          className="flex-1 bg-[#0099CC] text-white py-3 rounded-lg font-black text-xs hover:bg-[#0088BB] transition-all"
                        >
                          Yönet
                        </button>
                      ) : (
                        <button 
                          onClick={() => onViewFixture(tournament)}
                          className="flex-1 bg-neutral-100 text-neutral-600 py-3 rounded-lg font-black text-xs hover:bg-neutral-200 transition-all"
                        >
                          Fikstür
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-10 flex flex-col items-center justify-center text-neutral-400 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 text-sm">
                  <Trophy size={32} className="mb-2 opacity-20" />
                  <p className="font-bold">Turnuva bulunmuyor.</p>
                </div>
              )}
            </div>
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {deletingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                  >
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Trash2 size={24} />
                    </div>
                    <h3 className="text-lg font-black text-center text-neutral-900 mb-2">Turnuvayı Sil?</h3>
                    <p className="text-neutral-500 text-center mb-6 font-medium text-sm">
                      Bu turnuvayı ve tüm maç kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex-1 py-3 rounded-xl bg-neutral-100 text-neutral-600 font-black text-sm hover:bg-neutral-200 transition-all"
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={() => {
                          onDeleteTournament(deletingId);
                          setDeletingId(null);
                        }}
                        className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                      >
                        Evet, Sil
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
