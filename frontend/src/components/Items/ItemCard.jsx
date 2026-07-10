import { Link } from 'react-router-dom';
import { MapPin, Calendar, Star } from 'lucide-react';
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
        <div className="relative h-44 bg-slate-800 overflow-hidden">
          {photo ? (
            <img
              src={getImageUrl(photo)}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {getCategoryIcon(item.category)}
            </div>
          )}
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={item.type === 'lost' ? 'badge-lost' : 'badge-found'}>
              {item.type === 'lost' ? '🔴 Perdu' : '🟢 Trouvé'}
            </span>
          </div>
          {/* Reward badge */}
          {item.reward > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-2 py-1 rounded-full border border-yellow-500/30">
              <Star size={10} fill="currentColor" />
              {item.reward} FCFA
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Category */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-500 text-xs font-medium bg-slate-800 px-2 py-1 rounded-lg">
              {getCategoryLabel(item.category)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-100 text-sm mb-3 leading-snug line-clamp-2 group-hover:text-primary-400 transition-colors">
            {item.title}
          </h3>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span className="truncate max-w-[120px]">{item.city || 'Lieu inconnu'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{formatRelative(item.date || item.createdAt)}</span>
            </div>
          </div>

          {/* Author trust score */}
          {item.userId && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {item.userId.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-xs text-slate-500 truncate">{item.userId.name}</span>
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
