const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Générer un OTP numérique à 6 chiffres
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Générer un token JWT
 */
const generateToken = (userId, secret, expire) => {
  return jwt.sign({ id: userId }, secret, { expiresIn: expire });
};

/**
 * Générer les tokens d'accès et de rafraîchissement
 */
const generateTokenPair = (userId) => {
  const accessToken = generateToken(userId, process.env.JWT_SECRET, process.env.JWT_EXPIRE || '7d');
  const refreshToken = generateToken(userId, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRE || '30d');
  return { accessToken, refreshToken };
};

/**
 * Générer un token de réinitialisation de mot de passe
 */
const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expire = Date.now() + 60 * 60 * 1000; // 1 heure
  return { resetToken, hashedToken, expire };
};

module.exports = { generateOTP, generateToken, generateTokenPair, generateResetToken };
