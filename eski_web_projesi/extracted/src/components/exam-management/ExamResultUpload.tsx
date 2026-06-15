import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Save, X, Loader2, AlertTriangle, Camera } from 'lucide-react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { GoogleGenAI, Type } from '@google/genai';
import { toast } from 'react-hot-toast';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { applyAdaptiveThreshold } from '../../lib/image-processing';

interface ExamResultUploadProps {
  exam: any;
  students: any[];
  user: any;
  onClose: () => void;
}

export const ExamResultUpload: React.FC<ExamResultUploadProps> = ({ exam, students, user, onClose }) => {
  const [images, setImages] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Crop States ---
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentCropIndex, setCurrentCropIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 90, height: 40, x: 5, y: 30 });
  const [croppingImgSrc, setCroppingImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  const [autoCaptureStatus, setAutoCaptureStatus] = useState<'searching' | 'focusing' | 'captured'>('searching');
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const calculateSharpness = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Simple edge detection (Laplacian variance approximation)
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Check contrast and edge variations in a grid to be fast
    let sumVar = 0;
    let validPoints = 0;
    
    // Sample every 8th pixel to be fast
    for (let y = 1; y < height - 1; y += 8) {
      for (let x = 1; x < width - 1; x += 8) {
        const idx = (y * width + x) * 4;
        const cur = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        
        const rightIdx = (y * width + (x + 1)) * 4;
        const right = data[rightIdx] * 0.299 + data[rightIdx + 1] * 0.587 + data[rightIdx + 2] * 0.114;
        
        const bottomIdx = ((y + 1) * width + x) * 4;
        const bottom = data[bottomIdx] * 0.299 + data[bottomIdx + 1] * 0.587 + data[bottomIdx + 2] * 0.114;
        
        const edge = Math.abs(cur - right) + Math.abs(cur - bottom);
        if (edge > 20) { // arbitrary edge threshold
          sumVar += edge;
          validPoints++;
        }
      }
    }
    
    return validPoints > 0 ? (sumVar / validPoints) : 0;
  };

  const startAutoCaptureLoop = () => {
    if (!videoRef.current) return;
    
    const analyzeFrame = () => {
      if (!isCameraOpen || !videoRef.current) return;
      
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA && autoCaptureStatus !== 'captured') {
        const canvas = document.createElement('canvas');
        // Analyze a smaller central crop for speed
        const analyzeW = 200;
        const analyzeH = 100;
        canvas.width = analyzeW;
        canvas.height = analyzeH;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, (video.videoWidth - analyzeW) / 2, (video.videoHeight - analyzeH) / 2, analyzeW, analyzeH, 0, 0, analyzeW, analyzeH);
          const sharpness = calculateSharpness(ctx, analyzeW, analyzeH);
          
          if (sharpness > 40) { // Focused!
            if (autoCaptureStatus === 'searching') {
              setAutoCaptureStatus('focusing');
              if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
              captureTimeoutRef.current = setTimeout(() => {
                capturePhoto();
                setAutoCaptureStatus('captured');
                // Reset after 2 seconds
                setTimeout(() => setAutoCaptureStatus('searching'), 2000);
              }, 600); // Wait 0.6s to ensure stability
            }
          } else {
            setAutoCaptureStatus('searching');
            if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };
    
    analyzeFrame();
  };

  useEffect(() => {
    if (isCameraOpen) {
      // Small delay to allow camera initialization
      setTimeout(startAutoCaptureLoop, 1000);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    }
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    };
  }, []);

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 },
          // @ts-ignore: advanced is not fully typed
          advanced: [{ focusMode: "continuous" }] 
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Optionally wait for video to play before showing
        await videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      alert("Kamera açılamadı. Lütfen izinleri kontrol edin.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const closeCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      
      const canvas = document.createElement('canvas');
      
      // Optik form alanı (Video'nun ortasında, genişliğin %95'i, yüksekliğin %45'i)
      const cropWidth = vWidth * 0.95; 
      const cropHeight = vHeight * 0.45;
      const startX = (vWidth - cropWidth) / 2;
      const startY = (vHeight - cropHeight) / 2;

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // İlk aşama: Çizim ve basit kontrast (isteğe bağlı ama faydalı olabilir)
        ctx.filter = 'contrast(1.2)';
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
        // İkinci aşama: Adaptive Thresholding (Uyarlamalı Eşikleme) 
        // Bu işlem kağıdın farklı yerlerindeki ışık dengesizliklerini ortadan kaldırır
        applyAdaptiveThreshold(canvas);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `Kamera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImages(prev => [...prev, file]);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  const loadFileForCropping = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => setCroppingImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      setPendingFiles(files);
      setCurrentCropIndex(0);
      loadFileForCropping(files[0]);
    }
  };

  const skipCroppingAll = () => {
    setImages(prev => [...prev, ...pendingFiles]);
    setPendingFiles([]);
    setCroppingImgSrc('');
  };

  const handleNextCrop = async () => {
    if (imgRef.current && completedCrop?.width && completedCrop?.height) {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High res canvas
        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;
        
        ctx.filter = 'contrast(1.2)';
        ctx.drawImage(
          imgRef.current,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY
        );

        applyAdaptiveThreshold(canvas);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        if (blob) {
          const croppedFile = new File([blob], `Cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setImages(prev => [...prev, croppedFile]);
        }
      }
    } else {
      // Fallback
      setImages(prev => [...prev, pendingFiles[currentCropIndex]]);
    }

    if (currentCropIndex < pendingFiles.length - 1) {
      setCurrentCropIndex(prev => prev + 1);
      loadFileForCropping(pendingFiles[currentCropIndex + 1]);
    } else {
      setPendingFiles([]);
      setCroppingImgSrc('');
    }
  };

  const processImages = async () => {
    if (images.length === 0) {
      alert('Lütfen önce sınav kâğıdı görsellerini yükleyin.');
      return;
    }
    
    const apiKey = localStorage.getItem('user_gemini_api_key');
    if (!apiKey) {
      toast.error('AI ile okuma yapabilmek için lütfen önce Profil menüsünden (Profil ve Ayarlar) Gemini API anahtarınızı girin.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Görseller hazırlanıyor...');
    const ai = new GoogleGenAI({ apiKey });

    try {
      const processedResults: any[] = [];
      let totalErrors = 0;
      let quotaHit = false;

      const answerKey = exam.questions.map((q: any, idx: number) => ({
        questionNumber: idx + 1,
        correctAnswer: q.correctAnswer,
        options: q.options
      }));

      // Helper to compress and convert file to base64 generative part
      const fileToGenerativePart = async (file: File) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            
            // Resize logic (max 1200px)
            let width = img.width;
            let height = img.height;
            const MAX_DIMENSION = 1200;
            
            if (width > height && width > MAX_DIMENSION) {
                height *= MAX_DIMENSION / width;
                width = MAX_DIMENSION;
            } else if (height > MAX_DIMENSION) {
                width *= MAX_DIMENSION / height;
                height = MAX_DIMENSION;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Canvas error');
            
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1];
            
            resolve({
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            });
          };
          img.onerror = () => reject('Image load error');
          img.src = objectUrl;
        });
      };

      for (let i = 0; i < images.length; i++) {
        setProcessingStatus(`Analiz ediliyor (${i + 1}/${images.length})...`);
        const image = images[i];
        
        // Minor delay to respect API rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        let retries = 3;
        let success = false;

        while (retries > 0 && !success && !quotaHit) {
          try {
            const imagePart = await fileToGenerativePart(image);
            
            const studentListStr = students.map(s => `${s.studentNo} - ${s.name}`).join('\n');
            const prompt = `Görevin ekteki görseli (bu bir sınav kağıdının tamamı VEYA sadece kırpılmış bir "optik form alt bilgisi" olabilir) son derece yüksek bir hassasiyetle okumaktır. 

ÖNEMLİ KURALLAR:
1. Görselde yer alan "AD SOYAD" ve "OKUL NO" bilgilerini bul. Eğer görsel sadece bir optik form alt bilgisinden ibaretse, isim ve numara orada (kutu içinde) bulunmaktadır. Bulduğun bu bilgiyi SADECE VE SADECE aşağıdaki Sınıf Listesi ile eşleştir! İsimleri ve numaraları harfiyen eşleştirmeye çalış (bozuk el yazısı olabilir, kelime/numara benzerliğine dikkat et).
   -- SINIF LİSTESİ --
   ${studentListStr}
   -------------------
2. Aşağıda sana bu sınavın tüm soruları, şıkları ve doğru cevapları verilmiştir. (Not: Görsel SADECE alt kısımdaki optik form veya kodlama alanından ibaret olabilir. Tüm soruları optik kısımdaki kodlamadan eşleştir).
3. Çocuğun her soru için İŞARETLEDİĞİ ŞIKKI (A, B, C veya D) belirle. DİKKAT: Kağıdın altındaki YATAY OPTİK KODLAMA BÖLÜMÜNÜ (1. (A) (B) (C) (D) vs.) BİRİNCİL KAYNAK olarak kullan. O kodlamadaki içleri karalanmış yuvarlaklar (baloncuklar) çocuğun esas cevaplarıdır.
4. Çocuğun işaretlediği şıkkı (givenAnswer) bul, silik/yanlışlıkla yapılmış işaretler yerine KASITLI karalanmış koyu işaretleri seç.
5. Görsel telefon kamerasından kırpıldığı için yüksek kontrastlı siyah beyaz, soluk veya asimetrik olabilir, optik baloncukları sırasıyla eşleştirirken tüm yeteneklerini kullan.

Sınav Soru, Şık ve Cevap Anahtarları:
${JSON.stringify(answerKey, null, 2)}
`;

            const result = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: { parts: [imagePart as any, { text: prompt }] },
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    detectedStudentNo: { type: Type.STRING, description: "Kağıdın üzerinden okunan ismin Sınıf Listesindeki okul numarası eşleşmesi. Bulamadıysan boş bırak." },
                    detectedStudentName: { type: Type.STRING, description: "Kağıdın üzerinden okunan ve Sınıf Listesinden eşleştirilen tam öğrenci adı ve soyadı." },
                    answers: {
                      type: Type.ARRAY,
                      description: "Sınavdaki tüm sorular için sırasıyla değerlendirmeler",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          questionNumber: { type: Type.INTEGER, description: "Soru numarası (1, 2, 3...)" },
                          givenAnswer: { type: Type.STRING, description: "Öğrencinin işaretlediği şık (A, B, C, D vb.). Hiç işaretlemediyse boş metin veya null döndür." },
                          isCorrect: { type: Type.BOOLEAN, description: "Öğrencinin işareti ile doğru cevap uyuşuyorsa true, aksi halde false." }
                        },
                        required: ["questionNumber", "isCorrect"]
                      }
                    }
                  },
                  required: ["detectedStudentName", "answers"]
                },
                systemInstruction: "Sen dünyanın en zeki ve en yetenekli sınav kağıdı / optik form okuyucu asistanısın. El yazısına, öğrenci karalamalarına ve silinmiş izlere dikkat ederek öğrencilerin kesin cevaplarını yüksek hassasiyetle tespit edersin.",
                temperature: 0.0
              }
            });

            const responseText = result.text;
            if (!responseText) {
              success = true;
              continue;
            }

            let aiData = null;
            try {
              aiData = JSON.parse(responseText.trim());
            } catch (parseError) {
              console.error("OCR Parse Error:", parseError, responseText);
              throw new Error("ParseFailed");
            }

            let matchedStudent = null;
            if (aiData.detectedStudentNo) {
              matchedStudent = students.find(s => s.studentNo === aiData.detectedStudentNo);
            }
            if (!matchedStudent && aiData.detectedStudentName) {
              matchedStudent = students.find(s => 
                s.name.toLocaleLowerCase('tr').includes(aiData.detectedStudentName.toLocaleLowerCase('tr')) ||
                aiData.detectedStudentName.toLocaleLowerCase('tr').includes(s.name.toLocaleLowerCase('tr'))
              );
            }

            if (!matchedStudent) {
              const alreadyAssignedIds = processedResults.map(r => r.studentId);
              matchedStudent = students.find(s => !alreadyAssignedIds.includes(s.id));
            }

            if (matchedStudent) {
              const answersMap: Record<number, any> = {};
              let totalScore = 0;
              
              const pointsPerQuestion = 100 / exam.questions.length;
              aiData.answers.forEach((ans: any, idx: number) => {
                const qIdx = (typeof ans.questionNumber === 'number' && ans.questionNumber > 0) ? ans.questionNumber - 1 : idx;
                const isCor = ans.isCorrect === true;
                answersMap[qIdx] = {
                  isCorrect: isCor,
                  points: isCor ? pointsPerQuestion : 0,
                  givenAnswer: ans.givenAnswer || null
                };
                if (isCor) totalScore += pointsPerQuestion;
              });

              totalScore = Math.round(totalScore);

              const existingIdx = processedResults.findIndex(r => r.studentId === matchedStudent!.id);
              if (existingIdx !== -1) {
                processedResults[existingIdx] = {
                  studentId: matchedStudent.id,
                  studentName: matchedStudent.name,
                  score: Math.min(100, totalScore),
                  answers: answersMap
                };
              } else {
                processedResults.push({
                  studentId: matchedStudent.id,
                  studentName: matchedStudent.name,
                  score: Math.min(100, totalScore),
                  answers: answersMap
                });
              }
            }
            success = true; // Succeeded!
            
          } catch (iterationError: any) {
            console.error("Error processing image index:", i, "Retries left:", retries - 1, iterationError);
            retries--;
            if (iterationError?.message?.includes('429') || iterationError?.message?.includes('quota')) {
              quotaHit = true; // Stop immediately for quota issues
              totalErrors++;
            } else if (iterationError?.message?.includes('503')) {
               // High demand, wait longer
               await new Promise(resolve => setTimeout(resolve, 3000));
            } else if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
              totalErrors++;
            }
          }
        }
      }

      if (processedResults.length === 0) {
        if (quotaHit) {
          alert('API kullanım sınırına ulaşıldı (Quota). Lütfen bir süre (veya yarına kadar) bekleyin.');
        } else {
          alert('Görsellerden anlamlı veri okunamadı veya sunucu yoğunluğu (503) yaşandı. Lütfen biraz bekleyip tekrar deneyin veya daha net fotoğraflar çekin.');
        }
      } else {
        if (totalErrors > 0) {
          alert(`${totalErrors} adet görsel okunurken hata yaşandı ve atlandı. Kalanlar başarıyla eşleşti.`);
        }
        setResults(processedResults);
      }
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Görseller işlenirken bir hata oluştu.';
      if (e?.message?.includes('429') || e?.message?.includes('quota')) {
        errorMsg = 'API kullanım sınırına ulaşıldı (Quota Exceeded). Lütfen 1-2 dakika bekleyip tekrar deneyin veya daha az görseli aynı anda yükleyin.';
      } else if (e?.message) {
        errorMsg += ' Detay: ' + e.message;
      }
      alert(errorMsg);
    }
    setIsProcessing(false);
  };

  const handleScoreChange = (studentId: string, newScore: string) => {
    setResults(prev => prev.map(r => 
      r.studentId === studentId ? { ...r, score: parseInt(newScore) || 0 } : r
    ));
  };

  const saveResults = async () => {
    setIsProcessing(true);
    setProcessingStatus('Kaydediliyor...');
    const resultsPath = `users/${user.uid}/exams/${exam.id}/results`;
    try {
      const batch = writeBatch(db);
      
      results.forEach(res => {
        const resultRef = doc(db, `users/${user.uid}/exams/${exam.id}/results`, res.studentId);
        batch.set(resultRef, {
          studentId: res.studentId,
          score: res.score,
          answers: res.answers,
          createdAt: serverTimestamp()
        }, { merge: true });
      });

      // Update exam status
      const examRef = doc(db, `users/${user.uid}/exams`, exam.id);
      batch.update(examRef, { 
        status: 'graded', 
        gradedAt: serverTimestamp(),
        hasResults: true 
      });

      await batch.commit();
      setIsProcessing(false);
      onClose();
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
      alert('Kaydedilirken bir hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-neutral-900">{exam.title} - Sonuç Yükleme</h2>
            <p className="text-neutral-500 font-medium">Öğrencilerin optik formlarını veya sınav kağıtlarını yükleyin.</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {pendingFiles.length > 0 ? (
            <div className="flex flex-col items-center gap-6 h-full">
              <div className="text-center">
                <h3 className="text-xl font-bold text-neutral-900">Resmi Kırpın ({currentCropIndex + 1} / {pendingFiles.length})</h3>
                <p className="text-sm text-neutral-500 mt-1">Sadece optik form alanını seçerek okumayı hızlandırın. Bu adım isteğe bağlıdır.</p>
              </div>
              
              <div className="flex-1 min-h-0 w-full flex items-center justify-center bg-neutral-100 rounded-2xl overflow-hidden relative">
                {croppingImgSrc ? (
                  <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} className="max-h-full">
                    <img ref={imgRef} src={croppingImgSrc} alt="Crop" className="max-h-[50vh] w-auto object-contain pointer-events-none" />
                  </ReactCrop>
                ) : (
                  <Loader2 className="animate-spin text-neutral-400" size={32} />
                )}
              </div>

              <div className="flex items-center gap-4 w-full max-w-md">
                <button onClick={skipCroppingAll} className="flex-1 py-3 px-4 bg-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-300">
                  Tümünü Atla
                </button>
                <button onClick={handleNextCrop} className="flex-[2] py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">
                  {currentCropIndex < pendingFiles.length - 1 ? 'Kırp ve Sıradakine Geç' : 'Kırp ve Bitir'}
                </button>
              </div>
            </div>
          ) : isCameraOpen ? (
            <div className="flex-1 flex flex-col bg-black overflow-hidden relative rounded-2xl min-h-[60vh] max-h-[75vh]">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="absolute inset-x-0 inset-y-0 w-full h-full object-cover filter contrast-125 grayscale"
              />
              
              {/* OMR Tarama Kılavuzu (Guide) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
                <div className="w-[95%] h-[45%] border-4 border-emerald-400 border-dashed rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] animate-pulse flex items-center justify-center">
                  <div className="absolute -top-10 left-0 right-0 flex justify-center">
                    <span className="bg-emerald-500 text-white px-5 py-2 rounded-full font-black text-sm tracking-wide shadow-lg border-2 border-emerald-300">
                      ZORUNLU: SADECE KODLAMA ALANINI KUTUYA SIĞDIRIN
                    </span>
                  </div>
                  <div className="opacity-40 flex items-center justify-center gap-10 w-full px-4">
                     {/* Placeholder bubbles for guidance */}
                     <div className="flex flex-col gap-1"><div className="w-4 h-4 rounded-full border-2 border-white"></div><div className="w-4 h-4 rounded-full bg-white"></div><div className="w-4 h-4 rounded-full border-2 border-white"></div></div>
                     <div className="flex flex-col gap-1"><div className="w-4 h-4 rounded-full border-2 border-white"></div><div className="w-4 h-4 rounded-full bg-white"></div><div className="w-4 h-4 rounded-full border-2 border-white"></div></div>
                     <div className="flex flex-col gap-1"><div className="w-4 h-4 rounded-full border-2 border-white"></div><div className="w-4 h-4 rounded-full bg-white"></div><div className="w-4 h-4 rounded-full border-2 border-white"></div></div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-6 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center justify-end z-20 safe-bottom">
                 
                 <div className="flex gap-4 w-full px-4 max-w-md mx-auto mb-4">
                  <button 
                    onClick={closeCamera}
                    className="flex-1 py-5 bg-neutral-800/80 backdrop-blur-md text-white rounded-[2rem] font-black text-xl hover:bg-neutral-700 shadow-xl border border-neutral-600 transition-all active:scale-95 flex items-center justify-center"
                  >
                    KAPAT
                  </button>
                  <div 
                    className={`flex-[2] py-5 text-white rounded-[2rem] font-black text-xl shadow-xl border-2 transition-all flex items-center justify-center gap-3
                      ${autoCaptureStatus === 'searching' ? 'bg-amber-500 border-amber-400' : 
                        autoCaptureStatus === 'focusing' ? 'bg-indigo-500 border-indigo-400 animate-pulse' : 
                        'bg-emerald-500 border-emerald-400'}
                    `}
                  >
                    <Camera size={28} />
                    {autoCaptureStatus === 'searching' && 'Okunuyor...'}
                    {autoCaptureStatus === 'focusing' && 'Netleniyor...'}
                    {autoCaptureStatus === 'captured' && 'Çekildi!'}
                  </div>
                 </div>
                 {images.length > 0 && (
                   <div className="mb-2 text-white font-extrabold text-xl bg-indigo-600/90 border-2 border-indigo-400/50 px-6 py-3 rounded-full backdrop-blur-md shadow-2xl tracking-wide flex items-center gap-3 animate-pulse">
                     FOTOĞRAFLAR: <span className="text-3xl bg-white text-indigo-600 w-10 h-10 flex items-center justify-center rounded-full leading-none">{images.length}</span>
                   </div>
                 )}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center min-h-[40vh] w-full max-w-xl mx-auto gap-6">
                
                {/* Ana Kamera Butonu */}
                <div 
                  onClick={openCamera}
                  className="w-full border-[3px] border-emerald-400 rounded-[2.5rem] p-10 text-center bg-gradient-to-b from-emerald-50 to-white hover:from-emerald-100 hover:to-emerald-50 cursor-pointer shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-1 flex flex-col items-center justify-center group"
                >
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition-transform text-white">
                    <Camera size={48} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-900 mb-2">Canlı Kamera ile Tara</h3>
                  <p className="text-emerald-700/80 font-medium text-lg px-4">
                    Sınav sonuçlarını optik okuyucu formatında anında okutun. Optik form hizalandığında otomatik fotoğraf çekilecektir.
                  </p>
                </div>

                {images.length > 0 && (
                  <div className="inline-flex items-center gap-2 bg-indigo-50 px-6 py-3 rounded-full text-indigo-600 font-bold border border-indigo-100 shadow-sm text-lg mt-6">
                    {images.length} fotoğraf yüklemeye hazır
                  </div>
                )}
              </div>

              {images.length > 0 && (
                <div className="flex justify-end">
                  <button 
                    onClick={processImages}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
                    {isProcessing ? processingStatus : 'Kağıtları Analiz Et'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl flex items-start gap-4 border border-amber-200">
                <AlertTriangle size={24} className="shrink-0 text-amber-600" />
                <div>
                  <h4 className="font-bold">Yapay Zeka Okuması Tamamlandı</h4>
                  <p className="text-sm mt-1">Sonuçları aşağıdan inceleyebilir ve gerekirse notlar üzerinde elle düzeltme yapabilirsiniz.</p>
                </div>
              </div>

              <div className="bg-white border text-sm border-neutral-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-neutral-600">Öğrenci Adı</th>
                      <th className="px-6 py-4 font-bold text-neutral-600">Sistem Puanı</th>
                      <th className="px-6 py-4 font-bold text-neutral-600">Düzeltilmiş Puan (Manuel)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {results.map((res, i) => (
                      <tr key={res.studentId} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/30'}>
                        <td className="px-6 py-4 font-bold text-neutral-900">{res.studentName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-black ${
                            res.score >= 85 ? 'bg-emerald-100 text-emerald-700' :
                            res.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {res.score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" 
                            min="0" 
                            max="100"
                            value={res.score}
                            onChange={(e) => handleScoreChange(res.studentId, e.target.value)}
                            className="w-24 px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-neutral-100">
                <button 
                  onClick={saveResults}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Kaydediliyor...' : 'Kesinleştir ve Kaydet'}
                  <Save size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
