/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
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

function AppLayout({ children }: { children: React.ReactNode }) {
  const { importState } = useDatabase();
  const { user, profile, logOut } = useAuth();
  const location = useLocation();

  if (profile?.debe_cambiar_clave) {
    return <ForcePasswordChange />;
  }

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'CONDUCTOR';
  const isAdmin = profile?.role === 'ADMIN';

  const navLinkClass = (isActive: boolean) => cn(
    "w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors mb-1 gap-3",
    isActive ? "bg-surface-accent text-text-main" : "text-text-dim hover:bg-surface-accent hover:text-text-main"
  );

  const mobileNavLinkClass = (isActive: boolean) => cn(
    "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
    isActive ? "text-primary" : "text-text-dim hover:text-text-main"
  );

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
          <div className="h-2 w-full bg-surface-accent rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-300", importState.status === 'error' ? 'bg-red-400' : 'bg-primary')}
              style={{ width: `${importState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-border shrink-0 flex-col p-4 z-10 shadow-sm">
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Map size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-text-main">Territorios <span className="text-primary">Pro</span></h1>
        </div>

        <nav className="flex-1">
          <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3">Mi Trabajo</div>
          <NavLink to="/mis-asignaciones" className={({isActive}) => navLinkClass(isActive)}>
            <Home size={18} /> Mis Asignaciones
          </NavLink>

          {canManage && (
            <>
              <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3 mt-6">Administración</div>
              <NavLink to="/gestion" className={({isActive}) => navLinkClass(isActive)}>
                <ClipboardList size={18} /> Gestión de Territorios
              </NavLink>
              <NavLink to="/estadisticas" className={({isActive}) => navLinkClass(isActive)}>
                <BarChart3 size={18} /> Estadísticas
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3 mt-6">Sistema</div>
              <NavLink to="/revision" className={({isActive}) => navLinkClass(isActive)}>
                <Inbox size={18} /> Bandeja de Revisión
              </NavLink>
              <NavLink to="/configuracion" className={({isActive}) => navLinkClass(isActive)}>
                <SettingsIcon size={18} /> Configuraciones
              </NavLink>
            </>
          )}
        </nav>

        <button onClick={logOut} className="w-full flex items-center px-3.5 py-2.5 rounded-lg text-sm text-error hover:bg-error/10 transition-colors gap-3 mb-6 mt-4">
          <LogOut size={18} /> Cerrar Sesión
        </button>

        <div className="mt-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-border">
          <div className="text-xs text-text-dim mb-2">Cuenta actual ({profile?.role})</div>
          <div className="text-sm font-bold text-secondary truncate" title={user?.email || ''}>{profile?.full_name || user?.email}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg relative">
        <div className="h-full w-full max-w-5xl mx-auto flex flex-col">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden flex bg-surface border-t border-border shrink-0 pb-2 safe-area-pb">
        <NavLink to="/mis-asignaciones" className={({isActive}) => mobileNavLinkClass(isActive)}>
          <Home size={20} /> <span className="text-[10px] font-medium">Asig.</span>
        </NavLink>
        
        {canManage && (
          <>
            <NavLink to="/gestion" className={({isActive}) => mobileNavLinkClass(isActive)}>
              <ClipboardList size={20} /> <span className="text-[10px] font-medium">Gestión</span>
            </NavLink>
            <NavLink to="/estadisticas" className={({isActive}) => mobileNavLinkClass(isActive)}>
              <BarChart3 size={20} /> <span className="text-[10px] font-medium">Stats</span>
            </NavLink>
          </>
        )}

        {isAdmin && (
          <>
            <NavLink to="/revision" className={({isActive}) => mobileNavLinkClass(isActive)}>
              <Inbox size={20} /> <span className="text-[10px] font-medium">Revisión</span>
            </NavLink>
            <NavLink to="/configuracion" className={({isActive}) => mobileNavLinkClass(isActive)}>
              <SettingsIcon size={20} /> <span className="text-[10px] font-medium">Ajustes</span>
            </NavLink>
          </>
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
        {/* Sidebar Skeleton */}
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
          <div className="h-32 bg-surface-accent rounded-2xl border border-border/50"></div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const canManage = profile.role === 'ADMIN' || profile.role === 'CONDUCTOR';
  const isAdmin = profile.role === 'ADMIN';

  return (
    <BrowserRouter>
      <DatabaseProvider>
        <AppLayout>
          <Routes>
            <Route path="/mis-asignaciones" element={<MisAsignaciones />} />
            {canManage && <Route path="/gestion" element={<PanelGestion />} />}
            {canManage && <Route path="/estadisticas" element={<Estadisticas />} />}
            {isAdmin && <Route path="/revision" element={<BandejaRevision />} />}
            {isAdmin && <Route path="/configuracion" element={<Configuracion />} />}
            <Route path="*" element={<Navigate to="/mis-asignaciones" replace />} />
          </Routes>
        </AppLayout>
      </DatabaseProvider>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
