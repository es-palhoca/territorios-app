import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Map, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import DetalleTerritorio from './DetalleTerritorio';

interface Asignacion {
  id: string;
  territorio_id: string;
  perfil_id: string;
  assigned_at: string;
  status: 'ACTIVO' | 'DEVUELTO' | 'VENCIDO';
}

export default function MisAsignaciones() {
  const { db } = useDatabase();
  const { user } = useAuth();
  
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTerritoryId, setActiveTerritoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchMisAsignaciones();
  }, [user]);

  const fetchMisAsignaciones = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('asignaciones')
        .select('*')
        .eq('perfil_id', user.id)
        .eq('status', 'ACTIVO');

      if (!error && data) {
        setAsignaciones(data);
      }
    } catch (error) {
      console.error("Error cargando asignaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (asignacionId: string) => {
    if (!confirm('¿Estás seguro de que quieres devolver este territorio? Ya no podrás editarlo.')) return;
    
    const { error } = await supabase.from('asignaciones')
      .update({ status: 'DEVUELTO', returned_at: new Date().toISOString() })
      .eq('id', asignacionId);

    if (!error) {
      await fetchMisAsignaciones();
      setActiveTerritoryId(null);
    } else {
      alert("Error al devolver el territorio");
    }
  };

  const misTerritorios = db.bairros.flatMap(b => 
    b.territorios
      .filter(t => asignaciones.some(a => a.territorio_id === t.id))
      .map(t => {
        const asignacion = asignaciones.find(a => a.territorio_id === t.id);
        return { 
          ...t, 
          bairroName: b.name,
          asignacion
        };
      })
  );

  if (loading) {
    return <div className="text-center py-12 text-text-dim">Cargando mis asignaciones...</div>;
  }

  // --- VISTA DETALLE DEL TERRITORIO ---
  if (activeTerritoryId) {
    const territorio = misTerritorios.find(t => t.id === activeTerritoryId);
    if (!territorio) return <div className="p-8">Territorio no encontrado</div>;

    return (
      <DetalleTerritorio 
        territorioId={activeTerritoryId} 
        onClose={() => setActiveTerritoryId(null)}
        isManager={false} // Es publicador en esta vista
        asignacionId={territorio.asignacion!.id}
        onReturn={handleReturn}
      />
    );
  }

  // --- VISTA LISTA DE MIS ASIGNACIONES ---
  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <Map size={24} className="text-primary" />
          Mis Asignaciones
        </h1>
        <p className="text-text-dim text-sm mt-1">
          Territorios que tienes actualmente para predicar.
        </p>
      </div>

      {misTerritorios.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 bg-surface-accent rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-text-dim" />
          </div>
          <h3 className="text-lg font-bold text-text-main mb-2">¡Todo al día!</h3>
          <p className="text-text-dim max-w-sm">No tienes territorios asignados en este momento. Pide uno nuevo a tu conductor cuando estés listo para salir a predicar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {misTerritorios.map(t => {
            const days = differenceInDays(new Date(), new Date(t.asignacion!.assigned_at));
            const isOld = days > 30; // Alerta si lo tiene más de 30 días
            
            const validos = t.enderecos.filter(e => e.status !== 'NO_EXTRANJERO');
            const completadas = validos.filter(e => e.status).length;
            const total = validos.length || 1;
            const porcentaje = Math.round((completadas / total) * 100);

            return (
              <div key={t.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-colors flex flex-col shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs font-bold text-text-dim uppercase tracking-wider">{t.bairroName}</div>
                    <h3 className="text-xl font-bold text-text-main">Territorio {t.name}</h3>
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md">
                    {t.enderecos.length} dir.
                  </div>
                </div>
                
                <div className="text-sm text-text-dim mb-4 flex flex-col gap-2">
                  <div className={`flex items-center gap-1.5 ${isOld ? 'text-orange-500 font-medium' : ''}`}>
                    {isOld ? <AlertCircle size={14} /> : <Clock size={14} />} 
                    <span>Lo tienes hace {days} días</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${porcentaje}%` }} />
                    </div>
                    <span className="text-xs font-bold text-text-main">{porcentaje}%</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex gap-2">
                  <button 
                    onClick={() => setActiveTerritoryId(t.id)}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-lg transition-colors text-sm shadow-md"
                  >
                    Abrir y Predicar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
