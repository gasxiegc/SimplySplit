
import React, { useState } from 'react';
import { Project } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../utils/settlement';
import Avatar from './ui/Avatar';

interface StatsViewProps {
  project: Project;
}

const COLORS = ['#8fa892', '#d68c76', '#e8d48a', '#a38472', '#6d5e58', '#bca38f', '#4a403c'];

type ChartTab = 'category' | 'payer' | 'splitter';

const StatsView: React.FC<StatsViewProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('category');
  
  const totalSpent = project.expenses.reduce((sum, e) => sum + e.amount, 0);

  // Category Data
  const categoryData = (() => {
     const map = new Map<string, number>();
     project.expenses.forEach(e => {
        const key = e.category === 'other' ? (e.customCategory || '其他') : (CATEGORIES.find(c => c.id === e.category)?.label || e.category);
        map.set(key, (map.get(key) || 0) + e.amount);
     });
     return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  })();

  // Payer Data
  const payerData = project.members.map(member => {
    const totalPaid = project.expenses
      .filter(e => e.payerId === member.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: member.name, value: totalPaid, member };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // Splitter Data
  const splitterData = project.members.map(member => {
    let totalSplit = 0;
    project.expenses.forEach(e => {
       const split = e.splits.find(s => s.userId === member.id);
       if (split) totalSplit += split.amount;
    });
    return { name: member.name, value: totalSplit, member };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const getCurrentData = () => {
    switch(activeTab) {
      case 'category': return categoryData;
      case 'payer': return payerData;
      case 'splitter': return splitterData;
    }
  };

  const currentData = getCurrentData();

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="#6d5e58" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-[10px] font-bold"
      >
        {name}
      </text>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Total Card */}
      <div className="bg-stone-800 rounded-3xl p-6 text-stone-50 shadow-xl shadow-stone-200">
        <p className="text-stone-400 text-sm font-medium mb-1">總支出</p>
        <h2 className="text-4xl font-serif font-bold">
          {formatCurrency(totalSpent, project.currency)}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-200 p-1 rounded-xl">
        {([['category', '類別'], ['payer', '付款人'], ['splitter', '分攤人']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === key ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card 1: Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center justify-center">
        <h3 className="text-stone-400 font-bold uppercase tracking-wider text-xs mb-4 w-full">統計圖表</h3>
        {/* Fix: Added min-h-[256px] (h-64) to ensure explicit height exists before rendering */}
        <div className="w-full h-64 min-h-[256px]">
          {currentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  label={renderLabel}
                >
                  {currentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, project.currency)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 text-sm">
              尚無資料
            </div>
          )}
        </div>
      </div>

      {/* Card 2: List */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <h3 className="text-stone-400 font-bold uppercase tracking-wider text-xs mb-4">統計明細</h3>
        <div className="space-y-3">
          {currentData.map((d, i) => {
             const percent = totalSpent > 0 ? (d.value / totalSpent * 100).toFixed(1) : '0';
             return (
                <div key={i} className="flex items-center justify-between border-b border-stone-50 pb-2 last:border-0 last:pb-0">
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      {(d as any).member && <Avatar user={(d as any).member} size="sm" className="w-6 h-6" />}
                      <span className="text-stone-700 font-medium truncate max-w-[120px]">{d.name}</span>
                   </div>
                   <div className="text-right">
                      <div className="font-serif font-bold text-stone-800">{formatCurrency(d.value, project.currency)}</div>
                      <div className="text-xs text-stone-400 font-medium">{percent}%</div>
                   </div>
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatsView;
