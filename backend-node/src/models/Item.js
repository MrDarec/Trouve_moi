const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: [true, 'Le type (perdu/trouvé) est requis']
  },
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: [
      'electronics', 'bags', 'jewelry', 'clothing', 'documents',
      'keys', 'glasses', 'wallet', 'phone', 'animals', 'toys',
      'sports', 'tools', 'books', 'other'
    ]
  },
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [150, 'Le titre ne peut pas dépasser 150 caractères']
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },
  color: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  photos: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length >= 1 && v.length <= 5;
      },
      message: 'Entre 1 et 5 photos sont requises'
    }
  },
  date: {
    type: Date,
    required: [true, 'La date est requise']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'La localisation est requise']
    },
    address: {
      type: String,
      required: [true, "L'adresse est requise"]
    },
    city: String,
    country: String
  },
  reward: {
    offered: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'XOF' },
    description: String
  },
  status: {
    type: String,
    enum: ['active', 'matched', 'pending_confirmation', 'closed', 'archived'],
    default: 'active'
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderationNote: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  confirmedByUser: { type: Boolean, default: false },
  confirmedByMatch: { type: Boolean, default: false },
  archivedAt: Date,
  keywords: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index géospatial
ItemSchema.index({ location: '2dsphere' });
ItemSchema.index({ category: 1, type: 1, status: 1 });
ItemSchema.index({ userId: 1 });
ItemSchema.index({ createdAt: -1 });

// Extraction des mots-clés avant sauvegarde
ItemSchema.pre('save', function(next) {
  const text = `${this.title} ${this.description} ${this.color || ''} ${this.brand || ''}`;
  this.keywords = text.toLowerCase()
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  next();
});

module.exports = mongoose.model('Item', ItemSchema);
