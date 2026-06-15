import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  FolderOpen, 
  RefreshCw, 
  Layers, 
  CheckSquare, 
  Save, 
  ChevronRight, 
  FileText, 
  FileImage, 
  ShieldCheck, 
  LogOut, 
  Check, 
  X,
  AlertCircle,
  Play,
  ArrowRight,
  Database
} from 'lucide-react';
import { db, auth, googleProvider } from '../../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { GoogleGenAI, Type } from '@google/genai';
import { extractFolderId, listSubfolders, listFiles, downloadFileAsBase64, DriveItem } from '../../lib/googleDriveService';

interface GoogleDriveImporterProps {
  user: any;
}

const GRADES = ['1', '2', '3', '4'];

const ALL_LESSONS = [
  { id: 'turkce', name: 'Türkçe', folderKeywords: ['turkce', 'turkçe', 'türkçe', 'turk'] },
  { id: 'matematik', name: 'Matematik', folderKeywords: ['matematik', 'mat', 'math'] },
  { id: 'hayat_bilgisi', name: 'Hayat Bilgisi', folderKeywords: ['hayat', 'hayat bilgisi', 'sosyal', 'hayat_bilgisi'] },
  { id: 'fen_bilimleri', name: 'Fen Bilimleri', folderKeywords: ['fen', 'fen bilimleri', 'fen_bilimleri'] },
  { id: 'ingilizce', name: 'İngilizce', folderKeywords: ['ingilizce', 'ing', 'english'] },
  { id: 'sosyal_bilgiler', name: 'Sosyal Bilgiler', folderKeywords: ['sosyal', 'sosyal bilgiler', 'sosyal_bilgiler'] },
  { id: 'insan_haklari', name: 'İnsan Hakları ve Demokrasi', folderKeywords: ['insan', 'insan haklari', 'demokrasi'] },
  { id: 'trafik_guvenligi', name: 'Trafik Güvenliği', folderKeywords: ['trafik', 'guvenlik'] },
  { id: 'din_kulturu', name: 'Din Kültürü ve Ahlak Bilgisi', folderKeywords: ['din', 'ahlak', 'din kulturu'] },
];

