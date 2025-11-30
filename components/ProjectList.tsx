

import React, { useState, useEffect } from 'react';
import { Project, ThemeType, User, AnimalType } from '../types';
import { THEMES, CURRENCIES, ANIMAL_PATHS, PRIMARY_CURRENCIES, SECONDARY_CURRENCIES } from '../constants';
import { DataService } from '../services/dataService';
import { Plus, ArrowRight, Settings, Trash2, LogOut, Palette, Edit2, Calendar, Share2, Copy, Check, User as UserIcon, Camera, X, Smartphone } from 'lucide-react';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, currency: string, startDate?: number, endDate?: number) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onLogout: () => void;
  currentTheme: ThemeType;
  onSetTheme: (theme: ThemeType) => void;
  onInstallPWA: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, onSelectProject, onCreateProject, onUpdateProject, onDeleteProject, onLogout, currentTheme, onSetTheme, onInstallPWA 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditProfile, setIsEditProfile] = useState(false);

  // Project Form State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [secondaryCurrency, setSecondaryCurrency] = useState(SECONDARY_CURRENCIES[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shareProject, setShareProject] = useState<Project | null>(null);

  // Deletion State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, name: string} | null>(null);

  // User Profile State
  const [userProfile, setUserProfile] = useState<User>(DataService.getUserProfile());

  useEffect(() => {
    if (editingProject) {
      setProjectName(editingProject.name);
      
      if (PRIMARY_CURRENCIES.includes(editingProject.currency)) {
          setCurrency(editingProject.currency);
      } else if (SECONDARY_CURRENCIES.includes(editingProject.currency)) {
          setCurrency('Other');
          setSecondaryCurrency(editingProject.currency);
      } else {
          setCurrency('Other');
          setSecondaryCurrency('Custom');
          setCustomCurrency(editingProject.currency);
      }
      
      setStartDate(editingProject.startDate ? new Date(editingProject.startDate).toISOString().split('T')[0] : '');
      setEndDate(editingProject.endDate ? new Date(editingProject.endDate).toISOString().split('T')[0] : '');
    } else {
      setProjectName('');
      setCurrency('TWD');
      setSecondaryCurrency(SECONDARY_CURRENCIES[0]);
      setCustomCurrency('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    }
  }, [editingProject, isModalOpen]);

  const handleSaveProject = () => {
    if (!projectName) return;
    let finalCurrency = currency;
    if (currency === 'Other') {
        if (secondaryCurrency === 'Custom') {
             finalCurrency = customCurrency.toUpperCase();
        } else {
             finalCurrency = secondaryCurrency;
        }
    }

    const start = startDate ? new Date(startDate).getTime() : undefined;
    const end = endDate ? new Date(endDate).getTime() : undefined;

    if (editingProject) {
      if (window.confirm('確定要儲存修改嗎？')) {
        onUpdateProject({
          ...editingProject,
          name: projectName,
          currency: finalCurrency,
          startDate: start,
          endDate: end
        });
        setIsModalOpen(false);
        setEditingProject(null);
      }
    } else {
      onCreateProject(projectName, finalCurrency, start, end);
      setIsModalOpen(false);
    }
  };

  const handleUpdateProfile = () => {
    DataService.updateUserProfile(userProfile);
    setIsEditProfile(false);
    // Ideally we would update all projects where user is member, but for MVP we update local state
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile(prev => ({ ...prev, customAvatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const themeConfig = THEMES[currentTheme];

  const ShareOptions = ({ project }: { project: Project }) => {
    const link = `https://torisplit.app/join/${project.inviteCode}`;
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

  return (
    <div className={`min-h-screen ${themeConfig.bg} ${themeConfig.text} p-6 transition-colors duration-500 pb-20`}>
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-1">我的計畫</h1>
          <p className="text-sm opacity-60">
            {userProfile.name}，今天想去哪裡？
          </p>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className={`p-1 pr-2 pl-2 rounded-full ${themeConfig.secondary} shadow-sm hover:opacity-80 transition-opacity flex items-center gap-2`}
        >
          <Avatar user={userProfile} size="sm" />
          <Settings size={18} className="opacity-70" />
        </button>
      </header>

      <div className="space-y-4">
        {projects.map(project => (
          <div 
            key={project.id}
            onClick={() => onSelectProject(project)}
            className={`group relative bg-white/80 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-stone-100 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-stone-800">{project.name}</h3>
               <div className="flex gap-1">
                 <button
                    onClick={(e) => { e.stopPropagation(); setShareProject(project); setIsShareModalOpen(true); }}
                    className="p-2 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
                 >
                   <Share2 size={18} />
                 </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); setEditingProject(project); setIsModalOpen(true); }}
                    className="p-2 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
                 >
                   <Edit2 size={18} />
                 </button>
                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmation({ id: project.id, name: project.name });
                    }}
                    className="p-2 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
                 >
                   <Trash2 size={18} />
                 </button>
               </div>
            </div>
            
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-xs text-stone-500 font-medium flex items-center gap-1 mb-1">
                     <Calendar size={12} />
                     {project.startDate ? new Date(project.startDate).toLocaleDateString() : '未設定日期'} 
                     {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                  </div>
                  <p className="text-xs text-stone-400">
                    {project.members.length} 成員 • {project.expenses.length} 筆帳務
                  </p>
               </div>
               <div className={`w-10 h-10 rounded-full ${themeConfig.secondary} flex items-center justify-center`}>
                  <ArrowRight size={20} className="text-stone-600" />
               </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
          className={`w-full py-6 rounded-3xl border-2 border-dashed border-stone-300 text-stone-400 flex items-center justify-center gap-2 hover:border-stone-400 hover:text-stone-500 transition-colors`}
        >
          <Plus size={24} />
          <span className="font-bold">建立新計畫</span>
        </button>
      </div>

      {/* Create/Edit Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? "編輯計畫" : "建立新計畫"}>
        <div className="space-y-6 pt-4">
          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">計畫名稱</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="例如：大阪美食之旅"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">開始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">結束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${currency === c ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
                >
                  {c}
                </button>
              ))}
              <button
                 onClick={() => setCurrency('Other')}
                 className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${currency === 'Other' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                 其他
              </button>
            </div>
            
            {currency === 'Other' && (
               <div className="flex gap-2">
                 <select
                   value={secondaryCurrency}
                   onChange={(e) => setSecondaryCurrency(e.target.value)}
                   className="bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800 font-bold"
                 >
                    {SECONDARY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Custom">自訂...</option>
                 </select>
                 {secondaryCurrency === 'Custom' && (
                    <input 
                       type="text" 
                       value={customCurrency}
                       onChange={(e) => setCustomCurrency(e.target.value)}
                       placeholder="輸入幣別代碼"
                       className="flex-1 bg-stone-100 rounded-xl px-4 py-3 outline-none text-stone-800 uppercase"
                       maxLength={3}
                    />
                 )}
               </div>
            )}
          </div>
          <button
            onClick={handleSaveProject}
            disabled={!projectName}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${!projectName ? 'bg-stone-300' : 'bg-stone-800'}`}
          >
            {editingProject ? '儲存變更' : '建立'}
          </button>
        </div>
      </Modal>

      {/* User Info (Formerly Settings) Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); setIsEditProfile(false); }} title="使用者資訊">
        {isEditProfile ? (
          <div className="space-y-6 pt-2">
             <div className="text-center">
                <div className="relative inline-block">
                   <Avatar user={userProfile} size="xl" />
                   <label className="absolute bottom-0 right-0 bg-stone-800 text-white p-2 rounded-full cursor-pointer hover:bg-stone-600">
                      <Camera size={16} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                   </label>
                   {userProfile.customAvatar && (
                      <button onClick={() => setUserProfile(p => ({...p, customAvatar: undefined}))} className="absolute -top-1 -right-1 bg-red-400 text-white p-1 rounded-full">
                         <X size={12} />
                      </button>
                   )}
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-stone-400 uppercase">名稱</label>
                <input 
                   value={userProfile.name}
                   onChange={e => setUserProfile(p => ({...p, name: e.target.value}))}
                   className="w-full border-b border-stone-200 py-2 font-serif text-lg text-stone-800 focus:outline-none focus:border-stone-500"
                />
             </div>

             <div>
                <label className="text-xs font-bold text-stone-400 uppercase mb-3 block">選擇頭像</label>
                <div className="grid grid-cols-4 gap-4">
                   {(Object.keys(ANIMAL_PATHS) as AnimalType[]).map(animal => (
                      <div 
                        key={animal}
                        onClick={() => setUserProfile(p => ({...p, animal, customAvatar: undefined}))}
                        className={`flex flex-col items-center gap-1 cursor-pointer p-2 rounded-xl transition-colors ${userProfile.animal === animal && !userProfile.customAvatar ? 'bg-stone-100 ring-2 ring-stone-200' : ''}`}
                      >
                         <svg viewBox="0 0 24 24" className="w-8 h-8" fill={ANIMAL_PATHS[animal].color}>
                            <path d={ANIMAL_PATHS[animal].path} />
                         </svg>
                      </div>
                   ))}
                </div>
             </div>

             <div className="flex gap-3 pt-4">
                <button onClick={() => setIsEditProfile(false)} className="flex-1 py-3 text-stone-500 font-medium">取消</button>
                <button onClick={handleUpdateProfile} className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-bold shadow-md">儲存</button>
             </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* User Profile Summary */}
            <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl cursor-pointer hover:bg-stone-100" onClick={() => setIsEditProfile(true)}>
               <div className="flex items-center gap-3">
                  <Avatar user={userProfile} size="md" />
                  <div>
                     <h3 className="font-bold text-stone-800">{userProfile.name}</h3>
                     <p className="text-xs text-stone-400">編輯個人資料</p>
                  </div>
               </div>
               <Edit2 size={16} className="text-stone-300" />
            </div>

            {/* PWA Install Button */}
            <button 
               onClick={onInstallPWA}
               className="w-full py-3 px-4 bg-stone-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
               <Smartphone size={18} />
               加入主畫面
            </button>

            {/* Theme Selector (2x2 Grid) */}
            <div>
              <h3 className="text-sm font-bold text-stone-400 uppercase mb-4 flex items-center gap-2">
                <Palette size={16} /> 主題風格
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(THEMES) as ThemeType[]).map(themeKey => (
                  <button
                    key={themeKey}
                    onClick={() => onSetTheme(themeKey)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2
                      ${currentTheme === themeKey ? 'border-stone-800 bg-stone-50' : 'border-transparent bg-stone-100 hover:bg-stone-200'}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-full border border-stone-200 ${THEMES[themeKey].bg} shadow-sm`}></div>
                    <span className="font-medium text-sm text-stone-700">{THEMES[themeKey].name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-100 pt-6">
              <button 
                onClick={onLogout}
                className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <LogOut size={18} />
                登出
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="分享計畫">
          {shareProject && <ShareOptions project={shareProject} />}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
          isOpen={!!deleteConfirmation} 
          onClose={() => setDeleteConfirmation(null)} 
          title="確認刪除"
      >
          <div className="space-y-4 pt-4">
              <p className="text-stone-600">
                  確定要刪除「<span className="font-bold text-stone-800">{deleteConfirmation?.name}</span>」嗎？<br/>
                  此操作無法復原，所有相關帳務資料將會消失。
              </p>
              <div className="flex gap-3">
                  <button 
                      onClick={() => setDeleteConfirmation(null)}
                      className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold"
                  >
                      取消
                  </button>
                  <button 
                      onClick={() => {
                          if (deleteConfirmation) {
                              onDeleteProject(deleteConfirmation.id);
                              setDeleteConfirmation(null);
                          }
                      }}
                      className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-100"
                  >
                      確認刪除
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default ProjectList;