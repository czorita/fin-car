# Stage 1: Build stage (ejecutado en la plataforma del host de compilación para máxima velocidad)
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project source and build
COPY . .
RUN npm run build

# Stage 2: Production runtime stage con Node.js y soporte de volúmenes para JSONs
FROM node:22-alpine

WORKDIR /app

# Copy build artifacts and native HTTP server
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server.js ./
COPY src/server ./src/server
COPY data ./data

# Expose port 80
EXPOSE 80

ENV PORT=80
ENV DATA_DIR=/app/data

# Healthcheck con Node (la imagen alpine no incluye curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 80) + '/api/examples').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
