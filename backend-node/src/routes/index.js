// ===================== MATCH ROUTES =====================
const express = require('express');
const matchRouter = express.Router();
const matchController = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

matchRouter.get('/', protect, matchController.getMyMatches);
matchRouter.get('/:id', protect, matchController.getMatch);
matchRouter.put('/:id/accept', protect, matchController.acceptMatch);
matchRouter.put('/:id/reject', protect, matchController.rejectMatch);
matchRouter.put('/:id/confirm-restitution', protect, matchController.confirmRestitution);

// ===================== MESSAGE ROUTES =====================
const messageRouter = express.Router();
const messageController = require('../controllers/messageController');
const upload = require('../middleware/upload');

messageRouter.get('/:matchId', protect, messageController.getMessages);
messageRouter.post('/:matchId', protect, upload.single('photo'), messageController.sendMessage);
messageRouter.post('/report/:messageId', protect, messageController.reportMessage);

// ===================== USER ROUTES =====================
const userRouter = express.Router();
const userController = require('../controllers/userController');

userRouter.get('/history', protect, userController.getUserHistory);
userRouter.put('/profile', protect, upload.single('avatar'), userController.updateProfile);
userRouter.get('/:id', protect, userController.getUserProfile);
userRouter.post('/:id/report', protect, userController.reportUser);

// ===================== NOTIFICATION ROUTES =====================
const notifRouter = express.Router();

notifRouter.get('/', protect, userController.getNotifications);
notifRouter.put('/read-all', protect, userController.markAllAsRead);
notifRouter.put('/:id/read', protect, userController.markAsRead);
notifRouter.delete('/:id', protect, userController.deleteNotification);

// ===================== ADMIN ROUTES =====================
const adminRouter = express.Router();
const adminController = require('../controllers/adminController');
const { authorize } = require('../middleware/auth');

adminRouter.use(protect);
adminRouter.use(authorize('admin', 'moderator'));

adminRouter.get('/dashboard', adminController.getDashboard);
adminRouter.get('/users', adminController.getUsers);
adminRouter.put('/users/:id/suspend', adminController.toggleSuspend);
adminRouter.put('/users/:id/verify-identity', authorize('admin'), adminController.verifyIdentity);
adminRouter.get('/items', adminController.getAllItems);
adminRouter.get('/items/pending', adminController.getPendingItems);
adminRouter.put('/items/:id/moderate', adminController.moderateItem);
adminRouter.delete('/items/:id', adminController.deleteItem);
adminRouter.get('/reports', adminController.getReports);
adminRouter.put('/reports/:id', adminController.resolveReport);

module.exports = { matchRouter, messageRouter, userRouter, notifRouter, adminRouter };
