import React, { useState, useEffect, useCallback } from 'react';
import { Project, Expense, ThemeType, User } from './types';
import { DataService } from './services/dataService';
import { supabase } from './lib/supabaseClient'; // Import Supabase
import ExpenseList from './components/ExpenseList';
import ExpenseModal from './components/ExpenseModal';
import SettlementView from './components/SettlementView';
import StatsView from './components/StatsView';
import LoginScreen from './components/LoginScreen';
import ProjectList from './components/ProjectList';
import Modal from './components/ui/Modal';
import Avatar from './components/ui/Avatar';
import { Plus, List, PieChart, RefreshCw, Share2, ArrowLeft, Edit2, Copy, Check, Users, UserX, ShieldCheck } from 'lucide-react';
import { THEMES, PRIMARY_CURRENCIES, SECONDARY_CURRENCIES } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'projects' | 'dashboard'>('login');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'stats' | 'settle'>('expenses');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [theme, setTheme] = useState<ThemeType>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Edit Project State
  const [editProjName, setEditProjName] = useState('');
  const [editProjCurrency, setEditProjCurrency] = useState('');
  const [editProjStartDate, setEditProjStartDate] = useState('');
  const [editProjEndDate, setEditProjEndDate] = useState('');
  const [editProjCustomCurrency, setEditProjCustomCurrency] = useState('');
  const [editProjSecondaryCurrency, setEditProjSecondaryCurrency] = useState(SECONDARY_CURRENCIES[0]);

  // Handle URL Routing
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/join\/([a-zA-Z0-9-]+)/);
    
    if (match && match[1]) {
      const code = match[1];
      console.log("Detected Invite Code:", code);
      setPendingInviteCode(code);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const refreshData = async () => {
    if (DataService.getCurrentUserEmail()) {
      const data = await DataService.getProjects();
      setProjects(data);
      if (currentProject) {
        const updatedCurrent = data.find(p => p.id === currentProject.id);
        if (updatedCurrent) {
          setCurrentProject(updatedCurrent);
        }
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedTheme = DataService.getTheme();
      if (savedTheme && Object.keys(THEMES).includes(savedTheme)) {
        setTheme(savedTheme as ThemeType);
      } else {
        setTheme('default');
      }
      
      const email = DataService.getCurrentUserEmail();
      
      if (email && pendingInviteCode) {
         try {
           const joinedProject = await DataService.joinProjectByCode(pendingInviteCode);
           if (joinedProject) {
             setPendingInviteCode(null);
           }
         } catch (e) {
           console.error("Auto-join failed", e);
         }
      }

      try {
        if (email) {
            const profile = DataService.getUserProfile();
            setCurrentUser(profile);
            const data = await DataService.getProjects();
            setProjects(data);
            setView('projects');
        } else {
            setView('login');
        }
      } catch (e) {
          setView('login');
      }
      setLoading(false);
    };

    init();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const subscription = supabase
      .channel('public:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        refreshData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      supabase.removeChannel(subscription);
    };
  }, [pendingInviteCode]);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert("若要安裝，請使用瀏覽器選單中的「加入主畫面」功能 (iOS 請按分享按鈕)");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    
    if (pendingInviteCode) {
      try {
        await DataService.joinProjectByCode(pendingInviteCode);
        setPendingInviteCode(null);
      } catch (e) {
        console.error("Post-login join failed", e);
      }
    }

    const email = DataService.getCurrentUserEmail();
    if (email) setCurrentUser(DataService.getUserProfile());

    const data = await DataService.getProjects();
    setProjects(data);
    setView('projects');
    setLoading(false);
  };

  const handleImportDemo = async () => {
    setLoading(true);
    const demo = await DataService.createDemoProject();
    const data = await DataService.getProjects();
    setProjects(data);
    setCurrentProject(demo);
    setCurrentUser(DataService.getUserProfile());
    setView('dashboard');
    setLoading(false);
  };

  const handleLogout = () => {
    DataService.logout();
    setView('login');
    setCurrentProject(null);
    setCurrentUser(null);
    setPendingInviteCode(null);
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    DataService.setTheme(newTheme);
  };

  const handleCreateProject = async (name: string, currency: string, startDate?: number, endDate?: number) => {
    setLoading(true);
    const newProject = await DataService.createProject(name, currency, startDate, endDate);
    const updatedList = await DataService.getProjects(); 
    setProjects(updatedList);
    setCurrentProject(newProject);
    setView('dashboard');
    setLoading(false);
  };

  const handleSelectProject = async (p: Project) => {
    setCurrentProject(p);
    setView('dashboard');
    try {
      const cleaned = await DataService.cleanProjectLegacyImages(p);
      if (cleaned && cleaned.id === p.id) {
        setCurrentProject(cleaned);
        setProjects(prev => prev.map(proj => proj.id === cleaned.id ? cleaned : proj));
      }
    } catch (e) {
      console.error("Background auto-clean of legacy base64 images failed:", e);
    }
  };

  const handleUpdateProject = async (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (currentProject?.id === updated.id) setCurrentProject(updated);
    try {
      await DataService.updateProject(updated);
    } catch (err: any) {
      console.error("Failed to update project in cloud:", err);
      alert(`雲端同步失敗！請確認您的網路連線或 Supabase 設定。\n錯誤訊息: ${err.message || err.details || JSON.stringify(err)}`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    await DataService.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentProject || !currentUser) return;
    const isOwner = currentProject.ownerEmail === currentUser.email;
    if (!isOwner) return;

    const userToRemove = currentProject.members.find(m => m.id === userId);
    if (!userToRemove || userToRemove.email === currentProject.ownerEmail) {
      alert("無法移除計畫建立人");
      return;
    }

    if (window.confirm(`確定要將 ${userToRemove.name} 從計畫中移除嗎？`)) {
      const updatedMembers = currentProject.members.filter(m => m.id !== userId);
      const updatedEmails = currentProject.memberEmails.filter(email => email !== userToRemove.email);
      
      const updatedProject = {
        ...currentProject,
        members: updatedMembers,
        memberEmails: updatedEmails
      };
      
      setCurrentProject(updatedProject);
      await DataService.updateProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    }
  };

  const openEditProjectModal = () => {
    if (!currentProject) return;
    setEditProjName(currentProject.name);
    
    if (PRIMARY_CURRENCIES.includes(currentProject.currency)) {
        setEditProjCurrency(currentProject.currency);
    } else if (SECONDARY_CURRENCIES.includes(currentProject.currency)) {
        setEditProjCurrency('Other');
        setEditProjSecondaryCurrency(currentProject.currency);
    } else {
        setEditProjCurrency('Other');
        setEditProjSecondaryCurrency('Custom');
        setEditProjCustomCurrency(currentProject.currency);
    }

    setEditProjStartDate(currentProject.startDate ? new Date(currentProject.startDate).toISOString().split('T')[0] : '');
    setEditProjEndDate(currentProject.endDate ? new Date(currentProject.endDate).toISOString().split('T')[0] : '');
    setIsEditProjectModalOpen(true);
  };

  const saveProjectDetails = async () => {
    if (!currentProject || !editProjName) return;
    let finalCurrency = editProjCurrency;
    
    if (editProjCurrency === 'Other') {
        if (editProjSecondaryCurrency === 'Custom') {
             finalCurrency = editProjCustomCurrency.toUpperCase();
        } else {
             finalCurrency = editProjSecondaryCurrency;
        }
    }
    
    const start = editProjStartDate ? new Date(editProjStartDate).getTime() : undefined;
    const end = editProjEndDate ? new Date(editProjEndDate).getTime() : undefined;

    const updated = {
      ...currentProject,
      name: editProjName,
      currency: finalCurrency,
      startDate: start,
      endDate: end
    };
    await handleUpdateProject(updated);
    setIsEditProjectModalOpen(false);
  };

  const handleSaveExpense = async (amount: number, description: string, payerId: string, splits: any[], category: string, date: number, receiptImages?: string[], id?: string, customCategory?: string, notes?: string, splitMode?: 'equal' | 'custom') => {
    if (!currentProject) return;

    let updatedExpenses = [...currentProject.expenses];

    if (id) {
      updatedExpenses = updatedExpenses.map(e => e.id === id ? {
        ...e, amount, description, payerId, splits, category, date, receiptImages, splitMode: splitMode || e.splitMode, customCategory, notes
      } : e);
    } else {
      const newExpense: Expense = {
        id: `e_${Date.now()}`,
        amount,
        description,
        payerId,
        date,
        category,
        customCategory,
        splitMode: splitMode || 'equal', 
        splits,
        receiptImages,
        notes
      };
      updatedExpenses.push(newExpense);
    }

    const updatedProject = { ...currentProject, expenses: updatedExpenses };
    setCurrentProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditingExpense(null);

    try {
      await DataService.updateProject(updatedProject);
    } catch (err: any) {
      console.error("Failed to save expense to cloud:", err);
      alert(`雲端同步失敗！請確認您的網路連線或 Supabase 設定。\n錯誤說明: ${err.message || err.details || JSON.stringify(err)}`);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      expenses: currentProject.expenses.filter(e => e.id !== id)
    };
    setCurrentProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));

    try {
      await DataService.updateProject(updatedProject);
    } catch (err: any) {
      console.error("Failed to delete expense in cloud:", err);
      alert(`雲端刪除失敗！\n錯誤說明: ${err.message || err.details || JSON.stringify(err)}`);
    }
  };

  const ShareOptions = ({ project }: { project: Project }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/join/${project.inviteCode}`;

    const copyLink = () => {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
       <div className="space-y-6">
          <div className="text-center bg-stone-50 p-4 rounded-2xl">
             <p className="text-sm text-stone-500 mb-2">計畫邀請連結</p>
             <div onClick={copyLink} className="flex items-center gap-2 cursor-pointer bg-white border border-stone-200 px-3 py-3 rounded-xl mb-2 hover:border-stone-400 transition-colors">
                 <div className="flex-1 overflow-hidden">
                    <p className="text-stone-600 font-medium truncate text-sm text-left">{shareUrl}</p>
                 </div>
                 {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-stone-400" />}
             </div>
             <p className="text-xs text-stone-400">點擊上方連結即可複製，朋友點擊連結將自動加入。</p>
          </div>

          <div className="text-center">
             <p className="text-sm text-stone-500 mb-2">或輸入邀請代碼</p>
             <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-wider select-all">{project.inviteCode}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
             <button onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent('加入我的分帳計畫！點擊連結：' + shareUrl)}`)} className="bg-[#06C755] text-white py-3 rounded-xl font-bold hover:opacity-90">LINE 分享</button>
             <button onClick={() => window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`)} className="bg-[#0084FF] text-white py-3 rounded-xl font-bold hover:opacity-90">Messenger</button>
          </div>
       </div>
    );
  };

  const themeConfig = THEMES[theme];

  if (loading) {
    return (
      <div className="min-h-screen bg-kinari flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin"></div>
        <p className="text-stone-500 font-bold animate-pulse">正在同步雲端資料...</p>
      </div>
    );
  }

  if (view === 'login') {
    return (
        <LoginScreen 
            onLogin={handleLogin} 
            onImportDemo={handleImportDemo} 
            pendingInviteCode={pendingInviteCode}
        />
    );
  }

  if (view === 'projects') {
    return (
      <ProjectList 
        projects={projects} 
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
        currentTheme={theme}
        onSetTheme={handleThemeChange}
        onInstallPWA={handleInstallPWA}
      />
    );
  }

  if (!currentProject || !currentUser) return null;

  const isOwner = currentProject.ownerEmail === currentUser.email;

  return (
    <div className={`min-h-screen ${themeConfig.bg} ${themeConfig.text} font-sans selection:bg-stone-200 transition-colors duration-500`}>
      <header className={`sticky top-0 z-10 ${themeConfig.bg}/90 backdrop-blur-md border-b border-stone-100 px-4 py-5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('projects')} className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform">
            <ArrowLeft size={28} />
          </button>
          <div className="overflow-hidden">
            <h1 className="font-serif font-bold text-2xl leading-tight truncate max-w-[160px]">{currentProject.name}</h1>
            <p className="text-xs opacity-60 font-medium tracking-wide">
              {currentProject.members.length} 成員 • {currentProject.currency}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
           <button 
             onClick={() => setIsMembersModalOpen(true)}
             className="p-2.5 rounded-full hover:bg-black/5 transition-colors text-stone-600 active:scale-90"
             title="管理成員"
           >
             <Users size={24} />
           </button>
           <button 
             onClick={openEditProjectModal}
             className="p-2.5 rounded-full hover:bg-black/5 transition-colors text-stone-600 active:scale-90"
             title="編輯計畫內容"
           >
             <Edit2 size={24} />
           </button>
           <button 
             onClick={() => setIsShareModalOpen(true)}
             className="p-2.5 rounded-full hover:bg-black/5 transition-colors text-stone-600 active:scale-90"
             title="邀請成員"
           >
             <Share2 size={24} />
           </button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-3xl mx-auto min-h-[80vh]">
        {activeTab === 'expenses' && (
          <ExpenseList 
            project={currentProject} 
            onDelete={handleDeleteExpense} 
            onEdit={(e) => { setEditingExpense(e); setIsAddModalOpen(true); }}
          />
        )}
        {activeTab === 'stats' && (
          <StatsView project={currentProject} />
        )}
        {activeTab === 'settle' && (
          <SettlementView project={currentProject} />
        )}
      </main>

      {/* 放大新增按鈕 */}
      <button
        onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }}
        className={`fixed right-6 bottom-28 z-30 w-16 h-16 ${themeConfig.primary} text-white rounded-full shadow-2xl shadow-stone-400 flex items-center justify-center hover:scale-110 transition-transform active:scale-90`}
        aria-label="Add Expense"
      >
        <Plus size={32} />
      </button>

      {/* 底部導覽優化：放大圖示與文字 */}
      <nav className={`fixed bottom-0 left-0 right-0 ${themeConfig.secondary} border-t border-stone-100 px-6 py-4 flex justify-around items-center z-20 pb-safe`}>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'expenses' ? themeConfig.text : 'text-stone-400'}`}
        >
          <List size={28} strokeWidth={activeTab === 'expenses' ? 2.5 : 2} />
          <span className={`text-xs ${activeTab === 'expenses' ? 'font-bold' : 'font-medium'}`}>帳務</span>
        </button>

        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'stats' ? themeConfig.text : 'text-stone-400'}`}
        >
          <PieChart size={28} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
          <span className={`text-xs ${activeTab === 'stats' ? 'font-bold' : 'font-medium'}`}>統計</span>
        </button>

        <button 
          onClick={() => setActiveTab('settle')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'settle' ? themeConfig.text : 'text-stone-400'}`}
        >
          <RefreshCw size={28} strokeWidth={activeTab === 'settle' ? 2.5 : 2} />
          <span className={`text-xs ${activeTab === 'settle' ? 'font-bold' : 'font-medium'}`}>結算</span>
        </button>
      </nav>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setEditingExpense(null); }}
        title={editingExpense ? "編輯帳務" : "新增帳務"}
        fullScreenMobile
      >
        <ExpenseModal 
          project={currentProject} 
          onClose={() => { setIsAddModalOpen(false); setEditingExpense(null); }}
          onSave={handleSaveExpense}
          editingExpense={editingExpense}
        />
      </Modal>

      <Modal 
        isOpen={isEditProjectModalOpen} 
        onClose={() => setIsEditProjectModalOpen(false)} 
        title="編輯計畫內容"
      >
        <div className="space-y-6 pt-4">
          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">計畫名稱</label>
            <input
              type="text"
              value={editProjName}
              onChange={(e) => setEditProjName(e.target.value)}
              placeholder="例如：大阪美食之旅"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">開始日期</label>
                <input
                  type="date"
                  value={editProjStartDate}
                  onChange={(e) => setEditProjStartDate(e.target.value)}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">結束日期</label>
                <input
                  type="date"
                  value={editProjEndDate}
                  onChange={(e) => setEditProjEndDate(e.target.value)}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800"
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">主要幣別</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRIMARY_CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => setEditProjCurrency(c)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${editProjCurrency === c ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
                >
                  {c}
                </button>
              ))}
              <button
                 onClick={() => setEditProjCurrency('Other')}
                 className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${editProjCurrency === 'Other' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                 其他
              </button>
            </div>
            
            {editProjCurrency === 'Other' && (
               <div className="flex gap-2">
                 <select
                   value={editProjSecondaryCurrency}
                   onChange={(e) => setEditProjSecondaryCurrency(e.target.value)}
                   className="bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800 font-bold"
                 >
                    {SECONDARY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Custom">自訂...</option>
                 </select>
                 {editProjSecondaryCurrency === 'Custom' && (
                    <input 
                       type="text" 
                       value={editProjCustomCurrency}
                       onChange={(e) => setEditProjCustomCurrency(e.target.value)}
                       placeholder="輸入幣別代碼"
                       className="flex-1 bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800 uppercase"
                       maxLength={3}
                    />
                 )}
               </div>
            )}
          </div>
          <button
            onClick={saveProjectDetails}
            disabled={!editProjName}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${!editProjName ? 'bg-stone-300' : 'bg-stone-800'}`}
          >
            儲存變更
          </button>
        </div>
      </Modal>

      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="分享計畫">
          {currentProject && <ShareOptions project={currentProject} />}
      </Modal>

      <Modal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} title="參與成員">
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{currentProject.members.length} 位成員</span>
            </div>
            <div className="space-y-3">
              {currentProject.members.map(member => {
                const isMemberOwner = member.email === currentProject.ownerEmail;
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Avatar user={member} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800 text-base">{member.name}</span>
                          {isMemberOwner && (
                            <span className="flex items-center gap-1 bg-stone-800 text-stone-50 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                              <ShieldCheck size={10} />
                              建立人
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-stone-400">{member.email}</p>
                      </div>
                    </div>
                    
                    {isOwner && !isMemberOwner && (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                        title="從計畫中移除"
                      >
                        <UserX size={22} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={() => { setIsMembersModalOpen(false); setIsShareModalOpen(true); }}
              className="w-full mt-4 py-4 border-2 border-dashed border-stone-200 text-stone-400 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:border-stone-400 hover:text-stone-500 transition-all"
            >
              <Plus size={20} />
              邀請更多成員
            </button>
          </div>
      </Modal>

    </div>
  );
};

export default App;