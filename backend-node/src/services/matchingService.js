const Item = require('../models/Item');
const { Match, Notification } = require('../models/index');

/**
 * Distance Haversine entre deux coordonnées GPS
 * @param {number[]} coords1 [lng, lat]
 * @param {number[]} coords2 [lng, lat]
 * @returns {number} Distance en km
 */
const haversineDistance = (coords1, coords2) => {
  const R = 6371; // Rayon de la Terre en km
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Score de similarité des mots-clés (Jaccard)
 */
const keywordScore = (keywords1, keywords2) => {
  if (!keywords1.length || !keywords2.length) return 0;
  const set1 = new Set(keywords1.map(k => k.toLowerCase()));
  const set2 = new Set(keywords2.map(k => k.toLowerCase()));
  const intersection = [...set1].filter(k => set2.has(k)).length;
  const union = new Set([...set1, ...set2]).size;
  return union > 0 ? intersection / union : 0;
};

/**
 * Score de proximité géographique
 * 0km → 1.0, 5km → 0.8, 20km → 0.4, 50km+ → 0.0
 */
const distanceScore = (dist) => {
  if (dist <= 0.5) return 1.0;
  if (dist <= 5) return 0.9;
  if (dist <= 10) return 0.7;
  if (dist <= 20) return 0.5;
  if (dist <= 50) return 0.2;
  return 0;
};

/**
 * Score de proximité temporelle
 * 0 jours → 1.0, 3 jours → 0.8, 7 jours → 0.6, 30 jours+ → 0.1
 */
const dateScore = (date1, date2) => {
  const diff = Math.abs(new Date(date1) - new Date(date2)) / (1000 * 60 * 60 * 24);
  if (diff <= 1) return 1.0;
  if (diff <= 3) return 0.8;
  if (diff <= 7) return 0.6;
  if (diff <= 14) return 0.4;
  if (diff <= 30) return 0.2;
  return 0.05;
};

/**
 * Score global de matching entre deux objets
 */
const computeMatchScore = (lostItem, foundItem) => {
  // Poids par critère
  const weights = { category: 0.30, keywords: 0.35, distance: 0.25, date: 0.10 };

  const catScore = lostItem.category === foundItem.category ? 1.0 : 0.0;
  const kwScore = keywordScore(lostItem.keywords || [], foundItem.keywords || []);
  const dist = haversineDistance(
    lostItem.location.coordinates,
    foundItem.location.coordinates
  );
  const distSc = distanceScore(dist);
  const dateSc = dateScore(lostItem.date, foundItem.date);

  const total =
    catScore * weights.category +
    kwScore * weights.keywords +
    distSc * weights.distance +
    dateSc * weights.date;

  return {
    total: Math.round(total * 100),
    details: {
      category: Math.round(catScore * 100),
      keywords: Math.round(kwScore * 100),
      distance: Math.round(distSc * 100),
      date: Math.round(dateSc * 100)
    },
    distanceKm: Math.round(dist * 10) / 10
  };
};

/**
 * Trouver les matches pour un item nouvellement créé
 */
const findMatches = async (newItem, io = null) => {
  try {
    const oppositeType = newItem.type === 'lost' ? 'found' : 'lost';

    // Chercher les items opposés actifs dans un rayon de 100km
    const candidates = await Item.find({
      type: oppositeType,
      status: 'active',
      moderationStatus: 'approved',
      _id: { $ne: newItem._id },
      userId: { $ne: newItem.userId },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: newItem.location.coordinates },
          $maxDistance: 100000 // 100 km
        }
      }
    }).populate('userId', 'name email');

    const matches = [];
    const MIN_SCORE = 30; // Seuil minimal

    for (const candidate of candidates) {
      // Éviter les doublons
      const lostItem = newItem.type === 'lost' ? newItem : candidate;
      const foundItem = newItem.type === 'found' ? newItem : candidate;

      const existingMatch = await Match.findOne({
        itemLost: lostItem._id,
        itemFound: foundItem._id
      });
      if (existingMatch) continue;

      const score = computeMatchScore(lostItem, foundItem);
      if (score.total >= MIN_SCORE) {
        const match = await Match.create({
          itemLost: lostItem._id,
          itemFound: foundItem._id,
          userLost: lostItem.userId,
          userFound: foundItem.userId,
          score: score.total,
          scoreDetails: score.details
        });

        matches.push(match);

        // Notifications pour les deux utilisateurs
        await Notification.create([
          {
            userId: lostItem.userId,
            type: 'new_match',
            title: '🎯 Nouveau match trouvé !',
            message: `Un objet trouvé correspond à votre signalement avec un score de ${score.total}%.`,
            data: { matchId: match._id, score: score.total }
          },
          {
            userId: foundItem.userId,
            type: 'new_match',
            title: '🎯 Nouveau match trouvé !',
            message: `Un objet perdu correspond à votre signalement avec un score de ${score.total}%.`,
            data: { matchId: match._id, score: score.total }
          }
        ]);

        // Émettre via Socket.io si disponible
        if (io) {
          io.to(`user_${lostItem.userId}`).emit('new_match', { matchId: match._id, score: score.total });
          io.to(`user_${foundItem.userId}`).emit('new_match', { matchId: match._id, score: score.total });
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('Erreur matching:', error);
    return [];
  }
};

module.exports = { findMatches, computeMatchScore };
