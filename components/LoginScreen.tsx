
import React, { useState } from 'react';
import { Bird, Mail, User as UserIcon } from 'lucide-react';
import { DataService } from '../services/dataService';

interface LoginScreenProps {
  onLogin: () => void;
  onImportDemo: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onImportDemo }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleStandardLogin = async () => {
    if (!name) {
      alert('請輸入名稱');
      return;
    }
    await DataService.login('email', email, name);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-kinari flex flex-col items-center justify-center p-6 text-stone-800">
      <div className="mb-8 text-center">
        <div className="w-24 h-24 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce-slow">
          <Bird size={48} className="text-stone-100" />
        </div>
        <h1 className="text-4xl font-serif font-bold mb-2 tracking-wide">ToriSplit</h1>
        <p className="text-stone-500 font-sans tracking-widest">分帳，如羽毛般輕盈。</p>
      </div>

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
                placeholder="電子信箱 (選填)" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent w-full outline-none text-stone-700"
              />
           </div>
        </div>

        <button 
          onClick={handleStandardLogin}
          className="w-full bg-stone-800 text-stone-100 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors shadow-md"
        >
          <span className="font-bold">進入記帳</span>
        </button>
      </div>

      <div className="w-full max-w-sm flex justify-center">
        <button 
          onClick={onImportDemo}
          className="text-stone-400 hover:text-stone-600 text-xs py-2 underline underline-offset-4"
        >
          我想先試用看看 (匯入範例專案)
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;