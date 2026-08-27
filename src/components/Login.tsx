import React, { useState } from 'react';
import { Map, Loader2, Mail, Lock, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresa tu correo primero.');
      return;
    }
    setLoading(true);
    setError('');
    setForgotMessage('');
    
    try {
      const { error } = await supabase.rpc('request_password_reset', { user_email: email });
      if (error) throw error;
      setForgotMessage('Solicitud enviada con éxito. Un administrador debe aprobarla para que puedas entrar con la clave por defecto.');
    } catch (err: any) {
      console.error(err);
      setError('Error al solicitar reseteo. Revisa que el correo sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-xl border border-border">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Map size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-text-main text-center mb-2">
          {isForgotPassword ? 'Recuperar Contraseña' : 'Territorios Palhoça'}
        </h1>
        <p className="text-text-dim text-center mb-8">
          {isForgotPassword ? 'Enviaremos una solicitud a los administradores.' : 'Inicia sesión para continuar'}
        </p>

        {error && (
          <div className="mb-6 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        
        {forgotMessage && (
          <div className="mb-6 bg-whatsapp/10 border border-whatsapp/20 text-whatsapp px-4 py-3 rounded-xl text-sm text-center font-medium">
            {forgotMessage}
          </div>
        )}

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4">
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

          {!isForgotPassword && (
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-3 text-text-dim" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:outline-none focus:border-primary"
                required={!isForgotPassword}
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            <span>{isForgotPassword ? 'Enviar Solicitud' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => {
              setIsForgotPassword(!isForgotPassword);
              setError('');
              setForgotMessage('');
            }}
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center justify-center gap-2 mx-auto"
          >
            <KeyRound size={16} />
            {isForgotPassword ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
          </button>
        </div>
      </div>
    </div>
  );
};
