import React from 'react';
import { HelpCircle, Users, SplitSquareHorizontal, CheckSquare, SkipForward } from 'lucide-react';

export interface JokerSettings {
  friendHelp: boolean;
  fiftyFifty: boolean;
  doubleChance: boolean;
  skipQuestion: boolean;
}

export const defaultJokerSettings: JokerSettings = {
  friendHelp: false,
  fiftyFifty: false,
  doubleChance: false,
  skipQuestion: false
};

interface Props {
  settings: JokerSettings;
  onChange: (s: JokerSettings) => void;
}

export const JokerConfigPanel: React.FC<Props> = ({ settings, onChange }) => {
  return (
    <div className="space-y-3 mt-6 border-t border-neutral-100 dark:border-neutral-800 pt-4">
      <div className="flex items-center gap-2 mb-2">
         <HelpCircle className="text-purple-500" size={18} />
         <h4 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">Joker (Yardım) Seçenekleri</h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
               <Users size={16} />
            </div>
            <div>
              <div className="font-bold text-xs text-neutral-700 dark:text-neutral-300">Arkadaş Yardımı</div>
              <div className="text-[10px] text-neutral-500">Rastgele 3 arkadaştan yardım</div>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={settings.friendHelp}
            onChange={e => onChange({ ...settings, friendHelp: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
               %50
            </div>
            <div>
              <div className="font-bold text-xs text-neutral-700 dark:text-neutral-300">Yarı Yarıya</div>
              <div className="text-[10px] text-neutral-500">2 yanlış şıkkı siler</div>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={settings.fiftyFifty}
            onChange={e => onChange({ ...settings, fiftyFifty: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-black text-xs">
               X2
            </div>
            <div>
              <div className="font-bold text-xs text-neutral-700 dark:text-neutral-300">Çift Cevap</div>
              <div className="text-[10px] text-neutral-500">2 cevap hakkı verir</div>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={settings.doubleChance}
            onChange={e => onChange({ ...settings, doubleChance: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
               <SkipForward size={16} />
            </div>
            <div>
              <div className="font-bold text-xs text-neutral-700 dark:text-neutral-300">Pas Geç</div>
              <div className="text-[10px] text-neutral-500">Soruyu değiştirir</div>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={settings.skipQuestion}
            onChange={e => onChange({ ...settings, skipQuestion: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
          />
        </label>
      </div>
    </div>
  );
};
