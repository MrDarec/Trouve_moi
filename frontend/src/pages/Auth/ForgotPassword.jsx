import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Email envoyé !');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8"
      >
        <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Retour
        </Link>

        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-slate-100">Mot de passe oublié</h1>
          {!sent ? (
            <p className="text-slate-500 text-sm mt-2">Entrez votre email pour recevoir un lien de réinitialisation.</p>
          ) : (
            <p className="text-emerald-400 text-sm mt-2">Email envoyé ! Consultez votre boîte mail.</p>
          )}
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Adresse email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="forgot-email" type="email" className="input-field pl-10"
                  placeholder="vous@exemple.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <button id="forgot-submit" type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Envoi…</> : 'Envoyer le lien'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
