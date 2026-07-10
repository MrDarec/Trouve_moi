const User = require('../models/User');
const Item = require('../models/Item');
const { Match, Report, Notification } = require('../models/index');

// @desc    Dashboard statistiques
// @route   GET /api/admin/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalItems, totalMatches, totalRestitutions, recentReports, pendingItems] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Item.countDocuments(),
      Match.countDocuments(),
      Match.countDocuments({ status: 'closed' }),
      Report.countDocuments({ status: 'pending' }),
      Item.countDocuments({ moderationStatus: 'pending' })
    ]);

    const [lostItems, foundItems, activeItems] = await Promise.all([
      Item.countDocuments({ type: 'lost' }),
      Item.countDocuments({ type: 'found' }),
      Item.countDocuments({ status: 'active' })
    ]);

    // Évolution sur 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await Item.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          lost: { $sum: { $cond: [{ $eq: ['$type', 'lost'] }, 1, 0] } },
          found: { $sum: { $cond: [{ $eq: ['$type', 'found'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const categoriesStats = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers, totalItems, totalMatches, totalRestitutions,
        recentReports, pendingItems, lostItems, foundItems, activeItems,
        restitutionRate: totalMatches > 0 ? Math.round((totalRestitutions / totalMatches) * 100) : 0
      },
      dailyStats,
      categoriesStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Gestion des utilisateurs
// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, suspended, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) query.role = role;
    if (suspended === 'true') query.isSuspended = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit));
    const total = await User.countDocuments(query);

    res.json({ success: true, users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspendre/réactiver un utilisateur
// @route   PUT /api/admin/users/:id/suspend
exports.toggleSuspend = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Impossible de suspendre un admin.' });

    user.isSuspended = !user.isSuspended;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: user.isSuspended ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.',
      isSuspended: user.isSuspended
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Vérifier l'identité d'un utilisateur
// @route   PUT /api/admin/users/:id/verify-identity
exports.verifyIdentity = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isIdentityVerified: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    res.json({ success: true, message: 'Identité vérifiée.', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les signalements actifs
// @route   GET /api/items (admin + pending)
exports.getPendingItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await Item.find({ moderationStatus: 'pending' })
      .populate('userId', 'name email avatar')
      .sort('-createdAt').skip(skip).limit(parseInt(limit));
    const total = await Item.countDocuments({ moderationStatus: 'pending' });
    res.json({ success: true, items, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Modérer un signalement
// @route   PUT /api/admin/items/:id/moderate
exports.moderateItem = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { moderationStatus: status, moderationNote: note, isModerated: true },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Signalement non trouvé.' });

    if (status === 'approved') {
      // Lancer le matching maintenant que l'item est approuvé
      const { findMatches } = require('../services/matchingService');
      findMatches(item, req.app.get('io'));
    }

    res.json({ success: true, message: `Signalement ${status === 'approved' ? 'approuvé' : 'rejeté'}.`, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les rapports
// @route   GET /api/admin/reports
exports.getReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await Report.find(query)
      .populate('reporterId', 'name email')
      .populate('reportedUserId', 'name email')
      .populate('reportedItemId', 'title')
      .sort('-createdAt').skip(skip).limit(parseInt(limit));

    const total = await Report.countDocuments(query);
    res.json({ success: true, reports, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Traiter un rapport
// @route   PUT /api/admin/reports/:id
exports.resolveReport = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, adminNote, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Rapport non trouvé.' });
    res.json({ success: true, message: 'Rapport traité.', report });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un item (admin)
// @route   DELETE /api/admin/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Signalement non trouvé.' });
    res.json({ success: true, message: 'Signalement supprimé.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Tous les items
// @route   GET /api/admin/items
exports.getAllItems = async (req, res, next) => {
  try {
    const { type, status, moderationStatus, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (moderationStatus) query.moderationStatus = moderationStatus;
    if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await Item.find(query).populate('userId', 'name email').sort('-createdAt').skip(skip).limit(parseInt(limit));
    const total = await Item.countDocuments(query);
    res.json({ success: true, items, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    next(error);
  }
};
