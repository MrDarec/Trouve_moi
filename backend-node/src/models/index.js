const mongoose = require('mongoose');

// ===================== MATCH =====================
const MatchSchema = new mongoose.Schema({
  itemLost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  itemFound: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  userLost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userFound: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  scoreDetails: {
    category: Number,
    keywords: Number,
    distance: Number,
    date: Number
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'closed'],
    default: 'pending'
  },
  acceptedByLost: { type: Boolean, default: false },
  acceptedByFound: { type: Boolean, default: false },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  chatEnabled: { type: Boolean, default: false },
  restitutionConfirmedByLost: { type: Boolean, default: false },
  restitutionConfirmedByFound: { type: Boolean, default: false }
}, { timestamps: true });

// ===================== MESSAGE =====================
const MessageSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    maxlength: [1000, 'Le message ne peut pas dépasser 1000 caractères']
  },
  photo: String,
  type: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text'
  },
  read: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

MessageSchema.index({ matchId: 1, createdAt: 1 });

// ===================== NOTIFICATION =====================
const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['new_match', 'match_accepted', 'match_rejected', 'new_message',
           'restitution_request', 'restitution_confirmed', 'item_archived',
           'reminder', 'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

NotificationSchema.index({ userId: 1, read: 1 });

// ===================== REPORT =====================
const ReportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  reportedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reason: {
    type: String,
    required: true,
    enum: ['spam', 'fake', 'inappropriate', 'harassment', 'fraud', 'other']
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNote: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date
}, { timestamps: true });

const Match = mongoose.model('Match', MatchSchema);
const Message = mongoose.model('Message', MessageSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Report = mongoose.model('Report', ReportSchema);

module.exports = { Match, Message, Notification, Report };
