
import React, { useMemo, useState } from 'react';
import { Project } from '../types';
import { calculateSettlements, formatCurrency } from '../utils/settlement';
import Avatar from './ui/Avatar';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CURRENCIES } from '../constants';

interface SettlementViewProps {
  project: Project;
}

const SettlementView: React.FC<SettlementViewProps> = ({ project }) => {
  const { transactions, balances } = useMemo(() => calculateSettlements(project), [project.expenses, project.members]);
  
  // Converter State
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [targetCurrency, setTargetCurrency] = useState<string>('TWD');

  const getUser = (id: string) => project.members.find(m => m.id === id);

  return (
    <div className="space-y-8 pb-24">
      
      {/* Settlement Plan with Integrated Converter */}
      <div className="bg-stone-100 rounded-3xl p-6">
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
                <h3 className="text-stone-500 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    帳務簡化結果
                </h3>
            </div>
            
            {/* Integrated Converter Inputs */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-200 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-stone-400 whitespace-nowrap">匯率: 1 {project.currency} =</span>
                    <input
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder="匯率"
                        className="w-full sm:w-24 bg-stone-50 rounded-lg px-3 py-1.5 text-sm font-bold text-stone-800 outline-none focus:ring-1 focus:ring-stone-300"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-400 whitespace-nowrap">換算為</span>
                    <select
                        value={targetCurrency}
                        onChange={(e) => setTargetCurrency(e.target.value)}
                        className="bg-stone-50 rounded-lg px-2 py-1.5 text-sm font-bold text-stone-800 outline-none focus:ring-1 focus:ring-stone-300"
                    >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center text-stone-400 py-8">
            <p>已全數結清！ 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx, idx) => {
              const from = getUser(tx.fromId);
              const to = getUser(tx.toId);
              
              const convertedAmount = exchangeRate && !isNaN(parseFloat(exchangeRate)) 
                ? tx.amount * parseFloat(exchangeRate) 
                : null;

              return (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <Avatar user={from!} size="sm" />
                        <span className="text-[10px] font-medium text-stone-600 max-w-[48px] truncate">{from?.name}</span>
                    </div>
                    <ArrowRight size={16} className="text-stone-300 mb-4" />
                    <div className="flex flex-col items-center gap-1">
                        <Avatar user={to!} size="sm" />
                        <span className="text-[10px] font-medium text-stone-600 max-w-[48px] truncate">{to?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-stone-400 mb-0.5">支付</div>
                    <div className="font-serif font-bold text-stone-800 text-lg">
                      {formatCurrency(tx.amount, project.currency)}
                    </div>
                    {convertedAmount !== null && (
                        <div className="text-sm font-bold text-nature-green mt-1">
                            ≈ {formatCurrency(convertedAmount, targetCurrency)}
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettlementView;
