import { Link } from 'react-router-dom';
import { MapPin, Calendar, Star, Search, CheckCircle2 } from 'lucide-react';
import { getCategoryIcon, getCategoryLabel, formatRelative, getImageUrl } from '../../utils/constants';
import { motion } from 'framer-motion';

export default function ItemCard({ item, index = 0 }) {
  const photo = item.photos?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link to={`/items/${item._id}`} className="item-card block overflow-hidden group">
        {/* Photo */}
        <div className="relative h-44 bg-slate-850 overflow-hidden border-b border-slate-800/80">
          {photo ? (
            <img
              src={getImageUrl(photo)}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 text-slate-500">
              <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-400">
                {getCategoryIcon(item.category, { size: 24 })}
              </div>
            </div>
          )}
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={item.type === 'lost' ? 'badge-lost' : 'badge-found'}>
              {item.type === 'lost' ? (
                <>
                  <Search size={11} className="shrink-0" />
                  <span>Perdu</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={11} className="shrink-0" />
                  <span>Trouvé</span>
                </>
              )}
            </span>
          </div>
          {/* Reward badge */}
          {item.reward > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/10 text-amber-300 text-xs font-semibold px-2 py-1 rounded-lg border border-amber-500/20">
              <Star size={10} fill="currentColor" />
              {item.reward} FCFA
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Category */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-xs font-medium bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
              {getCategoryIcon(item.category, { size: 12 })}
              <span>{getCategoryLabel(item.category)}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-100 text-sm mb-3 leading-snug line-clamp-2 group-hover:text-primary-300 transition-colors">
            {item.title}
          </h3>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <MapPin size={12} className="text-slate-500" />
              <span className="truncate max-w-[120px]">{item.city || 'Lieu inconnu'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-500" />
              <span>{formatRelative(item.date || item.createdAt)}</span>
            </div>
          </div>

          {/* Author trust score */}
          {item.userId && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                {item.userId.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-xs text-slate-400 truncate">{item.userId.name}</span>
              {item.userId.reliabilityScore !== undefined && (
                <span className="ml-auto text-xs font-semibold text-emerald-400">
                  {item.userId.reliabilityScore}%
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
