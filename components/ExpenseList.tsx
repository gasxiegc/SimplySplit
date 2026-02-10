import React, { useState } from 'react';
import { Project, Expense } from '../types';
import { formatCurrency } from '../utils/settlement';
import { CATEGORIES, ANIMAL_PATHS } from '../constants';
import * as LucideIcons from 'lucide-react';
import Modal from './ui/Modal';

interface ExpenseListProps {
  project: Project;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ project, onDelete, onEdit }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedExpenses = [...project.expenses].sort((a, b) => b.date - a.date);

  const getPayer = (id: string) => project.members.find(m => m.id === id);

  const getCategoryIcon = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return <LucideIcons.MoreHorizontal size={20} />;
    const Icon = (LucideIcons as any)[cat.icon.charAt(0).toUpperCase() + cat.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || LucideIcons.Circle;
    return <Icon size={20} />;
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Payer', 'Total Amount', 'Currency'];
    project.members.forEach(m => headers.push(m.name));

    const rows = sortedExpenses.map(e => {
      const row = [
        new Date(e.date).toLocaleDateString(),
        e.description,
        CATEGORIES.find(c => c.id === e.category)?.label || e.category,
        getPayer(e.payerId)?.name || 'Unknown',
        e.amount,
        project.currency
      ];

      project.members.forEach(m => {
        const split = e.splits.find(s => s.userId === m.id);
        row.push(split ? split.amount : 0);
      });

      return row;
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers, ...rows].map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.name}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24">
      {sortedExpenses.length > 0 && (
        <div className="flex justify-end mb-2">
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-1.5 text-sm font-bold text-stone-400 bg-stone-100 px-4 py-2 rounded-full hover:bg-stone-200 transition-colors"
          >
            <LucideIcons.Download size={14} />
            匯出 CSV
          </button>
        </div>
      )}

      {sortedExpenses.length === 0 ? (
        <div className="text-center py-24 text-stone-400">
          <LucideIcons.Feather size={64} className="mx-auto mb-6 opacity-30" />
          <p className="font-serif text-2xl font-bold mb-2">目前沒有帳務資料</p>
          <p className="text-base">點擊右下角 + 按鈕開始記帳</p>
        </div>
      ) : (
        sortedExpenses.map(expense => {
          const payer = getPayer(expense.payerId);
          const animalColor = ANIMAL_PATHS[payer?.animal || 'bird'].color;
          const hasImages = expense.receiptImages && expense.receiptImages.length > 0;

          return (
            <div 
              key={expense.id} 
              onClick={() => onEdit(expense)}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-stone-100 flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
            >
              <div className="relative flex-shrink-0">
                 <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-600 border border-stone-100">
                   {getCategoryIcon(expense.category)}
                 </div>
                 {hasImages && (
                   <div className="absolute -bottom-1 -right-1 bg-stone-800 text-white rounded-full px-1.5 py-0.5 border-2 border-white flex items-center gap-0.5 shadow-sm">
                     <LucideIcons.Image size={10} />
                     <span className="text-[9px] font-bold">{expense.receiptImages?.length}</span>
                   </div>
                 )}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between items-baseline mb-1.5">
                  <h3 className="font-bold text-stone-800 text-lg truncate leading-tight">{expense.description}</h3>
                  <span className="font-serif font-bold text-stone-900 flex-shrink-0 pl-3 text-lg">
                    {formatCurrency(expense.amount, project.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-stone-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: animalColor }}
                    />
                    <span>{payer?.name} 付款</span>
                  </div>
                  <span>{new Date(expense.date).toLocaleDateString()}</span>
                </div>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(expense.id);
                }}
                className="p-2.5 text-stone-300 hover:text-red-400 hover:bg-stone-50 rounded-full transition-all flex-shrink-0 active:scale-90"
                title="刪除"
              >
                <LucideIcons.Trash2 size={20} />
              </button>
            </div>
          );
        })
      )}

      <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="確認刪除"
      >
          <div className="space-y-6 pt-4">
              <p className="text-stone-600 text-base leading-relaxed">
                  確定要刪除這筆帳務嗎？此操作無法復原。
              </p>
              <div className="flex gap-4">
                  <button 
                      onClick={() => setDeleteId(null)}
                      className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold text-base"
                  >
                      取消
                  </button>
                  <button 
                      onClick={() => {
                          if (deleteId) {
                              onDelete(deleteId);
                              setDeleteId(null);
                          }
                      }}
                      className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-bold text-base hover:bg-red-100 active:scale-95 transition-transform"
                  >
                      確認刪除
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default ExpenseList;