
import React, { useState, useEffect, useRef } from 'react';
import { Project, SplitMode, Expense } from '../types';
import { CATEGORIES } from '../constants';
import Avatar from './ui/Avatar';
import * as LucideIcons from 'lucide-react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface ExpenseModalProps {
  project: Project;
  onSave: (amount: number, description: string, payerId: string, splits: { userId: string, amount: number }[], category: string, date: number, receiptImage?: string, id?: string, customCategory?: string) => void;
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
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [touchedSplits, setTouchedSplits] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset touched state when opening modal
    setTouchedSplits(new Set());

    if (editingExpense) {
      setAmountStr(editingExpense.amount.toString());
      setDescription(editingExpense.description);
      setPayerId(editingExpense.payerId);
      setCategory(editingExpense.category);
      if (editingExpense.customCategory) setCustomCategory(editingExpense.customCategory);
      setSplitMode(editingExpense.splitMode);
      setDate(editingExpense.date);
      setReceiptImage(editingExpense.receiptImage);

      if (editingExpense.splitMode === 'custom') {
        const amounts: {[key: string]: string} = {};
        // Use toFixed(0) to remove decimals for custom amounts as requested
        editingExpense.splits.forEach(s => amounts[s.userId] = s.amount.toFixed(0));
        setCustomAmounts(amounts);
      }
    } else {
        // Init default custom amounts for new expense
        const equalShare = (parseFloat(amountStr) || 0) / project.members.length;
        const initMap: any = {};
        // Use toFixed(0) for integer defaults
        project.members.forEach(m => initMap[m.id] = equalShare.toFixed(0));
        setCustomAmounts(initMap);
    }
  }, [editingExpense]);

  const amount = parseFloat(amountStr) || 0;

  // Sync custom amounts when switching back to custom or changing total amount if in equal mode
  useEffect(() => {
    if (splitMode === 'equal') {
       const equalShare = amount / project.members.length;
       const newMap: any = {};
       project.members.forEach(m => newMap[m.id] = equalShare.toFixed(0));
       setCustomAmounts(newMap);
       setTouchedSplits(new Set()); // Reset touched if we go back to equal or amount changes in equal mode
    }
  }, [amount, splitMode, project.members.length]);

  const handleCustomAmountChange = (userId: string, newValueStr: string) => {
      // 1. Update the value in state for the current user
      const newMap = { ...customAmounts, [userId]: newValueStr };

      // 2. Mark this user as touched
      const newTouched = new Set<string>(touchedSplits);
      newTouched.add(userId);
      setTouchedSplits(newTouched);

      // 3. Calculate remaining amount to distribute
      // Sum of all TOUCHED fields
      let touchedSum = 0;
      newTouched.forEach(id => {
          touchedSum += parseFloat(newMap[id]) || 0;
      });

      const remaining = amount - touchedSum;
      const untouchedUsers = project.members.filter(m => !newTouched.has(m.id));

      if (untouchedUsers.length > 0) {
          // Distribute equally to untouched (Integers)
          const share = Math.floor(remaining / untouchedUsers.length);
          untouchedUsers.forEach((m, index) => {
              // Add remainder to the last untouched user to ensure sum matches remaining
              if (index === untouchedUsers.length - 1) {
                  const currentSum = share * (untouchedUsers.length - 1);
                  newMap[m.id] = (remaining - currentSum).toFixed(0);
              } else {
                  newMap[m.id] = share.toFixed(0);
              }
          });
      } else {
          // No untouched users. Distribute remainder to the LAST person.
          // Logic: If user edits A, and B, C, D are all touched. The remainder must go somewhere.
          // Prompt requirement: "Balance automatically distributed to the last one".
          // BUT: If the current user IS the last person, we shouldn't overwrite their input.
          
          const lastMember = project.members[project.members.length - 1];
          
          if (lastMember.id !== userId) {
             // Calculate sum of everyone except last person
             let currentTotalExcludingLast = 0;
             project.members.forEach(m => {
                 if (m.id !== lastMember.id) {
                     currentTotalExcludingLast += parseFloat(newMap[m.id]) || 0;
                 }
             });
             
             const diff = amount - currentTotalExcludingLast;
             // Ensure we format as integer string
             newMap[lastMember.id] = diff.toFixed(0);
          }
      }

      setCustomAmounts(newMap);
  };

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
    if (!amount || !description) return;
    
    // Validation for custom split
    if (splitMode === 'custom') {
      const totalCustom = (Object.values(customAmounts) as string[]).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      // Tolerance of 1 for rounding issues or minor input lag
      if (Math.abs(totalCustom - amount) > 1) { 
        if(!window.confirm(`分帳總額 (${totalCustom.toFixed(0)}) 與 總金額 (${amount}) 不符。確定要儲存嗎？(差額將被忽略)`)) {
            return;
        }
      }
    }

    onSave(amount, description, payerId, getSplits(), category, date, receiptImage, editingExpense?.id, customCategory);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Amount Display */}
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

      {/* Description & Category */}
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
            onClick={() => fileInputRef.current?.click()}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${receiptImage ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
          >
            <Camera size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload}
          />
        </div>

        {/* Image Preview */}
        {receiptImage && (
          <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
            <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
            <button 
              onClick={() => setReceiptImage(undefined)}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Categories Grid (2 Rows) */}
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

      {/* Payer Selection */}
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

      {/* Split Mode */}
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
          {project.members.map(member => (
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
                <div className="flex items-center gap-1 border-b border-stone-300 focus-within:border-stone-500">
                  <span className="text-stone-400 text-sm">{project.currency === 'JPY' ? '¥' : '$'}</span>
                  <input
                    type="number"
                    value={customAmounts[member.id] || ''}
                    onChange={(e) => handleCustomAmountChange(member.id, e.target.value)}
                    className="w-20 text-right bg-transparent focus:outline-none font-serif text-stone-800"
                    placeholder="0"
                    step="1"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!amount || !description}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-stone-200
          ${(!amount || !description) 
            ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
            : 'bg-stone-800 text-stone-50 hover:bg-stone-700 active:scale-[0.98]'}
        `}
      >
        {editingExpense ? '更新帳務' : '新增帳務'}
      </button>
    </div>
  );
};

export default ExpenseModal;
