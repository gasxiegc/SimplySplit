import React, { useState, useEffect, useRef } from 'react';
import { Project, SplitMode, Expense } from '../types';
import { CATEGORIES } from '../constants';
import Avatar from './ui/Avatar';
import * as LucideIcons from 'lucide-react';
import { Camera, X, Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle, Sparkles, Loader2, StickyNote } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { GoogleGenAI, Type } from "@google/genai";

interface ExpenseModalProps {
  project: Project;
  onSave: (amount: number, description: string, payerId: string, splits: { userId: string, amount: number }[], category: string, date: number, receiptImages?: string[], id?: string, customCategory?: string, notes?: string) => void;
  onClose: () => void;
  editingExpense?: Expense | null;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ project, onClose, onSave, editingExpense }) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState(project.members[0]?.id || '');
  const [category, setCategory] = useState('food');
  const [customCategory, setCustomCategory] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<{[key: string]: string}>({});
  const [date, setDate] = useState(Date.now());
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [touchedSplits, setTouchedSplits] = useState<Set<string>>(new Set());
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [quotaReached, setQuotaReached] = useState(false);
  
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amount = parseFloat(amountStr) || 0;

  useEffect(() => {
    setTouchedSplits(new Set());

    if (editingExpense) {
      setAmountStr(editingExpense.amount.toString());
      setDescription(editingExpense.description);
      setPayerId(editingExpense.payerId);
      setCategory(editingExpense.category);
      if (editingExpense.customCategory) setCustomCategory(editingExpense.customCategory);
      setSplitMode(editingExpense.splitMode);
      setDate(editingExpense.date);
      setReceiptImages(editingExpense.receiptImages || []);
      setNotes(editingExpense.notes || '');

      if (editingExpense.splitMode === 'custom') {
        const amounts: {[key: string]: string} = {};
        editingExpense.splits.forEach(s => amounts[s.userId] = s.amount.toFixed(0));
        setCustomAmounts(amounts);
      }
    } else {
        setDate(Date.now());
    }
  }, [editingExpense]);

  useEffect(() => {
    if (splitMode === 'equal') {
       const equalShare = amount / project.members.length;
       const newMap: any = {};
       project.members.forEach(m => newMap[m.id] = equalShare.toFixed(0));
       setCustomAmounts(newMap);
       setTouchedSplits(new Set());
    }
  }, [amount, splitMode, project.members.length]);

  const handleAIScan = async () => {
    if (receiptImages.length === 0) {
      fileInputRef.current?.click();
      return;
    }

    setIsScanning(true);
    setQuotaReached(false);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const lastImageBase64 = receiptImages[receiptImages.length - 1].split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: lastImageBase64,
                },
              },
              {
                text: `你是一個專業的財務收據 OCR 專家。請精準分析這張圖片並提取資訊。
                
                任務要求：
                1. 總金額 (amount): 必須是收據上的「最終應付總額」。請忽略小計(Subtotal)、稅額(Tax)或折扣(Discount)。
                2. 項目名稱 (description): 請提取商戶名稱。若原文為外文，請務必翻譯成「繁體中文 (zh-TW)」。
                3. 日期 (date): 格式為 YYYY-MM-DD。
                4. 分類 (category): 選擇最合適的一個 (food, transport, housing, utilities, tickets, entertainment, shopping, other)。
                5. 明細 (items): 請提取清單上的具體項目與金額。格式為「- 項目 x數量 ($單價)」。
                
                請嚴格依照 JSON 格式回傳。`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              category: { type: Type.STRING },
              items: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of item details from the receipt"
              },
            },
            required: ["amount", "description", "date", "category", "items"],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.amount) setAmountStr(result.amount.toString());
      if (result.description) setDescription(result.description);
      if (result.category && CATEGORIES.some(c => c.id === result.category)) setCategory(result.category);
      if (result.date) {
        const parsedDate = new Date(result.date);
        if (!isNaN(parsedDate.getTime())) {
          parsedDate.setHours(12, 0, 0, 0);
          setDate(parsedDate.getTime());
        }
      }
      if (result.items && Array.isArray(result.items)) {
        setNotes(result.items.join('\n'));
      }
    } catch (error: any) {
      console.error("AI Scan failed:", error);
      if (error.message?.includes('429')) {
        setQuotaReached(true);
        alert("目前的 AI 免費額度已達上限，請稍候再試。");
      } else {
        alert("辨識失敗。請確保收據清晰。");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleCustomAmountChange = (userId: string, newValueStr: string) => {
      let val = parseFloat(newValueStr) || 0;
      if (val < 0) val = 0;
      if (val > amount) val = amount;

      const newMap = { ...customAmounts, [userId]: val.toString() };
      const newTouched = new Set<string>(touchedSplits);
      newTouched.add(userId);
      setTouchedSplits(newTouched);

      let touchedSum = 0;
      newTouched.forEach(id => {
          touchedSum += parseFloat(newMap[id]) || 0;
      });

      const remaining = amount - touchedSum;
      const untouchedUsers = project.members.filter(m => !newTouched.has(m.id));

      if (untouchedUsers.length > 0) {
          const validRemaining = Math.max(0, remaining);
          const share = Math.floor(validRemaining / untouchedUsers.length);
          untouchedUsers.forEach((m, index) => {
              if (index === untouchedUsers.length - 1) {
                  const currentSum = share * (untouchedUsers.length - 1);
                  newMap[m.id] = (validRemaining - currentSum).toFixed(0);
              } else {
                  newMap[m.id] = share.toFixed(0);
              }
          });
      }
      setCustomAmounts(newMap);
  };

  const getSplitsSum = () => {
    return project.members.reduce((sum, m) => sum + (parseFloat(customAmounts[m.id]) || 0), 0);
  };

  const isSumValid = splitMode === 'equal' || Math.abs(getSplitsSum() - amount) < 1;

  const handleSave = () => {
    if (!amount || !description || !isSumValid) return;
    const splits = project.members.map(m => ({
        userId: m.id,
        amount: parseFloat(customAmounts[m.id]) || 0
    }));
    onSave(amount, description, payerId, splits, category, date, receiptImages, editingExpense?.id, customCategory, notes);
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsCompressing(true);
      try {
        const uploadPromises = Array.from(files).map((file: File) => compressImage(file, 1200, 0.7));
        const newImages = await Promise.all(uploadPromises);
        setReceiptImages(prev => [...prev, ...newImages]);
      } catch (err) {
        console.error("Compression failed", err);
      } finally {
        setIsCompressing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setReceiptImages(prev => prev.filter((_, i) => i !== index));
    if (viewerIndex === index) setViewerIndex(null);
  };

  const dateString = new Date(date).toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 總金額 */}
      <div className="flex flex-col items-center justify-center py-1">
        <label className="text-stone-500 text-[10px] mb-1 font-bold uppercase tracking-widest">總金額</label>
        <div className="relative">
          <span className="absolute left-[-1.2rem] top-1 text-lg text-stone-400 font-serif">{project.currency === 'JPY' ? '¥' : '$'}</span>
          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            className="text-4xl font-serif text-stone-800 bg-transparent text-center w-36 focus:outline-none placeholder-stone-200"
            autoFocus={!editingExpense}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2">
          <div className="flex-1 bg-stone-100 rounded-xl px-4 py-2 flex items-center gap-2 border border-stone-200/50">
            <LucideIcons.PenLine size={16} className="text-stone-400" />
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入項目名稱..."
              className="bg-transparent w-full focus:outline-none text-stone-700 text-sm font-medium"
            />
          </div>
          
          <button 
            onClick={handleAIScan}
            disabled={isScanning || quotaReached}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm
              ${isScanning ? 'bg-nature-yellow text-stone-800 animate-pulse' : 
                quotaReached ? 'bg-stone-200 text-stone-400' : 'bg-stone-800 text-nature-yellow hover:scale-105 active:scale-95'}
            `}
            title="AI 辨識收據與明細"
          >
            {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          </button>

          <button 
            onClick={() => !isCompressing && fileInputRef.current?.click()}
            disabled={isCompressing}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${receiptImages.length > 0 ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
          >
            {isCompressing ? <Loader2 className="animate-spin" size={14} /> : <Camera size={18} />}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
        </div>

        <div className="bg-stone-100 rounded-xl px-4 py-2 flex items-center gap-2 border border-stone-200/50">
          <Calendar size={16} className="text-stone-400" />
          <input 
            type="date"
            value={dateString}
            onChange={(e) => setDate(new Date(e.target.value).getTime())}
            className="bg-transparent w-full focus:outline-none text-stone-700 text-sm font-sans"
          />
        </div>

        {receiptImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {receiptImages.map((imgData, idx) => (
              <div key={idx} onClick={() => setViewerIndex(idx)} className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shadow-sm group cursor-pointer active:scale-95 transition-transform">
                <img src={imgData} alt="Receipt" className="w-full h-full object-cover" />
                <button onClick={(e) => removeImage(e, idx)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"><X size={10} /></button>
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-500 transition-all">
              <Plus size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map(cat => {
            const isSelected = category === cat.id;
            const Icon = (LucideIcons as any)[cat.icon.charAt(0).toUpperCase() + cat.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || LucideIcons.Circle;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl transition-all border
                  ${isSelected ? 'bg-stone-800 text-white border-stone-800 shadow-md scale-[1.02]' : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                `}
              >
                <Icon size={14} />
                <span className="text-[9px] font-bold">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 付款人 */}
      <div>
        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">誰付款</label>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {project.members.map(member => (
            <div key={member.id} className="flex flex-col items-center gap-1 min-w-[48px]">
              <Avatar user={member} size="sm" selected={payerId === member.id} onClick={() => setPayerId(member.id)} />
              <span className={`text-[9px] truncate w-full text-center ${payerId === member.id ? 'font-bold text-stone-800' : 'text-stone-400'}`}>{member.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 分帳對象 - 雙欄排列 (grid-cols-2) */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">分帳對象</label>
          <div className="flex bg-stone-100 rounded-lg p-0.5 border border-stone-200/50">
            <button onClick={() => setSplitMode('equal')} className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${splitMode === 'equal' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}>平分</button>
            <button onClick={() => setSplitMode('custom')} className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${splitMode === 'custom' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}>自訂</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {project.members.map(member => {
            const memberAmount = parseFloat(customAmounts[member.id]) || 0;
            const isOverflow = splitMode === 'custom' && memberAmount > amount;
            return (
              <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded-xl bg-stone-50 border border-stone-200/50 transition-colors focus-within:bg-white focus-within:border-stone-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar user={member} size="sm" className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[11px] text-stone-700 font-bold truncate">{member.name}</span>
                </div>
                
                {splitMode === 'equal' ? (
                  <span className="text-[10px] font-serif text-stone-400">{(amount / project.members.length).toFixed(0)}</span>
                ) : (
                  <div className={`flex items-center gap-0.5 border-b ${isOverflow ? 'border-red-400 text-red-500' : 'border-stone-300 text-stone-800'} transition-colors`}>
                    <span className="text-[8px] text-stone-400">{project.currency === 'JPY' ? '¥' : '$'}</span>
                    <input
                      type="number"
                      value={customAmounts[member.id] || ''}
                      onChange={(e) => handleCustomAmountChange(member.id, e.target.value)}
                      className="w-12 text-right bg-transparent focus:outline-none font-serif text-[11px] font-bold"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 備註欄位 */}
      <div className="bg-stone-100 rounded-xl px-4 py-2 flex items-start gap-2 border border-stone-200/50">
        <StickyNote size={14} className="text-stone-400 mt-1" />
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="點擊 AI 辨識可自動填寫明細..."
          className="bg-transparent w-full focus:outline-none text-stone-700 text-[11px] min-h-[50px] resize-none leading-relaxed font-medium"
        />
      </div>

      <div className="space-y-2">
        {splitMode === 'custom' && !isSumValid && amount > 0 && (
          <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 py-1 rounded-xl text-[9px] font-bold animate-pulse">
            <AlertCircle size={12} />
            <span>總計不符 ({getSplitsSum().toFixed(0)} / {amount.toFixed(0)})</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!amount || !description || isCompressing || !isSumValid || isScanning}
          className={`w-full py-3 rounded-2xl font-bold text-base transition-all shadow-md active:scale-[0.98]
            ${(!amount || !description || isCompressing || !isSumValid || isScanning) 
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none' 
              : 'bg-stone-800 text-stone-50 hover:bg-stone-700'}
          `}
        >
          {isScanning ? 'AI 分析中...' : (editingExpense ? '確認更新' : '新增帳務')}
        </button>
      </div>

      {viewerIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-stone-900/95 flex flex-col items-center justify-center p-4" onClick={() => setViewerIndex(null)}>
          <button className="absolute top-6 right-6 z-[70] p-3 bg-white/10 rounded-full text-white active:scale-90"><X size={24} /></button>
          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={receiptImages[viewerIndex]} alt="Receipt Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseModal;