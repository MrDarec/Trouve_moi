const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads si inexistant
const uploadPath = process.env.UPLOAD_PATH || './uploads';
['items', 'avatars', 'messages'].forEach(dir => {
  const fullPath = path.join(uploadPath, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'items';
    if (req.originalUrl.includes('avatar')) folder = 'avatars';
    if (req.originalUrl.includes('message')) folder = 'messages';
    cb(null, path.join(uploadPath, folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images (JPEG, PNG, WebP) sont acceptées.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

module.exports = upload;
