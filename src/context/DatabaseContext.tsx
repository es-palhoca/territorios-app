import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bairro, Database, Endereco, Territorio, ChatSession, HistoryEntry } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface ImportState {
  isProcessing: boolean;
  progress: number;
  status: 'idle' | 'processing' | 'success' | 'error';
}

interface DatabaseContextType {
  db: Database;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  addBairro: (name: string) => Bairro;
  updateBairro: (id: string, name: string) => void;
  removeBairro: (id: string) => void;
  addTerritorio: (bairroId: string, name: string) => Territorio | null;
  updateTerritorio: (id: string, name: string, lastAssignedDate?: string) => void;
  removeTerritorio: (id: string) => void;
  addEndereco: (territorioId: string, street: string, number: string, observations?: string, status?: string, statusComment?: string, statusDate?: string) => Endereco;
  updateEndereco: (id: string, street: string, number: string, observations?: string, status?: string, statusComment?: string, statusDate?: string) => void;
  removeEndereco: (id: string) => void;
  resetTerritorioStatuses: (territorioId: string) => void;
  markTerritorioAssigned: (id: string) => void;
  saveChat: (session: ChatSession) => void;
  deleteChat: (id: string) => void;
  exportDb: () => string;
  importDb: (json: string) => boolean;
  mergeBulkData: (parsedData: any[]) => void;
  updateSettings: (city: string, state: string) => void;
  clearDatabase: () => void;
  moveTerritorio: (territorioId: string, overId: string, targetBairroId?: string) => void;
  importState: ImportState;
  startBulkImport: (text: string) => Promise<void>;
  getDb: () => Database;
  history: HistoryEntry[];
  undo: (id: string) => void;
  splitLargeTerritories: () => void;
  saveGPS: (id: string, lat: number, lng: number) => void;
  approveGPS: (id: string) => void;
  rejectGPS: (id: string) => void;
  moveTerritorioToBairro: (territorioId: string, newBairroId: string) => void;
  moveEnderecoToTerritorio: (enderecoId: string, newTerritorioId: string) => void;
}

