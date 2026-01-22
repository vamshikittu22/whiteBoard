# Use Node.js 18 slim as base
FROM node:18-slim AS builder

WORKDIR /app

# Install dependencies for both project levels
COPY package.json ./
COPY src ./src
COPY tsconfig.json vite.config.ts index.html tailwind.config.js postcss.config.js ./
RUN npm install

# Build frontend
RUN npm run build

# Build server
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/tsconfig.json ./
COPY server/prisma ./prisma
COPY server/src ./src
COPY server/prisma.config.js ./
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:18-slim
WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy built server and its dependencies
WORKDIR /app/server
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/server/prisma.config.js ./

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Open search metadata
LABEL name="CollabCanvas"

EXPOSE 4000
CMD ["node", "dist/index.js"]
