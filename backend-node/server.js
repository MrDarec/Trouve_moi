require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');

const connectDB = require('./src/config/database');
const authRouter = require('./src/routes/auth');
const itemRouter = require('./src/routes/items');
const { matchRouter, messageRouter, userRouter, notifRouter, adminRouter } = require('./src/routes/index');
const errorHandler = require('./src/middleware/errorHandler');

// ===================== APP SETUP =====================
const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// ===================== MIDDLEWARE =====================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_PATH || 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ===================== ROUTES =====================
app.use('/api/auth', authRouter);
app.use('/api/items', itemRouter);
app.use('/api/matches', matchRouter);
app.use('/api/messages', messageRouter);
app.use('/api/users', userRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Trouve Moi API is running 🚀', timestamp: new Date().toISOString() });
});

// Swagger (optionnel en dev)
if (process.env.NODE_ENV !== 'production') {
  try {
    const swaggerJsDoc = require('swagger-jsdoc');
    const swaggerUI = require('swagger-ui-express');
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: { title: 'Trouve Moi API', version: '1.0.0', description: 'API de signalement et récupération d\'objets perdus' }
      },
      apis: ['./src/routes/*.js']
    };
    const swaggerDocs = swaggerJsDoc(swaggerOptions);
    app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));
  } catch (e) { console.log('Swagger non disponible'); }
}

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} non trouvée.` });
});

// Error handler
app.use(errorHandler);

// ===================== SOCKET.IO =====================
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connecté: ${socket.id}`);

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    connectedUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} rejoint`);
  });

  socket.on('join_match', (matchId) => {
    socket.join(`match_${matchId}`);
  });

  socket.on('leave_match', (matchId) => {
    socket.leave(`match_${matchId}`);
  });

  socket.on('typing', ({ matchId, userId }) => {
    socket.to(`match_${matchId}`).emit('user_typing', { userId });
  });

  socket.on('stop_typing', ({ matchId, userId }) => {
    socket.to(`match_${matchId}`).emit('user_stopped_typing', { userId });
  });

  socket.on('disconnect', () => {
    connectedUsers.forEach((sid, userId) => {
      if (sid === socket.id) connectedUsers.delete(userId);
    });
    console.log(`🔌 Socket déconnecté: ${socket.id}`);
  });
});

// ===================== CRON JOBS =====================
// Archiver les items inactifs > 30 jours
cron.schedule('0 2 * * *', async () => {
  try {
    const { Item } = require('./src/models/Item');
    const { Notification } = require('./src/models/index');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const itemsToArchive = await Item.find({
      status: 'active',
      createdAt: { $lte: thirtyDaysAgo }
    });

    for (const item of itemsToArchive) {
      item.status = 'archived';
      item.archivedAt = new Date();
      await item.save();

      await Notification.create({
        userId: item.userId,
        type: 'item_archived',
        title: '📦 Signalement archivé',
        message: `Votre signalement "${item.title}" a été archivé après 30 jours.`,
        data: { itemId: item._id }
      });
    }

    if (itemsToArchive.length > 0) {
      console.log(`📦 ${itemsToArchive.length} signalement(s) archivé(s)`);
    }
  } catch (error) {
    console.error('Erreur cron archivage:', error);
  }
});

// Rappel pour items actifs > 7 jours
cron.schedule('0 9 * * *', async () => {
  try {
    const Item = require('./src/models/Item');
    const { Notification } = require('./src/models/index');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const items = await Item.find({
      status: 'active',
      createdAt: { $lte: sevenDaysAgo, $gte: eightDaysAgo }
    });

    for (const item of items) {
      await Notification.create({
        userId: item.userId,
        type: 'reminder',
        title: '⏰ Rappel - Votre signalement',
        message: `Votre signalement "${item.title}" est actif depuis 7 jours. Pensez à le mettre à jour si l'objet a été retrouvé.`,
        data: { itemId: item._id }
      });
    }
  } catch (error) {
    console.error('Erreur cron rappel:', error);
  }
});

// ===================== START =====================
const startServer = async () => {
  await connectDB();

  // Créer l'admin par défaut
  try {
    const User = require('./src/models/User');
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      await User.create({
        name: 'Administrateur',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin',
        isVerified: true,
        isIdentityVerified: true
      });
      console.log(`✅ Admin créé: ${process.env.ADMIN_EMAIL}`);
    }
  } catch (e) { console.log('Admin déjà existant ou erreur:', e.message); }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`
🚀 Trouve Moi API démarré !
📍 Port: ${PORT}
🌍 Env: ${process.env.NODE_ENV}
📚 Docs: http://localhost:${PORT}/api-docs
❤️  Health: http://localhost:${PORT}/api/health
    `);
  });
};

startServer();

module.exports = { app, io };
