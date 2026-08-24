/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import MisAsignaciones from './components/MisAsignaciones';
import PanelGestion from './components/PanelGestion';
import Configuracion from './components/Configuracion';
import BandejaRevision from './components/BandejaRevision';
import Estadisticas from './components/Estadisticas';
import { Map, LogOut, Loader2, CheckCircle2, AlertCircle, Home, ClipboardList, Settings as SettingsIcon, Inbox, BarChart3 } from 'lucide-react';
import { cn } from './lib/utils';

type Tab = 'mis_asignaciones' | 'gestion' | 'configuracion' | 'revision' | 'estadisticas';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('mis_asignaciones');
  const { importState } = useDatabase();
  const { user, profile, logOut } = useAuth();

  // Si tiene que cambiar la clave, bloqueamos toda la UI principal
  if (profile?.debe_cambiar_clave) {
    return <ForcePasswordChange />;
  }

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'CONDUCTOR';
  const isAdmin = profile?.role === 'ADMIN';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg font-sans text-text-main relative">
      {/* Global Progress Toast */}
      {importState.status !== 'idle' && (
        <div className="fixed top-16 md:top-6 right-4 md:right-6 z-50 bg-surface border border-border rounded-xl shadow-lg p-4 w-72 md:w-80 animate-in slide-in-from-top-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-main flex items-center">
              {importState.isProcessing ? (
                <><Loader2 size={16} className="mr-2 animate-spin text-primary" /> Procesando...</>
              ) : importState.status === 'success' ? (
                <><CheckCircle2 size={16} className="mr-2 text-whatsapp" /> ¡Completado!</>
              ) : (
                <><AlertCircle size={16} className="mr-2 text-red-400" /> Fallo parcial</>
              )}
            </span>
            <span className="text-xs text-text-dim">{importState.progress}%</span>
          </div>
          <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${importState.status === 'error' ? 'bg-red-400' : importState.status === 'success' ? 'bg-whatsapp' : 'bg-primary'}`}
              style={{ width: `${importState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border shrink-0">
        <div className="font-extrabold text-lg text-primary flex items-center gap-2.5">
          <Map size={20} />
          TERRITORIO PRO
        </div>
        <button onClick={logOut} className="text-text-dim hover:text-text-main">
          <LogOut size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[280px] bg-surface border-r border-border flex-col p-6 shrink-0 relative overflow-y-auto">
        <div className="font-extrabold text-lg text-primary mb-8 flex items-center gap-2.5">
          <Map size={20} />
          TERRITORIO PRO
        </div>
        
        <nav className="mb-8 flex-1">
          <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3">Principal</div>
          
          <button
            onClick={() => setActiveTab('mis_asignaciones')}
            className={cn(
              "w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors mb-1 gap-3",
              activeTab === 'mis_asignaciones' 
                ? "bg-surface-accent text-text-main" 
                : "text-text-dim hover:bg-surface-accent hover:text-text-main"
            )}
          >
            <Home size={18} />
            Mis Asignaciones
          </button>

          {canManage && (
            <>
              <button
                onClick={() => setActiveTab('gestion')}
                className={cn(
                  "w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors mb-1 gap-3",
                  activeTab === 'gestion' 
                    ? "bg-surface-accent text-text-main" 
                    : "text-text-dim hover:bg-surface-accent hover:text-text-main"
                )}
              >
                <ClipboardList size={18} />
                Gestión de Territorios
              </button>
              <button
                onClick={() => setActiveTab('estadisticas')}
                className={cn(
                  "w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors mb-1 gap-3",
                  activeTab === 'estadisticas' 
                    ? "bg-surface-accent text-text-main" 
                    : "text-text-dim hover:bg-surface-accent hover:text-text-main"
                )}
              >
                <BarChart3 size={18} />
                Estadísticas
              </button>
            </>
          )}
        </nav>

        {isAdmin && (
          <nav className="mb-8">
            <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3">Sistema</div>
            <button
              onClick={() => setActiveTab('revision')}
              className={cn(
                "w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors mb-1 gap-3",
                activeTab === 'revision' 
                  ? "bg-surface-accent text-text-main" 
                  : "text-text-dim hover:bg-surface-accent hover:text-text-main"
              )}
            >
              <Inbox size={18} />
              Bandeja de Revisión
            </button>
            <button
              onClick={() => setActiveTab('configuracion')}
              className={cn(
                "w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors mb-1 gap-3",
                activeTab === 'configuracion' 
                  ? "bg-surface-accent text-text-main" 
                  : "text-text-dim hover:bg-surface-accent hover:text-text-main"
              )}
            >
              <SettingsIcon size={18} />
              Configuraciones
            </button>
          </nav>
        )}

        <button onClick={logOut} className="w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm text-error hover:bg-error/10 transition-colors gap-3 mb-6">
          <LogOut size={18} />
          Cerrar Sesión
        </button>

        <div className="mt-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-border">
          <div className="text-xs text-text-dim mb-2">Cuenta actual ({profile?.role})</div>
          <div className="text-sm font-bold text-secondary truncate" title={user?.email || ''}>{profile?.full_name || user?.email}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg relative">
        <div className="h-full w-full max-w-5xl mx-auto flex flex-col">
          {activeTab === 'mis_asignaciones' && <MisAsignaciones />}
          {activeTab === 'gestion' && canManage && <PanelGestion />}
          {activeTab === 'estadisticas' && canManage && <Estadisticas />}
          {activeTab === 'configuracion' && isAdmin && <Configuracion />}
          {activeTab === 'revision' && isAdmin && <BandejaRevision />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden flex bg-surface border-t border-border shrink-0 pb-2">
        <button
          onClick={() => setActiveTab('mis_asignaciones')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
            activeTab === 'mis_asignaciones' ? "text-primary" : "text-text-dim hover:text-text-main"
          )}
        >
          <Home size={20} />
          <span className="text-[10px] font-medium">Asig.</span>
        </button>
        
        {canManage && (
          <>
            <button
              onClick={() => setActiveTab('gestion')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
                activeTab === 'gestion' ? "text-primary" : "text-text-dim hover:text-text-main"
              )}
            >
              <ClipboardList size={20} />
              <span className="text-[10px] font-medium">Gestión</span>
            </button>
            <button
              onClick={() => setActiveTab('estadisticas')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
                activeTab === 'estadisticas' ? "text-primary" : "text-text-dim hover:text-text-main"
              )}
            >
              <BarChart3 size={20} />
              <span className="text-[10px] font-medium">Stats</span>
            </button>
          </>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('revision')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
              activeTab === 'revision' ? "text-primary" : "text-text-dim hover:text-text-main"
            )}
          >
            <Inbox size={20} />
            <span className="text-[10px] font-medium">Revisión</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('configuracion')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
              activeTab === 'configuracion' ? "text-primary" : "text-text-dim hover:text-text-main"
            )}
          >
            <SettingsIcon size={20} />
            <span className="text-[10px] font-medium">Ajustes</span>
          </button>
        )}
      </nav>
    </div>
  );
}

const AppRouter = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-bg relative overflow-hidden">
        {/* Mobile Header Skeleton */}
        <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 bg-surface-accent rounded-md animate-pulse"></div>
            <div className="h-5 w-32 bg-surface-accent rounded-md animate-pulse"></div>
          </div>
          <div className="h-5 w-5 bg-surface-accent rounded-md animate-pulse"></div>
        </div>

        {/* Sidebar Skeleton (Desktop) */}
        <div className="hidden md:flex flex-col bg-surface border-r border-border shrink-0 w-64 p-4 animate-pulse">
          <div className="flex items-center gap-2.5 mb-8 px-2">
            <div className="h-6 w-6 bg-surface-accent rounded-md"></div>
            <div className="h-6 w-32 bg-surface-accent rounded-md"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-full bg-surface-accent rounded-xl"></div>
            <div className="h-10 w-full bg-surface-accent/50 rounded-xl"></div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 animate-pulse overflow-hidden">
          <div className="h-8 w-48 bg-surface-accent rounded-md mb-6 md:mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="h-28 sm:h-32 bg-surface-accent rounded-xl sm:rounded-2xl border border-border/50"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
