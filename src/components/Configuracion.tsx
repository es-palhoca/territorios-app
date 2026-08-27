import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { Settings as SettingsIcon, Users, UserPlus, Save, Loader2, Key } from 'lucide-react';
import { UserProfile } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';

export default function Configuracion() {
  const [perfiles, setPerfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'add'>('users');
  const [searchUser, setSearchUser] = useState('');

  // Formulario nuevo usuario
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'PUBLICADOR' | 'CONDUCTOR' | 'ADMIN'>('PUBLICADOR');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchPerfiles();
  }, []);

  const fetchPerfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('full_name');
    
    if (!error && data) {
      setPerfiles(data as UserProfile[]);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('perfiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      setPerfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole as any } : p));
    } else {
      alert("Error al cambiar el rol");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres forzar a este usuario a cambiar su contraseña? Su contraseña temporal será 123456.')) return;
    
    const { error } = await supabase.rpc('admin_reset_user_password', { target_user_id: userId });

    if (!error) {
      alert("Contraseña reseteada a 123456 exitosamente.");
      fetchPerfiles();
    } else {
      alert("Error al restablecer la contraseña. Asegúrate de haber creado la función SQL en Supabase. Detalles: " + error.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      // Usamos un cliente secundario para no cerrar la sesión del administrador actual
      const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      // 1. Crear el usuario en Auth
      const { data, error } = await secondarySupabase.auth.signUp({
        email: newEmail.trim(),
        password: '123456', // Contraseña por defecto obligatoria de cambiar
        options: {
          data: {
            full_name: newName.trim(),
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("No se pudo crear el usuario");

      // 2. Esperar un segundo para que el trigger de Supabase cree el perfil inicial
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Actualizar el perfil con el rol correcto y forzar el cambio de clave
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ 
          role: newRole,
          debe_cambiar_clave: true
        })
        .eq('id', data.user.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: `Usuario ${newName} creado correctamente con la contraseña por defecto: 123456` });
      setNewName('');
      setNewEmail('');
      setNewRole('PUBLICADOR');
      fetchPerfiles();

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Error al crear el usuario' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <SettingsIcon size={24} className="text-primary" />
            Configuración del Sistema
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Administra los usuarios y permisos de la congregación.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-text-dim hover:text-text-main'}`}
        >
          <Users size={16} /> Lista de Usuarios
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'add' ? 'text-primary border-b-2 border-primary' : 'text-text-dim hover:text-text-main'}`}
        >
          <UserPlus size={16} /> Registrar Nuevo
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary focus:outline-none"
            />
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-text-dim">Cargando usuarios...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg text-text-dim uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 font-bold">Nombre</th>
                      <th className="px-6 py-4 font-bold">Correo (Email)</th>
                      <th className="px-6 py-4 font-bold">Rol</th>
                      <th className="px-6 py-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {perfiles
                      .filter(p => p.full_name.toLowerCase().includes(searchUser.toLowerCase()) || p.email.toLowerCase().includes(searchUser.toLowerCase()))
                      .map(p => (
                      <tr key={p.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-text-main">{p.full_name}</td>
                        <td className="px-6 py-4 text-text-dim">{p.email}</td>
                        <td className="px-6 py-4">
                        <select
                          value={p.role}
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          className="bg-bg border border-border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-primary"
                        >
                          <option value="PUBLICADOR">Publicador</option>
                          <option value="CONDUCTOR">Conductor</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleResetPassword(p.id)}
                          className="text-xs flex items-center gap-1 ml-auto bg-surface-accent hover:bg-orange-500/10 text-text-dim hover:text-orange-500 px-3 py-1.5 rounded-lg transition-colors"
                          title="Forzar cambio de clave en el próximo login"
                        >
                          <Key size={14} /> Forzar Clave
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

    {activeTab === 'add' && (
        <div className="max-w-md bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Registrar Nuevo Hermano</h2>
          
          {message && (
            <div className={`mb-6 p-3 rounded-lg text-sm border ${message.type === 'success' ? 'bg-whatsapp/10 border-whatsapp/20 text-whatsapp' : 'bg-error/10 border-error/20 text-error'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-dim mb-1">Nombre Completo</label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-dim mb-1">Correo Electrónico (Falso o Real)</label>
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                placeholder="Ej. juan.perez@palhoca.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-dim mb-1">Rol de Acceso</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
              >
                <option value="PUBLICADOR">Publicador (Solo ve sus territorios)</option>
                <option value="CONDUCTOR">Conductor (Puede asignar territorios)</option>
                <option value="ADMIN">Administrador (Acceso total)</option>
              </select>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Crear y Guardar Usuario
              </button>
              <p className="text-[11px] text-text-dim text-center mt-3">
                El usuario será creado con la contraseña <strong className="text-text-main">123456</strong> y el sistema le obligará a cambiarla cuando inicie sesión.
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
