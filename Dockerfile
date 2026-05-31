# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Compile server TypeScript
RUN npx tsx --version && \
    mkdir -p dist-server && \
    npx esbuild server/index.ts \
      --bundle \
      --platform=node \
      --target=node22 \
      --format=esm \
      --external:node:* \
      --external:express \
      --outfile=dist-server/index.js

FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

ENV PORT=8080
ENV DATA_DIR=/data

EXPOSE 8080

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1

CMD ["node", "--experimental-sqlite", "dist-server/index.js"]
