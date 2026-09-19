# Stage 1: Build stage
FROM node:20-alpine AS build

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
COPY server.js ./
COPY data ./data

# Expose port 80
EXPOSE 80

ENV PORT=80
ENV DATA_DIR=/app/data

CMD ["node", "server.js"]
