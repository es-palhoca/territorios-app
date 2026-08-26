import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronLeft, MapPin, Check, X, AlertCircle, MessageSquare, Send, Plus, Globe, CalendarX2, Edit2, Trash2 } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { Endereco } from '../types';

interface Visita {
  id: string;
  endereco_id: string;
  perfil_id: string;
  visited_at: string;
  status: string | null;
  notes: string | null;
  perfiles?: { full_name: string };
}

interface DetalleTerritorioProps {
  territorioId: string;
  onClose: () => void;
  isManager: boolean;
  asignacionId?: string;
  onReturn?: (asignacionId: string) => void;
}

export default function DetalleTerritorio({ territorioId, onClose, isManager, asignacionId, onReturn }: DetalleTerritorioProps) {
  const { db, updateEndereco, addEndereco, removeEndereco, saveGPS, moveEnderecoToTerritorio, updateTerritorio, moveTerritorioToBairro } = useDatabase();
  const { user } = useAuth();
  
  const [visitas, setVisitas] = useState<Record<string, Visita[]>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Confirmación de Estado
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    enderecoId: string;
    currentEndereco: Endereco;
    newStatus: string;
  } | null>(null);
  const [statusNote, setStatusNote] = useState('');

  // Agregar Dirección
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newObservations, setNewObservations] = useState('');

  // Editar Dirección
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [editBairroId, setEditBairroId] = useState('');
  const [editTerritorioId, setEditTerritorioId] = useState('');

  // Editar Territorio
  const [showEditTerritorioModal, setShowEditTerritorioModal] = useState(false);
  const [editTName, setEditTName] = useState('');
  const [editTBairroId, setEditTBairroId] = useState('');

  // Buscamos el territorio en la DB local
  let territorio: any = null;
  let bairroName = '';
  let bairroId = '';
  for (const b of db.bairros) {
    const t = b.territorios.find(t => t.id === territorioId);
    if (t) {
      territorio = t;
      bairroName = b.name;
      bairroId = b.id;
      break;
    }
  }

  useEffect(() => {
    if (territorio) fetchVisitas(territorio.enderecos.map((e: any) => e.id));
  }, [territorioId]);

  const fetchVisitas = async (enderecoIds: string[]) => {
    if (enderecoIds.length === 0) return;

    const { data, error } = await supabase
      .from('visitas')
      .select('*, perfiles(full_name)')
      .in('endereco_id', enderecoIds)
      .order('visited_at', { ascending: false });

    if (!error && data) {
      const grouped: Record<string, Visita[]> = {};
      data.forEach((v: any) => {
        if (!grouped[v.endereco_id]) grouped[v.endereco_id] = [];
        grouped[v.endereco_id].push(v);
      });
      setVisitas(grouped);
    }
  };

  const requestUpdateStatus = (enderecoId: string, currentEndereco: Endereco, newStatus: string | undefined) => {
    if (newStatus === undefined) {
      // Es un "Deshacer", se ejecuta directamente sin pedir nota para limpiar el estado actual
      executeStatusChange(enderecoId, currentEndereco, undefined);
    } else {
      // Abre el modal para confirmar e ingresar nota
      setPendingStatusChange({ enderecoId, currentEndereco, newStatus });
      setStatusNote('');
    }
  };

  const executeStatusChange = async (enderecoId: string, currentEndereco: Endereco, newStatus: string | undefined, note?: string) => {
    const statusDate = newStatus ? new Date().toISOString() : undefined;
    
    updateEndereco(
      enderecoId, 
      currentEndereco.street, 
      currentEndereco.number, 
      currentEndereco.observations, 
      newStatus, 
      undefined, 
      statusDate
    );

    if (newStatus && user) {
      await supabase.from('visitas').insert({
        endereco_id: enderecoId,
        perfil_id: user.id,
        status: newStatus,
        visited_at: statusDate,
        notes: note || null
      });
      fetchVisitas(territorio.enderecos.map((e: any) => e.id));
    }
    setPendingStatusChange(null);
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
      fetchVisitas(territorio.enderecos.map((e: any) => e.id));
    }
  };

  const handleAddAddress = () => {
    if (!newStreet.trim() || !territorioId) return;
    addEndereco(territorioId, newStreet.trim(), newNumber.trim() || 'S/N', newObservations.trim() || undefined);
    setNewStreet('');
    setNewNumber('');
    setNewObservations('');
    setShowAddModal(false);
  };

  const [capturingGpsId, setCapturingGpsId] = useState<string | null>(null);

  const captureGPS = (id: string) => {
    setCapturingGpsId(id);
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta captura de GPS.");
      setCapturingGpsId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        saveGPS(id, latitude, longitude);
        setCapturingGpsId(null);
        alert("¡Ubicación capturada con éxito! Enviada a revisión.");
      },
      (error) => {
        console.error(error);
        let mensaje = "Error desconocido al obtener la ubicación.";
        if (error.code === 1) mensaje = "Permiso denegado. Debes permitir que el navegador acceda a tu ubicación.";
        if (error.code === 2) mensaje = "Ubicación no disponible. Por favor, asegúrate de que el GPS de tu celular esté ENCENDIDO.";
        if (error.code === 3) mensaje = "Tiempo de espera agotado. Intenta nuevamente al aire libre.";
        
        alert("No se pudo capturar: " + mensaje);
        setCapturingGpsId(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const openEditModal = (end: Endereco) => {
    setEditId(end.id);
    setEditStreet(end.street);
    setEditNumber(end.number);
    setEditObservations(end.observations || '');
    setEditBairroId(bairroId);
    setEditTerritorioId(territorio.id);
    setShowEditModal(true);
  };

  const handleEditAddress = () => {
    if (!editStreet.trim() || !editId) return;
    const end = territorio.enderecos.find((e: any) => e.id === editId);
    if (end) {
      updateEndereco(editId, editStreet, editNumber, editObservations, end.status, end.statusComment, end.statusDate);
      if (editTerritorioId && editTerritorioId !== territorio.id) {
        moveEnderecoToTerritorio(editId, editTerritorioId);
      }
    }
    setShowEditModal(false);
  };

  const handleDeleteAddress = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta dirección del territorio?')) {
      removeEndereco(id);
    }
  };

  const handleOpenEditTerritorio = () => {
    setEditTName(territorio.name);
    setEditTBairroId(bairroId);
    setShowEditTerritorioModal(true);
  };

  const handleSaveEditTerritorio = () => {
    if (!editTName.trim()) return;
    if (editTName !== territorio.name) {
      updateTerritorio(territorio.id, editTName);
    }
    if (editTBairroId && editTBairroId !== bairroId) {
      moveTerritorioToBairro(territorio.id, editTBairroId);
    }
    setShowEditTerritorioModal(false);
  };

  if (!territorio) return <div className="p-8">Territorio no encontrado</div>;

  const validEnderecos = territorio.enderecos;
  const completadas = validEnderecos.filter((e: any) => e.status && e.status !== 'NO_EXTRANJERO').length;
  const totalVálidas = validEnderecos.filter((e: any) => e.status !== 'NO_EXTRANJERO').length || 1;
  const porcentaje = Math.round((completadas / totalVálidas) * 100);

  return (
    <div className="flex-1 flex flex-col bg-bg h-full overflow-hidden">
      {/* Cabecera del detalle */}
      <div className="bg-surface border-b border-border p-4 shrink-0 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-surface-accent text-text-dim hover:text-text-main transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
            <div className="flex items-center gap-2">
              <div>
                <div className="text-xs font-bold text-text-dim uppercase tracking-wider">{bairroName}</div>
                <h2 className="text-xl font-bold text-text-main leading-tight flex items-center gap-2">
                  Territorio {territorio.name}
                  {isManager && (
                    <button 
                      onClick={handleOpenEditTerritorio}
                      className="text-text-dim hover:text-primary transition-colors p-1"
                      title="Editar Territorio"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </h2>
              </div>
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
          validEnderecos.map((end: any) => {
            const isNoExtranjero = end.status === 'NO_EXTRANJERO';
            const isNoVisitar = end.status === 'NO_VISITAR';
            const historial = visitas[end.id] || [];

            let remainingDays = 0;
            let targetDate = new Date();
            if (isNoVisitar && end.status_date) {
              targetDate = addDays(new Date(end.status_date), 90);
              remainingDays = differenceInDays(targetDate, new Date());
            }

            return (
            <div key={end.id} className={`bg-surface border ${end.status === 'HECHO' ? 'border-whatsapp/30 bg-whatsapp/5' : end.status === 'NO_EN_CASA' ? 'border-orange-500/30' : end.status === 'NO_VISITAR' ? 'border-yellow-500/30' : end.status === 'NO_EXTRANJERO' ? 'border-error/30' : 'border-border'} rounded-xl p-4 shadow-sm transition-all`}>
              
              {isNoExtranjero ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-dim">
                    <Globe size={16} />
                    <span className="line-through">{end.street} {end.number}</span>
                    <span className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full ml-2">Descartado: No es extranjero</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => requestUpdateStatus(end.id, end, undefined)} className="text-xs text-primary hover:underline">
                      Deshacer
                    </button>
                    {isManager && (
                      <button onClick={() => handleDeleteAddress(end.id)} className="text-error hover:bg-error/10 p-1 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mb-3">
                    <div className={`mt-1 shrink-0 p-2 rounded-full ${end.status === 'HECHO' ? 'bg-whatsapp/10 text-whatsapp' : end.status === 'NO_EN_CASA' ? 'bg-orange-500/10 text-orange-500' : end.status === 'NO_VISITAR' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-surface-accent text-text-dim'}`}>
                      <MapPin size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-text-main break-words">
                          {end.street} <span className="text-primary">{end.number}</span>
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {end.status_date && end.status && (
                            <span className="text-[10px] text-text-dim bg-bg px-2 py-1 rounded-md border border-border">
                              {format(new Date(end.status_date), 'dd MMM')}
                            </span>
                          )}
                          {isManager && (
                            <>
                              <button onClick={() => openEditModal(end)} className="text-text-dim hover:text-primary transition-colors p-1" title="Editar Dirección"><Edit2 size={14}/></button>
                              <button onClick={() => handleDeleteAddress(end.id)} className="text-text-dim hover:text-error transition-colors p-1" title="Eliminar Dirección"><Trash2 size={14}/></button>
                            </>
                          )}
                        </div>
                      </div>
                      {end.observations && (
                        <p className="text-sm text-text-dim mt-1 line-clamp-2">{end.observations}</p>
                      )}
                      {isNoVisitar && end.status_date && (
                        <div className={`mt-2 text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 ${remainingDays > 0 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-whatsapp/10 text-whatsapp'}`}>
                          <AlertCircle size={14} />
                          {remainingDays > 0
                            ? `No visitar (Faltan ${remainingDays} días - hasta el ${format(targetDate, 'dd MMM')})`
                            : `Período de 90 días cumplido. Ya se puede visitar.`}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                          {!end.lat && (
                            <button 
                              onClick={() => captureGPS(end.id)} 
                              disabled={capturingGpsId === end.id}
                              className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 flex items-center gap-1 hover:bg-primary/20 transition-colors disabled:opacity-50"
                            >
                              <MapPin size={12} /> {capturingGpsId === end.id ? 'Capturando...' : 'Capturar GPS'}
                            </button>
                          )}
                          {end.gps_status === 'PENDING' && (
                            <span className="text-[10px] bg-warning/10 text-warning px-2 py-1 rounded border border-warning/20 flex items-center gap-1">
                              <MapPin size={12} /> GPS en revisión
                            </span>
                          )}
                          {end.gps_status === 'VERIFIED' && (
                            <span className="text-[10px] bg-whatsapp/10 text-whatsapp px-2 py-1 rounded border border-whatsapp/20 flex items-center gap-1">
                              <MapPin size={12} /> GPS Aprobado
                            </span>
                          )}
                        </div>
                    </div>
                  </div>

                  {/* Botones de Estado */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <button 
                      onClick={() => requestUpdateStatus(end.id, end, end.status === 'HECHO' ? undefined : 'HECHO')}
                      className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${end.status === 'HECHO' ? 'bg-whatsapp text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-whatsapp/10 hover:text-whatsapp'}`}
                    >
                      <Check size={14} /> Hecho
                    </button>
                    <button 
                      onClick={() => requestUpdateStatus(end.id, end, end.status === 'NO_EN_CASA' ? undefined : 'NO_EN_CASA')}
                      className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${end.status === 'NO_EN_CASA' ? 'bg-orange-500 text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-orange-500/10 hover:text-orange-500'}`}
                    >
                      <Clock size={14} /> No en casa
                    </button>
                    <button 
                      onClick={() => requestUpdateStatus(end.id, end, end.status === 'NO_VISITAR' ? undefined : 'NO_VISITAR')}
                      className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${end.status === 'NO_VISITAR' ? 'bg-yellow-500 text-white shadow-md' : 'bg-surface-accent text-text-main hover:bg-yellow-500/10 hover:text-yellow-500'}`}
                    >
                      <CalendarX2 size={14} /> No visitar
                    </button>
                    <button 
                      onClick={() => requestUpdateStatus(end.id, end, 'NO_EXTRANJERO')}
                      className="py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all bg-surface-accent text-text-main hover:bg-error/10 hover:text-error"
                    >
                      <Globe size={14} /> No es extranjero
                    </button>
                  </div>
                </>
              )}

              {/* Sección de Notas e Historial (SIEMPRE VISIBLE) */}
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
                              {v.status === 'NO_EXTRANJERO' ? 'NO ES EXTRANJERO' : v.status}
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

        {onReturn && asignacionId && (
          <div className="pt-6 pb-2">
             <button 
                onClick={() => onReturn(asignacionId)}
                className="w-full bg-error/10 hover:bg-error text-error hover:text-white border border-error/20 font-bold py-3.5 rounded-xl transition-all shadow-sm"
              >
                Devolver Territorio Terminado
              </button>
          </div>
        )}
      </div>

      {/* Modal para Confirmar Cambio de Estado */}
      {pendingStatusChange && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Confirmar Acción</h3>
              <button onClick={() => setPendingStatusChange(null)} className="text-text-dim hover:text-text-main"><X size={20}/></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-main">
                Estás a punto de marcar <strong>{pendingStatusChange.currentEndereco.street} {pendingStatusChange.currentEndereco.number}</strong> como: 
                <span className={`ml-1 font-bold ${pendingStatusChange.newStatus === 'HECHO' ? 'text-whatsapp' : pendingStatusChange.newStatus === 'NO_EN_CASA' ? 'text-orange-500' : 'text-error'}`}>
                  {pendingStatusChange.newStatus === 'NO_EXTRANJERO' ? 'NO ES EXTRANJERO' : pendingStatusChange.newStatus}
                </span>
              </p>
              
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">¿Deseas agregar una nota? (Opcional)</label>
                <textarea 
                  autoFocus
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none resize-none"
                  placeholder={pendingStatusChange.newStatus === 'NO_EXTRANJERO' ? "Ej. Se mudaron hace 2 meses" : "Ej. Volver más tarde..."}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setPendingStatusChange(null)}
                  className="flex-1 bg-surface-accent hover:bg-bg border border-border text-text-main font-medium py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => executeStatusChange(pendingStatusChange.enderecoId, pendingStatusChange.currentEndereco, pendingStatusChange.newStatus, statusNote)}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">Observaciones / Detalles</label>
                <textarea 
                  value={newObservations}
                  onChange={(e) => setNewObservations(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none resize-none"
                  placeholder="Ej. Peruano no respondió"
                  rows={2}
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

      {/* Modal para Editar Dirección */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Editar Dirección</h3>
              <button onClick={() => setShowEditModal(false)} className="text-text-dim hover:text-text-main"><X size={20}/></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-dim mb-1">Mover a otro Barrio</label>
                  <select 
                    value={editBairroId} 
                    onChange={e => { setEditBairroId(e.target.value); setEditTerritorioId(''); }}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                  >
                    <option value="" disabled>Seleccione...</option>
                    {db.bairros.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-dim mb-1">Mover a otro Territorio</label>
                  <select 
                    value={editTerritorioId} 
                    onChange={e => setEditTerritorioId(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                    disabled={!editBairroId}
                  >
                    <option value="" disabled>Seleccione...</option>
                    {db.bairros.find(b => b.id === editBairroId)?.territorios.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">Calle / Avenida / Edificio</label>
                <input 
                  autoFocus
                  type="text" 
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">Número / Depto</label>
                <input 
                  type="text" 
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">Observaciones / Detalles (Fijo)</label>
                <textarea 
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none resize-none"
                  rows={2}
                />
              </div>
              <button 
                onClick={handleEditAddress}
                disabled={!editStreet.trim()}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Territorio */}
      {showEditTerritorioModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Editar Territorio</h3>
              <button onClick={() => setShowEditTerritorioModal(false)} className="text-text-dim hover:text-text-main"><X size={20}/></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">Nombre / Número del Territorio</label>
                <input 
                  autoFocus
                  type="text" 
                  value={editTName}
                  onChange={(e) => setEditTName(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1">Barrio</label>
                <select 
                  value={editTBairroId} 
                  onChange={e => setEditTBairroId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="" disabled>Seleccione...</option>
                  {db.bairros.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleSaveEditTerritorio}
                disabled={!editTName.trim() || !editTBairroId}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
