FROM node:20-slim

WORKDIR /app

# Install native deps for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace config
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install all deps
RUN npm install

# Copy source
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY packages/backend ./packages/backend

# Build frontend
RUN npm run build

# Expose port
EXPOSE 8080

# Start backend (serves frontend + API)
CMD ["npm", "run", "start"]
