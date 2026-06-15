import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Search, User, CheckCircle2, ChevronDown, UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ParentProfileSetup = ({ 
  cities, 
  districts, 
  schools, 
  onLoadCities, 
  onLoadDistricts, 
  onLoadSchools,
  onSearchStudents,
  isLoadingCities,
  isLoadingDistricts,
  isLoadingSchools,
  linkedStudents = [], 
  savedChildren, 
  onSave, 
  onDeleteProfile 
}: any) => {
  const [children, setChildren] = useState([{ city: '', district: '', school: '', grade: '', section: '', studentNo: '', studentName: '' }]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [searchResults, setSearchResults] = useState<{ [key: number]: any[] }>({});
  const [isSearching, setIsSearching] = useState<{ [key: number]: boolean }>({});

  const gradeLevels = Array.from({ length: 12 }, (_, i) => `${i + 1}. Sınıf`);
  const sections = Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)} Şubesi`);

  const turkishToUpper = (text: string) => {
    if (!text) return '';
    return text.toLocaleUpperCase('tr-TR');
  };

  useEffect(() => {
    if (!hasInitialized) {
      if (savedChildren && savedChildren.length > 0) {
        const unique = savedChildren.filter((c: any) => c.studentName || c.studentNo);
        setChildren(unique.map((c: any) => ({
          ...c,
          city: turkishToUpper(c.city),
          district: turkishToUpper(c.district),
          school: turkishToUpper(c.school)
        })));
        setHasInitialized(true);
      } else if (linkedStudents.length > 0) {
        const mapped = linkedStudents.map((s: any) => ({
          city: turkishToUpper(s.teacherProfile?.city),
          district: turkishToUpper(s.teacherProfile?.district),
          school: turkishToUpper(s.teacherProfile?.schoolName),
          grade: s.gradeLevel || '',
          section: s.section || '',
          studentNo: s.studentNo || '',
          studentName: s.name || '',
          teacherUid: s.teacherUid || ''
        }));
        setChildren(mapped);
        setHasInitialized(true);
      }
    }
  }, [linkedStudents, savedChildren, hasInitialized]);

  const addChild = () => {
    setChildren([...children, { city: '', district: '', school: '', grade: '', section: '', studentNo: '', studentName: '' }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
    const newSearchResults = { ...searchResults };
    delete newSearchResults[index];
    setSearchResults(newSearchResults);
  };

  const updateChild = async (index: number, field: string, value: string) => {
    const newChildren = [...children];
    if (field === 'city') {
      newChildren[index] = { ...newChildren[index], city: value, district: '', school: '', newCity: '', newDistrict: '', newSchool: '' };
      if (value && value !== 'ADD_NEW') onLoadDistricts(value);
      // Clear search results for this index if city changes
      const newSearchResults = { ...searchResults };
      delete newSearchResults[index];
      setSearchResults(newSearchResults);
    } else if (field === 'district') {
      newChildren[index] = { ...newChildren[index], district: value, school: '', newDistrict: '', newSchool: '' };
      if (value && value !== 'ADD_NEW') onLoadSchools(newChildren[index].city, value);
      // Clear search results for this index if district changes
      const newSearchResults = { ...searchResults };
      delete newSearchResults[index];
      setSearchResults(newSearchResults);
    } else if (field === 'school') {
      newChildren[index] = { ...newChildren[index], school: value, newSchool: '' };
      triggerSearch(index, value, newChildren[index].grade, newChildren[index].section);
    } else if (field === 'grade') {
      newChildren[index] = { ...newChildren[index], grade: value };
      triggerSearch(index, newChildren[index].school, value, newChildren[index].section);
    } else if (field === 'section') {
      newChildren[index] = { ...newChildren[index], section: value };
      triggerSearch(index, newChildren[index].school, newChildren[index].grade, value);
    } else {
      newChildren[index] = { ...newChildren[index], [field]: value };
    }
    setChildren(newChildren);
  };

  const triggerSearch = async (index: number, school: string, grade: string, section: string) => {
    if (school && school !== 'ADD_NEW' && grade && section && onSearchStudents) {
      setIsSearching(prev => ({ ...prev, [index]: true }));
      try {
        const students = await onSearchStudents(school, grade, section);
        setSearchResults(prev => ({ ...prev, [index]: students }));
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(prev => ({ ...prev, [index]: false }));
      }
    } else {
      const newSearchResults = { ...searchResults };
      delete newSearchResults[index];
      setSearchResults(newSearchResults);
    }
  };

  const selectSuggestedStudent = (childIndex: number, student: any) => {
    const newChildren = [...children];
    newChildren[childIndex] = {
      ...newChildren[childIndex],
      grade: student.gradeLevel || '',
      section: student.section || '',
      studentNo: student.studentNo || '',
      studentName: student.name || '',
      teacherUid: student.teacherUid || '',
      studentId: student.id || ''
    };
    setChildren(newChildren);
    // Clear results after selection
    const newSearchResults = { ...searchResults };
    delete newSearchResults[childIndex];
    setSearchResults(newSearchResults);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Veli Bilgilerini Tamamla</h2>
        {linkedStudents.length > 0 && (
          <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-100">
            {linkedStudents.length} Öğrenci Otomatik Eşleşti
          </div>
        )}
      </div>
      
      <p className="text-neutral-500 text-sm font-medium -mt-4">Lütfen çocuklarınızın okul ve sınıf bilgilerini doğrulayın.</p>

      {children.map((child, index) => (
        <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200 space-y-4 relative">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-sm">
                {index + 1}
              </div>
              <h3 className="font-black text-neutral-800 uppercase tracking-wider text-sm">Çocuk Bilgileri</h3>
            </div>
            {children.length > 1 && (
              <button 
                onClick={() => removeChild(index)} 
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                title="Çocuğu Sil"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">İl</label>
              <select 
                value={child.city} 
                onFocus={onLoadCities}
                onChange={(e) => updateChild(index, 'city', e.target.value)} 
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
              >
                <option value="">{isLoadingCities ? 'Yükleniyor...' : 'İl Seçiniz'}</option>
                {cities.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr')).map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">İlçe</label>
              <select 
                value={child.district} 
                disabled={!child.city}
                onFocus={() => onLoadDistricts(child.city)}
                onChange={(e) => updateChild(index, 'district', e.target.value)} 
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium disabled:opacity-50"
              >
                <option value="">{isLoadingDistricts ? 'Yükleniyor...' : 'İlçe Seçiniz'}</option>
                {districts.filter((d: any) => d.cityName === child.city).sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr')).map((d: any) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Okul</label>
              <select 
                value={child.school} 
                disabled={!child.district}
                onFocus={() => onLoadSchools(child.city, child.district)}
                onChange={(e) => updateChild(index, 'school', e.target.value)} 
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium disabled:opacity-50"
              >
                <option value="">{isLoadingSchools ? 'Yükleniyor...' : 'Okul Seçiniz'}</option>
                <option value="ADD_NEW" className="font-bold text-indigo-600">+ Yeni Okul Ekle...</option>
                {schools.filter((s: any) => s.districtName === (child.district === 'ADD_NEW' ? child.newDistrict : child.district) && s.cityName === (child.city === 'ADD_NEW' ? child.newCity : child.city)).sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr')).map((s: any) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              {child.school === 'ADD_NEW' && (
                <input
                  type="text"
                  placeholder="Yeni Okul Adı"
                  value={child.newSchool || ''}
                  onChange={(e) => updateChild(index, 'newSchool', turkishToUpper(e.target.value))}
                  className="w-full mt-2 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
                />
              )}
            </div>

            {/* Sınıf & Şube (Only show if a valid school is selected) */}
            {child.school && child.school !== 'ADD_NEW' && !child.studentId && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Sınıf</label>
                  <select 
                    value={child.grade} 
                    onChange={(e) => updateChild(index, 'grade', e.target.value)} 
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
                  >
                    <option value="">Sınıf Seçiniz</option>
                    {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Şube</label>
                  <select 
                    value={child.section} 
                    onChange={(e) => updateChild(index, 'section', e.target.value)} 
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
                  >
                    <option value="">Şube Seçiniz</option>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Student Search Results / Suggestions */}
            {child.school && child.school !== 'ADD_NEW' && child.grade && child.section && (
              <div className="md:col-span-2 lg:col-span-3 space-y-4 pt-4 border-t border-neutral-100 mt-2">

                {!child.studentId ? (
                  // NO STUDENT SELECTED YET
                  <div className="space-y-3">
                     <div className="flex items-center gap-2 mb-2">
                         <Search size={18} className="text-indigo-600" />
                         <h4 className="text-sm font-bold text-indigo-900">Adınıza Kayıtlı Öğrenciler</h4>
                     </div>

                     {isSearching[index] ? (
                       <div className="p-6 text-center text-sm font-medium text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col items-center gap-3">
                         <div className="flex gap-1">
                           <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                           <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                           <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                         </div>
                         Sistemde adınıza tanımlı öğrenciler aranıyor...
                       </div>
                     ) : searchResults[index] && searchResults[index].length > 0 ? (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                         {searchResults[index].map((student: any) => (
                           <button
                             key={student.id}
                             type="button"
                             onClick={() => selectSuggestedStudent(index, student)}
                             className="flex items-center gap-3 p-4 bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:shadow-md rounded-xl text-left transition-all group"
                           >
                             <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                               <User size={20} className="text-indigo-600" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-black text-neutral-800 uppercase truncate group-hover:text-indigo-700 transition-colors">{student.name}</p>
                               <p className="text-[11px] font-bold text-neutral-500 truncate mt-0.5">
                                 Sınıf: {student.gradeLevel}-{student.section} • No: {student.studentNo}
                               </p>
                             </div>
                             <div className="shrink-0 flex items-center justify-center h-8 w-8 bg-indigo-600 text-white rounded-lg shadow-sm group-hover:bg-indigo-700 transition-colors">
                               <Plus size={16} />
                             </div>
                           </button>
                         ))}
                       </div>
                     ) : (
                        <div className="p-6 text-center bg-rose-50 rounded-xl border border-rose-100">
                          <UserCircle2 size={32} className="text-rose-400 mx-auto mb-2" />
                          <p className="text-sm font-bold text-rose-900 mb-1">Bu okulda adınıza kayıtlı öğrenci bulunamadı.</p>
                          <p className="text-xs font-medium text-rose-600/80 max-w-sm mx-auto leading-relaxed">
                            Öğretmeninizin öğrenciyi sisteme eklediğinden ve e-posta adresinizin doğru yazıldığından emin olun.
                          </p>
                        </div>
                     )}
                  </div>
                ) : (
                  // STUDENT IS SELECTED
                  <div className="p-4 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-between border border-indigo-500 relative overflow-hidden group">
                     {/* Decorative background */}
                     <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
                     <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
                     
                     <div className="flex items-center gap-4 relative z-10">
                         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 text-indigo-600 shadow-inner">
                            <CheckCircle2 size={24} />
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wide">{child.studentName}</h4>
                            <p className="text-xs font-bold text-indigo-100/90 mt-0.5">
                              Sınıf: {child.grade}-{child.section} • Okul No: {child.studentNo}
                            </p>
                         </div>
                     </div>
                     <button
                       type="button"
                       onClick={() => {
                         const newChildren = [...children];
                         newChildren[index] = { 
                           ...newChildren[index], 
                           studentId: '', 
                           studentName: '', 
                           studentNo: '', 
                           grade: '', 
                           section: '' 
                         };
                         setChildren(newChildren);
                       }}
                       className="relative z-10 text-[10px] font-black text-white/90 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-lg transition-colors border border-white/20 uppercase tracking-widest flex items-center gap-2"
                     >
                       <Trash2 size={14} />
                       Kaldır
                     </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}


      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button 
          onClick={addChild} 
          className="flex items-center gap-2 px-6 py-3 text-indigo-600 font-black uppercase tracking-widest text-xs hover:bg-indigo-50 rounded-2xl transition-all"
        >
          <Plus size={20} /> 
          Başka Çocuk Ekle
        </button>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onDeleteProfile && (
            <button 
              onClick={onDeleteProfile} 
              className="flex-1 sm:flex-none px-4 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-[10px] leading-tight hover:bg-rose-100 transition-all text-center"
            >
              Profil Bilgilerimi<br />Sil
            </button>
          )}
          <button 
            onClick={() => onSave(children)} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 text-center text-[10px] leading-tight"
          >
            <Save size={18} /> 
            <span>Kurulumu<br />Tamamla</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
