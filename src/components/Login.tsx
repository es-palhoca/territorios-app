import React, { useState } from 'react';
import { Map, Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error('El nombre es obligatorio.');
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() }
          }
        });
        
        if (signUpError) throw signUpError;
        setMessage('Cuenta creada con éxito. Ya puedes iniciar sesión.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Correo o contraseña incorrectos.');
          }
          throw signInError;
        }
        // AuthContext detectará automáticamente la sesión y redirigirá
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Error de autenticación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-xl p-8 relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
          <Map size={32} className="text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-text-main mb-2 text-center">Territorio Pro</h1>
        <p className="text-text-dim text-center mb-6 text-sm">
          {isSignUp ? 'Crea una cuenta para tu congregación' : 'Accede para gestionar tus territorios'}
        </p>

        {error && (
          <div className="w-full bg-error/10 text-error text-sm p-3 rounded-lg border border-error/20 mb-4 text-center">
            {error}
          </div>
        )}
        
        {message && (
          <div className="w-full bg-green-500/10 text-green-600 text-sm p-3 rounded-lg border border-green-500/20 mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="w-full space-y-4">
          {isSignUp && (
            <div className="relative">
              <UserIcon size={20} className="absolute left-3 top-3 text-text-dim" />
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:outline-none focus:border-primary"
                required
              />
            </div>
          )}
          
          <div className="relative">
            <Mail size={20} className="absolute left-3 top-3 text-text-dim" />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="relative">
            <Lock size={20} className="absolute left-3 top-3 text-text-dim" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:outline-none focus:border-primary"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            <span>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        <button 
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
          className="mt-6 text-sm text-text-dim hover:text-primary transition-colors"
        >
          {isSignUp ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
        </button>
      </div>
    </div>
  );
};
