import React, { useState, useEffect, useRef } from 'react';
import { Project, SplitMode, Expense } from '../types';
import { CATEGORIES } from '../constants';
import Avatar from './ui/Avatar';
import * as LucideIcons from 'lucide-react';
import { Camera, X, Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

interface ExpenseModalProps {
  project: Project;
  onSave: (amount: number, description: string, payerId: string, splits: { userId: string, amount: number }[], category: string, date: number, receiptImages?: string[], id?: string, customCategory?: string) => void;
  onClose: () => void;
  editingExpense?: Expense | null;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ project, onSave, onClose, editingExpense }) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState(project.members[0]?.id || '');
  const [category, setCategory] = useState('food');
  const [customCategory, setCustomCategory] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<{[key: string]: string}>({});
  const [date, setDate] = useState(Date.now());
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [touchedSplits, setTouchedSplits] = useState<Set<string>>(new Set());
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Image Viewer State
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

      if (editingExpense.splitMode === 'custom') {
        const amounts: {[key: string]: string} = {};
        editingExpense.splits.forEach(s => amounts[s.userId] = s.amount.toFixed(0));
        setCustomAmounts(amounts);
      }
    } else {
        setDate(Date.now());
        const equalShare = (amount || 0) / project.members.length;
        const initMap: any = {};
        project.members.forEach(m => initMap[m.id] = equalShare.toFixed(0));
        setCustomAmounts(initMap);
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

  const handleCustomAmountChange = (userId: string, newValueStr: string) => {
      // Prevent negative values
      let val = parseFloat(newValueStr) || 0;
      if (val < 0) val = 0;
      
      // RULE: Individual split cannot exceed total amount
      if (val > amount) val = amount;

      const newMap = { ...customAmounts, [userId]: val.toString() };
      const newTouched = new Set<string>(touchedSplits);
      newTouched.add(userId);
      setTouchedSplits(newTouched);

      let touchedSum = 0;
      newTouched.forEach(id => {
          touchedSum += parseFloat(newMap[id]) || 0;
      });

      // Recalculate remaining for untouched members
      const remaining = amount - touchedSum;
      const untouchedUsers = project.members.filter(m => !newTouched.has(m.id));

      if (untouchedUsers.length > 0) {
          // If remaining is negative (touched sum exceeds total), force remaining to 0 and distribute 0
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
      } else {
          // If all members are touched, ensure the last modified one doesn't break the sum
          // Or just let it be and rely on the validation warning
      }
      setCustomAmounts(newMap);
  };

  const getSplitsSum = () => {
    return project.members.reduce((sum, m) => sum + (parseFloat(customAmounts[m.id]) || 0), 0);
  };

  const isSumValid = splitMode === 'equal' || Math.abs(getSplitsSum() - amount) < 1;

  const getSplits = () => {
    if (splitMode === 'equal') {
      const splitAmount = amount / project.members.length;
      return project.members.map(m => ({ userId: m.id, amount: splitAmount }));
    } else {
      return project.members.map(m => ({ 
        userId: m.id, 
        amount: parseFloat(customAmounts[m.id]) || 0 
      }));
    }
  };

  const handleSave = () => {
    if (!amount || !description || !isSumValid) return;
    onSave(amount, description, payerId, getSplits(), category, date, receiptImages, editingExpense?.id, customCategory);
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsCompressing(true);
      try {
        const uploadPromises = Array.from(files).map((file: File) => compressImage(file, 1200, 0.6));
        const newImages = await Promise.all(uploadPromises);
        setReceiptImages(prev => [...prev, ...newImages]);
      } catch (err) {
        console.error("Compression failed", err);
        alert("部分圖片處理失敗");
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

  const navigateViewer = (direction: 'prev' | 'next') => {
    if (viewerIndex === null) return;
    if (direction === 'prev') {
      setViewerIndex(viewerIndex > 0 ? viewerIndex - 1 : receiptImages.length - 1);
    } else {
      setViewerIndex(viewerIndex < receiptImages.length - 1 ? viewerIndex + 1 : 0);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col items-center justify-center py-4">
        <label className="text-stone-500 text-sm mb-1 font-medium">總金額</label>
        <div className="relative">
          <span className="absolute left-[-2rem] top-1 text-2xl text-stone-400 font-serif">{project.currency === 'JPY' ? '¥' : '$'}</span>
          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            className="text-5xl font-serif text-stone-800 bg-transparent text-center w-48 focus:outline-none placeholder-stone-200"
            autoFocus={!editingExpense}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 flex items-center gap-2">
            <LucideIcons.PenLine size={18} className="text-stone-400" />
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入項目名稱..."
              className="bg-transparent w-full focus:outline-none text-stone-700"
            />
          </div>
          <button 
            onClick={() => !isCompressing && fileInputRef.current?.click()}
            disabled={isCompressing}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${receiptImages.length > 0 ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
          >
            {isCompressing ? <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div> : <Camera size={20} />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple
            onChange={handleImageUpload}
          />
        </div>

        <div className="bg-stone-100 rounded-2xl px-4 py-3 flex items-center gap-2">
          <Calendar size={18} className="text-stone-400" />
          <input 
            type="date"
            value={dateString}
            onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                selectedDate.setHours(12, 0, 0, 0);
                setDate(selectedDate.getTime());
            }}
            className="bg-transparent w-full focus:outline-none text-stone-700 font-sans"
          />
        </div>

        {receiptImages.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {receiptImages.map((imgData, idx) => (
              <div 
                key={idx} 
                onClick={() => setViewerIndex(idx)}
                className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm group cursor-pointer active:scale-95 transition-transform"
              >
                <img src={imgData} alt={`Receipt ${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => removeImage(e, idx)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-500 transition-all"
            >
              <Plus size={20} />
              <span className="text-[10px] font-bold mt-1">追加</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map(cat => {
            const isSelected = category === cat.id;
             const Icon = (LucideIcons as any)[cat.icon.charAt(0).toUpperCase() + cat.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || LucideIcons.Circle;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl transition-all
                  ${isSelected ? 'bg-stone-800 text-white shadow-md scale-[1.02]' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}
                `}
              >
                <Icon size={20} />
                <span className="text-xs font-bold">{cat.label}</span>
              </button>
            )
          })}
        </div>
        {category === 'other' && (
           <input 
             type="text"
             value={customCategory}
             onChange={(e) => setCustomCategory(e.target.value)}
             placeholder="輸入分類名稱..."
             className="w-full bg-stone-50 rounded-xl px-4 py-3 outline-none text-stone-800 border-b-2 border-stone-200 focus:border-stone-500"
           />
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 block">誰付款</label>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {project.members.map(member => (
            <div key={member.id} className="flex flex-col items-center gap-1 min-w-[60px]">
              <Avatar 
                user={member} 
                selected={payerId === member.id}
                onClick={() => setPayerId(member.id)}
              />
              <span className={`text-xs ${payerId === member.id ? 'font-bold text-stone-800' : 'text-stone-500'}`}>
                {member.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-end mb-3">
          <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">分帳對象</label>
          <div className="flex bg-stone-100 rounded-lg p-1">
            <button 
              onClick={() => setSplitMode('equal')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${splitMode === 'equal' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}
            >
              平分
            </button>
            <button 
              onClick={() => setSplitMode('custom')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${splitMode === 'custom' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}
            >
              自訂
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {project.members.map(member => {
            const memberAmount = parseFloat(customAmounts[member.id]) || 0;
            const isInvalid = splitMode === 'custom' && memberAmount > amount;
            
            return (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-3">
                  <Avatar user={member} size="sm" />
                  <span className="text-stone-700">{member.name}</span>
                </div>
                
                {splitMode === 'equal' ? (
                  <span className="font-serif text-stone-500">
                    {(amount / project.members.length).toFixed(0)}
                  </span>
                ) : (
                  <div className={`flex items-center gap-1 border-b ${isInvalid ? 'border-red-400 text-red-500' : 'border-stone-300 text-stone-800'} focus-within:border-stone-500 transition-colors`}>
                    <span className="text-stone-400 text-sm">{project.currency === 'JPY' ? '¥' : '$'}</span>
                    <input
                      type="number"
                      value={customAmounts[member.id] || ''}
                      onChange={(e) => handleCustomAmountChange(member.id, e.target.value)}
                      className="w-20 text-right bg-transparent focus:outline-none font-serif"
                      placeholder="0"
                      step="1"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {splitMode === 'custom' && !isSumValid && amount > 0 && (
          <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 py-2 rounded-xl text-xs font-bold animate-pulse">
            <AlertCircle size={14} />
            <span>目前總計: {getSplitsSum().toFixed(0)} / 應為: {amount.toFixed(0)}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!amount || !description || isCompressing || !isSumValid}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-stone-200
            ${(!amount || !description || isCompressing || !isSumValid) 
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
              : 'bg-stone-800 text-stone-50 hover:bg-stone-700 active:scale-[0.98]'}
          `}
        >
          {isCompressing ? '處理圖片中...' : (editingExpense ? '更新帳務' : '新增帳務')}
        </button>
      </div>

      {/* Image Gallery Viewer Overlay */}
      {viewerIndex !== null && (
        <div 
          className="fixed inset-0 z-[60] bg-stone-900/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewerIndex(null)}
        >
          <button 
            className="absolute top-6 right-6 z-[70] p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            onClick={() => setViewerIndex(null)}
          >
            <X size={24} />
          </button>

          {receiptImages.length > 1 && (
            <>
              <button 
                className="absolute left-4 top-1/2 -translate-y-1/2 z-[70] p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); navigateViewer('prev'); }}
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 z-[70] p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); navigateViewer('next'); }}
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={receiptImages[viewerIndex]} 
              alt="Receipt Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute -bottom-10 left-0 right-0 text-center text-white/60 text-sm font-medium">
              {viewerIndex + 1} / {receiptImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseModal;