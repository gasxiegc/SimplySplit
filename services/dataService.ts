
import { Project, User, Expense } from '../types';
import { supabase } from './supabase';

const USER_PREF_KEY = 'torisplit_user_pref';
const DEFAULT_SYNC_PASSWORD = 'SimplySplitDefaultPassword123!';

// Helper to map DB profile (snake_case) to App User (camelCase)
const mapProfile = (p: any): User => ({
  id: p.id,
  name: p.name || 'Unknown',
  email: p.email,
  animal: p.animal || 'bird',
  customAvatar: p.custom_avatar
});

// Helper to map DB expense (snake_case) to App Expense (camelCase)
const mapExpense = (e: any): Expense => ({
  id: e.id,
  amount: e.amount,
  description: e.description,
  payerId: e.payer_id,
  date: e.date,
  category: e.category,
  customCategory: e.custom_category,
  splitMode: e.split_mode,
  splits: typeof e.splits === 'string' ? JSON.parse(e.splits) : e.splits,
  receiptImage: e.receipt_image
});

export const DataService = {
  // Trigger OAuth Login (Google / LINE)
  loginWithOAuth: async (provider: 'google' | 'line'): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  },

  // Authentication Router
  login: async (provider: string, email?: string, name?: string): Promise<User | null> => {
    try {
      // 1. Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      let userId = session?.user?.id;

      if (!userId) {
        // If 'auto' login (app start) and no session, return null to show login screen
        if (provider === 'auto') return null;

        if (provider === 'email' && email) {
            // === EMAIL SYNC STRATEGY ===
            // Try to Sign Up first (Auto Create). If user exists, fall back to Sign In.
            // We use a default password to allow "Email as ID" behavior without inbox checking for the demo.
            
            // Attempt Sign Up
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: DEFAULT_SYNC_PASSWORD,
                options: { data: { full_name: name } }
            });

            if (signUpError) {
                // If user already exists, try Sign In
                if (signUpError.message.includes('already registered') || signUpError.status === 400 || signUpError.status === 422) {
                     const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: DEFAULT_SYNC_PASSWORD
                     });
                     
                     if (signInError) throw signInError;
                     userId = signInData.user?.id;
                } else {
                    throw signUpError;
                }
            } else {
                // Sign Up Successful (or waiting for confirmation if enabled in Supabase)
                if (!signUpData.session && !signUpData.user) {
                     throw new Error("Login failed. Please check if 'Confirm Email' is disabled in Supabase.");
                }
                userId = signUpData.user?.id;
            }

        } else if (provider === 'anonymous') {
            // === ANONYMOUS STRATEGY ===
            try {
                const { data: authData, error } = await supabase.auth.signInAnonymously();
                if (error) throw error;
                userId = authData.user?.id;
            } catch (authError: any) {
                // Fallback for when Anonymous is disabled: Create a shadow guest account
                if (authError.message?.includes('Anonymous sign-ins are disabled') || authError.code === 'signup_disabled') {
                    const randomId = Math.random().toString(36).substring(2, 10);
                    const timestamp = Date.now();
                    const dummyEmail = `guest_${timestamp}_${randomId}@simplysplit.app`;
                    const dummyPassword = `secret_${timestamp}_${randomId}`;

                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email: dummyEmail,
                        password: dummyPassword,
                    });

                    if (signUpError) throw signUpError;
                    userId = signUpData.user?.id;
                } else {
                    throw authError;
                }
            }
        }
      }

      if (!userId) throw new Error("Login failed: No user ID generated.");

      // 3. Upsert Profile (Sync Name)
      const timestamp = new Date().toISOString();
      
      // If we have a name (from login screen), update it. 
      // If auto-login, we might just want to fetch.
      if (name) {
         const userData = {
            id: userId,
            name: name,
            email: email || session?.user?.email || null,
            updated_at: timestamp
         };

         const { error: profileError } = await supabase
          .from('profiles')
          .upsert(userData, { onConflict: 'id' });
         
         if (profileError) {
             // If profile table missing or RLS error, ignore but log
             console.error('Error updating profile:', profileError);
         }
         return { ...userData, animal: 'bird' } as User; // Default animal if we just created
      } 
      
      // Fetch existing profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (profile) return mapProfile(profile);
      
      // Fallback if profile missing
      return { id: userId, name: name || 'User', animal: 'bird' };

    } catch (error) {
      console.error("Login service error:", error);
      if (provider === 'auto') return null;
      throw error;
    }
  },

  updateUserProfile: async (user: User): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: user.name,
        animal: user.animal,
        custom_avatar: user.customAvatar,
        email: user.email
      })
      .eq('id', user.id);
    
    if (error) console.error('Update profile error:', error);
  },

  getUserProfile: (): User => {
    return { id: 'loading', name: '載入中...', animal: 'bird' };
  },

  getProjects: async (): Promise<Project[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // 1. Get Project IDs where current user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memberError || !memberRows) return [];
      
      const projectIds = memberRows.map(r => r.project_id);
      if (projectIds.length === 0) return [];

      // 2. Fetch Projects with their members and expenses
      const { data: projectsData, error: projError } = await supabase
        .from('projects')
        .select(`
          *,
          expenses (*),
          members:project_members (
            profiles (*)
          )
        `)
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projError) {
        console.error('Fetch projects error:', projError);
        return [];
      }

      // 3. Transform Data to match Typescript Interface
      return projectsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        currency: p.currency,
        inviteCode: p.invite_code,
        startDate: p.start_date,
        endDate: p.end_date,
        members: p.members.map((m: any) => mapProfile(m.profiles)),
        expenses: (p.expenses || []).map(mapExpense)
      }));
    } catch (e) {
      console.error("Get projects error", e);
      return [];
    }
  },

  saveProjects: async (projects: Project[]): Promise<void> => {
     // No-op: Supabase saves individually
  },

  createProject: async (name: string, currency: string, startDate?: number, endDate?: number): Promise<Project | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Insert Project
      const { data: project, error: createError } = await supabase
        .from('projects')
        .insert({
          name,
          currency,
          start_date: startDate,
          end_date: endDate,
          invite_code: Math.random().toString(36).substring(7).toUpperCase()
        })
        .select()
        .single();

      if (createError || !project) {
        console.error("Create project error", createError);
        return null;
      }

      // 2. Add creator as member
      await supabase.from('project_members').insert({
          project_id: project.id,
          user_id: user.id
      });

      // Fetch creator profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      return {
          id: project.id,
          name: project.name,
          currency: project.currency,
          startDate: project.start_date,
          endDate: project.end_date,
          inviteCode: project.invite_code,
          members: [mapProfile(profile)],
          expenses: []
      };
  },

  updateProject: async (updatedProject: Project): Promise<void> => {
    await supabase
      .from('projects')
      .update({
        name: updatedProject.name,
        currency: updatedProject.currency,
        start_date: updatedProject.startDate,
        end_date: updatedProject.endDate
      })
      .eq('id', updatedProject.id);
  },
  
  upsertExpense: async (projectId: string, expense: Expense) => {
      const payload = {
        project_id: projectId,
        payer_id: expense.payerId,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        category: expense.category,
        custom_category: expense.customCategory,
        split_mode: expense.splitMode,
        splits: expense.splits,
        receipt_image: expense.receiptImage
      };

      if (expense.id.startsWith('e_')) {
         const { data, error } = await supabase.from('expenses').insert(payload).select().single();
         if(error) throw error;
         return data.id; // Return real UUID
      } else {
         const { error } = await supabase.from('expenses').update(payload).eq('id', expense.id);
         if(error) throw error;
         return expense.id;
      }
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
      await supabase.from('expenses').delete().eq('id', expenseId);
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await supabase.from('projects').delete().eq('id', projectId);
  },

  createDemoProject: async (): Promise<Project> => {
    const p = await DataService.createProject('大阪美食之旅 (範例)', 'JPY', Date.now(), Date.now() + 86400000 * 5);
    if (!p) throw new Error("Failed to create demo");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user && p) {
        await DataService.upsertExpense(p.id, {
            id: 'e_' + Date.now(),
            amount: 3000,
            description: '歡迎晚餐',
            payerId: user.id,
            date: Date.now(),
            category: 'food',
            splitMode: 'equal',
            splits: [{ userId: user.id, amount: 3000 }]
        });
    }
    
    const projects = await DataService.getProjects();
    const loaded = projects.find(proj => proj.id === p.id);
    return loaded || p;
  },

  getTheme: (): string => {
    return localStorage.getItem(USER_PREF_KEY + '_theme') || 'default';
  },

  setTheme: (theme: string) => {
    localStorage.setItem(USER_PREF_KEY + '_theme', theme);
  }
};
