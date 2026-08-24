import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../context/DatabaseContext';
import { Map, Clock, CheckCircle2, User, Search, Eye } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import type { UserProfile } from '../context/AuthContext';
import DetalleTerritorio from './DetalleTerritorio';

interface Asignacion {
  id: string;
  territorio_id: string;
  perfil_id: string;
  assigned_at: string;
  status: 'ACTIVO' | 'DEVUELTO' | 'VENCIDO';
}

export default function PanelGestion() {
  const { db } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Datos relacionales
  const [perfiles, setPerfiles] = useState<UserProfile[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para explorar territorio
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchRelationalData();
  }, []);

  const fetchRelationalData = async () => {
    try {
      const [perfilesRes, asignacionesRes] = await Promise.all([
        supabase.from('perfiles').select('*').order('full_name'),
        supabase.from('asignaciones').select('*').eq('status', 'ACTIVO')
      ]);

      if (perfilesRes.data) setPerfiles(perfilesRes.data);
      if (asignacionesRes.data) setAsignaciones(asignacionesRes.data);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (territorioId: string, perfilId: string) => {
    if (!perfilId) return;
    
    // Asignar en base de datos
    const { error } = await supabase.from('asignaciones').insert({
      territorio_id: territorioId,
      perfil_id: perfilId,
      status: 'ACTIVO'
    });

    if (!error) {
      // Recargar asignaciones para actualizar UI
      await fetchRelationalData();
    } else {
      alert("Error al asignar el territorio");
    }
  };

  const handleReturn = async (asignacionId: string) => {
    const { error } = await supabase.from('asignaciones')
      .update({ status: 'DEVUELTO', returned_at: new Date().toISOString() })
      .eq('id', asignacionId);

    if (!error) {
      await fetchRelationalData();
    } else {
      alert("Error al devolver el territorio");
    }
  };

  const allTerritories = db.bairros.flatMap(b => 
    b.territorios.map(t => {
      // Buscar si tiene una asignacion activa
      const asignacionActiva = asignaciones.find(a => a.territorio_id === t.id);
      const perfilAsignado = asignacionActiva ? perfiles.find(p => p.id === asignacionActiva.perfil_id) : null;
      
      return { 
        ...t, 
        bairroName: b.name,
        asignacionActiva,
        perfilAsignado
      };
    })
  );

  const filtered = allTerritories.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.bairroName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedTerritoryId) {
    return (
      <DetalleTerritorio 
        territorioId={selectedTerritoryId} 
        onClose={() => setSelectedTerritoryId(null)}
        isManager={true} // Habilita edición
      />
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Map size={24} className="text-primary" />
            Gestión de Territorios
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Asigna territorios a los publicadores, registra devoluciones o explora su contenido.
          </p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input 
            type="text" 
            placeholder="Buscar por barrio o número..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-72 bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-dim">Cargando datos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const days = t.asignacionActiva ? differenceInDays(new Date(), new Date(t.asignacionActiva.assigned_at)) : null;
            
            return (
              <div key={t.id} className={`bg-surface border ${t.asignacionActiva ? 'border-orange-500/30' : 'border-border'} rounded-xl p-5 hover:border-primary/50 transition-colors flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-bold text-text-dim uppercase tracking-wider">{t.bairroName}</div>
                    <h3 className="text-lg font-bold text-text-main">Territorio {t.name}</h3>
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md">
                    {t.enderecos.length} dir.
                  </div>
                </div>
                
                <div className="text-sm text-text-dim mb-4 flex items-center gap-1">
                  {t.asignacionActiva ? (
                    <><Clock size={14} className="text-orange-400" /> <span className="text-orange-400 font-medium">Asignado hace {days} días</span></>
                  ) : (
                    <><CheckCircle2 size={14} className="text-green-500" /> <span className="text-green-500 font-medium">Disponible para asignar</span></>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-border space-y-3">
                  {t.asignacionActiva ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm text-text-main bg-bg p-2.5 rounded-lg border border-border">
                        <User size={16} className="text-primary" />
                        <span className="font-semibold truncate">{t.perfilAsignado?.full_name || 'Publicador Desconocido'}</span>
                      </div>
                      <button 
                        onClick={() => handleReturn(t.asignacionActiva!.id)}
                        className="w-full bg-surface hover:bg-error/10 border border-error/20 text-error font-medium py-2 rounded-lg transition-colors text-sm"
                      >
                        Registrar Devolución
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select 
                        id={`select-${t.id}`}
                        className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Elegir publicador...</option>
                        {perfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const select = document.getElementById(`select-${t.id}`) as HTMLSelectElement;
                          handleAssign(t.id, select.value);
                        }}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Asignar
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedTerritoryId(t.id)}
                    className="w-full bg-bg border border-border text-text-dim hover:text-primary font-medium py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> Explorar / Editar Territorio
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