const defaultDb: Database = { bairros: [], chats: [] };

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [db, setDbState] = useState<Database>(defaultDb);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const dbRef = useRef<Database>(db);

  const [importState, setImportState] = useState<ImportState>({
    isProcessing: false, progress: 0, status: 'idle'
  });

  const setDb = (updater: Database | ((prev: Database) => Database)) => {
    const nextState = typeof updater === 'function' ? updater(dbRef.current) : updater;
    dbRef.current = nextState;
    setDbState(nextState);
  };

  const pushHistory = (description: string) => {
    setHistory(prev => [{ id: uuidv4(), timestamp: Date.now(), description, snapshot: JSON.parse(JSON.stringify(dbRef.current)) }, ...prev].slice(0, 10));
  };

  const undo = (id: string) => {
    const entryIndex = history.findIndex(h => h.id === id);
    if (entryIndex === -1) return;
    setDb(history[entryIndex].snapshot);
    setHistory(prev => prev.slice(entryIndex + 1));
  };

  useEffect(() => {
    if (!user) return;
    fetchDatabase();
  }, [user]);

  const fetchDatabase = async () => {
    // Obtenemos los datos de Supabase
    const [{ data: bairrosData }, { data: territoriosData }, { data: enderecosData }] = await Promise.all([
      supabase.from('bairros').select('*'),
      supabase.from('territorios').select('*'),
      supabase.from('enderecos').select('*')
    ]);

    // Reconstruimos la estructura anidada para compatibilidad con el frontend actual
    const bairros = (bairrosData || []).map(b => ({
      id: b.id,
      name: b.name,
      territorios: (territoriosData || []).filter(t => t.bairro_id === b.id).map(t => ({
        id: t.id,
        bairroId: t.bairro_id,
        name: t.name,
        lastAssignedDate: t.last_assigned_date,
        enderecos: (enderecosData || []).filter(e => e.territorio_id === t.id).map(e => ({
          id: e.id,
          street: e.street,
          number: e.number,
          observations: e.observations || undefined,
          status: e.status || undefined,
          statusComment: e.status_comment || undefined,
          statusDate: e.status_date || undefined,
          lat: e.lat || undefined,
          lng: e.lng || undefined,
          gps_status: e.gps_status || undefined
        }))
      }))
    }));

    setDb({ bairros, chats: [] });
  };

  const addBairro = (name: string) => {
    const id = uuidv4();
    const newBairro: Bairro = { id, name, territorios: [] };
    setDb(prev => ({ ...prev, bairros: [...prev.bairros, newBairro] }));
    supabase.from('bairros').insert({ id, name }).then();
    return newBairro;
  };

  const updateBairro = (id: string, name: string) => {
    setDb(prev => ({ ...prev, bairros: prev.bairros.map(b => b.id === id ? { ...b, name } : b) }));
    supabase.from('bairros').update({ name }).eq('id', id).then();
  };

  const removeBairro = (id: string) => {
    setDb(prev => ({ ...prev, bairros: prev.bairros.filter(b => b.id !== id) }));
    supabase.from('bairros').delete().eq('id', id).then();
  };

  const addTerritorio = (bairroId: string, name: string) => {
    const id = uuidv4();
    const newTerritorio: Territorio = { id, bairroId, name, enderecos: [] };
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => b.id === bairroId ? { ...b, territorios: [...b.territorios, newTerritorio] } : b)
    }));
    supabase.from('territorios').insert({ id, bairro_id: bairroId, name }).then();
    return newTerritorio;
  };

  const updateTerritorio = (id: string, name: string, lastAssignedDate?: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => t.id === id ? { ...t, name: name || t.name, lastAssignedDate: lastAssignedDate !== undefined ? lastAssignedDate : t.lastAssignedDate } : t)
      }))
    }));
    
    const payload: any = {};
    if (name) payload.name = name;
    if (lastAssignedDate !== undefined) payload.last_assigned_date = lastAssignedDate || null;
    supabase.from('territorios').update(payload).eq('id', id).then();
  };

  const removeTerritorio = (id: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({ ...b, territorios: b.territorios.filter(t => t.id !== id) }))
    }));
    supabase.from('territorios').delete().eq('id', id).then();
  };

  const addEndereco = (territorioId: string, street: string, number: string, observations?: string, status?: string, statusComment?: string, statusDate?: string) => {
    const id = uuidv4();
    const newEndereco: Endereco = { id, street, number, observations, status, statusComment, statusDate };
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => t.id === territorioId ? { ...t, enderecos: [...t.enderecos, newEndereco] } : t)
      }))
    }));
    
    supabase.from('enderecos').insert({
      id, 
      territorio_id: territorioId, 
      street, 
      number, 
      observations: observations || null, 
      status: status || null, 
      status_comment: statusComment || null, 
      status_date: statusDate || null
    }).then();
    
    return newEndereco;
  };

  const updateEndereco = (id: string, street: string, number: string, observations?: string, status?: string, statusComment?: string, statusDate?: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => ({
          ...t, enderecos: t.enderecos.map(e => e.id === id ? { ...e, street, number, observations, status, statusComment, statusDate } : e)
        }))
      }))
    }));

    supabase.from('enderecos').update({
      street, 
      number, 
      observations: observations || null, 
      status: status || null, 
      status_comment: statusComment || null, 
      status_date: statusDate || null
    }).eq('id', id).then();
  };

  const saveGPS = (id: string, lat: number, lng: number) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => ({
          ...t, enderecos: t.enderecos.map(e => e.id === id ? { ...e, lat, lng, gps_status: 'PENDING' } : e)
        }))
      }))
    }));
    supabase.from('enderecos').update({ lat, lng, gps_status: 'PENDING' }).eq('id', id).then();
  };

  const approveGPS = (id: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => ({
          ...t, enderecos: t.enderecos.map(e => e.id === id ? { ...e, gps_status: 'VERIFIED' } : e)
        }))
      }))
    }));
    supabase.from('enderecos').update({ gps_status: 'VERIFIED' }).eq('id', id).then();
  };

  const rejectGPS = (id: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => ({
          ...t, enderecos: t.enderecos.map(e => e.id === id ? { ...e, lat: undefined, lng: undefined, gps_status: undefined } : e)
        }))
      }))
    }));
    supabase.from('enderecos').update({ lat: null, lng: null, gps_status: null }).eq('id', id).then();
  };

  const moveTerritorioToBairro = (territorioId: string, newBairroId: string) => {
    let targetTerritorio: any = null;
    setDb(prev => {
      // Find the territorio
      prev.bairros.forEach(b => {
        const t = b.territorios.find(t => t.id === territorioId);
        if (t) targetTerritorio = t;
      });
      if (!targetTerritorio) return prev;

      return {
        ...prev,
        bairros: prev.bairros.map(b => {
          // Remove from old
          if (b.territorios.some(t => t.id === territorioId)) {
            return { ...b, territorios: b.territorios.filter(t => t.id !== territorioId) };
          }
          // Add to new
          if (b.id === newBairroId) {
            return { ...b, territorios: [...b.territorios, { ...targetTerritorio, bairroId: newBairroId }] };
          }
          return b;
        })
      };
    });
    if (targetTerritorio) {
      supabase.from('territorios').update({ bairro_id: newBairroId }).eq('id', territorioId).then();
    }
  };

  const moveEnderecoToTerritorio = (enderecoId: string, newTerritorioId: string) => {
    let targetEndereco: any = null;
    setDb(prev => {
      prev.bairros.forEach(b => {
        b.territorios.forEach(t => {
          const e = t.enderecos.find(e => e.id === enderecoId);
          if (e) targetEndereco = e;
        });
      });
      if (!targetEndereco) return prev;

      return {
        ...prev,
        bairros: prev.bairros.map(b => ({
          ...b,
          territorios: b.territorios.map(t => {
            // Remove from old
            if (t.enderecos.some(e => e.id === enderecoId)) {
              return { ...t, enderecos: t.enderecos.filter(e => e.id !== enderecoId) };
            }
            // Add to new
            if (t.id === newTerritorioId) {
              return { ...t, enderecos: [...t.enderecos, targetEndereco] };
            }
            return t;
          })
        }))
      };
    });
    if (targetEndereco) {
      supabase.from('enderecos').update({ territorio_id: newTerritorioId }).eq('id', enderecoId).then();
    }
  };

  const removeEndereco = (id: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => ({ ...t, enderecos: t.enderecos.filter(e => e.id !== id) }))
      }))
    }));
    supabase.from('enderecos').delete().eq('id', id).then();
  };

  const resetTerritorioStatuses = (territorioId: string) => {
    setDb(prev => ({
      ...prev,
      bairros: prev.bairros.map(b => ({
        ...b, territorios: b.territorios.map(t => t.id === territorioId ? {
          ...t, enderecos: t.enderecos.map(e => ({ ...e, status: undefined, statusComment: undefined, statusDate: undefined }))
        } : t)
      }))
    }));
    supabase.from('enderecos').update({ status: null, status_comment: null, status_date: null }).eq('territorio_id', territorioId).then();
  };

  const markTerritorioAssigned = (id: string) => {
    const d = new Date().toISOString();
    updateTerritorio(id, '', d);
  };

  // Implementaciones stub para funciones que ya no usamos con la nueva BD
  const saveChat = () => {};
  const deleteChat = () => {};
  const exportDb = () => JSON.stringify(dbRef.current);
  const importDb = (json: string) => false;
  const mergeBulkData = (data: any[]) => {};
  const updateSettings = () => {};
  const clearDatabase = () => {};
  const moveTerritorio = () => {};
  const startBulkImport = async () => {};
  const getDb = () => dbRef.current;
  const splitLargeTerritories = () => {};

  return (
    <DatabaseContext.Provider value={{
      db, setDb, addBairro, updateBairro, removeBairro, addTerritorio, updateTerritorio, removeTerritorio, addEndereco, updateEndereco, removeEndereco, resetTerritorioStatuses, markTerritorioAssigned, saveChat, deleteChat, exportDb, importDb, mergeBulkData, updateSettings, clearDatabase, moveTerritorio, importState, startBulkImport, getDb, history, undo, splitLargeTerritories, saveGPS, approveGPS, rejectGPS, moveTerritorioToBairro, moveEnderecoToTerritorio
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};
