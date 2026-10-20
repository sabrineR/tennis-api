# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.20.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM base AS production-dependencies
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

FROM base AS production
ENV NODE_ENV=production PORT=3000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json package-lock.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "const http = require('node:http'); const req = http.get({host: '127.0.0.1', port: process.env.PORT || 3000, path: '/api/players'}, res => { res.resume(); process.exit(res.statusCode === 200 ? 0 : 1); }); req.setTimeout(3000, () => req.destroy()); req.on('error', () => process.exit(1));"]
CMD ["sh", "-c", "node dist/database/migrate.js up && exec node dist/main.js"]
