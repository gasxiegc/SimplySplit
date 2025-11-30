
import { Project, User, Expense } from '../types';

// We simulate a "Cloud Database" using a single global key in LocalStorage.
// In a real app, this would be your Supabase/Firebase database.
const DB_PROJECTS_KEY = 'torisplit_db_projects_v3'; 
const DB_USERS_KEY = 'torisplit_db_users_v3';
const CURRENT_USER_EMAIL_KEY = 'torisplit_current_user_email';

// Simulate network delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DataService = {
  
  // --- AUTHENTICATION & USER MANAGEMENT ---

  // Login using Email as the key. 
  // If user exists in "Cloud DB", return profile. If not, create new.
  login: async (provider: string, email: string, name: string): Promise<User> => {
    await delay(500);
    
    // 1. Get All Users from "Cloud"
    const allUsersStr = localStorage.getItem(DB_USERS_KEY);
    const allUsers: User[] = allUsersStr ? JSON.parse(allUsersStr) : [];
    
    // 2. Check if user exists by email
    let user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create new user
      user = { 
        id: 'u_' + Date.now() + Math.random().toString(36).substr(2, 5), 
        name: name || email.split('@')[0], 
        email: email,
        animal: 'bird' 
      };
      allUsers.push(user);
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(allUsers));
    }

    // 3. Set Session
    localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
    return user;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
  },

  getCurrentUserEmail: (): string | null => {
    return localStorage.getItem(CURRENT_USER_EMAIL_KEY);
  },

  getUserProfile: (): User => {
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) throw new Error("Not logged in");

    const allUsers: User[] = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    const user = allUsers.find(u => u.email === email);
    
    // Fallback if session exists but DB was cleared
    return user || { id: 'temp', name: 'Guest', email: email, animal: 'bird' };
  },

  updateUserProfile: async (updatedUser: User): Promise<void> => {
    const allUsers: User[] = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    const index = allUsers.findIndex(u => u.email === updatedUser.email);
    
    if (index !== -1) {
      allUsers[index] = updatedUser;
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(allUsers));
    }
  },

  // --- PROJECT MANAGEMENT (MULTIPLAYER) ---

  // Fetch only projects where the current user's email is listed in 'memberEmails'
  getProjects: async (): Promise<Project[]> => {
    await delay(300);
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) return [];

    const allProjects: Project[] = JSON.parse(localStorage.getItem(DB_PROJECTS_KEY) || '[]');
    
    // FILTER: Only return projects I am a member of
    return allProjects.filter(p => 
      p.memberEmails.some(e => e.toLowerCase() === email.toLowerCase())
    );
  },

  // When saving/updating, we write to the Global DB
  saveProjects: async (projectsToSave: Project[]): Promise<void> => {
    // This method is legacy-ish. In a DB model, we usually update specific projects.
    // However, to keep compatibility with App.tsx logic that passes the full list:
    
    const allProjects: Project[] = JSON.parse(localStorage.getItem(DB_PROJECTS_KEY) || '[]');
    
    // We merge the updated projects into the global DB
    projectsToSave.forEach(updatedP => {
      const idx = allProjects.findIndex(p => p.id === updatedP.id);
      if (idx !== -1) {
        allProjects[idx] = updatedP;
      } else {
        allProjects.push(updatedP);
      }
    });

    localStorage.setItem(DB_PROJECTS_KEY, JSON.stringify(allProjects));
  },

  updateProject: async (updatedProject: Project): Promise<void> => {
    await delay(200);
    const allProjects: Project[] = JSON.parse(localStorage.getItem(DB_PROJECTS_KEY) || '[]');
    const index = allProjects.findIndex(p => p.id === updatedProject.id);
    
    if (index !== -1) {
      allProjects[index] = updatedProject;
    } else {
      allProjects.push(updatedProject);
    }
    
    localStorage.setItem(DB_PROJECTS_KEY, JSON.stringify(allProjects));
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const allProjects: Project[] = JSON.parse(localStorage.getItem(DB_PROJECTS_KEY) || '[]');
    const filtered = allProjects.filter(p => p.id !== projectId);
    localStorage.setItem(DB_PROJECTS_KEY, JSON.stringify(filtered));
  },

  // --- JOIN & INVITE LOGIC ---

  joinProjectByCode: async (code: string): Promise<Project | null> => {
    await delay(800);
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) throw new Error("Must be logged in to join");
    const me = DataService.getUserProfile();

    const allProjects: Project[] = JSON.parse(localStorage.getItem(DB_PROJECTS_KEY) || '[]');
    const project = allProjects.find(p => p.inviteCode === code);

    if (!project) return null;

    // Check if already a member
    if (!project.memberEmails.includes(email)) {
      project.memberEmails.push(email);
      // Also add the User object to members list if not there (for display)
      if (!project.members.find(m => m.email === email)) {
        project.members.push(me);
      }
      // Save back to DB
      await DataService.updateProject(project);
    }

    return project;
  },

  createProject: async (name: string, currency: string, startDate?: number, endDate?: number): Promise<Project> => {
    const me = DataService.getUserProfile();
    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      currency,
      startDate,
      endDate,
      inviteCode: Math.random().toString(36).substring(7).toUpperCase(),
      ownerEmail: me.email,
      memberEmails: [me.email],
      members: [me],
      expenses: []
    };
    
    await DataService.updateProject(newProject);
    return newProject;
  },

  createDemoProject: async (): Promise<Project> => {
    const me = DataService.getUserProfile();
    
    // Generate some fake friends
    const friend1 = { id: 'u_demo_1', name: '小雪', animal: 'rabbit', email: 'snow@demo.com' } as User;
    const friend2 = { id: 'u_demo_2', name: '阿明', animal: 'fox', email: 'ming@demo.com' } as User;
    
    const demo: Project = {
      id: 'demo_' + Date.now(),
      name: '東京跨年之旅 (範例)',
      currency: 'JPY',
      inviteCode: 'DEMO-888',
      startDate: Date.now(),
      endDate: Date.now() + 86400000 * 5,
      ownerEmail: me.email,
      memberEmails: [me.email, friend1.email, friend2.email],
      members: [me, friend1, friend2],
      expenses: [
        {
          id: 'e1',
          amount: 15000,
          description: '居酒屋聚餐',
          payerId: friend1.id,
          date: Date.now() - 10000000,
          category: 'food',
          splitMode: 'equal',
          splits: [
            { userId: me.id, amount: 5000 },
            { userId: friend1.id, amount: 5000 },
            { userId: friend2.id, amount: 5000 },
          ]
        }
      ]
    };
    
    await DataService.updateProject(demo);
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

const USER_PREF_KEY = 'torisplit_user_pref';
