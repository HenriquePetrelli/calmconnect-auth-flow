import { supabase } from '@/integrations/supabase/client';

export interface AdminCredentials {
  email: string;
  password: string;
  fullName: string;
  userId?: string;
}

// Function to create the default admin account
export const createDefaultAdminAccount = async (): Promise<AdminCredentials> => {
  // Generate a secure password
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
    let result = 'CC@dminTemp';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const credentials: AdminCredentials = {
    email: 'admin@soliv.com',
    password: generateSecurePassword(),
    fullName: 'Administrador do Sistema Soliv'
  };

  try {
    const { data, error } = await supabase.functions.invoke('create-admin-account', {
      body: credentials
    });

    if (error) throw error;

    if (data.success) {
      return {
        ...credentials,
        userId: data.data.userId
      };
    } else {
      throw new Error(data.error || 'Erro ao criar conta administrativa');
    }
  } catch (error) {
    console.error('Error creating admin account:', error);
    throw error;
  }
};

// Function to validate super admin access
export const validateAdminAccess = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_super_admin', { user_id_param: userId });
    return !error && data === true;
  } catch {
    return false;
  }
};

// Function to get user session type
export const getUserSessionType = async (userId: string): Promise<'admin' | 'psychologist' | 'patient' | 'unknown'> => {
  try {
    // Check super admin first
    const isAdmin = await validateAdminAccess(userId);
    if (isAdmin) return 'admin';

    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', userId)
      .single();

    if (profile?.user_type === 'psychologist') return 'psychologist';
    if (profile?.user_type === 'patient') return 'patient';

    return 'unknown';
  } catch {
    return 'unknown';
  }
};

// Function to get correct redirect path based on user type
export const getRedirectPath = (userType: 'admin' | 'psychologist' | 'patient' | 'unknown'): string => {
  switch (userType) {
    case 'admin':
      return '/admin-dashboard';
    case 'psychologist':
      return '/psychologist-dashboard';
    case 'patient':
      return '/home';
    default:
      return '/';
  }
};