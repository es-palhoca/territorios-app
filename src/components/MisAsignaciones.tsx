import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Map, Clock, CheckCircle2, ChevronLeft, MapPin, Check, X, AlertCircle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Endereco } from '../types';

interface Asignacion {
  id: string;
  territorio_id: string;
  perfil_id: string;
  assigned_at: string;
  status: 'ACTIVO' | 'DEVUELTO' | 'VENCIDO';
}

export default function MisAsignaciones() {
  const { db, updateEndereco } = useDatabase();
  const { user } = useAuth();
  
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para la vista de detalle de un territorio
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
      setActiveTerritoryId(null); // Regresar a la lista si estábamos adentro
    } else {
      alert("Error al devolver el territorio");
    }
  };

  const handleUpdateStatus = async (enderecoId: string, currentEndereco: Endereco, newStatus: string | undefined) => {
    // Usamos el contexto para actualizarlo (que a su vez actualiza Supabase en segundo plano)
    updateEndereco(
      enderecoId, 
      currentEndereco.street, 
      currentEndereco.number, 
      currentEndereco.observations, 
      newStatus, 
      undefined, // statusComment (opcional)
      newStatus ? new Date().toISOString() : undefined // statusDate
    );
  };

  // Filtrar los territorios de la BD local que coincidan con nuestras asignaciones
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

    const completadas = territorio.enderecos.filter(e => e.status).length;
    const porcentaje = Math.round((completadas / (territorio.enderecos.length || 1)) * 100);

    return (
      <div className="flex-1 flex flex-col bg-bg h-full overflow-hidden">
        {/* Cabecera del detalle */}
        <div className="bg-surface border-b border-border p-4 shrink-0 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTerritoryId(null)}
              className="p-2 -ml-2 rounded-lg hover:bg-surface-accent text-text-dim hover:text-text-main transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="text-xs font-bold text-text-dim uppercase tracking-wider">{territorio.bairroName}</div>
              <h2 className="text-xl font-bold text-text-main leading-tight">Territorio {territorio.name}</h2>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-text-dim font-medium mb-1">Progreso</div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-bg rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: \`\${porcentaje}%\` }} />
              </div>
              <span className="text-xs font-bold text-primary">{porcentaje}%</span>
            </div>
          </div>
        </div>

        {/* Lista de Direcciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {territorio.enderecos.length === 0 ? (
            <p className="text-text-dim text-center py-8">No hay direcciones en este territorio.</p>
          ) : (
            territorio.enderecos.map(end => (
              <div key={end.id} className={\`bg-surface border \${end.status === 'VISITADO' ? 'border-whatsapp/30 bg-whatsapp/5' : end.status === 'AUSENTE' ? 'border-orange-500/30' : end.status === 'RECHAZO' ? 'border-error/30' : 'border-border'} rounded-xl p-4 shadow-sm\`}>
                <div className="flex gap-3 mb-3">
                  <div className={\`mt-1 shrink-0 p-2 rounded-full \${end.status === 'VISITADO' ? 'bg-whatsapp/10 text-whatsapp' : end.status === 'AUSENTE' ? 'bg-orange-500/10 text-orange-500' : 'bg-surface-accent text-text-dim'}\`}>
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-text-main break-words">
                        {end.street} <span className="text-primary">{end.number}</span>
                      </h3>
                      {end.status_date && (
                        <span className="text-[10px] text-text-dim shrink-0 bg-bg px-2 py-1 rounded-md">
                          {format(new Date(end.status_date), 'dd MMM')}
                        </span>
                      )}
                    </div>
                    {end.observations && (
                      <p className="text-sm text-text-dim mt-1 line-clamp-2">{end.observations}</p>
                    )}
                  </div>
                </div>

                {/* Botones de Estado */}
                <div className="flex gap-2 mt-2 pt-3 border-t border-border/50">
                  <button 
                    onClick={() => handleUpdateStatus(end.id, end, end.status === 'VISITADO' ? undefined : 'VISITADO')}
                    className={\`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all \${end.status === 'VISITADO' ? 'bg-whatsapp text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-whatsapp/10 hover:text-whatsapp'}\`}
                  >
                    <Check size={14} /> Visitado
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(end.id, end, end.status === 'AUSENTE' ? undefined : 'AUSENTE')}
                    className={\`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all \${end.status === 'AUSENTE' ? 'bg-orange-500 text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-orange-500/10 hover:text-orange-500'}\`}
                  >
                    <Clock size={14} /> Ausente
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(end.id, end, end.status === 'RECHAZO' ? undefined : 'RECHAZO')}
                    className={\`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all \${end.status === 'RECHAZO' ? 'bg-error text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-error/10 hover:text-error'}\`}
                  >
                    <X size={14} /> No Tocar
                  </button>
                </div>
              </div>
            ))
          )}
          
          <div className="pt-6 pb-2">
             <button 
                onClick={() => handleReturn(territorio.asignacion!.id)}
                className="w-full bg-error/10 hover:bg-error text-error hover:text-white border border-error/20 font-bold py-3.5 rounded-xl transition-all shadow-sm"
              >
                Devolver Territorio Terminado
              </button>
          </div>
        </div>
      </div>
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
          <div className="mt-4 text-xs text-text-dim">Debug: Asignaciones encontradas = {asignaciones.length}, Territorios en BD local = {db.bairros.reduce((acc, b) => acc + b.territorios.length, 0)}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {misTerritorios.map(t => {
            const days = differenceInDays(new Date(), new Date(t.asignacion!.assigned_at));
            const isOld = days > 30; // Alerta si lo tiene más de 30 días
            
            // Calcular progreso
            const completadas = t.enderecos.filter(e => e.status).length;
            const total = t.enderecos.length || 1;
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
                  <div className={\`flex items-center gap-1.5 \${isOld ? 'text-orange-500 font-medium' : ''}\`}>
                    {isOld ? <AlertCircle size={14} /> : <Clock size={14} />} 
                    <span>Lo tienes hace {days} días</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: \`\${porcentaje}%\` }} />
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
