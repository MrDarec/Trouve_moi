const crypto = require('crypto');
const User = require('../models/User');
const { generateTokenPair, generateOTP, generateResetToken } = require('../utils/tokenUtils');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/emailService');

// Réponse avec token
const sendTokenResponse = async (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokenPair(user._id);

  // Sauvegarder refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified,
    isPhoneVerified: user.isPhoneVerified,
    isIdentityVerified: user.isIdentityVerified,
    reliabilityScore: user.reliabilityScore,
    badge: user.badge,
    successfulRestitutions: user.successfulRestitutions,
    provider: user.provider,
    createdAt: user.createdAt
  };

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: userData
  });
};

// @desc    Inscription
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, city } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, email et mot de passe sont requis.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
    }

    const otp = generateOTP();
    const user = await User.create({
      name, email, password, phone, city,
      otp,
      otpExpire: new Date(Date.now() + parseInt(process.env.OTP_EXPIRE) || 10 * 60 * 1000)
    });

    // Envoyer OTP par email
    await sendOTPEmail(email, name, otp);

    res.status(201).json({
      success: true,
      message: "Inscription réussie ! Un code de vérification a été envoyé à votre email.",
      userId: user._id,
      requiresVerification: true
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Vérification OTP
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'UserId et OTP requis.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Code OTP incorrect.' });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'Code OTP expiré. Veuillez en demander un nouveau.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save({ validateBeforeSave: false });

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Renvoyer OTP
// @route   POST /api/auth/resend-otp
exports.resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user.email, user.name, otp);

    res.json({ success: true, message: 'Un nouveau code a été envoyé à votre email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Connexion
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    if (user.provider !== 'local') {
      return res.status(400).json({ success: false, message: `Veuillez vous connecter avec ${user.provider}.` });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Votre compte est suspendu. Contactez le support.' });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
      await sendOTPEmail(user.email, user.name, otp);

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        userId: user._id,
        message: 'Votre compte nécessite une vérification. Un code a été envoyé à votre email.'
      });
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Connexion Google/Facebook
// @route   POST /api/auth/social
exports.socialLogin = async (req, res, next) => {
  try {
    const { name, email, provider, providerId, avatar } = req.body;

    if (!email || !provider || !providerId) {
      return res.status(400).json({ success: false, message: 'Données sociales incomplètes.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name, email, provider, providerId,
        avatar: avatar || null,
        isVerified: true
      });
    } else if (user.provider === 'local') {
      // Lier le compte social
      user.provider = provider;
      user.providerId = providerId;
      if (avatar) user.avatar = avatar;
      await user.save({ validateBeforeSave: false });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Votre compte est suspendu.' });
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Déconnexion
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Déconnexion réussie.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Rafraîchir le token
// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token manquant.' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token invalide.' });
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Mot de passe oublié
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Aucun compte associé à cet email.' });
    }

    const { resetToken, hashedToken, expire } = generateResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = expire;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({ success: true, message: 'Un email de réinitialisation a été envoyé.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Réinitialiser le mot de passe
// @route   PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token invalide ou expiré.' });
    }

    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit avoir au moins 8 caractères.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Profil actuel
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      avatar: user.avatar,
      role: user.role,
      isVerified: user.isVerified,
      isPhoneVerified: user.isPhoneVerified,
      isIdentityVerified: user.isIdentityVerified,
      reliabilityScore: user.reliabilityScore,
      badge: user.badge,
      successfulRestitutions: user.successfulRestitutions,
      provider: user.provider,
      createdAt: user.createdAt
    }
  });
};

// @desc    Changer mot de passe
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (user.provider !== 'local') {
      return res.status(400).json({ success: false, message: 'Impossible de changer le mot de passe d\'un compte social.' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit avoir au moins 8 caractères.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    next(error);
  }
};
