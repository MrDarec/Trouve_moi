const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('❌ Error:', err);

  // Mongoose CastError
  if (err.name === 'CastError') {
    error.message = 'Ressource non trouvée.';
    return res.status(404).json({ success: false, message: error.message });
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `La valeur '${err.keyValue[field]}' est déjà utilisée pour le champ '${field}'.`;
    return res.status(400).json({ success: false, message: error.message });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expiré.' });
  }

  // Multer Error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Fichier trop volumineux (max 5MB).' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Erreur serveur interne.'
  });
};

module.exports = errorHandler;
