# 🔍 Trouve Moi

> Plateforme de signalement et récupération d'objets perdus

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://docker.com)

---

## 📋 Table des matières

- [Présentation](#présentation)
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Configuration](#configuration)
- [Déploiement](#déploiement)
- [API](#api-documentation)
- [Structure du projet](#structure-du-projet)

---

## Présentation

**Trouve Moi** est une plateforme web qui met en relation les personnes ayant perdu un objet avec celles qui en ont trouvé un. Un algorithme de matching automatique analyse catégorie, mots-clés, zone géographique et date pour suggérer les correspondances les plus pertinentes.

---

## Architecture

```
trouve-moi/
├── backend/          # API Node.js + Express + MongoDB + Socket.io
├── frontend/         # Application React (Vite + Tailwind)
├── admin/            # Interface d'administration React
└── docker-compose.yml
```

| Composant     | Technologie                      |
|---------------|----------------------------------|
| Backend API   | Node.js 20 + Express.js          |
| Base de données | MongoDB 7 + Mongoose            |
| Temps réel    | Socket.io                        |
| Auth          | JWT (access + refresh tokens)    |
| Upload photos | Multer (local) → AWS S3 (prod)   |
| Carte         | Leaflet + OpenStreetMap          |
| Frontend      | React 18 + Vite + Tailwind CSS   |
| Admin         | React 18 + Recharts              |
| Déploiement   | Docker + Docker Compose          |

---

## Fonctionnalités

### Utilisateurs
- ✅ Inscription / Connexion (email + Google + Facebook)
- ✅ Vérification OTP par email
- ✅ Récupération de mot de passe
- ✅ Profil avec score de fiabilité (0-100)
- ✅ Badges : Basique / Vérifié / Silver / Gold

### Signalements
- ✅ Créer un signalement (perdu ou trouvé)
- ✅ 15 catégories d'objets
- ✅ Upload jusqu'à 5 photos
- ✅ Géolocalisation automatique (GPS + reverse geocoding)
- ✅ Champ récompense optionnel
- ✅ Archivage automatique après 30 jours (cron)

### Matching
- ✅ Algorithme multi-critères :
  - Catégorie (30%)
  - Mots-clés Jaccard (35%)
  - Distance géographique (25%)
  - Proximité de date (10%)
- ✅ Score minimum 30% requis
- ✅ Rayon maximum 100 km
- ✅ Notification instantanée au match

### Messagerie
- ✅ Chat temps réel via Socket.io
- ✅ Déblocage uniquement après acceptance mutuelle
- ✅ Envoi de photos
- ✅ Indicateur de frappe
- ✅ Signalement de messages

### Administration
- ✅ Dashboard avec statistiques et graphiques
- ✅ Gestion des utilisateurs (suspension / vérification)
- ✅ Modération des signalements
- ✅ Traitement des signalements abusifs

---

## Installation

### Prérequis
- Node.js 20+
- MongoDB 7 (ou MongoDB Atlas)
- npm ou yarn

### 1. Cloner le repo
```bash
git clone https://github.com/votre-org/trouve-moi.git
cd trouve-moi
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Éditez .env avec vos valeurs
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# http://localhost:3000
```

### 4. Admin
```bash
cd admin
cp .env.example .env
npm install
npm run dev
# http://localhost:3001
```

---

## Configuration

### Variables d'environnement backend (`.env`)

```env
# Serveur
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/trouvemoi

# JWT
JWT_SECRET=votre_secret_jwt_tres_long
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=votre_secret_refresh
JWT_REFRESH_EXPIRE=7d

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre@email.com
EMAIL_PASS=votre_app_password
EMAIL_FROM=noreply@trouvemoi.app

# Admin par défaut
ADMIN_EMAIL=admin@trouvemoi.app
ADMIN_PASSWORD=Admin@123456

# Frontend URL (pour les emails)
FRONTEND_URL=http://localhost:3000

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

---

## Déploiement avec Docker

### Démarrage rapide
```bash
# Copier et éditer les variables d'environnement
cp backend/.env.example backend/.env
# Éditez backend/.env

# Construire et démarrer tous les services
docker-compose up -d --build

# Voir les logs
docker-compose logs -f backend
```

### Services exposés
| Service  | Port | URL                    |
|----------|------|------------------------|
| Backend  | 5000 | http://localhost:5000  |
| Frontend | 3000 | http://localhost:3000  |
| Admin    | 3001 | http://localhost:3001  |
| MongoDB  | 27017| (interne)              |

### Commandes utiles
```bash
# Arrêter tous les services
docker-compose down

# Réinitialiser les données
docker-compose down -v

# Rebuild un service spécifique
docker-compose up -d --build backend

# Accéder à MongoDB
docker exec -it trouvemoi-mongo mongosh -u admin -p secret123
```

---

## API Documentation

La documentation Swagger est disponible en développement :
```
http://localhost:5000/api-docs
```

### Endpoints principaux

#### Auth
```
POST   /api/auth/register         Inscription
POST   /api/auth/verify-otp       Vérification email
POST   /api/auth/login            Connexion
POST   /api/auth/logout           Déconnexion
POST   /api/auth/forgot-password  Mot de passe oublié
PUT    /api/auth/reset-password/:token  Réinitialiser
POST   /api/auth/refresh          Rafraîchir le token
GET    /api/auth/me               Profil connecté
```

#### Items
```
GET    /api/items                 Liste (filtres: type, category, search, geo)
POST   /api/items                 Créer (multipart/form-data)
GET    /api/items/:id             Détail
PUT    /api/items/:id             Modifier
DELETE /api/items/:id             Supprimer
PATCH  /api/items/:id/confirm     Confirmer restitution
GET    /api/items/map             Carte (GeoJSON)
```

#### Matches
```
GET    /api/matches               Mes matches
GET    /api/matches/:id           Détail
PATCH  /api/matches/:id/accept    Accepter
PATCH  /api/matches/:id/reject    Refuser
PATCH  /api/matches/:id/confirm   Confirmer restitution
```

#### Messages
```
GET    /api/messages/:matchId     Historique
POST   /api/messages/:matchId     Envoyer
POST   /api/messages/:id/report   Signaler
```

#### Admin (rôle admin requis)
```
GET    /api/admin/dashboard       Statistiques globales
GET    /api/admin/users           Liste utilisateurs
PATCH  /api/admin/users/:id/suspend   Suspension
PATCH  /api/admin/users/:id/verify    Vérification identité
GET    /api/admin/items           Signalements (avec modération)
PATCH  /api/admin/items/:id/moderate  Modérer
DELETE /api/admin/items/:id       Supprimer
GET    /api/admin/reports         Signalements abusifs
PATCH  /api/admin/reports/:id/resolve Traiter
```

---

## Structure du projet

```
backend/
├── server.js               # Point d'entrée (Socket.io, crons, Swagger)
├── src/
│   ├── config/
│   │   └── database.js     # Connexion MongoDB
│   ├── models/
│   │   ├── User.js         # Utilisateur (auth, score, badge)
│   │   ├── Item.js         # Signalement (GeoJSON, keywords)
│   │   └── index.js        # Match, Message, Notification, Report
│   ├── controllers/        # Logique métier
│   ├── routes/             # Routeur Express
│   ├── middleware/
│   │   ├── auth.js         # JWT protect/authorize
│   │   ├── upload.js       # Multer configuration
│   │   └── errorHandler.js # Gestion d'erreurs centralisée
│   ├── services/
│   │   ├── matchingService.js  # Algorithme de matching
│   │   └── emailService.js     # Emails transactionnels
│   └── utils/
│       └── tokenUtils.js   # JWT helpers

frontend/
├── src/
│   ├── components/
│   │   ├── Common/         # Spinner, Button, Input, Modal, Avatar...
│   │   ├── Items/          # ItemCard
│   │   ├── Layout/         # Navbar (desktop + mobile bottom nav)
│   │   └── Map/            # MapView (Leaflet)
│   ├── context/
│   │   ├── AuthContext.jsx # Authentification globale
│   │   └── SocketContext.jsx # Socket.io
│   ├── pages/
│   │   ├── Home.jsx        # Accueil avec carte et signalements
│   │   ├── Items.jsx       # Liste avec filtres avancés
│   │   ├── ItemDetail.jsx  # Détail d'un objet
│   │   ├── ReportItem.jsx  # Formulaire 3 étapes
│   │   ├── Matches.jsx     # Mes correspondances
│   │   ├── Chat.jsx        # Messagerie temps réel
│   │   ├── Profile.jsx     # Profil utilisateur
│   │   ├── Notifications.jsx
│   │   └── Auth/           # Login, Register, OTP, ForgotPwd...
│   ├── services/api.js     # Axios + interceptors JWT
│   └── utils/constants.js  # Catégories, helpers

admin/
└── src/
    ├── pages/
    │   ├── Dashboard.jsx   # Stats + graphiques Recharts
    │   ├── Users.jsx       # Gestion utilisateurs
    │   ├── Items.jsx       # Modération signalements
    │   ├── Reports.jsx     # Signalements abusifs
    │   └── Login.jsx
    └── components/
        └── Layout.jsx      # Sidebar dark
```

---

## Algorithme de matching

Le matching compare les signalements opposés (perdu vs trouvé) selon 4 critères :

| Critère          | Poids | Méthode                              |
|------------------|-------|--------------------------------------|
| Catégorie        | 30%   | Correspondance exacte (1 ou 0)       |
| Mots-clés        | 35%   | Similarité Jaccard (intersection/union) |
| Distance         | 25%   | Formule Haversine, max 100km         |
| Date             | 10%   | Différence en jours, max 30 jours    |

**Score minimum requis : 30%**

Les candidats sont pré-filtrés via l'index géospatial MongoDB `$near` pour optimiser les performances.

---

## Roadmap

- [ ] Application mobile React Native (iOS + Android)
- [ ] Stockage photos AWS S3
- [ ] SMS OTP via Africa's Talking
- [ ] Notifications push FCM
- [ ] Authentification Google / Facebook OAuth
- [ ] Modération automatique par IA (photos)
- [ ] Géocodage inversé côté serveur
- [ ] Export CSV des statistiques admin

---

## Licence

MIT © 2025 Trouve Moi
