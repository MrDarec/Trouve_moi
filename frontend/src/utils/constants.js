export const CATEGORIES = [
  { value: 'electronics', label: 'Électronique', icon: '📱' },
  { value: 'bags', label: 'Sacs & Bagages', icon: '👜' },
  { value: 'clothing', label: 'Vêtements', icon: '👕' },
  { value: 'jewelry', label: 'Bijoux & Montres', icon: '💍' },
  { value: 'documents', label: 'Documents & Cartes', icon: '📄' },
  { value: 'keys', label: 'Clés', icon: '🔑' },
  { value: 'glasses', label: 'Lunettes', icon: '👓' },
  { value: 'wallet', label: 'Portefeuille', icon: '👛' },
  { value: 'sports', label: 'Sport & Loisirs', icon: '⚽' },
  { value: 'toys', label: 'Jouets & Enfants', icon: '🧸' },
  { value: 'books', label: 'Livres & Papeterie', icon: '📚' },
  { value: 'animals', label: 'Animaux', icon: '🐾' },
  { value: 'vehicles', label: 'Véhicules & Accessoires', icon: '🚗' },
  { value: 'tools', label: 'Outils', icon: '🔧' },
  { value: 'other', label: 'Autre', icon: '📦' },
];

export const BADGE_CONFIG = {
  basic: { label: 'Basique', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: '⭐' },
  verified: { label: 'Vérifié', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: '✅' },
  silver: { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-400/20', border: 'border-slate-400/30', icon: '🥈' },
  gold: { label: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: '🥇' },
};

export const getCategoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const getCategoryIcon = (value) =>
  CATEGORIES.find((c) => c.value === value)?.icon ?? '📦';

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatRelative = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(date);
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `/${path.replace(/^\//, '')}`;
};
