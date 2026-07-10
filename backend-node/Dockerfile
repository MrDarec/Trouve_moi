FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads/items uploads/avatars uploads/messages

EXPOSE 5000

CMD ["node", "server.js"]
