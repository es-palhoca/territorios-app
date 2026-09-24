import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../context/DatabaseContext';

export function useAsignaciones() {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { resetTerritorioStatuses } = useDatabase();

  const fetchActiveAsignaciones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('asignaciones').select('*').eq('status', 'ACTIVO');
    if (!error && data) {
      setAsignaciones(data);
    }
    setLoading(false);
    return data;
  }, []);

  const assignTerritory = async (territorioId: string, perfilId: string) => {
    if (!perfilId) return { success: false };
    const { error } = await supabase.from('asignaciones').insert({
      territorio_id: territorioId,
      perfil_id: perfilId,
      status: 'ACTIVO'
    });

    if (!error) {
      const d = new Date().toISOString();
      await supabase.from('territorios').update({ last_assigned_date: d }).eq('id', territorioId);
      await fetchActiveAsignaciones();
      return { success: true };
    }
    return { success: false, error };
  };

  const returnTerritory = async (asignacionId: string, territorioId: string) => {
    const { error } = await supabase.from('asignaciones')
      .update({ status: 'DEVUELTO', returned_at: new Date().toISOString() })
      .eq('id', asignacionId);

    if (!error) {
      resetTerritorioStatuses(territorioId);
      await fetchActiveAsignaciones();
      return { success: true };
    }
    return { success: false, error };
  };

  return {
    asignaciones,
    loading,
    fetchActiveAsignaciones,
    assignTerritory,
    returnTerritory
  };
}
