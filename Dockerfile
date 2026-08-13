# Multi-stage Dockerfile for VibeCheck Monorepo (Next.js / Node.js)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package definitions & workspace package.json files
COPY package.json package-lock.json ./
COPY src/shared/package.json ./src/shared/
COPY src/person-a/package.json ./src/person-a/
COPY src/person-b/package.json ./src/person-b/
COPY src/person-c/package.json ./src/person-c/

# Install dependencies across all monorepo workspaces
RUN npm ci

# Copy full source tree & configuration files
COPY . .

# Build shared package and Next.js web application
RUN npm run build --workspace=src/shared
RUN npm run build --workspace=src/person-c

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy workspace assets from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/person-c ./src/person-c
COPY --from=builder /app/src/shared ./src/shared

EXPOSE 3000

# Start Next.js server in person-c workspace
CMD ["npm", "run", "start", "--workspace=src/person-c"]
