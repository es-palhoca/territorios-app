import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Map, Clock, CheckCircle2, ChevronLeft, MapPin, Check, X, AlertCircle, MessageSquare, Send, Plus, XCircle, Globe, CalendarX2 } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Endereco } from '../types';

interface Asignacion {
  id: string;
  territorio_id: string;
  perfil_id: string;
  assigned_at: string;
  status: 'ACTIVO' | 'DEVUELTO' | 'VENCIDO';
}

interface Visita {
  id: string;
  endereco_id: string;
  perfil_id: string;
  visited_at: string;
  status: string | null;
  notes: string | null;
  perfiles?: { full_name: string };
}

export default function MisAsignaciones() {
  const { db, updateEndereco, addEndereco } = useDatabase();
  const { user, profile } = useAuth();
  
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para la vista de detalle de un territorio
  const [activeTerritoryId, setActiveTerritoryId] = useState<string | null>(null);

  // Estados para historial de visitas/notas
  const [visitas, setVisitas] = useState<Record<string, Visita[]>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Estados para agregar nueva dirección
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => {
    fetchMisAsignaciones();
  }, [user]);

  useEffect(() => {
    if (activeTerritoryId) {
      fetchVisitas(activeTerritoryId);
    }
  }, [activeTerritoryId]);

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

  const fetchVisitas = async (territorioId: string) => {
    // Buscar todas las direcciones de este territorio
    const territorio = misTerritorios.find(t => t.id === territorioId);
    if (!territorio) return;

    const enderecoIds = territorio.enderecos.map(e => e.id);
    if (enderecoIds.length === 0) return;

    const { data, error } = await supabase
      .from('visitas')
      .select('*, perfiles(full_name)')
      .in('endereco_id', enderecoIds)
      .order('visited_at', { ascending: false });

    if (!error && data) {
      // Agrupar por endereco_id
      const grouped: Record<string, Visita[]> = {};
      data.forEach((v: any) => {
        if (!grouped[v.endereco_id]) grouped[v.endereco_id] = [];
        grouped[v.endereco_id].push(v);
      });
      setVisitas(grouped);
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

  const handleUpdateStatus = async (enderecoId: string, currentEndereco: Endereco, newStatus: string | undefined) => {
    const statusDate = newStatus ? new Date().toISOString() : undefined;
    
    // 1. Actualizar estado local y en tabla enderecos
    updateEndereco(
      enderecoId, 
      currentEndereco.street, 
      currentEndereco.number, 
      currentEndereco.observations, 
      newStatus, 
      undefined, 
      statusDate
    );

    // 2. Registrar en historial (visitas) solo si se marcó un estado (no si se desmarcó)
    if (newStatus && user) {
      await supabase.from('visitas').insert({
        endereco_id: enderecoId,
        perfil_id: user.id,
        status: newStatus,
        visited_at: statusDate
      });
      // Recargar historial
      fetchVisitas(activeTerritoryId!);
    }
  };

  const handleSendNote = async (enderecoId: string) => {
    const noteText = noteInputs[enderecoId]?.trim();
    if (!noteText || !user) return;

    const { error } = await supabase.from('visitas').insert({
      endereco_id: enderecoId,
      perfil_id: user.id,
      notes: noteText
    });

    if (!error) {
      setNoteInputs(prev => ({ ...prev, [enderecoId]: '' }));
      fetchVisitas(activeTerritoryId!);
    }
  };

  const handleAddAddress = () => {
    if (!newStreet.trim() || !activeTerritoryId) return;
    
    addEndereco(activeTerritoryId, newStreet.trim(), newNumber.trim() || 'S/N');
    setNewStreet('');
    setNewNumber('');
    setShowAddModal(false);
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

    // Filtramos temporalmente los "NO_EXTRANJERO" para que no bloqueen el progreso (o los ocultamos)
    const validEnderecos = territorio.enderecos; // Mostramos todos pero con estilo distinto
    const completadas = validEnderecos.filter(e => e.status && e.status !== 'NO_EXTRANJERO').length;
    const totalVálidas = validEnderecos.filter(e => e.status !== 'NO_EXTRANJERO').length || 1;
    const porcentaje = Math.round((completadas / totalVálidas) * 100);

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
                <div className="h-full bg-primary transition-all" style={{ width: `${porcentaje}%` }} />
              </div>
              <span className="text-xs font-bold text-primary">{porcentaje}%</span>
            </div>
          </div>
        </div>

        {/* Lista de Direcciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {validEnderecos.length === 0 ? (
            <p className="text-text-dim text-center py-8">No hay direcciones en este territorio.</p>
          ) : (
            validEnderecos.map(end => {
              const isNoExtranjero = end.status === 'NO_EXTRANJERO';
              const historial = visitas[end.id] || [];

              return (
              <div key={end.id} className={`bg-surface border ${end.status === 'HECHO' ? 'border-whatsapp/30 bg-whatsapp/5' : end.status === 'NO_EN_CASA' ? 'border-orange-500/30' : end.status === 'NO_VISITAR' ? 'border-error/30' : isNoExtranjero ? 'border-border/30 opacity-60 bg-bg' : 'border-border'} rounded-xl p-4 shadow-sm transition-all`}>
                
                {isNoExtranjero ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-text-dim">
                      <Globe size={16} />
                      <span className="line-through">{end.street} {end.number}</span>
                      <span className="text-xs bg-surface-accent px-2 py-0.5 rounded-full ml-2">Descartado: No es extranjero</span>
                    </div>
                    <button onClick={() => handleUpdateStatus(end.id, end, undefined)} className="text-xs text-primary hover:underline">
                      Deshacer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3 mb-3">
                      <div className={`mt-1 shrink-0 p-2 rounded-full ${end.status === 'HECHO' ? 'bg-whatsapp/10 text-whatsapp' : end.status === 'NO_EN_CASA' ? 'bg-orange-500/10 text-orange-500' : end.status === 'NO_VISITAR' ? 'bg-error/10 text-error' : 'bg-surface-accent text-text-dim'}`}>
                        <MapPin size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-text-main break-words">
                            {end.street} <span className="text-primary">{end.number}</span>
                          </h3>
                          {end.status_date && end.status && (
                            <span className="text-[10px] text-text-dim shrink-0 bg-bg px-2 py-1 rounded-md border border-border">
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      <button 
                        onClick={() => handleUpdateStatus(end.id, end, end.status === 'HECHO' ? undefined : 'HECHO')}
                        className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${end.status === 'HECHO' ? 'bg-whatsapp text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-whatsapp/10 hover:text-whatsapp'}`}
                      >
                        <Check size={14} /> Hecho
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(end.id, end, end.status === 'NO_EN_CASA' ? undefined : 'NO_EN_CASA')}
                        className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${end.status === 'NO_EN_CASA' ? 'bg-orange-500 text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-orange-500/10 hover:text-orange-500'}`}
                      >
                        <Clock size={14} /> No en casa
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(end.id, end, end.status === 'NO_VISITAR' ? undefined : 'NO_VISITAR')}
                        className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${end.status === 'NO_VISITAR' ? 'bg-error text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-error/10 hover:text-error'}`}
                      >
                        <CalendarX2 size={14} /> No visitar
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(end.id, end, 'NO_EXTRANJERO')}
                        className="py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all bg-surface-accent text-text-dim hover:bg-bg hover:text-text-main"
                      >
                        <Globe size={14} /> No es extranjero
                      </button>
                    </div>

                    {/* Sección de Notas e Historial */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <button 
                        onClick={() => setExpandedNotes(prev => ({ ...prev, [end.id]: !prev[end.id] }))}
                        className="flex items-center gap-2 text-xs font-medium text-text-dim hover:text-primary transition-colors"
                      >
                        <MessageSquare size={14} />
                        {historial.length > 0 ? `Ver historial (${historial.length}) y notas` : 'Añadir nota al historial'}
                      </button>

                      {expandedNotes[end.id] && (
                        <div className="mt-3 space-y-3">
                          {/* Historial */}
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                            {historial.map(v => (
                              <div key={v.id} className="bg-bg rounded-lg p-2.5 text-xs border border-border/50">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-text-main">{v.perfiles?.full_name || 'Desconocido'}</span>
                                  <span className="text-[10px] text-text-dim">{format(new Date(v.visited_at), 'dd/MM/yyyy HH:mm')}</span>
                                </div>
                                {v.status && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mb-1 ${v.status === 'HECHO' ? 'bg-whatsapp/20 text-whatsapp' : v.status === 'NO_EN_CASA' ? 'bg-orange-500/20 text-orange-500' : 'bg-error/20 text-error'}`}>
                                    {v.status}
                                  </span>
                                )}
                                {v.notes && <p className="text-text-dim">{v.notes}</p>}
                              </div>
                            ))}
                          </div>
                          
                          {/* Caja de texto para nueva nota */}
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Escribe una nota..." 
                              className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
                              value={noteInputs[end.id] || ''}
                              onChange={(e) => setNoteInputs(prev => ({ ...prev, [end.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendNote(end.id)}
                            />
                            <button 
                              onClick={() => handleSendNote(end.id)}
                              disabled={!noteInputs[end.id]?.trim()}
                              className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )})
          )}
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full mt-2 bg-surface-accent/50 hover:bg-surface-accent border border-dashed border-border text-text-dim hover:text-text-main font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Agregar nueva dirección
          </button>

          <div className="pt-6 pb-2">
             <button 
                onClick={() => handleReturn(territorio.asignacion!.id)}
                className="w-full bg-error/10 hover:bg-error text-error hover:text-white border border-error/20 font-bold py-3.5 rounded-xl transition-all shadow-sm"
              >
                Devolver Territorio Terminado
              </button>
          </div>
        </div>

        {/* Modal para Agregar Dirección */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-lg">Nueva Dirección</h3>
                <button onClick={() => setShowAddModal(false)} className="text-text-dim hover:text-text-main"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1">Calle / Avenida / Edificio</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                    placeholder="Ej. Rua das Flores"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1">Número / Depto</label>
                  <input 
                    type="text" 
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                    placeholder="S/N"
                  />
                </div>
                <button 
                  onClick={handleAddAddress}
                  disabled={!newStreet.trim()}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Guardar Dirección
                </button>
              </div>
            </div>
          </div>
        )}
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {misTerritorios.map(t => {
            const days = differenceInDays(new Date(), new Date(t.asignacion!.assigned_at));
            const isOld = days > 30; // Alerta si lo tiene más de 30 días
            
            // Calcular progreso (ignorando los que no son extranjeros)
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
