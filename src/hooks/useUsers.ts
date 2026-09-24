import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../context/AuthContext';

export function useUsers() {
  const [perfiles, setPerfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerfiles();
  }, []);

  const fetchPerfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('perfiles').select('*').order('full_name');
      if (error) throw error;
      setPerfiles(data || []);
    } catch (err) {
      console.error('Error fetching perfiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from('perfiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setPerfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole as any } : p));
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const forcePasswordReset = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('admin_reset_user_password', { target_user_id: userId });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return {
    perfiles,
    loading,
    changeRole,
    forcePasswordReset,
    refreshUsers: fetchPerfiles
  };
}
