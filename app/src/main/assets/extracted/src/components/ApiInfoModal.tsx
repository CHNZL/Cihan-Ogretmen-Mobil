import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key } from 'lucide-react';

interface ApiInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (apiKey: string) => void;
}

export const ApiInfoModal: React.FC<ApiInfoModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(localStorage.getItem('user_gemini_api_key') || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('user_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('user_gemini_api_key');
    }
    onClose();
    if (onSave) onSave(trimmed);
    alert("API Anahtarı başarıyla kaydedildi! Artık yapay zeka özelliklerini kullanabilirsiniz.");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">API Anahtarı Gerekli</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 text-neutral-600 text-sm leading-relaxed mb-6">
          <p>
            Yapay zeka özelliğini <b>ücretsiz</b> kullanabilmek için kendi API anahtarınızı eklemelisiniz. 
            Bu sayede üretim maliyeti tamamen ücretsiz ve size özel olur:
          </p>
          <ol className="list-decimal list-inside space-y-2 font-medium mb-4">
            <li>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-bold"
              >
                Google AI Studio'ya gitmek için tıkla
              </a>.
            </li>
            <li>"Create API key" butonuna basarak ücretsiz anahtarını kopyala.</li>
            <li>Aşağıdaki kutuya yapıştır ve Kaydet butonuna bas.</li>
          </ol>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-700 text-xs mb-4">
            <b>Not:</b> Anahtarınız sadece sizin tarayıcınızda saklanır. Başka kimseyle paylaşılmaz.
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2 font-black">Gemini API Anahtarı</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-neutral-100 text-neutral-600 font-black rounded-xl hover:bg-neutral-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            Kaydet
          </button>
        </div>
      </motion.div>
    </div>
  );
};
