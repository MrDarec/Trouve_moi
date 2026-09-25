import React from 'react';
import {
  Smartphone,
  Luggage,
  Shirt,
  Watch,
  FileText,
  Key,
  Glasses,
  Wallet,
  Trophy,
  Gamepad2,
  BookOpen,
  PawPrint,
  Car,
  Wrench,
  Package,
  Shield,
  ShieldCheck,
  Award,
  Crown,
} from 'lucide-react';

export const CATEGORY_ICONS = {
  electronics: Smartphone,
  bags: Luggage,
  clothing: Shirt,
  jewelry: Watch,
  documents: FileText,
  keys: Key,
  glasses: Glasses,
  wallet: Wallet,
  sports: Trophy,
  toys: Gamepad2,
  books: BookOpen,
  animals: PawPrint,
  vehicles: Car,
  tools: Wrench,
  other: Package,
};

export const CATEGORIES = [
  { value: 'electronics', label: 'Électronique', Icon: Smartphone },
  { value: 'bags', label: 'Sacs & Bagages', Icon: Luggage },
  { value: 'clothing', label: 'Vêtements', Icon: Shirt },
  { value: 'jewelry', label: 'Bijoux & Montres', Icon: Watch },
  { value: 'documents', label: 'Documents & Cartes', Icon: FileText },
  { value: 'keys', label: 'Clés', Icon: Key },
  { value: 'glasses', label: 'Lunettes', Icon: Glasses },
  { value: 'wallet', label: 'Portefeuille', Icon: Wallet },
  { value: 'sports', label: 'Sport & Loisirs', Icon: Trophy },
  { value: 'toys', label: 'Jouets & Enfants', Icon: Gamepad2 },
  { value: 'books', label: 'Livres & Papeterie', Icon: BookOpen },
  { value: 'animals', label: 'Animaux', Icon: PawPrint },
  { value: 'vehicles', label: 'Véhicules & Accessoires', Icon: Car },
  { value: 'tools', label: 'Outils', Icon: Wrench },
  { value: 'other', label: 'Autre', Icon: Package },
];

export const BADGE_CONFIG = {
  basic: {
    label: 'Basique',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    Icon: Shield,
    icon: React.createElement(Shield, { size: 13 }),
  },
  verified: {
    label: 'Vérifié',
    color: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    Icon: ShieldCheck,
    icon: React.createElement(ShieldCheck, { size: 13 }),
  },
  silver: {
    label: 'Silver',
    color: 'text-slate-300',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    Icon: Award,
    icon: React.createElement(Award, { size: 13 }),
  },
  gold: {
    label: 'Gold',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    Icon: Crown,
    icon: React.createElement(Crown, { size: 13 }),
  },
};

export const getCategoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const getCategoryIcon = (value, props = { size: 20 }) => {
  const IconComp = CATEGORY_ICONS[value] || Package;
  return React.createElement(IconComp, props);
};

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
