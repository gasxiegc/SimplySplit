
import { supabase } from './supabase';
import { Project, User } from '../types';

// DB Table Names
const TBL_PROFILES = 'profiles';
const TBL_PROJECTS = 'projects';

const CURRENT_USER_EMAIL_KEY = 'torisplit_current_user_email';

export const DataService = {
  
  // --- AUTHENTICATION & USER MANAGEMENT ---

  login: async (provider: string, email: string, name: string): Promise<User> => {
    // 1. Check if user exists in Supabase
    const { data: existingUser, error } = await supabase
      .from(TBL_PROFILES)
      .select('*')
      .eq('email', email)
      .single();

    let user: User;

    if (existingUser) {
      // User exists, merge latest name if provided, but keep other data
      user = existingUser.data;
      if (name && user.name !== name) {
          user.name = name;
          await DataService.updateUserProfile(user);
      }
    } else {
      // Create new user
      user = { 
        id: 'u_' + Date.now() + Math.random().toString(36).substr(2, 5), 
        name: name || email.split('@')[0], 
        email: email,
        animal: 'bird' 
      };
      
      const { error: insertError } = await supabase
        .from(TBL_PROFILES)
        .insert([{ email: email, name: user.name, data: user }]);
        
      if (insertError) throw insertError;
    }

    // Set Local Session
    localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
    return user;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
    supabase.auth.signOut(); // Best practice
  },

  getCurrentUserEmail: (): string | null => {
    return localStorage.getItem(CURRENT_USER_EMAIL_KEY);
  },

  // Get profile from DB (or fallback to local cache/guest if offline logic needed, 
  // but for now we fetch fresh)
  getUserProfile: async (): Promise<User> => {
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) throw new Error("Not logged in");

    const { data, error } = await supabase
      .from(TBL_PROFILES)
      .select('data')
      .eq('email', email)
      .single();

    if (error || !data) {
        // Fallback or Error
        return { id: 'temp', name: 'Guest', email: email, animal: 'bird' };
    }
    return data.data as User;
  },

  // Synchronous version for UI rendering (relies on component state usually)
  // This is a helper for legacy components expecting sync return. 
  // Ideally components should use async/await.
  // We will return a basic object based on localStorage email if simpler.
  getUserProfileSync: (): User => {
      const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
      if (!email) throw new Error("Not logged in");
      // Note: This might be stale compared to DB, but good for UI skeleton
      return { id: 'user', name: 'Loading...', email, animal: 'bird' }; 
  },

  updateUserProfile: async (updatedUser: User): Promise<void> => {
    const { error } = await supabase
      .from(TBL_PROFILES)
      .update({ name: updatedUser.name, data: updatedUser })
      .eq('email', updatedUser.email);
      
    if (error) throw error;
  },

  // --- PROJECT MANAGEMENT (REAL DB) ---

  getProjects: async (): Promise<Project[]> => {
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) return [];

    // Select projects where 'member_emails' array contains the email
    const { data, error } = await supabase
      .from(TBL_PROJECTS)
      .select('data')
      .contains('member_emails', [email]);

    if (error) {
        console.error("Error fetching projects:", error);
        return [];
    }

    return data.map((row: any) => row.data as Project);
  },

  updateProject: async (updatedProject: Project): Promise<void> => {
    // We store the full JSON object + helpful columns for querying
    const { error } = await supabase
      .from(TBL_PROJECTS)
      .upsert({ 
          id: updatedProject.id, 
          invite_code: updatedProject.inviteCode,
          member_emails: updatedProject.memberEmails,
          data: updatedProject 
      });

    if (error) throw error;
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const { error } = await supabase
      .from(TBL_PROJECTS)
      .delete()
      .eq('id', projectId);
      
    if (error) throw error;
  },

  // --- JOIN & INVITE LOGIC ---

  joinProjectByCode: async (code: string): Promise<Project | null> => {
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) throw new Error("Must be logged in to join");

    // 1. Find project by invite code
    const { data, error } = await supabase
      .from(TBL_PROJECTS)
      .select('*')
      .eq('invite_code', code)
      .single();

    if (error || !data) return null;

    const project = data.data as Project;

    // 2. Check if already a member
    if (!project.memberEmails.includes(email)) {
      // Fetch my full profile to add to members list
      const me = await DataService.getUserProfile();
      
      project.memberEmails.push(email);
      // Avoid duplicates in member object list
      if (!project.members.find(m => m.email === email)) {
        project.members.push(me);
      }

      // 3. Update DB
      await DataService.updateProject(project);
    }

    return project;
  },

  createProject: async (name: string, currency: string, startDate?: number, endDate?: number): Promise<Project> => {
    const me = await DataService.getUserProfile();
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
    const me = await DataService.getUserProfile();
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

  // --- REALTIME SUBSCRIPTIONS ---
  
  subscribeToProjects: (onUpdate: () => void) => {
    const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (!email) return null;

    // Listen to changes in the 'projects' table
    const subscription = supabase
      .channel('public:projects')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: TBL_PROJECTS }, 
        (payload) => {
          // In a production app, we would check if the payload.new.member_emails includes me
          // For now, we just trigger a refresh if ANY project changes to keep it reactive.
          // Optimization: Check payload.new['member_emails'].includes(email)
          onUpdate();
        }
      )
      .subscribe();

    return subscription;
  },

  checkSupabaseConnection: async (): Promise<boolean> => {
    const { data, error } = await supabase.from(TBL_PROFILES).select('count').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 is "head" request/no rows, which implies connection is OK
        console.error("Supabase check failed", error);
        return false;
    }
    return true;
  },

  // User Preferences (Keep local for theme)
  getTheme: (): string => {
    return localStorage.getItem('torisplit_user_pref_theme') || 'default';
  },

  setTheme: (theme: string) => {
    localStorage.setItem('torisplit_user_pref_theme', theme);
  }
};
