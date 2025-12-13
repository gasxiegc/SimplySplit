import React, { useState } from 'react';
import { Mail, User as UserIcon, Link } from 'lucide-react';
import { DataService } from '../services/dataService';

interface LoginScreenProps {
  onLogin: () => void;
  onImportDemo: () => void;
  pendingInviteCode?: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onImportDemo, pendingInviteCode }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStandardLogin = async () => {
    if (!name) {
      alert('請輸入您的名稱');
      return;
    }
    if (!email || !email.includes('@')) {
      alert('請輸入有效的 Email 以同步您的計畫');
      return;
    }

    setIsLoading(true);
    await DataService.login('email', email, name);
    setIsLoading(false);
    onLogin();
  };

  const handleDemo = async () => {
     setIsLoading(true);
     // Auto generate a demo email for quick try
     const demoEmail = `guest_${Date.now()}@simplesplit.demo`;
     await DataService.login('demo', demoEmail, '參觀者');
     onImportDemo();
     setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-kinari flex flex-col items-center justify-center p-6 text-stone-800">
      <div className="mb-8 text-center">
        <div className="w-24 h-24 bg-stone-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce-slow overflow-hidden">
           {/* Inline SVG Logo to ensure it renders correctly without external requests */}
           <svg className="w-16 h-16" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
             <g transform="translate(256, 256)">
                {/* Outer Ring */}
                <circle cx="0" cy="0" r="190" fill="none" stroke="#fcfaf5" strokeWidth="35" />
                {/* Split Line */}
                <path d="M-160 160 L160 -160" stroke="#4a403c" strokeWidth="50" strokeLinecap="square" />
                {/* Dots */}
                <circle cx="-70" cy="70" r="40" fill="#8fa892" />
                <circle cx="70" cy="-70" r="40" fill="#d68c76" />
             </g>
           </svg>
        </div>
        <h1 className="text-4xl font-serif font-bold mb-2 tracking-wide">Simple Split</h1>
        <p className="text-stone-500 font-sans tracking-widest">多人即時協作 • 分帳如羽毛般輕盈</p>
      </div>

      {pendingInviteCode && (
        <div className="w-full max-w-sm mb-6 bg-nature-yellow/20 border border-nature-yellow/50 p-4 rounded-2xl flex items-center gap-3">
          <div className="bg-nature-yellow/30 p-2 rounded-full text-stone-600">
            <Link size={20} />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-bold uppercase">您正受邀加入計畫</p>
            <p className="text-stone-800 font-bold font-serif">{pendingInviteCode}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-4 bg-white p-6 rounded-3xl shadow-lg shadow-stone-200/50 mb-6">
        <div className="space-y-3">
           <div className="bg-stone-50 flex items-center px-4 py-3 rounded-xl border border-stone-200 focus-within:border-stone-400 transition-colors">
              <UserIcon size={18} className="text-stone-400 mr-3" />
              <input 
                type="text" 
                placeholder="您的稱呼" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-transparent w-full outline-none text-stone-700 font-medium"
              />
           </div>
           <div className="bg-stone-50 flex items-center px-4 py-3 rounded-xl border border-stone-200 focus-within:border-stone-400 transition-colors">
              <Mail size={18} className="text-stone-400 mr-3" />
              <input 
                type="email" 
                placeholder="電子信箱 (作為同步帳號)" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent w-full outline-none text-stone-700"
              />
           </div>
        </div>

        <button 
          onClick={handleStandardLogin}
          disabled={isLoading}
          className="w-full bg-stone-800 text-stone-100 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors shadow-md disabled:opacity-70"
        >
          {isLoading ? (
            <span className="animate-pulse">登入中...</span>
          ) : (
            <span className="font-bold">
                {pendingInviteCode ? '登入並加入計畫' : '開始同步記帳'}
            </span>
          )}
        </button>
      </div>

      <div className="w-full max-w-sm flex justify-center">
        <button 
          onClick={handleDemo}
          disabled={isLoading}
          className="text-stone-400 hover:text-stone-600 text-xs py-2 underline underline-offset-4"
        >
          我想先試用看看 (自動建立試用帳號)
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;