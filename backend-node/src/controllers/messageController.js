const { Message, Match, Notification } = require('../models/index');

// @desc    Obtenir les messages d'un match
// @route   GET /api/messages/:matchId
exports.getMessages = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match non trouvé.' });

    const isParticipant =
      match.userLost.toString() === req.user._id.toString() ||
      match.userFound.toString() === req.user._id.toString();

    if (!isParticipant) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    if (!match.chatEnabled) return res.status(403).json({ success: false, message: 'Le chat n\'est pas encore actif pour ce match.' });

    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ matchId: req.params.matchId })
      .populate('senderId', 'name avatar')
      .sort('createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ matchId: req.params.matchId });

    // Marquer comme lus
    await Message.updateMany(
      { matchId: req.params.matchId, receiverId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ success: true, messages, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Envoyer un message
// @route   POST /api/messages/:matchId
exports.sendMessage = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match non trouvé.' });
    if (!match.chatEnabled || match.status !== 'accepted') {
      return res.status(403).json({ success: false, message: 'Le chat n\'est pas disponible.' });
    }

    const isUserLost = match.userLost.toString() === req.user._id.toString();
    const isUserFound = match.userFound.toString() === req.user._id.toString();

    if (!isUserLost && !isUserFound) return res.status(403).json({ success: false, message: 'Non autorisé.' });

    const receiverId = isUserLost ? match.userFound : match.userLost;
    const { content } = req.body;
    let photo = null;
    let type = 'text';

    if (req.file) {
      photo = `/uploads/messages/${req.file.filename}`;
      type = 'image';
    }

    if (!content && !photo) {
      return res.status(400).json({ success: false, message: 'Message vide.' });
    }

    const message = await Message.create({
      matchId: req.params.matchId,
      senderId: req.user._id,
      receiverId,
      content: content || '',
      photo,
      type
    });

    const populated = await Message.findById(message._id).populate('senderId', 'name avatar');

    // Notification
    await Notification.create({
      userId: receiverId,
      type: 'new_message',
      title: '💬 Nouveau message',
      message: `${req.user.name}: ${content || '📷 Photo'}`,
      data: { matchId: req.params.matchId, messageId: message._id }
    });

    // Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.matchId}`).emit('new_message', populated);
      io.to(`user_${receiverId}`).emit('notification', { type: 'new_message' });
    }

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Signaler un message abusif
// @route   POST /api/messages/:messageId/report
exports.reportMessage = async (req, res, next) => {
  try {
    const { Report } = require('../models/index');
    const { reason, description } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message non trouvé.' });

    await Report.create({
      reporterId: req.user._id,
      reportedUserId: message.senderId,
      reportedMessageId: message._id,
      reason,
      description
    });

    res.json({ success: true, message: 'Signalement envoyé. Notre équipe va examiner ce message.' });
  } catch (error) {
    next(error);
  }
};
