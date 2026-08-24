import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Map, Clock, CheckCircle2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { db, markTerritorioAssigned } = useDatabase();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const allTerritories = db.bairros.flatMap(b => 
    b.territorios.map(t => ({ ...t, bairroName: b.name }))
  );

  const filtered = allTerritories.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.bairroName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Map size={24} className="text-primary" />
            Panel Principal
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Bienvenido, <span className="font-semibold text-text-main">{profile?.full_name || 'Publicador'}</span>. 
            Rol: <span className="text-primary font-bold">{profile?.role || 'PUBLICADOR'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Buscar territorio..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text-main focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => {
          const days = t.lastAssignedDate ? differenceInDays(new Date(), new Date(t.lastAssignedDate)) : null;
          return (
            <div key={t.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
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
                {t.lastAssignedDate ? (
                  <><Clock size={14} className="text-orange-400" /> <span>Asignado hace {days} días</span></>
                ) : (
                  <><CheckCircle2 size={14} className="text-green-500" /> <span className="text-green-500">Disponible</span></>
                )}
              </div>

              {profile?.role !== 'PUBLICADOR' && (
                <button 
                  onClick={() => markTerritorioAssigned(t.id)}
                  className="w-full bg-surface-accent hover:bg-primary/10 text-text-main hover:text-primary font-medium py-2 rounded-lg transition-colors text-sm"
                >
                  Marcar como asignado
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};
