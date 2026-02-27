import React, { useState, useEffect } from 'react';
import { X, Delete, Check, Plus, Minus, Divide, Asterisk } from 'lucide-react';

interface NumericCalculatorProps {
  initialValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
  currency: string;
  title?: string;
}

const NumericCalculator: React.FC<NumericCalculatorProps> = ({ initialValue, onConfirm, onClose, currency, title }) => {
  const [expression, setExpression] = useState(initialValue === '0' ? '' : initialValue || '');
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    calculateResult(expression);
  }, [expression]);

  const calculateResult = (expr: string) => {
    try {
      // Basic sanitization: only allow numbers and + - * / .
      const sanitized = expr.replace(/[^-+*/.0-9]/g, '');
      if (!sanitized) {
        setResult(null);
        return;
      }
      
      // Handle trailing operators for preview
      let toEval = sanitized;
      if (/[+\-*/.]$/.test(toEval)) {
        toEval = toEval.slice(0, -1);
      }

      // Use Function constructor as a safer alternative to eval for simple math
      // In a real production app, a proper math parser would be better
      const evalResult = new Function(`return ${toEval}`)();
      if (typeof evalResult === 'number' && isFinite(evalResult)) {
        setResult(evalResult);
      } else {
        setResult(null);
      }
    } catch (e) {
      setResult(null);
    }
  };

  const handleKey = (key: string) => {
    if (key === 'C') {
      setExpression('');
      return;
    }
    if (key === 'DEL') {
      setExpression(prev => prev.slice(0, -1));
      return;
    }
    if (key === '=') {
      if (result !== null) {
        setExpression(result.toString());
      }
      return;
    }

    // Prevent multiple operators in a row
    const lastChar = expression.slice(-1);
    const isOperator = /[+\-*/.]/.test(key);
    const lastIsOperator = /[+\-*/.]/.test(lastChar);

    if (isOperator && lastIsOperator) {
      setExpression(prev => prev.slice(0, -1) + key);
    } else {
      setExpression(prev => prev + key);
    }
  };

  const keys = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', 'C', '+'],
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-kinari w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Display Area */}
        <div className="p-6 bg-stone-800 text-white flex flex-col items-end justify-center gap-1">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">{title || `計算金額 (${currency})`}</span>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="text-stone-400 text-sm font-mono h-6 overflow-hidden text-ellipsis w-full text-right">
            {expression || '0'}
          </div>
          <div className="text-4xl font-serif text-nature-yellow flex items-baseline gap-2">
            <span className="text-xl opacity-50">{currency === 'JPY' ? '¥' : '$'}</span>
            {result !== null ? result.toLocaleString() : (parseFloat(expression) || 0).toLocaleString()}
          </div>
        </div>

        {/* Keypad */}
        <div className="p-4 grid grid-cols-4 gap-3 bg-kinari">
          {keys.map((row, i) => (
            <React.Fragment key={i}>
              {row.map((key) => {
                const isOperator = /[+\-*/]/.test(key);
                const isClear = key === 'C';
                return (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-90 flex items-center justify-center
                      ${isOperator ? 'bg-stone-200 text-stone-800' : 
                        isClear ? 'bg-nature-clay/20 text-nature-clay' : 'bg-white text-stone-800 shadow-sm border border-stone-100'}
                    `}
                  >
                    {key === '*' ? <Asterisk size={20} /> : 
                     key === '/' ? <Divide size={20} /> : 
                     key === '+' ? <Plus size={20} /> : 
                     key === '-' ? <Minus size={20} /> : key}
                  </button>
                );
              })}
            </React.Fragment>
          ))}

          {/* Bottom Row */}
          <button
            onClick={() => handleKey('DEL')}
            className="h-16 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center active:scale-90 transition-all"
          >
            <Delete size={24} />
          </button>
          
          <button
            onClick={() => handleKey('=')}
            className="h-16 rounded-2xl bg-stone-200 text-stone-800 font-bold text-xl flex items-center justify-center active:scale-90 transition-all"
          >
            =
          </button>

          <button
            onClick={() => onConfirm(result !== null ? result.toString() : (parseFloat(expression) || 0).toString())}
            className="col-span-2 h-16 rounded-2xl bg-stone-800 text-nature-yellow font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <Check size={20} />
            確認金額
          </button>
        </div>
      </div>
    </div>
  );
};

export default NumericCalculator;
