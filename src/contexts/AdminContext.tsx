import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Admin {
  id: string;
  email: string;
}

interface AdminContextType {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAdmin: (data: { email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing admin token
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Decode token to get admin info (simplified)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp > Date.now() / 1000) {
          setAdmin({ id: payload.sub, email: payload.email });
        } else {
          localStorage.removeItem('adminToken');
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth/login', {
        body: { email, password }
      });

      if (error) throw error;

      const { token, admin: adminData } = data;
      localStorage.setItem('adminToken', token);
      setAdmin(adminData);
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Credenciais inválidas');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
  };

  const updateAdmin = async (updateData: { email?: string; currentPassword?: string; newPassword?: string }) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('admin-auth/update', {
        body: updateData,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) throw error;

      // Update local admin data if email changed
      if (updateData.email && admin) {
        setAdmin({ ...admin, email: updateData.email });
      }
    } catch (error) {
      console.error('Update error:', error);
      throw new Error('Falha ao atualizar dados do administrador');
    }
  };

  return (
    <AdminContext.Provider value={{
      admin,
      login,
      logout,
      updateAdmin,
      isLoading
    }}>
      {children}
    </AdminContext.Provider>
  );
};