import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Map, Send, Loader2, CheckCircle2, Home, User, MapPin, MessageSquare, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CensoViewProps {
  userId: string;
}

export const CensoView: React.FC<CensoViewProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [ownerCity, setOwnerCity] = useState('');
  
  // Form fields
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [bairro, setBairro] = useState('');
  const [obs, setObs] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchOwnerDetails = async () => {
      try {
        const boardRef = doc(db, 'boards', userId);
        const boardSnap = await getDoc(boardRef);
        if (boardSnap.exists()) {
          const boardData = boardSnap.data();
          if (boardData.congregationName) {
            setOwnerCity(boardData.congregationName);
          }
        }
      } catch (err) {
        console.log('Could not read board details, keeping simple layout.', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerDetails();
  }, [userId]);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Censo - Cadastrar Novo Endereço";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !street.trim() || !number.trim() || !bairro.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      const censoId = uuidv4();
      const censoRef = doc(db, 'censos', censoId);
      
      await setDoc(censoRef, {
        id: censoId,
        ownerUid: userId,
        publisherName: name.trim(),
        street: street.trim(),
        number: number.trim(),
        bairroName: bairro.trim(),
        observations: obs.trim(),
        createdAt: new Date(),
        read: false
      });
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao enviar o endereço. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-text-dim text-sm">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 md:p-8 text-center shadow-xl animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-whatsapp/10 border border-whatsapp/20 rounded-full flex items-center justify-center mx-auto mb-6 text-whatsapp animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Muito obrigado!</h2>
          <p className="text-text-dim text-sm mb-6">
            O endereço foi cadastrado e enviado com sucesso para revisão da nossa equipe de territórios!
          </p>
          <button 
            onClick={() => {
              setStreet('');
              setNumber('');
              setObs('');
              setSuccess(false);
            }}
            className="w-full py-3 bg-primary hover:bg-opacity-80 active:scale-[0.98] text-white font-medium rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Send size={18} />
            Enviar Outro Endereço
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 md:p-8 relative">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-xl p-6 md:p-8 relative overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div>
        
        {/* Header info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary mb-4">
            <Map size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-text-main tracking-tight">Censo de Endereços</h1>
          <p className="text-sm text-text-dim mt-1.5 font-medium">
            {ownerCity ? ownerCity : 'Ajude a manter os territórios atualizados'}
          </p>
          <div className="inline-block mt-3 bg-surface-accent px-3 py-1 rounded-full text-xs font-semibold text-text-dim border border-border/50">
            Mapeamento Auxiliar
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Publisher Name */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5 flex items-center gap-2">
              <User size={15} className="text-primary" />
              Seu Nome <span className="text-primary">*</span>
            </label>
            <input 
              type="text" 
              required
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Lucas Silva"
              className="w-full bg-bg border border-border text-text-main rounded-xl px-4 py-3 outline-none hover:border-border/80 focus:border-primary transition-all text-sm shadow-inner"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Street */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-main mb-1.5 flex items-center gap-2">
                <MapPin size={15} className="text-primary" />
                Endereço / Rua <span className="text-primary">*</span>
              </label>
              <input 
                type="text" 
                required
                value={street} 
                onChange={e => setStreet(e.target.value)}
                placeholder="Ex: Av. Brasil ou Rua das Flores"
                className="w-full bg-bg border border-border text-text-main rounded-xl px-4 py-3 outline-none hover:border-border/80 focus:border-primary transition-all text-sm shadow-inner"
              />
            </div>

            {/* Number */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-text-main mb-1.5 flex items-center gap-2">
                <Home size={15} className="text-primary" />
                Número <span className="text-primary">*</span>
              </label>
              <input 
                type="text" 
                required
                value={number} 
                onChange={e => setNumber(e.target.value)}
                placeholder="Ex: 123 ou S/N"
                className="w-full bg-bg border border-border text-text-main rounded-xl px-4 py-3 outline-none hover:border-border/80 focus:border-primary transition-all text-sm shadow-inner"
              />
            </div>
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5 flex items-center gap-2">
              <List size={15} className="text-primary" />
              Bairro <span className="text-primary">*</span>
            </label>
            <input 
              type="text" 
              required
              value={bairro} 
              onChange={e => setBairro(e.target.value)}
              placeholder="Ex: Centro"
              className="w-full bg-bg border border-border text-text-main rounded-xl px-4 py-3 outline-none hover:border-border/80 focus:border-primary transition-all text-sm shadow-inner"
            />
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5 flex items-center gap-2">
              <MessageSquare size={15} className="text-primary" />
              Observações
            </label>
            <textarea 
              value={obs} 
              onChange={e => setObs(e.target.value)}
              placeholder="Ex: Portão azul, fundos, do lado do mercadinho, etc."
              rows={3}
              className="w-full bg-bg border border-border text-text-main rounded-xl px-4 py-2.5 outline-none hover:border-border/80 focus:border-primary transition-all text-sm resize-none shadow-inner"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 mt-2 bg-primary hover:bg-opacity-90 active:scale-[0.98] disabled:bg-primary/50 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send size={18} /> Enviar Informações
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-xs text-text-dim">
        Este formulário de censo envia informações diretamente para a equipe administrativa deste grupo.
      </div>
    </div>
  );
};