export const GoogleDriveImporter: React.FC<GoogleDriveImporterProps> = ({ user }) => {
  // Drive Config and Auth States
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [folderInput, setFolderInput] = useState<string>('');
  const [savedFolderId, setSavedFolderId] = useState<string>('');
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  // Directory Tree Browsing States
  const [driveGrades, setDriveGrades] = useState<DriveItem[]>([]);
  const [driveLessons, setDriveLessons] = useState<DriveItem[]>([]);
  const [driveUnits, setDriveUnits] = useState<DriveItem[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveItem[]>([]);

  const [selectedGradeFolder, setSelectedGradeFolder] = useState<DriveItem | null>(null);
  const [selectedLessonFolder, setSelectedLessonFolder] = useState<DriveItem | null>(null);
  const [selectedUnitFolder, setSelectedUnitFolder] = useState<DriveItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);

  const [isLoadingGrades, setIsLoadingGrades] = useState<boolean>(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  // Mapped Target State
  const [targetGrade, setTargetGrade] = useState<string>('3');
  const [targetLessonId, setTargetLessonId] = useState<string>('turkce');
  const [targetUnits, setTargetUnits] = useState<any[]>([]);
  const [targetOutcomes, setTargetOutcomes] = useState<any[]>([]);
  const [isLoadingTargetOutcomes, setIsLoadingTargetOutcomes] = useState<boolean>(false);

  // Question Extraction Engine States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<number[]>([]);

  // Load Saved Directory configuration
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (!user) return;
      setIsLoadingSettings(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData.questionsDriveFolderUrl) {
            setFolderInput(uData.questionsDriveFolderUrl);
            setSavedFolderId(uData.questionsDriveFolderId || extractFolderId(uData.questionsDriveFolderUrl));
          }
        }
      } catch (err) {
        console.error("Failed to load saved Drive config:", err);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSavedConfig();
  }, [user]);

  // Handle Google OAuth authorization
  const handleAuthorizeDrive = async () => {
    try {
      const driveProvider = new GoogleAuthProvider();
      driveProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
      driveProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, driveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveToken(credential.accessToken);
        setGoogleUser(result.user);
        toast.success("Google Drive yetkilendirmesi başarıyla tamamlandı!");
      } else {
        throw new Error("Erişim jetonu alınamadı.");
      }
    } catch (err: any) {
      console.error("OAuth flow failed:", err);
      toast.error(`Yetkilendirme başarısız: ${err?.message || err}`);
    }
  };

  const handleDisconnectDrive = () => {
    setDriveToken(null);
    setGoogleUser(null);
    setDriveGrades([]);
    setDriveLessons([]);
    setDriveUnits([]);
    setDriveFiles([]);
    setSelectedGradeFolder(null);
    setSelectedLessonFolder(null);
    setSelectedUnitFolder(null);
    setSelectedFile(null);
    toast.success("Google Drive bağlantısı sonlandırıldı.");
  };

  // Convert Turkish chars and search in string
  const normalizeText = (txt: string) => {
    return txt.toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');
  };

  // Safe mapping helper
  const autoDetectLessonId = (folderName: string): string => {
    const normalized = normalizeText(folderName);
    for (const s of ALL_LESSONS) {
      if (s.folderKeywords.some(keyword => normalized.includes(normalizeText(keyword)))) {
        return s.id;
      }
    }
    return 'turkce'; // default backup
  };

  // Save changes to directories setting
  const handleSaveSettings = async () => {
    if (!user) return;
    if (!folderInput.trim()) {
      toast.error("Klasör bağlantısı veya ID boş bırakılamaz.");
      return;
    }
    const folderId = extractFolderId(folderInput);
    if (!folderId) {
      toast.error("Geçersiz klasör URL / ID girildi.");
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid), {
        questionsDriveFolderUrl: folderInput,
        questionsDriveFolderId: folderId
      }, { merge: true });
      
      setSavedFolderId(folderId);
      toast.success("Google Drive kök klasör ayarları başarıyla kaydedildi!");
      
      // If connected, automatically fetch primary grades list
      if (driveToken && folderId) {
        fetchGrades(folderId);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Ayarlar sunucuya kaydedilirken hata oluştu.");
    }
  };

  // Retrieve grade level folders (sub-folders in Root)
  const fetchGrades = async (rootId: string) => {
    if (!driveToken) return;
    setIsLoadingGrades(true);
    setDriveGrades([]);
    setDriveLessons([]);
    setDriveUnits([]);
    setDriveFiles([]);
    setSelectedGradeFolder(null);
    setSelectedLessonFolder(null);
    setSelectedUnitFolder(null);
    setSelectedFile(null);

    try {
      const items = await listSubfolders(driveToken, rootId);
      const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
      setDriveGrades(sortedItems);
      if (items.length === 0) {
        toast.error("Kök soru havuzu klasörünün içinde sınıf seviyesi klasörü bulunamadı.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Kök soru havuzu klasörü okunamadı: ${err.message || err}`);
    } finally {
      setIsLoadingGrades(false);
    }
  };

  // Retrieve lesson folders (sub-folders in selected Grade folder)
  const fetchLessons = async (gradeFolderId: string) => {
    if (!driveToken) return;
    setIsLoadingLessons(true);
    setDriveLessons([]);
    setDriveUnits([]);
    setDriveFiles([]);
    setSelectedLessonFolder(null);
    setSelectedUnitFolder(null);
    setSelectedFile(null);

    try {
      const items = await listSubfolders(driveToken, gradeFolderId);
      setDriveLessons(items);
      if (items.length === 0) {
        toast.error("Sınıf klasörünün içinde ders klasörü bulunamadı.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Sınıf klasörü okunamadı: ${err.message || err}`);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  // Retrieve units folders inside Lesson folder
  const fetchUnits = async (lessonFolderId: string) => {
    if (!driveToken) return;
    setIsLoadingUnits(true);
    setDriveUnits([]);
    setDriveFiles([]);
    setSelectedUnitFolder(null);
    setSelectedFile(null);

    try {
      const items = await listSubfolders(driveToken, lessonFolderId);
      setDriveUnits(items);
    } catch (err: any) {
      console.error(err);
      toast.error(`Ders üniteleri listelenemedi: ${err.message || err}`);
    } finally {
      setIsLoadingUnits(false);
    }
  };

  // Retrieve PDF or visual assets inside Unit folder
  const fetchFiles = async (unitFolderId: string) => {
    if (!driveToken) return;
    setIsLoadingFiles(true);
    setDriveFiles([]);
    setSelectedFile(null);

    try {
      const items = await listFiles(driveToken, unitFolderId);
      setDriveFiles(items);
    } catch (err: any) {
      console.error(err);
      toast.error(`Ünite dosyaları listelenemedi: ${err.message || err}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Auto-load grades when connection established
  useEffect(() => {
    if (driveToken && savedFolderId) {
      fetchGrades(savedFolderId);
    }
  }, [driveToken, savedFolderId]);

  // Load Outcomes based on target selections
  const loadTargetOutcomes = async (grade: string, subjectId: string) => {
    setIsLoadingTargetOutcomes(true);
    setTargetUnits([]);
    setTargetOutcomes([]);
    try {
      const lessonIdStr = `lesson-${subjectId.replace(/_/g, '-')}`;
      const globalDocRef = doc(db, 'globalOutcomes', `${grade}_${subjectId}`);
      const globalSnap = await getDoc(globalDocRef);
      
      let fetchedUnits: any[] = [];
      let fetchedOutcomes: any[] = [];
      
      if (globalSnap.exists()) {
        const data = globalSnap.data();
        (data.units || []).forEach((u: any, unitIdx: number) => {
          const unitId = u.id ? `${subjectId}_${u.id}_${unitIdx}` : `u_${subjectId}_${unitIdx}`;
          const unitData = {
            id: unitId,
            name: u.name,
            order: u.order || fetchedUnits.length + 1,
            lessonId: lessonIdStr
          };
          fetchedUnits.push(unitData);
          
          (u.outcomes || []).forEach((o: any, outIdx: number) => {
            fetchedOutcomes.push({
              ...o,
              id: o.id ? `${subjectId}_${o.id}_${outIdx}` : `o_${subjectId}_${unitIdx}_${outIdx}`,
              unitId: unitData.id,
              lessonId: lessonIdStr
            });
          });
        });
      } else {
        // static data parsing
        try {
          const { OUTCOMES } = await import('../../data/outcomes');
          const SUBJECT_MAPPING: Record<string, string> = {
            'turkce': 'Türkçe',
            'matematik': 'Matematik',
            'hayat_bilgisi': 'Hayat Bilgisi',
            'fen_bilimleri': 'Fen Bilimleri',
            'ingilizce': 'İngilizce',
            'sosyal_bilgiler': 'Sosyal Bilgiler',
            'insan_haklari': 'İnsan Hakları ve Demokrasi',
            'trafik_guvenligi': 'Trafik Güvenliği',
            'din_kulturu': 'Din Kültürü ve Ahlak Bilgisi'
          };
          
          const subjectName = SUBJECT_MAPPING[subjectId] || SUBJECT_MAPPING[lessonIdStr.replace('lesson-', '')];
          const staticData = OUTCOMES[grade as keyof typeof OUTCOMES] as any;
          
          if (staticData && subjectName && staticData[subjectName]) {
            Object.entries(staticData[subjectName]).forEach(([name, outcomesArr]: [string, any], unitIdx) => {
              const unitId = `u_${subjectId}_${unitIdx}`;
              fetchedUnits.push({
                id: unitId,
                name,
                order: unitIdx + 1,
                lessonId: lessonIdStr
              });
              
              (outcomesArr as string[]).forEach((desc, outIdx) => {
                let code = '';
                let match = desc.match(/^([A-Z0-9\.]+)\s*(?::|-)?\s*(.*)$/);
                if (match && match[2]) {
                  code = match[1];
                  desc = match[2];
                }
                fetchedOutcomes.push({
                  code,
                  description: desc,
                  id: `${subjectId}_o_${unitIdx}_${outIdx}`,
                  unitId,
                  lessonId: lessonIdStr
                });
              });
            });
          }
        } catch (e) {
          console.error("Static metadata fallback failed:", e);
        }
      }
      setTargetUnits(fetchedUnits);
      setTargetOutcomes(fetchedOutcomes);
    } catch (err) {
      console.error("Failed loading target outcomes:", err);
      toast.error("Müfredat kazanımları alınırken hata oluştu.");
    } finally {
      setIsLoadingTargetOutcomes(false);
    }
  };

  // Trigger loading outcomes whenever grade or lessonId shifts
  useEffect(() => {
    loadTargetOutcomes(targetGrade, targetLessonId);
  }, [targetGrade, targetLessonId]);

  // Handle grade folder click
  const handleSelectGradeFolder = (folder: DriveItem) => {
    setSelectedGradeFolder(folder);
    
    // Auto detect target grade from folder name
    const nameOnly = folder.name.replace(/\s/g, '').toLowerCase();
    let detectedGrade: string | null = null;
    if (nameOnly.includes('1')) detectedGrade = '1';
    else if (nameOnly.includes('2')) detectedGrade = '2';
    else if (nameOnly.includes('3')) detectedGrade = '3';
    else if (nameOnly.includes('4')) detectedGrade = '4';
    else if (nameOnly.includes('bir') || nameOnly.includes('1.')) detectedGrade = '1';
    else if (nameOnly.includes('iki') || nameOnly.includes('2.')) detectedGrade = '2';
    else if (nameOnly.includes('uc') || nameOnly.includes('üç') || nameOnly.includes('3.')) detectedGrade = '3';
    else if (nameOnly.includes('dort') || nameOnly.includes('dört') || nameOnly.includes('4.')) detectedGrade = '4';
    
    if (detectedGrade) {
      setTargetGrade(detectedGrade);
      toast.success(`Sınıf otomatik olarak "${detectedGrade}. Sınıf" seçildi.`);
    }
    
    fetchLessons(folder.id);
  };

  // Handle lesson folder click
  const handleSelectLessonFolder = (folder: DriveItem) => {
    setSelectedLessonFolder(folder);
    const parsedId = autoDetectLessonId(folder.name);
    setTargetLessonId(parsedId);
    fetchUnits(folder.id);
  };

  // Handle unit folder click
  const handleSelectUnitFolder = (folder: DriveItem) => {
    setSelectedUnitFolder(folder);
    fetchFiles(folder.id);
  };

  // Process Document File using Multimodal Gemini
  const handleAnalyzeFile = async () => {
    if (!driveToken || !selectedFile) return;
    
    const apiKey = localStorage.getItem('user_gemini_api_key');
    if (!apiKey) {
      toast.error('AI kullanabilmek için lütfen sağ üstteki Profil simgenizden Profil ve Ayarlar bölümüne girip Gemini API anahtarınızı tanımlayın.');
      return;
    }

    setIsProcessing(true);
    setProcessStep('Google Drive içerisinden döküman indiriliyor...');
    setExtractedQuestions([]);
    setSelectedExtractedIndices([]);

    try {
      // 1. Download file content base64
      const fileBase64 = await downloadFileAsBase64(driveToken, selectedFile.id);
      
      setProcessStep('Yapay zeka (Gemini 3.5) dökümanı inceliyor...');

      // 2. Prepare Gemini prompt with available outcome codes to allow smart mapping list
      const extOutcomesText = targetOutcomes.map(o => `[Kazanım Kodu: ${o.code || o.id}] ${o.description}`).join('\n');
      const extUnitsText = targetUnits.map(u => `[Ünite: ${u.name}]`).join('\n');

      const systemPrompt = `
        Sen profesyonel bir ilkokul öğretmeni ve müfredat asistanısın. Görevin, sana sunulan kaynak materyalden (PDF veya Resim formatındaki çalışma sayfası ya da test kitabı sayfası) doğrudan ders sorularını tespit edip birebir çıkarmaktır.
        
        Aşağıdaki ders ve müfredat detaylarına göre doğru yapılandır:
        Ders: ${ALL_LESSONS.find(l => l.id === targetLessonId)?.name || targetLessonId}
        Sınıf: ${targetGrade}. Sınıf
        
        Mevcut Üniteler:
        ${extUnitsText}
        
        Mevcut Kazanım Listesi:
        ${extOutcomesText}

        Soru çıkarma yönergeleri:
        1. Resim veya PDF dökümandaki tüm soruları oku ve aynen çıkar.
        2. Çıkarılan soruları şu formatlardan uygun olanı şeklinde yapılandır:
           - multiple-choice: KESİNLİKLE 4 seçenekli çoktan seçmeli, eğer eksikse 4. seçeneği sen uydur, 'options' dizisine 4 seçenek yaz, 'correctAnswer' alanına doğru seçeneği yaz.
           - true-false: doğru/yanlış sorusu, 'correctAnswer' alanına "Doğru" veya "Yanlış" yaz.
           - matching: eşleştirme sorusu, 'pairs' dizesine sol ve sağ eşleşenleri yaz, 'correctAnswer' alanına "Eşleştirme" yaz.
           - fill-in-the-blanks: boşluk doldurma, 'correctAnswer' alanına doğru kelimeyi yaz.
        3. Her soru için sunulan 'Mevcut Kazanım Listesi'nden soruya en uygun kazanımı bulup 'outcomeCode' kısmına KODUNU (örn: HB.3.1.2 veya T.3.2.1) yaz. Eğer hiçbir kazanım uymuyorsa, 'outcomeCode' alanına boşluk koy ya da en yakınını seç.
        4. Soru metinlerini eksiksiz Türkçe karakterlerle ve düzgün cümleler halinde kaydet. dökümandaki soru sayılarını veya şık harflerini kaldır.
      `;

      // 3. Setup Gemini API
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: selectedFile.mimeType || 'application/pdf'
            }
          },
          {
            text: systemPrompt
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "multiple-choice, true-false, matching, fill-in-the-blanks" },
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                outcomeCode: { type: Type.STRING, description: "Mapped outcome code like HB.3.1.1" },
                pairs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      left: { type: Type.STRING },
                      right: { type: Type.STRING }
                    }
                  }
                }
              },
              required: ["type", "text", "correctAnswer"]
            }
          }
        }
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Yapay zekadan boş döküman yanıtı alındı.");
      }

      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      
      // Auto-populate mapped outcome documents locally using outcomeCode search
      const processed = parsed.map((q: any, idx: number) => {
        // Find matched outcome and unit in our pre-loaded target metadata
        const codeClean = (q.outcomeCode || '').trim().replace(/\s/g, '');
        const matchedOutcome = targetOutcomes.find(o => o.code === codeClean) || targetOutcomes[0] || null;
        
        return {
          id: `ext-${Date.now()}-${idx}`,
          type: q.type || 'multiple-choice',
          text: q.text || '',
          code: q.code || `H-DR-${Date.now().toString().slice(-4)}-${idx + 1}`,
          options: q.options || ['', '', '', ''],
          correctAnswer: q.correctAnswer || '',
          pairs: q.pairs || [{ left: '', right: '' }],
          matchedOutcomeId: matchedOutcome?.id || '',
          matchedUnitId: matchedOutcome?.unitId || targetUnits[0]?.id || '',
          outcomeCode: q.outcomeCode || matchedOutcome?.code || ''
        };
      });

      setExtractedQuestions(processed);
      // Auto-select all extracted questions initially
      setSelectedExtractedIndices(processed.map((_: any, idx: number) => idx));
      toast.success(`${processed.length} adet soru başarıyla tarandı ve analiz edildi!`);

    } catch (err: any) {
      console.error(err);
      toast.error(`Soru çıkarma başarısız oldu: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  const toggleSelectQuestion = (idx: number) => {
    if (selectedExtractedIndices.includes(idx)) {
      setSelectedExtractedIndices(selectedExtractedIndices.filter(i => i !== idx));
    } else {
      setSelectedExtractedIndices([...selectedExtractedIndices, idx]);
    }
  };

  // Modify local extracted questions parameters
  const updateExtractedQuestion = (idx: number, key: string, value: any) => {
    const updated = [...extractedQuestions];
    
    if (key === 'matchedOutcomeId') {
      const matchO = targetOutcomes.find(o => o.id === value);
      updated[idx] = {
        ...updated[idx],
        matchedOutcomeId: value,
        matchedUnitId: matchO?.unitId || updated[idx].matchedUnitId,
        outcomeCode: matchO?.code || updated[idx].outcomeCode
      };
    } else {
      updated[idx] = { ...updated[idx], [key]: value };
    }
    setExtractedQuestions(updated);
  };

  // Commit selected questions directly to Soru Havuzu (globalQuestions collection)
  const handleSaveToPool = async () => {
    if (selectedExtractedIndices.length === 0) {
      toast.error("Kaydetmek için lütfen en az bir adet soru seçin.");
      return;
    }

    const unmapped = extractedQuestions.filter((q, idx) => selectedExtractedIndices.includes(idx) && !q.matchedOutcomeId);
    if (unmapped.length > 0) {
      toast.error("Lütfen seçili olan tüm sorular için ilişkili kazanım (müfredat) seçimini gerçekleştirin.");
      return;
    }

    const confirmed = window.confirm(`${selectedExtractedIndices.length} adet soruyu ${targetGrade}. Sınıf global soru havuzuna kaydetmek istediğinizden emin misiniz?`);
    if (!confirmed) return;

    setIsProcessing(true);
    setProcessStep('Sorular veri tabanına işleniyor...');

    try {
      const lessonIdStr = `lesson-${targetLessonId.replace(/_/g, '-')}`;

      for (const idx of selectedExtractedIndices) {
        const q = extractedQuestions[idx];
        const questionData: any = {
          lessonId: lessonIdStr,
          grade: targetGrade,
          unitId: q.matchedUnitId,
          outcomeId: q.matchedOutcomeId,
          type: q.type,
          text: q.text,
          code: q.code || `S-DR-${Date.now().toString().slice(-4)}`,
          teacherUid: user.uid,
          createdAt: serverTimestamp()
        };

        if (q.type === 'multiple-choice') {
          questionData.options = q.options;
          questionData.correctAnswer = q.correctAnswer;
        } else if (q.type === 'true-false') {
          questionData.correctAnswer = q.correctAnswer;
        } else if (q.type === 'matching') {
          questionData.pairs = q.pairs;
          questionData.correctAnswer = "Eşleştirme";
        } else if (q.type === 'fill-in-the-blanks') {
          questionData.correctAnswer = q.correctAnswer;
        }

        await addDoc(collection(db, 'globalQuestions'), questionData);
      }

      toast.success(`${selectedExtractedIndices.length} adet soru başarıyla havuzuna eklendi!`);
      setExtractedQuestions([]);
      setSelectedExtractedIndices([]);
    } catch (err: any) {
      console.error(err);
      toast.error(`Sorular kaydedilemedi: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Google Auth Connection Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Cloud size={28} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Google Drive Entegrasyon Paneli</h3>
            <p className="text-neutral-500 text-sm mt-0.5 max-w-xl">
              Hazırlamış olduğunuz ders, ünite ve konu klasörlerini dilediğiniz zaman entegre edin. Gemini yapay zekası PDF ve resimleri tarayarak soru havuzunuza aktarır.
            </p>
          </div>
        </div>

        {driveToken ? (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 px-4 py-2.5 rounded-2xl">
            <ShieldCheck className="text-emerald-500" size={20} />
            <div className="text-left text-xs text-emerald-800">
              <span className="font-bold block">Bağlantı Aktif</span>
              <span className="text-neutral-500 block max-w-[140px] truncate">{googleUser?.email}</span>
            </div>
            <button 
              onClick={handleDisconnectDrive}
              className="p-1 px-2.5 ml-2 hover:bg-emerald-100 rounded-lg text-emerald-800 transition text-xs font-bold"
            >
              Kapat
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAuthorizeDrive}
            className="flex items-center gap-2.5 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold transition duration-200 text-sm"
          >
            <Cloud size={16} />
            <span>Google Drive'a Bağlan / Yetkilendir</span>
          </button>
        )}
      </div>

      {/* İzinler ve Belge Sık Sorulan Sorular / İpuçları Paneli */}
      {driveToken && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-5 space-y-3.5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle size={18} />
            <span className="font-extrabold text-sm">PNG veya PDF Dosyaları Görünmüyor mu? Görünmesi İçin Ne Yapmalısınız?</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white dark:bg-neutral-900 border border-amber-100 dark:border-neutral-800 rounded-2xl p-4 space-y-2 text-left">
              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 font-extrabold rounded-full w-5 h-5 text-[10px]">1</span>
              <h5 className="font-extrabold text-neutral-800 dark:text-neutral-200">Google Drive Kutucuğunu İşaretleyin</h5>
              <p className="text-neutral-500 leading-relaxed text-left">
                Google ile giriş yaparken karşınıza çıkan ana yetki ekranında <strong>"Google Drive'daki tüm dosyaları görüntüleme ve indirme"</strong> seçeneğinin yanındaki <strong>kutucuğu işaretlediğinizden (tik koyduğunuzdan)</strong> emin olun. Aksi taktirde Google, güvenlik nedeniyle klasör ve dosyalarınızı gizler.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-amber-100 dark:border-neutral-800 rounded-2xl p-4 space-y-2 text-left">
              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 font-extrabold rounded-full w-5 h-5 text-[10px]">2</span>
              <h5 className="font-extrabold text-neutral-800 dark:text-neutral-200">Nasıl Düzeltebilirim?</h5>
              <p className="text-neutral-500 leading-relaxed text-left">
                Eğer kutucuğu işaretlemeden giriş yaptıysanız: Yukarıdaki yeşil alandan <strong>"Kapat"</strong> butonuna basın, ardından tekrar <strong>"Google Drive'a Bağlan / Yetkilendir"</strong> butonuna basarak giriş yapın ve bu kez <strong>kutucuğu mutlaka işaretleyin</strong>.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-amber-100 dark:border-neutral-800 rounded-2xl p-4 space-y-2 text-left">
              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 font-extrabold rounded-full w-5 h-5 text-[10px]">3</span>
              <h5 className="font-extrabold text-neutral-800 dark:text-neutral-200">Dosya Paylaşım Ayarları</h5>
              <p className="text-neutral-500 leading-relaxed text-left">
                Google Drive üzerindeki ana "Soru havuzu" klasörünüzün ve içindeki tüm alt klasörlerin/dosyaların <strong>görüntüleme erişim haklarının</strong> kısıtlı olmadığından, hesabınızla erişilebilir durumda olduğundan emin olun.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ROOT Folder Path Settings */}
      {driveToken && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Database size={18} />
            <h4 className="font-bold text-neutral-800">Drive Kaynak Klasör URL'si</h4>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Soru hazırladığınız ders-ders, ünite-ünite klasörleri içeren Google Drive **Klasör Bağlantısını** buraya yapıştırıp kaydedin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="Örn: https://drive.google.com/drive/folders/1aBcDeFgHi..."
              className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            />
            <button 
              onClick={handleSaveSettings}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Kaydet
            </button>
          </div>
          {savedFolderId && (
            <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg flex items-center justify-between text-xs text-neutral-500">
              <span className="truncate">Aktif Soru Havuzu Klasör ID: <strong>{savedFolderId}</strong></span>
              <button 
                onClick={() => fetchGrades(savedFolderId)} 
                className="text-amber-600 hover:text-amber-700 font-bold ml-2 whitespace-nowrap"
              >
                Gözat / Yenile
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Dynamic Directory Picker Workspace */}
      {driveToken && savedFolderId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Column A: Sınıf Seviyesi Klasörleri */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-amber-500" /> 1. Sınıf Seviyeleri
              </span>
              {isLoadingGrades && <RefreshCw className="animate-spin text-amber-500" size={14} />}
            </div>
            
            <div className="flex-1 overflow-y-auto pt-3 space-y-1">
              {driveGrades.length > 0 ? (
                driveGrades.map(gradeFolder => (
                  <button
                    key={gradeFolder.id}
                    onClick={() => handleSelectGradeFolder(gradeFolder)}
                    className={`w-full text-left p-2.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      selectedGradeFolder?.id === gradeFolder.id
                        ? 'bg-amber-50 text-amber-700 font-bold'
                        : 'hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <span className="truncate text-left flex-1 font-bold">{gradeFolder.name}</span>
                    <ChevronRight size={14} />
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-xs">
                  <span>Sınıf klasörleri alınamadı.</span>
                  <button onClick={() => fetchGrades(savedFolderId)} className="text-amber-500 font-bold mt-2">Datarayarak Listele</button>
                </div>
              )}
            </div>
          </div>

          {/* Column B: Ders Klasörleri */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-orange-500" /> 2. Ders Klasörleri
              </span>
              {isLoadingLessons && <RefreshCw className="animate-spin text-orange-500" size={14} />}
            </div>
            
            <div className="flex-1 overflow-y-auto pt-3 space-y-1">
              {!selectedGradeFolder ? (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs text-center px-4">
                  Sol taraftan bir sınıf klasörü seçin.
                </div>
              ) : driveLessons.length > 0 ? (
                driveLessons.map(lessonFolder => (
                  <button
                    key={lessonFolder.id}
                    onClick={() => handleSelectLessonFolder(lessonFolder)}
                    className={`w-full text-left p-2.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      selectedLessonFolder?.id === lessonFolder.id
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <span className="truncate">{lessonFolder.name}</span>
                    <ChevronRight size={14} />
                  </button>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs text-center px-4">
                  Sınıf klasöründe ders klasörü bulunmadı.
                </div>
              )}
            </div>
          </div>

          {/* Column C: Ünite Klasörleri */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-sky-500" /> 3. Ünite Klasörleri
              </span>
              {isLoadingUnits && <RefreshCw className="animate-spin text-sky-500" size={14} />}
            </div>
            
            <div className="flex-1 overflow-y-auto pt-3 space-y-1">
              {!selectedLessonFolder ? (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs text-center px-4">
                  Sol taraftan bir ders klasörü seçin.
                </div>
              ) : driveUnits.length > 0 ? (
                driveUnits.map(unitFolder => (
                  <button
                    key={unitFolder.id}
                    onClick={() => handleSelectUnitFolder(unitFolder)}
                    className={`w-full text-left p-2.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      selectedUnitFolder?.id === unitFolder.id
                        ? 'bg-sky-50 text-sky-700 font-bold'
                        : 'hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <span className="truncate">{unitFolder.name}</span>
                    <ChevronRight size={14} />
                  </button>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs text-center px-4">
                  Seçilen ders klasöründe alt ünite klasörü bulunamadı.
                </div>
              )}
            </div>
          </div>

          {/* Column D: Dosya Kaynakları / PDF / Görüntü */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-500" /> 4. Soru Yaprağı Materyalleri
              </span>
              {isLoadingFiles && <RefreshCw className="animate-spin text-indigo-500" size={14} />}
            </div>
            
            <div className="flex-1 overflow-y-auto pt-3 space-y-1">
              {!selectedUnitFolder ? (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs text-center px-4">
                  Bir ünite klasörü seçin.
                </div>
              ) : driveFiles.length > 0 ? (
                driveFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left p-2.5 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                      selectedFile?.id === file.id
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    {file.mimeType === 'application/pdf' ? (
                      <FileText size={16} className="text-red-500 shrink-0" />
                    ) : (
                      <FileImage size={16} className="text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate flex-1 text-left">{file.name}</span>
                  </button>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs text-center px-4">
                  Bu ünitede uyumlu bir PDF veya resim kaynağı bulunamadı.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 4: Processing Controller / Mapping Target Confirmation */}
      {driveToken && selectedFile && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-100 gap-4">
            <div>
              <h4 className="font-black text-neutral-800 text-base">Seçilen Kaynak ve Aktarım Ayarları</h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Analiz edilecek dosya: <strong className="text-indigo-600">{selectedFile.name}</strong>
              </p>
            </div>
            
            <button 
              onClick={handleAnalyzeFile}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-2xl font-bold text-sm text-white transition flex items-center justify-center gap-2 shadow-sm ${
                isProcessing
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isProcessing ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Play size={16} />
              )}
              {isProcessing ? 'AI Analiz Ediyor...' : 'AI ile Dosyadaki Soruları Çıkar'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Hedef Sınıf</label>
              <select 
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
              >
                {GRADES.map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Yapay Zeka Hedef Dersi</label>
              <select 
                value={targetLessonId}
                onChange={(e) => setTargetLessonId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
              >
                {ALL_LESSONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <AlertCircle size={14} className="text-amber-500" />
                Ders klasörü klasör isminden otomatik maplenmiştir.
              </span>
            </div>
          </div>

          {/* Loading Progress Overlay */}
          {isProcessing && (
            <div className="bg-indigo-50/80 dark:bg-indigo-950/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="animate-spin text-indigo-600" size={32} />
              <p className="font-bold text-sm text-indigo-900">{processStep}</p>
              <span className="text-xs text-indigo-500">Bu işlem PDF boyutuna göre 15-30 saniye sürebilir, lütfen bekleyin.</span>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Extracted draft questions editor & confirmation table */}
      {extractedQuestions.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <h4 className="font-black text-neutral-800 text-lg flex items-center gap-2">
                <Database className="text-emerald-500" size={20} />
                Analiz Edilen Sorular ({extractedQuestions.length} Taslak)
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                Aşağıdaki taslak soruları kontrol edin, kazanımlarla eşleştirin ve soru havuzuna kaydetmek istediklerinizi seçin.
              </p>
            </div>
            
            <button 
              onClick={handleSaveToPool}
              disabled={isProcessing || selectedExtractedIndices.length === 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition flex items-center gap-2"
            >
              <Check size={16} />
              <span>Seçilenleri Soru Havuzuna Kaydet</span>
            </button>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {extractedQuestions.map((q, idx) => {
              const isSelected = selectedExtractedIndices.includes(idx);
              
              return (
                <div 
                  key={q.id} 
                  className={`border rounded-2xl p-5 transition-all space-y-4 ${
                    isSelected 
                      ? 'border-emerald-300 bg-emerald-50/10' 
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button 
                        onClick={() => toggleSelectQuestion(idx)}
                        className={`mt-1 p-1 rounded-lg border-2 transition ${
                          isSelected 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-neutral-300 text-transparent'
                        }`}
                      >
                        <Check size={14} />
                      </button>
                      <div className="flex-1 w-full">
                        <span className="text-xs text-neutral-400 font-mono block mb-1">SORU #{idx + 1} ({q.type})</span>
                        <textarea 
                          rows={2}
                          value={q.text}
                          onChange={(e) => updateExtractedQuestion(idx, 'text', e.target.value)}
                          className="font-bold text-sm text-neutral-800 dark:text-neutral-100 bg-transparent border-b border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 outline-none w-full pb-1 resize-y min-h-[50px] leading-relaxed block"
                          placeholder="Soru cümlesi..."
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => setExtractedQuestions(extractedQuestions.filter((_, i) => i !== idx))}
                      className="text-neutral-400 hover:text-red-500 transition p-1"
                      title="Soru Taslağını Sil"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Multiple Choice Answers Options */}
                  {q.type === 'multiple-choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                      {q.options.map((opt: string, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl border border-neutral-150">
                          <span className="font-bold text-xs text-neutral-400">{String.fromCharCode(65 + optIdx)})</span>
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[optIdx] = e.target.value;
                              updateExtractedQuestion(idx, 'options', newOpts);
                            }}
                            className="bg-transparent text-xs text-neutral-700 outline-none flex-1 font-semibold"
                          />
                        </div>
                      ))}
                      <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                        <span className="text-xs font-bold text-neutral-505">Doğru Şık / Cevap:</span>
                        <select 
                          value={q.correctAnswer}
                          onChange={(e) => updateExtractedQuestion(idx, 'correctAnswer', e.target.value)}
                          className="bg-neutral-100 border rounded-lg p-1.5 text-xs font-bold outline-none"
                        >
                          <option value="">Doğru Şıkkı Seçin</option>
                          {q.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Matching Answers Edit */}
                  {q.type === 'matching' && (
                    <div className="space-y-2 pl-8">
                      <span className="text-xs font-bold text-neutral-500">Eşleştirme Çiftleri:</span>
                      {q.pairs.map((p: any, pIdx: number) => (
                        <div key={pIdx} className="flex items-center gap-3">
                          <input 
                            type="text" 
                            value={p.left} 
                            placeholder="Sol Küme"
                            onChange={(e) => {
                              const newPairs = [...q.pairs];
                              newPairs[pIdx].left = e.target.value;
                              updateExtractedQuestion(idx, 'pairs', newPairs);
                            }}
                            className="flex-1 bg-neutral-50 p-2 rounded-xl text-xs outline-none focus:border-neutral-300 font-semibold border-2"
                          />
                          <ArrowRight size={14} className="text-neutral-400" />
                          <input 
                            type="text" 
                            value={p.right} 
                            placeholder="Sağ Küme"
                            onChange={(e) => {
                              const newPairs = [...q.pairs];
                              newPairs[pIdx].right = e.target.value;
                              updateExtractedQuestion(idx, 'pairs', newPairs);
                            }}
                            className="flex-1 bg-neutral-50 p-2 rounded-xl text-xs outline-none focus:border-neutral-300 font-semibold border-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fill in Blanks or True False */}
                  {(q.type === 'true-false' || q.type === 'fill-in-the-blanks') && (
                    <div className="flex items-center gap-2 pl-8 text-xs">
                      <span className="font-bold text-neutral-500">Doğru Cevap:</span>
                      <input 
                        type="text"
                        value={q.correctAnswer}
                        onChange={(e) => updateExtractedQuestion(idx, 'correctAnswer', e.target.value)}
                        className="bg-neutral-50 p-2 rounded-xl outline-none focus:border-neutral-300 font-bold border-2 max-w-[200px]"
                      />
                    </div>
                  )}

                  {/* Curriculum outcomes mapping dropdown */}
                  <div className="pl-8 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                      <span className="text-xs font-bold text-indigo-600 whitespace-nowrap">Kazanım / Müfredat:</span>
                      <select 
                        value={q.matchedOutcomeId}
                        onChange={(e) => updateExtractedQuestion(idx, 'matchedOutcomeId', e.target.value)}
                        className="flex-1 bg-indigo-50/50 dark:bg-neutral-800 text-xs font-semibold p-2.5 rounded-xl border border-indigo-100 outline-none max-w-lg"
                      >
                        <option value="">Lütfen İlişkili Kazanım Seçin</option>
                        {targetOutcomes.map(o => (
                          <option key={o.id} value={o.id}>{o.code ? `[${o.code}] ` : ''}{o.description}</option>
                        ))}
                      </select>
                    </div>

                    {q.outcomeCode && (
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                        AI Eşleşme Önerisi: <strong className="text-neutral-600">{q.outcomeCode}</strong>
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
