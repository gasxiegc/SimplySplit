
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
  const [loading, setLoading] = useState(false);

  const handleEnterApp = async () => {
    if (!name) {
      alert('請輸入名稱');
      return;
    }
    setLoading(true);
    try {
      // If email is provided, we use the Email Sync strategy (Sign Up / Sign In with default password)
      // If no email, we use Anonymous Login
      const provider = email ? 'email' : 'anonymous';
      await DataService.login(provider, email, name);
      onLogin();
    } catch (e: any) {
      console.error(e);
      let msg = '登入失敗';
      if (e.message?.includes('Anonymous sign-ins are disabled')) {
        msg = 'Supabase 設定錯誤：請啟用 Anonymous Sign-in 或輸入 Email';
      } else if (e.message?.includes('invalid login credentials')) {
        msg = '登入失敗：請確認帳號資訊';
      } else {
        msg = `登入失敗: ${e.message}`;
      }
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderLogin = async (provider: 'google' | 'line') => {
      setLoading(true);
      try {
          await DataService.loginWithOAuth(provider);
          // Redirect happens automatically
      } catch (e: any) {
          console.error(e);
          let msg = e.message || '登入錯誤';
          
          // Specific handling for "validation_failed" or "provider is not enabled"
          // This occurs when the provider is not enabled in the Supabase Dashboard
          if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled') || (e.code === 'validation_failed')) {
              msg = `【 登入功能未啟用 】\n\n您正在使用的 Supabase 專案尚未開啟 ${provider.toUpperCase()} 登入功能。\n\n請前往 Supabase Dashboard -> Authentication -> Providers\n1. 啟用 ${provider}\n2. 設定 Client ID / Secret\n3. 儲存設定後重試。`;
          }
          
          alert(msg);
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-kinari flex flex-col items-center justify-center p-6 text-stone-800">
      <div className="mb-8 text-center">
        <div className="w-24 h-24 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce-slow">
          <Bird size={48} className="text-stone-100" />
        </div>
        <h1 className="text-4xl font-serif font-bold mb-2 tracking-wide">Simply Split</h1>
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
                placeholder="電子信箱 (若要同步請填寫)" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent w-full outline-none text-stone-700"
              />
           </div>
        </div>

        <button 
          onClick={handleEnterApp}
          disabled={loading}
          className={`w-full bg-stone-800 text-stone-100 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md
            ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-stone-700'}
          `}
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
             <span className="font-bold">{email ? '同步 / 登入' : '訪客進入'}</span>
          )}
        </button>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-300"></div>
            <span className="flex-shrink-0 mx-4 text-stone-400 text-xs">快速登入</span>
            <div className="flex-grow border-t border-stone-300"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleProviderLogin('google')}
            className="w-full bg-white border border-stone-200 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            <span className="font-medium text-sm text-stone-600">Google</span>
          </button>

          <button 
            onClick={() => handleProviderLogin('line')}
            className="w-full bg-[#06C755] text-white py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#05b34c] transition-colors shadow-sm"
          >
             {/* Simple Line Icon SVG */}
             <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.6 12c0-5.3-4.1-9.7-10.6-9.7-5.4 0-10.6 3.6-10.6 9.7 0 4.6 3.3 8.3 7.8 9.3.4.1.9.3 1 .8v2c0 .3-.1.6-.2.8-.2.2-.4.4-.3.7 0 .4.4.8.8.5 4.5-2.6 7.4-6.3 7.4-6.3 2.8-1.7 4.7-4.2 4.7-6.9zM12 16.5c-4.9 0-8.9-3.2-8.9-7.2S7.1 2.1 12 2.1s8.9 3.2 8.9 7.2-4 7.2-8.9 7.2zm-2.8-4.5h-1.6v-5c0-.2-.2-.4-.4-.4h-.8c-.2 0-.4.2-.4.4v6.6c0 .2.2.4.4.4h2.8c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4zm3.6-2.5h-1.6v-2.9c0-.2-.2-.4-.4-.4h-.8c-.2 0-.4.2-.4.4v6.6c0 .2.2.4.4.4h2.8c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4zm3.7-2.9h-1.6v2.1l-2.4-3.1c-.1-.1-.2-.2-.4-.2h-.9c-.2 0-.4.2-.4.4v6.6c0 .2.2.4.4.4h.8c.2 0 .4-.2.4-.4v-2.1l2.4 3.1c.1.2.2.2.4.2h.9c.2 0 .4-.2.4-.4V7c0-.2-.2-.4-.4-.4zm3.6 5.4h-2.1v-1.3h2.1c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4h-2.1V7.8h2.1c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4h-3.3c-.2 0-.4.2-.4.4v6.6c0 .2.2.4.4.4h3.3c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4z"/>
             </svg>
            <span className="font-bold text-lg">LINE</span>
          </button>
        </div>

        <button 
          onClick={onImportDemo}
          className="w-full mt-4 text-stone-400 hover:text-stone-600 text-xs py-2 underline underline-offset-4"
        >
          我想先試用看看 (匯入範例專案)
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
