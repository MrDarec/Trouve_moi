const path = require('path');
const Item = require('../models/Item');
const { findMatches } = require('../services/matchingService');

// @desc    Créer un signalement
// @route   POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const { type, category, title, description, color, brand, date, locationAddress, locationLat, locationLng, locationCity, rewardOffered, rewardAmount, rewardDescription } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Au moins 1 photo est requise.' });
    }

    const photos = req.files.map(file => `/uploads/items/${file.filename}`);

    const lat = parseFloat(locationLat);
    const lng = parseFloat(locationLng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Coordonnées GPS invalides.' });
    }

    const item = await Item.create({
      type, category, title, description, color, brand,
      photos,
      date: new Date(date),
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: locationAddress,
        city: locationCity,
        country: 'Bénin'
      },
      reward: {
        offered: rewardOffered === 'true',
        amount: parseFloat(rewardAmount) || 0,
        description: rewardDescription || ''
      },
      userId: req.user._id,
      moderationStatus: 'approved' // Auto-approuver pour le MVP (modération manuelle possible)
    });

    // Lancer le matching en arrière-plan
    const io = req.app.get('io');
    findMatches(item, io).then(matches => {
      console.log(`✅ ${matches.length} match(es) trouvé(s) pour l'item ${item._id}`);
    });

    const populated = await Item.findById(item._id).populate('userId', 'name avatar city reliabilityScore');

    res.status(201).json({ success: true, message: 'Signalement créé avec succès !', item: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir tous les signalements (avec filtres)
// @route   GET /api/items
exports.getItems = async (req, res, next) => {
  try {
    const { type, category, search, lat, lng, distance = 50, dateFrom, dateTo, page = 1, limit = 12, sort = '-createdAt' } = req.query;

    const query = { status: { $in: ['active', 'matched'] }, moderationStatus: 'approved' };

    if (type) query.type = type;
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { color: { $regex: search, $options: 'i' } }
      ];
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    let items;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (lat && lng) {
      items = await Item.find({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseFloat(distance) * 1000
          }
        }
      }).populate('userId', 'name avatar city reliabilityScore badge').skip(skip).limit(parseInt(limit));
    } else {
      items = await Item.find(query).sort(sort).skip(skip).limit(parseInt(limit)).populate('userId', 'name avatar city reliabilityScore badge');
    }

    const total = await Item.countDocuments(query);

    res.json({
      success: true,
      items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un signalement par ID
// @route   GET /api/items/:id
exports.getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate('userId', 'name avatar city reliabilityScore badge isIdentityVerified successfulRestitutions createdAt');
    if (!item) return res.status(404).json({ success: false, message: 'Signalement non trouvé.' });
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Modifier un signalement
// @route   PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Signalement non trouvé.' });

    if (item.userId.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }

    if (item.status === 'closed' || item.status === 'archived') {
      return res.status(400).json({ success: false, message: 'Ce signalement est clôturé et ne peut plus être modifié.' });
    }

    const { title, description, color, brand, rewardOffered, rewardAmount } = req.body;
    if (title) item.title = title;
    if (description) item.description = description;
    if (color) item.color = color;
    if (brand) item.brand = brand;
    if (rewardOffered !== undefined) item.reward.offered = rewardOffered === 'true';
    if (rewardAmount) item.reward.amount = parseFloat(rewardAmount);

    await item.save();
    res.json({ success: true, message: 'Signalement mis à jour.', item });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un signalement
// @route   DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Signalement non trouvé.' });

    if (item.userId.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }

    await item.deleteOne();
    res.json({ success: true, message: 'Signalement supprimé.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirmer la restitution
// @route   POST /api/items/:id/confirm-restitution
exports.confirmRestitution = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Signalement non trouvé.' });

    const isOwner = item.userId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Non autorisé.' });

    item.confirmedByUser = true;
    await item.save();

    // Vérifier si les deux parties ont confirmé (géré au niveau Match)
    res.json({ success: true, message: 'Restitution confirmée de votre côté.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les items de l'utilisateur connecté
// @route   GET /api/items/my-items
exports.getMyItems = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await Item.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit));
    const total = await Item.countDocuments(query);

    res.json({
      success: true,
      items,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les items pour la carte
// @route   GET /api/items/map
exports.getMapItems = async (req, res, next) => {
  try {
    const { lat, lng, distance = 50, type } = req.query;
    const query = { status: { $in: ['active', 'matched'] }, moderationStatus: 'approved' };
    if (type) query.type = type;

    let items;
    if (lat && lng) {
      items = await Item.find({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseFloat(distance) * 1000
          }
        }
      }).select('type category title location date photos').limit(200);
    } else {
      items = await Item.find(query).select('type category title location date photos').limit(200);
    }

    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
};
