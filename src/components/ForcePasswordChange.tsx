import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function ForcePasswordChange() {
  const { user, logOut, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      // 1. Actualizar la contraseña en la bóveda de autenticación
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // 2. Marcar en el perfil que ya la cambió
      const { error: dbError } = await supabase
        .from('perfiles')
        .update({ debe_cambiar_clave: false })
        .eq('id', user?.id);

      if (dbError) throw dbError;

      // 3. Refrescar el perfil para quitar el bloqueo de la pantalla
      await refreshProfile();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cambiar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-xl font-bold text-text-main mb-2">Seguridad de la Cuenta</h2>
          <p className="text-sm text-text-dim">
            Para proteger la privacidad de los territorios, debes cambiar la contraseña por defecto por una personal antes de continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors"
              placeholder="Repite la nueva contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar y Continuar'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <button 
            onClick={logOut}
            className="text-sm text-text-dim hover:text-text-main transition-colors"
          >
            Cerrar sesión y hacerlo más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
