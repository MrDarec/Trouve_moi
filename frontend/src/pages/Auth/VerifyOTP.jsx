import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function VerifyOTP() {
  const { verifyOtp } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email ?? '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email]);

  useEffect(() => {
    const timer = countdown > 0 && setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (next.every((d) => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      handleVerify(paste);
    }
  };

  const handleVerify = async (code) => {
    setLoading(true);
    try {
      await verifyOtp(email, code);
      toast.success('Email vérifié ! Bienvenue 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Code invalide ou expiré');
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('Nouveau code envoyé !');
      setCountdown(60);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de l\'envoi');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8 text-center"
      >
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Vérifier votre email</h1>
        <p className="text-slate-400 text-sm mb-2">
          Un code à 6 chiffres a été envoyé à
        </p>
        <p className="text-primary-400 font-semibold text-sm mb-8">{email}</p>

        {/* OTP inputs */}
        <div className="flex items-center justify-center gap-3 mb-8" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputsRef.current[idx] = el)}
              id={`otp-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-12 h-14 text-center text-xl font-bold bg-slate-800 border-2 border-slate-700 text-slate-100 rounded-xl focus:outline-none focus:border-primary-500 transition-all"
              disabled={loading}
            />
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-primary-400 mb-4">
            <Loader2 size={18} className="animate-spin" />
            Vérification…
          </div>
        )}

        {/* Resend */}
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          {countdown > 0 ? (
            <span>Renvoyer dans {countdown}s</span>
          ) : (
            <button onClick={handleResend} disabled={resendLoading}
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              <RefreshCw size={14} className={resendLoading ? 'animate-spin' : ''} />
              Renvoyer le code
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
