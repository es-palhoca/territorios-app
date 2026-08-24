import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';

export const Settings: React.FC = () => {
  const { db, updateSettings } = useDatabase();
  const [city, setCity] = useState(db.city || '');
  const [state, setState] = useState(db.state || '');

  const handleSave = () => {
    updateSettings(city, state);
    alert('Configuración guardada.');
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
      <h1 className="text-2xl font-bold text-text-main mb-6">Configuración</h1>
      <div className="max-w-md bg-surface p-6 rounded-xl border border-border">
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-dim mb-1">Ciudad</label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text-main focus:border-primary focus:outline-none"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-dim mb-1">Estado</label>
          <input
            type="text"
            value={state}
            onChange={e => setState(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text-main focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 rounded-lg transition-colors"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};
