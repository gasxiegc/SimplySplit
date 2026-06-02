import React, { useState, useEffect, useRef } from 'react';
import { Project, SplitMode, Expense } from '../types';
import { CATEGORIES } from '../constants';
import Avatar from './ui/Avatar';
import * as LucideIcons from 'lucide-react';
import { Camera, X, Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle, Sparkles, Loader2, StickyNote } from 'lucide-react';
import { compressImage, fileToBase64, dataURLtoBlob } from '../utils/imageUtils';
import { DataService } from '../services/dataService';
import { GoogleGenAI, Type } from "@google/genai";
import NumericCalculator from './ui/NumericCalculator';

interface ExpenseModalProps {
  project: Project;
  onSave: (amount: number, description: string, payerId: string, splits: { userId: string, amount: number }[], category: string, date: number, receiptImages?: string[], id?: string, customCategory?: string, notes?: string, splitMode?: SplitMode) => void;
  onClose: () => void;
  editingExpense?: Expense | null;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ project, onClose, onSave, editingExpense }) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState('');
  const [category, setCategory] = useState('food');
  const [customCategory, setCustomCategory] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<{[key: string]: string}>({});
  const [date, setDate] = useState(Date.now());
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [touchedSplits, setTouchedSplits] = useState<Set<string>>(new Set());
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [quotaReached, setQuotaReached] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isAIScanPending, setIsAIScanPending] = useState(false);
  
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
      setOriginalImages(editingExpense.receiptImages || []); // Fallback to compressed if original not available
      setNotes(editingExpense.notes || '');

      if (editingExpense.splitMode === 'custom') {
        const amounts: {[key: string]: string} = {};
        editingExpense.splits.forEach(s => amounts[s.userId] = s.amount.toFixed(0));
        setCustomAmounts(amounts);
      }
    } else {
        setDate(Date.now());
        setPayerId(''); // Ensure blank default for new expenses
    }
  }, [editingExpense]);

  const runAIScan = async (base64Data: string, mimeType: string) => {
    setIsScanning(true);
    setQuotaReached(false);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined' || apiKey === '') {
        throw new Error("系統未偵測到 API Key。如果您是自行部署（如 Vercel），請確保已在環境變數中設定 GEMINI_API_KEY。");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
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
      return true;
    } catch (error: any) {
      console.error("AI Scan failed:", error);
      const errorMessage = error.message || "未知錯誤";
      
      if (errorMessage.includes('429')) {
        setQuotaReached(true);
        alert("目前的 AI 免費額度已達上限，請稍候再試。");
      } else if (errorMessage.includes('API Key')) {
        alert(`API Key 錯誤: ${errorMessage}`);
      } else {
        alert(`辨識失敗: ${errorMessage}\n請確保收據清晰並重試。`);
      }
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  const handleAIScan = async () => {
    if (receiptImages.length === 0) {
      setIsAIScanPending(true);
      fileInputRef.current?.click();
      return;
    }

    // Use original image if available, otherwise fallback to compressed
    const targetImage = originalImages[receiptImages.length - 1] || receiptImages[receiptImages.length - 1];
    if (!targetImage) return;

    const mimeType = targetImage.split(';')[0].split(':')[1] || 'image/jpeg';
    const base64Data = targetImage.split(',')[1];
    
    await runAIScan(base64Data, mimeType);
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
    if (!amount || !description || !payerId || !isSumValid) return;
    const splits = project.members.map((m, index) => {
      if (splitMode === 'equal') {
        const equalShare = Math.floor(amount / project.members.length);
        if (index === project.members.length - 1) {
          const totalDistributed = equalShare * (project.members.length - 1);
          return { userId: m.id, amount: Math.max(0, amount - totalDistributed) };
        }
        return { userId: m.id, amount: equalShare };
      } else {
        return {
          userId: m.id,
          amount: parseFloat(customAmounts[m.id]) || 0
        };
      }
    });
    onSave(amount, description, payerId, splits, category, date, receiptImages, editingExpense?.id, customCategory, notes, splitMode);
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      if (isAIScanPending) {
        setIsAIScanPending(false);
        const file = fileArray[0];
        const originalBase64 = await fileToBase64(file);
        const mimeType = file.type || 'image/jpeg';
        
        const success = await runAIScan(originalBase64.split(',')[1], mimeType);
        
        if (success) {
          setIsCompressing(true);
          try {
            const compressed = await compressImage(file, 1200, 0.7);
            const blob = dataURLtoBlob(compressed);
            const publicUrl = await DataService.uploadImage(blob, 'receipt');

            setReceiptImages(prev => [...prev, publicUrl]);
            setOriginalImages(prev => [...prev, originalBase64]);
          } catch (err: any) {
            console.error("Storage upload failed", err);
            alert(`儲存圖片至雲端失敗！如果您是第一次啟用此功能，請先確保已在 Supabase Dashboard 中建立一個名為 'receipts' 的 Public 儲存庫 (Bucket) 並開通讀寫政策 (Policy)。\n錯誤原因: ${err.message}`);
          } finally {
            setIsCompressing(false);
          }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setIsCompressing(true);
      try {
        // 1. Get original base64 for AI (high quality in-memory cache)
        const originalPromises = fileArray.map(file => fileToBase64(file));
        const newOriginals = await Promise.all(originalPromises);
        setOriginalImages(prev => [...prev, ...newOriginals]);

        // 2. Compress other images and upload to Supabase Storage directly
        const uploadPromises = fileArray.map(async (file: File) => {
          const compressed = await compressImage(file, 1200, 0.7);
          const blob = dataURLtoBlob(compressed);
          return DataService.uploadImage(blob, 'receipt');
        });

        const publicUrls = await Promise.all(uploadPromises);
        setReceiptImages(prev => [...prev, ...publicUrls]);
      } catch (err: any) {
        console.error("Image processing or upload failed", err);
        alert(`上傳圖片到雲端失敗！如果您是第一次啟用此功能，請先確保已在 Supabase Dashboard 中建立一個名為 'receipts' 的 Public 儲存庫 (Bucket) 並開通讀寫政策 (Policy)。\n錯誤原因: ${err.message}`);
      } finally {
        setIsCompressing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setReceiptImages(prev => prev.filter((_, i) => i !== index));
    setOriginalImages(prev => prev.filter((_, i) => i !== index));
    if (viewerIndex === index) setViewerIndex(null);
  };

  const dateString = new Date(date).toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full gap-5 pb-4">
      {/* 總金額 - 顯著字體 */}
      <div className="flex flex-col items-center justify-center py-2">
        <label className="text-stone-500 text-xs mb-2 font-bold uppercase tracking-widest">總金額</label>
        <div 
          className="relative cursor-pointer active:scale-95 transition-transform"
          onClick={() => setIsCalculatorOpen(true)}
        >
          <span className="absolute left-[-1.5rem] top-1.5 text-2xl text-stone-400 font-serif">{project.currency === 'JPY' ? '¥' : '$'}</span>
          <div className={`text-5xl font-serif text-stone-800 text-center min-w-[11rem] border-b-2 border-dashed border-stone-200 pb-1 ${!amountStr ? 'text-stone-200' : ''}`}>
            {amountStr || '0'}
          </div>
        </div>
      </div>

      {isCalculatorOpen && (
        <NumericCalculator
          initialValue={amountStr}
          currency={project.currency}
          title="輸入總金額"
          onConfirm={(val) => {
            setAmountStr(val);
            setIsCalculatorOpen(false);
          }}
          onClose={() => setIsCalculatorOpen(false)}
        />
      )}

      {editingMemberId && (
        <NumericCalculator
          initialValue={customAmounts[editingMemberId] || '0'}
          currency={project.currency}
          title={`輸入 ${project.members.find(m => m.id === editingMemberId)?.name || '成員'} 的分帳金額`}
          onConfirm={(val) => {
            handleCustomAmountChange(editingMemberId, val);
            setEditingMemberId(null);
          }}
          onClose={() => setEditingMemberId(null)}
        />
      )}

      <div className="space-y-4">
        {/* 名稱與功能按鈕 */}
        <div className="flex gap-2">
          <div className="flex-1 bg-stone-100 rounded-2xl px-4 py-3.5 flex items-center gap-2 border border-stone-200/50">
            <LucideIcons.PenLine size={20} className="text-stone-400" />
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入項目名稱..."
              className="bg-transparent w-full focus:outline-none text-stone-700 text-base font-medium"
            />
          </div>
          
          <button 
            onClick={handleAIScan}
            disabled={isScanning || quotaReached}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md
              ${isScanning ? 'bg-nature-yellow text-stone-800 animate-pulse' : 
                quotaReached ? 'bg-stone-200 text-stone-400' : 'bg-stone-800 text-nature-yellow hover:scale-105 active:scale-95'}
            `}
            title="AI 掃描"
          >
            {isScanning ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
          </button>

          <button 
            onClick={() => !isCompressing && fileInputRef.current?.click()}
            disabled={isCompressing}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-md ${receiptImages.length > 0 ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-400 hover:bg-stone-200 active:scale-95'}`}
            title="上傳圖片"
          >
            {isCompressing ? <Loader2 className="animate-spin" size={20} /> : <Camera size={24} />}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
        </div>

        {/* 日期選擇 */}
        <div className="bg-stone-100 rounded-2xl px-4 py-3.5 flex items-center gap-2 border border-stone-200/50">
          <Calendar size={20} className="text-stone-400" />
          <input 
            type="date"
            value={dateString}
            onChange={(e) => setDate(new Date(e.target.value).getTime())}
            className="bg-transparent w-full focus:outline-none text-stone-700 text-base font-sans"
          />
        </div>

        {/* 圖片預覽 */}
        {receiptImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {receiptImages.map((imgData, idx) => (
              <div key={idx} onClick={() => setViewerIndex(idx)} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm group cursor-pointer active:scale-95 transition-transform">
                <img src={imgData} alt="Receipt" className="w-full h-full object-cover" />
                <button onClick={(e) => removeImage(e, idx)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"><X size={12} /></button>
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400">
              <Plus size={20} />
            </button>
          </div>
        )}

        {/* 分類選項 */}
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map(cat => {
            const isSelected = category === cat.id;
            const Icon = (LucideIcons as any)[cat.icon.charAt(0).toUpperCase() + cat.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || LucideIcons.Circle;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all border
                  ${isSelected ? 'bg-stone-800 text-white border-stone-800 shadow-lg scale-[1.02]' : 'bg-stone-50 text-stone-500 border-stone-100 active:scale-95'}
                `}
              >
                <Icon size={18} />
                <span className="text-xs font-bold">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 付款人 */}
      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 block">誰付款 <span className="text-red-500 font-normal text-[10px] ml-1">(*必填)</span></label>
        <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
          {project.members.map(member => (
            <div key={member.id} className="flex flex-col items-center gap-2 min-w-[56px]">
              <Avatar user={member} size="md" selected={payerId === member.id} onClick={() => setPayerId(member.id)} />
              <span className={`text-xs truncate w-full text-center ${payerId === member.id ? 'font-bold text-stone-800' : 'text-stone-400'}`}>{member.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 分帳內容 - 雙欄 */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">分帳對象</label>
          <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200/50">
            <button onClick={() => setSplitMode('equal')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${splitMode === 'equal' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}>平分</button>
            <button 
              onClick={() => {
                setSplitMode('custom');
                const hasCustomValues = Object.values(customAmounts).some(v => parseFloat(v) > 0);
                if (!hasCustomValues && amount > 0) {
                  const equalShare = amount / project.members.length;
                  const newMap: any = {};
                  project.members.forEach(m => newMap[m.id] = equalShare.toFixed(0));
                  setCustomAmounts(newMap);
                }
              }} 
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${splitMode === 'custom' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
            >
              自訂
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {project.members.map(member => {
            const memberAmount = parseFloat(customAmounts[member.id]) || 0;
            const isOverflow = splitMode === 'custom' && memberAmount > amount;
            return (
              <div key={member.id} className="flex items-center justify-between py-3 px-3 rounded-2xl bg-stone-50 border border-stone-200/50 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-stone-200">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar user={member} size="sm" className="w-6 h-6 flex-shrink-0" />
                  <span className="text-sm text-stone-700 font-bold truncate">{member.name}</span>
                </div>
                
                {splitMode === 'equal' ? (
                  <span className="text-xs font-serif text-stone-400">{(amount / project.members.length).toFixed(0)}</span>
                ) : (
                  <div 
                    className={`flex items-center gap-1 border-b cursor-pointer active:scale-95 transition-transform ${isOverflow ? 'border-red-400 text-red-500' : 'border-stone-300 text-stone-800'}`}
                    onClick={() => setEditingMemberId(member.id)}
                  >
                    <span className="text-[10px] text-stone-400 font-bold">{project.currency === 'JPY' ? '¥' : '$'}</span>
                    <div className="w-14 text-right bg-transparent font-serif text-sm font-bold">
                      {customAmounts[member.id] || '0'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 備註 */}
      <div className="bg-stone-100 rounded-2xl px-4 py-3.5 flex items-start gap-2 border border-stone-200/50">
        <StickyNote size={20} className="text-stone-400 mt-1" />
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="點擊 AI 辨識可自動填寫收據明細..."
          className="bg-transparent w-full focus:outline-none text-stone-700 text-sm min-h-[80px] resize-none leading-relaxed font-medium"
        />
      </div>

      {/* 超大底部按鈕 */}
      <div className="space-y-4 pt-2">
        {splitMode === 'custom' && !isSumValid && amount > 0 && (
          <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 py-2.5 rounded-xl text-xs font-bold animate-pulse">
            <AlertCircle size={16} />
            <span>總計不符 ({getSplitsSum().toFixed(0)} / {amount.toFixed(0)})</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!amount || !description || !payerId || isCompressing || !isSumValid || isScanning}
          className={`w-full py-5 rounded-3xl font-bold text-xl transition-all shadow-xl active:scale-[0.96] flex items-center justify-center gap-2
            ${(!amount || !description || !payerId || isCompressing || !isSumValid || isScanning) 
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none' 
              : 'bg-stone-800 text-stone-50 hover:bg-stone-700'}
          `}
        >
          {isScanning ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>AI 正在努力分析...</span>
            </>
          ) : (
            <span>{editingExpense ? '確認並更新帳務' : '完成並新增帳務'}</span>
          )}
        </button>
      </div>

      {/* 圖片大圖檢視 */}
      {viewerIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-stone-900/95 flex flex-col items-center justify-center p-4" onClick={() => setViewerIndex(null)}>
          <button className="absolute top-8 right-8 z-[70] p-4 bg-white/10 rounded-full text-white active:scale-90"><X size={28} /></button>
          <div className="relative max-w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={receiptImages[viewerIndex]} alt="Receipt Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseModal;