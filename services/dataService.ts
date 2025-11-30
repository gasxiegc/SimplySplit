
import { Project, User, Expense } from '../types';

const PROJECT_STORAGE_KEY = 'torisplit_projects_v2';
const USER_PREF_KEY = 'torisplit_user_pref';
const USER_PROFILE_KEY = 'torisplit_user_profile';

const INITIAL_PROJECTS: Project[] = [];

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DataService = {
  // Authentication Mock
  login: async (provider: string, email?: string, name?: string): Promise<User> => {
    await delay(600);
    // Try to get existing profile
    const savedProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (savedProfile) {
      return JSON.parse(savedProfile);
    }
    // Default new user
    const newUser: User = { 
      id: 'me_' + Date.now(), 
      name: name || '我', 
      email: email || '',
      animal: 'bird' 
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newUser));
    return newUser;
  },

  updateUserProfile: async (user: User): Promise<void> => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  },

  getUserProfile: (): User => {
    const saved = localStorage.getItem(USER_PROFILE_KEY);
    return saved ? JSON.parse(saved) : { id: 'me', name: '我', animal: 'bird' };
  },

  getProjects: async (): Promise<Project[]> => {
    await delay(300);
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_PROJECTS;
  },

  saveProjects: async (projects: Project[]): Promise<void> => {
    await delay(300);
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  },

  updateProject: async (updatedProject: Project): Promise<void> => {
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    const projects: Project[] = stored ? JSON.parse(stored) : [];
    const index = projects.findIndex(p => p.id === updatedProject.id);
    
    if (index !== -1) {
      projects[index] = updatedProject;
    } else {
      projects.push(updatedProject);
    }
    
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!stored) return;
    const projects: Project[] = JSON.parse(stored);
    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(filtered));
  },

  createDemoProject: async (): Promise<Project> => {
    const me = DataService.getUserProfile();
    const demo: Project = {
      id: 'demo_project_' + Date.now(),
      name: '大阪美食之旅 (範例)',
      currency: 'JPY',
      inviteCode: 'DEMO-123',
      startDate: Date.now(),
      endDate: Date.now() + 86400000 * 5,
      members: [
        me,
        { id: 'u2', name: '小雪', animal: 'rabbit' },
        { id: 'u3', name: '阿明', animal: 'fox' },
        { id: 'u4', name: '蓮', animal: 'owl' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 12000,
          description: '燒肉晚餐',
          payerId: 'u2',
          date: Date.now() - 10000000,
          category: 'food',
          splitMode: 'equal',
          splits: [
            { userId: me.id, amount: 3000 },
            { userId: 'u2', amount: 3000 },
            { userId: 'u3', amount: 3000 },
            { userId: 'u4', amount: 3000 },
          ]
        },
        {
          id: 'e2',
          amount: 2500,
          description: '計程車費',
          payerId: me.id,
          date: Date.now() - 5000000,
          category: 'transport',
          splitMode: 'equal',
          splits: [
            { userId: me.id, amount: 625 },
            { userId: 'u2', amount: 625 },
            { userId: 'u3', amount: 625 },
            { userId: 'u4', amount: 625 },
          ]
        },
        {
          id: 'e3',
          amount: 8000,
          description: '環球影城門票',
          payerId: 'u3',
          date: Date.now() - 2000000,
          category: 'entertainment',
          splitMode: 'custom',
          splits: [
            { userId: me.id, amount: 0 },
            { userId: 'u2', amount: 0 },
            { userId: 'u3', amount: 4000 },
            { userId: 'u4', amount: 4000 },
          ]
        }
      ]
    };
    
    // Save to storage
    const projects = await DataService.getProjects();
    projects.push(demo);
    await DataService.saveProjects(projects);
    return demo;
  },

  // User Preferences
  getTheme: (): string => {
    return localStorage.getItem(USER_PREF_KEY + '_theme') || 'default';
  },

  setTheme: (theme: string) => {
    localStorage.setItem(USER_PREF_KEY + '_theme', theme);
  }
};
