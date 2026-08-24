import React, { useState, useEffect } from 'react';
import { BarChart3, History, CalendarDays, AlertCircle, X, Search } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { supabase } from '../lib/supabase';
import { format, differenceInMonths, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { UserProfile } from '../context/AuthContext';

interface Asignacion {
  id: string;
  territorio_id: string;
  perfil_id: string;
  status: string;
  assigned_at: string;
  returned_at: string | null;
}

export default function Estadisticas() {
  const { db } = useDatabase();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [perfiles, setPerfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [asigRes, perfRes] = await Promise.all([
        supabase.from('asignaciones').select('*').order('assigned_at', { ascending: false }),
        supabase.from('perfiles').select('*')
      ]);

      if (asigRes.data) setAsignaciones(asigRes.data);
      if (perfRes.data) setPerfiles(perfRes.data);
    } catch (error) {
      console.error("Error cargando estadísticas", error);
    } finally {
      setLoading(false);
    }
  };

  // Procesar datos de todos los territorios
  const statsData = db.bairros.flatMap(b => b.territorios.map(t => {
    // Filtrar historial de este territorio
    const historial = asignaciones.filter(a => a.territorio_id === t.id);
    
    // Ultima asignación
    const ultimaAsignacion = historial.length > 0 ? historial[0] : null;
    
    // Veces trabajado en los ultimos 6 y 12 meses
    const now = new Date();
    const last6Months = historial.filter(a => differenceInMonths(now, new Date(a.assigned_at)) <= 6);
    const last12Months = historial.filter(a => differenceInMonths(now, new Date(a.assigned_at)) <= 12);

    return {
      territorioId: t.id,
      name: t.name,
      bairroName: b.name,
      totalEnderecos: t.enderecos.length,
      ultimaAsignacion,
      veces6m: last6Months.length,
      veces12m: last12Months.length,
      historial
    };
  }));

  // Ordenar por defecto: los que llevan más tiempo sin trabajarse primero (o los que nunca se trabajaron)
  statsData.sort((a, b) => {
    if (!a.ultimaAsignacion && !b.ultimaAsignacion) return 0;
    if (!a.ultimaAsignacion) return -1; // a primero
    if (!b.ultimaAsignacion) return 1;  // b primero
    return new Date(a.ultimaAsignacion.assigned_at).getTime() - new Date(b.ultimaAsignacion.assigned_at).getTime();
  });

  const filteredStats = statsData.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.bairroName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderHistoryModal = () => {
    if (!selectedHistoryId) return null;
    
    const stat = statsData.find(s => s.territorioId === selectedHistoryId);
    if (!stat) return null;

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl animate-in zoom-in-95">
          <div className="p-4 border-b border-border flex justify-between items-center bg-surface-accent/30">
            <div>
              <h3 className="font-bold text-lg text-text-main">Historial del Territorio</h3>
              <p className="text-xs text-text-dim">{stat.bairroName} - Territorio {stat.name}</p>
            </div>
            <button onClick={() => setSelectedHistoryId(null)} className="text-text-dim hover:text-text-main"><X size={20}/></button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1">
            {stat.historial.length === 0 ? (
              <div className="text-center py-8 text-text-dim">
                <History size={48} className="mx-auto mb-3 opacity-20" />
                <p>No hay registros de asignación para este territorio.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stat.historial.map((asig, index) => {
                  const perfil = perfiles.find(p => p.id === asig.perfil_id);
                  const isCurrent = asig.status === 'ACTIVO';
                  return (
                    <div key={asig.id} className="relative pl-6 pb-4 border-l-2 border-border last:border-0 last:pb-0">
                      <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${isCurrent ? 'bg-orange-500' : 'bg-primary'}`} />
                      <div className="bg-bg border border-border rounded-lg p-3">
                        <div className="font-bold text-sm text-text-main">
                          {perfil?.full_name || 'Usuario desconocido'}
                        </div>
                        <div className="flex flex-col gap-1 mt-2 text-xs text-text-dim">
                          <div className="flex items-center gap-1">
                            <CalendarDays size={12} />
                            <span>Entregado: {format(new Date(asig.assigned_at), "dd 'de' MMM, yyyy", { locale: es })}</span>
                          </div>
                          {asig.returned_at ? (
                            <div className="flex items-center gap-1">
                              <CalendarDays size={12} />
                              <span>Devuelto: {format(new Date(asig.returned_at), "dd 'de' MMM, yyyy", { locale: es })}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-500 font-medium">
                              <CalendarDays size={12} />
                              <span>Actualmente asignado ({differenceInDays(new Date(), new Date(asig.assigned_at))} días)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" />
            Estadísticas e Historial
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Analiza qué territorios necesitan atención y revisa su historial completo.
          </p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input 
            type="text" 
            placeholder="Buscar territorio..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-dim">Cargando estadísticas...</div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-accent/30 text-xs uppercase tracking-wider text-text-dim border-b border-border">
                  <th className="p-4 font-bold">Territorio</th>
                  <th className="p-4 font-bold">Última vez trabajado</th>
                  <th className="p-4 font-bold text-center">Veces (12 meses)</th>
                  <th className="p-4 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStats.map(stat => {
                  const isNeglected = !stat.ultimaAsignacion || differenceInMonths(new Date(), new Date(stat.ultimaAsignacion.assigned_at)) >= 6;
                  
                  return (
                    <tr key={stat.territorioId} className="hover:bg-surface-accent/10 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-text-main">Territorio {stat.name}</div>
                        <div className="text-xs text-text-dim">{stat.bairroName} • {stat.totalEnderecos} direcciones</div>
                      </td>
                      <td className="p-4">
                        {!stat.ultimaAsignacion ? (
                          <span className="inline-flex items-center gap-1.5 text-error text-xs font-bold bg-error/10 px-2.5 py-1 rounded-md">
                            <AlertCircle size={14} /> Nunca trabajado
                          </span>
                        ) : (
                          <div>
                            <div className={`text-sm font-medium ${isNeglected ? 'text-error' : 'text-text-main'}`}>
                              {format(new Date(stat.ultimaAsignacion.assigned_at), "dd MMM yyyy", { locale: es })}
                            </div>
                            <div className="text-xs text-text-dim mt-0.5">
                              hace {differenceInMonths(new Date(), new Date(stat.ultimaAsignacion.assigned_at))} meses
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            stat.veces12m === 0 ? 'bg-error/10 text-error' :
                            stat.veces12m >= 2 ? 'bg-whatsapp/10 text-whatsapp' : 'bg-primary/10 text-primary'
                          }`}>
                            {stat.veces12m}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedHistoryId(stat.territorioId)}
                          className="inline-flex items-center gap-1.5 bg-bg hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 text-text-dim py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                        >
                          <History size={14} /> Historial
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renderHistoryModal()}
    </div>
  );
}
