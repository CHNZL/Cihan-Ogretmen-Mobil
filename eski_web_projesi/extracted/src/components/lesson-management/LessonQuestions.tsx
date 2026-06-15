import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  HelpCircle, 
  Target, 
  Layers,
  CheckCircle2,
  Circle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Type as TypeIcon,
  CheckSquare,
  ArrowRightLeft,
  Search,
  Filter,
  Sparkles,
  Loader2,
  Settings,
  Eye,
  Send,
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'react-hot-toast';
import { QuestionDisplay } from '../QuestionDisplay';
import * as XLSX from 'xlsx';

interface LessonQuestionsProps {
  lessonId: string;
  lessonLabel: string;
  user: any;
  units: any[];
  outcomes: any[];
  questions: any[];
  mode?: 'admin' | 'teacher';
  grade?: string; // used for admin global saving
}

type QuestionType = 'multiple-choice' | 'true-false' | 'matching' | 'fill-in-the-blanks';

export const LessonQuestions: React.FC<LessonQuestionsProps> = ({ 
  lessonId, 
  lessonLabel,
  user, 
  units, 
  outcomes,
  questions,
  mode = 'teacher',
  grade = '1'
}) => {
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple-choice');
  const [questionText, setQuestionText] = useState('');
  const [questionCode, setQuestionCode] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>([{ left: '', right: '' }]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnitId, setFilterUnitId] = useState('all');
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [aiConfig, setAiConfig] = useState({
    unitIds: [] as string[],
    outcomeIds: [] as string[],
    types: ['multiple-choice', 'true-false', 'matching', 'fill-in-the-blanks'] as QuestionType[],
    count: 10
  });

  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    step: 'confirm' | 'success' | 'error';
    count: number;
    error?: string;
  }>({
    isOpen: false,
    step: 'confirm',
    count: 0
  });

  // Excel Bulk Operations States & Logic
  const [isExcelPanelOpen, setIsExcelPanelOpen] = useState(false);
  const [importedQuestionsPreview, setImportedQuestionsPreview] = useState<any[]>([]);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isSavingImported, setIsSavingImported] = useState(false);

  const downloadExcelTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      
      const mcWS = wb.addWorksheet("Çoktan Seçmeli");
      const tfWS = wb.addWorksheet("Doğru - Yanlış");
      const matchWS = wb.addWorksheet("Eşleştirme");
      const fillWS = wb.addWorksheet("Boşluk Doldurma");
      const guideWS = wb.addWorksheet("Kılavuz ve Kodlar");

      // Set columns
      mcWS.columns = [
        { header: "Ünite (Açılır Listeden Seçiniz)", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)", key: "outcome", width: 65 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "A Seçeneği", key: "optA", width: 22 },
        { header: "B Seçeneği", key: "optB", width: 22 },
        { header: "C Seçeneği", key: "optC", width: 22 },
        { header: "D Seçeneği", key: "optD", width: 22 },
        { header: "Doğru Cevap", key: "correct", width: 22 }
      ];

      tfWS.columns = [
        { header: "Ünite (Açılır Listeden Seçiniz)", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)", key: "outcome", width: 65 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "Doğru Cevap (Doğru / Yanlış)", key: "correct", width: 25 }
      ];

      matchWS.columns = [
        { header: "Ünite (Açılır Listeden Seçiniz)", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)", key: "outcome", width: 65 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "Sol 1", key: "l1", width: 16 },
        { header: "Sağ 1", key: "r1", width: 16 },
        { header: "Sol 2", key: "l2", width: 16 },
        { header: "Sağ 2", key: "r2", width: 16 },
        { header: "Sol 3", key: "l3", width: 16 },
        { header: "Sağ 3", key: "r3", width: 16 },
        { header: "Sol 4", key: "l4", width: 16 },
        { header: "Sağ 4", key: "r4", width: 16 }
      ];

      fillWS.columns = [
        { header: "Ünite (Açılır Listeden Seçiniz)", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)", key: "outcome", width: 65 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "Doğru Cevap", key: "correct", width: 25 }
      ];

      guideWS.columns = [
        { header: "Ünite Listesi (Açılır Liste Kaynağı)", key: "unitList", width: 35 },
        { header: "Kazanım / Öğrenme İçeriği Listesi (Açılır Liste Kaynağı)", key: "outcomeList", width: 95 }
      ];

      const sampleUnitName = units[0]?.name || "1. Ünite";
      const firstOutcome = outcomes.filter(o => o.unitId === units[0]?.id)[0] || outcomes[0];
      const gradeText = grade ? `${grade}. Sınıf` : "Sınıf";
      const sampleOutcomeName = firstOutcome 
        ? `[${gradeText} - ${units.find(u => u.id === firstOutcome.unitId)?.name || sampleUnitName}] ${firstOutcome.code || "KOD"} - ${firstOutcome.description || firstOutcome.name || ""}`
        : "Kazanım Seçiniz";

      // Add Sample Rows (in row 2)
      mcWS.addRow({
        unit: sampleUnitName,
        outcome: sampleOutcomeName,
        text: "Sözcüklerin eş anlamlısını seçiniz.",
        optA: "Eş Anlam",
        optB: "Zıt Anlam",
        optC: "Yansıma",
        optD: "Sesteş",
        correct: "Eş Anlam"
      });

      tfWS.addRow({
        unit: sampleUnitName,
        outcome: sampleOutcomeName,
        text: "Yeryüzünde en büyük su kaynağı okyanuslardır.",
        correct: "Doğru"
      });

      matchWS.addRow({
        unit: sampleUnitName,
        outcome: sampleOutcomeName,
        text: "Mevsimleri özellikleri ile eşleştiriniz.",
        l1: "Yaz", r1: "Sıcak",
        l2: "Kış", r2: "Kar",
        l3: "İlkbahar", r3: "Çiçekler",
        l4: "Sonbahar", r4: "Yapraklar"
      });

      fillWS.addRow({
        unit: sampleUnitName,
        outcome: sampleOutcomeName,
        text: "Yıldızlar geceleri gökyüzünde ______ gibi parlar.",
        correct: "ışık"
      });

      // Populate guide WS
      const uniqueUnitNames = Array.from(new Set(units.map(u => String(u.name || '').trim()).filter(Boolean)));
      
      const uniqueOutcomeNames = outcomes.map(o => {
        const u = units.find(unit => unit.id === o.unitId);
        const uName = u ? u.name : "Ünite";
        const codeVal = o.code || o.id || "KOD";
        const descText = o.description || o.name || "";
        return `[${gradeText} - ${uName}] ${codeVal} - ${descText}`;
      }).filter(Boolean);

      const maxGuideRows = Math.max(uniqueUnitNames.length, uniqueOutcomeNames.length, 10);
      for (let i = 0; i < maxGuideRows; i++) {
        guideWS.addRow({
          unitList: uniqueUnitNames[i] || "",
          outcomeList: uniqueOutcomeNames[i] || ""
        });
      }

      // Style setups
      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' } // emerald-600
      };
      const headerFont = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      const styleAndValidateWorksheet = (ws: ExcelJS.Worksheet, isTfSheet = false) => {
        // style header row
        const headerRow = ws.getRow(1);
        headerRow.height = 32;
        headerRow.eachCell((cell) => {
          cell.fill = headerFill as any;
          cell.font = headerFont;
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderStyle as any;
        });

        const uLimit = uniqueUnitNames.length > 0 ? uniqueUnitNames.length + 1 : 10;
        const oLimit = uniqueOutcomeNames.length > 0 ? uniqueOutcomeNames.length + 1 : 50;

        // Populate empty cells up to row 100 for proper borders & dropdown validation
        for (let r = 2; r <= 100; r++) {
          const row = ws.getRow(r);
          row.height = 24;

          const isEven = r % 2 === 0;
          // Emerald light zebra-stripes with perfect readability and soft tone (emerald-50 tint)
          const bgColHex = isEven ? 'FFFFFFFF' : 'FFF0FDF4'; 

          const colsCount = ws.columns.length;
          for (let c = 1; c <= colsCount; c++) {
            const cell = row.getCell(c);
            
            // Apply font and beautiful thin borders
            cell.font = {
              name: 'Segoe UI',
              size: 10,
              italic: r === 2 && (c === 1 || c === 2)
            };
            cell.border = borderStyle as any;
            cell.alignment = {
              vertical: 'middle',
              horizontal: (c === 1 || c === 2 || c === 3) ? 'left' : 'center',
              wrapText: true
            };
            
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bgColHex }
            } as any;
          }

          // Data Dropdowns (Validations) on A and B
          const cellA = ws.getCell(`A${r}`);
          cellA.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`'Kılavuz ve Kodlar'!$A$2:$A$${uLimit}`],
            showErrorMessage: true,
            errorTitle: 'Geçersiz Ünite',
            error: 'Lütfen Kılavuz listesinde bulunan veya listede tanımlı ünitelerden birini seçiniz.'
          };

          const cellB = ws.getCell(`B${r}`);
          cellB.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`'Kılavuz ve Kodlar'!$B$2:$B$${oLimit}`],
            showErrorMessage: true,
            errorTitle: 'Geçersiz Kazanım',
            error: 'Lütfen Kılavuz listesinde bulunan veya listede tanımlı kazanımlardan birini seçiniz.'
          };

          // If Doğru/Yanlış sheet, add TF validation on Doğru Cevap (Column D)
          if (isTfSheet) {
            const cellD = ws.getCell(`D${r}`);
            cellD.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"Doğru,Yanlış"'],
              showErrorMessage: true,
              errorTitle: 'Geçersiz Değer',
              error: 'Lütfen sadece Doğru veya Yanlış seçiniz.'
            };
          }
        }
      };

      // Apply styles & validation to each question type sheets
      styleAndValidateWorksheet(mcWS);
      styleAndValidateWorksheet(tfWS, true);
      styleAndValidateWorksheet(matchWS);
      styleAndValidateWorksheet(fillWS);

      // Customize the Guidelines (Kılavuz ve Kodlar) layout beautifully
      guideWS.getRow(1).height = 32;
      guideWS.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo for dropdown lists source
        } as any;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = borderStyle as any;
      });

      // Style Guidelines rows
      const totalGuideRows = guideWS.actualRowCount;
      for (let r = 2; r <= totalGuideRows; r++) {
        const row = guideWS.getRow(r);
        row.height = 22;
        const isEven = r % 2 === 0;
        const bgColHex = isEven ? 'FFFFFFFF' : 'FFF5F3FF'; // Soft purple/indigo-50 alternating row background

        for (let c = 1; c <= 2; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = borderStyle as any;
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColHex }
          } as any;
        }
      }

      // Generate the Excel build
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${lessonLabel}_Toplu_Soru_Yukleme_Sablonu.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Hücre renklendirmeleri ve açılır kutuları (Dropdown) yapılmış Excel yükleme şablonu indirildi!");
    } catch (err) {
      console.error("Template generation error:", err);
      toast.error("Şablon oluşturulurken hata meydana geldi.");
    }
  };

  const exportQuestionsToExcel = async () => {
    if (questions.length === 0) {
      toast.error("Bulunduğunuz derste dışa aktarılacak soru bulunmuyor!");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      const mcWS = wb.addWorksheet("Çoktan Seçmeli");
      const tfWS = wb.addWorksheet("Doğru - Yanlış");
      const matchWS = wb.addWorksheet("Eşleştirme");
      const fillWS = wb.addWorksheet("Boşluk Doldurma");

      mcWS.columns = [
        { header: "Soru Kodu", key: "code", width: 16 },
        { header: "Ünite Açıklaması", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği", key: "outcome", width: 48 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "A Seçeneği", key: "optA", width: 22 },
        { header: "B Seçeneği", key: "optB", width: 22 },
        { header: "C Seçeneği", key: "optC", width: 22 },
        { header: "D Seçeneği", key: "optD", width: 22 },
        { header: "Doğru Cevap", key: "correct", width: 22 }
      ];

      tfWS.columns = [
        { header: "Soru Kodu", key: "code", width: 16 },
        { header: "Ünite Açıklaması", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği", key: "outcome", width: 48 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "Doğru Cevap (Doğru / Yanlış)", key: "correct", width: 25 }
      ];

      matchWS.columns = [
        { header: "Soru Kodu", key: "code", width: 16 },
        { header: "Ünite Açıklaması", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği", key: "outcome", width: 48 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "Sol 1", key: "l1", width: 16 },
        { header: "Sağ 1", key: "r1", width: 16 },
        { header: "Sol 2", key: "l2", width: 16 },
        { header: "Sağ 2", key: "r2", width: 16 },
        { header: "Sol 3", key: "l3", width: 16 },
        { header: "Sağ 3", key: "r3", width: 16 },
        { header: "Sol 4", key: "l4", width: 16 },
        { header: "Sağ 4", key: "r4", width: 16 }
      ];

      fillWS.columns = [
        { header: "Soru Kodu", key: "code", width: 16 },
        { header: "Ünite Açıklaması", key: "unit", width: 32 },
        { header: "Kazanım / Öğrenme İçeriği", key: "outcome", width: 48 },
        { header: "Soru Metni", key: "text", width: 55 },
        { header: "Doğru Cevap", key: "correct", width: 25 }
      ];

      // Add Data Rows
      questions.forEach(q => {
        const u = units.find(unit => unit.id === q.unitId);
        const o = outcomes.find(out => out.id === q.outcomeId);

        const unitStr = u ? u.name : "";
        const outcomeStr = o ? (o.description || o.name || "") : "";

        const codeVal = q.code || "";

        if (q.type === 'multiple-choice') {
          const opts = q.options || [];
          mcWS.addRow({
            code: codeVal,
            unit: unitStr,
            outcome: outcomeStr,
            text: q.text || "",
            optA: opts[0] || "",
            optB: opts[1] || "",
            optC: opts[2] || "",
            optD: opts[3] || "",
            correct: q.correctAnswer || ""
          });
        } else if (q.type === 'true-false') {
          tfWS.addRow({
            code: codeVal,
            unit: unitStr,
            outcome: outcomeStr,
            text: q.text || "",
            correct: q.correctAnswer || ""
          });
        } else if (q.type === 'matching') {
          const pairs = q.pairs || [];
          matchWS.addRow({
            code: codeVal,
            unit: unitStr,
            outcome: outcomeStr,
            text: q.text || "",
            l1: pairs[0]?.left || "", r1: pairs[0]?.right || "",
            l2: pairs[1]?.left || "", r2: pairs[1]?.right || "",
            l3: pairs[2]?.left || "", r3: pairs[2]?.right || "",
            l4: pairs[3]?.left || "", r4: pairs[3]?.right || ""
          });
        } else if (q.type === 'fill-in-the-blanks') {
          fillWS.addRow({
            code: codeVal,
            unit: unitStr,
            outcome: outcomeStr,
            text: q.text || "",
            correct: q.correctAnswer || ""
          });
        }
      });

      // Style format configuration
      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' } // emerald-600
      };
      const headerFont = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      const styleWorksheet = (ws: ExcelJS.Worksheet) => {
        // Style header row
        const headerRow = ws.getRow(1);
        headerRow.height = 32;
        headerRow.eachCell((cell) => {
          cell.fill = headerFill as any;
          cell.font = headerFont;
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderStyle as any;
        });

        // Loop over actually filled rows to apply zebra background colors
        const rowCount = ws.actualRowCount;
        for (let r = 2; r <= rowCount; r++) {
          const row = ws.getRow(r);
          row.height = 24;

          const isEven = r % 2 === 0;
          const bgColHex = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Soft gray alternating

          row.eachCell({ includeEmpty: true }, (cell, c) => {
            cell.font = { name: 'Segoe UI', size: 10 };
            cell.border = borderStyle as any;
            cell.alignment = {
              vertical: 'middle',
              horizontal: (c >= 2 && c <= 4) ? 'left' : 'center',
              wrapText: true
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bgColHex }
            } as any;
          });
        }
      };

      // Style sheets
      styleWorksheet(mcWS);
      styleWorksheet(tfWS);
      styleWorksheet(matchWS);
      styleWorksheet(fillWS);

      // Generate the Excel build
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${lessonLabel}_Mevcut_Sorular.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Mevcut sorular başarıyla Excel olarak indirildi.");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Sorular dışa aktarılırken hata oluştu.");
    }
  };

  const processExcelFile = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const importedList: any[] = [];
        const errorsList: string[] = [];

        const findUnitAndOutcome = (unitText: string, outcomeText: string) => {
          let unitId = '';
          let outcomeId = '';

          const normalizedUnit = String(unitText || '').trim().toLowerCase();
          const normalizedOutcome = String(outcomeText || '').trim().toLowerCase();

          // Try matching unit
          let matchedUnit = units.find(u => 
            String(u.id).toLowerCase() === normalizedUnit ||
            String(u.code || '').toLowerCase() === normalizedUnit ||
            String(u.name || '').toLowerCase() === normalizedUnit
          );

          if (!matchedUnit && normalizedUnit) {
            matchedUnit = units.find(u => 
              String(u.name || '').toLowerCase().includes(normalizedUnit) ||
              normalizedUnit.includes(String(u.name || '').toLowerCase())
            );
          }

          // Fallback: If unit is not matched but outcomeText has unit name references inside brackets
          if (!matchedUnit && normalizedOutcome) {
            matchedUnit = units.find(u => 
              normalizedOutcome.includes(String(u.name || '').toLowerCase())
            );
          }

          if (matchedUnit) {
            unitId = matchedUnit.id;
            
            const unitOutcomes = outcomes.filter(o => o.unitId === unitId);
            
            // 1. Try matching by checking if the outcome string contains the outcome's exact code (e.g., "MAT.1.1.2")
            let matchedOutcome = unitOutcomes.find(o => {
              const outcomeCode = String(o.code || '').trim().toLowerCase();
              return outcomeCode && normalizedOutcome.includes(outcomeCode);
            });

            // 2. Try exact matches on ID or code or description
            if (!matchedOutcome) {
              matchedOutcome = unitOutcomes.find(o => 
                String(o.id).toLowerCase() === normalizedOutcome ||
                String(o.code || '').toLowerCase() === normalizedOutcome ||
                String(o.description || '').toLowerCase() === normalizedOutcome
              );
            }

            // 3. Try description inclusion match in either direction
            if (!matchedOutcome && normalizedOutcome) {
              matchedOutcome = unitOutcomes.find(o => 
                String(o.description || '').toLowerCase().includes(normalizedOutcome) ||
                normalizedOutcome.includes(String(o.description || '').toLowerCase())
              );
            }

            if (matchedOutcome) {
              outcomeId = matchedOutcome.id;
            } else {
              outcomeId = unitOutcomes[0]?.id || '';
            }
          } else {
            matchedUnit = units[0];
            unitId = matchedUnit?.id || '';
            
            const unitOutcomes = outcomes.filter(o => o.unitId === unitId);
            let matchedOutcome = unitOutcomes.find(o => {
              const outcomeCode = String(o.code || '').trim().toLowerCase();
              return outcomeCode && normalizedOutcome.includes(outcomeCode);
            });

            if (!matchedOutcome && normalizedOutcome) {
              matchedOutcome = unitOutcomes.find(o => 
                normalizedOutcome.includes(String(o.description || '').toLowerCase())
              );
            }

            outcomeId = matchedOutcome?.id || unitOutcomes[0]?.id || '';
          }

          return { unitId, outcomeId };
        };

        const generateAutoCode = (typePrefix: string, index: number) => {
          const randNum = Math.floor(100 + Math.random() * 900);
          return `${typePrefix}-${Date.now().toString(36).toUpperCase()}-${index + 1}-${randNum}`;
        };

        // 1. Çoktan Seçmeli Sheet
        const mcSheet = wb.Sheets["Çoktan Seçmeli"] || wb.Sheets[wb.SheetNames[0]];
        if (mcSheet) {
          const rows = XLSX.utils.sheet_to_json(mcSheet) as any[];
          rows.forEach((r, idx) => {
            const rawRow: any = {};
            Object.keys(r).forEach(k => { rawRow[k.trim()] = r[k]; });

            const questionText = String(rawRow["Soru Metni"] || "").trim();
            if (!questionText) return;

            const unitVal = String(rawRow["Ünite (Açılır Listeden Seçiniz)"] || rawRow["Ünite Kodu veya Adı"] || rawRow["Ünite"] || "").trim();
            const outcomeVal = String(rawRow["Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)"] || rawRow["Kazanım Kodu veya Adı"] || rawRow["Kazanım"] || "").trim();
            const { unitId, outcomeId } = findUnitAndOutcome(unitVal, outcomeVal);

            const optA = String(rawRow["A Seçeneği"] || "").trim();
            const optB = String(rawRow["B Seçeneği"] || "").trim();
            const optC = String(rawRow["C Seçeneği"] || "").trim();
            const optD = String(rawRow["D Seçeneği"] || "").trim();
            const optionsArray = [optA, optB, optC, optD].filter(Boolean);

            if (optionsArray.length < 2) {
              errorsList.push(`Çoktan Seçmeli (Satır ${idx + 2}): En az 2 seçenek girilmelidir.`);
              return;
            }

            let correctVal = String(rawRow["Doğru Cevap"] || "").trim();
            if (correctVal.length === 1) {
              const letterIdx = correctVal.toUpperCase().charCodeAt(0) - 65;
              if (letterIdx >= 0 && letterIdx < optionsArray.length) {
                correctVal = optionsArray[letterIdx];
              }
            }

            importedList.push({
              code: String(rawRow["Soru Kodu"] || "").trim() || generateAutoCode("CS", idx),
              type: "multiple-choice",
              text: questionText,
              unitId,
              outcomeId,
              options: optionsArray,
              correctAnswer: correctVal,
              lessonId,
              teacherUid: user?.uid || '',
              isPublished: false
            });
          });
        }

        // 2. Doğru - Yanlış Sheet
        const tfSheet = wb.Sheets["Doğru - Yanlış"] || wb.Sheets["Doğru-Yanlış"];
        if (tfSheet) {
          const rows = XLSX.utils.sheet_to_json(tfSheet) as any[];
          rows.forEach((r, idx) => {
            const rawRow: any = {};
            Object.keys(r).forEach(k => { rawRow[k.trim()] = r[k]; });

            const questionText = String(rawRow["Soru Metni"] || "").trim();
            if (!questionText) return;

            const unitVal = String(rawRow["Ünite (Açılır Listeden Seçiniz)"] || rawRow["Ünite Kodu veya Adı"] || rawRow["Ünite"] || "").trim();
            const outcomeVal = String(rawRow["Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)"] || rawRow["Kazanım Kodu veya Adı"] || rawRow["Kazanım"] || "").trim();
            const { unitId, outcomeId } = findUnitAndOutcome(unitVal, outcomeVal);

            const correctVal = String(rawRow["Doğru Cevap (Doğru / Yanlış)"] || rawRow["Doğru Cevap"] || "").trim().toLowerCase();
            let correctAnswerMapped = 'Doğru';
            if (correctVal === 'yanlış' || correctVal === 'false' || correctVal === 'y') {
              correctAnswerMapped = 'Yanlış';
            }

            importedList.push({
              code: String(rawRow["Soru Kodu"] || "").trim() || generateAutoCode("DY", idx),
              type: "true-false",
              text: questionText,
              unitId,
              outcomeId,
              correctAnswer: correctAnswerMapped,
              lessonId,
              teacherUid: user?.uid || '',
              isPublished: false
            });
          });
        }

        // 3. Eşleştirme Sheet
        const matchSheet = wb.Sheets["Eşleştirme"] || wb.Sheets["Esleştirme"];
        if (matchSheet) {
          const rows = XLSX.utils.sheet_to_json(matchSheet) as any[];
          rows.forEach((r, idx) => {
            const rawRow: any = {};
            Object.keys(r).forEach(k => { rawRow[k.trim()] = r[k]; });

            const questionText = String(rawRow["Soru Metni"] || "").trim();
            if (!questionText) return;

            const unitVal = String(rawRow["Ünite (Açılır Listeden Seçiniz)"] || rawRow["Ünite Kodu veya Adı"] || rawRow["Ünite"] || "").trim();
            const outcomeVal = String(rawRow["Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)"] || rawRow["Kazanım Kodu veya Adı"] || rawRow["Kazanım"] || "").trim();
            const { unitId, outcomeId } = findUnitAndOutcome(unitVal, outcomeVal);

            const pairsList: { left: string, right: string }[] = [];
            for (let i = 1; i <= 5; i++) {
              const leftVal = String(rawRow[`Sol ${i}`] || '').trim();
              const rightVal = String(rawRow[`Sağ ${i}`] || '').trim();
              if (leftVal && rightVal) {
                pairsList.push({ left: leftVal, right: rightVal });
              }
            }

            if (pairsList.length === 0) {
              errorsList.push(`Eşleştirme (Satır ${idx + 2}): En az 1 eşleşme çifti girilmelidir.`);
              return;
            }

            importedList.push({
              code: String(rawRow["Soru Kodu"] || "").trim() || generateAutoCode("ES", idx),
              type: "matching",
              text: questionText,
              unitId,
              outcomeId,
              pairs: pairsList,
              lessonId,
              teacherUid: user?.uid || '',
              isPublished: false
            });
          });
        }

        // 4. Boşluk Doldurma Sheet
        const fillSheet = wb.Sheets["Boşluk Doldurma"] || wb.Sheets["Boşlukdoldurma"];
        if (fillSheet) {
          const rows = XLSX.utils.sheet_to_json(fillSheet) as any[];
          rows.forEach((r, idx) => {
            const rawRow: any = {};
            Object.keys(r).forEach(k => { rawRow[k.trim()] = r[k]; });

            const questionText = String(rawRow["Soru Metni"] || "").trim();
            if (!questionText) return;

            const unitVal = String(rawRow["Ünite (Açılır Listeden Seçiniz)"] || rawRow["Ünite Kodu veya Adı"] || rawRow["Ünite"] || "").trim();
            const outcomeVal = String(rawRow["Kazanım / Öğrenme İçeriği (Açılır Listeden Seçiniz)"] || rawRow["Kazanım Kodu veya Adı"] || rawRow["Kazanım"] || "").trim();
            const { unitId, outcomeId } = findUnitAndOutcome(unitVal, outcomeVal);

            const correctVal = String(rawRow["Doğru Cevap"] || "").trim();

            importedList.push({
              code: String(rawRow["Soru Kodu"] || "").trim() || generateAutoCode("BD", idx),
              type: "fill-in-the-blanks",
              text: questionText,
              unitId,
              outcomeId,
              correctAnswer: correctVal,
              lessonId,
              teacherUid: user?.uid || '',
              isPublished: false
            });
          });
        }

        if (errorsList.length > 0) {
          alert(`Bazı satırlarda uyarılar tespit edildi:\n\n${errorsList.slice(0, 10).join('\n')}${errorsList.length > 10 ? `\n...ve ${errorsList.length - 10} adet daha hata` : ''}`);
        }

        if (importedList.length === 0) {
          toast.error("Dosyadan yüklenebilecek geçerli soru bulunamadı!");
          return;
        }

        setImportedQuestionsPreview(importedList);
        setIsImportConfirmOpen(true);
      } catch (err) {
        console.error("FileReader processing error:", err);
        toast.error("Lütfen geçerli bir Excel dosyası yükleyin.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
    e.target.value = ''; // clear
  };

  const saveImportedQuestions = async () => {
    if (!user || importedQuestionsPreview.length === 0) return;
    setIsSavingImported(true);

    try {
      const batch = writeBatch(db);
      const collectionPath = mode === 'admin' ? 'globalQuestions' : `users/${user.uid}/lessonQuestions`;

      importedQuestionsPreview.forEach(q => {
        const docRef = doc(collection(db, collectionPath));
        const qData = { ...q, createdAt: serverTimestamp() };
        if (mode === 'admin') qData.grade = grade;
        batch.set(docRef, qData);
      });

      await batch.commit();
      toast.success(`${importedQuestionsPreview.length} adet soru başarıyla yüklendi!`);
      setIsImportConfirmOpen(false);
      setImportedQuestionsPreview([]);
      setIsExcelPanelOpen(false);
    } catch (err) {
      console.error("Error saving imported questions:", err);
      toast.error("Sorular kaydedilirken bir hata oluştu.");
    } finally {
      setIsSavingImported(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!user || isGenerating) return;
    
    if (aiConfig.outcomeIds.length === 0) {
      alert("Lütfen en az bir öğrenme içeriği seçin.");
      return;
    }
    if (aiConfig.types.length === 0) {
      alert("Lütfen en az bir soru tipi seçin.");
      return;
    }
    if (aiConfig.count <= 0) {
      alert("Lütfen geçerli bir soru sayısı girin.");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: aiConfig.count });

    try {
      const apiKey = localStorage.getItem('user_gemini_api_key');
      if (!apiKey) {
        toast.error('AI kullanabilmek için Lütfen sağ üstteki Profil menüsünden (Profil ve Ayarlar) Gemini API anahtarınızı girin.');
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const selectedOutcomes = outcomes.filter(o => aiConfig.outcomeIds.includes(o.id));
      // Limit the outcomes text to prevent prompt bloat
      const outcomesText = selectedOutcomes.slice(0, 5).map(o => `${o.code || ''}: ${o.description}`).join('\n');
      const typesText = aiConfig.types.join(', ');
      
      // Get existing question texts to avoid duplicates
      const existingTexts = questions.map(q => q.text.trim().toLowerCase());
      const sessionGeneratedTexts: string[] = [];

      const batchSize = 3; 
      let remainingCount = aiConfig.count;
      let generatedTotal = 0;

      while (remainingCount > 0) {
        const currentBatchSize = Math.min(batchSize, remainingCount);
        
        // Combine existing and session texts to avoid - limit to reduce tokens
        const avoidTexts = [...existingTexts, ...sessionGeneratedTexts].slice(-10);
        const avoidPrompt = avoidTexts.length > 0 
          ? `\nÖNEMLİ: ŞU SORULARI KESİNLİKLE TEKRAR ETME (BENZERLERİNİ BİLE ÜRETME):\n${avoidTexts.join('\n')}`
          : '';

        const prompt = `
          Sen bir ilkokul öğretmeni asistanısın. "${lessonLabel}" dersi için ilkokul öğrencilerine (7-10 yaş) uygun sorular hazırlaman gerekiyor.
          
          Seçilen Öğrenme İçerikleri:
          ${outcomesText}
          
          İstekler:
           1. Tam olarak ${currentBatchSize} adet soru hazırla.
          2. Sorular SADECE şu tiplerden olmalı: ${typesText}. 
             - multiple-choice: çoktan seçmeli (KESİNLİKLE 4 seçenekli olmalı)
             - true-false: doğru/yanlış
             - matching: eşleştirme
             - fill-in-the-blanks: boşluk doldurma
          3. Her soru mutlaka yukarıdaki öğrenme içeriklerinden biriyle ilişkili olmalı.
          4. Her soruya benzersiz bir kod ver (Örn: S-${Date.now().toString().slice(-4)}-${generatedTotal + 1}).
          5. Cevapları ve seçenekleri eksiksiz belirt.
          6. Dil: Türkçe.
          7. HER SORU ÖZGÜN OLMALI, DAHA ÖNCE ÜRETİLMİŞ SORULARLA AYNI OLMAMALI.
          8. HEDEF KİTLE İLKOKUL ÖĞRENCİLERİDİR: Sorular çok kısa (maksimum 10-15 kelime), öz, net ve eğlenceli olmalıdır. Karmaşık kelimelerden, uzun cümlelerden ve kafa karıştırıcı ifadelerden KESİNLİKLE kaçın. Öğrencilerin yaş seviyesine uygun, günlük hayattan basit örnekler kullan. Tüm soruları ilkokul 1-4. sınıf seviyesinde düşün.
          ${avoidPrompt}
          
          ÖNEMLİ: 
          - outcomeId alanına öğrenme içeriğinin KODUNU (örn: HB.1.1.1) yaz.
          - matching sorularında 'pairs' dizisini doldur, 'correctAnswer' alanına "Eşleştirme" yaz.
          - fill-in-the-blanks sorularında 'correctAnswer' alanına doğru kelimeyi yaz.
          - true-false sorularında 'correctAnswer' alanına "Doğru" veya "Yanlış" yaz.
        `;

        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  text: { type: Type.STRING },
                  code: { type: Type.STRING },
                  outcomeId: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
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
                required: ["type", "text", "code", "outcomeId", "correctAnswer"]
              }
            }
          }
        });

        const rawText = response.text;
        if (!rawText) {
          throw new Error("Yapay zekadan boş yanıt döndü.");
        }

        let generatedQuestions;
        try {
          // Robust JSON parsing
          const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          generatedQuestions = JSON.parse(cleanedText);
        } catch (parseErr) {
          console.error("JSON parse error:", rawText);
          throw new Error("Yapay zeka yanıtı geçerli bir JSON formatında değil.");
        }
        
        if (!Array.isArray(generatedQuestions)) {
          generatedQuestions = [generatedQuestions];
        }

        if (generatedQuestions.length > 0) {
          const batch = writeBatch(db);
          let savedInThisBatch = 0;

          generatedQuestions.forEach((q: any) => {
            const normalizedText = q.text.trim().toLowerCase();
            
            // Final check for duplicates before saving
            const isDuplicate = existingTexts.includes(normalizedText) || 
                               sessionGeneratedTexts.includes(normalizedText);
            
            if (isDuplicate) {
              console.warn("Duplicate question detected and skipped:", q.text);
              return;
            }

            sessionGeneratedTexts.push(normalizedText);
            savedInThisBatch++;

            const matchedOutcome = selectedOutcomes.find(o => o.code === q.outcomeId) || selectedOutcomes[0];
            
            const collectionPath = mode === 'admin' ? 'globalQuestions' : `users/${user.uid}/lessonQuestions`;
            const qRef = doc(collection(db, collectionPath));
            
            const dataToSave: any = {
              ...q,
              lessonId,
              unitId: matchedOutcome.unitId,
              outcomeId: matchedOutcome.id,
              teacherUid: user.uid,
              isPublished: false,
              createdAt: serverTimestamp()
            };
            if (mode === 'admin') dataToSave.grade = grade;
            
            batch.set(qRef, dataToSave);
          });
          
          if (savedInThisBatch > 0) {
            await batch.commit();
          }
          
          generatedTotal += savedInThisBatch;
        }
        
        remainingCount -= currentBatchSize;
        setGenerationProgress(prev => ({ ...prev, current: generatedTotal }));
        
        if (remainingCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      setIsAIGenModalOpen(false);
      alert("Sorular başarıyla oluşturuldu!");
    } catch (err: any) {
      console.error("Error generating questions:", err);
      let errorMessage = "Soru oluşturulurken bir hata oluştu.";
      
      if (err.message) {
        errorMessage += `\n\nHata Detayı: ${err.message}`;
      }
      
      if (err.message?.includes("Quota exceeded")) {
        errorMessage = "Günlük yapay zeka kullanım kotanız dolmuş olabilir. Lütfen yarın tekrar deneyin.";
      } else if (err.message?.includes("API key not valid")) {
        errorMessage = "Geçersiz API anahtarı. Lütfen 'AI Ayarları' menüsünden geçerli bir API anahtarı ekleyin.";
      } else if (err.message?.includes("Safety")) {
        errorMessage = "Yapay zeka bu isteği güvenlik politikaları nedeniyle reddetti. Lütfen farklı öğrenme içerikleri deneyin.";
      }
      
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionText.trim() || !selectedOutcomeId || !user) return;
    
    try {
      const questionData: any = {
        lessonId,
        unitId: selectedUnitId,
        outcomeId: selectedOutcomeId,
        type: questionType,
        text: questionText,
        code: questionCode,
        teacherUid: user.uid,
        isPublished: false,
      };

      if (!editingQuestionId) {
        questionData.createdAt = serverTimestamp();
      }

      if (questionType === 'multiple-choice') {
        questionData.options = options;
        questionData.correctAnswer = correctAnswer;
      } else if (questionType === 'true-false') {
        questionData.correctAnswer = correctAnswer;
      } else if (questionType === 'matching') {
        questionData.pairs = pairs;
      } else if (questionType === 'fill-in-the-blanks') {
        questionData.correctAnswer = correctAnswer;
      }

      const collectionPath = mode === 'admin' ? 'globalQuestions' : `users/${user.uid}/lessonQuestions`;

      if (editingQuestionId) {
        // Use setDoc with merge: true to handle both admin direct update and teacher overrides
        await setDoc(doc(db, collectionPath, editingQuestionId), questionData, { merge: true });
      } else {
        if (mode === 'admin') questionData.grade = grade;
        await addDoc(collection(db, collectionPath), questionData);
      }
      
      // Reset form
      setQuestionText('');
      setQuestionCode('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
      setPairs([{ left: '', right: '' }]);
      setIsAddingQuestion(false);
      setEditingQuestionId(null);
    } catch (err) {
      console.error("Error saving question:", err);
    }
  };

  const handleEditQuestion = (q: any) => {
    setQuestionType(q.type);
    setQuestionText(q.text);
    setQuestionCode(q.code || '');
    setSelectedUnitId(q.unitId);
    setSelectedOutcomeId(q.outcomeId);
    
    if (q.type === 'multiple-choice') {
      setOptions(q.options || ['', '', '', '']);
      setCorrectAnswer(q.correctAnswer || '');
    } else if (q.type === 'true-false') {
      setCorrectAnswer(q.correctAnswer || '');
    } else if (q.type === 'matching') {
      setPairs(q.pairs || [{ left: '', right: '' }]);
    } else if (q.type === 'fill-in-the-blanks') {
      setCorrectAnswer(q.correctAnswer || '');
    }
    
    setEditingQuestionId(q.id);
    setIsAddingQuestion(true);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = (id: string) => {
    setDeletingQuestionId(id);
  };

  const confirmDelete = async () => {
    if (!user || !deletingQuestionId) return;
    try {
      if (mode === 'admin') {
        await deleteDoc(doc(db, 'globalQuestions', deletingQuestionId));
      } else {
        await setDoc(doc(db, `users/${user.uid}/lessonQuestions`, deletingQuestionId), { deleted: true }, { merge: true });
      }
      setDeletingQuestionId(null);
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      const collectionPath = mode === 'admin' ? 'globalQuestions' : `users/${user.uid}/lessonQuestions`;

      questions.forEach(q => {
        const docRef = doc(db, collectionPath, q.id);
        if (mode === 'admin') {
          batch.delete(docRef);
        } else {
          // For teachers, write an override to mark it deleted
          batch.set(docRef, { deleted: true }, { merge: true });
        }
      });
      
      await batch.commit();
      setIsDeleteAllModalOpen(false);
    } catch (err) {
      console.error("Error deleting all questions:", err);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnit = filterUnitId === 'all' || q.unitId === filterUnitId;
    return matchesSearch && matchesUnit;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Soru metninde ara..."
            className="w-full pl-12 pr-6 py-3 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterUnitId}
            onChange={(e) => setFilterUnitId(e.target.value)}
            className="px-4 py-3 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
          >
            <option value="all">Tüm Üniteler</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          
          <>
            <button
              onClick={() => setIsExcelPanelOpen(!isExcelPanelOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 border cursor-pointer ${
                isExcelPanelOpen
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <FileSpreadsheet size={18} />
              Excel İşlemleri
            </button>

            <button
              onClick={() => setIsAIGenModalOpen(true)}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 cursor-pointer ${
                isGenerating 
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Hazırlanıyor ({generationProgress.current}/{generationProgress.total})
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  AI Soru Hazırla
                </>
              )}
            </button>
            
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              disabled={questions.length === 0 || isGenerating}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 cursor-pointer ${
                questions.length === 0 || isGenerating
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
              title="Tüm Soruları Sil"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Tümünü Sil</span>
            </button>
          </>
        </div>
      </div>

      {/* Excel Bulk Operations Panel */}
      <AnimatePresence>
        {isExcelPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 border-2 border-emerald-100/75 p-6 rounded-3xl shadow-lg space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-neutral-900 text-lg">Excel ile Toplu Soru İşlemleri</h3>
                    <p className="text-xs text-neutral-500 font-medium">Excel formatında sorularınızı toplu olarak yükleyebilir veya mevcut sorularınızı indirebilirsiniz.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExcelPanelOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Card: Downloads */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Adım 1: Şablon veya Veriler</span>
                    <h4 className="font-bold text-neutral-800 text-base mt-2">Dışa Aktar ve Şablon</h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      Soruları yüklemek için özel şablonumuzu indirin. Soru tipleri Excel dosyasında ayrı sekmelerde gösterilmektedir.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={downloadExcelTemplate}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-black text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      <Download size={16} />
                      Yükleme Şablonu İndir
                    </button>
                    <button
                      onClick={exportQuestionsToExcel}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Download size={16} />
                      Mevcut Soruları İndir
                    </button>
                  </div>
                </div>

                {/* Right Card: Drag and Drop Upload */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Adım 2: Dosya Yükleme</span>
                    <h4 className="font-bold text-neutral-800 text-base mt-2">Excel'den Soru Yükle</h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      Hazırladığınız şablon dosyasını seçin veya bu alana sürükleyip bırakın.
                    </p>
                  </div>

                  <div className="relative">
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 hover:border-emerald-300 rounded-xl cursor-pointer hover:bg-neutral-50/50 transition-all text-center">
                      <Upload size={24} className="text-neutral-400 mb-2" />
                      <span className="text-sm font-bold text-neutral-600">İçeri Aktarmak İçin Dosya Seçin</span>
                      <span className="text-xs text-neutral-400 mt-0.5">Sadece .xlsx, .xls formatı desteklenir</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleImportExcel}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Confirmation Dialog */}
      {isImportConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
              <div className="flex items-center gap-3 text-emerald-600">
                <FileSpreadsheet size={24} />
                <h3 className="font-black text-xl">Excel'den Aktarılacak Sorular</h3>
              </div>
              <button
                onClick={() => {
                  setIsImportConfirmOpen(false);
                  setImportedQuestionsPreview([]);
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Çoktan Seçmeli", count: importedQuestionsPreview.filter(q => q.type === "multiple-choice").length, bg: "bg-blue-50 text-blue-700" },
                  { label: "Doğru - Yanlış", count: importedQuestionsPreview.filter(q => q.type === "true-false").length, bg: "bg-emerald-50 text-emerald-700" },
                    { label: "Eşleştirme", count: importedQuestionsPreview.filter(q => q.type === "matching").length, bg: "bg-purple-50 text-purple-700" },
                  { label: "Boşluk Doldurma", count: importedQuestionsPreview.filter(q => q.type === "fill-in-the-blanks").length, bg: "bg-orange-50 text-orange-700" },
                ].map((stat, i) => (
                  <div key={i} className={`p-4 rounded-2xl ${stat.bg} text-center`}>
                    <p className="text-xs font-bold opacity-85">{stat.label}</p>
                    <p className="text-2xl font-black mt-1">{stat.count}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-bold text-neutral-700 mb-2">Soru Listesi Ön İzleme ({importedQuestionsPreview.length} Soru)</h4>
                <div className="border border-neutral-100 rounded-2xl divide-y divide-neutral-100 max-h-[300px] overflow-y-auto bg-neutral-50/30">
                  {importedQuestionsPreview.map((q, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-4 hover:bg-neutral-50/50 transition-colors">
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md font-bold shrink-0 mt-0.5">
                        {q.type === 'multiple-choice' && 'ÇS'}
                        {q.type === 'true-false' && 'D/Y'}
                        {q.type === 'matching' && 'EŞ'}
                        {q.type === 'fill-in-the-blanks' && 'BD'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 line-clamp-2">{q.text}</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          Ünite: {units.find(u => u.id === q.unitId)?.name || 'Eşleşen Ünite Yok'} | 
                          Kazanım: {outcomes.find(o => o.id === q.outcomeId)?.description?.slice(0, 50) || 'Eşleşen Kazanım Yok'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50 shrink-0">
              <button
                onClick={() => {
                  setIsImportConfirmOpen(false);
                  setImportedQuestionsPreview([]);
                }}
                className="px-6 py-3 text-neutral-500 font-bold hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={saveImportedQuestions}
                disabled={isSavingImported}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black shadow-lg shadow-emerald-50 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSavingImported ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Soru Havuzuna Kaydet
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Generation Modal */}
      {isAIGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3 text-indigo-600">
                <Sparkles size={24} />
                <h3 className="font-black text-xl">Yapay Zeka ile Soru Hazırla</h3>
              </div>
              <button 
                onClick={() => setIsAIGenModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {/* Units & Outcomes Selection */}
              <div>
                <h4 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-indigo-500" />
                  Ünite ve Öğrenme İçeriği Seçimi
                </h4>
                <div className="space-y-4">
                  {units.map(unit => {
                    const unitOutcomes = outcomes.filter(o => o.unitId === unit.id);
                    if (unitOutcomes.length === 0) return null;
                    
                    const isUnitSelected = aiConfig.unitIds.includes(unit.id);
                    const isExpanded = expandedUnits.includes(unit.id);
                    
                    return (
                      <div key={unit.id} className="bg-neutral-50 rounded-2xl border border-neutral-100 overflow-hidden">
                        <div className="flex items-center justify-between p-4 hover:bg-neutral-100/50 transition-colors">
                          <label className="flex items-center gap-3 font-bold text-neutral-700 cursor-pointer flex-1">
                            <input 
                              type="checkbox"
                              checked={isUnitSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAiConfig(prev => {
                                  const newUnitIds = checked 
                                    ? [...prev.unitIds, unit.id]
                                    : prev.unitIds.filter(id => id !== unit.id);
                                  
                                  const newOutcomeIds = checked
                                    ? [...new Set([...prev.outcomeIds, ...unitOutcomes.map(o => o.id)])]
                                    : prev.outcomeIds.filter(id => !unitOutcomes.find(o => o.id === id));
                                    
                                  return { ...prev, unitIds: newUnitIds, outcomeIds: newOutcomeIds };
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded-lg border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {unit.name}
                          </label>
                          <button
                            onClick={() => {
                              setExpandedUnits(prev => 
                                prev.includes(unit.id) 
                                  ? prev.filter(id => id !== unit.id)
                                  : [...prev, unit.id]
                              );
                            }}
                            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-4"
                            >
                              <div className="pl-8 space-y-2 pt-2 border-t border-neutral-100">
                                {unitOutcomes.map(outcome => (
                                  <label key={outcome.id} className="flex items-start gap-3 text-sm font-medium text-neutral-600 cursor-pointer hover:text-indigo-600 transition-colors">
                                    <input 
                                      type="checkbox"
                                      checked={aiConfig.outcomeIds.includes(outcome.id)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setAiConfig(prev => {
                                          const newOutcomeIds = checked
                                            ? [...prev.outcomeIds, outcome.id]
                                            : prev.outcomeIds.filter(id => id !== outcome.id);
                                          
                                          // Auto-check unit if any outcome is checked
                                          const newUnitIds = newOutcomeIds.some(id => unitOutcomes.find(o => o.id === id))
                                            ? [...new Set([...prev.unitIds, unit.id])]
                                            : prev.unitIds;
                                            
                                          return { ...prev, outcomeIds: newOutcomeIds, unitIds: newUnitIds };
                                        });
                                      }}
                                      className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="flex-1">
                                      <span className="font-bold text-neutral-800 mr-2">{outcome.code}</span>
                                      {outcome.description}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {units.length === 0 && (
                    <p className="text-sm text-neutral-500 italic">Önce ünite ve öğrenme içeriği eklemelisiniz.</p>
                  )}
                </div>
              </div>

              {/* Question Types */}
              <div>
                <h4 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <HelpCircle size={18} className="text-indigo-500" />
                  Soru Tipleri
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'multiple-choice', label: 'Çoktan Seçmeli' },
                    { id: 'true-false', label: 'Doğru / Yanlış' },
                    { id: 'matching', label: 'Eşleştirme' },
                    { id: 'fill-in-the-blanks', label: 'Boşluk Doldurma' }
                  ].map(type => (
                    <label key={type.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      aiConfig.types.includes(type.id as QuestionType) 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}>
                      <input 
                        type="checkbox"
                        checked={aiConfig.types.includes(type.id as QuestionType)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAiConfig(prev => ({
                            ...prev,
                            types: checked 
                              ? [...prev.types, type.id as QuestionType]
                              : prev.types.filter(t => t !== type.id)
                          }));
                        }}
                        className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <h4 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-indigo-500" />
                  Soru Sayısı
                </h4>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    min="1"
                    max="500"
                    value={aiConfig.count}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                    className="w-32 px-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg text-center"
                  />
                  <span className="text-neutral-500 font-medium">adet soru üretilecek</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
              <button
                onClick={() => setIsAIGenModalOpen(false)}
                className="px-6 py-3 text-neutral-500 font-bold hover:bg-neutral-200 rounded-xl transition-colors"
                disabled={isGenerating}
              >
                İptal
              </button>
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating || aiConfig.outcomeIds.length === 0 || aiConfig.types.length === 0 || aiConfig.count <= 0}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Üretiliyor ({generationProgress.current}/{generationProgress.total})
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Oluşturmaya Başla
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Question Button */}
      {!isAddingQuestion ? (
        <button
          onClick={() => setIsAddingQuestion(true)}
          className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-[2rem] text-neutral-500 font-bold hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle size={20} />
          Yeni Soru Hazırla
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border-2 border-amber-100 shadow-xl space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-neutral-900">{editingQuestionId ? 'Soruyu Düzenle' : 'Yeni Soru Formu'}</h3>
            <button onClick={() => {
              setIsAddingQuestion(false);
              setEditingQuestionId(null);
            }} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unit and Outcome Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Ünite Seçimi</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setSelectedOutcomeId('');
                  }}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Ünite Seçin</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Öğrenme İçeriği Seçimi</label>
                <select
                  value={selectedOutcomeId}
                  onChange={(e) => setSelectedOutcomeId(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={!selectedUnitId}
                >
                  <option value="">Öğrenme İçeriği Seçin</option>
                  {outcomes.filter(o => o.unitId === selectedUnitId).map(o => (
                    <option key={o.id} value={o.id}>{o.code ? `[${o.code}] ` : ''}{o.description}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Type Selection */}
            <div>
              <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Soru Tipi</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'multiple-choice', label: 'Çoktan Seçmeli', icon: LayoutGrid },
                  { id: 'true-false', label: 'Doğru / Yanlış', icon: CheckSquare },
                  { id: 'matching', label: 'Eşleştirme', icon: ArrowRightLeft },
                  { id: 'fill-in-the-blanks', label: 'Boşluk Doldurma', icon: TypeIcon },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setQuestionType(type.id as QuestionType)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-bold ${
                      questionType === type.id 
                        ? 'bg-amber-50 border-amber-500 text-amber-600' 
                        : 'bg-white border-neutral-100 text-neutral-500 hover:border-neutral-200'
                    }`}
                  >
                    <type.icon size={18} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Code and Text */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Soru Kodu</label>
              <input
                type="text"
                value={questionCode}
                onChange={(e) => setQuestionCode(e.target.value)}
                placeholder="Örn: HB-001"
                className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Soru Metni</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Soru metnini buraya yazın..."
                className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 min-h-[120px] font-medium"
              />
            </div>
          </div>

          {/* Dynamic Content based on Type */}
          <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
            {questionType === 'multiple-choice' && (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Seçenekler ve Doğru Cevap</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        onClick={() => setCorrectAnswer(opt)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                          correctAnswer === opt && opt !== ''
                            ? 'bg-emerald-500 text-white shadow-lg'
                            : 'bg-white text-neutral-400 border border-neutral-200'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Seçenek ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 px-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questionType === 'true-false' && (
              <div className="flex justify-center gap-6">
                <button
                  onClick={() => setCorrectAnswer('Doğru')}
                  className={`px-8 py-4 rounded-2xl font-black text-lg transition-all ${
                    correctAnswer === 'Doğru'
                      ? 'bg-emerald-500 text-white shadow-xl scale-105'
                      : 'bg-white text-neutral-400 border border-neutral-200'
                  }`}
                >
                  DOĞRU
                </button>
                <button
                  onClick={() => setCorrectAnswer('Yanlış')}
                  className={`px-8 py-4 rounded-2xl font-black text-lg transition-all ${
                    correctAnswer === 'Yanlış'
                      ? 'bg-rose-500 text-white shadow-xl scale-105'
                      : 'bg-white text-neutral-400 border border-neutral-200'
                  }`}
                >
                  YANLIŞ
                </button>
              </div>
            )}

            {questionType === 'matching' && (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Eşleştirme Çiftleri</label>
                {pairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const newPairs = [...pairs];
                        newPairs[idx].left = e.target.value;
                        setPairs(newPairs);
                      }}
                      placeholder="Sol Taraf"
                      className="flex-1 px-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none"
                    />
                    <ArrowRightLeft className="text-neutral-300" />
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const newPairs = [...pairs];
                        newPairs[idx].right = e.target.value;
                        setPairs(newPairs);
                      }}
                      placeholder="Sağ Taraf"
                      className="flex-1 px-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none"
                    />
                    {pairs.length > 1 && (
                      <button
                        onClick={() => setPairs(pairs.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setPairs([...pairs, { left: '', right: '' }])}
                  className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline"
                >
                  <Plus size={16} /> Yeni Çift Ekle
                </button>
              </div>
            )}

            {questionType === 'fill-in-the-blanks' && (
              <div>
                <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Doğru Cevap (Boşluk)</label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="Boşluğa gelmesi gereken kelimeyi yazın"
                  className="w-full px-6 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              onClick={() => {
                setIsAddingQuestion(false);
                setEditingQuestionId(null);
              }}
              className="px-8 py-3 text-neutral-500 font-bold hover:bg-neutral-100 rounded-2xl transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleAddQuestion}
              disabled={!questionText.trim() || !selectedOutcomeId}
              className="px-10 py-3 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all disabled:opacity-50"
            >
              {editingQuestionId ? 'Değişiklikleri Kaydet' : 'Soruyu Kaydet'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Questions List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredQuestions.map((q) => (
          <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {q.code && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 uppercase tracking-wider">
                      {q.code}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    q.type === 'multiple-choice' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                    q.type === 'true-false' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    q.type === 'matching' ? 'bg-purple-50 border-purple-100 text-purple-600' :
                    'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    {q.type === 'multiple-choice' ? 'Çoktan Seçmeli' :
                     q.type === 'true-false' ? 'Doğru / Yanlış' :
                     q.type === 'matching' ? 'Eşleştirme' : 'Boşluk Doldurma'}
                  </span>
                  {q.outcomeId && (
                    <span className="px-3 py-1 bg-neutral-50 text-neutral-400 text-[10px] font-black rounded-lg border border-neutral-100 flex items-center gap-1.5 uppercase tracking-wider">
                      <Target size={12} />
                      {outcomes.find(o => o.id === q.outcomeId)?.code || 'Öğrenme İçeriği'}
                    </span>
                  )}
                </div>
                
                <h4 className="text-xl font-black text-neutral-900 mb-6 leading-tight">
                  {q.text}
                </h4>
                
                {/* Question Details Summary */}
                <div className="flex flex-wrap gap-2">
                  {q.type === 'multiple-choice' && q.options && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">
                        {q.options.length} Seçenek
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        Doğru: {q.correctAnswer}
                      </span>
                    </div>
                  )}
                  {q.type === 'true-false' && (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                      q.correctAnswer === 'Doğru' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                      Cevap: {q.correctAnswer}
                    </span>
                  )}
                  {q.type === 'matching' && q.pairs && (
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                      {q.pairs.length} Eşleşme
                    </span>
                  )}
                  {q.type === 'fill-in-the-blanks' && (
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                      Cevap: {q.correctAnswer}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setPreviewQuestion(q);
                    setPreviewAnswer(q.type === 'matching' ? {} : null);
                  }}
                  className="p-3 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                  title="Önizleme"
                >
                  <Eye size={22} />
                </button>
                <button
                  onClick={() => handleEditQuestion(q)}
                  className="p-3 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"
                  title="Düzenle"
                >
                  <Edit2 size={22} />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-3 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                  title="Sil"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 bg-neutral-50 rounded-[2rem] border-2 border-dashed border-neutral-200">
            <HelpCircle size={48} className="mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500 font-bold">Henüz soru eklenmemiş.</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewQuestion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-6 right-6 z-[110]">
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="p-3 bg-white/80 backdrop-blur-md text-neutral-500 rounded-2xl shadow-xl hover:bg-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-4">
                <QuestionDisplay
                  question={previewQuestion}
                  userAnswer={previewAnswer}
                  onAnswerChange={setPreviewAnswer}
                  hasSubmitted={false}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingQuestionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-neutral-900 mb-2">Soruyu Sil</h3>
                <p className="text-neutral-500 font-medium">
                  Bu soruyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="p-6 bg-neutral-50 flex gap-3">
                <button
                  onClick={() => setDeletingQuestionId(null)}
                  className="flex-1 py-3 text-neutral-600 font-bold hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-colors"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-800">Tüm Soruları Sil</h3>
                  <p className="text-sm text-neutral-500 font-medium mt-1">
                    Bu derse ait tüm sorular ({questions.length} adet) kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteAllQuestions}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Evet, Tümünü Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
