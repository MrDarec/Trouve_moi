const { Match, Notification } = require('../models/index');
const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Obtenir les matches de l'utilisateur
// @route   GET /api/matches
exports.getMyMatches = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {
      $or: [{ userLost: req.user._id }, { userFound: req.user._id }]
    };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const matches = await Match.find(query)
      .populate('itemLost', 'title category photos location date type')
      .populate('itemFound', 'title category photos location date type')
      .populate('userLost', 'name avatar city reliabilityScore badge')
      .populate('userFound', 'name avatar city reliabilityScore badge')
      .sort('-createdAt').skip(skip).limit(parseInt(limit));

    const total = await Match.countDocuments(query);

    res.json({
      success: true,
      matches,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un match par ID
// @route   GET /api/matches/:id
exports.getMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('itemLost', 'title category photos location date description color brand type reward')
      .populate('itemFound', 'title category photos location date description color brand type')
      .populate('userLost', 'name avatar city reliabilityScore badge isIdentityVerified successfulRestitutions')
      .populate('userFound', 'name avatar city reliabilityScore badge isIdentityVerified successfulRestitutions');

    if (!match) return res.status(404).json({ success: false, message: 'Match non trouvé.' });

    const isParticipant =
      match.userLost._id.toString() === req.user._id.toString() ||
      match.userFound._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isParticipant) return res.status(403).json({ success: false, message: 'Accès non autorisé.' });

    res.json({ success: true, match });
  } catch (error) {
    next(error);
  }
};

// @desc    Accepter un match
// @route   PUT /api/matches/:id/accept
exports.acceptMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('userLost', 'name email')
      .populate('userFound', 'name email')
      .populate('itemLost', 'title')
      .populate('itemFound', 'title');

    if (!match) return res.status(404).json({ success: false, message: 'Match non trouvé.' });
    if (match.status === 'rejected' || match.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Ce match est déjà clôturé.' });
    }

    const isUserLost = match.userLost._id.toString() === req.user._id.toString();
    const isUserFound = match.userFound._id.toString() === req.user._id.toString();

    if (!isUserLost && !isUserFound) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }

    if (isUserLost) match.acceptedByLost = true;
    if (isUserFound) match.acceptedByFound = true;

    // Les deux ont accepté → activer le chat
    if (match.acceptedByLost && match.acceptedByFound) {
      match.status = 'accepted';
      match.chatEnabled = true;

      // Mettre à jour le statut des items
      await Item.findByIdAndUpdate(match.itemLost._id, { status: 'matched' });
      await Item.findByIdAndUpdate(match.itemFound._id, { status: 'matched' });

      // Notifier les deux
      const otherUser = isUserLost ? match.userFound : match.userLost;
      await Notification.create({
        userId: otherUser._id,
        type: 'match_accepted',
        title: '✅ Match accepté !',
        message: 'Les deux parties ont accepté le match. Vous pouvez maintenant discuter !',
        data: { matchId: match._id }
      });

      const io = req.app.get('io');
      if (io) io.to(`user_${otherUser._id}`).emit('match_accepted', { matchId: match._id });
    } else {
      // Notifier l'autre partie qu'une partie a accepté
      const otherUserId = isUserLost ? match.userFound._id : match.userLost._id;
      await Notification.create({
        userId: otherUserId,
        type: 'new_match',
        title: '👍 Match en attente',
        message: "L'autre partie a accepté ce match. Votre confirmation est attendue.",
        data: { matchId: match._id }
      });
    }

    await match.save();
    res.json({ success: true, message: 'Match accepté.', match, chatEnabled: match.chatEnabled });
  } catch (error) {
    next(error);
  }
};

// @desc    Rejeter un match
// @route   PUT /api/matches/:id/reject
exports.rejectMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match non trouvé.' });

    const isParticipant =
      match.userLost.toString() === req.user._id.toString() ||
      match.userFound.toString() === req.user._id.toString();

    if (!isParticipant) return res.status(403).json({ success: false, message: 'Non autorisé.' });

    match.status = 'rejected';
    match.rejectedBy = req.user._id;
    await match.save();

    res.json({ success: true, message: 'Match rejeté.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirmer la restitution dans un match
// @route   PUT /api/matches/:id/confirm-restitution
exports.confirmRestitution = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match non trouvé.' });
    if (match.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Le match doit être accepté avant de confirmer la restitution.' });
    }

    const isUserLost = match.userLost.toString() === req.user._id.toString();
    const isUserFound = match.userFound.toString() === req.user._id.toString();

    if (!isUserLost && !isUserFound) return res.status(403).json({ success: false, message: 'Non autorisé.' });

    if (isUserLost) match.restitutionConfirmedByLost = true;
    if (isUserFound) match.restitutionConfirmedByFound = true;

    // Les deux ont confirmé → clôturer
    if (match.restitutionConfirmedByLost && match.restitutionConfirmedByFound) {
      match.status = 'closed';

      // Clôturer les items
      await Item.findByIdAndUpdate(match.itemLost, { status: 'closed', confirmedByUser: true });
      await Item.findByIdAndUpdate(match.itemFound, { status: 'closed', confirmedByMatch: true });

      // Mettre à jour les scores de fiabilité
      await User.findByIdAndUpdate(match.userLost, {
        $inc: { reliabilityScore: 10, successfulRestitutions: 1 }
      });
      await User.findByIdAndUpdate(match.userFound, {
        $inc: { reliabilityScore: 10, successfulRestitutions: 1 }
      });

      // Notifications de clôture
      await Notification.create([
        {
          userId: match.userLost,
          type: 'restitution_confirmed',
          title: '🎉 Restitution confirmée !',
          message: 'La restitution a été confirmée par les deux parties. Bravo !',
          data: { matchId: match._id }
        },
        {
          userId: match.userFound,
          type: 'restitution_confirmed',
          title: '🎉 Restitution confirmée !',
          message: 'La restitution a été confirmée par les deux parties. Merci !',
          data: { matchId: match._id }
        }
      ]);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${match.userLost}`).emit('restitution_confirmed', { matchId: match._id });
        io.to(`user_${match.userFound}`).emit('restitution_confirmed', { matchId: match._id });
      }
    }

    await match.save();
    res.json({
      success: true,
      message: match.status === 'closed' ? 'Restitution clôturée avec succès !' : 'Restitution confirmée de votre côté.',
      match
    });
  } catch (error) {
    next(error);
  }
};
