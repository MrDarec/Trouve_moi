const User = require('../models/User');
const Item = require('../models/Item');
const { Match, Notification, Report } = require('../models/index');
const path = require('path');

// ===================== USER CONTROLLER =====================

// @desc    Obtenir le profil d'un utilisateur
// @route   GET /api/users/:id
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-otp -otpExpire -resetPasswordToken -resetPasswordExpire -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    if (user.isSuspended && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour le profil
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, city } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (city) user.city = city;

    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Profil mis à jour.', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Historique de l'utilisateur
// @route   GET /api/users/history
exports.getUserHistory = async (req, res, next) => {
  try {
    const [lostItems, foundItems, matches] = await Promise.all([
      Item.find({ userId: req.user._id, type: 'lost' }).sort('-createdAt').limit(20),
      Item.find({ userId: req.user._id, type: 'found' }).sort('-createdAt').limit(20),
      Match.find({
        $or: [{ userLost: req.user._id }, { userFound: req.user._id }],
        status: 'closed'
      }).populate('itemLost', 'title').populate('itemFound', 'title').limit(10)
    ]);

    res.json({ success: true, lostItems, foundItems, matches });
  } catch (error) {
    next(error);
  }
};

// @desc    Signaler un utilisateur
// @route   POST /api/users/:id/report
exports.reportUser = async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    const reportedUser = await User.findById(req.params.id);
    if (!reportedUser) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous signaler vous-même.' });
    }

    await Report.create({
      reporterId: req.user._id,
      reportedUserId: req.params.id,
      reason,
      description
    });

    res.json({ success: true, message: 'Signalement envoyé.' });
  } catch (error) {
    next(error);
  }
};

// ===================== NOTIFICATION CONTROLLER =====================

// @desc    Obtenir les notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { userId: req.user._id };
    if (unreadOnly === 'true') query.read = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit));
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });

    res.json({ success: true, notifications, unreadCount, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Marquer comme lu
// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'Notification marquée comme lue.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Marquer toutes comme lues
// @route   PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'Toutes les notifications marquées comme lues.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une notification
// @route   DELETE /api/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Notification supprimée.' });
  } catch (error) {
    next(error);
  }
};
