import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Upload, X, MapPin, Loader2, Check } from 'lucide-react';
import MapView from '../components/Map/MapView';
import api from '../services/api';
import { CATEGORIES } from '../utils/constants';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = ['Informations', 'Localisation', 'Photos & Récompense'];

export default function ReportItem() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const [form, setForm] = useState({
    type: 'lost',
    category: '',
    title: '',
    description: '',
    keywords: '',
    date: new Date().toISOString().split('T')[0],
    city: '',
    lat: null,
    lng: null,
    reward: '',
    photos: [],
    photoPreviews: [],
  });

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // --- Step 1 validation ---
  const step1Valid = form.type && form.category && form.title.trim().length >= 5;

  // --- Step 2: Geolocation ---
  const handleGps = () => {
    if (!navigator.geolocation) { toast.error('Géolocalisation non supportée'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setField('lat', pos.coords.latitude);
        setField('lng', pos.coords.longitude);
        setGeoLoading(false);
        toast.success('Position détectée !');
      },
      () => { toast.error('Impossible de détecter votre position'); setGeoLoading(false); }
    );
  };

  const handleMapClick = useCallback(({ lat, lng }) => {
    setForm((f) => ({ ...f, lat, lng }));
  }, []);

  // --- Step 3: Photos ---
  const handlePhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - form.photos.length);
    const newPhotos = [...form.photos, ...files];
    const newPreviews = [...form.photoPreviews, ...files.map((f) => URL.createObjectURL(f))];
    setForm((prev) => ({ ...prev, photos: newPhotos, photoPreviews: newPreviews }));
  };

  const removePhoto = (idx) => {
    URL.revokeObjectURL(form.photoPreviews[idx]);
    setForm((f) => ({
      ...f,
      photos: f.photos.filter((_, i) => i !== idx),
      photoPreviews: f.photoPreviews.filter((_, i) => i !== idx),
    }));
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!form.lat || !form.lng) { toast.error('Veuillez sélectionner une localisation'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('category', form.category);
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('date', form.date);
      fd.append('city', form.city.trim());
      fd.append('lng', form.lng);
      fd.append('lat', form.lat);
      if (form.reward) fd.append('reward', form.reward);
      const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
      keywords.forEach((k) => fd.append('keywords[]', k));
      form.photos.forEach((photo) => fd.append('photos', photo));

      const { data } = await api.post('/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Signalement créé ! 🎉');
      navigate(`/items/${data.item._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-2xl mx-auto w-full px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-primary-600 text-white' :
                i === step ? 'bg-primary-600/20 text-primary-400 border-2 border-primary-500' :
                'bg-slate-800 text-slate-500'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 w-16 sm:w-24 transition-all ${i < step ? 'bg-primary-600' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-semibold text-slate-300">{STEPS[step]}</p>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== STEP 1: Informations ===== */}
        {step === 0 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="glass-card p-6 space-y-5">
            {/* Type toggle */}
            <div>
              <label className="input-label">Type de signalement</label>
              <div className="flex gap-3">
                {[{ v: 'lost', label: '🔴 J\'ai perdu', cls: 'badge-lost' },
                  { v: 'found', label: '🟢 J\'ai trouvé', cls: 'badge-found' }].map(({ v, label }) => (
                  <button key={v} type="button" onClick={() => setField('type', v)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.type === v
                        ? v === 'lost' ? 'bg-orange-500/20 border-orange-500/60 text-orange-400' : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="input-label">Catégorie *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => setField('category', c.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium border transition-all ${
                      form.category === c.value
                        ? 'bg-primary-600/20 border-primary-500/60 text-primary-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl">{c.icon}</span>
                    <span className="line-clamp-1">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="input-label">Titre *</label>
              <input id="report-title" type="text" className="input-field" placeholder="Ex: iPhone 14 noir, sac Louis Vuitton…"
                value={form.title} onChange={(e) => setField('title', e.target.value)} maxLength={100} />
            </div>

            {/* Description */}
            <div>
              <label className="input-label">Description</label>
              <textarea id="report-description" className="input-field h-24 resize-none" placeholder="Décrivez l'objet avec le plus de détails possible…"
                value={form.description} onChange={(e) => setField('description', e.target.value)} maxLength={500} />
            </div>

            {/* Keywords */}
            <div>
              <label className="input-label">Mots-clés <span className="text-slate-600 font-normal">(séparés par des virgules)</span></label>
              <input id="report-keywords" type="text" className="input-field" placeholder="noir, cuir, Apple, iCloud…"
                value={form.keywords} onChange={(e) => setField('keywords', e.target.value)} />
            </div>

            {/* Date */}
            <div>
              <label className="input-label">Date de perte/découverte *</label>
              <input id="report-date" type="date" className="input-field" value={form.date}
                onChange={(e) => setField('date', e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>

            <button onClick={() => setStep(1)} disabled={!step1Valid}
              className="btn-primary w-full justify-center mt-2">
              Suivant <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ===== STEP 2: Localisation ===== */}
        {step === 1 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Cliquez sur la carte pour situer l'objet</p>
              <button onClick={handleGps} disabled={geoLoading}
                className="btn-secondary text-sm py-2 px-3">
                {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                Ma position
              </button>
            </div>

            <MapView
              height="350px"
              onLocationSelect={handleMapClick}
              selectedLocation={form.lat ? { lat: form.lat, lng: form.lng } : null}
            />

            {form.lat && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Position sélectionnée : {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </p>
            )}

            <div>
              <label className="input-label">Ville / Quartier</label>
              <input id="report-city" type="text" className="input-field" placeholder="Ex: Dakar, Médina…"
                value={form.city} onChange={(e) => setField('city', e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="btn-secondary flex-1 justify-center">
                <ArrowLeft size={16} /> Précédent
              </button>
              <button onClick={() => setStep(2)} disabled={!form.lat}
                className="btn-primary flex-1 justify-center">
                Suivant <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ===== STEP 3: Photos & Récompense ===== */}
        {step === 2 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="glass-card p-6 space-y-5">
            {/* Photo upload */}
            <div>
              <label className="input-label">Photos <span className="text-slate-600 font-normal">(max. 5)</span></label>
              {form.photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {form.photoPreviews.map((src, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.photos.length < 5 && (
                <label id="photo-upload" className="flex flex-col items-center gap-2 border-2 border-dashed border-slate-700 hover:border-primary-500 rounded-xl p-6 cursor-pointer transition-colors text-center">
                  <Upload size={24} className="text-slate-500" />
                  <span className="text-sm text-slate-400">Cliquez pour ajouter des photos</span>
                  <span className="text-xs text-slate-600">JPG, PNG, WebP — max 5 Mo</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
                </label>
              )}
            </div>

            {/* Reward */}
            <div>
              <label className="input-label">Récompense (FCFA) <span className="text-slate-600 font-normal">— optionnel</span></label>
              <input id="report-reward" type="number" min="0" className="input-field"
                placeholder="Ex: 5000" value={form.reward} onChange={(e) => setField('reward', e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">
                <ArrowLeft size={16} /> Précédent
              </button>
              <button id="report-submit" onClick={handleSubmit} disabled={loading}
                className="btn-primary flex-1 justify-center">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Envoi…</> : 'Publier le signalement'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
