

import React, { useState, useEffect } from 'react';
import { Project, Expense, ThemeType } from './types';
import { DataService } from './services/dataService';
import ExpenseList from './components/ExpenseList';
import ExpenseModal from './components/ExpenseModal';
import SettlementView from './components/SettlementView';
import StatsView from './components/StatsView';
import LoginScreen from './components/LoginScreen';
import ProjectList from './components/ProjectList';
import Modal from './components/ui/Modal';
import { Plus, List, PieChart, RefreshCw, Share2, ArrowLeft, Edit2, Copy, Check } from 'lucide-react';
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [theme, setTheme] = useState<ThemeType>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Edit Project State
  const [editProjName, setEditProjName] = useState('');
  const [editProjCurrency, setEditProjCurrency] = useState('');
  const [editProjStartDate, setEditProjStartDate] = useState('');
  const [editProjEndDate, setEditProjEndDate] = useState('');
  const [editProjCustomCurrency, setEditProjCustomCurrency] = useState('');
  const [editProjSecondaryCurrency, setEditProjSecondaryCurrency] = useState(SECONDARY_CURRENCIES[0]);

  // Initialization
  useEffect(() => {
    const init = async () => {
      const savedTheme = DataService.getTheme();
      // Ensure the saved theme still exists in our updated THEMES definition
      if (savedTheme && Object.keys(THEMES).includes(savedTheme)) {
        setTheme(savedTheme as ThemeType);
      } else {
        setTheme('default');
      }
      
      const data = await DataService.getProjects();
      setProjects(data);
      setLoading(false);
    };
    init();

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

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
    const data = await DataService.getProjects();
    setProjects(data);
    setView('projects');
    setLoading(false);
  };

  const handleImportDemo = async () => {
    setLoading(true);
    await DataService.login('demo', 'demo@test.com', 'Demo User');
    const demo = await DataService.createDemoProject();
    setProjects(prev => [...prev, demo]);
    setCurrentProject(demo);
    setView('dashboard');
    setLoading(false);
  };

  const handleLogout = () => {
    setView('login');
    setCurrentProject(null);
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    DataService.setTheme(newTheme);
  };

  const handleCreateProject = async (name: string, currency: string, startDate?: number, endDate?: number) => {
    const me = DataService.getUserProfile();
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name,
      currency,
      startDate,
      endDate,
      inviteCode: Math.random().toString(36).substring(7).toUpperCase(),
      members: [me],
      expenses: []
    };
    const updated = [...projects, newProject];
    setProjects(updated);
    await DataService.saveProjects(updated);
    setCurrentProject(newProject);
    setView('dashboard');
  };

  const handleUpdateProject = async (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (currentProject?.id === updated.id) setCurrentProject(updated);
    await DataService.updateProject(updated);
  };

  const handleDeleteProject = async (id: string) => {
    await DataService.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
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

  const handleSaveExpense = async (amount: number, description: string, payerId: string, splits: any[], category: string, date: number, receiptImage?: string, id?: string, customCategory?: string) => {
    if (!currentProject) return;

    let updatedExpenses = [...currentProject.expenses];

    if (id) {
      updatedExpenses = updatedExpenses.map(e => e.id === id ? {
        ...e, amount, description, payerId, splits, category, date, receiptImage, splitMode: e.splitMode, customCategory
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
        splitMode: 'custom', 
        splits,
        receiptImage
      };
      updatedExpenses.push(newExpense);
    }

    const updatedProject = { ...currentProject, expenses: updatedExpenses };
    setCurrentProject(updatedProject);
    await DataService.updateProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      expenses: currentProject.expenses.filter(e => e.id !== id)
    };
    setCurrentProject(updatedProject);
    await DataService.updateProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const ShareOptions = ({ project }: { project: Project }) => {
    // Use window.location.origin to support Vercel deployment URLs dynamically
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://torisplit.app';
    const link = `${origin}/join/${project.inviteCode}`;
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
       <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-stone-100 rounded-xl">
             <span className="flex-1 text-xs text-stone-500 truncate font-mono">{link}</span>
             <button onClick={copyToClipboard} className="p-2 bg-white rounded-lg shadow-sm">
                {copied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}
             </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(project.name + ' ' + link)}`)} className="bg-[#06C755] text-white py-3 rounded-xl font-bold">LINE 分享</button>
             <button onClick={() => window.open(`fb-messenger://share/?link=${encodeURIComponent(link)}`)} className="bg-[#0084FF] text-white py-3 rounded-xl font-bold">Messenger</button>
          </div>
       </div>
    );
  };

  const themeConfig = THEMES[theme];

  if (loading) {
    return (
      <div className="min-h-screen bg-kinari flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'login') {
    return <LoginScreen onLogin={handleLogin} onImportDemo={handleImportDemo} />;
  }

  if (view === 'projects') {
    return (
      <ProjectList 
        projects={projects} 
        onSelectProject={(p) => { setCurrentProject(p); setView('dashboard'); }}
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

  if (!currentProject) return null;

  return (
    <div className={`min-h-screen ${themeConfig.bg} ${themeConfig.text} font-sans selection:bg-stone-200 transition-colors duration-500`}>
      
      {/* Header */}
      <header className={`sticky top-0 z-10 ${themeConfig.bg}/90 backdrop-blur-md border-b border-stone-100 px-4 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('projects')} className="p-2 -ml-2 rounded-full hover:bg-black/5">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="font-serif font-bold text-xl leading-tight">{currentProject.name}</h1>
            <p className="text-[10px] opacity-60 font-medium tracking-wide">
              {currentProject.members.length} 成員 • {currentProject.currency}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={openEditProjectModal}
             className="p-2 rounded-full hover:bg-black/5 transition-colors text-stone-600"
             title="編輯計畫內容"
           >
             <Edit2 size={20} />
           </button>
           <button 
             onClick={() => setIsShareModalOpen(true)}
             className="p-2 rounded-full hover:bg-black/5 transition-colors text-stone-600"
           >
             <Share2 size={20} />
           </button>
        </div>
      </header>

      {/* Main Content */}
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

      {/* Add Button (Floating) */}
      <button
        onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }}
        className={`fixed right-6 bottom-24 z-30 w-14 h-14 ${themeConfig.primary} text-white rounded-full shadow-xl shadow-stone-300 flex items-center justify-center hover:scale-110 transition-transform active:scale-90`}
        aria-label="Add Expense"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Nav */}
      <nav className={`fixed bottom-0 left-0 right-0 ${themeConfig.secondary} border-t border-stone-100 px-6 py-3 flex justify-around items-center z-20 pb-safe`}>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'expenses' ? themeConfig.text : 'text-stone-400'}`}
        >
          <List size={24} strokeWidth={activeTab === 'expenses' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">帳務</span>
        </button>

        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'stats' ? themeConfig.text : 'text-stone-400'}`}
        >
          <PieChart size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">統計</span>
        </button>

        <button 
          onClick={() => setActiveTab('settle')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settle' ? themeConfig.text : 'text-stone-400'}`}
        >
          <RefreshCw size={24} strokeWidth={activeTab === 'settle' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">結算</span>
        </button>
      </nav>

      {/* Add/Edit Expense Modal */}
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

      {/* Edit Project Details Modal */}
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

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="分享計畫">
          {currentProject && <ShareOptions project={currentProject} />}
      </Modal>

    </div>
  );
};

export default App;