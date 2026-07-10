#!/bin/bash

# Chemin vers la version stable locale de Node v22
export PATH="/home/darec/Bureau/trouve-moi/node-local/bin:$PATH"

echo "🚀 Démarrage de l'application Trouve Moi..."

# Arrêter les processus enfants en cas d'interruption (Ctrl+C)
cleanup() {
    echo -e "\n👋 Arrêt des serveurs..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Démarrage du Backend Laravel
echo "📡 Démarrage du backend Laravel (Port 5000)..."
cd backend
php artisan serve --port=5000 &
cd ..

# Attendre 1 seconde
sleep 1

# 2. Démarrage du Dashboard Admin
echo "🛠️ Démarrage du dashboard Admin (Port 3001)..."
cd admin
npm run dev &
cd ..

# 3. Démarrage du Frontend React (Vite)
echo "💻 Démarrage du frontend React..."
cd frontend
npm run dev
cd ..
