# Stage 1: Build stage (ejecutado en la plataforma del host de compilación para máxima velocidad)
FROM --platform=$BUILDPLATFORM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project source and build
COPY . .
RUN npm run build

# Stage 2: Production runtime stage con Node.js y soporte de volúmenes para JSONs
FROM node:20-alpine

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

CMD ["node", "server.js"]
