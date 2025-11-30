
import { Project, User } from '../types';
import { supabase } from '../lib/supabaseClient';

const CURRENT_USER_EMAIL_KEY = 'simplesplit_current_user_email';
const USER_PREF_KEY = 'simplesplit_user_pref';

// Helper to get local session email (Supabase Auth is better, but keeping your logic for now)
const getSessionEmail = () => localStorage.getItem(CURRENT_USER_EMAIL_KEY);

export const DataService = {
  
  // --- AUTHENTICATION & USER MANAGEMENT ---

  login: async (provider: string, email: string, name: string): Promise<User> => {
    const cleanEmail = email.toLowerCase().trim();
    
    // 1. Check if user exists in Supabase
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error("Login error:", error);
    }

    let user: User;

    if (existingUser) {
      user = {
        id: existingUser.email, // Use email as ID for simplicity in this migration
        name: existingUser.name,
        email: existingUser.email,
        animal: existingUser.animal as any,
        customAvatar: existingUser.custom_avatar
      };
    } else {
      // Create new user
      user = { 
        id: cleanEmail, 
        name: name || cleanEmail.split('@')[0], 
        email: cleanEmail,
        animal: 'bird' 
      };

      const { error: insertError } = await supabase.from('users').insert({
        email: user.email,
        name: user.name,
        animal: user.animal,
        custom_avatar: user.customAvatar
      });
      
      if (insertError) console.error("Create user error:", insertError);
    }

    // Set Local Session
    localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
    
    // Update local cache for getUserProfile synchronous calls
    localStorage.setItem('simplesplit_user_cache_' + user.email, JSON.stringify(user));

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

    // Try to get from local cache first (for sync rendering)
    const cached = localStorage.getItem('simplesplit_user_cache_' + email);
    if (cached) return JSON.parse(cached);

    // Fallback default
    return { id: email, name: 'Loading...', email: email, animal: 'bird' };
  },

  updateUserProfile: async (updatedUser: User): Promise<void> => {
    // Update local cache
    localStorage.setItem('simplesplit_user_cache_' + updatedUser.email, JSON.stringify(updatedUser));

    // Update Supabase
    const { error } = await supabase
      .from('users')
      .update({
        name: updatedUser.name,
        animal: updatedUser.animal,
        custom_avatar: updatedUser.customAvatar
      })
      .eq('email', updatedUser.email);

    if (error) console.error("Update profile error:", error);
  },

  // --- PROJECT MANAGEMENT (Supabase) ---

  getProjects: async (): Promise<Project[]> => {
    const email = getSessionEmail();
    if (!email) return [];

    // Select projects where member_emails array contains the user's email
    const { data, error } = await supabase
      .from('projects')
      .select('json_content')
      .contains('member_emails', [email]);

    if (error) {
      console.error("Get projects error:", error);
      return [];
    }

    return data.map(row => row.json_content as Project);
  },

  updateProject: async (updatedProject: Project): Promise<void> => {
    // We store the entire Project object in the 'json_content' column
    // This preserves your exact data structure without complex relational mapping
    const { error } = await supabase
      .from('projects')
      .upsert({
        id: updatedProject.id,
        invite_code: updatedProject.inviteCode,
        owner_email: updatedProject.ownerEmail,
        member_emails: updatedProject.memberEmails,
        json_content: updatedProject,
        updated_at: new Date().toISOString()
      });

    if (error) console.error("Save project error:", error);
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) console.error("Delete project error:", error);
  },

  // --- JOIN & INVITE LOGIC ---

  joinProjectByCode: async (code: string): Promise<Project | null> => {
    const email = getSessionEmail();
    if (!email) throw new Error("Must be logged in to join");
    const me = DataService.getUserProfile();

    // Find project by invite code
    const { data, error } = await supabase
      .from('projects')
      .select('json_content')
      .eq('invite_code', code)
      .single();

    if (error || !data) {
      console.error("Join project error or not found:", error);
      return null;
    }

    const project = data.json_content as Project;

    // Check if already a member
    if (!project.memberEmails.includes(email)) {
      project.memberEmails.push(email);
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
    
    // Demo projects usually don't need to be saved to DB unless you want to,
    // but consistent behavior is better.
    await DataService.updateProject(demo);
    return demo;
  },

  // User Preferences (Keep in LocalStorage)
  getTheme: (): string => {
    return localStorage.getItem(USER_PREF_KEY + '_theme') || 'default';
  },

  setTheme: (theme: string) => {
    localStorage.setItem(USER_PREF_KEY + '_theme', theme);
  }
};
