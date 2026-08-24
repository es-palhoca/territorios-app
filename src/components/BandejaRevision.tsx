import React, { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { MapPin, Globe, CalendarX2, Check, X, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function BandejaRevision() {
  const { db, approveGPS, updateEndereco, removeEndereco } = useDatabase();

  const todasLasDirecciones = db.bairros.flatMap(b => b.territorios.flatMap(t => t.enderecos.map(e => ({ ...e, territorioName: t.name, bairroName: b.name }))));

  const gpsPendientes = todasLasDirecciones.filter(e => e.gps_status === 'PENDING');
  const estadosCriticos = todasLasDirecciones.filter(e => e.status === 'NO_EXTRANJERO');

  const openMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-main mb-2">Bandeja de Revisión</h1>
        <p className="text-text-dim">Revisa los cambios importantes reportados por los publicadores.</p>
      </div>

      {/* GPS PENDIENTES */}
      <section>
        <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <MapPin className="text-primary" /> GPS Pendientes de Aprobación ({gpsPendientes.length})
        </h2>
        {gpsPendientes.length === 0 ? (
          <p className="text-sm text-text-dim">No hay ubicaciones GPS pendientes de revisión.</p>
        ) : (
          <div className="space-y-3">
            {gpsPendientes.map(end => (
              <div key={end.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-text-dim uppercase font-bold mb-1">{end.bairroName} - Territorio {end.territorioName}</div>
                  <h3 className="font-bold text-text-main">{end.street} {end.number}</h3>
                  <div className="text-sm text-text-dim mt-1">
                    Lat: {end.lat?.toFixed(5)}, Lng: {end.lng?.toFixed(5)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openMap(end.lat!, end.lng!)}
                    className="flex-1 md:flex-none text-xs bg-bg border border-border hover:bg-surface-accent text-text-main py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink size={14} /> Ver en Mapa
                  </button>
                  <button 
                    onClick={() => approveGPS(end.id)}
                    className="flex-1 md:flex-none text-xs bg-whatsapp hover:bg-whatsapp/90 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors font-bold shadow-md"
                  >
                    <Check size={14} /> Aprobar
                  </button>
                  <button 
                    onClick={() => updateEndereco(end.id, end.street, end.number, end.observations, end.status, end.statusComment, end.statusDate)} 
                    // To reject, we'd ideally remove lat/lng, but currently updateEndereco doesn't clear them natively. We'll leave it as a quick reset or just not support rejection yet to keep it simple. For now, let's implement a quick clear.
                    // Wait, if I just update gps_status to null, we need a reject function. Let's skip reject for v1, if they don't approve they just don't click approve.
                    className="hidden"
                  >
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ESTADOS CRITICOS */}
      <section>
        <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <Globe className="text-error" /> Descartados por Publicadores ({estadosCriticos.length})
        </h2>
        {estadosCriticos.length === 0 ? (
          <p className="text-sm text-text-dim">No hay direcciones descartadas pendientes de revisión.</p>
        ) : (
          <div className="space-y-3">
            {estadosCriticos.map(end => (
              <div key={end.id} className="bg-surface border border-error/20 rounded-xl p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-text-dim uppercase font-bold mb-1">{end.bairroName} - Territorio {end.territorioName}</div>
                  <h3 className="font-bold text-text-main">{end.street} {end.number}</h3>
                  <div className="mt-2 text-sm bg-error/10 text-error inline-block px-2 py-1 rounded-md font-bold">
                    {end.status === 'NO_EXTRANJERO' ? 'No es extranjero' : 'No visitar'}
                  </div>
                  {end.observations && (
                    <p className="text-sm text-text-dim mt-2 bg-bg p-2 rounded-lg border border-border">Obs: {end.observations}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                  <button 
                    onClick={() => {
                      if (confirm('¿Eliminar esta dirección permanentemente del territorio?')) {
                        removeEndereco(end.id);
                      }
                    }}
                    className="w-full text-xs bg-error hover:bg-error/90 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-md"
                  >
                    <Trash2 size={14} /> Eliminar de la base de datos
                  </button>
                  <button 
                    onClick={() => updateEndereco(end.id, end.street, end.number, end.observations, undefined, undefined, undefined)}
                    className="w-full text-xs bg-bg hover:bg-surface-accent border border-border text-text-main py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Check size={14} /> Mantener y quitar estado
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
